import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/create.js';
import { createResourceMetadata } from './create.js';

describe('createResourceMetadata', () => {
  it('creates a validated snapshot', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = createResourceMetadata(identity.value, [
      { key: { namespace: 'graphql', name: 'typeName' }, value: 'Customer' },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.entries).toHaveLength(1);
    }
  });
});
