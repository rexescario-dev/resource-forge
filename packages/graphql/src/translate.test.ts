import {
  createResourceIdentity,
  emptyAnnotations,
  projectResourceMetadata,
  validateResource,
  type Resource,
} from '@resource-forge/core';
import { validateSchema } from 'graphql';
import { describe, expect, it } from 'vitest';
import { identityKey } from './schema.js';
import { translateResources } from './translate.js';
import {
  commandOp,
  field,
  queryOp,
  relation,
  requireIdentity,
  requireResource,
} from './test-fixtures.js';

function customerOrderUnit(): Resource[] {
  const customerId = requireIdentity('crm', 'Customer');
  const orderId = requireIdentity('crm', 'Order');
  const customer = requireResource({
    identity: customerId,
    fields: [field('id'), field('email')],
    relations: [
      relation({
        name: 'orders',
        target: orderId,
        multiplicity: 'many',
        optional: true,
        nullable: false,
      }),
    ],
    operations: [
      queryOp('getById', [
        { name: 'id', type: 'string', optional: false, nullable: false },
      ]),
      commandOp(
        'create',
        [{ name: 'email', type: 'string', optional: false, nullable: false }],
        'string',
      ),
      commandOp('archive', [], 'void'),
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
  return [customer, order];
}

describe('translateResources (Task 5 / RFC-032 §4–§8)', () => {
  it('happy path: Customer+Order cycle + query+command+void → schema + bindings', () => {
    const result = translateResources(customerOrderUnit());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.schema.getQueryType()).toBeDefined();
    expect(result.value.schema.getMutationType()).toBeDefined();
    expect(validateSchema(result.value.schema)).toEqual([]);
    const { resolverBindings } = result.value;
    expect(resolverBindings.fields.get('crm/Customer')?.has('email')).toBe(true);
    expect(resolverBindings.relations.get('crm/Customer')?.has('orders')).toBe(
      true,
    );
    expect(resolverBindings.operations.has('crmCustomer_getById')).toBe(true);
    expect(resolverBindings.operations.has('crmCustomer_archive')).toBe(true);
    expect(
      resolverBindings.operations.get('crmCustomer_archive')?.resultMapping,
    ).toBe('void_to_rfvoid');
  });

  it('fails invalid Resource', () => {
    const bogus = {
      identity: { namespace: 'BAD', name: 'x' },
      schema: { fields: [], relations: [], operations: [], constraints: [] },
      annotations: emptyAnnotations,
    } as unknown as Resource;
    const result = translateResources([bogus]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid_resource');
  });

  it('fail-closed matrix samples', () => {
    expect(translateResources([]).ok).toBe(false);
    if (!translateResources([]).ok) {
      expect(translateResources([]).error.code).toBe('empty_translation_unit');
    }

    const noQuery = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('id')],
      operations: [commandOp('create', [], 'string')],
    });
    expect(translateResources([noQuery]).ok).toBe(false);

    const zeroField = requireResource({
      identity: requireIdentity('crm', 'Empty'),
      operations: [queryOp('ping')],
    });
    expect(translateResources([zeroField]).ok).toBe(false);

    const customerId = requireIdentity('crm', 'Customer');
    const orderId = requireIdentity('crm', 'Order');
    const colliding = requireResource({
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
      operations: [queryOp('getById')],
    });
    const order = requireResource({
      identity: orderId,
      fields: [field('id')],
      operations: [queryOp('getById')],
    });
    expect(translateResources([colliding, order]).ok).toBe(false);

    const missingTarget = requireResource({
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
      ],
      operations: [queryOp('getById')],
    });
    expect(translateResources([missingTarget]).ok).toBe(false);

    // Reserved GraphQL-owned type: capitalizeFirst('rf')+'Void' → 'RfVoid'
    // (framework kind allows the `rf` namespace)
    const reservedId = createResourceIdentity('rf', 'Void', { kind: 'framework' });
    expect(reservedId.ok).toBe(true);
    if (!reservedId.ok) return;
    const reserved = requireResource({
      identity: reservedId.value,
      fields: [field('id')],
      operations: [queryOp('get')],
    });
    const reservedResult = translateResources([reserved]);
    expect(reservedResult.ok).toBe(false);
    if (!reservedResult.ok) {
      expect(reservedResult.error.code).toBe('illegal_type_name');
    }
  });

  it('treats metadata/annotations as inert for structural success', () => {
    const plain = customerOrderUnit();
    const annotatedCustomer = validateResource({
      identity: plain[0]!.identity,
      schema: plain[0]!.schema,
      annotations: [
        {
          key: { namespace: 'docs', name: 'summary' },
          value: 'ignored for GraphQL structure',
        },
      ],
    });
    expect(annotatedCustomer.ok).toBe(true);
    if (!annotatedCustomer.ok) return;
    const annotatedUnit = [annotatedCustomer.value, plain[1]!];
    const withoutMeta = translateResources(plain);
    const withMeta = translateResources(annotatedUnit);
    expect(withoutMeta.ok).toBe(true);
    expect(withMeta.ok).toBe(true);
    if (!withoutMeta.ok || !withMeta.ok) return;
    expect(
      Object.keys(withMeta.value.schema.getQueryType()!.getFields()),
    ).toEqual(Object.keys(withoutMeta.value.schema.getQueryType()!.getFields()));
    // Calling projectResourceMetadata is not required and must not be needed for success.
    expect(projectResourceMetadata(annotatedCustomer.value).ok).toBe(true);
    expect(withMeta.value.resolverBindings.operations.size).toBe(
      withoutMeta.value.resolverBindings.operations.size,
    );
  });

  it('failures return neither successful schema nor bindings pair', () => {
    const result = translateResources([]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect('schema' in result).toBe(false);
    expect('value' in result).toBe(false);
  });

  it('every successful schema passes validateSchema with zero errors', () => {
    const result = translateResources(customerOrderUnit());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(validateSchema(result.value.schema)).toEqual([]);
    expect(result.value.resolverBindings.fields.size).toBeGreaterThan(0);
    expect(
      result.value.resolverBindings.fields.get(identityKey(customerOrderUnit()[0]!.identity)),
    ).toBeDefined();
  });
});
