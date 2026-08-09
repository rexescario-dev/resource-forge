import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { createResourceWithRelationsForTests } from './create-resource-with-relations.js';
import { checkRelationValueStates } from './relation-value-states.js';
import type {
  RelationAssociationElement,
  RelationRuntimeValue,
  RelationSingularAssociation,
  Resource,
} from './types.js';

const singular = Object.freeze({}) as RelationSingularAssociation;
const element = Object.freeze({}) as RelationAssociationElement;

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
  entries: ReadonlyArray<readonly [string, RelationRuntimeValue]>,
): Map<string, RelationRuntimeValue> {
  return new Map(entries);
}

function targetIdentity() {
  const identity = createResourceIdentity('crm', 'Customer');
  expect(identity.ok).toBe(true);
  if (!identity.ok) {
    throw new Error('target identity');
  }
  return identity.value;
}

function resourceWithRelations(relations: readonly object[]): Resource {
  const identity = createResourceIdentity('crm', 'Order');
  expect(identity.ok).toBe(true);
  if (!identity.ok) {
    throw new Error('identity');
  }
  return requireResource(
    createResourceWithRelationsForTests(identity.value, relations),
  );
}

function baseRelation(
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  return {
    name: 'customer',
    target: targetIdentity(),
    multiplicity: 'one',
    optional: false,
    nullable: false,
    direction: 'outbound',
    onDelete: 'none',
    onUpdate: 'none',
    ...overrides,
  };
}

describe('RFC-025 checkRelationValueStates', () => {
  it('forbids absent when optional is false', () => {
    const resource = resourceWithRelations([baseRelation({})]);
    expect(checkRelationValueStates(resource, new Map())).toEqual({
      ok: false,
      error: { code: 'forbidden_absent_relation', relation: 'customer' },
    });
  });

  it('allows absent when optional is true', () => {
    const resource = resourceWithRelations([
      baseRelation({ optional: true }),
    ]);
    expect(checkRelationValueStates(resource, new Map())).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it('forbids association-level null when nullable is false', () => {
    const resource = resourceWithRelations([baseRelation({})]);
    expect(
      checkRelationValueStates(resource, mapOf([['customer', null]])),
    ).toEqual({
      ok: false,
      error: { code: 'forbidden_null_relation', relation: 'customer' },
    });
  });

  it('allows association-level null when nullable is true (including many)', () => {
    const resource = resourceWithRelations([
      baseRelation({ multiplicity: 'many', optional: true, nullable: true }),
    ]);
    expect(
      checkRelationValueStates(resource, mapOf([['customer', null]])),
    ).toEqual({ ok: true, value: undefined });
  });

  it('treats many + null as association-level null, not shape mismatch', () => {
    const resource = resourceWithRelations([
      baseRelation({ multiplicity: 'many', nullable: false }),
    ]);
    expect(
      checkRelationValueStates(resource, mapOf([['customer', null]])),
    ).toEqual({
      ok: false,
      error: { code: 'forbidden_null_relation', relation: 'customer' },
    });
  });

  it('allows many empty array as present (empty ≠ absent; satisfies optional:false)', () => {
    const resource = resourceWithRelations([
      baseRelation({ multiplicity: 'many', optional: false, nullable: false }),
    ]);
    expect(
      checkRelationValueStates(resource, mapOf([['customer', []]])),
    ).toEqual({ ok: true, value: undefined });
  });

  it('allows many non-empty with non-null elements', () => {
    const resource = resourceWithRelations([
      baseRelation({ multiplicity: 'many' }),
    ]);
    expect(
      checkRelationValueStates(resource, mapOf([['customer', [element]]])),
    ).toEqual({ ok: true, value: undefined });
  });

  it('forbids null elements in many even when Relation.nullable is true', () => {
    const resource = resourceWithRelations([
      baseRelation({ multiplicity: 'many', optional: true, nullable: true }),
    ]);
    expect(
      checkRelationValueStates(
        resource,
        mapOf([['customer', [element, null]]]),
      ),
    ).toEqual({
      ok: false,
      error: {
        code: 'forbidden_null_relation_element',
        relation: 'customer',
        index: 1,
      },
    });
  });

  it('rejects many + non-array as shape mismatch', () => {
    const resource = resourceWithRelations([
      baseRelation({ multiplicity: 'many' }),
    ]);
    expect(
      checkRelationValueStates(resource, mapOf([['customer', singular]])),
    ).toEqual({
      ok: false,
      error: {
        code: 'relation_value_shape_mismatch',
        relation: 'customer',
        multiplicity: 'many',
      },
    });
  });

  it('rejects one + array as shape mismatch', () => {
    const resource = resourceWithRelations([baseRelation({})]);
    expect(
      checkRelationValueStates(resource, mapOf([['customer', [element]]])),
    ).toEqual({
      ok: false,
      error: {
        code: 'relation_value_shape_mismatch',
        relation: 'customer',
        multiplicity: 'one',
      },
    });
  });

  it('allows one + singular placeholder', () => {
    const resource = resourceWithRelations([baseRelation({})]);
    expect(
      checkRelationValueStates(resource, mapOf([['customer', singular]])),
    ).toEqual({ ok: true, value: undefined });
  });

  it('ignores unknown map keys; does not inspect direction/inverse/join', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;
    const resource = requireResource(
      createResourceWithRelationsForTests(
        identity.value,
        [
          baseRelation({
            inverse: 'orders',
            join: { local: 'customerId', remote: 'id' },
          }),
        ],
        undefined,
        [
          {
            name: 'customerId',
            type: 'string',
            optional: false,
            nullable: false,
          },
        ],
      ),
    );
    expect(
      checkRelationValueStates(
        resource,
        mapOf([
          ['customer', singular],
          ['extra', null],
        ]),
      ),
    ).toEqual({ ok: true, value: undefined });
    expect(resource.schema.relations[0]?.direction).toBe('outbound');
    expect(resource.schema.relations[0]?.inverse).toBe('orders');
  });

  it('fail-fasts on first declared relation failure', () => {
    const resource = resourceWithRelations([
      baseRelation({ name: 'a' }),
      baseRelation({ name: 'b' }),
    ]);
    expect(checkRelationValueStates(resource, new Map())).toEqual({
      ok: false,
      error: { code: 'forbidden_absent_relation', relation: 'a' },
    });
  });
});
