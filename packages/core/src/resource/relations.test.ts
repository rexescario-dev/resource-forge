import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { createResourceWithRelationsForTests } from './create-resource-with-relations.js';
import { emptyAnnotations } from './empty-annotations.js';
import { relationsEqual } from './relations.js';
import { createEmptyResourceSchema } from './schema.js';
import { validateResource } from './validate.js';

describe('RFC-008 relations', () => {
  it('accepts valid ordered non-empty relations and preserves order', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      { name: 'author' },
      { name: 'lineItems' },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    expect(resource.value.schema.relations.map((r) => r.name)).toEqual([
      'author',
      'lineItems',
    ]);
    expect(
      relationsEqual(resource.value.schema.relations, [
        { name: 'author' },
        { name: 'lineItems' },
      ]),
    ).toBe(true);
    expect(
      relationsEqual(resource.value.schema.relations, [
        { name: 'lineItems' },
        { name: 'author' },
      ]),
    ).toBe(false);
  });

  it('accepts grammar-valid names such as userID (regex is sole constraint)', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      { name: 'userID' },
    ]);
    expect(resource.ok).toBe(true);
  });

  it('rejects invalid RelationName', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const name of ['Author', 'line-items', '']) {
      const resource = createResourceWithRelationsForTests(identity.value, [
        { name },
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
      { name: 'author' },
      { name: 'author' },
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error.code).toBe('invalid_schema');
      if (resource.error.code === 'invalid_schema') {
        expect(resource.error.cause?.code).toBe('duplicate_relation_name');
      }
    }
  });

  it('rejects extra properties without silently stripping to a valid Relation', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const candidate = { name: 'author', target: 'User' };
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
        relations: [candidate as { name: string }],
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

  it('allows Field and Relation to share the same name string', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(
      identity.value,
      [{ name: 'author' }],
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

    const candidate = { name: 'author' };
    const list: object[] = [candidate, { name: 'lineItems' }];
    const resource = createResourceWithRelationsForTests(identity.value, list);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    candidate.name = 'mutated';
    list.push({ name: 'extra' });

    expect(resource.value.schema.relations.map((r) => r.name)).toEqual([
      'author',
      'lineItems',
    ]);
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
