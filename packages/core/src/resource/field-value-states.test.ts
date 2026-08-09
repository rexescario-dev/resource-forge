import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { createResourceWithFieldsForTests } from './create-resource-with-fields.js';
import { checkFieldValueStates } from './field-value-states.js';
import type { FieldRuntimeValue, Resource } from './types.js';

function requireResource(
  result: { ok: true; value: Resource } | { ok: false; error: unknown },
): Resource {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('expected declaration-valid Resource');
  }
  return result.value;
}

function mapOf(
  entries: ReadonlyArray<readonly [string, FieldRuntimeValue]>,
): Map<string, FieldRuntimeValue> {
  return new Map(entries);
}

function resourceWithFields(fields: readonly object[]): Resource {
  const identity = createResourceIdentity('crm', 'Order');
  expect(identity.ok).toBe(true);
  if (!identity.ok) {
    throw new Error('identity');
  }
  return requireResource(
    createResourceWithFieldsForTests(identity.value, fields),
  );
}

describe('RFC-025 checkFieldValueStates', () => {
  it('returns ok for empty fields with empty map', () => {
    const resource = resourceWithFields([]);
    expect(checkFieldValueStates(resource, new Map())).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it('forbids absent when optional is false', () => {
    const resource = resourceWithFields([
      { name: 'total', type: 'number', optional: false, nullable: false },
    ]);
    expect(checkFieldValueStates(resource, new Map())).toEqual({
      ok: false,
      error: { code: 'forbidden_absent_field', field: 'total' },
    });
  });

  it('allows absent when optional is true', () => {
    const resource = resourceWithFields([
      { name: 'note', type: 'string', optional: true, nullable: false },
    ]);
    expect(checkFieldValueStates(resource, new Map())).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it('forbids present null when nullable is false', () => {
    const resource = resourceWithFields([
      { name: 'note', type: 'string', optional: true, nullable: false },
    ]);
    expect(checkFieldValueStates(resource, mapOf([['note', null]]))).toEqual({
      ok: false,
      error: { code: 'forbidden_null_field', field: 'note' },
    });
  });

  it('allows present null when nullable is true', () => {
    const resource = resourceWithFields([
      { name: 'note', type: 'string', optional: true, nullable: true },
    ]);
    expect(checkFieldValueStates(resource, mapOf([['note', null]]))).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it('allows present non-null for all optional×nullable combinations', () => {
    const combos = [
      { optional: false, nullable: false },
      { optional: false, nullable: true },
      { optional: true, nullable: false },
      { optional: true, nullable: true },
    ] as const;
    for (const { optional, nullable } of combos) {
      const resource = resourceWithFields([
        { name: 'code', type: 'string', optional, nullable },
      ]);
      expect(
        checkFieldValueStates(resource, mapOf([['code', 'x']])),
      ).toEqual({ ok: true, value: undefined });
    }
  });

  it('ignores unknown map keys', () => {
    const resource = resourceWithFields([
      { name: 'total', type: 'number', optional: false, nullable: false },
    ]);
    expect(
      checkFieldValueStates(
        resource,
        mapOf([
          ['total', 1],
          ['extra', 'ignored'],
        ]),
      ),
    ).toEqual({ ok: true, value: undefined });
  });

  it('fail-fasts on first declared field failure', () => {
    const resource = resourceWithFields([
      { name: 'a', type: 'string', optional: false, nullable: false },
      { name: 'b', type: 'string', optional: false, nullable: false },
    ]);
    expect(checkFieldValueStates(resource, new Map())).toEqual({
      ok: false,
      error: { code: 'forbidden_absent_field', field: 'a' },
    });
  });
});
