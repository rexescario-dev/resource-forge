import type { ResourceIdentity } from '../identity/types.js';
import { err, type Result } from '../result.js';
import { emptyAnnotations } from './empty-annotations.js';
import { checkFields, snapshotFields } from './fields.js';
import type {
  Annotations,
  Constraint,
  Operation,
  Relation,
  Resource,
  ResourceValidationError,
} from './types.js';
import { validateResource } from './validate.js';

/**
 * Internal / test-only seam: validate candidates, then snapshot, then Resource gate.
 * NOT exported from package barrels.
 *
 * Validates candidate member shape (`name` + `type` + `optional` + `nullable`
 * exactly), names, uniqueness, FieldType membership, and required
 * `optional` / `nullable` booleans before constructing the snapshot; successful
 * construction freezes ordered `{ name, type, optional, nullable }` members and
 * then passes the Resource through `validateResource`.
 */
export function createResourceWithFieldsForTests(
  identity: ResourceIdentity,
  candidateFields: readonly object[],
  annotations: Annotations = emptyAnnotations,
): Result<Resource, ResourceValidationError> {
  const checked = checkFields(candidateFields);
  if (!checked.ok) {
    return err({ code: 'invalid_schema', cause: checked.error });
  }

  const fields = snapshotFields(checked.value);

  return validateResource({
    identity,
    schema: {
      fields,
      relations: Object.freeze([]) as ReadonlyArray<Relation>,
      operations: Object.freeze([]) as ReadonlyArray<Operation>,
      constraints: Object.freeze([]) as ReadonlyArray<Constraint>,
    },
    annotations,
  });
}
