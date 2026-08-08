import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { createResourceWithFieldsForTests } from './create-resource-with-fields.js';
import { fieldsEqual } from './fields.js';
import { validateResource } from './validate.js';
import { emptyAnnotations } from './empty-annotations.js';
import { createEmptyResourceSchema } from './schema.js';

describe('RFC-013 field optionality', () => {
  it('accepts closed Fields with optional true and false for all FieldTypes and preserves order', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithFieldsForTests(identity.value, [
      { name: 'id', type: 'string', optional: false },
      { name: 'age', type: 'number', optional: true },
      { name: 'active', type: 'boolean', optional: false },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    expect(resource.value.schema.fields).toEqual([
      { name: 'id', type: 'string', optional: false },
      { name: 'age', type: 'number', optional: true },
      { name: 'active', type: 'boolean', optional: false },
    ]);
    expect(
      fieldsEqual(resource.value.schema.fields, [
        { name: 'id', type: 'string', optional: false },
        { name: 'age', type: 'number', optional: true },
        { name: 'active', type: 'boolean', optional: false },
      ]),
    ).toBe(true);
    expect(
      fieldsEqual(resource.value.schema.fields, [
        { name: 'active', type: 'boolean', optional: false },
        { name: 'age', type: 'number', optional: true },
        { name: 'id', type: 'string', optional: false },
      ]),
    ).toBe(false);
  });

  it('accepts grammar-valid names such as userID (regex is sole name constraint)', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithFieldsForTests(identity.value, [
      { name: 'userID', type: 'string', optional: false },
    ]);
    expect(resource.ok).toBe(true);
  });

  it('rejects invalid FieldName', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const name of ['Id', 'user-id', '']) {
      const resource = createResourceWithFieldsForTests(identity.value, [
        { name, type: 'string', optional: false },
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
      { name: 'id', type: 'string', optional: false },
      { name: 'id', type: 'number', optional: true },
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
        { name: 'id', type, optional: false },
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

    const candidate = {
      name: 'id',
      type: 'string',
      optional: false,
      nullable: true,
    };
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

  it('treats Fields equal only when name, type, and optional match (order-sensitive)', () => {
    expect(
      fieldsEqual(
        [{ name: 'id', type: 'string', optional: false }],
        [{ name: 'id', type: 'number', optional: false }],
      ),
    ).toBe(false);
    expect(
      fieldsEqual(
        [
          { name: 'id', type: 'string', optional: false },
          { name: 'email', type: 'string', optional: true },
        ],
        [
          { name: 'email', type: 'string', optional: true },
          { name: 'id', type: 'string', optional: false },
        ],
      ),
    ).toBe(false);
  });

  it('snapshots so mutating candidates does not change Resource fields', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const candidates = [
      { name: 'id', type: 'string' as const, optional: false },
    ];
    const list: object[] = [candidates[0]!];
    const resource = createResourceWithFieldsForTests(identity.value, list);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    candidates[0]!.name = 'changed';
    list.push({ name: 'extra', type: 'number', optional: true });

    expect(resource.value.schema.fields.map((f) => f.name)).toEqual(['id']);
    expect(resource.value.schema.fields[0]?.type).toBe('string');
    expect(resource.value.schema.fields[0]?.optional).toBe(false);
    expect(Object.isFrozen(resource.value.schema.fields)).toBe(true);
    expect(Object.isFrozen(resource.value.schema.fields[0])).toBe(true);
  });

  it('rejects two-member Fields as missing_field_optional regardless of key order', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const candidate of [
      { name: 'email', type: 'string' },
      { type: 'string', name: 'email' },
    ] as const) {
      const resource = createResourceWithFieldsForTests(identity.value, [
        candidate,
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error).toEqual({
          code: 'invalid_schema',
          cause: { code: 'missing_field_optional', index: 0 },
        });
      }
    }
  });

  it('requires field optional to be an own property', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const field = Object.create({ optional: true });
    field.name = 'email';
    field.type = 'string';

    const resource = createResourceWithFieldsForTests(identity.value, [field]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'missing_field_optional', index: 0 },
      });
    }
  });

  it('rejects non-boolean field optional values', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const optional of ['true', 1, 0, null, 'false'] as const) {
      const resource = createResourceWithFieldsForTests(identity.value, [
        { name: 'email', type: 'string', optional },
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error).toEqual({
          code: 'invalid_schema',
          cause: { code: 'invalid_field_optional', index: 0, optional },
        });
      }
    }
  });

  it('treats Fields with different optional values as unequal', () => {
    expect(
      fieldsEqual(
        [{ name: 'email', type: 'string', optional: false }],
        [{ name: 'email', type: 'string', optional: true }],
      ),
    ).toBe(false);
  });

  it('accepts name-only non-empty operations without a field cause', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: {
        fields: [],
        relations: [],
        operations: [{ name: 'create' }],
      },
      annotations: emptyAnnotations,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.schema.operations.map((o) => o.name)).toEqual([
      'create',
    ]);
  });

  it('rejects invalid operation members without a field cause', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: {
        fields: [],
        relations: [],
        operations: [{ name: 'create', kind: 'command' } as never],
      },
      annotations: emptyAnnotations,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_schema');
      if (result.error.code === 'invalid_schema') {
        expect(result.error.cause?.code).toBe('invalid_operation_member');
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
