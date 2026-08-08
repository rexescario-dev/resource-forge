import {
  validateResourceIdentity,
  type ResourceIdentity,
} from '../identity/index.js';
import { err, ok, type Result } from '../result.js';
import { checkAnnotations } from './annotations.js';
import { checkConstraints, snapshotConstraints } from './constraints.js';
import { checkFields, snapshotFields } from './fields.js';
import { checkOperations, snapshotOperations } from './operations.js';
import { checkRelations, snapshotRelations } from './relations.js';
import type {
  Annotations,
  Resource,
  ResourceValidationError,
} from './types.js';

export function validateResource(candidate: {
  identity: ResourceIdentity;
  schema: unknown;
  annotations: Annotations;
}): Result<Resource, ResourceValidationError> {
  const kind =
    candidate.identity.namespace === 'rf' ? 'framework' : 'user';
  const identityResult = validateResourceIdentity(candidate.identity, { kind });
  if (!identityResult.ok) {
    return err({ code: 'invalid_identity', cause: identityResult.error });
  }

  const schema = candidate.schema as unknown;
  if (!schema || typeof schema !== 'object') {
    return err({ code: 'invalid_schema' });
  }

  const schemaRecord = schema as Record<string, unknown>;

  if (
    !Array.isArray(schemaRecord.fields) ||
    !Array.isArray(schemaRecord.relations) ||
    !Array.isArray(schemaRecord.operations)
  ) {
    return err({ code: 'invalid_schema' });
  }

  if (!Object.prototype.hasOwnProperty.call(schemaRecord, 'constraints')) {
    return err({
      code: 'invalid_schema',
      cause: { code: 'missing_constraints' },
    });
  }

  if (!Array.isArray(schemaRecord.constraints)) {
    return err({
      code: 'invalid_schema',
      cause: { code: 'invalid_constraints_collection' },
    });
  }

  const fieldsResult = checkFields(schemaRecord.fields);
  if (!fieldsResult.ok) {
    return err({ code: 'invalid_schema', cause: fieldsResult.error });
  }

  const relationsResult = checkRelations(schemaRecord.relations);
  if (!relationsResult.ok) {
    return err({ code: 'invalid_schema', cause: relationsResult.error });
  }

  // Delegate to the single Operation-validation implementation (RFC-012 / M3.9 plan).
  const operationsResult = checkOperations(schemaRecord.operations);
  if (!operationsResult.ok) {
    return err({ code: 'invalid_schema', cause: operationsResult.error });
  }

  // Delegate to the single Constraint-validation implementation (RFC-016 / M3.13 plan).
  const constraintsResult = checkConstraints(schemaRecord.constraints);
  if (!constraintsResult.ok) {
    return err({ code: 'invalid_schema', cause: constraintsResult.error });
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
      operations: snapshotOperations(operationsResult.value),
      constraints: snapshotConstraints(constraintsResult.value),
    },
    // Authoritative annotations snapshot already established at construction; do not re-snapshot here.
    annotations: candidate.annotations,
  });
}
