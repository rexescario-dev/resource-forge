import { describe, expect, it } from 'vitest';
import { validateResourceDocument } from './validate-document.js';

const validMinimal = JSON.stringify({
  identity: { namespace: 'crm', name: 'Customer' },
  schema: {
    fields: [],
    relations: [],
    operations: [],
    constraints: [],
  },
  annotations: [],
});

const invalidIdentity = JSON.stringify({
  identity: { namespace: 'CRM', name: 'Customer' },
  schema: {
    fields: [],
    relations: [],
    operations: [],
    constraints: [],
  },
  annotations: [],
});

describe('validateResourceDocument', () => {
  it('accepts a valid Resource JSON object', () => {
    const result = validateResourceDocument(validMinimal);
    expect(result).toEqual({ ok: true });
  });

  it('maps semantic validation failure', () => {
    const result = validateResourceDocument(invalidIdentity);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe('semantic');
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('maps malformed JSON to input_decode', () => {
    const result = validateResourceDocument('{ not json');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe('input_decode');
  });

  it('maps non-object JSON to input_decode', () => {
    for (const text of ['[]', 'null', '"x"', '42']) {
      const result = validateResourceDocument(text);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.kind).toBe('input_decode');
    }
  });
});
