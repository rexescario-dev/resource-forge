import {
  validateResourceIdentity,
  type ResourceIdentity,
} from '../identity/index.js';
import { err, ok, type Result } from '../result.js';
import { checkAnnotations } from './annotations.js';
import { checkFields, snapshotFields } from './fields.js';
import { checkRelations, snapshotRelations } from './relations.js';
import type {
  Annotations,
  EmptySchemaCollection,
  Resource,
  ResourceSchema,
  ResourceValidationError,
} from './types.js';

function isEmptySchemaCollection(value: unknown): value is EmptySchemaCollection {
  return Array.isArray(value) && value.length === 0;
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

  const schema = candidate.schema;
  if (!schema || typeof schema !== 'object') {
    return err({ code: 'invalid_schema' });
  }

  if (
    !Array.isArray(schema.fields) ||
    !Array.isArray(schema.relations) ||
    !('operations' in schema) ||
    !isEmptySchemaCollection(schema.operations)
  ) {
    return err({ code: 'invalid_schema' });
  }

  const fieldsResult = checkFields(schema.fields);
  if (!fieldsResult.ok) {
    return err({ code: 'invalid_schema', cause: fieldsResult.error });
  }

  const relationsResult = checkRelations(schema.relations);
  if (!relationsResult.ok) {
    return err({ code: 'invalid_schema', cause: relationsResult.error });
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
      // Freeze validated members so Resource ownership does not alias caller arrays/objects.
      fields: snapshotFields(fieldsResult.value),
      relations: snapshotRelations(relationsResult.value),
      operations: schema.operations,
    },
    // Authoritative annotations snapshot already established at construction; do not re-snapshot here.
    annotations: candidate.annotations,
  });
}
