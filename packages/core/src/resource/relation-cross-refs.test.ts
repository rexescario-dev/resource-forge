import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import type { ResourceIdentity } from '../identity/types.js';
import { createResourceWithRelationsForTests } from './create-resource-with-relations.js';
import { emptyAnnotations } from './empty-annotations.js';
import { checkRelationCrossRefs } from './relation-cross-refs.js';
import type { Field, Relation } from './types.js';
import { validateResource } from './validate.js';

const orderId: ResourceIdentity = { namespace: 'crm', name: 'Order' };
const customerId: ResourceIdentity = { namespace: 'crm', name: 'Customer' };

const idField: Field = {
  name: 'id',
  type: 'string',
  optional: false,
  nullable: false,
};
const customerIdField: Field = {
  name: 'customerId',
  type: 'string',
  optional: false,
  nullable: false,
};

function relation(partial: Relation): Relation {
  return partial;
}

describe('RFC-024 checkRelationCrossRefs', () => {
  it('accepts asymmetric inverse with opposite direction and owner target', () => {
    const ownerRelations = [
      relation({
        name: 'customer',
        target: customerId,
        multiplicity: 'one',
        optional: false,
        nullable: false,
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
        fetch: 'eager',
        inverse: 'orders',
      }),
    ];
    const targetRelations = [
      relation({
        name: 'orders',
        target: orderId,
        multiplicity: 'many',
        optional: true,
        nullable: false,
        direction: 'inbound',
        onDelete: 'none',
        onUpdate: 'none',
        fetch: 'eager',
      }),
    ];

    const result = checkRelationCrossRefs(
      { identity: orderId, relations: ownerRelations },
      [
        {
          identity: customerId,
          fields: [idField],
          relations: targetRelations,
        },
      ],
    );
    expect(result).toEqual({ ok: true, value: undefined });
  });

  it('rejects unknown inverse relation name', () => {
    const result = checkRelationCrossRefs(
      {
        identity: orderId,
        relations: [
          relation({
            name: 'customer',
            target: customerId,
            multiplicity: 'one',
            optional: false,
            nullable: false,
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
            inverse: 'missing',
          }),
        ],
      },
      [
        {
          identity: customerId,
          fields: [idField],
          relations: [
            relation({
              name: 'orders',
              target: orderId,
              multiplicity: 'many',
              optional: true,
              nullable: false,
              direction: 'inbound',
              onDelete: 'none',
              onUpdate: 'none',
              fetch: 'eager',
            }),
          ],
        },
      ],
    );
    expect(result).toEqual({
      ok: false,
      error: {
        code: 'unknown_inverse_relation',
        relation: 'customer',
        inverse: 'missing',
      },
    });
  });

  it('rejects counterpart target mismatch', () => {
    const other: ResourceIdentity = { namespace: 'crm', name: 'Invoice' };
    const result = checkRelationCrossRefs(
      {
        identity: orderId,
        relations: [
          relation({
            name: 'customer',
            target: customerId,
            multiplicity: 'one',
            optional: false,
            nullable: false,
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
            inverse: 'orders',
          }),
        ],
      },
      [
        {
          identity: customerId,
          fields: [idField],
          relations: [
            relation({
              name: 'orders',
              target: other,
              multiplicity: 'many',
              optional: true,
              nullable: false,
              direction: 'inbound',
              onDelete: 'none',
              onUpdate: 'none',
              fetch: 'eager',
            }),
          ],
        },
      ],
    );
    expect(result).toEqual({
      ok: false,
      error: {
        code: 'inverse_target_mismatch',
        relation: 'customer',
        inverse: 'orders',
      },
    });
  });

  it('rejects same-direction counterpart', () => {
    const result = checkRelationCrossRefs(
      {
        identity: orderId,
        relations: [
          relation({
            name: 'customer',
            target: customerId,
            multiplicity: 'one',
            optional: false,
            nullable: false,
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
            inverse: 'orders',
          }),
        ],
      },
      [
        {
          identity: customerId,
          fields: [idField],
          relations: [
            relation({
              name: 'orders',
              target: orderId,
              multiplicity: 'many',
              optional: true,
              nullable: false,
              direction: 'outbound',
              onDelete: 'none',
              onUpdate: 'none',
              fetch: 'eager',
            }),
          ],
        },
      ],
    );
    expect(result).toEqual({
      ok: false,
      error: {
        code: 'inverse_direction_mismatch',
        relation: 'customer',
        inverse: 'orders',
      },
    });
  });

  it('rejects unknown join.remote on supplied target', () => {
    const result = checkRelationCrossRefs(
      {
        identity: orderId,
        relations: [
          relation({
            name: 'customer',
            target: customerId,
            multiplicity: 'one',
            optional: false,
            nullable: false,
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
            join: { local: 'customerId', remote: 'missing' },
          }),
        ],
      },
      [
        {
          identity: customerId,
          fields: [idField],
          relations: [],
        },
      ],
    );
    expect(result).toEqual({
      ok: false,
      error: {
        code: 'unknown_join_remote_field',
        relation: 'customer',
        name: 'missing',
      },
    });
  });

  it('skips Relations whose target schema is not supplied', () => {
    const result = checkRelationCrossRefs(
      {
        identity: orderId,
        relations: [
          relation({
            name: 'customer',
            target: customerId,
            multiplicity: 'one',
            optional: false,
            nullable: false,
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
            inverse: 'orders',
            join: { local: 'customerId', remote: 'missing' },
          }),
        ],
      },
      [],
    );
    expect(result).toEqual({ ok: true, value: undefined });
    expect(JSON.stringify(result)).not.toContain('missing_target_schema');
  });

  it('resolves supplied targets and skips unsupplied ones in a partial set', () => {
    const tagId: ResourceIdentity = { namespace: 'crm', name: 'Tag' };
    const result = checkRelationCrossRefs(
      {
        identity: orderId,
        relations: [
          relation({
            name: 'customer',
            target: customerId,
            multiplicity: 'one',
            optional: false,
            nullable: false,
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
            inverse: 'orders',
            join: { local: 'customerId', remote: 'id' },
          }),
          relation({
            name: 'tags',
            target: tagId,
            multiplicity: 'many',
            optional: true,
            nullable: false,
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
            inverse: 'orders',
            join: { local: 'customerId', remote: 'missing' },
          }),
        ],
      },
      [
        {
          identity: customerId,
          fields: [idField],
          relations: [
            relation({
              name: 'orders',
              target: orderId,
              multiplicity: 'many',
              optional: true,
              nullable: false,
              direction: 'inbound',
              onDelete: 'none',
              onUpdate: 'none',
              fetch: 'eager',
            }),
          ],
        },
      ],
    );
    expect(result).toEqual({ ok: true, value: undefined });
  });

  it('accepts self-target cross-ref without reciprocal inverse', () => {
    const result = checkRelationCrossRefs(
      {
        identity: orderId,
        relations: [
          relation({
            name: 'parent',
            target: orderId,
            multiplicity: 'one',
            optional: true,
            nullable: true,
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
            inverse: 'children',
            join: { local: 'customerId', remote: 'id' },
          }),
          relation({
            name: 'children',
            target: orderId,
            multiplicity: 'many',
            optional: true,
            nullable: false,
            direction: 'inbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
          }),
        ],
      },
      [
        {
          identity: orderId,
          fields: [idField, customerIdField],
          relations: [
            relation({
              name: 'parent',
              target: orderId,
              multiplicity: 'one',
              optional: true,
              nullable: true,
              direction: 'outbound',
              onDelete: 'none',
              onUpdate: 'none',
              fetch: 'eager',
              inverse: 'children',
              join: { local: 'customerId', remote: 'id' },
            }),
            relation({
              name: 'children',
              target: orderId,
              multiplicity: 'many',
              optional: true,
              nullable: false,
              direction: 'inbound',
              onDelete: 'none',
              onUpdate: 'none',
              fetch: 'eager',
            }),
          ],
        },
      ],
    );
    expect(result).toEqual({ ok: true, value: undefined });
  });

  it('does not require validateResource to load target schemas', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(
      identity.value,
      [
        {
          name: 'customer',
          target: { ...customerId },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
          fetch: 'eager',
          inverse: 'orders',
          join: { local: 'customerId', remote: 'absentRemote' },
        },
      ],
      emptyAnnotations,
      [customerIdField],
    );
    expect(resource.ok).toBe(true);

    const validated = validateResource({
      identity: identity.value,
      schema: {
        fields: [customerIdField],
        relations: [
          {
            name: 'customer',
            target: customerId,
            multiplicity: 'one',
            optional: false,
            nullable: false,
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
            fetch: 'eager',
            inverse: 'orders',
            join: { local: 'customerId', remote: 'absentRemote' },
          },
        ],
        operations: [],
        constraints: [],
      },
      annotations: emptyAnnotations,
    });
    expect(validated.ok).toBe(true);
  });
});
