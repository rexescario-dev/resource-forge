import { describe, expect, it } from 'vitest';
import { resolveCorrespondenceMapping } from './mapping.js';
import {
  field,
  relation,
  requireIdentity,
  requireResource,
} from './test-fixtures.js';

describe('resolveCorrespondenceMapping', () => {
  it('uses identity-preserving defaults', () => {
    const customer = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('name')],
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
    const order = requireResource({
      identity: requireIdentity('crm', 'Order'),
      fields: [field('id')],
    });
    const result = resolveCorrespondenceMapping([customer, order]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rm = result.value.byIdentityKey.get('crm/Customer');
    expect(rm?.prismaModelName).toBe('Customer');
    expect(rm?.fieldNames.get('name')).toBe('name');
    expect(rm?.relationNames.get('orders')).toBe('orders');
  });

  it('applies host overrides', () => {
    const customer = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('displayName')],
    });
    const result = resolveCorrespondenceMapping([customer], {
      models: { 'crm/Customer': 'Customers' },
      fields: { 'crm/Customer': { displayName: 'name' } },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.byIdentityKey.get('crm/Customer')?.prismaModelName).toBe(
      'Customers',
    );
    expect(
      result.value.byIdentityKey.get('crm/Customer')?.fieldNames.get('displayName'),
    ).toBe('name');
  });

  it('fails when two namespaces default to the same model', () => {
    const a = requireResource({ identity: requireIdentity('foo', 'Customer') });
    const b = requireResource({ identity: requireIdentity('bar', 'Customer') });
    const result = resolveCorrespondenceMapping([a, b]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('mapping_collision');
  });

  it('fails when Field and Relation share a Prisma name', () => {
    const customer = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('orders')],
      relations: [
        relation({
          name: 'orders',
          target: requireIdentity('crm', 'Customer'),
          multiplicity: 'many',
          optional: false,
          nullable: false,
        }),
      ],
    });
    const result = resolveCorrespondenceMapping([customer]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('mapping_collision');
  });
});
