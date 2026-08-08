import { err, ok, type Result } from '../result.js';
import type {
  Constraint,
  ConstraintEnforcementError,
  ConstraintName,
  Field,
  FieldName,
  FieldRuntimeValue,
  FieldType,
  Resource,
} from './types.js';

function diagnostic(
  code: ConstraintEnforcementError['code'],
  index: number,
  constraintName: ConstraintName,
  field: FieldName,
  expected?: FieldType,
): ConstraintEnforcementError {
  if (code === 'field_value_type_mismatch') {
    return {
      code,
      index,
      constraintName,
      field,
      expected: expected!,
    };
  }
  return {
    code,
    index,
    constraintName,
    field,
  } as ConstraintEnforcementError;
}

function isAllowedRuntimeType(
  fieldType: FieldType,
  value: Exclude<FieldRuntimeValue, null>,
): boolean {
  if (fieldType === 'string') {
    return typeof value === 'string';
  }
  if (fieldType === 'boolean') {
    return typeof value === 'boolean';
  }
  return typeof value === 'number' && Number.isFinite(value);
}

function evaluateRange(
  constraint: Extract<Constraint, { kind: 'range' }>,
  value: number,
): boolean {
  if (constraint.min !== undefined && value < constraint.min) {
    return false;
  }
  if (constraint.max !== undefined && value > constraint.max) {
    return false;
  }
  return true;
}

function evaluatePattern(
  pattern: string,
  value: string,
): Result<'match', 'compile' | 'mismatch'> {
  let compiled: RegExp;
  try {
    compiled = new RegExp(pattern, '');
  } catch {
    return err('compile');
  }

  const match = compiled.exec(value);
  if (
    match === null ||
    match.index !== 0 ||
    match[0].length !== value.length
  ) {
    return err('mismatch');
  }
  return ok('match');
}

function evaluateEnum(
  values: ReadonlyArray<string | number | boolean>,
  value: string | number | boolean,
): boolean {
  for (const candidate of values) {
    if (candidate === value) {
      return true;
    }
  }
  return false;
}

/**
 * RFC-018 runtime constraint enforcement against a field-value map.
 * Assumes a declaration-valid Resource; does not re-run declaration validation.
 */
export function checkConstraintValues(
  resource: Resource,
  values: ReadonlyMap<string, FieldRuntimeValue>,
): Result<void, ConstraintEnforcementError> {
  const fieldsByName = new Map<string, Field>();
  for (const field of resource.schema.fields) {
    fieldsByName.set(field.name, field);
  }

  const constraints = resource.schema.constraints;
  if (constraints.length === 0) {
    return ok(undefined);
  }

  for (let index = 0; index < constraints.length; index += 1) {
    const constraint = constraints[index]!;
    const fieldName = constraint.field;
    const field = fieldsByName.get(fieldName);
    // Declaration-valid Resources always resolve; defensive no-op skip if absent.
    if (field === undefined) {
      continue;
    }

    const constraintName = constraint.name;
    const present = values.has(fieldName);

    if (!present) {
      if (field.optional) {
        continue;
      }
      return err(
        diagnostic(
          'missing_required_field_value',
          index,
          constraintName,
          fieldName,
        ),
      );
    }

    const runtimeValue = values.get(fieldName)!;

    if (runtimeValue === null) {
      if (field.nullable) {
        continue;
      }
      return err(
        diagnostic('null_field_value', index, constraintName, fieldName),
      );
    }

    if (!isAllowedRuntimeType(field.type, runtimeValue)) {
      return err(
        diagnostic(
          'field_value_type_mismatch',
          index,
          constraintName,
          fieldName,
          field.type,
        ),
      );
    }

    if (constraint.kind === 'range') {
      if (!evaluateRange(constraint, runtimeValue as number)) {
        return err(
          diagnostic(
            'range_constraint_violated',
            index,
            constraintName,
            fieldName,
          ),
        );
      }
      continue;
    }

    if (constraint.kind === 'pattern') {
      const patternResult = evaluatePattern(constraint.pattern, runtimeValue as string);
      if (!patternResult.ok) {
        return err(
          diagnostic(
            patternResult.error === 'compile'
              ? 'pattern_compilation_failure'
              : 'pattern_constraint_violated',
            index,
            constraintName,
            fieldName,
          ),
        );
      }
      continue;
    }

    if (!evaluateEnum(constraint.values, runtimeValue)) {
      return err(
        diagnostic(
          'enum_constraint_violated',
          index,
          constraintName,
          fieldName,
        ),
      );
    }
  }

  return ok(undefined);
}
