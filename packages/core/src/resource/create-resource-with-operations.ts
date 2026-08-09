import type { ResourceIdentity } from '../identity/types.js';
import { err, type Result } from '../result.js';
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
 * Internal / test-only seam: checkOperations (and optional field/relation checks)
 * before snapshot, then Resource gate. NOT exported from package barrels.
 *
 * Reuses the same `checkOperations` implementation as `validateResource`.
 */
export function createResourceWithOperationsForTests(
  identity: ResourceIdentity,
  candidateOperations: readonly object[],
  annotations: Annotations = emptyAnnotations,
  candidateFields: readonly object[] = [],
  candidateRelations: readonly object[] = [],
): Result<Resource, ResourceValidationError> {
  const checkedFields = checkFields(candidateFields);
  if (!checkedFields.ok) {
    return err({ code: 'invalid_schema', cause: checkedFields.error });
  }

  const checkedRelations = checkRelations(
    candidateRelations,
    checkedFields.value,
  );
  if (!checkedRelations.ok) {
    return err({ code: 'invalid_schema', cause: checkedRelations.error });
  }

  const checkedOperations = checkOperations(candidateOperations);
  if (!checkedOperations.ok) {
    return err({ code: 'invalid_schema', cause: checkedOperations.error });
  }

  const fields = snapshotFields(checkedFields.value) as ReadonlyArray<Field>;
  const relations = snapshotRelations(
    checkedRelations.value,
  ) as ReadonlyArray<Relation>;
  const operations = snapshotOperations(
    checkedOperations.value,
  ) as ReadonlyArray<Operation>;

  return validateResource({
    identity,
    schema: {
      fields,
      relations,
      operations,
      constraints: Object.freeze([]) as ReadonlyArray<Constraint>,
    },
    annotations,
  });
}
