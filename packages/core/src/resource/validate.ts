import {
  validateResourceIdentity,
  type ResourceIdentity,
} from '../identity/index.js';
import { err, ok, type Result } from '../result.js';
import { checkAnnotations } from './annotations.js';
import type {
  Annotations,
  Resource,
  ResourceSchema,
  ResourceValidationError,
} from './types.js';

function isEmptySchemaCollection(value: unknown): value is readonly [] {
  return Array.isArray(value) && value.length === 0;
}

function isValidEmptySchema(schema: ResourceSchema): boolean {
  return (
    isEmptySchemaCollection(schema.fields) &&
    isEmptySchemaCollection(schema.relations) &&
    isEmptySchemaCollection(schema.operations)
  );
}

export function validateResource(candidate: {
  identity: ResourceIdentity;
  schema: ResourceSchema;
  annotations: Annotations;
}): Result<Resource, ResourceValidationError> {
  const kind =
    candidate.identity.namespace === 'rf' ? 'framework' : 'user';
  const identityResult = validateResourceIdentity(candidate.identity, { kind });
  if (!identityResult.ok) {
    return err({ code: 'invalid_identity', cause: identityResult.error });
  }

  if (!candidate.schema || !isValidEmptySchema(candidate.schema)) {
    return err({ code: 'invalid_schema' });
  }

  const annotationsResult = checkAnnotations(candidate.annotations);
  if (!annotationsResult.ok) {
    return err({
      code: 'invalid_annotations',
      cause: annotationsResult.error,
    });
  }

  return ok({
    identity: identityResult.value,
    schema: {
      fields: candidate.schema.fields,
      relations: candidate.schema.relations,
      operations: candidate.schema.operations,
    },
    // Authoritative snapshot already established at construction; do not re-snapshot here.
    annotations: candidate.annotations,
  });
}
