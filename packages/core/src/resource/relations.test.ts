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
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
        fetch: 'eager',
      },
      {
        name: 'sponsor',
        target: { ...customer },
        multiplicity: 'one',
        optional: false,
        nullable: true,
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
        fetch: 'eager',
      },
      {
        name: 'tags',
        target: { ...tag },
        multiplicity: 'many',
        optional: true,
        nullable: false,
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
        fetch: 'eager',
      },
      {
        name: 'aliases',
        target: { ...alias },
        multiplicity: 'many',
        optional: true,
        nullable: true,
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
        fetch: 'eager',
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
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
        },
        {
          name: 'sponsor',
          target: customer,
          multiplicity: 'one',
          optional: false,
          nullable: true,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
        },
        {
          name: 'tags',
          target: tag,
          multiplicity: 'many',
          optional: true,
          nullable: false,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
        },
        {
          name: 'aliases',
          target: alias,
          multiplicity: 'many',
          optional: true,
          nullable: true,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
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
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
        },
        {
          name: 'tags',
          target: tag,
          multiplicity: 'many',
          optional: true,
          nullable: false,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
        },
        {
          name: 'sponsor',
          target: customer,
          multiplicity: 'one',
          optional: false,
          nullable: true,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
        },
        {
          name: 'customer',
          target: customer,
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
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
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
        fetch: 'eager',
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
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
        fetch: 'eager',
      },
      {
        name: 'editor',
        target: { ...user },
        multiplicity: 'one',
        optional: true,
        nullable: true,
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
        fetch: 'eager',
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
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
        fetch: 'eager',
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
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
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
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
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
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
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
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
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
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
        fetch: 'eager',
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
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
        fetch: 'eager',
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
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
        fetch: 'eager',
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
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
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
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
        fetch: 'eager',
      },
      {
        name: 'customer',
        target: { ...customer },
        multiplicity: 'one',
        optional: false,
        nullable: true,
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
        fetch: 'eager',
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
      direction: 'outbound',
      onDelete: 'none',
      onUpdate: 'none',
      fetch: 'eager',
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
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
          },
        ],
        [
          {
            name: 'customer',
            target: customer,
            multiplicity: 'one',
            optional: false,
            nullable: true,
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
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
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
          },
        ],
        [
          {
            name: 'customer',
            target: customer,
            multiplicity: 'one',
            optional: true,
            nullable: false,
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
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
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
          },
        ],
        [
          {
            name: 'a',
            target: { namespace: 'crm', name: 'A' },
            multiplicity: 'many',
            optional: false,
            nullable: false,
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
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
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
          },
        ],
        [
          {
            name: 'a',
            target: { namespace: 'crm', name: 'A' },
            multiplicity: 'one',
            optional: false,
            nullable: false,
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
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
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
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
      direction: 'outbound',
      onDelete: 'none',
      onUpdate: 'none',
      fetch: 'eager',
    };
    const list: object[] = [
      candidate,
      {
        name: 'lineItems',
        target: { ...lineItem },
        multiplicity: 'many',
        optional: true,
        nullable: true,
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
        fetch: 'eager',
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
      direction: 'outbound',
      onDelete: 'none',
      onUpdate: 'none',
      fetch: 'eager',
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
    const missing = checkRelations(
      [
        {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
        },
      ],
      [],
    );
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.error.code).toBe('missing_relation_nullable');
    }

    const invalid = checkRelations(
      [
        {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: 'true',
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
        },
        {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
          default: '',
        },
      ],
      [],
    );
    expect(invalid.ok).toBe(false);
  });

  it('accepts RFC-021 operations without a relation cause', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: {
        fields: [],
        relations: [],
        operations: [
          { name: 'create', kind: 'command', params: [], result: 'void' },
        ],
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

describe('RFC-024 relation direction / inverse / join', () => {
  const baseFields = [
    { name: 'customerId', type: 'string' as const, optional: false, nullable: false },
  ];

  it('accepts six-member Relations and optional inverse/join combinations', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(
      identity.value,
      [
        {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
        },
        {
          name: 'sponsor',
          target: { ...customer },
          multiplicity: 'one',
          optional: true,
          nullable: true,
          direction: 'inbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
          inverse: 'orders',
        },
        {
          name: 'owner',
          target: { ...user },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
          join: { local: 'customerId', remote: 'id' },
        },
        {
          name: 'billing',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
          inverse: 'billedOrders',
          join: { local: 'customerId', remote: 'id' },
        },
      ],
      emptyAnnotations,
      baseFields,
    );
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;
    expect(resource.value.schema.relations.map((r) => r.direction)).toEqual([
      'outbound',
      'inbound',
      'outbound',
      'outbound',
    ]);
    expect(resource.value.schema.relations[0]).not.toHaveProperty('inverse');
    expect(resource.value.schema.relations[0]).not.toHaveProperty('join');
    expect(resource.value.schema.relations[1]?.inverse).toBe('orders');
    expect(resource.value.schema.relations[2]?.join).toEqual({
      local: 'customerId',
      remote: 'id',
    });
    expect(Object.isFrozen(resource.value.schema.relations[2]?.join)).toBe(true);
  });

  it('rejects legacy five-member Relations as missing_relation_direction', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const candidate of [
      {
        name: 'customer',
        target: { ...customer },
        multiplicity: 'one',
        optional: false,
        nullable: false,
      },
      {
        nullable: false,
        optional: false,
        multiplicity: 'one',
        target: { ...customer },
        name: 'customer',
      },
    ]) {
      const resource = createResourceWithRelationsForTests(identity.value, [
        candidate,
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error).toEqual({
          code: 'invalid_schema',
          cause: { code: 'missing_relation_direction', index: 0 },
        });
      }
    }
  });

  it('rejects five-member + inverse without direction as invalid_relation_member', () => {
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
        inverse: 'orders',
      },
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'invalid_relation_member', index: 0 },
      });
    }
  });

  it('rejects invalid direction values', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const direction of ['both', 'Outbound', 1, null] as const) {
      const resource = createResourceWithRelationsForTests(identity.value, [
        {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction,
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
        },
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error).toEqual({
          code: 'invalid_schema',
          cause: { code: 'invalid_relation_direction', index: 0, direction },
        });
      }
    }
  });

  it('rejects invalid inverse grammar', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const inverse of ['Orders', '', 123] as const) {
      const resource = createResourceWithRelationsForTests(identity.value, [
        {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
          inverse,
        },
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error).toEqual({
          code: 'invalid_schema',
          cause: {
            code: 'invalid_relation_inverse',
            index: 0,
            inverse: String(inverse),
          },
        });
      }
    }
  });

  it('rejects malformed join shapes', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const join of [
      null,
      { local: 'customerId' },
      { local: 'customerId', remote: 'id', extra: true },
      'customerId',
    ] as const) {
      const resource = createResourceWithRelationsForTests(
        identity.value,
        [
          {
            name: 'customer',
            target: { ...customer },
            multiplicity: 'one',
            optional: false,
            nullable: false,
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
            join,
          },
        ],
        emptyAnnotations,
        baseFields,
      );
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error).toEqual({
          code: 'invalid_schema',
          cause: { code: 'invalid_relation_join', index: 0 },
        });
      }
    }
  });

  it('applies join FieldName grammar before local existence (local then remote)', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const nonStringLocal = createResourceWithRelationsForTests(
      identity.value,
      [
        {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
          join: { local: 123, remote: 'id' },
        },
      ],
      emptyAnnotations,
      baseFields,
    );
    expect(nonStringLocal.ok).toBe(false);
    if (!nonStringLocal.ok) {
      expect(nonStringLocal.error).toEqual({
        code: 'invalid_schema',
        cause: {
          code: 'invalid_join_local_field_name',
          index: 0,
          name: '123',
        },
      });
    }

    const badLocalGrammar = createResourceWithRelationsForTests(
      identity.value,
      [
        {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
          join: { local: 'Missing', remote: 'id' },
        },
      ],
      emptyAnnotations,
      baseFields,
    );
    expect(badLocalGrammar.ok).toBe(false);
    if (!badLocalGrammar.ok) {
      expect(badLocalGrammar.error).toEqual({
        code: 'invalid_schema',
        cause: {
          code: 'invalid_join_local_field_name',
          index: 0,
          name: 'Missing',
        },
      });
    }

    const badRemoteGrammar = createResourceWithRelationsForTests(
      identity.value,
      [
        {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
          join: { local: 'customerId', remote: 'Id' },
        },
      ],
      emptyAnnotations,
      baseFields,
    );
    expect(badRemoteGrammar.ok).toBe(false);
    if (!badRemoteGrammar.ok) {
      expect(badRemoteGrammar.error).toEqual({
        code: 'invalid_schema',
        cause: {
          code: 'invalid_join_remote_field_name',
          index: 0,
          name: 'Id',
        },
      });
    }
  });

  it('rejects unknown join.local after shape and grammar succeed', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(
      identity.value,
      [
        {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
          join: { local: 'missing', remote: 'id' },
        },
      ],
      emptyAnnotations,
      baseFields,
    );
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error).toEqual({
        code: 'invalid_schema',
        cause: {
          code: 'unknown_join_local_field',
          index: 0,
          name: 'missing',
        },
      });
    }
  });

  it('relationsEqual is false when only direction, inverse, or join differs', () => {
    const base = {
      name: 'customer',
      target: customer,
      multiplicity: 'one' as const,
      optional: false,
      nullable: false,
      direction: 'outbound' as const,
      onDelete: 'none',
      onUpdate: 'none',
      fetch: 'eager',
    };
    expect(
      relationsEqual([{ ...base }], [{ ...base, direction: 'inbound' }]),
    ).toBe(false);
    expect(
      relationsEqual([{ ...base }], [{ ...base, inverse: 'orders' }]),
    ).toBe(false);
    expect(
      relationsEqual(
        [{ ...base, inverse: 'orders' }],
        [{ ...base, inverse: 'purchases' }],
      ),
    ).toBe(false);
    expect(
      relationsEqual(
        [{ ...base }],
        [{ ...base, join: { local: 'customerId', remote: 'id' } }],
      ),
    ).toBe(false);
    expect(
      relationsEqual(
        [{ ...base, join: { local: 'customerId', remote: 'id' } }],
        [{ ...base, join: { local: 'customerId', remote: 'pk' } }],
      ),
    ).toBe(false);
    expect(
      relationsEqual(
        [{ ...base, join: { local: 'customerId', remote: 'id' } }],
        [{ ...base, join: { local: 'customerId', remote: 'id' } }],
      ),
    ).toBe(true);
  });

  it('allows self-target with direction and optional inverse/join Resource-locally', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(
      identity.value,
      [
        {
          name: 'parent',
          target: { namespace: 'crm', name: 'Order' },
          multiplicity: 'one',
          optional: true,
          nullable: true,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
          inverse: 'children',
          join: { local: 'customerId', remote: 'customerId' },
        },
      ],
      emptyAnnotations,
      baseFields,
    );
    expect(resource.ok).toBe(true);
  });

  it('keeps Resource validation independent of target schema for inverse/join', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: {
        fields: baseFields,
        relations: [
          {
            name: 'customer',
            target: { ...customer },
            multiplicity: 'one',
            optional: false,
            nullable: false,
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
            inverse: 'orders',
            join: { local: 'customerId', remote: 'missingOnTarget' },
          },
        ],
        operations: [],
        constraints: [],
      },
      annotations: emptyAnnotations,
    });
    expect(result.ok).toBe(true);
  });
});

describe('RFC-026 relation cascade declaration', () => {
  const baseFields = [
    { name: 'customerId', type: 'string' as const, optional: false, nullable: false },
  ];

  it('rejects legacy RFC-024 six-member Relations as missing_relation_on_delete', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const candidate of [
      {
        name: 'customer',
        target: { ...customer },
        multiplicity: 'one',
        optional: false,
        nullable: false,
        direction: 'outbound',
      },
      {
        direction: 'outbound',
        nullable: false,
        optional: false,
        multiplicity: 'one',
        target: { ...customer },
        name: 'customer',
      },
    ]) {
      const resource = createResourceWithRelationsForTests(identity.value, [
        candidate,
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error).toEqual({
          code: 'invalid_schema',
          cause: { code: 'missing_relation_on_delete', index: 0 },
        });
      }
    }
  });

  it('rejects base + onDelete without onUpdate as missing_relation_on_update', () => {
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
        direction: 'outbound',
        onDelete: 'none',
      },
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'missing_relation_on_update', index: 0 },
      });
    }
  });

  it('rejects base + inverse without cascade members as invalid_relation_member', () => {
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
        direction: 'outbound',
        inverse: 'orders',
      },
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'invalid_relation_member', index: 0 },
      });
    }
  });

  it('rejects invalid cascade policy vocabulary', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const onDelete of ['CASCADE', 'set-null', ''] as const) {
      const resource = createResourceWithRelationsForTests(identity.value, [
        {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          onDelete,
          onUpdate: 'none',
          fetch: 'eager',
        },
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error).toEqual({
          code: 'invalid_schema',
          cause: { code: 'invalid_relation_on_delete', index: 0, onDelete },
        });
      }
    }

    for (const onUpdate of ['restrict ', 0] as const) {
      const resource = createResourceWithRelationsForTests(identity.value, [
        {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate,
          fetch: 'eager',
        },
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error).toEqual({
          code: 'invalid_schema',
          cause: { code: 'invalid_relation_on_update', index: 0, onUpdate },
        });
      }
    }
  });

  it('rejects setNull when nullable is false', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const policy of [
      { onDelete: 'setNull' as const, onUpdate: 'none' as const },
      { onDelete: 'none' as const, onUpdate: 'setNull' as const },
    ]) {
      const resource = createResourceWithRelationsForTests(identity.value, [
        {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          ...policy,
          fetch: 'eager',
        },
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error).toEqual({
          code: 'invalid_schema',
          cause: { code: 'invalid_cascade_set_null_requires_nullable', index: 0 },
        });
      }
    }
  });

  it('accepts setNull when nullable is true including many', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      {
        name: 'tags',
        target: { ...tag },
        multiplicity: 'many',
        optional: true,
        nullable: true,
        direction: 'outbound',
        onDelete: 'setNull',
        onUpdate: 'setNull',
        fetch: 'eager',
      },
    ]);
    expect(resource.ok).toBe(true);
  });

  it('accepts optional false + nullable true + setNull (optional is not a setNull gate)', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      {
        name: 'sponsor',
        target: { ...customer },
        multiplicity: 'one',
        optional: false,
        nullable: true,
        direction: 'outbound',
        onDelete: 'setNull',
        onUpdate: 'setNull',
        fetch: 'eager',
      },
    ]);
    expect(resource.ok).toBe(true);
  });

  it('relationsEqual is false when only cascade policies differ', () => {
    const base = {
      name: 'customer',
      target: customer,
      multiplicity: 'one' as const,
      optional: false,
      nullable: false,
      direction: 'outbound' as const,
      onDelete: 'none' as const,
      onUpdate: 'none' as const,
      fetch: 'eager',
    };
    expect(
      relationsEqual([{ ...base }], [{ ...base, onDelete: 'cascade' }]),
    ).toBe(false);
    expect(
      relationsEqual([{ ...base }], [{ ...base, onUpdate: 'restrict' }]),
    ).toBe(false);
  });

  it('snapshots freeze onDelete and onUpdate', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(
      identity.value,
      [
        {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          onDelete: 'cascade',
          onUpdate: 'restrict',
          fetch: 'eager',
          inverse: 'orders',
          join: { local: 'customerId', remote: 'id' },
        },
      ],
      emptyAnnotations,
      baseFields,
    );
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const relation = resource.value.schema.relations[0];
    expect(relation?.onDelete).toBe('cascade');
    expect(relation?.onUpdate).toBe('restrict');
    expect(Object.isFrozen(relation)).toBe(true);
  });
});

describe('RFC-027 relation fetch declaration', () => {
  const baseFields = [
    { name: 'customerId', type: 'string' as const, optional: false, nullable: false },
  ];

  it('rejects legacy RFC-026 eight-member Relations as missing_relation_fetch', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const candidate of [
      {
        name: 'customer',
        target: { ...customer },
        multiplicity: 'one',
        optional: false,
        nullable: false,
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
      },
      {
        onUpdate: 'none',
        onDelete: 'none',
        direction: 'outbound',
        nullable: false,
        optional: false,
        multiplicity: 'one',
        target: { ...customer },
        name: 'customer',
      },
    ]) {
      const resource = createResourceWithRelationsForTests(identity.value, [
        candidate,
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error).toEqual({
          code: 'invalid_schema',
          cause: { code: 'missing_relation_fetch', index: 0 },
        });
      }
    }
  });

  it('still rejects RFC-024 six-member as missing_relation_on_delete before fetch', () => {
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
        direction: 'outbound',
      },
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'missing_relation_on_delete', index: 0 },
      });
    }
  });

  it('still rejects seven-member as missing_relation_on_update before fetch', () => {
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
        direction: 'outbound',
        onDelete: 'none',
      },
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'missing_relation_on_update', index: 0 },
      });
    }
  });

  it('rejects eight-base + inverse without fetch as invalid_relation_member', () => {
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
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
        inverse: 'orders',
      },
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok) {
      expect(resource.error).toEqual({
        code: 'invalid_schema',
        cause: { code: 'invalid_relation_member', index: 0 },
      });
    }
  });

  it('rejects invalid fetch vocabulary as invalid_relation_fetch', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const fetch of ['EAGER', 'deferred', '', 0] as const) {
      const resource = createResourceWithRelationsForTests(identity.value, [
        {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch,
        },
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok) {
        expect(resource.error).toEqual({
          code: 'invalid_schema',
          cause: { code: 'invalid_relation_fetch', index: 0, fetch },
        });
      }
    }
  });

  it('accepts eager and lazy on nine-member base', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const fetch of ['eager', 'lazy'] as const) {
      const resource = createResourceWithRelationsForTests(identity.value, [
        {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch,
        },
      ]);
      expect(resource.ok).toBe(true);
      if (resource.ok) {
        expect(resource.value.schema.relations[0]?.fetch).toBe(fetch);
      }
    }
  });

  it('relationsEqual is false when only fetch differs', () => {
    const base = {
      name: 'customer',
      target: customer,
      multiplicity: 'one' as const,
      optional: false,
      nullable: false,
      direction: 'outbound' as const,
      onDelete: 'none' as const,
      onUpdate: 'none' as const,
      fetch: 'eager' as const,
    };
    expect(relationsEqual([{ ...base }], [{ ...base, fetch: 'lazy' }])).toBe(
      false,
    );
  });

  it('snapshots freeze fetch', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(
      identity.value,
      [
        {
          name: 'customer',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'lazy',
          inverse: 'orders',
          join: { local: 'customerId', remote: 'id' },
        },
      ],
      emptyAnnotations,
      baseFields,
    );
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const relation = resource.value.schema.relations[0];
    expect(relation?.fetch).toBe('lazy');
    expect(Object.isFrozen(relation)).toBe(true);
  });
});
