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

describe('RFC-016 resource constraints', () => {
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

  it('accepts ordered non-empty constraints and preserves order + kind', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithConstraintsForTests(identity.value, [
      { name: 'nonNegativeTotal', kind: 'placeholder' },
      { name: 'hasCustomer', kind: 'placeholder' },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;
    expect(resource.value.schema.constraints.map((c) => c.name)).toEqual([
      'nonNegativeTotal',
      'hasCustomer',
    ]);
    expect(resource.value.schema.constraints.map((c) => c.kind)).toEqual([
      'placeholder',
      'placeholder',
    ]);
    expect(
      constraintsEqual(resource.value.schema.constraints, [
        { name: 'nonNegativeTotal', kind: 'placeholder' },
        { name: 'hasCustomer', kind: 'placeholder' },
      ]),
    ).toBe(true);
    expect(
      constraintsEqual(resource.value.schema.constraints, [
        { name: 'hasCustomer', kind: 'placeholder' },
        { name: 'nonNegativeTotal', kind: 'placeholder' },
      ]),
    ).toBe(false);
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

  it('classifies member shape boundaries without collapsing missing causes', () => {
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

    const emptyKind = createResourceWithConstraintsForTests(identity.value, [
      { name: 'a', kind: '' },
    ]);
    expect(emptyKind.ok).toBe(false);
    if (!emptyKind.ok) {
      expect(emptyKind.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'invalid_constraint_kind', index: 0, kind: '' },
      });
    }

    const extra = createResourceWithConstraintsForTests(identity.value, [
      { name: 'a', kind: 'x', spec: {} },
    ]);
    expect(extra.ok).toBe(false);
    if (!extra.ok) {
      expect(extra.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'invalid_constraint_member', index: 0 },
      });
    }

    const kindOnly = createResourceWithConstraintsForTests(identity.value, [
      { kind: 'x' },
    ]);
    expect(kindOnly.ok).toBe(false);
    if (!kindOnly.ok) {
      expect(kindOnly.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'invalid_constraint_member', index: 0 },
      });
    }
  });

  it('requires constraint kind to be an own property', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const constraint = Object.create({ kind: 'placeholder' });
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
      const result = createResourceWithConstraintsForTests(identity.value, [
        { name, kind: 'placeholder' },
      ]);
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

  it('allows duplicate kinds when names differ', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithConstraintsForTests(identity.value, [
      { name: 'a', kind: 'x' },
      { name: 'b', kind: 'x' },
    ]);
    expect(resource.ok).toBe(true);
  });

  it('rejects duplicate ConstraintName even when kind differs', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = createResourceWithConstraintsForTests(identity.value, [
      { name: 'a', kind: 'x' },
      { name: 'a', kind: 'y' },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'duplicate_constraint_name', index: 1, name: 'a' },
      });
    }
  });

  it('constraintsEqual is false when only kind differs', () => {
    expect(
      constraintsEqual(
        [{ name: 'a', kind: 'x' }],
        [{ name: 'a', kind: 'y' }],
      ),
    ).toBe(false);
  });

  it('freezes constraints snapshot against caller mutation', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const candidates = [{ name: 'a', kind: 'placeholder' }];
    const resource = createResourceWithConstraintsForTests(
      identity.value,
      candidates,
    );
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    candidates[0]!.name = 'mutated';
    candidates[0]!.kind = 'changed';
    expect(resource.value.schema.constraints.map((c) => c.name)).toEqual(['a']);
    expect(resource.value.schema.constraints.map((c) => c.kind)).toEqual([
      'placeholder',
    ]);
    expect(Object.isFrozen(resource.value.schema.constraints)).toBe(true);
    expect(Object.isFrozen(resource.value.schema.constraints[0])).toBe(true);
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
      [{ name: 'create', kind: 'placeholder' }],
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
