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

function hasExactOwnKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value);
  if (keys.length !== expected.length) {
    return false;
  }
  return expected.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

/**
 * Internal: validate raw candidate members (closed shape, names, uniqueness, type,
 * optional, nullable) before any `{ name, type, optional, nullable }` materialization.
 * MUST NOT strip unknown properties or invent a default optional/nullable.
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
    // M3.10 candidate-object acceptance only (not closed key-set classification).
    if (!isPlainObject(member)) {
      return err({ code: 'invalid_field_member', index });
    }

    const hasOptional = Object.prototype.hasOwnProperty.call(member, 'optional');
    if (!hasOptional) {
      if (hasExactOwnKeys(member, ['name', 'type'])) {
        return err({ code: 'missing_field_optional', index });
      }
      return err({ code: 'invalid_field_member', index });
    }

    const hasNullable = Object.prototype.hasOwnProperty.call(member, 'nullable');
    if (!hasNullable) {
      if (hasExactOwnKeys(member, ['name', 'type', 'optional'])) {
        return err({ code: 'missing_field_nullable', index });
      }
      return err({ code: 'invalid_field_member', index });
    }

    if (!hasExactOwnKeys(member, ['name', 'type', 'optional', 'nullable'])) {
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

    const rawOptional = member.optional;
    if (typeof rawOptional !== 'boolean') {
      return err({
        code: 'invalid_field_optional',
        index,
        optional: rawOptional,
      });
    }

    const rawNullable = member.nullable;
    if (typeof rawNullable !== 'boolean') {
      return err({
        code: 'invalid_field_nullable',
        index,
        nullable: rawNullable,
      });
    }

    accepted.push({
      name: nameResult.value,
      type: typeResult.value,
      optional: rawOptional,
      nullable: rawNullable,
    });
  }

  return ok(accepted);
}

/**
 * Internal: freeze an ordered sequence of already-validated Fields.
 * MUST NOT accept raw candidates, discard unknown properties, invent type,
 * invent optional, or invent nullable.
 */
export function snapshotFields(fields: readonly Field[]): ReadonlyArray<Field> {
  return Object.freeze(
    fields.map((field) =>
      Object.freeze({
        name: field.name,
        type: field.type,
        optional: field.optional,
        nullable: field.nullable,
      }),
    ),
  );
}

/** Internal / test-only: order-sensitive Field sequence equality (name, type, optional, nullable). */
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
    if (left[i]!.optional !== right[i]!.optional) {
      return false;
    }
    if (left[i]!.nullable !== right[i]!.nullable) {
      return false;
    }
  }
  return true;
}
