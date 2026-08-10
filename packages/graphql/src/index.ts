/**
 * @resource-forge/graphql
 *
 * GraphQL translation for Resource Forge (RFC-032).
 * Depends on @resource-forge/core and GraphQL.js. Must not depend on Nest or Prisma.
 */
import { PACKAGE_NAME as CORE_PACKAGE_NAME } from '@resource-forge/core';

export const PACKAGE_NAME = '@resource-forge/graphql' as const;
export const PACKAGE_VERSION = '0.0.0' as const;

/** Ensures the workspace dependency on core resolves at build time. */
export const CORE_DEPENDENCY = CORE_PACKAGE_NAME;

export { translateResources } from './translate.js';
export type { GraphqlTranslation } from './translate.js';
export type { GraphqlTranslationError, GraphqlTranslationErrorCode } from './errors.js';
export type {
  AbsentBehavior,
  FailureBehavior,
  FieldBinding,
  GraphqlResolveContext,
  OperationBinding,
  RelationBinding,
  ResolverBindings,
} from './resolvers.js';
export {
  buildResolverBindings,
  captureOperationArgs,
  createFieldResolver,
  createOperationResolver,
  createRelationResolver,
  enforceAbsentBehavior,
  mapSemanticResult,
} from './resolvers.js';
export {
  graphqlTypeNameForIdentity,
  isLegalGraphqlName,
  isLegalGraphqlTypeName,
  isReservedGraphqlTypeName,
  rootFieldNameForOperation,
} from './naming.js';
