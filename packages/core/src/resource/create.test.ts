import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { createResource } from './create.js';
import { emptyAnnotations } from './empty-annotations.js';

describe('createResource', () => {
  it('creates a minimal resource', () => {
    const identity = createResourceIdentity('billing', 'Invoice');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = createResource(identity.value);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.identity).toEqual({
      namespace: 'billing',
      name: 'Invoice',
    });
    expect(result.value.schema.fields).toEqual([]);
    expect(result.value.schema.relations).toEqual([]);
    expect(result.value.schema.operations).toEqual([]);
    expect(result.value.annotations).toBe(emptyAnnotations);
    expect('metadata' in result.value).toBe(false);
  });

  it('rejects invalid identity', () => {
    const result = createResource({ namespace: 'Billing', name: 'Invoice' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_identity');
    }
  });
});
