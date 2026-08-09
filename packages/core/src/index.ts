/**
 * @resource-forge/core
 *
 * Core contracts for Resource Forge. Must not depend on NestJS, Prisma, or GraphQL.
 */
export const PACKAGE_NAME = '@resource-forge/core' as const;
export const PACKAGE_VERSION = '0.0.0' as const;

export type { Err, Ok, Result } from './result.js';
export { err, ok } from './result.js';

export type {
  IdentityValidationError,
  ResourceIdentity,
  ResourceIdentityKind,
} from './identity/index.js';
export {
  createResourceIdentity,
  resourceIdentitiesEqual,
  validateResourceIdentity,
} from './identity/index.js';

export type {
  JsonValue,
  JsonValueValidationError,
  MetadataEntry,
  MetadataKey,
  MetadataKeyKind,
  MetadataKeyValidationError,
  MetadataValidationError,
  ResourceMetadata,
} from './metadata/index.js';
export {
  createMetadataKey,
  createResourceMetadata,
  metadataKeysEqual,
  resourceMetadataEqual,
  validateJsonValue,
  validateMetadataKey,
  validateResourceMetadata,
} from './metadata/index.js';

export type {
  LookupResult,
  RegisterError,
  RegistryMutationError,
  ReplaceError,
  ResourceRegistry,
  UnregisterError,
} from './registry/index.js';
export { createInMemoryResourceRegistry } from './registry/index.js';

export type {
  CompositionError,
  Contribution,
  ContributionEntry,
  ContributionValidationError,
  NamespacePartition,
  ProducerKind,
} from './extension/index.js';
export { composeResourceMetadata } from './extension/index.js';

export type {
  AnnotationValidationError,
  Annotations,
  Constraint,
  ConstraintEnforcementError,
  ConstraintKind,
  ConstraintName,
  ConstraintValidationError,
  Field,
  FieldName,
  FieldRuntimeValue,
  FieldType,
  FieldValidationError,
  MissingOccupancyError,
  OccupancyProvider,
  OccupancySurface,
  Operation,
  OperationHandler,
  OperationHandlerProvider,
  OperationInvocationError,
  OperationKind,
  OperationName,
  OperationParam,
  OperationParamName,
  OperationResultType,
  OperationRuntimeValue,
  OperationValidationError,
  SemanticResultReport,
  PopulationUniquenessError,
  Relation,
  RelationMultiplicity,
  RelationName,
  RelationValidationError,
  Resource,
  ResourceProjectionError,
  ResourceSchema,
  ResourceValidationError,
  UniquenessKey,
} from './resource/index.js';
export {
  checkConstraintValues,
  checkPopulationUniqueness,
  createEmptyResourceSchema,
  createResource,
  emptyAnnotations,
  invokeOperation,
  projectResourceMetadata,
  validateResource,
} from './resource/index.js';
