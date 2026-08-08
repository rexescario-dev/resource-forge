import { err, ok, type Result } from '../result.js';
import type { Field, FieldName, FieldType, FieldValidationError } from './types.js';

const FIELD_NAME_PATTERN = /^[a-z][a-zA-Z0-9]*$/;
const FIELD_TYPES = new Set(['string', 'number', 'boolean']);

/** Internal: sole normative FieldName grammar (RFC-007). */
export function validateFieldName(
  name: string,
): Result<FieldName, { readonly code: 'invalid_field_name'; readonly name: string }> {
  if (typeof name !== 'string' || !FIELD_NAME_PATTERN.test(name)) {
    return err({ code: 'invalid_field_name', name: typeof name === 'string' ? name : String(name) });
  }
  return ok(name);
}

/** Module-private — not exported from fields.ts; not barrel-exported. */
function validateFieldType(
  type: unknown,
): Result<FieldType, { readonly code: 'invalid_field_type'; readonly type: unknown }> {
  if (typeof type !== 'string' || !FIELD_TYPES.has(type)) {
    return err({ code: 'invalid_field_type', type });
  }
  return ok(type as FieldType);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Internal: validate raw candidate members (closed shape, names, uniqueness, type)
 * before any `{ name, type }` materialization. MUST NOT strip unknown properties
 * or invent a default type.
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

    const keys = new Set(Object.keys(member));
    if (keys.size !== 2 || !keys.has('name') || !keys.has('type')) {
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

    const typeResult = validateFieldType(member.type);
    if (!typeResult.ok) {
      return err({
        code: 'invalid_field_type',
        index,
        type: typeResult.error.type,
      });
    }

    accepted.push({
      name: nameResult.value,
      type: typeResult.value,
      optional: member.optional as boolean,
    });
  }

  return ok(accepted);
}

/**
 * Internal: freeze an ordered sequence of already-validated Fields.
 * MUST NOT accept raw candidates, discard unknown properties, or invent type.
 */
export function snapshotFields(fields: readonly Field[]): ReadonlyArray<Field> {
  return Object.freeze(
    fields.map((field) =>
      Object.freeze({
        name: field.name,
        type: field.type,
        optional: field.optional,
      }),
    ),
  );
}

/** Internal / test-only: order-sensitive Field sequence equality (name and type). */
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
    if (left[i]!.type !== right[i]!.type) {
      return false;
    }
  }
  return true;
}
