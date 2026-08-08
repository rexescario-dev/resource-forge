import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { createResourceWithFieldsForTests } from './create-resource-with-fields.js';
import { createResourceWithRelationsForTests } from './create-resource-with-relations.js';
import { checkFields, fieldsEqual } from './fields.js';
import { validateResource } from './validate.js';
import { emptyAnnotations } from './empty-annotations.js';
import { createEmptyResourceSchema } from './schema.js';

describe('RFC-014 field nullability', () => {
  it('accepts closed Fields with all optional × nullable combinations and preserves order', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithFieldsForTests(identity.value, [
      { name: 'email', type: 'string', optional: false, nullable: false },
      { name: 'nickname', type: 'string', optional: true, nullable: false },
      { name: 'bio', type: 'string', optional: false, nullable: true },
      { name: 'middle', type: 'string', optional: true, nullable: true },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    expect(resource.value.schema.fields).toEqual([
      { name: 'email', type: 'string', optional: false, nullable: false },
      { name: 'nickname', type: 'string', optional: true, nullable: false },
      { name: 'bio', type: 'string', optional: false, nullable: true },
      { name: 'middle', type: 'string', optional: true, nullable: true },
    ]);
    expect(
      fieldsEqual(resource.value.schema.fields, [
        { name: 'email', type: 'string', optional: false, nullable: false },
        { name: 'nickname', type: 'string', optional: true, nullable: false },
        { name: 'bio', type: 'string', optional: false, nullable: true },
        { name: 'middle', type: 'string', optional: true, nullable: true },
      ]),
    ).toBe(true);
    expect(
      fieldsEqual(resource.value.schema.fields, [
        { name: 'middle', type: 'string', optional: true, nullable: true },
        { name: 'bio', type: 'string', optional: false, nullable: true },
        { name: 'nickname', type: 'string', optional: true, nullable: false },
        { name: 'email', type: 'string', optional: false, nullable: false },
      ]),
    ).toBe(false);
  });

  it('accepts grammar-valid names such as userID (regex is sole name constraint)', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithFieldsForTests(identity.value, [
      { name: 'userID', type: 'string', optional: false, nullable: false },
    ]);
    expect(resource.ok).toBe(true);
  });

  it('rejects invalid FieldName', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const name of ['Id', 'user-id', '']) {
      const resource = createResourceWithFieldsForTests(identity.value, [
        { name, type: 'string', optional: false, nullable: false },
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

  it('rejects duplicate FieldName even when nullable differs', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithFieldsForTests(identity.value, [
      { name: 'email', type: 'string', optional: false, nullable: false },
      { name: 'email', type: 'string', optional: false, nullable: true },
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
  });

  it('rejects invalid FieldType vocabulary as invalid_field_type', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const type of ['String', ' string ', 'str', 'integer', 'null', 1] as const) {
      const resource = createResourceWithFieldsForTests(identity.value, [
        { name: 'id', type, optional: false, nullable: false },
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
      nullable: false,
      default: '',
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

  it('classifies shape boundaries without collapsing missing causes', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const cases: Array<{ candidate: unknown; code: string }> = [
      { candidate: { name: 'email', type: 'string' }, code: 'missing_field_optional' },
      {
        candidate: { name: 'email', type: 'string', optional: false },
        code: 'missing_field_nullable',
      },
      {
        candidate: { name: 'email', type: 'string', nullable: true },
        code: 'invalid_field_member',
      },
      {
        candidate: {
          name: 'email',
          type: 'string',
          optional: false,
          default: '',
        },
        code: 'invalid_field_member',
      },
    ];

    for (const { candidate, code } of cases) {
      const resource = createResourceWithFieldsForTests(identity.value, [
        candidate as object,
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error).toEqual({
          code: 'invalid_schema',
          cause: { code, index: 0 },
        });
      }
    }
  });

  it('rejects three-member Fields as missing_field_nullable regardless of key order', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const candidates: unknown[] = [
      { name: 'email', type: 'string', optional: false },
      { optional: false, type: 'string', name: 'email' },
    ];
    for (const candidate of candidates) {
      const resource = createResourceWithFieldsForTests(identity.value, [
        candidate as object,
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error).toEqual({
          code: 'invalid_schema',
          cause: { code: 'missing_field_nullable', index: 0 },
        });
      }
    }
  });

  it('requires field nullable to be an own property', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const field = Object.create({ nullable: true });
    field.name = 'email';
    field.type = 'string';
    field.optional = false;

    const resource = createResourceWithFieldsForTests(identity.value, [field]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'missing_field_nullable', index: 0 },
      });
    }
  });

  it('rejects non-boolean field nullable values', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const nullable of ['true', 1, 0, null, 'false'] as const) {
      const resource = createResourceWithFieldsForTests(identity.value, [
        { name: 'email', type: 'string', optional: false, nullable },
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error).toEqual({
          code: 'invalid_schema',
          cause: { code: 'invalid_field_nullable', index: 0, nullable },
        });
      }
    }
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
        { name: 'email', type: 'string', optional, nullable: false },
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

  it('fieldsEqual is false when only nullable differs', () => {
    expect(
      fieldsEqual(
        [{ name: 'email', type: 'string', optional: false, nullable: false }],
        [{ name: 'email', type: 'string', optional: false, nullable: true }],
      ),
    ).toBe(false);
  });

  it('treats Fields with different optional values as unequal', () => {
    expect(
      fieldsEqual(
        [{ name: 'email', type: 'string', optional: false, nullable: false }],
        [{ name: 'email', type: 'string', optional: true, nullable: false }],
      ),
    ).toBe(false);
  });

  it('snapshots so mutating candidates does not change Resource fields', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const candidates = [
      {
        name: 'id',
        type: 'string' as const,
        optional: false,
        nullable: false,
      },
    ];
    const list: object[] = [candidates[0]!];
    const resource = createResourceWithFieldsForTests(identity.value, list);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    candidates[0]!.name = 'changed';
    list.push({
      name: 'extra',
      type: 'number',
      optional: true,
      nullable: false,
    });

    expect(resource.value.schema.fields.map((f) => f.name)).toEqual(['id']);
    expect(resource.value.schema.fields[0]?.type).toBe('string');
    expect(resource.value.schema.fields[0]?.optional).toBe(false);
    expect(resource.value.schema.fields[0]?.nullable).toBe(false);
    expect(Object.isFrozen(resource.value.schema.fields)).toBe(true);
    expect(Object.isFrozen(resource.value.schema.fields[0])).toBe(true);
  });

  it('rejects invalid candidates in checkFields before any snapshotted Resource fields exist', () => {
    const invalid: unknown[] = [
      { name: 'email', type: 'string', optional: false },
      { name: 'email', type: 'string', optional: false, nullable: 'true' },
      {
        name: 'email',
        type: 'string',
        optional: false,
        nullable: false,
        default: '',
      },
    ];
    for (const candidate of invalid) {
      const checked = checkFields([candidate]);
      expect(checked.ok).toBe(false);
    }
  });

  it('rejects Relation nullable as invalid_relation_member', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      {
        name: 'customer',
        target: { namespace: 'crm', name: 'Customer' },
        multiplicity: 'one',
        optional: false,
        nullable: true,
      },
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error.code).toBe('invalid_schema');
      if (resource.error.code === 'invalid_schema') {
        expect(resource.error.cause?.code).toBe('invalid_relation_member');
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
