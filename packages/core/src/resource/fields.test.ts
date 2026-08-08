import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { createResourceWithFieldsForTests } from './create-resource-with-fields.js';
import { fieldsEqual } from './fields.js';
import { validateResource } from './validate.js';
import { emptyAnnotations } from './empty-annotations.js';
import { createEmptyResourceSchema } from './schema.js';

describe('RFC-009 field types', () => {
  it('accepts closed typed Fields for all FieldType members and preserves order', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithFieldsForTests(identity.value, [
      { name: 'id', type: 'string' },
      { name: 'age', type: 'number' },
      { name: 'active', type: 'boolean' },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    expect(resource.value.schema.fields).toEqual([
      { name: 'id', type: 'string' },
      { name: 'age', type: 'number' },
      { name: 'active', type: 'boolean' },
    ]);
    expect(
      fieldsEqual(resource.value.schema.fields, [
        { name: 'id', type: 'string' },
        { name: 'age', type: 'number' },
        { name: 'active', type: 'boolean' },
      ]),
    ).toBe(true);
    expect(
      fieldsEqual(resource.value.schema.fields, [
        { name: 'active', type: 'boolean' },
        { name: 'age', type: 'number' },
        { name: 'id', type: 'string' },
      ]),
    ).toBe(false);
  });

  it('accepts grammar-valid names such as userID (regex is sole name constraint)', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithFieldsForTests(identity.value, [
      { name: 'userID', type: 'string' },
    ]);
    expect(resource.ok).toBe(true);
  });

  it('rejects invalid FieldName', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const name of ['Id', 'user-id', '']) {
      const resource = createResourceWithFieldsForTests(identity.value, [
        { name, type: 'string' },
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
      { name: 'id', type: 'string' },
      { name: 'id', type: 'number' },
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error.code).toBe('invalid_schema');
      if (resource.error.code === 'invalid_schema') {
        expect(resource.error.cause?.code).toBe('duplicate_field_name');
      }
    }
  });

  it('rejects name-only Fields as invalid_field_member (breaking)', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithFieldsForTests(identity.value, [
      { name: 'id' },
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
        fields: [{ name: 'id' } as { name: string; type: 'string' }],
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

  it('rejects invalid FieldType vocabulary as invalid_field_type', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const type of ['String', ' string ', 'str', 'integer', 'null', 1] as const) {
      const resource = createResourceWithFieldsForTests(identity.value, [
        { name: 'id', type },
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error.code).toBe('invalid_schema');
        if (resource.error.code === 'invalid_schema') {
          expect(resource.error.cause).toEqual({
            code: 'invalid_field_type',
            index: 0,
            type,
          });
        }
      }
    }
  });

  it('rejects extra Field members without stripping', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const candidate = { name: 'id', type: 'string', description: 'x' };
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
  });

  it('treats Fields equal only when name and type match (order-sensitive)', () => {
    expect(
      fieldsEqual(
        [{ name: 'id', type: 'string' }],
        [{ name: 'id', type: 'number' }],
      ),
    ).toBe(false);
    expect(
      fieldsEqual(
        [
          { name: 'id', type: 'string' },
          { name: 'email', type: 'string' },
        ],
        [
          { name: 'email', type: 'string' },
          { name: 'id', type: 'string' },
        ],
      ),
    ).toBe(false);
  });

  it('snapshots so mutating candidates does not change Resource fields', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const candidates = [{ name: 'id', type: 'string' as const }];
    const list: object[] = [candidates[0]!];
    const resource = createResourceWithFieldsForTests(identity.value, list);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    candidates[0]!.name = 'changed';
    list.push({ name: 'extra', type: 'number' });

    expect(resource.value.schema.fields.map((f) => f.name)).toEqual(['id']);
    expect(resource.value.schema.fields[0]?.type).toBe('string');
    expect(Object.isFrozen(resource.value.schema.fields)).toBe(true);
    expect(Object.isFrozen(resource.value.schema.fields[0])).toBe(true);
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
