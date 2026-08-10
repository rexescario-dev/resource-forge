import { emptyAnnotations, type Resource } from '@resource-forge/core';
import { describe, expect, it } from 'vitest';
import { verifyPrismaCorrespondence } from './verify.js';
import {
  dmmf,
  dmmfModel,
  dmmfRelation,
  dmmfScalar,
  field,
  relation,
  requireIdentity,
  requireResource,
} from './test-fixtures.js';

function customerOrderUnit() {
  const customerId = requireIdentity('crm', 'Customer');
  const orderId = requireIdentity('crm', 'Order');
  const customer = requireResource({
    identity: customerId,
    fields: [field('id'), field('name')],
    relations: [
      relation({
        name: 'orders',
        target: orderId,
        multiplicity: 'many',
        optional: false,
        nullable: false,
      }),
    ],
  });
  const order = requireResource({
    identity: orderId,
    fields: [field('id'), field('customerId')],
    relations: [
      relation({
        name: 'customer',
        target: customerId,
        multiplicity: 'one',
        optional: false,
        nullable: false,
        join: { local: 'customerId', remote: 'id' },
      }),
    ],
  });
  const doc = dmmf([
    dmmfModel('Customer', [
      dmmfScalar('id', 'String', true),
      dmmfScalar('name', 'String', true),
      dmmfScalar('createdAt', 'DateTime', true),
      dmmfRelation('orders', 'Order', {
        isList: true,
        isRequired: true,
        relationFromFields: [],
        relationToFields: [],
      }),
    ]),
    dmmfModel('Order', [
      dmmfScalar('id', 'String', true),
      dmmfScalar('customerId', 'String', true),
      dmmfScalar('updatedAt', 'DateTime', true),
      dmmfRelation('customer', 'Customer', {
        isList: false,
        isRequired: true,
        relationFromFields: ['customerId'],
        relationToFields: ['id'],
      }),
    ]),
    dmmfModel('AuditLog', [dmmfScalar('id', 'String', true)]),
  ]);
  return { customer, order, doc };
}

describe('verifyPrismaCorrespondence', () => {
  it('fails on empty unit', () => {
    const result = verifyPrismaCorrespondence([], dmmf([]));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('empty_verification_unit');
  });

  it('fails invalid Resource before DMMF normalize', () => {
    const invalid = {
      identity: requireIdentity('crm', 'Broken'),
      schema: {
        fields: [{ name: '!!!', type: 'string', optional: false, nullable: false }],
        relations: [],
        operations: [],
        constraints: [],
      },
      annotations: emptyAnnotations,
    } as unknown as Resource;
    const result = verifyPrismaCorrespondence([invalid], { not: 'dmmf' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid_resource');
  });

  it('succeeds with Prisma extras ignored and full report', () => {
    const { customer, order, doc } = customerOrderUnit();
    const result = verifyPrismaCorrespondence([customer, order], doc);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.resources).toHaveLength(2);
    expect(result.value.fields.map((f) => f.fieldName).sort()).toEqual([
      'customerId',
      'id',
      'id',
      'name',
    ]);
    expect(result.value.relations.map((r) => r.relationName).sort()).toEqual([
      'customer',
      'orders',
    ]);
  });

  it('fails namespace collision under defaults', () => {
    const a = requireResource({ identity: requireIdentity('foo', 'Customer') });
    const b = requireResource({ identity: requireIdentity('bar', 'Customer') });
    const result = verifyPrismaCorrespondence(
      [a, b],
      dmmf([dmmfModel('Customer', [dmmfScalar('id', 'String', true)])]),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('mapping_collision');
  });

  it('fails Field+Relation same default name collision', () => {
    const id = requireIdentity('crm', 'Customer');
    const resource = requireResource({
      identity: id,
      fields: [field('orders')],
      relations: [
        relation({
          name: 'orders',
          target: id,
          multiplicity: 'many',
          optional: false,
          nullable: false,
        }),
      ],
    });
    const result = verifyPrismaCorrespondence(
      [resource],
      dmmf([
        dmmfModel('Customer', [
          dmmfScalar('orders', 'String', true),
          dmmfRelation('ordersRel', 'Customer', {
            isList: true,
            isRequired: true,
            relationFromFields: [],
            relationToFields: [],
          }),
        ]),
      ]),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('mapping_collision');
  });

  it('fails number → DateTime', () => {
    const resource = requireResource({
      identity: requireIdentity('crm', 'Item'),
      fields: [field('amount', 'number')],
    });
    const result = verifyPrismaCorrespondence(
      [resource],
      dmmf([dmmfModel('Item', [dmmfScalar('amount', 'DateTime', true)])]),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('incompatible_scalar_type');
  });

  it('fails optional=true nullable=false against String?', () => {
    const resource = requireResource({
      identity: requireIdentity('crm', 'Item'),
      fields: [field('nickname', 'string', true, false)],
    });
    const result = verifyPrismaCorrespondence(
      [resource],
      dmmf([dmmfModel('Item', [dmmfScalar('nickname', 'String', false)])]),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('incompatible_nullability');
  });

  it('fails missing target even if Prisma model exists', () => {
    const orderId = requireIdentity('crm', 'Order');
    const customerId = requireIdentity('crm', 'Customer');
    const order = requireResource({
      identity: orderId,
      fields: [field('id')],
      relations: [
        relation({
          name: 'customer',
          target: customerId,
          multiplicity: 'one',
          optional: false,
          nullable: false,
        }),
      ],
    });
    const result = verifyPrismaCorrespondence(
      [order],
      dmmf([
        dmmfModel('Order', [
          dmmfScalar('id', 'String', true),
          dmmfRelation('customer', 'Customer', {
            isList: false,
            isRequired: true,
            relationFromFields: ['customerId'],
            relationToFields: ['id'],
          }),
        ]),
        dmmfModel('Customer', [dmmfScalar('id', 'String', true)]),
      ]),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('missing_relation_target');
  });

  it('rejects ConsumedModelGraph-shaped public input as unusable_dmmf', () => {
    const resource = requireResource({
      identity: requireIdentity('crm', 'Item'),
      fields: [field('id')],
    });
    const fakeGraph = {
      models: new Map([
        [
          'Item',
          {
            name: 'Item',
            fields: new Map([
              [
                'id',
                {
                  kind: 'scalar',
                  name: 'id',
                  type: 'String',
                  nullCapable: false,
                },
              ],
            ]),
          },
        ],
      ]),
    };
    const result = verifyPrismaCorrespondence([resource], fakeGraph);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unusable_dmmf');
  });
});
