import type { ResourceIdentity } from '../identity/types.js';
import { err, type Result } from '../result.js';
import {
  checkConstraints,
  snapshotConstraints,
} from './constraints.js';
import { emptyAnnotations } from './empty-annotations.js';
import { checkFields, snapshotFields } from './fields.js';
import { checkOperations, snapshotOperations } from './operations.js';
import { checkRelations, snapshotRelations } from './relations.js';
import type {
  Annotations,
  Constraint,
  Field,
  Operation,
  Relation,
  Resource,
  ResourceValidationError,
} from './types.js';
import { validateResource } from './validate.js';

/**
 * Internal / test-only seam: checkConstraints (and optional field/relation/
 * operation checks) before snapshot, then Resource gate. NOT exported from
 * package barrels.
 *
 * Reuses the same `checkConstraints` implementation as `validateResource`.
 */
export function createResourceWithConstraintsForTests(
  identity: ResourceIdentity,
  candidateConstraints: readonly object[],
  annotations: Annotations = emptyAnnotations,
  candidateFields: readonly object[] = [],
  candidateRelations: readonly object[] = [],
  candidateOperations: readonly object[] = [],
): Result<Resource, ResourceValidationError> {
  const checkedFields = checkFields(candidateFields);
  if (!checkedFields.ok) {
    return err({ code: 'invalid_schema', cause: checkedFields.error });
  }

  const checkedRelations = checkRelations(candidateRelations);
  if (!checkedRelations.ok) {
    return err({ code: 'invalid_schema', cause: checkedRelations.error });
  }

  const checkedOperations = checkOperations(candidateOperations);
  if (!checkedOperations.ok) {
    return err({ code: 'invalid_schema', cause: checkedOperations.error });
  }

  const fields = snapshotFields(checkedFields.value) as ReadonlyArray<Field>;

  const checkedConstraints = checkConstraints(candidateConstraints, fields);
  if (!checkedConstraints.ok) {
    return err({ code: 'invalid_schema', cause: checkedConstraints.error });
  }

  const relations = snapshotRelations(
    checkedRelations.value,
  ) as ReadonlyArray<Relation>;
  const operations = snapshotOperations(
    checkedOperations.value,
  ) as ReadonlyArray<Operation>;
  const constraints = snapshotConstraints(
    checkedConstraints.value,
  ) as ReadonlyArray<Constraint>;

  return validateResource({
    identity,
    schema: {
      fields,
      relations,
      operations,
      constraints,
    },
    annotations,
  });
}
