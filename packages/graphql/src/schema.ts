import {
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  type GraphQLFieldConfigMap,
  type GraphQLNamedType,
  type GraphQLOutputType,
} from 'graphql';
import type {
  Operation,
  Relation,
  Resource,
  ResourceIdentity,
} from '@resource-forge/core';
import { err, ok, type Result } from '@resource-forge/core';
import { translationError, type GraphqlTranslationError } from './errors.js';
import {
  graphqlTypeNameForIdentity,
  isLegalGraphqlName,
  isLegalGraphqlTypeName,
  rootFieldNameForOperation,
} from './naming.js';
import {
  scalarOutputForFieldType,
  wrapArgumentNullability,
  wrapManyRelationOutput,
  wrapOutputNullability,
} from './nullability.js';

export function identityKey(identity: ResourceIdentity): string {
  return `${identity.namespace}/${identity.name}`;
}

export const RF_VOID_TYPE_NAME = 'RfVoid' as const;

export function createRfVoidType(): GraphQLObjectType {
  return new GraphQLObjectType({
    name: RF_VOID_TYPE_NAME,
    fields: {
      ok: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
  });
}

function fieldRelationNameCollision(resource: Resource): string | undefined {
  const fieldNames = new Set(resource.schema.fields.map((f) => f.name));
  for (const relation of resource.schema.relations) {
    if (fieldNames.has(relation.name)) {
      return relation.name;
    }
  }
  return undefined;
}

type ObjectTypeBuild = {
  readonly typesByIdentityKey: ReadonlyMap<string, GraphQLObjectType>;
  readonly typeNameByIdentityKey: ReadonlyMap<string, string>;
};

/**
 * Internal intermediate: Resource → GraphQL object types only.
 * Does not constitute translation success (no Query-root / paired resolvers).
 */
export function buildResourceObjectTypes(
  resources: readonly Resource[],
): Result<ObjectTypeBuild, GraphqlTranslationError> {
  const byKey = new Map<string, Resource>();
  for (const resource of resources) {
    byKey.set(identityKey(resource.identity), resource);
  }

  const typeNameByIdentityKey = new Map<string, string>();
  const typeNameOwners = new Map<string, ResourceIdentity>();

  for (const resource of resources) {
    const collision = fieldRelationNameCollision(resource);
    if (collision !== undefined) {
      return err(
        translationError(
          'field_relation_name_collision',
          `Field and Relation share name "${collision}" on ${identityKey(resource.identity)}`,
        ),
      );
    }

    if (
      resource.schema.fields.length === 0 &&
      resource.schema.relations.length === 0
    ) {
      return err(
        translationError(
          'zero_field_resource',
          `Resource ${identityKey(resource.identity)} would produce a zero-field GraphQL object type`,
        ),
      );
    }

    for (const field of resource.schema.fields) {
      if (!isLegalGraphqlName(field.name)) {
        return err(
          translationError(
            'illegal_member_name',
            `Illegal Field name "${field.name}" on ${identityKey(resource.identity)}`,
          ),
        );
      }
    }
    for (const relation of resource.schema.relations) {
      if (!isLegalGraphqlName(relation.name)) {
        return err(
          translationError(
            'illegal_member_name',
            `Illegal Relation name "${relation.name}" on ${identityKey(resource.identity)}`,
          ),
        );
      }
      const targetKey = identityKey(relation.target);
      if (!byKey.has(targetKey)) {
        return err(
          translationError(
            'missing_relation_target',
            `Relation "${relation.name}" on ${identityKey(resource.identity)} targets missing ${targetKey}`,
          ),
        );
      }
    }

    const typeName = graphqlTypeNameForIdentity(resource.identity);
    if (!isLegalGraphqlTypeName(typeName)) {
      return err(
        translationError(
          'illegal_type_name',
          `Illegal or reserved GraphQL type name "${typeName}" from ${identityKey(resource.identity)}`,
        ),
      );
    }
    const prior = typeNameOwners.get(typeName);
    if (prior !== undefined) {
      return err(
        translationError(
          'type_name_collision',
          `GraphQL type name collision "${typeName}" from ${identityKey(prior)} and ${identityKey(resource.identity)}`,
        ),
      );
    }
    typeNameOwners.set(typeName, resource.identity);
    typeNameByIdentityKey.set(identityKey(resource.identity), typeName);
  }

  const typesByIdentityKey = new Map<string, GraphQLObjectType>();

  for (const resource of resources) {
    const key = identityKey(resource.identity);
    const typeName = typeNameByIdentityKey.get(key)!;
    const objectType = new GraphQLObjectType({
      name: typeName,
      fields: () => {
        const fields: GraphQLFieldConfigMap<unknown, unknown> = {};
        for (const field of resource.schema.fields) {
          fields[field.name] = {
            type: wrapOutputNullability(
              scalarOutputForFieldType(field.type),
              field.nullable,
            ),
          };
        }
        for (const relation of resource.schema.relations) {
          const targetKey = identityKey(relation.target);
          const targetType = typesByIdentityKey.get(targetKey)!;
          fields[relation.name] = {
            type: relationOutputType(targetType, relation),
          };
        }
        return fields;
      },
    });
    typesByIdentityKey.set(key, objectType);
  }

  return ok({ typesByIdentityKey, typeNameByIdentityKey });
}

function relationOutputType(
  targetType: GraphQLObjectType,
  relation: Relation,
): GraphQLOutputType {
  if (relation.multiplicity === 'many') {
    return wrapManyRelationOutput(targetType, relation.nullable);
  }
  return wrapOutputNullability(targetType, relation.nullable);
}

function resultOutputType(
  result: Operation['result'],
  rfVoid: GraphQLObjectType,
): GraphQLOutputType {
  if (result === 'void') {
    return new GraphQLNonNull(rfVoid);
  }
  return new GraphQLNonNull(scalarOutputForFieldType(result));
}

export type BuiltGraphqlSchema = {
  readonly schema: GraphQLSchema;
  readonly typesByIdentityKey: ReadonlyMap<string, GraphQLObjectType>;
  readonly typeNameByIdentityKey: ReadonlyMap<string, string>;
  readonly rootFieldNames: ReadonlyMap<string, { kind: 'query' | 'mutation'; resource: Resource; operation: Operation }>;
  readonly rfVoidUsed: boolean;
};

/**
 * Build a complete GraphQLSchema for a validated, named unit (Query-root closure applied).
 */
export function buildGraphqlSchema(
  resources: readonly Resource[],
): Result<BuiltGraphqlSchema, GraphqlTranslationError> {
  const objectTypes = buildResourceObjectTypes(resources);
  if (!objectTypes.ok) {
    return objectTypes;
  }

  const { typesByIdentityKey, typeNameByIdentityKey } = objectTypes.value;
  let rfVoid: GraphQLObjectType | undefined;
  let rfVoidUsed = false;

  const queryFields: GraphQLFieldConfigMap<unknown, unknown> = {};
  const mutationFields: GraphQLFieldConfigMap<unknown, unknown> = {};
  const rootFieldNames = new Map<
    string,
    { kind: 'query' | 'mutation'; resource: Resource; operation: Operation }
  >();

  for (const resource of resources) {
    for (const operation of resource.schema.operations) {
      for (const param of operation.params) {
        if (!isLegalGraphqlName(param.name)) {
          return err(
            translationError(
              'illegal_member_name',
              `Illegal Operation param name "${param.name}" on ${identityKey(resource.identity)}.${operation.name}`,
            ),
          );
        }
      }

      const rootName = rootFieldNameForOperation(resource.identity, operation.name);
      if (!isLegalGraphqlName(rootName)) {
        return err(
          translationError(
            'illegal_member_name',
            `Illegal root field name "${rootName}" from ${identityKey(resource.identity)}.${operation.name}`,
          ),
        );
      }

      if (rootFieldNames.has(rootName)) {
        return err(
          translationError(
            'root_field_collision',
            `GraphQL root field collision "${rootName}"`,
          ),
        );
      }

      if (operation.result === 'void') {
        rfVoidUsed = true;
        rfVoid ??= createRfVoidType();
      }

      const args: Record<string, { type: GraphQLInputTypeFromParam }> = {};
      for (const param of operation.params) {
        args[param.name] = {
          type: wrapArgumentNullability(
            scalarOutputForFieldType(param.type),
            param.optional,
            param.nullable,
          ),
        };
      }

      if (operation.result === 'void' && rfVoid === undefined) {
        return err(
          translationError('unmappable_construct', 'RfVoid required but not created'),
        );
      }

      const fieldConfig = {
        type: resultOutputType(operation.result, rfVoid ?? createRfVoidType()),
        args,
      };

      if (operation.kind === 'query') {
        queryFields[rootName] = fieldConfig;
        rootFieldNames.set(rootName, { kind: 'query', resource, operation });
      } else {
        mutationFields[rootName] = fieldConfig;
        rootFieldNames.set(rootName, { kind: 'mutation', resource, operation });
      }
    }
  }

  if (Object.keys(queryFields).length === 0) {
    return err(
      translationError(
        'no_query_operations',
        'Translation unit has zero mappable query Operations (Query-root closure)',
      ),
    );
  }

  const query = new GraphQLObjectType({
    name: 'Query',
    fields: queryFields,
  });

  const mutation =
    Object.keys(mutationFields).length > 0
      ? new GraphQLObjectType({
          name: 'Mutation',
          fields: mutationFields,
        })
      : undefined;

  const types: GraphQLNamedType[] = [...typesByIdentityKey.values()];
  if (rfVoidUsed) {
    types.push(rfVoid ?? createRfVoidType());
  }

  const schema = new GraphQLSchema({
    query,
    mutation,
    types,
  });

  return ok({
    schema,
    typesByIdentityKey,
    typeNameByIdentityKey,
    rootFieldNames,
    rfVoidUsed,
  });
}

// Local alias so arg map typing stays readable without importing GraphQLInputType in every call site.
type GraphQLInputTypeFromParam = ReturnType<typeof wrapArgumentNullability>;
