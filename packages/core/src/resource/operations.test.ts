import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { createResourceWithOperationsForTests } from './create-resource-with-operations.js';
import { emptyAnnotations } from './empty-annotations.js';
import { operationsEqual } from './operations.js';
import { createEmptyResourceSchema } from './schema.js';
import { validateResource } from './validate.js';

const customer = { namespace: 'crm', name: 'Customer' } as const;

function commandOp(
  name: string,
  params: object[] = [],
  result: 'string' | 'number' | 'boolean' | 'void' = 'void',
) {
  return { name, kind: 'command' as const, params, result };
}

function queryOp(
  name: string,
  params: object[] = [],
  result: 'string' | 'number' | 'boolean' = 'number',
) {
  return { name, kind: 'query' as const, params, result };
}

describe('RFC-021 resource operations', () => {
  it('accepts ordered command/query operations and preserves order', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithOperationsForTests(identity.value, [
      commandOp('create'),
      queryOp('totalDue'),
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    expect(resource.value.schema.operations.map((o) => o.name)).toEqual([
      'create',
      'totalDue',
    ]);
    expect(resource.value.schema.operations[0]?.kind).toBe('command');
    expect(resource.value.schema.operations[1]?.kind).toBe('query');
    expect(
      operationsEqual(resource.value.schema.operations, [
        commandOp('create'),
        queryOp('totalDue'),
      ]),
    ).toBe(true);
    expect(
      operationsEqual(resource.value.schema.operations, [
        queryOp('totalDue'),
        commandOp('create'),
      ]),
    ).toBe(false);
  });

  it('keeps empty operations valid', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: createEmptyResourceSchema(),
      annotations: emptyAnnotations,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.schema.operations).toEqual([]);
  });

  it('accepts empty params for command and query', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithOperationsForTests(identity.value, [
      commandOp('cancel', []),
      queryOp('count', []),
    ]);
    expect(resource.ok).toBe(true);
  });

  it('accepts command with void and rejects query with void', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const okCommand = createResourceWithOperationsForTests(identity.value, [
      commandOp('cancel', [], 'void'),
    ]);
    expect(okCommand.ok).toBe(true);

    const badQuery = createResourceWithOperationsForTests(identity.value, [
      { name: 'ping', kind: 'query', params: [], result: 'void' },
    ]);
    expect(badQuery.ok).toBe(false);
    if (!badQuery.ok && badQuery.error.code === 'invalid_schema') {
      expect(badQuery.error.cause?.code).toBe(
        'invalid_operation_result_for_kind',
      );
    }
  });

  it('rejects RFC-012 name-only operations (no dual-shape)', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithOperationsForTests(identity.value, [
      { name: 'foo' },
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok && resource.error.code === 'invalid_schema') {
      expect(resource.error.cause?.code).toBe('invalid_operation_member');
    }
  });

  it('rejects incomplete kind-only members', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithOperationsForTests(identity.value, [
      { name: 'create', kind: 'command' },
    ]);
    expect(resource.ok).toBe(false);
    if (!resource.ok && resource.error.code === 'invalid_schema') {
      expect(resource.error.cause?.code).toBe('invalid_operation_member');
    }
  });

  it('validates params: types, booleans, uniqueness, and order equality', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const param = {
      name: 'reason',
      type: 'string',
      optional: true,
      nullable: false,
    };
    const ok = createResourceWithOperationsForTests(identity.value, [
      commandOp('cancel', [param]),
    ]);
    expect(ok.ok).toBe(true);

    const voidParamType = createResourceWithOperationsForTests(identity.value, [
      {
        name: 'cancel',
        kind: 'command',
        params: [
          {
            name: 'x',
            type: 'void',
            optional: false,
            nullable: false,
          },
        ],
        result: 'void',
      },
    ]);
    expect(voidParamType.ok).toBe(false);

    const omitOptional = createResourceWithOperationsForTests(identity.value, [
      {
        name: 'cancel',
        kind: 'command',
        params: [{ name: 'x', type: 'string', nullable: false }],
        result: 'void',
      },
    ]);
    expect(omitOptional.ok).toBe(false);

    const dupParam = createResourceWithOperationsForTests(identity.value, [
      {
        name: 'cancel',
        kind: 'command',
        params: [
          {
            name: 'reason',
            type: 'string',
            optional: true,
            nullable: false,
          },
          {
            name: 'reason',
            type: 'string',
            optional: false,
            nullable: false,
          },
        ],
        result: 'void',
      },
    ]);
    expect(dupParam.ok).toBe(false);
    if (!dupParam.ok && dupParam.error.code === 'invalid_schema') {
      expect(dupParam.error.cause?.code).toBe('duplicate_operation_param_name');
    }

    const a = [
      {
        name: 'p',
        type: 'string' as const,
        optional: false,
        nullable: false,
      },
      {
        name: 'q',
        type: 'number' as const,
        optional: true,
        nullable: true,
      },
    ];
    const b = [
      {
        name: 'q',
        type: 'number' as const,
        optional: true,
        nullable: true,
      },
      {
        name: 'p',
        type: 'string' as const,
        optional: false,
        nullable: false,
      },
    ];
    expect(
      operationsEqual(
        [commandOp('op', a)],
        [commandOp('op', b)],
      ),
    ).toBe(false);
  });

  it('rejects invalid OperationName and duplicates', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    for (const name of ['Create', 'create-order', '']) {
      const resource = createResourceWithOperationsForTests(identity.value, [
        commandOp(name),
      ]);
      expect(resource.ok).toBe(false);
      if (!resource.ok && resource.error.code === 'invalid_schema') {
        expect(resource.error.cause?.code).toBe('invalid_operation_name');
      }
    }

    const dup = createResourceWithOperationsForTests(identity.value, [
      commandOp('create'),
      commandOp('create'),
    ]);
    expect(dup.ok).toBe(false);
    if (!dup.ok && dup.error.code === 'invalid_schema') {
      expect(dup.error.cause?.code).toBe('duplicate_operation_name');
    }
  });

  it('allows Field, Relation, and Operation to share the same name string', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithOperationsForTests(
      identity.value,
      [commandOp('create')],
      emptyAnnotations,
      [{ name: 'create', type: 'string', optional: false, nullable: false }],
      [
        {
          name: 'create',
          target: { ...customer },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
        },
      ],
    );
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;
    expect(resource.value.schema.fields[0]?.name).toBe('create');
    expect(resource.value.schema.relations[0]?.name).toBe('create');
    expect(resource.value.schema.operations[0]?.name).toBe('create');
  });

  it('freezes operations and params snapshot against caller mutation', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const param = {
      name: 'reason',
      type: 'string',
      optional: true,
      nullable: false,
    };
    const candidate = commandOp('create', [param]);
    const list: object[] = [candidate];
    const resource = createResourceWithOperationsForTests(identity.value, list);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    (candidate as { name: string }).name = 'mutated';
    list.push(commandOp('cancel'));
    param.name = 'mutatedParam';

    expect(resource.value.schema.operations.map((o) => o.name)).toEqual([
      'create',
    ]);
    expect(resource.value.schema.operations[0]?.params[0]?.name).toBe('reason');
    expect(Object.isFrozen(resource.value.schema.operations)).toBe(true);
    expect(Object.isFrozen(resource.value.schema.operations[0])).toBe(true);
    expect(Object.isFrozen(resource.value.schema.operations[0]?.params)).toBe(
      true,
    );
    expect(
      Object.isFrozen(resource.value.schema.operations[0]?.params[0]),
    ).toBe(true);
  });
});
