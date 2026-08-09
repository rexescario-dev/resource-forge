import { describe, expect, it, vi } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { evaluateCascadeEvent } from './cascade.js';
import { createResourceWithRelationsForTests } from './create-resource-with-relations.js';
import { checkRelationValueStates } from './relation-value-states.js';
import { validateResource } from './validate.js';
import type {
  RelationAssociationElement,
  RelationRuntimeValue,
  RelationSingularAssociation,
  Resource,
} from './types.js';

const singular = Object.freeze({}) as RelationSingularAssociation;
const elementA = Object.freeze({}) as RelationAssociationElement;
const elementB = Object.freeze({}) as RelationAssociationElement;

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
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: 'customer',
    target: targetIdentity(),
    multiplicity: 'one',
    optional: true,
    nullable: true,
    direction: 'outbound',
    onDelete: 'none',
    onUpdate: 'none',
    fetch: 'eager',
    ...overrides,
  };
}

describe('RFC-026 evaluateCascadeEvent', () => {
  it('returns empty effects when all policies are none without inspecting values', () => {
    const resource = resourceWithRelations([
      baseRelation({
        onDelete: 'none',
        onUpdate: 'none',
        fetch: 'eager',
        multiplicity: 'many',
      }),
    ]);
    const values = mapOf([['customer', [null, elementA]]]);
    expect(evaluateCascadeEvent(resource, 'delete', values)).toEqual({
      ok: true,
      value: { cascades: [], setNulls: [] },
    });
  });

  it('restrict blocks delete and update for present non-null one and non-empty many', () => {
    const resource = resourceWithRelations([
      baseRelation({ onDelete: 'restrict', onUpdate: 'restrict', optional: false }),
    ]);
    expect(
      evaluateCascadeEvent(resource, 'delete', mapOf([['customer', singular]])),
    ).toEqual({
      ok: false,
      error: { code: 'cascade_restricted', relation: 'customer', event: 'delete' },
    });
    expect(
      evaluateCascadeEvent(resource, 'update', mapOf([['customer', singular]])),
    ).toEqual({
      ok: false,
      error: { code: 'cascade_restricted', relation: 'customer', event: 'update' },
    });

    const manyResource = resourceWithRelations([
      baseRelation({
        name: 'items',
        onDelete: 'restrict',
        onUpdate: 'restrict',
        fetch: 'eager',
        multiplicity: 'many',
        optional: false,
        nullable: false,
      }),
    ]);
    expect(
      evaluateCascadeEvent(
        manyResource,
        'delete',
        mapOf([['items', [elementA, elementB]]]),
      ),
    ).toEqual({
      ok: false,
      error: { code: 'cascade_restricted', relation: 'items', event: 'delete' },
    });
  });

  it('restrict does not block absent, association-null, or empty many', () => {
    const resource = resourceWithRelations([
      baseRelation({ onDelete: 'restrict', onUpdate: 'restrict' }),
    ]);
    expect(evaluateCascadeEvent(resource, 'delete', new Map())).toEqual({
      ok: true,
      value: { cascades: [], setNulls: [] },
    });
    expect(
      evaluateCascadeEvent(resource, 'delete', mapOf([['customer', null]])),
    ).toEqual({
      ok: true,
      value: { cascades: [], setNulls: [] },
    });

    const manyResource = resourceWithRelations([
      baseRelation({
        onDelete: 'restrict',
        multiplicity: 'many',
        nullable: false,
      }),
    ]);
    expect(
      evaluateCascadeEvent(manyResource, 'delete', mapOf([['customer', []]])),
    ).toEqual({
      ok: true,
      value: { cascades: [], setNulls: [] },
    });
  });

  it('cascade accumulates targets for present non-null values only', () => {
    const resource = resourceWithRelations([
      baseRelation({ onDelete: 'cascade', onUpdate: 'cascade', optional: false }),
    ]);
    expect(
      evaluateCascadeEvent(resource, 'delete', mapOf([['customer', singular]])),
    ).toEqual({
      ok: true,
      value: {
        cascades: [{ relation: 'customer', targets: [singular] }],
        setNulls: [],
      },
    });
    expect(evaluateCascadeEvent(resource, 'delete', new Map())).toEqual({
      ok: true,
      value: { cascades: [], setNulls: [] },
    });
    expect(
      evaluateCascadeEvent(resource, 'delete', mapOf([['customer', null]])),
    ).toEqual({
      ok: true,
      value: { cascades: [], setNulls: [] },
    });

    const manyResource = resourceWithRelations([
      baseRelation({
        onDelete: 'cascade',
        multiplicity: 'many',
        optional: false,
        nullable: false,
      }),
    ]);
    const elements = [elementA, elementB];
    expect(
      evaluateCascadeEvent(
        manyResource,
        'delete',
        mapOf([['customer', elements]]),
      ),
    ).toEqual({
      ok: true,
      value: {
        cascades: [{ relation: 'customer', targets: elements }],
        setNulls: [],
      },
    });
    expect(
      evaluateCascadeEvent(manyResource, 'delete', mapOf([['customer', []]])),
    ).toEqual({
      ok: true,
      value: { cascades: [], setNulls: [] },
    });
  });

  it('setNull yields association-null intents including empty many, never absence semantics', () => {
    const resource = resourceWithRelations([
      baseRelation({ onDelete: 'setNull', nullable: true, optional: false }),
    ]);
    expect(
      evaluateCascadeEvent(resource, 'delete', mapOf([['customer', singular]])),
    ).toEqual({
      ok: true,
      value: { cascades: [], setNulls: [{ relation: 'customer' }] },
    });

    const manyResource = resourceWithRelations([
      baseRelation({
        onDelete: 'setNull',
        multiplicity: 'many',
        nullable: true,
        optional: false,
      }),
    ]);
    expect(
      evaluateCascadeEvent(
        manyResource,
        'delete',
        mapOf([['customer', [elementA]]]),
      ),
    ).toEqual({
      ok: true,
      value: { cascades: [], setNulls: [{ relation: 'customer' }] },
    });
    expect(
      evaluateCascadeEvent(manyResource, 'delete', mapOf([['customer', []]])),
    ).toEqual({
      ok: true,
      value: { cascades: [], setNulls: [{ relation: 'customer' }] },
    });
    expect(evaluateCascadeEvent(manyResource, 'delete', new Map())).toEqual({
      ok: true,
      value: { cascades: [], setNulls: [] },
    });
    expect(
      evaluateCascadeEvent(manyResource, 'delete', mapOf([['customer', null]])),
    ).toEqual({
      ok: true,
      value: { cascades: [], setNulls: [] },
    });
  });

  it('optional false does not prohibit setNull evaluation effects', () => {
    const resource = resourceWithRelations([
      baseRelation({
        onDelete: 'setNull',
        onUpdate: 'setNull',
        fetch: 'eager',
        optional: false,
        nullable: true,
      }),
    ]);
    expect(
      evaluateCascadeEvent(resource, 'update', mapOf([['customer', singular]])),
    ).toEqual({
      ok: true,
      value: { cascades: [], setNulls: [{ relation: 'customer' }] },
    });
  });

  it('fails shape mismatch for non-none policies on many with null elements', () => {
    const resource = resourceWithRelations([
      baseRelation({ onDelete: 'cascade', multiplicity: 'many' }),
    ]);
    expect(
      evaluateCascadeEvent(
        resource,
        'delete',
        mapOf([['customer', [null, elementA]]]),
      ),
    ).toEqual({
      ok: false,
      error: {
        code: 'cascade_relation_value_shape_mismatch',
        relation: 'customer',
        multiplicity: 'many',
      },
    });
  });

  it('skips null-element validation when policy is none', () => {
    const resource = resourceWithRelations([
      baseRelation({ onDelete: 'none', multiplicity: 'many' }),
    ]);
    expect(
      evaluateCascadeEvent(
        resource,
        'delete',
        mapOf([['customer', [null, elementA]]]),
      ),
    ).toEqual({
      ok: true,
      value: { cascades: [], setNulls: [] },
    });
  });

  it('fails one/many shape mismatch for non-none policies', () => {
    const oneResource = resourceWithRelations([
      baseRelation({ onDelete: 'cascade' }),
    ]);
    expect(
      evaluateCascadeEvent(
        oneResource,
        'delete',
        mapOf([['customer', [elementA]]]),
      ),
    ).toEqual({
      ok: false,
      error: {
        code: 'cascade_relation_value_shape_mismatch',
        relation: 'customer',
        multiplicity: 'one',
      },
    });

    const manyResource = resourceWithRelations([
      baseRelation({ onDelete: 'cascade', multiplicity: 'many' }),
    ]);
    expect(
      evaluateCascadeEvent(manyResource, 'delete', mapOf([['customer', singular]])),
    ).toEqual({
      ok: false,
      error: {
        code: 'cascade_relation_value_shape_mismatch',
        relation: 'customer',
        multiplicity: 'many',
      },
    });
  });

  it('inbound direction produces identical outcomes to outbound', () => {
    const outbound = resourceWithRelations([
      baseRelation({
        onDelete: 'restrict',
        direction: 'outbound',
        optional: false,
      }),
    ]);
    const inbound = resourceWithRelations([
      baseRelation({
        onDelete: 'restrict',
        direction: 'inbound',
        optional: false,
      }),
    ]);
    const values = mapOf([['customer', singular]]);
    expect(evaluateCascadeEvent(outbound, 'delete', values)).toEqual(
      evaluateCascadeEvent(inbound, 'delete', values),
    );
  });

  it('ignores unknown map keys', () => {
    const resource = resourceWithRelations([
      baseRelation({ onDelete: 'restrict', optional: false }),
    ]);
    const values = mapOf([
      ['customer', singular],
      ['unknown', singular],
    ]);
    expect(evaluateCascadeEvent(resource, 'delete', values)).toEqual({
      ok: false,
      error: { code: 'cascade_restricted', relation: 'customer', event: 'delete' },
    });
  });

  it('fails fast on first Relation failure in schema order', () => {
    const resource = resourceWithRelations([
      baseRelation({
        name: 'first',
        onDelete: 'restrict',
        optional: false,
      }),
      baseRelation({
        name: 'second',
        target: targetIdentity(),
        onDelete: 'restrict',
        optional: false,
      }),
    ]);
    expect(
      evaluateCascadeEvent(
        resource,
        'delete',
        mapOf([
          ['first', singular],
          ['second', singular],
        ]),
      ),
    ).toEqual({
      ok: false,
      error: { code: 'cascade_restricted', relation: 'first', event: 'delete' },
    });
  });

  it('does not call validateResource or checkRelationValueStates', () => {
    const resource = resourceWithRelations([
      baseRelation({ onDelete: 'none' }),
    ]);
    const validateSpy = vi.spyOn({ validateResource }, 'validateResource');
    const valueStateSpy = vi.spyOn(
      { checkRelationValueStates },
      'checkRelationValueStates',
    );
    evaluateCascadeEvent(resource, 'delete', mapOf([['customer', null]]));
    expect(validateSpy).not.toHaveBeenCalled();
    expect(valueStateSpy).not.toHaveBeenCalled();
    validateSpy.mockRestore();
    valueStateSpy.mockRestore();
  });

  it('uses onUpdate policy for update events independently of onDelete', () => {
    const resource = resourceWithRelations([
      baseRelation({
        onDelete: 'none',
        onUpdate: 'restrict',
        fetch: 'eager',
        optional: false,
      }),
    ]);
    expect(evaluateCascadeEvent(resource, 'delete', mapOf([['customer', singular]]))).toEqual({
      ok: true,
      value: { cascades: [], setNulls: [] },
    });
    expect(evaluateCascadeEvent(resource, 'update', mapOf([['customer', singular]]))).toEqual({
      ok: false,
      error: { code: 'cascade_restricted', relation: 'customer', event: 'update' },
    });
  });
});
