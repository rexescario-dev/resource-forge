import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { checkConstraintValues } from './constraint-values.js';
import { createResourceWithConstraintsForTests } from './create-resource-with-constraints.js';
import type { FieldRuntimeValue, Resource } from './types.js';

const totalField = {
  name: 'total',
  type: 'number' as const,
  optional: false,
  nullable: false,
};
const codeField = {
  name: 'code',
  type: 'string' as const,
  optional: true,
  nullable: false,
};
const noteField = {
  name: 'note',
  type: 'string' as const,
  optional: true,
  nullable: true,
};
const statusField = {
  name: 'status',
  type: 'string' as const,
  optional: false,
  nullable: false,
};
const unusedRequiredField = {
  name: 'unused',
  type: 'string' as const,
  optional: false,
  nullable: false,
};

function requireResource(
  result: { ok: true; value: Resource } | { ok: false; error: unknown },
): Resource {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('expected declaration-valid Resource');
  }
  return result.value;
}

function mapOf(
  entries: ReadonlyArray<readonly [string, FieldRuntimeValue]>,
): Map<string, FieldRuntimeValue> {
  return new Map(entries);
}

function resourceWithConstraints(
  constraints: readonly object[],
  fields: readonly object[] = [totalField, codeField, noteField, statusField],
): Resource {
  const identity = createResourceIdentity('crm', 'Order');
  expect(identity.ok).toBe(true);
  if (!identity.ok) {
    throw new Error('identity');
  }
  return requireResource(
    createResourceWithConstraintsForTests(
      identity.value,
      constraints,
      undefined,
      fields,
    ),
  );
}

describe('RFC-018 checkConstraintValues — gates / value surface', () => {
  it('returns ok(undefined) for empty constraints without evaluating gates', () => {
    const resource = resourceWithConstraints([], [
      totalField,
      unusedRequiredField,
    ]);
    const values = mapOf([['unknown', 'x']]);
    const result = checkConstraintValues(resource, values);
    expect(result).toEqual({ ok: true, value: undefined });
  });

  it('ignores unknown map keys when constraints pass', () => {
    const resource = resourceWithConstraints([
      {
        name: 'totalBounds',
        kind: 'range',
        field: 'total',
        min: 0,
        max: 100,
      },
    ]);
    const result = checkConstraintValues(
      resource,
      mapOf([
        ['total', 50],
        ['extra', 'ignored'],
      ]),
    );
    expect(result.ok).toBe(true);
  });

  it('skips optional absent fields and still evaluates later constraints', () => {
    const resource = resourceWithConstraints([
      {
        name: 'codePattern',
        kind: 'pattern',
        field: 'code',
        pattern: '^[A-Z]+$',
      },
      {
        name: 'statusEnum',
        kind: 'enum',
        field: 'status',
        values: ['open', 'closed'],
      },
    ]);
    const result = checkConstraintValues(
      resource,
      mapOf([['status', 'open']]),
    );
    expect(result.ok).toBe(true);
  });

  it('fails missing_required_field_value only when a Constraint targets the Field', () => {
    const resource = resourceWithConstraints(
      [
        {
          name: 'totalBounds',
          kind: 'range',
          field: 'total',
          min: 0,
        },
      ],
      [totalField, unusedRequiredField],
    );

    const missingTargeted = checkConstraintValues(
      resource,
      mapOf([['unused', 'present']]),
    );
    expect(missingTargeted.ok).toBe(false);
    if (missingTargeted.ok) return;
    expect(missingTargeted.error).toEqual({
      code: 'missing_required_field_value',
      index: 0,
      constraintName: 'totalBounds',
      field: 'total',
    });

    const untargetedRequiredAbsent = checkConstraintValues(
      resource,
      mapOf([['total', 1]]),
    );
    expect(untargetedRequiredAbsent.ok).toBe(true);
  });

  it('applies nullable skip vs null_field_value', () => {
    const resource = resourceWithConstraints([
      {
        name: 'notePattern',
        kind: 'pattern',
        field: 'note',
        pattern: '^x$',
      },
      {
        name: 'codePattern',
        kind: 'pattern',
        field: 'code',
        pattern: '^x$',
      },
    ]);

    const skipNull = checkConstraintValues(
      resource,
      mapOf([['note', null]]),
    );
    // note nullable → skip; code absent optional → skip
    expect(skipNull.ok).toBe(true);

    const nullRequired = checkConstraintValues(
      resource,
      mapOf([
        ['code', null],
        ['note', null],
      ]),
    );
    expect(nullRequired.ok).toBe(false);
    if (nullRequired.ok) return;
    expect(nullRequired.error).toEqual({
      code: 'null_field_value',
      index: 1,
      constraintName: 'codePattern',
      field: 'code',
    });
  });

  it('reports field_value_type_mismatch for wrong types and non-finite numbers', () => {
    const resource = resourceWithConstraints([
      {
        name: 'totalBounds',
        kind: 'range',
        field: 'total',
        min: 0,
        max: 10,
      },
    ]);

    const wrongType = checkConstraintValues(
      resource,
      mapOf([['total', '1']]),
    );
    expect(wrongType.ok).toBe(false);
    if (wrongType.ok) return;
    expect(wrongType.error).toEqual({
      code: 'field_value_type_mismatch',
      index: 0,
      constraintName: 'totalBounds',
      field: 'total',
      expected: 'number',
    });

    const nonFinite = checkConstraintValues(
      resource,
      mapOf([['total', Number.NaN]]),
    );
    expect(nonFinite.ok).toBe(false);
    if (nonFinite.ok) return;
    expect(nonFinite.error.code).toBe('field_value_type_mismatch');
  });
});

describe('RFC-018 checkConstraintValues — kind evaluation', () => {
  it('evaluates inclusive range bounds', () => {
    const resource = resourceWithConstraints([
      {
        name: 'totalBounds',
        kind: 'range',
        field: 'total',
        min: 0,
        max: 100,
      },
    ]);

    expect(checkConstraintValues(resource, mapOf([['total', 0]])).ok).toBe(
      true,
    );
    expect(checkConstraintValues(resource, mapOf([['total', 100]])).ok).toBe(
      true,
    );

    const low = checkConstraintValues(resource, mapOf([['total', -0.1]]));
    expect(low.ok).toBe(false);
    if (low.ok) return;
    expect(low.error).toEqual({
      code: 'range_constraint_violated',
      index: 0,
      constraintName: 'totalBounds',
      field: 'total',
    });

    const high = checkConstraintValues(resource, mapOf([['total', 100.1]]));
    expect(high.ok).toBe(false);
    if (high.ok) return;
    expect(high.error.code).toBe('range_constraint_violated');
  });

  it('supports min-only and max-only range', () => {
    const minOnly = resourceWithConstraints([
      { name: 'minTotal', kind: 'range', field: 'total', min: 5 },
    ]);
    expect(checkConstraintValues(minOnly, mapOf([['total', 5]])).ok).toBe(true);
    expect(checkConstraintValues(minOnly, mapOf([['total', 4]])).ok).toBe(
      false,
    );

    const maxOnly = resourceWithConstraints([
      { name: 'maxTotal', kind: 'range', field: 'total', max: 5 },
    ]);
    expect(checkConstraintValues(maxOnly, mapOf([['total', 5]])).ok).toBe(true);
    expect(checkConstraintValues(maxOnly, mapOf([['total', 6]])).ok).toBe(
      false,
    );
  });

  it('matches patterns with full-string extent and ordinary anchors', () => {
    const resource = resourceWithConstraints([
      {
        name: 'codePattern',
        kind: 'pattern',
        field: 'code',
        pattern: '^[A-Z]+$',
      },
    ]);

    expect(
      checkConstraintValues(resource, mapOf([['code', 'ABC']])).ok,
    ).toBe(true);

    const partial = checkConstraintValues(
      resource,
      mapOf([['code', 'ABCdef']]),
    );
    expect(partial.ok).toBe(false);
    if (partial.ok) return;
    expect(partial.error.code).toBe('pattern_constraint_violated');

    const unanchored = resourceWithConstraints([
      {
        name: 'codePattern',
        kind: 'pattern',
        field: 'code',
        pattern: 'ABC',
      },
    ]);
    expect(
      checkConstraintValues(unanchored, mapOf([['code', 'ABC']])).ok,
    ).toBe(true);
    expect(
      checkConstraintValues(unanchored, mapOf([['code', 'xABCy']])).ok,
    ).toBe(false);
  });

  it('reports pattern_compilation_failure for uncompilable patterns', () => {
    const resource = resourceWithConstraints([
      {
        name: 'badPattern',
        kind: 'pattern',
        field: 'code',
        pattern: '[',
      },
    ]);
    const result = checkConstraintValues(resource, mapOf([['code', 'A']]));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({
      code: 'pattern_compilation_failure',
      index: 0,
      constraintName: 'badPattern',
      field: 'code',
    });
  });

  it('does not mutate declared pattern strings', () => {
    const resource = resourceWithConstraints([
      {
        name: 'codePattern',
        kind: 'pattern',
        field: 'code',
        pattern: '^[A-Z]+$',
      },
    ]);
    const declared = resource.schema.constraints[0];
    expect(declared?.kind).toBe('pattern');
    if (declared?.kind !== 'pattern') return;
    const before = declared.pattern;
    checkConstraintValues(resource, mapOf([['code', 'ABC']]));
    expect(declared.pattern).toBe(before);
    expect(declared.pattern).toBe('^[A-Z]+$');
  });

  it('evaluates enum membership with === including -0 and 0', () => {
    const numberEnumField = {
      name: 'score',
      type: 'number' as const,
      optional: false,
      nullable: false,
    };
    const resource = resourceWithConstraints(
      [
        {
          name: 'scoreEnum',
          kind: 'enum',
          field: 'score',
          values: [0, 1, 2],
        },
      ],
      [numberEnumField],
    );

    expect(checkConstraintValues(resource, mapOf([['score', -0]])).ok).toBe(
      true,
    );
    expect(checkConstraintValues(resource, mapOf([['score', 0]])).ok).toBe(
      true,
    );

    const miss = checkConstraintValues(resource, mapOf([['score', 3]]));
    expect(miss.ok).toBe(false);
    if (miss.ok) return;
    expect(miss.error).toEqual({
      code: 'enum_constraint_violated',
      index: 0,
      constraintName: 'scoreEnum',
      field: 'score',
    });

    const ordered = resourceWithConstraints([
      {
        name: 'statusEnum',
        kind: 'enum',
        field: 'status',
        values: ['open', 'closed'],
      },
    ]);
    expect(
      checkConstraintValues(ordered, mapOf([['status', 'closed']])).ok,
    ).toBe(true);
  });
});

describe('RFC-018 checkConstraintValues — ordering / purity', () => {
  it('fail-fast evaluates constraints in declaration order', () => {
    const resource = resourceWithConstraints([
      {
        name: 'totalBounds',
        kind: 'range',
        field: 'total',
        min: 0,
        max: 100,
      },
      {
        name: 'statusEnum',
        kind: 'enum',
        field: 'status',
        values: ['open', 'closed'],
      },
    ]);

    const result = checkConstraintValues(
      resource,
      mapOf([
        ['total', -1],
        ['status', 'pending'],
      ]),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('range_constraint_violated');
    expect(result.error.constraintName).toBe('totalBounds');
  });

  it('evaluates multiple constraints on the same Field in sequence', () => {
    const resource = resourceWithConstraints([
      { name: 'totalMin', kind: 'range', field: 'total', min: 0 },
      { name: 'totalMax', kind: 'range', field: 'total', max: 10 },
    ]);
    expect(checkConstraintValues(resource, mapOf([['total', 5]])).ok).toBe(
      true,
    );
    const tooHigh = checkConstraintValues(resource, mapOf([['total', 11]]));
    expect(tooHigh.ok).toBe(false);
    if (tooHigh.ok) return;
    expect(tooHigh.error.constraintName).toBe('totalMax');
  });

  it('does not mutate Resource, constraints, or the field-value map', () => {
    const resource = resourceWithConstraints([
      {
        name: 'totalBounds',
        kind: 'range',
        field: 'total',
        min: 0,
        max: 100,
      },
      {
        name: 'statusEnum',
        kind: 'enum',
        field: 'status',
        values: ['open', 'closed'],
      },
    ]);
    const values = mapOf([
      ['total', 50],
      ['status', 'open'],
    ]);
    const constraintsBefore = resource.schema.constraints;
    const valuesSnapshot = [...values.entries()];

    const result = checkConstraintValues(resource, values);
    expect(result.ok).toBe(true);
    expect(resource.schema.constraints).toBe(constraintsBefore);
    expect([...values.entries()]).toEqual(valuesSnapshot);
    expect(resource.schema.constraints[0]).toEqual(constraintsBefore[0]);
  });
});
