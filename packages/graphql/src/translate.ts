import {
  validateResource,
  type Resource,
  type Result,
} from '@resource-forge/core';
import { validateSchema, type GraphQLSchema } from 'graphql';
import { translationError, type GraphqlTranslationError } from './errors.js';
import { buildResolverBindings, type ResolverBindings } from './resolvers.js';
import { buildGraphqlSchema } from './schema.js';

export type GraphqlTranslation = {
  readonly schema: GraphQLSchema;
  readonly resolverBindings: ResolverBindings;
};

/**
 * Translate a Resource unit into a GraphQL schema + resolver-binding contracts.
 * Atomic success or fail-closed failure (RFC-032 §4–§8).
 */
export function translateResources(
  resources: readonly Resource[],
): Result<GraphqlTranslation, GraphqlTranslationError> {
  if (resources.length === 0) {
    return {
      ok: false,
      error: translationError(
        'empty_translation_unit',
        'Translation unit contains zero Resources',
      ),
    };
  }

  for (const resource of resources) {
    const validated = validateResource(resource);
    if (!validated.ok) {
      return {
        ok: false,
        error: translationError(
          'invalid_resource',
          `Resource ${resource.identity.namespace}/${resource.identity.name} failed validateResource`,
          validated.error,
        ),
      };
    }
  }

  const built = buildGraphqlSchema(resources);
  if (!built.ok) {
    return built;
  }

  const errors = validateSchema(built.value.schema);
  if (errors.length > 0) {
    return {
      ok: false,
      error: translationError(
        'invalid_graphql_schema',
        'GraphQL.js validateSchema reported errors',
        errors.map((e) => e.message),
      ),
    };
  }

  const resolverBindings = buildResolverBindings(
    resources,
    built.value.typeNameByIdentityKey,
  );

  return {
    ok: true,
    value: {
      schema: built.value.schema,
      resolverBindings,
    },
  };
}
