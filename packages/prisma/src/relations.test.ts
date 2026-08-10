import { describe, expect, it } from 'vitest';
import { resolveCorrespondenceMapping } from './mapping.js';
import { normalizeDmmf } from './model-graph.js';
import {
  verifyRelationTargets,
  verifyRelations,
} from './relations.js';
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

function unit() {
  const customerId = requireIdentity('crm', 'Customer');
  const orderId = requireIdentity('crm', 'Order');
  const customer = requireResource({
    identity: customerId,
    fields: [field('id')],
    relations: [
      relation({
        name: 'orders',
        target: orderId,
        multiplicity: 'many',
        optional: false,
        nullable: false,
        direction: 'outbound',
        inverse: 'customer',
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
        direction: 'inbound',
        inverse: 'orders',
        join: { local: 'customerId', remote: 'id' },
      }),
    ],
  });
  return { customer, order, customerId, orderId };
}

describe('verifyRelationTargets', () => {
  it('fails when target Resource is missing from the unit', () => {
    const { order } = unit();
    const result = verifyRelationTargets([order]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('missing_relation_target');
  });

  it('allows cycles when both Resources are in-unit', () => {
    const { customer, order } = unit();
    expect(verifyRelationTargets([customer, order]).ok).toBe(true);
  });
});

describe('verifyRelations', () => {
  it('verifies outbound and inbound with the same Prisma topology evidence', () => {
    const { customer, order } = unit();
    const doc = dmmf([
      dmmfModel('Customer', [
        dmmfScalar('id', 'String', true),
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
        dmmfRelation('customer', 'Customer', {
          isList: false,
          isRequired: true,
          relationFromFields: ['customerId'],
          relationToFields: ['id'],
        }),
      ]),
    ]);
    const resolved = resolveCorrespondenceMapping([customer, order]);
    const graph = normalizeDmmf(doc);
    expect(resolved.ok && graph.ok).toBe(true);
    if (!resolved.ok || !graph.ok) return;
    const result = verifyRelations([customer, order], graph.value, resolved.value);
    expect(result.ok).toBe(true);
  });

  it('fails multiplicity one against list', () => {
    const customerId = requireIdentity('crm', 'Customer');
    const orderId = requireIdentity('crm', 'Order');
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
    const customer = requireResource({
      identity: customerId,
      fields: [field('id')],
    });
    const doc = dmmf([
      dmmfModel('Customer', [dmmfScalar('id', 'String', true)]),
      dmmfModel('Order', [
        dmmfScalar('id', 'String', true),
        dmmfRelation('customer', 'Customer', {
          isList: true,
          isRequired: true,
          relationFromFields: [],
          relationToFields: [],
        }),
      ]),
    ]);
    const resolved = resolveCorrespondenceMapping([customer, order]);
    const graph = normalizeDmmf(doc);
    if (!resolved.ok || !graph.ok) throw new Error('setup');
    const result = verifyRelations([customer, order], graph.value, resolved.value);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('multiplicity_mismatch');
  });

  it('fails join when from/to are swapped', () => {
    const { customer, order } = unit();
    const doc = dmmf([
      dmmfModel('Customer', [
        dmmfScalar('id', 'String', true),
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
        dmmfRelation('customer', 'Customer', {
          isList: false,
          isRequired: true,
          relationFromFields: ['id'],
          relationToFields: ['customerId'],
        }),
      ]),
    ]);
    const resolved = resolveCorrespondenceMapping([customer, order]);
    const graph = normalizeDmmf(doc);
    if (!resolved.ok || !graph.ok) throw new Error('setup');
    const result = verifyRelations([customer, order], graph.value, resolved.value);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('join_unrealized');
  });

  it('fails join when from/to empty', () => {
    const { customer, order } = unit();
    const doc = dmmf([
      dmmfModel('Customer', [
        dmmfScalar('id', 'String', true),
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
        dmmfRelation('customer', 'Customer', {
          isList: false,
          isRequired: true,
          relationFromFields: [],
          relationToFields: [],
        }),
      ]),
    ]);
    const resolved = resolveCorrespondenceMapping([customer, order]);
    const graph = normalizeDmmf(doc);
    if (!resolved.ok || !graph.ok) throw new Error('setup');
    const result = verifyRelations([customer, order], graph.value, resolved.value);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('join_unrealized');
  });

  it('allows many without join when from/to empty (implicit m-n)', () => {
    const aId = requireIdentity('crm', 'A');
    const bId = requireIdentity('crm', 'B');
    const a = requireResource({
      identity: aId,
      fields: [field('id')],
      relations: [
        relation({
          name: 'bs',
          target: bId,
          multiplicity: 'many',
          optional: false,
          nullable: false,
        }),
      ],
    });
    const b = requireResource({
      identity: bId,
      fields: [field('id')],
    });
    const doc = dmmf([
      dmmfModel('A', [
        dmmfScalar('id', 'String', true),
        dmmfRelation('bs', 'B', {
          isList: true,
          isRequired: true,
          relationFromFields: [],
          relationToFields: [],
        }),
      ]),
      dmmfModel('B', [dmmfScalar('id', 'String', true)]),
    ]);
    const resolved = resolveCorrespondenceMapping([a, b]);
    const graph = normalizeDmmf(doc);
    if (!resolved.ok || !graph.ok) throw new Error('setup');
    expect(verifyRelations([a, b], graph.value, resolved.value).ok).toBe(true);
  });
});
