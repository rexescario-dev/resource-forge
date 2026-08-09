import type { ResourceIdentity } from '../identity/types.js';
import { err, type Result } from '../result.js';
import { emptyAnnotations } from './empty-annotations.js';
import { checkFields, snapshotFields } from './fields.js';
import { checkRelations, snapshotRelations } from './relations.js';
import type {
  Annotations,
  Constraint,
  Operation,
  Resource,
  ResourceValidationError,
} from './types.js';
import { validateResource } from './validate.js';

/**
 * Internal / test-only seam: validate candidates, then snapshot, then Resource gate.
 * NOT exported from package barrels.
 *
 * Validates candidate relation (and optional field) member shape, names,
 * uniqueness, declarative targets (RFC-001 user context), multiplicity
 * (`"one" | "many"`), required `optional` / `nullable` / `direction`, and
 * optional `inverse` / `join` (with `join.local` against owning fields) before
 * constructing the snapshot; successful construction freezes ordered Relations
 * and Fields and then passes the Resource through `validateResource`.
 */
export function createResourceWithRelationsForTests(
  identity: ResourceIdentity,
  candidateRelations: readonly object[],
  annotations: Annotations = emptyAnnotations,
  candidateFields: readonly object[] = [],
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

  const fields = snapshotFields(checkedFields.value);
  const relations = snapshotRelations(checkedRelations.value);

  return validateResource({
    identity,
    schema: {
      fields,
      relations,
      operations: Object.freeze([]) as ReadonlyArray<Operation>,
      constraints: Object.freeze([]) as ReadonlyArray<Constraint>,
    },
    annotations,
  });
}
