import { describe, expect, it } from 'vitest';
import { validateJsonValue } from './json-value.js';

describe('validateJsonValue', () => {
  it('accepts null, boolean, number, and string', () => {
    expect(validateJsonValue(null)).toEqual({ ok: true, value: null });
    expect(validateJsonValue(true)).toEqual({ ok: true, value: true });
    expect(validateJsonValue(42)).toEqual({ ok: true, value: 42 });
    expect(validateJsonValue('x')).toEqual({ ok: true, value: 'x' });
  });

  it('accepts nested arrays and plain objects', () => {
    const value = { a: [1, { b: false }], c: null };
    expect(validateJsonValue(value)).toEqual({ ok: true, value });
  });

  it('rejects undefined', () => {
    const result = validateJsonValue(undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_json_value');
      expect(result.error.path).toBe('');
    }
  });

  it('rejects functions and bigint', () => {
    expect(validateJsonValue(() => 1).ok).toBe(false);
    expect(validateJsonValue(1n).ok).toBe(false);
  });

  it('reports nested paths for invalid values', () => {
    const result = validateJsonValue({ a: [1, undefined] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.path).toBe('a[1]');
    }
  });

  it('rejects class instances', () => {
    class Box {
      constructor(readonly x: number) {}
    }
    expect(validateJsonValue(new Box(1)).ok).toBe(false);
  });
});
