import { err, ok, type Result } from '../result.js';
import { gateField } from './constraint-values.js';
import type {
  Constraint,
  ConstraintEnforcementError,
  ConstraintName,
  Field,
  FieldName,
  FieldRuntimeValue,
  OccupancyProvider,
  PopulationUniquenessError,
  Resource,
  UniquenessKey,
} from './types.js';

function uniqueViolated(
  index: number,
  constraintName: ConstraintName,
  field: FieldName,
): ConstraintEnforcementError {
  return {
    code: 'unique_constraint_violated',
    index,
    constraintName,
    field,
  };
}

function missingOccupancy(
  index: number,
  constraintName: ConstraintName,
): PopulationUniquenessError {
  return {
    code: 'missing_occupancy_surface',
    index,
    constraintName,
  };
}

function extractSingleFieldKey(
  field: Field,
  fieldName: FieldName,
  values: ReadonlyMap<string, FieldRuntimeValue>,
  index: number,
  constraintName: ConstraintName,
): Result<
  | { readonly kind: 'skip' }
  | { readonly kind: 'continue'; readonly key: UniquenessKey },
  ConstraintEnforcementError
> {
  const outcome = gateField(field, fieldName, values, index, constraintName);
  if (outcome.kind === 'fail') {
    return err(outcome.error);
  }
  if (outcome.kind === 'skip') {
    return ok({ kind: 'skip' });
  }
  return ok({ kind: 'continue', key: outcome.value });
}

function extractCompositeKey(
  fieldsByName: ReadonlyMap<string, Field>,
  fieldNames: ReadonlyArray<FieldName>,
  values: ReadonlyMap<string, FieldRuntimeValue>,
  index: number,
  constraintName: ConstraintName,
): Result<
  | { readonly kind: 'skip' }
  | {
      readonly kind: 'continue';
      readonly key: ReadonlyArray<Exclude<FieldRuntimeValue, null>>;
    },
  ConstraintEnforcementError
> {
  const collected: Array<Exclude<FieldRuntimeValue, null>> = [];

  for (const fieldName of fieldNames) {
    const field = fieldsByName.get(fieldName);
    if (field === undefined) {
      return ok({ kind: 'skip' });
    }
    const outcome = gateField(field, fieldName, values, index, constraintName);
    if (outcome.kind === 'fail') {
      return err(outcome.error);
    }
    if (outcome.kind === 'skip') {
      return ok({ kind: 'skip' });
    }
    collected.push(outcome.value);
  }

  return ok({ kind: 'continue', key: collected });
}

/**
 * RFC-020 population uniqueness check.
 * Evaluates only `unique` Constraints against a Constraint-scoped occupancy provider.
 * Does not re-run declaration validation. Treats `isOccupied` as authoritative.
 */
export function checkPopulationUniqueness(
  resource: Resource,
  values: ReadonlyMap<string, FieldRuntimeValue>,
  occupancyProvider: OccupancyProvider,
): Result<void, PopulationUniquenessError> {
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
    if (constraint.kind !== 'unique') {
      continue;
    }

    const constraintName = constraint.name;
    let key: UniquenessKey;
    let diagnosticField: FieldName;

    if ('fields' in constraint) {
      const extracted = extractCompositeKey(
        fieldsByName,
        constraint.fields,
        values,
        index,
        constraintName,
      );
      if (!extracted.ok) {
        return extracted;
      }
      if (extracted.value.kind === 'skip') {
        continue;
      }
      key = extracted.value.key;
      diagnosticField = constraint.fields[0]!;
    } else {
      const field = fieldsByName.get(constraint.field);
      if (field === undefined) {
        continue;
      }
      const extracted = extractSingleFieldKey(
        field,
        constraint.field,
        values,
        index,
        constraintName,
      );
      if (!extracted.ok) {
        return extracted;
      }
      if (extracted.value.kind === 'skip') {
        continue;
      }
      key = extracted.value.key;
      diagnosticField = constraint.field;
    }

    const surface = occupancyProvider(
      constraint as Extract<Constraint, { kind: 'unique' }>,
      index,
    );
    if (surface === undefined) {
      return err(missingOccupancy(index, constraintName));
    }

    if (surface.isOccupied(key)) {
      return err(uniqueViolated(index, constraintName, diagnosticField));
    }
  }

  return ok(undefined);
}
