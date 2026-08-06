import { describe, expect, it } from 'vitest';
import { err, ok } from './result.js';

describe('Result', () => {
  it('constructs ok values', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
  });

  it('constructs err values', () => {
    expect(err('x')).toEqual({ ok: false, error: 'x' });
  });
});
