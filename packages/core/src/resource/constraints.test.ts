import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { constraintsEqual } from './constraints.js';
import { createResourceWithConstraintsForTests } from './create-resource-with-constraints.js';
import { createResourceWithFieldsForTests } from './create-resource-with-fields.js';
import { createResourceWithOperationsForTests } from './create-resource-with-operations.js';
import { createResourceWithRelationsForTests } from './create-resource-with-relations.js';
import { emptyAnnotations } from './empty-annotations.js';
import { createEmptyResourceSchema } from './schema.js';
import { validateResource } from './validate.js';

const numberField = {
  name: 'total',
  type: 'number' as const,
  optional: false,
  nullable: false,
};
const stringField = {
  name: 'code',
  type: 'string' as const,
  optional: false,
  nullable: false,
};
const statusField = {
  name: 'status',
  type: 'string' as const,
  optional: false,
  nullable: false,
};

describe('RFC-017 concrete constraint kinds', () => {
  it('keeps empty constraints valid', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: createEmptyResourceSchema(),
      annotations: emptyAnnotations,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.schema.constraints).toEqual([]);
  });

  it('accepts ordered concrete constraints and preserves discriminated members', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithConstraintsForTests(
      identity.value,
      [
        { name: 'totalBounds', kind: 'range', field: 'total', min: 0, max: 100 },
        { name: 'codePattern', kind: 'pattern', field: 'code', pattern: '^[A-Z]+$' },
        {
          name: 'statusEnum',
          kind: 'enum',
          field: 'status',
          values: ['open', 'closed'],
        },
      ],
      emptyAnnotations,
      [numberField, stringField, statusField],
    );
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;
    expect(resource.value.schema.constraints).toEqual([
      { name: 'totalBounds', kind: 'range', field: 'total', min: 0, max: 100 },
      { name: 'codePattern', kind: 'pattern', field: 'code', pattern: '^[A-Z]+$' },
      {
        name: 'statusEnum',
        kind: 'enum',
        field: 'status',
        values: ['open', 'closed'],
      },
    ]);
    expect(
      constraintsEqual(resource.value.schema.constraints, [
        { name: 'totalBounds', kind: 'range', field: 'total', min: 0, max: 100 },
        { name: 'codePattern', kind: 'pattern', field: 'code', pattern: '^[A-Z]+$' },
        {
          name: 'statusEnum',
          kind: 'enum',
          field: 'status',
          values: ['open', 'closed'],
        },
      ]),
    ).toBe(true);
  });

  it('rejects omitted constraints as missing_constraints (breaking)', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: {
        fields: [],
        relations: [],
        operations: [],
      } as never,
      annotations: emptyAnnotations,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'missing_constraints' },
      });
    }
  });

  it('rejects non-sequence constraints as invalid_constraints_collection', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: {
        fields: [],
        relations: [],
        operations: [],
        constraints: null,
      } as never,
      annotations: emptyAnnotations,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'invalid_constraints_collection' },
      });
    }
  });

  it('rejects unknown kinds as unknown_constraint_kind (breaking vs open kind)', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = createResourceWithConstraintsForTests(identity.value, [
      { name: 'a', kind: 'placeholder' },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        code: 'invalid_schema',
        cause: {
          code: 'unknown_constraint_kind',
          index: 0,
          kind: 'placeholder',
        },
      });
    }
  });

  it('classifies closed-member shape vs semantic causes deterministically', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const missingKind = createResourceWithConstraintsForTests(identity.value, [
      { name: 'a' },
    ]);
    expect(missingKind.ok).toBe(false);
    if (!missingKind.ok) {
      expect(missingKind.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'missing_constraint_kind', index: 0 },
      });
    }

    const bareRange = createResourceWithConstraintsForTests(identity.value, [
      { name: 'a', kind: 'range' },
    ]);
    expect(bareRange.ok).toBe(false);
    if (!bareRange.ok) {
      expect(bareRange.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'invalid_constraint_member', index: 0 },
      });
    }

    const rangeNoBounds = createResourceWithConstraintsForTests(
      identity.value,
      [{ name: 'a', kind: 'range', field: 'total' }],
      emptyAnnotations,
      [numberField],
    );
    expect(rangeNoBounds.ok).toBe(false);
    if (!rangeNoBounds.ok) {
      expect(rangeNoBounds.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'invalid_range_bounds', index: 0 },
      });
    }

    const patternMissing = createResourceWithConstraintsForTests(
      identity.value,
      [{ name: 'a', kind: 'pattern', field: 'code' }],
      emptyAnnotations,
      [stringField],
    );
    expect(patternMissing.ok).toBe(false);
    if (!patternMissing.ok) {
      expect(patternMissing.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'invalid_constraint_member', index: 0 },
      });
    }

    const enumMissing = createResourceWithConstraintsForTests(
      identity.value,
      [{ name: 'a', kind: 'enum', field: 'status' }],
      emptyAnnotations,
      [statusField],
    );
    expect(enumMissing.ok).toBe(false);
    if (!enumMissing.ok) {
      expect(enumMissing.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'invalid_constraint_member', index: 0 },
      });
    }

    const emptyPattern = createResourceWithConstraintsForTests(
      identity.value,
      [{ name: 'a', kind: 'pattern', field: 'code', pattern: '' }],
      emptyAnnotations,
      [stringField],
    );
    expect(emptyPattern.ok).toBe(false);
    if (!emptyPattern.ok) {
      expect(emptyPattern.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'invalid_pattern', index: 0 },
      });
    }

    const emptyEnum = createResourceWithConstraintsForTests(
      identity.value,
      [{ name: 'a', kind: 'enum', field: 'status', values: [] }],
      emptyAnnotations,
      [statusField],
    );
    expect(emptyEnum.ok).toBe(false);
    if (!emptyEnum.ok) {
      expect(emptyEnum.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'invalid_enum_values', index: 0 },
      });
    }

    const extra = createResourceWithConstraintsForTests(
      identity.value,
      [{ name: 'a', kind: 'range', field: 'total', min: 0, spec: {} }],
      emptyAnnotations,
      [numberField],
    );
    expect(extra.ok).toBe(false);
    if (!extra.ok) {
      expect(extra.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'invalid_constraint_member', index: 0 },
      });
    }
  });

  it('requires constraint kind to be an own property', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const constraint = Object.create({ kind: 'range' });
    constraint.name = 'a';

    const result = createResourceWithConstraintsForTests(identity.value, [
      constraint,
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'missing_constraint_kind', index: 0 },
      });
    }
  });

  it('rejects invalid constraint kinds', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const kind of ['', null, 1, true] as const) {
      const result = createResourceWithConstraintsForTests(identity.value, [
        { name: 'a', kind },
      ]);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual({
          code: 'invalid_schema',
          cause: { code: 'invalid_constraint_kind', index: 0, kind },
        });
      }
    }
  });

  it('rejects invalid ConstraintName', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const name of ['Create', 'create-order', ''] as const) {
      const result = createResourceWithConstraintsForTests(
        identity.value,
        [{ name, kind: 'range', field: 'total', min: 0 }],
        emptyAnnotations,
        [numberField],
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('invalid_schema');
        if (result.error.code === 'invalid_schema') {
          expect(result.error.cause).toEqual({
            code: 'invalid_constraint_name',
            index: 0,
            name,
          });
        }
      }
    }
  });

  it('enforces resolve + type-match and range/enum semantics', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const unresolved = createResourceWithConstraintsForTests(
      identity.value,
      [{ name: 'a', kind: 'range', field: 'missing', min: 0 }],
      emptyAnnotations,
      [numberField],
    );
    expect(unresolved.ok).toBe(false);
    if (!unresolved.ok) {
      expect(unresolved.error).toEqual({
        code: 'invalid_schema',
        cause: {
          code: 'unresolved_constraint_field',
          index: 0,
          field: 'missing',
        },
      });
    }

    const typeMismatch = createResourceWithConstraintsForTests(
      identity.value,
      [{ name: 'a', kind: 'range', field: 'code', min: 0 }],
      emptyAnnotations,
      [stringField],
    );
    expect(typeMismatch.ok).toBe(false);
    if (!typeMismatch.ok) {
      expect(typeMismatch.error).toEqual({
        code: 'invalid_schema',
        cause: {
          code: 'constraint_field_type_mismatch',
          index: 0,
          field: 'code',
          expected: 'number',
          actual: 'string',
        },
      });
    }

    const inverted = createResourceWithConstraintsForTests(
      identity.value,
      [{ name: 'a', kind: 'range', field: 'total', min: 10, max: 1 }],
      emptyAnnotations,
      [numberField],
    );
    expect(inverted.ok).toBe(false);
    if (!inverted.ok) {
      expect(inverted.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'invalid_range_bounds', index: 0 },
      });
    }

    const nonFinite = createResourceWithConstraintsForTests(
      identity.value,
      [{ name: 'a', kind: 'range', field: 'total', min: Number.NaN }],
      emptyAnnotations,
      [numberField],
    );
    expect(nonFinite.ok).toBe(false);
    if (!nonFinite.ok) {
      expect(nonFinite.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'invalid_range_bounds', index: 0 },
      });
    }

    const dupEnum = createResourceWithConstraintsForTests(
      identity.value,
      [{ name: 'a', kind: 'enum', field: 'status', values: ['a', 'a'] }],
      emptyAnnotations,
      [statusField],
    );
    expect(dupEnum.ok).toBe(false);
    if (!dupEnum.ok) {
      expect(dupEnum.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'invalid_enum_values', index: 0 },
      });
    }

    const mixedEnum = createResourceWithConstraintsForTests(
      identity.value,
      [{ name: 'a', kind: 'enum', field: 'status', values: ['a', 1] }],
      emptyAnnotations,
      [statusField],
    );
    expect(mixedEnum.ok).toBe(false);
    if (!mixedEnum.ok) {
      expect(mixedEnum.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'invalid_enum_values', index: 0 },
      });
    }
  });

  it('allows multiple constraints on the same Field when names differ', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithConstraintsForTests(
      identity.value,
      [
        { name: 'totalMin', kind: 'range', field: 'total', min: 0 },
        { name: 'totalMax', kind: 'range', field: 'total', max: 100 },
      ],
      emptyAnnotations,
      [numberField],
    );
    expect(resource.ok).toBe(true);
  });

  it('rejects duplicate ConstraintName even when kind differs', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = createResourceWithConstraintsForTests(
      identity.value,
      [
        { name: 'a', kind: 'range', field: 'total', min: 0 },
        { name: 'a', kind: 'range', field: 'total', max: 1 },
      ],
      emptyAnnotations,
      [numberField],
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'duplicate_constraint_name', index: 1, name: 'a' },
      });
    }
  });

  it('treats enum.values equality as order-sensitive', () => {
    expect(
      constraintsEqual(
        [
          {
            name: 'a',
            kind: 'enum',
            field: 'status',
            values: ['open', 'closed'],
          },
        ],
        [
          {
            name: 'a',
            kind: 'enum',
            field: 'status',
            values: ['closed', 'open'],
          },
        ],
      ),
    ).toBe(false);
  });

  it('freezes constraints snapshot against caller mutation', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const candidates = [
      {
        name: 'a',
        kind: 'enum',
        field: 'status',
        values: ['open', 'closed'],
      },
    ];
    const resource = createResourceWithConstraintsForTests(
      identity.value,
      candidates,
      emptyAnnotations,
      [statusField],
    );
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    candidates[0]!.name = 'mutated';
    candidates[0]!.values[0] = 'changed';
    expect(resource.value.schema.constraints[0]?.name).toBe('a');
    expect(resource.value.schema.constraints[0]).toMatchObject({
      kind: 'enum',
      values: ['open', 'closed'],
    });
    expect(Object.isFrozen(resource.value.schema.constraints)).toBe(true);
    expect(Object.isFrozen(resource.value.schema.constraints[0])).toBe(true);
    expect(
      Object.isFrozen(
        (resource.value.schema.constraints[0] as { values: unknown }).values,
      ),
    ).toBe(true);
  });

  it('allows Field/Relation/Operation/Constraint to share the same name string', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const fields = createResourceWithFieldsForTests(identity.value, [
      { name: 'create', type: 'string', optional: false, nullable: false },
    ]);
    expect(fields.ok).toBe(true);

    const relations = createResourceWithRelationsForTests(identity.value, [
      {
        name: 'create',
        target: { namespace: 'crm', name: 'Customer' },
        multiplicity: 'one',
        optional: false,
        nullable: false,
      },
    ]);
    expect(relations.ok).toBe(true);

    const operations = createResourceWithOperationsForTests(identity.value, [
      { name: 'create' },
    ]);
    expect(operations.ok).toBe(true);

    const constraints = createResourceWithConstraintsForTests(
      identity.value,
      [
        {
          name: 'create',
          kind: 'pattern',
          field: 'create',
          pattern: 'x',
        },
      ],
      emptyAnnotations,
      [{ name: 'create', type: 'string', optional: false, nullable: false }],
      [
        {
          name: 'create',
          target: { namespace: 'crm', name: 'Customer' },
          multiplicity: 'one',
          optional: false,
          nullable: false,
        },
      ],
      [{ name: 'create' }],
    );
    expect(constraints.ok).toBe(true);
    if (!constraints.ok) return;
    expect(constraints.value.schema.fields[0]?.name).toBe('create');
    expect(constraints.value.schema.relations[0]?.name).toBe('create');
    expect(constraints.value.schema.operations[0]?.name).toBe('create');
    expect(constraints.value.schema.constraints[0]?.name).toBe('create');
  });
});
