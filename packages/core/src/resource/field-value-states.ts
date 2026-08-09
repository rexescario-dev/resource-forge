import { err, ok, type Result } from '../result.js';
import type {
  FieldRuntimeValue,
  FieldValueStateError,
  Resource,
} from './types.js';

/**
 * RFC-025 Field value-state check: absent / present null / present non-null
 * against declaration `optional` × `nullable`. Does not amend RFC-018 gates.
 * Unknown map keys are ignored. Fail-fast in schema field order.
 */
export function checkFieldValueStates(
  resource: Resource,
  values: ReadonlyMap<string, FieldRuntimeValue>,
): Result<void, FieldValueStateError> {
  for (const field of resource.schema.fields) {
    if (!values.has(field.name)) {
      if (!field.optional) {
        return err({ code: 'forbidden_absent_field', field: field.name });
      }
      continue;
    }

    const value = values.get(field.name);
    if (value === null) {
      if (!field.nullable) {
        return err({ code: 'forbidden_null_field', field: field.name });
      }
      continue;
    }

    // present non-null — value-state OK (no FieldType gate in this slice)
  }

  return ok(undefined);
}
