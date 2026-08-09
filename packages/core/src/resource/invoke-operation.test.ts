import { describe, expect, it, vi } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { createResourceWithOperationsForTests } from './create-resource-with-operations.js';
import { invokeOperation } from './invoke-operation.js';
import type {
  OperationHandlerProvider,
  OperationRuntimeValue,
  Resource,
  SemanticResultReport,
} from './types.js';

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

function args(
  entries: ReadonlyArray<readonly [string, OperationRuntimeValue]> = [],
): Map<string, OperationRuntimeValue> {
  return new Map(entries);
}

function resourceWith(
  operations: object[],
): Resource {
  const identity = createResourceIdentity('crm', 'Order');
  expect(identity.ok).toBe(true);
  if (!identity.ok) {
    throw new Error('identity');
  }
  const resource = createResourceWithOperationsForTests(
    identity.value,
    operations,
  );
  expect(resource.ok).toBe(true);
  if (!resource.ok) {
    throw new Error('resource');
  }
  return resource.value;
}

describe('RFC-021 invokeOperation', () => {
  it('looks up by Resource + OperationName and returns void report', () => {
    const resource = resourceWith([commandOp('cancel')]);
    const handler = vi.fn((): SemanticResultReport => ({ outcome: 'void' }));
    const provider: OperationHandlerProvider = (r, name) => {
      expect(r).toBe(resource);
      expect(name).toBe('cancel');
      return handler;
    };

    const result = invokeOperation(resource, 'cancel', args(), provider);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ outcome: 'void' });
    }
    expect(handler).toHaveBeenCalledOnce();
  });

  it('returns unknown_operation and does not call provider/handler', () => {
    const resource = resourceWith([commandOp('cancel')]);
    const provider = vi.fn(() => {
      throw new Error('should not run');
    });
    const result = invokeOperation(resource, 'missing', args(), provider);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('unknown_operation');
    }
    expect(provider).not.toHaveBeenCalled();
  });

  it('covers optional/nullable × Map presence matrix', () => {
    const param = (optional: boolean, nullable: boolean) => ({
      name: 'p',
      type: 'string' as const,
      optional,
      nullable,
    });

    const cases: Array<{
      optional: boolean;
      nullable: boolean;
      map: Map<string, OperationRuntimeValue>;
      code?: string;
    }> = [
      {
        optional: false,
        nullable: false,
        map: args(),
        code: 'missing_required_argument',
      },
      {
        optional: false,
        nullable: true,
        map: args(),
        code: 'missing_required_argument',
      },
      { optional: true, nullable: false, map: args() },
      { optional: true, nullable: true, map: args() },
      {
        optional: false,
        nullable: false,
        map: args([['p', null]]),
        code: 'null_argument',
      },
      {
        optional: true,
        nullable: false,
        map: args([['p', null]]),
        code: 'null_argument',
      },
      {
        optional: false,
        nullable: true,
        map: args([['p', null]]),
      },
      {
        optional: true,
        nullable: true,
        map: args([['p', null]]),
      },
      {
        optional: false,
        nullable: false,
        map: args([['p', 1]]),
        code: 'argument_type_mismatch',
      },
      {
        optional: false,
        nullable: false,
        map: args([['p', 'ok']]),
      },
    ];

    for (const testCase of cases) {
      const resource = resourceWith([
        commandOp('op', [param(testCase.optional, testCase.nullable)]),
      ]);
      const handler = vi.fn((): SemanticResultReport => ({ outcome: 'void' }));
      const result = invokeOperation(
        resource,
        'op',
        testCase.map,
        () => handler,
      );
      if (testCase.code) {
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.code).toBe(testCase.code);
        }
        expect(handler).not.toHaveBeenCalled();
      } else {
        expect(result.ok).toBe(true);
        expect(handler).toHaveBeenCalledOnce();
      }
    }

    const unknown = invokeOperation(
      resourceWith([commandOp('op', [param(true, true)])]),
      'op',
      args([['extra', 'x']]),
      () => () => ({ outcome: 'void' }),
    );
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) {
      expect(unknown.error.code).toBe('unknown_argument');
    }
  });

  it('rejects numeric-looking string without coercion', () => {
    const resource = resourceWith([
      commandOp('op', [
        {
          name: 'n',
          type: 'number',
          optional: false,
          nullable: false,
        },
      ]),
    ]);
    const handler = vi.fn((): SemanticResultReport => ({ outcome: 'void' }));
    const result = invokeOperation(
      resource,
      'op',
      args([['n', '42']]),
      () => handler,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('argument_type_mismatch');
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it('reports missing_operation_handler when provider returns undefined', () => {
    const resource = resourceWith([commandOp('cancel')]);
    const result = invokeOperation(resource, 'cancel', args(), () => undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('missing_operation_handler');
    }
  });

  it('propagates provider throws unchanged', () => {
    const resource = resourceWith([commandOp('cancel')]);
    expect(() =>
      invokeOperation(resource, 'cancel', args(), () => {
        throw new Error('provider boom');
      }),
    ).toThrow('provider boom');
  });

  it('propagates handler throws unchanged', () => {
    const resource = resourceWith([commandOp('cancel')]);
    expect(() =>
      invokeOperation(resource, 'cancel', args(), () => () => {
        throw new Error('handler boom');
      }),
    ).toThrow('handler boom');
  });

  it('validates scalar and void semantic result reports', () => {
    const voidResource = resourceWith([commandOp('cancel')]);
    const voidOk = invokeOperation(voidResource, 'cancel', args(), () => () => ({
      outcome: 'void',
    }));
    expect(voidOk.ok).toBe(true);

    const voidMismatch = invokeOperation(
      voidResource,
      'cancel',
      args(),
      () => () => ({ outcome: 'value', value: 'ok' }),
    );
    expect(voidMismatch.ok).toBe(false);
    if (!voidMismatch.ok) {
      expect(voidMismatch.error.code).toBe('result_contract_mismatch');
    }

    const queryResource = resourceWith([queryOp('totalDue')]);
    const scalarOk = invokeOperation(
      queryResource,
      'totalDue',
      args(),
      () => () => ({ outcome: 'value', value: 12 }),
    );
    expect(scalarOk.ok).toBe(true);

    const scalarVoid = invokeOperation(
      queryResource,
      'totalDue',
      args(),
      () => () => ({ outcome: 'void' }),
    );
    expect(scalarVoid.ok).toBe(false);
    if (!scalarVoid.ok) {
      expect(scalarVoid.error.code).toBe('result_contract_mismatch');
    }

    const scalarWrongType = invokeOperation(
      queryResource,
      'totalDue',
      args(),
      () => () => ({ outcome: 'value', value: '12' }),
    );
    expect(scalarWrongType.ok).toBe(false);
    if (!scalarWrongType.ok) {
      expect(scalarWrongType.error.code).toBe('result_contract_mismatch');
    }
  });

  it('treats malformed runtime reports as result_contract_mismatch', () => {
    const resource = resourceWith([commandOp('cancel')]);
    const malformed: unknown[] = [
      undefined,
      null,
      { outcome: 'garbage' },
      { outcome: 'value', value: null },
      { outcome: 'void', extra: true },
      { outcome: 'value' },
      'void',
      1,
    ];

    for (const value of malformed) {
      const result = invokeOperation(
        resource,
        'cancel',
        args(),
        () => () => value as never,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('result_contract_mismatch');
      }
    }
  });

  it('does not call handler when arguments are invalid', () => {
    const resource = resourceWith([
      commandOp('op', [
        {
          name: 'p',
          type: 'string',
          optional: false,
          nullable: false,
        },
      ]),
    ]);
    const handler = vi.fn((): SemanticResultReport => ({ outcome: 'void' }));
    const provider = vi.fn(() => handler);
    const result = invokeOperation(resource, 'op', args(), provider);
    expect(result.ok).toBe(false);
    expect(provider).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('is pure with respect to Resource and args map', () => {
    const resource = resourceWith([commandOp('cancel')]);
    const map = args();
    const before = JSON.stringify(resource.schema.operations);
    invokeOperation(resource, 'cancel', map, () => () => ({ outcome: 'void' }));
    expect(JSON.stringify(resource.schema.operations)).toBe(before);
    expect(map.size).toBe(0);
  });
});
