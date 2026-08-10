import { describe, expect, it, vi } from 'vitest';
import { createPrismaResourceBinding } from './binding.js';
import type { StructuralModelDelegate } from './binding-delegate.js';
import type { PrismaRealizationMapping } from './realization.js';
import {
  field,
  relation,
  requireIdentity,
  requireResource,
} from './test-fixtures.js';

function memoryDelegate(
  initial: Record<string, Record<string, unknown>> = {},
): StructuralModelDelegate & {
  readonly store: Map<string, Record<string, unknown>>;
  readonly lastCreateArgs: { data: Record<string, unknown> } | null;
} {
  const store = new Map(
    Object.entries(initial).map(([k, v]) => [k, { ...v }]),
  );
  let lastCreateArgs: { data: Record<string, unknown> } | null = null;
  const idKey = 'realized_id';

  return {
    store,
    get lastCreateArgs() {
      return lastCreateArgs;
    },
    create({ data }) {
      lastCreateArgs = { data: { ...data } };
      const id = String(data[idKey] ?? data.id);
      const row = { ...data };
      store.set(id, row);
      return row;
    },
    findUnique({ where }) {
      const id = String(Object.values(where)[0]);
      return store.get(id) ?? null;
    },
    update({ where, data }) {
      const id = String(Object.values(where)[0]);
      const existing = store.get(id);
      if (!existing) throw new Error('not found');
      const row = { ...existing, ...data };
      store.set(id, row);
      return row;
    },
    delete({ where }) {
      const id = String(Object.values(where)[0]);
      const existing = store.get(id);
      if (!existing) throw new Error('not found');
      store.delete(id);
      return existing;
    },
  };
}

describe('createPrismaResourceBinding', () => {
  const customerId = requireIdentity('crm', 'Customer');

  const customer = requireResource({
    identity: customerId,
    fields: [field('id'), field('displayName')],
    relations: [
      relation({
        name: 'orders',
        target: requireIdentity('crm', 'Order'),
        multiplicity: 'many',
        optional: false,
        nullable: false,
      }),
    ],
  });

  const realization: PrismaRealizationMapping = {
    identities: {
      'crm/Customer': { kind: 'resourceField', field: 'id' },
    },
    fields: {
      'crm/Customer': {
        id: 'realized_id',
        displayName: 'realized_display_name',
      },
    },
  };

  it('returns four ops for a valid resourceField binding', () => {
    const result = createPrismaResourceBinding({
      resource: customer,
      realization,
      delegate: memoryDelegate(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.value.create).toBe('function');
    expect(typeof result.value.findUnique).toBe('function');
    expect(typeof result.value.update).toBe('function');
    expect(typeof result.value.delete).toBe('function');
  });

  it('fails factory when a delegate op is missing', () => {
    const result = createPrismaResourceBinding({
      resource: customer,
      realization,
      delegate: {
        create: () => ({}),
        findUnique: () => null,
        update: () => ({}),
        delete: undefined as unknown as StructuralModelDelegate['delete'],
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.category).toBe('binding_invalid');
  });

  it('fails factory when identity is missing', () => {
    const result = createPrismaResourceBinding({
      resource: customer,
      realization: { identities: {} },
      delegate: memoryDelegate(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.category).toBe('binding_invalid');
    expect(result.error.code).toBe('missing_identity');
  });

  it('maps create bidirectionally through field overlays', async () => {
    const delegate = memoryDelegate();
    const binding = createPrismaResourceBinding({
      resource: customer,
      realization,
      delegate,
    });
    expect(binding.ok).toBe(true);
    if (!binding.ok) return;

    const created = await binding.value.create({
      id: 'r1',
      displayName: 'Rex',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(delegate.lastCreateArgs?.data).toEqual({
      realized_id: 'r1',
      realized_display_name: 'Rex',
    });
    expect(created.value).toEqual({ id: 'r1', displayName: 'Rex' });
  });

  it('findUnique returns ok(null) when missing', async () => {
    const binding = createPrismaResourceBinding({
      resource: customer,
      realization,
      delegate: memoryDelegate(),
    });
    expect(binding.ok).toBe(true);
    if (!binding.ok) return;
    const found = await binding.value.findUnique('missing');
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value).toBeNull();
  });

  it('rejects Relation keys in create data', async () => {
    const binding = createPrismaResourceBinding({
      resource: customer,
      realization,
      delegate: memoryDelegate(),
    });
    expect(binding.ok).toBe(true);
    if (!binding.ok) return;
    const created = await binding.value.create({
      id: 'r1',
      displayName: 'Rex',
      orders: [],
    } as Record<string, unknown>);
    expect(created.ok).toBe(false);
    if (created.ok) return;
    expect(created.error.category).toBe('payload_invalid');
  });

  it('rejects missing required create Field', async () => {
    const binding = createPrismaResourceBinding({
      resource: customer,
      realization,
      delegate: memoryDelegate(),
    });
    expect(binding.ok).toBe(true);
    if (!binding.ok) return;
    const created = await binding.value.create({ id: 'r1' });
    expect(created.ok).toBe(false);
    if (created.ok) return;
    expect(created.error.category).toBe('payload_invalid');
  });

  it('rejects missing identity Field on create', async () => {
    const binding = createPrismaResourceBinding({
      resource: customer,
      realization,
      delegate: memoryDelegate(),
    });
    expect(binding.ok).toBe(true);
    if (!binding.ok) return;
    const created = await binding.value.create({ displayName: 'Rex' });
    expect(created.ok).toBe(false);
    if (created.ok) return;
    expect(created.error.category).toBe('identity_invalid');
  });

  it('rejects identity Field in update patch', async () => {
    const delegate = memoryDelegate({
      r1: { realized_id: 'r1', realized_display_name: 'Rex' },
    });
    const binding = createPrismaResourceBinding({
      resource: customer,
      realization,
      delegate,
    });
    expect(binding.ok).toBe(true);
    if (!binding.ok) return;
    const updated = await binding.value.update('r1', {
      id: 'r2',
      displayName: 'Other',
    });
    expect(updated.ok).toBe(false);
    if (updated.ok) return;
    expect(updated.error.category).toBe('identity_invalid');
  });

  it('returns binding_invalid when projection field missing after delegate success', async () => {
    const binding = createPrismaResourceBinding({
      resource: customer,
      realization,
      delegate: {
        create: () => ({ realized_id: 'r1' }),
        findUnique: () => null,
        update: () => ({}),
        delete: () => ({}),
      },
    });
    expect(binding.ok).toBe(true);
    if (!binding.ok) return;
    const created = await binding.value.create({
      id: 'r1',
      displayName: 'Rex',
    });
    expect(created.ok).toBe(false);
    if (created.ok) return;
    expect(created.error.category).toBe('binding_invalid');
    expect(created.error.code).toBe('missing_projected_field');
  });

  it('maps delegate throw to delegate_failed with cause', async () => {
    const cause = new Error('boom');
    const binding = createPrismaResourceBinding({
      resource: customer,
      realization,
      delegate: {
        create: () => {
          throw cause;
        },
        findUnique: () => null,
        update: () => ({}),
        delete: () => ({}),
      },
    });
    expect(binding.ok).toBe(true);
    if (!binding.ok) return;
    const created = await binding.value.create({
      id: 'r1',
      displayName: 'Rex',
    });
    expect(created.ok).toBe(false);
    if (created.ok) return;
    expect(created.error.category).toBe('delegate_failed');
    expect(created.error.cause).toBe(cause);
  });

  it('maps delegate Promise reject to delegate_failed', async () => {
    const cause = new Error('async boom');
    const binding = createPrismaResourceBinding({
      resource: customer,
      realization,
      delegate: {
        create: async () => {
          throw cause;
        },
        findUnique: () => null,
        update: () => ({}),
        delete: () => ({}),
      },
    });
    expect(binding.ok).toBe(true);
    if (!binding.ok) return;
    const created = await binding.value.create({
      id: 'r1',
      displayName: 'Rex',
    });
    expect(created.ok).toBe(false);
    if (created.ok) return;
    expect(created.error.category).toBe('delegate_failed');
    expect(created.error.cause).toBe(cause);
  });

  it('supports update and delete happy paths', async () => {
    const delegate = memoryDelegate({
      r1: { realized_id: 'r1', realized_display_name: 'Rex' },
    });
    const binding = createPrismaResourceBinding({
      resource: customer,
      realization,
      delegate,
    });
    expect(binding.ok).toBe(true);
    if (!binding.ok) return;

    const updated = await binding.value.update('r1', { displayName: 'Alex' });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.value).toEqual({ id: 'r1', displayName: 'Alex' });

    const deleted = await binding.value.delete('r1');
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) return;
    expect(deleted.value).toEqual({ id: 'r1', displayName: 'Alex' });
  });
});

describe('createPrismaResourceBinding prismaExtra', () => {
  const tagId = requireIdentity('crm', 'Tag');
  const tag = requireResource({
    identity: tagId,
    fields: [field('name')],
  });

  const realization: PrismaRealizationMapping = {
    identities: {
      'crm/Tag': {
        kind: 'prismaExtra',
        name: 'id',
        scalar: 'String',
      },
    },
  };

  it('places host identity on realized @id and does not project it as a Resource Field', async () => {
    const create = vi.fn(({ data }: { data: Record<string, unknown> }) => ({
      ...data,
    }));
    const binding = createPrismaResourceBinding({
      resource: tag,
      realization,
      delegate: {
        create,
        findUnique: () => null,
        update: () => ({}),
        delete: () => ({}),
      },
    });
    expect(binding.ok).toBe(true);
    if (!binding.ok) return;

    const created = await binding.value.create({ name: 'Rex' }, 'db-1');
    expect(create).toHaveBeenCalledWith({
      data: { id: 'db-1', name: 'Rex' },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value).toEqual({ name: 'Rex' });
    expect(created.value).not.toHaveProperty('id');
  });

  it('fails factory on prismaExtra collision with Field mapping', () => {
    const colliding = requireResource({
      identity: tagId,
      fields: [field('id'), field('name')],
    });
    const result = createPrismaResourceBinding({
      resource: colliding,
      realization,
      delegate: memoryDelegate(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.category).toBe('binding_invalid');
    expect(result.error.code).toBe('identity_collision');
  });

  it('allows empty bindable create/update under prismaExtra with no Fields', async () => {
    const empty = requireResource({ identity: tagId, fields: [] });
    const store = new Map<string, Record<string, unknown>>();
    const binding = createPrismaResourceBinding({
      resource: empty,
      realization,
      delegate: {
        create: ({ data }) => {
          store.set(String(data.id), { ...data });
          return { ...data };
        },
        findUnique: ({ where }) => store.get(String(where.id)) ?? null,
        update: ({ where, data }) => {
          const row = { ...(store.get(String(where.id)) ?? {}), ...data };
          store.set(String(where.id), row);
          return row;
        },
        delete: ({ where }) => {
          const row = store.get(String(where.id));
          if (!row) throw new Error('missing');
          store.delete(String(where.id));
          return row;
        },
      },
    });
    expect(binding.ok).toBe(true);
    if (!binding.ok) return;

    const created = await binding.value.create({}, 'e1');
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value).toEqual({});

    const updated = await binding.value.update('e1', {});
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.value).toEqual({});

    const found = await binding.value.findUnique('e1');
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value).toEqual({});
  });

  it('rejects missing prismaExtra identity on create', async () => {
    const binding = createPrismaResourceBinding({
      resource: tag,
      realization,
      delegate: memoryDelegate(),
    });
    expect(binding.ok).toBe(true);
    if (!binding.ok) return;
    const created = await binding.value.create({ name: 'Rex' });
    expect(created.ok).toBe(false);
    if (created.ok) return;
    expect(created.error.category).toBe('identity_invalid');
  });
});
