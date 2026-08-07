import {
  validateResourceIdentity,
  type ResourceIdentity,
} from '../identity/index.js';
import { err, ok, type Result } from '../result.js';
import { emptyAnnotations } from './empty-annotations.js';
import type {
  EmptyAnnotations,
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

function isEmptyAnnotations(value: EmptyAnnotations): boolean {
  if (value.readonlyTag !== 'EmptyAnnotations') {
    return false;
  }
  return Object.keys(value).length === 1;
}

export function validateResource(candidate: {
  identity: ResourceIdentity;
  schema: ResourceSchema;
  annotations: EmptyAnnotations;
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

  if (!isEmptyAnnotations(candidate.annotations)) {
    return err({ code: 'invalid_annotations' });
  }

  return ok({
    identity: identityResult.value,
    schema: {
      fields: candidate.schema.fields,
      relations: candidate.schema.relations,
      operations: candidate.schema.operations,
    },
    annotations: emptyAnnotations,
  });
}
