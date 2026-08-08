import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { createResourceWithRelationsForTests } from './create-resource-with-relations.js';
import { emptyAnnotations } from './empty-annotations.js';
import { relationsEqual } from './relations.js';
import { createEmptyResourceSchema } from './schema.js';
import { validateResource } from './validate.js';

const customer = { namespace: 'crm', name: 'Customer' } as const;
const lineItem = { namespace: 'crm', name: 'LineItem' } as const;
const user = { namespace: 'crm', name: 'User' } as const;

describe('RFC-010 associated relations', () => {
  it('accepts closed associated Relations and preserves order + targets', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      { name: 'customer', target: { ...customer } },
      { name: 'lineItems', target: { ...lineItem } },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    expect(resource.value.schema.relations.map((r) => r.name)).toEqual([
      'customer',
      'lineItems',
    ]);
    expect(resource.value.schema.relations.map((r) => r.target)).toEqual([
      customer,
      lineItem,
    ]);
    expect(
      relationsEqual(resource.value.schema.relations, [
        { name: 'customer', target: customer },
        { name: 'lineItems', target: lineItem },
      ]),
    ).toBe(true);
    expect(
      relationsEqual(resource.value.schema.relations, [
        { name: 'lineItems', target: lineItem },
        { name: 'customer', target: customer },
      ]),
    ).toBe(false);
  });

  it('allows self-target', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      { name: 'parent', target: { namespace: 'crm', name: 'Order' } },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;
    expect(resource.value.schema.relations[0]?.target).toEqual({
      namespace: 'crm',
      name: 'Order',
    });
  });

  it('allows the same target under different RelationNames', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      { name: 'author', target: { ...user } },
      { name: 'editor', target: { ...user } },
    ]);
    expect(resource.ok).toBe(true);
  });

  it('accepts grammar-valid names such as userID (regex is sole constraint)', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      { name: 'userID', target: { ...user } },
    ]);
    expect(resource.ok).toBe(true);
  });

  it('rejects name-only Relations as invalid_relation_member (breaking)', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      { name: 'author' },
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error.code).toBe('invalid_schema');
      if (resource.error.code === 'invalid_schema') {
        expect(resource.error.cause?.code).toBe('invalid_relation_member');
      }
    }
  });

  it('rejects string targets without parsing', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      { name: 'customer', target: 'crm/Customer' },
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error.code).toBe('invalid_schema');
      if (resource.error.code === 'invalid_schema') {
        expect(resource.error.cause?.code).toBe('invalid_relation_member');
      }
    }
  });

  it('rejects rf targets under user context as invalid_relation_target', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      { name: 'meta', target: { namespace: 'rf', name: 'Resource' } },
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error.code).toBe('invalid_schema');
      if (resource.error.code === 'invalid_schema') {
        expect(resource.error.cause?.code).toBe('invalid_relation_target');
        if (resource.error.cause?.code === 'invalid_relation_target') {
          expect(resource.error.cause.cause.code).toBe('reserved_namespace');
        }
      }
    }
  });

  it('rejects invalid identity grammar as invalid_relation_target', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      { name: 'customer', target: { namespace: 'CRM', name: 'Customer' } },
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error.code).toBe('invalid_schema');
      if (resource.error.code === 'invalid_schema') {
        expect(resource.error.cause?.code).toBe('invalid_relation_target');
        if (resource.error.cause?.code === 'invalid_relation_target') {
          expect(resource.error.cause.cause.code).toBe('invalid_namespace');
        }
      }
    }
  });

  it('rejects invalid RelationName', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const name of ['Author', 'line-items', '']) {
      const resource = createResourceWithRelationsForTests(identity.value, [
        { name, target: { ...customer } },
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error.code).toBe('invalid_schema');
        if (resource.error.code === 'invalid_schema') {
          expect(resource.error.cause?.code).toBe('invalid_relation_name');
        }
      }
    }
  });

  it('rejects duplicate RelationName', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      { name: 'author', target: { ...user } },
      { name: 'author', target: { namespace: 'crm', name: 'Account' } },
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error.code).toBe('invalid_schema');
      if (resource.error.code === 'invalid_schema') {
        expect(resource.error.cause?.code).toBe('duplicate_relation_name');
      }
    }
  });

  it('rejects extra Relation members without silently stripping', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const candidate = {
      name: 'customer',
      target: { ...customer },
      cardinality: 'many',
    };
    const resource = createResourceWithRelationsForTests(identity.value, [
      candidate,
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error.code).toBe('invalid_schema');
      if (resource.error.code === 'invalid_schema') {
        expect(resource.error.cause?.code).toBe('invalid_relation_member');
      }
    }

    const viaValidate = validateResource({
      identity: identity.value,
      schema: {
        fields: [],
        relations: [candidate as never],
        operations: [],
      },
      annotations: emptyAnnotations,
    });
    expect(viaValidate.ok).toBe(false);
    if (!viaValidate.ok) {
      expect(viaValidate.error.code).toBe('invalid_schema');
      if (viaValidate.error.code === 'invalid_schema') {
        expect(viaValidate.error.cause?.code).toBe('invalid_relation_member');
      }
    }
  });

  it('treats Relations equal only when name and target match', () => {
    expect(
      relationsEqual(
        [{ name: 'a', target: { namespace: 'crm', name: 'A' } }],
        [{ name: 'a', target: { namespace: 'crm', name: 'B' } }],
      ),
    ).toBe(false);
    expect(
      relationsEqual(
        [{ name: 'a', target: { namespace: 'crm', name: 'A' } }],
        [{ name: 'a', target: { namespace: 'crm', name: 'A' } }],
      ),
    ).toBe(true);
  });

  it('allows Field and Relation to share the same name string', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(
      identity.value,
      [{ name: 'author', target: { ...user } }],
      emptyAnnotations,
      [{ name: 'author', type: 'string' }],
    );
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;
    expect(resource.value.schema.fields.map((f) => f.name)).toEqual(['author']);
    expect(resource.value.schema.relations.map((r) => r.name)).toEqual([
      'author',
    ]);
  });

  it('snapshots so mutating candidates does not change Resource relations', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const target = { namespace: 'crm', name: 'User' };
    const candidate = { name: 'author', target };
    const list: object[] = [
      candidate,
      { name: 'lineItems', target: { ...lineItem } },
    ];
    const resource = createResourceWithRelationsForTests(identity.value, list);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    candidate.name = 'mutated';
    target.name = 'Mutated';
    list.push({ name: 'extra', target: { ...customer } });

    expect(resource.value.schema.relations.map((r) => r.name)).toEqual([
      'author',
      'lineItems',
    ]);
    expect(resource.value.schema.relations[0]?.target).toEqual(user);
    expect(Object.isFrozen(resource.value.schema.relations)).toBe(true);
    expect(Object.isFrozen(resource.value.schema.relations[0])).toBe(true);
    expect(Object.isFrozen(resource.value.schema.relations[0]?.target)).toBe(
      true,
    );
  });

  it('rejects non-empty operations without a relation cause', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: {
        fields: [],
        relations: [],
        operations: [{ name: 'create' }] as unknown as [],
      },
      annotations: emptyAnnotations,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_schema');
      if (result.error.code === 'invalid_schema') {
        expect(result.error.cause).toBeUndefined();
      }
    }
  });

  it('keeps empty relations valid', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: createEmptyResourceSchema(),
      annotations: emptyAnnotations,
    });
    expect(result.ok).toBe(true);
  });
});
