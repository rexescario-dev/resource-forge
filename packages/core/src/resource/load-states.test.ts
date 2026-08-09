import { describe, expect, it, vi } from 'vitest';
import { createResourceIdentity } from '../identity/create.js';
import { emptyAnnotations } from './empty-annotations.js';
import { checkRelationLoadStates } from './load-states.js';
import { checkRelationValueStates } from './relation-value-states.js';
import { evaluateCascadeEvent } from './cascade.js';
import { createResourceWithRelationsForTests } from './create-resource-with-relations.js';
import { validateResource } from './validate.js';
import type { RelationLoadStateEntry, Resource } from './types.js';

function targetIdentity() {
  return { namespace: 'crm', name: 'Customer' };
}

function resourceWithRelations(
  relations: readonly Record<string, unknown>[],
): Resource {
  const identity = createResourceIdentity('crm', 'Order');
  if (!identity.ok) {
    throw new Error('expected identity');
  }
  const resource = createResourceWithRelationsForTests(
    identity.value,
    relations,
    emptyAnnotations,
    [
      {
        name: 'customerId',
        type: 'string',
        optional: false,
        nullable: false,
      },
    ],
  );
  if (!resource.ok) {
    throw new Error(`expected resource: ${JSON.stringify(resource.error)}`);
  }
  return resource.value;
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

function mapOf(
  entries: ReadonlyArray<readonly [string, RelationLoadStateEntry]>,
): ReadonlyMap<string, RelationLoadStateEntry> {
  return new Map(entries);
}

describe('RFC-027 checkRelationLoadStates', () => {
  it('fails missing_relation_load_state when a schema Relation has no map entry', () => {
    const resource = resourceWithRelations([baseRelation({ fetch: 'lazy' })]);
    expect(checkRelationLoadStates(resource, new Map())).toEqual({
      ok: false,
      error: { code: 'missing_relation_load_state', relation: 'customer' },
    });
  });

  it('fails eager_relation_not_loaded for eager + not-loaded', () => {
    const resource = resourceWithRelations([baseRelation({ fetch: 'eager' })]);
    expect(
      checkRelationLoadStates(
        resource,
        mapOf([['customer', { status: 'not-loaded' }]]),
      ),
    ).toEqual({
      ok: false,
      error: { code: 'eager_relation_not_loaded', relation: 'customer' },
    });
  });

  it('accepts eager + loaded without inspecting the value', () => {
    const resource = resourceWithRelations([
      baseRelation({ fetch: 'eager', optional: false, nullable: false }),
    ]);
    // Value would fail RFC-025 (absent-forbidden / null-forbidden) if classified —
    // load check must still succeed.
    expect(
      checkRelationLoadStates(
        resource,
        mapOf([['customer', { status: 'loaded', value: null }]]),
      ),
    ).toEqual({ ok: true, value: undefined });
  });

  it('accepts lazy + not-loaded and lazy + loaded', () => {
    const resource = resourceWithRelations([baseRelation({ fetch: 'lazy' })]);
    expect(
      checkRelationLoadStates(
        resource,
        mapOf([['customer', { status: 'not-loaded' }]]),
      ),
    ).toEqual({ ok: true, value: undefined });
    expect(
      checkRelationLoadStates(
        resource,
        mapOf([['customer', { status: 'loaded', value: { id: 'x' } }]]),
      ),
    ).toEqual({ ok: true, value: undefined });
  });

  it('treats inbound identically to outbound for the same fetch/states', () => {
    const outbound = resourceWithRelations([
      baseRelation({ fetch: 'eager', direction: 'outbound' }),
    ]);
    const inbound = resourceWithRelations([
      baseRelation({ fetch: 'eager', direction: 'inbound', name: 'orders' }),
    ]);
    const notLoadedOut = checkRelationLoadStates(
      outbound,
      mapOf([['customer', { status: 'not-loaded' }]]),
    );
    const notLoadedIn = checkRelationLoadStates(
      inbound,
      mapOf([['orders', { status: 'not-loaded' }]]),
    );
    expect(notLoadedOut.ok).toBe(false);
    expect(notLoadedIn.ok).toBe(false);
    if (!notLoadedOut.ok && !notLoadedIn.ok) {
      expect(notLoadedOut.error.code).toBe('eager_relation_not_loaded');
      expect(notLoadedIn.error.code).toBe('eager_relation_not_loaded');
    }
  });

  it('ignores unknown map keys', () => {
    const resource = resourceWithRelations([baseRelation({ fetch: 'lazy' })]);
    expect(
      checkRelationLoadStates(
        resource,
        mapOf([
          ['customer', { status: 'not-loaded' }],
          ['ghost', { status: 'not-loaded' }],
        ]),
      ),
    ).toEqual({ ok: true, value: undefined });
  });

  it('fails fast on the first Relation in schema order', () => {
    const resource = resourceWithRelations([
      baseRelation({ name: 'first', fetch: 'eager' }),
      baseRelation({ name: 'second', fetch: 'eager' }),
    ]);
    expect(
      checkRelationLoadStates(
        resource,
        mapOf([
          ['first', { status: 'not-loaded' }],
          ['second', { status: 'not-loaded' }],
        ]),
      ),
    ).toEqual({
      ok: false,
      error: { code: 'eager_relation_not_loaded', relation: 'first' },
    });
  });

  it('does not call validateResource, checkRelationValueStates, or evaluateCascadeEvent', () => {
    const resource = resourceWithRelations([baseRelation({ fetch: 'lazy' })]);
    const validateSpy = vi.spyOn({ validateResource }, 'validateResource');
    const valueStateSpy = vi.spyOn(
      { checkRelationValueStates },
      'checkRelationValueStates',
    );
    const cascadeSpy = vi.spyOn({ evaluateCascadeEvent }, 'evaluateCascadeEvent');
    checkRelationLoadStates(
      resource,
      mapOf([['customer', { status: 'not-loaded' }]]),
    );
    expect(validateSpy).not.toHaveBeenCalled();
    expect(valueStateSpy).not.toHaveBeenCalled();
    expect(cascadeSpy).not.toHaveBeenCalled();
    validateSpy.mockRestore();
    valueStateSpy.mockRestore();
    cascadeSpy.mockRestore();
  });
});
