import {
  invokeOperation,
  type OperationHandlerProvider,
} from '@resource-forge/core';
import { describe, expect, it } from 'vitest';
import {
  createFieldResolver,
  createOperationResolver,
  createRelationResolver,
} from './resolvers.js';
import { translateResources } from './translate.js';
import {
  commandOp,
  field,
  queryOp,
  relation,
  requireIdentity,
  requireResource,
} from './test-fixtures.js';

function happyUnit() {
  const customerId = requireIdentity('crm', 'Customer');
  const orderId = requireIdentity('crm', 'Order');
  return [
    requireResource({
      identity: customerId,
      fields: [
        field('id', 'string', false, false),
        field('nickname', 'string', true, true),
        field('code', 'string', true, false),
      ],
      relations: [
        relation({
          name: 'orders',
          target: orderId,
          multiplicity: 'many',
          optional: true,
          nullable: true,
        }),
      ],
      operations: [
        queryOp(
          'getById',
          [{ name: 'id', type: 'string', optional: false, nullable: false }],
          'string',
        ),
        commandOp('archive', [], 'void'),
      ],
    }),
    requireResource({
      identity: orderId,
      fields: [field('id')],
    }),
  ];
}

describe('resolver contracts (Task 6 / RFC-032 §6)', () => {
  it('exposes FieldBinding contents and optional×nullable absentBehavior', () => {
    const translated = translateResources(happyUnit());
    expect(translated.ok).toBe(true);
    if (!translated.ok) return;
    const fields = translated.value.resolverBindings.fields.get('crm/Customer')!;
    expect(fields.get('id')).toMatchObject({
      fieldName: 'id',
      graphqlTypeName: 'CrmCustomer',
      valueSource: 'parent_field',
      optional: false,
      nullable: false,
      absentBehavior: 'fail_if_absent',
    });
    expect(fields.get('nickname')?.absentBehavior).toBe('null_if_absent');
    expect(fields.get('code')?.absentBehavior).toBe('fail_if_absent_non_null');

    const idResolver = createFieldResolver(fields.get('id')!);
    expect(idResolver({ id: 'c1' })).toBe('c1');
    expect(() => idResolver({})).toThrow(/absent/);

    const nickResolver = createFieldResolver(fields.get('nickname')!);
    expect(nickResolver({})).toBeNull();

    const codeResolver = createFieldResolver(fields.get('code')!);
    expect(() => codeResolver({})).toThrow(/absent/);
  });

  it('exposes RelationBinding and host-supplied association / not-loaded', () => {
    const translated = translateResources(happyUnit());
    expect(translated.ok).toBe(true);
    if (!translated.ok) return;
    const rel = translated.value.resolverBindings.relations
      .get('crm/Customer')!
      .get('orders')!;
    expect(rel).toMatchObject({
      relationName: 'orders',
      targetGraphqlTypeName: 'CrmOrder',
      multiplicity: 'many',
      loadClassification: 'host_supplied_association',
      valueSource: 'parent_relation',
    });
    const resolver = createRelationResolver(rel);
    expect(resolver({ orders: [] })).toEqual([]);
    expect(resolver({})).toBeNull();
    expect(() =>
      resolver({ orders: { rfLoadState: 'not_loaded' } }),
    ).toThrow(/not loaded/);
  });

  it('OperationBinding calls core invokeOperation; missing handler fails at resolve time; void → { ok: true }', () => {
    const translated = translateResources(happyUnit());
    expect(translated.ok).toBe(true);
    if (!translated.ok) return;
    const getById = translated.value.resolverBindings.operations.get(
      'crmCustomer_getById',
    )!;
    const archive = translated.value.resolverBindings.operations.get(
      'crmCustomer_archive',
    )!;

    const provider: OperationHandlerProvider = (resource, name) => {
      if (name === 'getById') {
        return () => ({
          outcome: 'value',
          value: `got:${resource.identity.name}`,
        });
      }
      if (name === 'archive') {
        return () => ({ outcome: 'void' });
      }
      return undefined;
    };

    const viaBinding = getById.invoke(new Map([['id', 'x']]), provider);
    const viaCore = invokeOperation(
      getById.resource,
      'getById',
      new Map([['id', 'x']]),
      provider,
    );
    expect(viaBinding).toEqual(viaCore);
    expect(viaBinding.ok).toBe(true);

    const resolveGet = createOperationResolver(getById);
    expect(
      resolveGet(null, { id: 'x' }, { operationHandlerProvider: provider }, {} as never),
    ).toBe('got:Customer');

    const resolveArchive = createOperationResolver(archive);
    expect(
      resolveArchive(null, {}, { operationHandlerProvider: provider }, {} as never),
    ).toEqual({ ok: true });

    expect(() =>
      createOperationResolver(getById)(null, { id: 'x' }, {}, {} as never),
    ).toThrow(/OperationHandlerProvider/);

    const missing: OperationHandlerProvider = () => undefined;
    expect(() =>
      createOperationResolver(getById)(
        null,
        { id: 'x' },
        { operationHandlerProvider: missing },
        {} as never,
      ),
    ).toThrow(/missing_operation_handler|invoke failed/);
  });

  it('default field resolution MAY satisfy FieldBinding when parent already carries values', () => {
    const translated = translateResources(happyUnit());
    expect(translated.ok).toBe(true);
    if (!translated.ok) return;
    const binding = translated.value.resolverBindings.fields
      .get('crm/Customer')!
      .get('id')!;
    const parent = { id: 'c9', nickname: null };
    expect(parent[binding.fieldName as 'id']).toBe('c9');
    expect(createFieldResolver(binding)(parent)).toBe('c9');
  });

  it('successful translation resolverBindings are not empty stubs', () => {
    const translated = translateResources(happyUnit());
    expect(translated.ok).toBe(true);
    if (!translated.ok) return;
    const { resolverBindings } = translated.value;
    expect(resolverBindings.fields.size).toBeGreaterThan(0);
    expect(resolverBindings.relations.size).toBeGreaterThan(0);
    expect(resolverBindings.operations.size).toBeGreaterThan(0);
  });
});
