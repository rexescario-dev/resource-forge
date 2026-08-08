import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { createResourceWithFieldsForTests } from './create-resource-with-fields.js';
import { fieldsEqual } from './fields.js';
import { validateResource } from './validate.js';
import { emptyAnnotations } from './empty-annotations.js';
import { createEmptyResourceSchema } from './schema.js';

describe('RFC-007 fields', () => {
  it('accepts valid ordered non-empty fields and preserves order', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithFieldsForTests(identity.value, [
      { name: 'id' },
      { name: 'email' },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    expect(resource.value.schema.fields.map((f) => f.name)).toEqual([
      'id',
      'email',
    ]);
    expect(
      fieldsEqual(resource.value.schema.fields, [
        { name: 'id' },
        { name: 'email' },
      ]),
    ).toBe(true);
    expect(
      fieldsEqual(resource.value.schema.fields, [
        { name: 'email' },
        { name: 'id' },
      ]),
    ).toBe(false);
  });

  it('accepts grammar-valid names such as userID (regex is sole constraint)', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithFieldsForTests(identity.value, [
      { name: 'userID' },
    ]);
    expect(resource.ok).toBe(true);
  });

  it('rejects invalid FieldName', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const name of ['Id', 'user-id', '']) {
      const resource = createResourceWithFieldsForTests(identity.value, [
        { name },
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error.code).toBe('invalid_schema');
        if (resource.error.code === 'invalid_schema') {
          expect(resource.error.cause?.code).toBe('invalid_field_name');
        }
      }
    }
  });

  it('rejects duplicate FieldName', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithFieldsForTests(identity.value, [
      { name: 'id' },
      { name: 'id' },
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error.code).toBe('invalid_schema');
      if (resource.error.code === 'invalid_schema') {
        expect(resource.error.cause?.code).toBe('duplicate_field_name');
      }
    }
  });

  it('rejects extra properties without silently stripping to a valid Field', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const candidate = { name: 'id', type: 'string' };
    const resource = createResourceWithFieldsForTests(identity.value, [
      candidate,
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error.code).toBe('invalid_schema');
      if (resource.error.code === 'invalid_schema') {
        expect(resource.error.cause?.code).toBe('invalid_field_member');
      }
    }

    const viaValidate = validateResource({
      identity: identity.value,
      schema: {
        fields: [candidate as { name: string }],
        relations: [],
        operations: [],
      },
      annotations: emptyAnnotations,
    });
    expect(viaValidate.ok).toBe(false);
    if (!viaValidate.ok) {
      expect(viaValidate.error.code).toBe('invalid_schema');
      if (viaValidate.error.code === 'invalid_schema') {
        expect(viaValidate.error.cause?.code).toBe('invalid_field_member');
      }
    }
  });

  it('snapshots so mutating candidates does not change Resource fields', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const candidate = { name: 'id' };
    const list: object[] = [candidate, { name: 'email' }];
    const resource = createResourceWithFieldsForTests(identity.value, list);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    candidate.name = 'mutated';
    list.push({ name: 'extra' });

    expect(resource.value.schema.fields.map((f) => f.name)).toEqual([
      'id',
      'email',
    ]);
  });

  it('rejects non-empty operations without a field cause', () => {
    const identity = createResourceIdentity('crm', 'Customer');
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

  it('keeps empty fields valid', () => {
    const identity = createResourceIdentity('crm', 'Customer');
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
