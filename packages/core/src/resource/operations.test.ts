import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { createResourceWithOperationsForTests } from './create-resource-with-operations.js';
import { emptyAnnotations } from './empty-annotations.js';
import { operationsEqual } from './operations.js';
import { createEmptyResourceSchema } from './schema.js';
import { validateResource } from './validate.js';

const customer = { namespace: 'crm', name: 'Customer' } as const;

describe('RFC-012 resource operations', () => {
  it('accepts ordered non-empty name-only operations and preserves order', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithOperationsForTests(identity.value, [
      { name: 'create' },
      { name: 'cancel' },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    expect(resource.value.schema.operations.map((o) => o.name)).toEqual([
      'create',
      'cancel',
    ]);
    expect(
      operationsEqual(resource.value.schema.operations, [
        { name: 'create' },
        { name: 'cancel' },
      ]),
    ).toBe(true);
    expect(
      operationsEqual(resource.value.schema.operations, [
        { name: 'cancel' },
        { name: 'create' },
      ]),
    ).toBe(false);
  });

  it('keeps empty operations valid', () => {
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
    expect(result.value.schema.operations).toEqual([]);
  });

  it('accepts grammar-valid names such as createID (regex is sole constraint)', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithOperationsForTests(identity.value, [
      { name: 'createID' },
    ]);
    expect(resource.ok).toBe(true);
  });

  it('treats create/read/update/delete as ordinary names with no special meaning', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithOperationsForTests(identity.value, [
      { name: 'create' },
      { name: 'read' },
      { name: 'update' },
      { name: 'delete' },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;
    expect(resource.value.schema.operations.map((o) => o.name)).toEqual([
      'create',
      'read',
      'update',
      'delete',
    ]);
  });

  it('rejects invalid OperationName', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const name of ['Create', 'create-order', '']) {
      const resource = createResourceWithOperationsForTests(identity.value, [
        { name },
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error.code).toBe('invalid_schema');
        if (resource.error.code === 'invalid_schema') {
          expect(resource.error.cause?.code).toBe('invalid_operation_name');
        }
      }
    }
  });

  it('rejects duplicate OperationName', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithOperationsForTests(identity.value, [
      { name: 'create' },
      { name: 'create' },
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error.code).toBe('invalid_schema');
      if (resource.error.code === 'invalid_schema') {
        expect(resource.error.cause?.code).toBe('duplicate_operation_name');
      }
    }
  });

  it('rejects additional semantic properties without stripping to valid', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithOperationsForTests(identity.value, [
      { name: 'create', kind: 'command' },
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error.code).toBe('invalid_schema');
      if (resource.error.code === 'invalid_schema') {
        expect(resource.error.cause?.code).toBe('invalid_operation_member');
      }
    }

    const viaValidate = validateResource({
      identity: identity.value,
      schema: {
        fields: [],
        relations: [],
        operations: [{ name: 'create', kind: 'command' } as never],
      },
      annotations: emptyAnnotations,
    });
    expect(viaValidate.ok).toBe(false);
    if (!viaValidate.ok) {
      expect(viaValidate.error.code).toBe('invalid_schema');
      if (viaValidate.error.code === 'invalid_schema') {
        expect(viaValidate.error.cause?.code).toBe('invalid_operation_member');
      }
    }
  });

  it('allows Field, Relation, and Operation to share the same name string', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithOperationsForTests(
      identity.value,
      [{ name: 'create' }],
      emptyAnnotations,
      [{ name: 'create', type: 'string', optional: false, nullable: false }],
      [
        {
          name: 'create',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: false,
        },
      ],
    );
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;
    expect(resource.value.schema.fields[0]?.name).toBe('create');
    expect(resource.value.schema.relations[0]?.name).toBe('create');
    expect(resource.value.schema.operations[0]?.name).toBe('create');
  });

  it('freezes operations snapshot against caller mutation', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const candidate = { name: 'create' };
    const list: object[] = [candidate];
    const resource = createResourceWithOperationsForTests(identity.value, list);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    candidate.name = 'mutated';
    list.push({ name: 'cancel' });

    expect(resource.value.schema.operations.map((o) => o.name)).toEqual([
      'create',
    ]);
    expect(Object.isFrozen(resource.value.schema.operations)).toBe(true);
    expect(Object.isFrozen(resource.value.schema.operations[0])).toBe(true);
  });
});
