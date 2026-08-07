import type { ResourceIdentity } from '../identity/types.js';
import type { IdentityValidationError } from '../identity/types.js';

export type EmptySchemaCollection = readonly [];

export type ResourceSchema = {
  readonly fields: EmptySchemaCollection;
  readonly relations: EmptySchemaCollection;
  readonly operations: EmptySchemaCollection;
};

export type EmptyAnnotations = {
  readonly readonlyTag: 'EmptyAnnotations';
};

export type Resource = {
  readonly identity: ResourceIdentity;
  readonly schema: ResourceSchema;
  readonly annotations: EmptyAnnotations;
};

export type ResourceValidationError =
  | {
      readonly code: 'invalid_identity';
      readonly cause: IdentityValidationError;
    }
  | { readonly code: 'invalid_schema' }
  | { readonly code: 'invalid_annotations' };
