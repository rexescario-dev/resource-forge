import {
  invokeOperation,
  type OperationHandlerProvider,
  type OperationRuntimeValue,
  type Resource,
  type ResourceIdentity,
  type SemanticResultReport,
} from '@resource-forge/core';
import type { GraphQLResolveInfo } from 'graphql';
import { identityKey } from './schema.js';
import { rootFieldNameForOperation } from './naming.js';

export type AbsentBehavior =
  | 'fail_if_absent'
  | 'null_if_absent'
  | 'fail_if_absent_non_null';

export type FailureBehavior = 'graphql_field_error';

export type FieldBinding = {
  readonly resourceIdentity: ResourceIdentity;
  readonly fieldName: string;
  readonly graphqlTypeName: string;
  readonly valueSource: 'parent_field';
  readonly optional: boolean;
  readonly nullable: boolean;
  readonly absentBehavior: AbsentBehavior;
  readonly failureBehavior: FailureBehavior;
};

export type RelationBinding = {
  readonly resourceIdentity: ResourceIdentity;
  readonly relationName: string;
  readonly graphqlTypeName: string;
  readonly targetIdentity: ResourceIdentity;
  readonly targetGraphqlTypeName: string;
  readonly multiplicity: 'one' | 'many';
  readonly optional: boolean;
  readonly nullable: boolean;
  readonly valueSource: 'parent_relation';
  readonly loadClassification: 'host_supplied_association';
  readonly absentBehavior: AbsentBehavior;
  readonly failureBehavior: FailureBehavior;
};

export type OperationBinding = {
  readonly rootFieldName: string;
  readonly rootKind: 'query' | 'mutation';
  readonly resourceIdentity: ResourceIdentity;
  readonly operationName: string;
  readonly resource: Resource;
  readonly invoke: (
    args: ReadonlyMap<string, OperationRuntimeValue>,
    handlerProvider: OperationHandlerProvider,
  ) => ReturnType<typeof invokeOperation>;
  readonly handlerProviderSource: 'graphql_context.operationHandlerProvider';
  readonly argCapture: 'graphql_args_to_map_with_presence';
  readonly resultMapping: 'semantic_report_to_graphql' | 'void_to_rfvoid';
  readonly missingHandlerBehavior: 'resolve_time_failure';
};

export type ResolverBindings = {
  readonly fields: ReadonlyMap<string, ReadonlyMap<string, FieldBinding>>;
  readonly relations: ReadonlyMap<string, ReadonlyMap<string, RelationBinding>>;
  readonly operations: ReadonlyMap<string, OperationBinding>;
};

export type GraphqlResolveContext = {
  readonly operationHandlerProvider?: OperationHandlerProvider;
};

function absentBehaviorFor(optional: boolean, nullable: boolean): AbsentBehavior {
  if (!optional) {
    return 'fail_if_absent';
  }
  if (nullable) {
    return 'null_if_absent';
  }
  return 'fail_if_absent_non_null';
}

function readParentValue(
  parent: unknown,
  key: string,
): { present: boolean; value: unknown } {
  if (parent === null || parent === undefined || typeof parent !== 'object') {
    return { present: false, value: undefined };
  }
  const record = parent as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    return { present: false, value: undefined };
  }
  return { present: true, value: record[key] };
}

export function enforceAbsentBehavior(
  binding: Pick<FieldBinding, 'absentBehavior' | 'fieldName'> | {
    absentBehavior: AbsentBehavior;
    fieldName?: string;
    relationName?: string;
  },
  present: boolean,
  value: unknown,
): unknown {
  const label =
    'fieldName' in binding && binding.fieldName !== undefined
      ? binding.fieldName
      : (binding as { relationName?: string }).relationName ?? 'member';

  if (!present) {
    switch (binding.absentBehavior) {
      case 'fail_if_absent':
      case 'fail_if_absent_non_null':
        throw new Error(`Resolver contract failure: absent "${label}"`);
      case 'null_if_absent':
        return null;
    }
  }
  return value;
}

export function createFieldResolver(binding: FieldBinding) {
  return (parent: unknown): unknown => {
    const { present, value } = readParentValue(parent, binding.fieldName);
    return enforceAbsentBehavior(binding, present, value);
  };
}

export function createRelationResolver(binding: RelationBinding) {
  return (parent: unknown): unknown => {
    const { present, value } = readParentValue(parent, binding.relationName);
    // Host must supply association; not-loaded vs related-set classification remains host/RFC-029.
    if (
      present &&
      value !== null &&
      typeof value === 'object' &&
      'rfLoadState' in (value as object) &&
      (value as { rfLoadState?: string }).rfLoadState === 'not_loaded'
    ) {
      throw new Error(
        `Resolver contract failure: relation "${binding.relationName}" is not loaded`,
      );
    }
    return enforceAbsentBehavior(
      { absentBehavior: binding.absentBehavior, relationName: binding.relationName },
      present,
      value,
    );
  };
}

export function captureOperationArgs(
  graphqlArgs: Record<string, unknown>,
  paramNames: readonly string[],
): ReadonlyMap<string, OperationRuntimeValue> {
  const map = new Map<string, OperationRuntimeValue>();
  for (const name of paramNames) {
    if (Object.prototype.hasOwnProperty.call(graphqlArgs, name)) {
      map.set(name, graphqlArgs[name] as OperationRuntimeValue);
    }
  }
  return map;
}

export function mapSemanticResult(
  report: SemanticResultReport,
  voidResult: boolean,
): unknown {
  if (voidResult) {
    if (report.outcome !== 'void') {
      throw new Error('Resolver contract failure: expected void SemanticResultReport');
    }
    return { ok: true };
  }
  if (report.outcome !== 'value') {
    throw new Error('Resolver contract failure: expected value SemanticResultReport');
  }
  return report.value;
}

export function createOperationResolver(binding: OperationBinding) {
  return (
    _parent: unknown,
    args: Record<string, unknown>,
    context: GraphqlResolveContext,
    _info?: GraphQLResolveInfo,
  ): unknown => {
    void _info;
    const provider = context?.operationHandlerProvider;
    if (provider === undefined) {
      throw new Error(
        'Resolver contract failure: missing OperationHandlerProvider on GraphQL context',
      );
    }
    const operation = binding.resource.schema.operations.find(
      (op) => op.name === binding.operationName,
    );
    if (operation === undefined) {
      throw new Error(`Unknown operation ${binding.operationName}`);
    }
    const argMap = captureOperationArgs(
      args,
      operation.params.map((p) => p.name),
    );
    const result = binding.invoke(argMap, provider);
    if (!result.ok) {
      throw new Error(
        `Operation invoke failed: ${result.error.code}`,
      );
    }
    return mapSemanticResult(result.value, operation.result === 'void');
  };
}

export function buildResolverBindings(
  resources: readonly Resource[],
  typeNameByIdentityKey: ReadonlyMap<string, string>,
): ResolverBindings {
  const fields = new Map<string, Map<string, FieldBinding>>();
  const relations = new Map<string, Map<string, RelationBinding>>();
  const operations = new Map<string, OperationBinding>();

  for (const resource of resources) {
    const key = identityKey(resource.identity);
    const graphqlTypeName = typeNameByIdentityKey.get(key)!;
    const fieldMap = new Map<string, FieldBinding>();
    for (const field of resource.schema.fields) {
      fieldMap.set(field.name, {
        resourceIdentity: resource.identity,
        fieldName: field.name,
        graphqlTypeName,
        valueSource: 'parent_field',
        optional: field.optional,
        nullable: field.nullable,
        absentBehavior: absentBehaviorFor(field.optional, field.nullable),
        failureBehavior: 'graphql_field_error',
      });
    }
    fields.set(key, fieldMap);

    const relationMap = new Map<string, RelationBinding>();
    for (const rel of resource.schema.relations) {
      const targetKey = identityKey(rel.target);
      relationMap.set(rel.name, {
        resourceIdentity: resource.identity,
        relationName: rel.name,
        graphqlTypeName,
        targetIdentity: rel.target,
        targetGraphqlTypeName: typeNameByIdentityKey.get(targetKey)!,
        multiplicity: rel.multiplicity,
        optional: rel.optional,
        nullable: rel.nullable,
        valueSource: 'parent_relation',
        loadClassification: 'host_supplied_association',
        absentBehavior: absentBehaviorFor(rel.optional, rel.nullable),
        failureBehavior: 'graphql_field_error',
      });
    }
    relations.set(key, relationMap);

    for (const operation of resource.schema.operations) {
      const rootFieldName = rootFieldNameForOperation(
        resource.identity,
        operation.name,
      );
      const resourceSnapshot = resource;
      operations.set(rootFieldName, {
        rootFieldName,
        rootKind: operation.kind === 'query' ? 'query' : 'mutation',
        resourceIdentity: resource.identity,
        operationName: operation.name,
        resource: resourceSnapshot,
        invoke: (args, handlerProvider) =>
          invokeOperation(
            resourceSnapshot,
            operation.name,
            args,
            handlerProvider,
          ),
        handlerProviderSource: 'graphql_context.operationHandlerProvider',
        argCapture: 'graphql_args_to_map_with_presence',
        resultMapping:
          operation.result === 'void'
            ? 'void_to_rfvoid'
            : 'semantic_report_to_graphql',
        missingHandlerBehavior: 'resolve_time_failure',
      });
    }
  }

  return { fields, relations, operations };
}
