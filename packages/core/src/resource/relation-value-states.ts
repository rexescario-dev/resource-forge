import { err, ok, type Result } from '../result.js';
import type {
  RelationRuntimeValue,
  RelationValueStateError,
  Resource,
} from './types.js';

/**
 * RFC-025 Relation value-state check.
 * Ordering: missing key → value === null → multiplicity shape → array elements.
 * `many + null` is association-level null (never a collection shape mismatch).
 * Does not inspect direction / inverse / join. Unknown map keys ignored.
 */
export function checkRelationValueStates(
  resource: Resource,
  values: ReadonlyMap<string, RelationRuntimeValue>,
): Result<void, RelationValueStateError> {
  for (const relation of resource.schema.relations) {
    if (!values.has(relation.name)) {
      if (!relation.optional) {
        return err({
          code: 'forbidden_absent_relation',
          relation: relation.name,
        });
      }
      continue;
    }

    const value = values.get(relation.name);

    // Top-level null BEFORE Array.isArray — association-level null path
    if (value === null) {
      if (!relation.nullable) {
        return err({
          code: 'forbidden_null_relation',
          relation: relation.name,
        });
      }
      continue;
    }

    if (relation.multiplicity === 'one') {
      if (Array.isArray(value)) {
        return err({
          code: 'relation_value_shape_mismatch',
          relation: relation.name,
          multiplicity: 'one',
        });
      }
      continue;
    }

    // multiplicity === "many"
    if (!Array.isArray(value)) {
      return err({
        code: 'relation_value_shape_mismatch',
        relation: relation.name,
        multiplicity: 'many',
      });
    }

    for (let index = 0; index < value.length; index += 1) {
      if (value[index] === null) {
        return err({
          code: 'forbidden_null_relation_element',
          relation: relation.name,
          index,
        });
      }
    }
  }

  return ok(undefined);
}
