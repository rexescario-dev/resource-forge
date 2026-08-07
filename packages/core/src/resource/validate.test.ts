import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { emptyAnnotations } from './empty-annotations.js';
import { createEmptyResourceSchema } from './schema.js';
import { validateResource } from './validate.js';

describe('validateResource', () => {
  it('accepts a minimal resource', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: createEmptyResourceSchema(),
      annotations: emptyAnnotations,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.identity).toEqual({ namespace: 'crm', name: 'Customer' });
    expect(result.value.schema.fields).toEqual([]);
    expect(result.value.annotations).toEqual(emptyAnnotations);
    expect('metadata' in result.value).toBe(false);
  });

  it('rejects invalid identity', () => {
    const result = validateResource({
      identity: { namespace: 'CRM', name: 'Customer' },
      schema: createEmptyResourceSchema(),
      annotations: emptyAnnotations,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_identity');
      if (result.error.code === 'invalid_identity') {
        expect(result.error.cause.code).toBe('invalid_namespace');
      }
    }
  });

  it('rejects non-empty fields', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    if (!identity.ok) return;
    const result = validateResource({
      identity: identity.value,
      schema: {
        fields: [{ name: 'x' }] as unknown as [],
        relations: [],
        operations: [],
      },
      annotations: emptyAnnotations,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_schema');
    }
  });

  it('rejects missing schema collection property', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    if (!identity.ok) return;
    const result = validateResource({
      identity: identity.value,
      schema: {
        fields: [],
        relations: [],
      } as never,
      annotations: emptyAnnotations,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_schema');
    }
  });

  it('rejects non-empty annotations placeholder', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    if (!identity.ok) return;
    const result = validateResource({
      identity: identity.value,
      schema: createEmptyResourceSchema(),
      annotations: { readonlyTag: 'EmptyAnnotations', extra: true } as never,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_annotations');
    }
  });
});
