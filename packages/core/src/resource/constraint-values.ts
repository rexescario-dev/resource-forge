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
): Result<void, 'compile' | 'mismatch'> {
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, '');
  } catch {
    return err('compile');
  }
  const match = regex.exec(value);
  if (
    match === null ||
    match.index !== 0 ||
    match[0]!.length !== value.length
  ) {
    return err('mismatch');
  }
  return ok(undefined);
}

function evaluateEnum(
  values: ReadonlyArray<string | number | boolean>,
  value: Exclude<FieldRuntimeValue, null>,
): boolean {
  for (const candidate of values) {
    if (candidate === value) {
      return true;
    }
  }
  return false;
}

function evaluateDistinct(
  collected: ReadonlyArray<Exclude<FieldRuntimeValue, null>>,
): boolean {
  for (let i = 0; i < collected.length; i += 1) {
    for (let j = i + 1; j < collected.length; j += 1) {
      if (collected[i] === collected[j]) {
        return false;
      }
    }
  }
  return true;
}

function evaluateEqual(
  collected: ReadonlyArray<Exclude<FieldRuntimeValue, null>>,
): boolean {
  const first = collected[0]!;
  for (let i = 1; i < collected.length; i += 1) {
    if (collected[i] !== first) {
      return false;
    }
  }
  return true;
}

export type GateOutcome =
  | { readonly kind: 'skip' }
  | { readonly kind: 'fail'; readonly error: ConstraintEnforcementError }
  | {
      readonly kind: 'continue';
      readonly value: Exclude<FieldRuntimeValue, null>;
    };

/** Shared with population uniqueness; not a package public API. */
export function gateField(
  field: Field,
  fieldName: FieldName,
  values: ReadonlyMap<string, FieldRuntimeValue>,
  index: number,
  constraintName: ConstraintName,
): GateOutcome {
  const present = values.has(fieldName);

  if (!present) {
    if (field.optional) {
      return { kind: 'skip' };
    }
    return {
      kind: 'fail',
      error: diagnostic(
        'missing_required_field_value',
        index,
        constraintName,
        fieldName,
      ),
    };
  }

  const runtimeValue = values.get(fieldName)!;

  if (runtimeValue === null) {
    if (field.nullable) {
      return { kind: 'skip' };
    }
    return {
      kind: 'fail',
      error: diagnostic('null_field_value', index, constraintName, fieldName),
    };
  }

  if (!isAllowedRuntimeType(field.type, runtimeValue)) {
    return {
      kind: 'fail',
      error: diagnostic(
        'field_value_type_mismatch',
        index,
        constraintName,
        fieldName,
        field.type,
      ),
    };
  }

  return { kind: 'continue', value: runtimeValue };
}

/**
 * RFC-018 / RFC-019 runtime constraint enforcement against a field-value map.
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
    const constraintName = constraint.name;

    if (constraint.kind === 'unique') {
      continue;
    }

    if (constraint.kind === 'distinct' || constraint.kind === 'equal') {
      const collected: Array<Exclude<FieldRuntimeValue, null>> = [];
      let skipped = false;

      for (const fieldName of constraint.fields) {
        const field = fieldsByName.get(fieldName);
        if (field === undefined) {
          skipped = true;
          break;
        }

        const outcome = gateField(
          field,
          fieldName,
          values,
          index,
          constraintName,
        );
        if (outcome.kind === 'fail') {
          return err(outcome.error);
        }
        if (outcome.kind === 'skip') {
          skipped = true;
          break;
        }
        collected.push(outcome.value);
      }

      if (skipped) {
        continue;
      }

      const diagnosticField = constraint.fields[0]!;
      if (constraint.kind === 'distinct') {
        if (!evaluateDistinct(collected)) {
          return err(
            diagnostic(
              'distinct_constraint_violated',
              index,
              constraintName,
              diagnosticField,
            ),
          );
        }
      } else if (!evaluateEqual(collected)) {
        return err(
          diagnostic(
            'equal_constraint_violated',
            index,
            constraintName,
            diagnosticField,
          ),
        );
      }
      continue;
    }

    const fieldName = constraint.field;
    const field = fieldsByName.get(fieldName);
    // Declaration-valid Resources always resolve; defensive no-op skip if absent.
    if (field === undefined) {
      continue;
    }

    const outcome = gateField(field, fieldName, values, index, constraintName);
    if (outcome.kind === 'fail') {
      return err(outcome.error);
    }
    if (outcome.kind === 'skip') {
      continue;
    }

    const runtimeValue = outcome.value;

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
      const patternResult = evaluatePattern(
        constraint.pattern,
        runtimeValue as string,
      );
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
