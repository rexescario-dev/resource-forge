import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { createResourceWithRelationsForTests } from './create-resource-with-relations.js';
import { emptyAnnotations } from './empty-annotations.js';
import { checkRelations, relationsEqual } from './relations.js';
import { createEmptyResourceSchema } from './schema.js';
import { validateResource } from './validate.js';

const customer = { namespace: 'crm', name: 'Customer' } as const;
const lineItem = { namespace: 'crm', name: 'LineItem' } as const;
const user = { namespace: 'crm', name: 'User' } as const;
const tag = { namespace: 'crm', name: 'Tag' } as const;
const alias = { namespace: 'crm', name: 'Alias' } as const;

describe('RFC-015 relation association-reference nullability', () => {
  it('accepts closed Relations with optional × multiplicity × nullable combinations and preserves order', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      {
        name: 'customer',
        target: { ...customer },
        multiplicity: 'one',
        optional: false,
        nullable: false,
      },
      {
        name: 'sponsor',
        target: { ...customer },
        multiplicity: 'one',
        optional: false,
        nullable: true,
      },
      {
        name: 'tags',
        target: { ...tag },
        multiplicity: 'many',
        optional: true,
        nullable: false,
      },
      {
        name: 'aliases',
        target: { ...alias },
        multiplicity: 'many',
        optional: true,
        nullable: true,
      },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    expect(
      relationsEqual(resource.value.schema.relations, [
        {
          name: 'customer',
          target: customer,
          multiplicity: 'one',
          optional: false,
          nullable: false,
        },
        {
          name: 'sponsor',
          target: customer,
          multiplicity: 'one',
          optional: false,
          nullable: true,
        },
        {
          name: 'tags',
          target: tag,
          multiplicity: 'many',
          optional: true,
          nullable: false,
        },
        {
          name: 'aliases',
          target: alias,
          multiplicity: 'many',
          optional: true,
          nullable: true,
        },
      ]),
    ).toBe(true);
    expect(
      relationsEqual(resource.value.schema.relations, [
        {
          name: 'aliases',
          target: alias,
          multiplicity: 'many',
          optional: true,
          nullable: true,
        },
        {
          name: 'tags',
          target: tag,
          multiplicity: 'many',
          optional: true,
          nullable: false,
        },
        {
          name: 'sponsor',
          target: customer,
          multiplicity: 'one',
          optional: false,
          nullable: true,
        },
        {
          name: 'customer',
          target: customer,
          multiplicity: 'one',
          optional: false,
          nullable: false,
        },
      ]),
    ).toBe(false);
  });

  it('allows self-target', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      {
        name: 'parent',
        target: { namespace: 'crm', name: 'Order' },
        multiplicity: 'one',
        optional: false,
        nullable: false,
      },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;
    expect(resource.value.schema.relations[0]?.target).toEqual({
      namespace: 'crm',
      name: 'Order',
    });
    expect(resource.value.schema.relations[0]?.nullable).toBe(false);
  });

  it('allows the same target under different RelationNames', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      {
        name: 'author',
        target: { ...user },
        multiplicity: 'one',
        optional: false,
        nullable: false,
      },
      {
        name: 'editor',
        target: { ...user },
        multiplicity: 'one',
        optional: true,
        nullable: true,
      },
    ]);
    expect(resource.ok).toBe(true);
  });

  it('accepts grammar-valid names such as userID (regex is sole constraint)', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      {
        name: 'userID',
        target: { ...user },
        multiplicity: 'one',
        optional: false,
        nullable: false,
      },
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

  it('classifies shape boundaries without collapsing missing causes', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const cases: { candidate: object; code: string }[] = [
      {
        candidate: { name: 'customer', target: { ...customer } },
        code: 'missing_relation_multiplicity',
      },
      {
        candidate: {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
        },
        code: 'missing_relation_optional',
      },
      {
        candidate: {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
        },
        code: 'missing_relation_nullable',
      },
      {
        candidate: {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          nullable: true,
        },
        code: 'invalid_relation_member',
      },
      {
        candidate: {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          default: '',
        },
        code: 'invalid_relation_member',
      },
    ];

    for (const { candidate, code } of cases) {
      const resource = createResourceWithRelationsForTests(identity.value, [
        candidate,
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error.code).toBe('invalid_schema');
        if (resource.error.code === 'invalid_schema') {
          expect(resource.error.cause?.code).toBe(code);
        }
      }
    }
  });

  it('rejects four-member Relations as missing_relation_nullable regardless of key order', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const candidates: unknown[] = [
      {
        name: 'customer',
        target: { ...customer },
        multiplicity: 'one',
        optional: false,
      },
      {
        optional: false,
        multiplicity: 'one',
        target: { ...customer },
        name: 'customer',
      },
    ];
    for (const candidate of candidates) {
      const resource = createResourceWithRelationsForTests(identity.value, [
        candidate as object,
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error).toEqual({
          code: 'invalid_schema',
          cause: { code: 'missing_relation_nullable', index: 0 },
        });
      }
    }
  });

  it('requires relation nullable to be an own property', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const relation = Object.create({ nullable: true });
    relation.name = 'customer';
    relation.target = { ...customer };
    relation.multiplicity = 'one';
    relation.optional = false;

    const resource = createResourceWithRelationsForTests(identity.value, [
      relation,
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'missing_relation_nullable', index: 0 },
      });
    }
  });

  it('rejects non-boolean relation nullable values', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const nullable of ['true', 1, 0, null, 'false'] as const) {
      const resource = createResourceWithRelationsForTests(identity.value, [
        {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable,
        },
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error).toEqual({
          code: 'invalid_schema',
          cause: { code: 'invalid_relation_nullable', index: 0, nullable },
        });
      }
    }
  });

  it('rejects three-member Relations as missing_relation_optional regardless of key order', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const relation of [
      {
        name: 'customer',
        target: { ...customer },
        multiplicity: 'one',
      },
      {
        multiplicity: 'one',
        target: { ...customer },
        name: 'customer',
      },
    ]) {
      const resource = createResourceWithRelationsForTests(identity.value, [
        relation,
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error).toEqual({
          code: 'invalid_schema',
          cause: { code: 'missing_relation_optional', index: 0 },
        });
      }
    }
  });

  it('requires relation optional to be an own property', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const relation = Object.create({ optional: true });
    relation.name = 'customer';
    relation.target = { ...customer };
    relation.multiplicity = 'one';

    const resource = createResourceWithRelationsForTests(identity.value, [
      relation,
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'missing_relation_optional', index: 0 },
      });
    }
  });

  it('rejects non-boolean relation optional values', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const optional of ['true', 1, 0, null, 'false'] as const) {
      const resource = createResourceWithRelationsForTests(identity.value, [
        {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional,
          nullable: false,
        },
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error).toEqual({
          code: 'invalid_schema',
          cause: { code: 'invalid_relation_optional', index: 0, optional },
        });
      }
    }
  });

  it('rejects invalid multiplicity vocabulary as invalid_relation_multiplicity', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const multiplicity of ['toOne', 'One', '0..*', 'many '] as const) {
      const resource = createResourceWithRelationsForTests(identity.value, [
        {
          name: 'customer',
          target: { ...customer },
          multiplicity,
          optional: false,
          nullable: false,
        },
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error.code).toBe('invalid_schema');
        if (resource.error.code === 'invalid_schema') {
          expect(resource.error.cause?.code).toBe(
            'invalid_relation_multiplicity',
          );
        }
      }
    }
  });

  it('rejects string targets without parsing', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      {
        name: 'customer',
        target: 'crm/Customer',
        multiplicity: 'one',
        optional: false,
        nullable: false,
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

  it('rejects rf targets under user context as invalid_relation_target', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      {
        name: 'meta',
        target: { namespace: 'rf', name: 'Resource' },
        multiplicity: 'one',
        optional: false,
        nullable: false,
      },
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
      {
        name: 'customer',
        target: { namespace: 'CRM', name: 'Customer' },
        multiplicity: 'one',
        optional: false,
        nullable: false,
      },
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
        {
          name,
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: false,
        },
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

  it('rejects duplicate RelationName even when nullable differs', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      {
        name: 'customer',
        target: { ...customer },
        multiplicity: 'one',
        optional: false,
        nullable: false,
      },
      {
        name: 'customer',
        target: { ...customer },
        multiplicity: 'one',
        optional: false,
        nullable: true,
      },
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
      multiplicity: 'one' as const,
      optional: false,
      nullable: false,
      default: '',
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
  });

  it('relationsEqual is false when only nullable differs', () => {
    expect(
      relationsEqual(
        [
          {
            name: 'customer',
            target: customer,
            multiplicity: 'one',
            optional: false,
            nullable: false,
          },
        ],
        [
          {
            name: 'customer',
            target: customer,
            multiplicity: 'one',
            optional: false,
            nullable: true,
          },
        ],
      ),
    ).toBe(false);
  });

  it('treats Relations with different optional values as unequal', () => {
    expect(
      relationsEqual(
        [
          {
            name: 'customer',
            target: customer,
            multiplicity: 'one',
            optional: false,
            nullable: false,
          },
        ],
        [
          {
            name: 'customer',
            target: customer,
            multiplicity: 'one',
            optional: true,
            nullable: false,
          },
        ],
      ),
    ).toBe(false);
  });

  it('treats Relations equal only when name, target, multiplicity, optional, and nullable match', () => {
    expect(
      relationsEqual(
        [
          {
            name: 'a',
            target: { namespace: 'crm', name: 'A' },
            multiplicity: 'one',
            optional: false,
            nullable: false,
          },
        ],
        [
          {
            name: 'a',
            target: { namespace: 'crm', name: 'A' },
            multiplicity: 'many',
            optional: false,
            nullable: false,
          },
        ],
      ),
    ).toBe(false);
    expect(
      relationsEqual(
        [
          {
            name: 'a',
            target: { namespace: 'crm', name: 'A' },
            multiplicity: 'one',
            optional: false,
            nullable: false,
          },
        ],
        [
          {
            name: 'a',
            target: { namespace: 'crm', name: 'A' },
            multiplicity: 'one',
            optional: false,
            nullable: false,
          },
        ],
      ),
    ).toBe(true);
  });

  it('allows Field and Relation to share the same name string', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(
      identity.value,
      [
        {
          name: 'author',
          target: { ...user },
          multiplicity: 'one',
          optional: false,
          nullable: false,
        },
      ],
      emptyAnnotations,
      [{ name: 'author', type: 'string', optional: false, nullable: false }],
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
    const candidate = {
      name: 'author',
      target,
      multiplicity: 'one' as const,
      optional: false,
      nullable: false,
    };
    const list: object[] = [
      candidate,
      {
        name: 'lineItems',
        target: { ...lineItem },
        multiplicity: 'many',
        optional: true,
        nullable: true,
      },
    ];
    const resource = createResourceWithRelationsForTests(identity.value, list);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    candidate.name = 'mutated';
    candidate.nullable = true;
    target.name = 'Mutated';
    list.push({
      name: 'extra',
      target: { ...customer },
      multiplicity: 'one',
      optional: false,
      nullable: false,
    });

    expect(resource.value.schema.relations.map((r) => r.name)).toEqual([
      'author',
      'lineItems',
    ]);
    expect(resource.value.schema.relations[0]?.target).toEqual(user);
    expect(resource.value.schema.relations.map((r) => r.nullable)).toEqual([
      false,
      true,
    ]);
    expect(Object.isFrozen(resource.value.schema.relations)).toBe(true);
    expect(Object.isFrozen(resource.value.schema.relations[0])).toBe(true);
    expect(Object.isFrozen(resource.value.schema.relations[0]?.target)).toBe(
      true,
    );
  });

  it('rejects invalid candidates before snapshot materializes nullable', () => {
    const missing = checkRelations([
      {
        name: 'customer',
        target: { ...customer },
        multiplicity: 'one',
        optional: false,
      },
    ]);
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.error.code).toBe('missing_relation_nullable');
    }

    const invalid = checkRelations([
      {
        name: 'customer',
        target: { ...customer },
        multiplicity: 'one',
        optional: false,
        nullable: 'true',
      },
      {
        name: 'customer',
        target: { ...customer },
        multiplicity: 'one',
        optional: false,
        nullable: false,
        default: '',
      },
    ]);
    expect(invalid.ok).toBe(false);
  });

  it('accepts name-only non-empty operations without a relation cause', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: {
        fields: [],
        relations: [],
        operations: [{ name: 'create' }],
      constraints: [],
      },
      annotations: emptyAnnotations,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.schema.operations.map((o) => o.name)).toEqual([
      'create',
    ]);
  });

  it('rejects invalid operation members without a relation cause', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: {
        fields: [],
        relations: [],
        operations: [{ name: 'create', kind: 'command' } as never],
      constraints: [],
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
