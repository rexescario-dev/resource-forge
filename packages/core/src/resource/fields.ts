import { err, ok, type Result } from '../result.js';
import type { Field, FieldName, FieldValidationError } from './types.js';

const FIELD_NAME_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

/** Internal: sole normative FieldName grammar (RFC-007). */
export function validateFieldName(
  name: string,
): Result<FieldName, { readonly code: 'invalid_field_name'; readonly name: string }> {
  if (typeof name !== 'string' || !FIELD_NAME_PATTERN.test(name)) {
    return err({ code: 'invalid_field_name', name: typeof name === 'string' ? name : String(name) });
  }
  return ok(name);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Internal: validate raw candidate members (closed shape, names, uniqueness)
 * before any `{ name }`-only materialization. MUST NOT strip unknown properties.
 */
export function checkFields(
  candidate: readonly unknown[],
): Result<Field[], FieldValidationError> {
  if (!Array.isArray(candidate)) {
    return err({ code: 'invalid_field_member', index: 0 });
  }

  const accepted: Field[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < candidate.length; index += 1) {
    const member = candidate[index];
    if (!isPlainObject(member)) {
      return err({ code: 'invalid_field_member', index });
    }

    const keys = Object.keys(member);
    if (keys.length !== 1 || keys[0] !== 'name') {
      return err({ code: 'invalid_field_member', index });
    }

    const rawName = member.name;
    if (typeof rawName !== 'string') {
      return err({
        code: 'invalid_field_name',
        index,
        name: String(rawName),
      });
    }

    const nameResult = validateFieldName(rawName);
    if (!nameResult.ok) {
      return err({
        code: 'invalid_field_name',
        index,
        name: nameResult.error.name,
      });
    }

    if (seen.has(nameResult.value)) {
      return err({
        code: 'duplicate_field_name',
        index,
        name: nameResult.value,
      });
    }
    seen.add(nameResult.value);
    accepted.push({ name: nameResult.value });
  }

  return ok(accepted);
}

/**
 * Internal: freeze an ordered sequence of already-validated Fields.
 * MUST NOT accept raw candidates or discard unknown properties.
 */
export function snapshotFields(fields: readonly Field[]): ReadonlyArray<Field> {
  return Object.freeze(
    fields.map((field) => Object.freeze({ name: field.name })),
  );
}

/** Internal / test-only: order-sensitive Field sequence equality. */
export function fieldsEqual(
  left: readonly Field[],
  right: readonly Field[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let i = 0; i < left.length; i += 1) {
    if (left[i]!.name !== right[i]!.name) {
      return false;
    }
  }
  return true;
}
