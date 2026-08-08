import { describe, expect, it } from 'vitest';
import { createEmptyResourceSchema } from './schema.js';

describe('createEmptyResourceSchema', () => {
  it('returns empty fields, relations, operations, and constraints', () => {
    const schema = createEmptyResourceSchema();
    expect(schema.fields).toEqual([]);
    expect(schema.relations).toEqual([]);
    expect(schema.operations).toEqual([]);
    expect(schema.constraints).toEqual([]);
    expect(schema.fields).toHaveLength(0);
    expect(schema.relations).toHaveLength(0);
    expect(schema.operations).toHaveLength(0);
    expect(schema.constraints).toHaveLength(0);
  });
});
