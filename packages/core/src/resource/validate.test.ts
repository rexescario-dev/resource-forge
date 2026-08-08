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

  it('accepts valid non-empty fields', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    if (!identity.ok) return;
    const result = validateResource({
      identity: identity.value,
      schema: {
        fields: [
          { name: 'id', type: 'string', optional: false, nullable: false },
          { name: 'email', type: 'string', optional: true, nullable: false },
        ],
        relations: [],
        operations: [],
      constraints: [],
      },
      annotations: emptyAnnotations,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.schema.fields.map((f) => f.name)).toEqual([
      'id',
      'email',
    ]);
  });

  it('accepts valid non-empty relations', () => {
    const identity = createResourceIdentity('crm', 'Order');
    if (!identity.ok) return;
    const result = validateResource({
      identity: identity.value,
      schema: {
        fields: [],
        relations: [
          {
            name: 'author',
            target: { namespace: 'crm', name: 'User' },
            multiplicity: 'one',
            optional: false,
            nullable: false,
          },
          {
            name: 'lineItems',
            target: { namespace: 'crm', name: 'LineItem' },
            multiplicity: 'many',
            optional: true,
            nullable: true,
          },
        ],
        operations: [],
      constraints: [],
      },
      annotations: emptyAnnotations,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.schema.relations.map((r) => r.name)).toEqual([
      'author',
      'lineItems',
    ]);
    expect(result.value.schema.relations.map((r) => r.target)).toEqual([
      { namespace: 'crm', name: 'User' },
      { namespace: 'crm', name: 'LineItem' },
    ]);
    expect(result.value.schema.relations.map((r) => r.multiplicity)).toEqual([
      'one',
      'many',
    ]);
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

  it('rejects duplicate annotation keys with structured cause', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    if (!identity.ok) return;
    const key = { namespace: 'docs', name: 'summary' };
    const result = validateResource({
      identity: identity.value,
      schema: createEmptyResourceSchema(),
      annotations: [
        { key, value: 'a' },
        { key, value: 'b' },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_annotations');
      if (result.error.code === 'invalid_annotations') {
        expect(result.error.cause.code).toBe('duplicate_key');
      }
    }
  });
});
