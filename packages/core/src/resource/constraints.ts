import { err, ok, type Result } from '../result.js';
import { validateFieldName } from './fields.js';
import type {
  Constraint,
  ConstraintKind,
  ConstraintName,
  ConstraintValidationError,
  Field,
  FieldName,
  FieldType,
} from './types.js';

const CONSTRAINT_NAME_PATTERN = /^[a-z][a-zA-Z0-9]*$/;
const CONSTRAINT_KINDS: ReadonlySet<ConstraintKind> = new Set([
  'range',
  'pattern',
  'enum',
]);

/** Internal: sole normative ConstraintName grammar (RFC-016). */
export function validateConstraintName(
  name: string,
): Result<
  ConstraintName,
  { readonly code: 'invalid_constraint_name'; readonly name: string }
> {
  if (typeof name !== 'string' || !CONSTRAINT_NAME_PATTERN.test(name)) {
    return err({
      code: 'invalid_constraint_name',
      name: typeof name === 'string' ? name : String(name),
    });
  }
  return ok(name);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ownKeySet(member: object): Set<string> {
  return new Set(Object.keys(member));
}

function setsEqual(left: Set<string>, right: ReadonlyArray<string>): boolean {
  if (left.size !== right.length) {
    return false;
  }
  for (const key of right) {
    if (!left.has(key)) {
      return false;
    }
  }
  return true;
}

function isConstraintKind(value: string): value is ConstraintKind {
  return CONSTRAINT_KINDS.has(value as ConstraintKind);
}

function resolveTargetField(
  index: number,
  rawField: unknown,
  fieldsByName: ReadonlyMap<string, Field>,
): Result<Field, ConstraintValidationError> {
  if (typeof rawField !== 'string') {
    return err({
      code: 'invalid_constraint_field',
      index,
      field: rawField,
    });
  }

  const nameResult = validateFieldName(rawField);
  if (!nameResult.ok) {
    return err({
      code: 'invalid_constraint_field',
      index,
      field: rawField,
    });
  }

  const target = fieldsByName.get(nameResult.value);
  if (!target) {
    return err({
      code: 'unresolved_constraint_field',
      index,
      field: nameResult.value,
    });
  }

  return ok(target);
}

function requireFieldType(
  index: number,
  field: Field,
  expected: FieldType,
): Result<FieldName, ConstraintValidationError> {
  if (field.type !== expected) {
    return err({
      code: 'constraint_field_type_mismatch',
      index,
      field: field.name,
      expected,
      actual: field.type,
    });
  }
  return ok(field.name);
}

function valueMatchesFieldType(
  value: unknown,
  fieldType: FieldType,
): boolean {
  if (fieldType === 'string') {
    return typeof value === 'string';
  }
  if (fieldType === 'number') {
    return typeof value === 'number' && Number.isFinite(value);
  }
  return typeof value === 'boolean';
}

function checkEnumValues(
  index: number,
  values: unknown,
  fieldType: FieldType,
): Result<ReadonlyArray<string | number | boolean>, ConstraintValidationError> {
  if (!Array.isArray(values) || values.length === 0) {
    return err({ code: 'invalid_enum_values', index });
  }

  const accepted: Array<string | number | boolean> = [];
  const seen = new Set<string | number | boolean>();

  for (const value of values) {
    if (!valueMatchesFieldType(value, fieldType)) {
      return err({ code: 'invalid_enum_values', index });
    }
    const scalar = value as string | number | boolean;
    if (seen.has(scalar)) {
      return err({ code: 'invalid_enum_values', index });
    }
    seen.add(scalar);
    accepted.push(scalar);
  }

  return ok(accepted);
}

/**
 * Internal: single RFC-017 constraint collection validation (closed kinds,
 * discriminated shapes, field resolve/type-match, uniqueness) before
 * materialization. MUST NOT strip additional semantic properties. Reused by
 * construction fixtures and `validateResource`.
 */
export function checkConstraints(
  candidate: readonly unknown[],
  validatedFields: readonly Field[],
): Result<Constraint[], ConstraintValidationError> {
  if (!Array.isArray(candidate)) {
    return err({ code: 'invalid_constraints_collection' });
  }

  const fieldsByName = new Map<string, Field>();
  for (const field of validatedFields) {
    fieldsByName.set(field.name, field);
  }

  const accepted: Constraint[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < candidate.length; index += 1) {
    const member = candidate[index];
    if (!isPlainObject(member)) {
      return err({ code: 'invalid_constraint_member', index });
    }

    const keys = ownKeySet(member);
    const hasOwnKind = Object.prototype.hasOwnProperty.call(member, 'kind');

    if (!hasOwnKind && setsEqual(keys, ['name'])) {
      return err({ code: 'missing_constraint_kind', index });
    }

    if (!hasOwnKind) {
      return err({ code: 'invalid_constraint_member', index });
    }

    const rawKind = member.kind;
    if (typeof rawKind !== 'string' || rawKind.length === 0) {
      return err({
        code: 'invalid_constraint_kind',
        index,
        kind: rawKind,
      });
    }

    if (!isConstraintKind(rawKind)) {
      return err({
        code: 'unknown_constraint_kind',
        index,
        kind: rawKind,
      });
    }

    const rangeBoundsMissing = setsEqual(keys, ['name', 'kind', 'field']);
    const rangeMinOnly = setsEqual(keys, ['name', 'kind', 'field', 'min']);
    const rangeMaxOnly = setsEqual(keys, ['name', 'kind', 'field', 'max']);
    const rangeBoth = setsEqual(keys, ['name', 'kind', 'field', 'min', 'max']);
    const patternShape = setsEqual(keys, ['name', 'kind', 'field', 'pattern']);
    const enumShape = setsEqual(keys, ['name', 'kind', 'field', 'values']);

    if (rawKind === 'range') {
      if (
        !rangeBoundsMissing &&
        !rangeMinOnly &&
        !rangeMaxOnly &&
        !rangeBoth
      ) {
        return err({ code: 'invalid_constraint_member', index });
      }
    } else if (rawKind === 'pattern') {
      if (!patternShape) {
        return err({ code: 'invalid_constraint_member', index });
      }
    } else if (!enumShape) {
      return err({ code: 'invalid_constraint_member', index });
    }

    const rawName = member.name;
    if (typeof rawName !== 'string') {
      return err({
        code: 'invalid_constraint_name',
        index,
        name: String(rawName),
      });
    }

    const nameResult = validateConstraintName(rawName);
    if (!nameResult.ok) {
      return err({
        code: 'invalid_constraint_name',
        index,
        name: nameResult.error.name,
      });
    }

    if (seen.has(nameResult.value)) {
      return err({
        code: 'duplicate_constraint_name',
        index,
        name: nameResult.value,
      });
    }

    const fieldResult = resolveTargetField(index, member.field, fieldsByName);
    if (!fieldResult.ok) {
      return fieldResult;
    }
    const targetField = fieldResult.value;

    if (rawKind === 'range') {
      const typeResult = requireFieldType(index, targetField, 'number');
      if (!typeResult.ok) {
        return typeResult;
      }

      if (rangeBoundsMissing) {
        return err({ code: 'invalid_range_bounds', index });
      }

      const hasMin = Object.prototype.hasOwnProperty.call(member, 'min');
      const hasMax = Object.prototype.hasOwnProperty.call(member, 'max');
      const min = member.min;
      const max = member.max;

      if (hasMin && (typeof min !== 'number' || !Number.isFinite(min))) {
        return err({ code: 'invalid_range_bounds', index });
      }
      if (hasMax && (typeof max !== 'number' || !Number.isFinite(max))) {
        return err({ code: 'invalid_range_bounds', index });
      }
      if (
        hasMin &&
        hasMax &&
        typeof min === 'number' &&
        typeof max === 'number' &&
        min > max
      ) {
        return err({ code: 'invalid_range_bounds', index });
      }

      seen.add(nameResult.value);
      if (hasMin && hasMax) {
        accepted.push({
          name: nameResult.value,
          kind: 'range',
          field: typeResult.value,
          min: min as number,
          max: max as number,
        });
      } else if (hasMin) {
        accepted.push({
          name: nameResult.value,
          kind: 'range',
          field: typeResult.value,
          min: min as number,
        });
      } else {
        accepted.push({
          name: nameResult.value,
          kind: 'range',
          field: typeResult.value,
          max: max as number,
        });
      }
      continue;
    }

    if (rawKind === 'pattern') {
      const typeResult = requireFieldType(index, targetField, 'string');
      if (!typeResult.ok) {
        return typeResult;
      }

      const pattern = member.pattern;
      if (typeof pattern !== 'string' || pattern.length === 0) {
        return err({ code: 'invalid_pattern', index });
      }

      seen.add(nameResult.value);
      accepted.push({
        name: nameResult.value,
        kind: 'pattern',
        field: typeResult.value,
        pattern,
      });
      continue;
    }

    const valuesResult = checkEnumValues(index, member.values, targetField.type);
    if (!valuesResult.ok) {
      return valuesResult;
    }

    seen.add(nameResult.value);
    accepted.push({
      name: nameResult.value,
      kind: 'enum',
      field: targetField.name,
      values: valuesResult.value,
    });
  }

  return ok(accepted);
}

function snapshotConstraint(constraint: Constraint): Constraint {
  if (constraint.kind === 'range') {
    if (
      Object.prototype.hasOwnProperty.call(constraint, 'min') &&
      Object.prototype.hasOwnProperty.call(constraint, 'max')
    ) {
      return Object.freeze({
        name: constraint.name,
        kind: 'range' as const,
        field: constraint.field,
        min: constraint.min as number,
        max: constraint.max as number,
      });
    }
    if (Object.prototype.hasOwnProperty.call(constraint, 'min')) {
      return Object.freeze({
        name: constraint.name,
        kind: 'range' as const,
        field: constraint.field,
        min: constraint.min as number,
      });
    }
    return Object.freeze({
      name: constraint.name,
      kind: 'range' as const,
      field: constraint.field,
      max: constraint.max as number,
    });
  }

  if (constraint.kind === 'pattern') {
    return Object.freeze({
      name: constraint.name,
      kind: 'pattern' as const,
      field: constraint.field,
      pattern: constraint.pattern,
    });
  }

  return Object.freeze({
    name: constraint.name,
    kind: 'enum' as const,
    field: constraint.field,
    values: Object.freeze([...constraint.values]),
  });
}

/**
 * Internal: freeze an ordered sequence of already-validated Constraints.
 * Uses existing Resource nested snapshot/freeze treatment for `enum.values`.
 */
export function snapshotConstraints(
  constraints: readonly Constraint[],
): ReadonlyArray<Constraint> {
  return Object.freeze(constraints.map((constraint) => snapshotConstraint(constraint)));
}

function constraintEqual(left: Constraint, right: Constraint): boolean {
  if (
    left.name !== right.name ||
    left.kind !== right.kind ||
    left.field !== right.field
  ) {
    return false;
  }

  if (left.kind === 'range' && right.kind === 'range') {
    const leftHasMin = Object.prototype.hasOwnProperty.call(left, 'min');
    const rightHasMin = Object.prototype.hasOwnProperty.call(right, 'min');
    const leftHasMax = Object.prototype.hasOwnProperty.call(left, 'max');
    const rightHasMax = Object.prototype.hasOwnProperty.call(right, 'max');
    if (leftHasMin !== rightHasMin || leftHasMax !== rightHasMax) {
      return false;
    }
    if (leftHasMin && left.min !== right.min) {
      return false;
    }
    if (leftHasMax && left.max !== right.max) {
      return false;
    }
    return true;
  }

  if (left.kind === 'pattern' && right.kind === 'pattern') {
    return left.pattern === right.pattern;
  }

  if (left.kind === 'enum' && right.kind === 'enum') {
    if (left.values.length !== right.values.length) {
      return false;
    }
    for (let i = 0; i < left.values.length; i += 1) {
      if (left.values[i] !== right.values[i]) {
        return false;
      }
    }
    return true;
  }

  return false;
}

/** Internal / test-only: order-sensitive Constraint sequence equality. */
export function constraintsEqual(
  left: readonly Constraint[],
  right: readonly Constraint[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let i = 0; i < left.length; i += 1) {
    if (!constraintEqual(left[i]!, right[i]!)) {
      return false;
    }
  }
  return true;
}
