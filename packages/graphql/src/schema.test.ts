import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  isNullableType,
  printSchema,
} from 'graphql';
import { describe, expect, it } from 'vitest';
import { buildGraphqlSchema, buildResourceObjectTypes, identityKey } from './schema.js';
import {
  commandOp,
  field,
  queryOp,
  relation,
  requireIdentity,
  requireResource,
} from './test-fixtures.js';

describe('nullability + object types (Task 3 / RFC-032 §5.2–§5.5)', () => {
  it('maps Field scalars string/number/boolean → String/Float/Boolean with nullable SDL', () => {
    const customer = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [
        field('id', 'string', false, false),
        field('score', 'number', false, true),
        field('active', 'boolean', true, false),
      ],
    });
    const built = buildResourceObjectTypes([customer]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const type = built.value.typesByIdentityKey.get(identityKey(customer.identity))!;
    const fields = type.getFields();
    expect(String(fields.id!.type)).toBe('String!');
    expect(String(fields.score!.type)).toBe('Float');
    expect(String(fields.active!.type)).toBe('Boolean!');
  });

  it('maps Relation one and many `[Target!]!` / `[Target!]`', () => {
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
          optional: true,
          nullable: false,
        }),
        relation({
          name: 'maybeOrders',
          target: orderId,
          multiplicity: 'many',
          optional: true,
          nullable: true,
        }),
      ],
    });
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
    const built = buildResourceObjectTypes([customer, order]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const customerType = built.value.typesByIdentityKey.get(identityKey(customerId))!;
    const orderType = built.value.typesByIdentityKey.get(identityKey(orderId))!;
    expect(String(customerType.getFields().orders!.type)).toBe('[CrmOrder!]!');
    expect(String(customerType.getFields().maybeOrders!.type)).toBe('[CrmOrder!]');
    expect(String(orderType.getFields().customer!.type)).toBe('CrmCustomer!');
    const manyNullable = customerType.getFields().maybeOrders!.type;
    expect(isNullableType(manyNullable)).toBe(true);
    expect(manyNullable).toBeInstanceOf(GraphQLList);
  });

  it('allows A↔B cycles when both targets are in-unit', () => {
    const aId = requireIdentity('crm', 'NodeA');
    const bId = requireIdentity('crm', 'NodeB');
    const a = requireResource({
      identity: aId,
      fields: [field('id')],
      relations: [
        relation({
          name: 'b',
          target: bId,
          multiplicity: 'one',
          optional: false,
          nullable: false,
        }),
      ],
    });
    const b = requireResource({
      identity: bId,
      fields: [field('id')],
      relations: [
        relation({
          name: 'a',
          target: aId,
          multiplicity: 'one',
          optional: false,
          nullable: false,
        }),
      ],
    });
    const built = buildResourceObjectTypes([a, b]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const aType = built.value.typesByIdentityKey.get(identityKey(aId))!;
    expect(aType.getFields().b!.type).toBeInstanceOf(GraphQLNonNull);
  });

  it('fails when Relation target is missing from the unit', () => {
    const customer = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('id')],
      relations: [
        relation({
          name: 'orders',
          target: requireIdentity('crm', 'Order'),
          multiplicity: 'many',
          optional: true,
          nullable: false,
        }),
      ],
    });
    const built = buildResourceObjectTypes([customer]);
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.error.code).toBe('missing_relation_target');
  });

  it('fails on Field∩Relation same name', () => {
    const customerId = requireIdentity('crm', 'Customer');
    const orderId = requireIdentity('crm', 'Order');
    const customer = requireResource({
      identity: customerId,
      fields: [field('orders')],
      relations: [
        relation({
          name: 'orders',
          target: orderId,
          multiplicity: 'many',
          optional: true,
          nullable: false,
        }),
      ],
    });
    const order = requireResource({
      identity: orderId,
      fields: [field('id')],
    });
    const built = buildResourceObjectTypes([customer, order]);
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.error.code).toBe('field_relation_name_collision');
  });

  it('fails on zero-field Resource (empty fields+relations)', () => {
    const empty = requireResource({
      identity: requireIdentity('crm', 'Empty'),
      operations: [queryOp('ping')],
    });
    const built = buildResourceObjectTypes([empty]);
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.error.code).toBe('zero_field_resource');
  });
});

describe('operations / RfVoid / Query-root (Task 4 / RFC-032 §5.6–§5.7)', () => {
  it('maps query Operation to Query field with identity-preserving args and Base! result', () => {
    const customer = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('id')],
      operations: [
        queryOp('getById', [
          { name: 'id', type: 'string', optional: false, nullable: false },
        ]),
      ],
    });
    const built = buildGraphqlSchema([customer]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const query = built.value.schema.getQueryType()!;
    const root = query.getFields().crmCustomer_getById!;
    expect(root).toBeDefined();
    expect(String(root.type)).toBe('String!');
    expect(String(root.args[0]!.type)).toBe('String!');
    expect(root.args[0]!.name).toBe('id');
  });

  it('maps void command to Mutation RfVoid! and includes RfVoid type', () => {
    const customer = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('id')],
      operations: [
        queryOp('getById', [
          { name: 'id', type: 'string', optional: false, nullable: false },
        ]),
        commandOp('delete', [], 'void'),
      ],
    });
    const built = buildGraphqlSchema([customer]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.value.rfVoidUsed).toBe(true);
    const mutation = built.value.schema.getMutationType();
    expect(mutation).toBeInstanceOf(GraphQLObjectType);
    expect(String(mutation!.getFields().crmCustomer_delete!.type)).toBe('RfVoid!');
    const sdl = printSchema(built.value.schema);
    expect(sdl).toContain('type RfVoid');
    expect(sdl).toContain('ok: Boolean!');
  });

  it('omits Mutation type when there are no commands', () => {
    const customer = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('id')],
      operations: [queryOp('getById')],
    });
    const built = buildGraphqlSchema([customer]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.value.schema.getMutationType()).toBeUndefined();
  });

  it('fails Query-root closure when unit has zero query Operations', () => {
    const customer = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('id')],
      operations: [commandOp('create', [], 'string')],
    });
    const built = buildGraphqlSchema([customer]);
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.error.code).toBe('no_query_operations');
  });

  it('fails empty translation unit at schema build via no resources → no query', () => {
    const built = buildGraphqlSchema([]);
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.error.code).toBe('no_query_operations');
  });

  it('under-approximates optional×nullable args in SDL (non Base! when not required non-null)', () => {
    const customer = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('id')],
      operations: [
        queryOp('search', [
          { name: 'q', type: 'string', optional: true, nullable: false },
          { name: 'limit', type: 'number', optional: false, nullable: true },
        ]),
      ],
    });
    const built = buildGraphqlSchema([customer]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const args = built.value.schema.getQueryType()!.getFields().crmCustomer_search!.args;
    const byName = Object.fromEntries(args.map((a) => [a.name, String(a.type)]));
    expect(byName.q).toBe('String');
    expect(byName.limit).toBe('Float');
  });
});
