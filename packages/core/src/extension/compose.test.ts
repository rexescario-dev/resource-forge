import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/create.js';
import { resourceMetadataEqual } from '../metadata/equal.js';
import { composeResourceMetadata } from './compose.js';

describe('composeResourceMetadata', () => {
  it('composes empty contributions into empty-entry metadata', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = composeResourceMetadata(identity.value, []);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(
      resourceMetadataEqual(result.value, {
        identity: identity.value,
        entries: [],
      }),
    ).toBe(true);
  });

  it('rejects invalid identity', () => {
    const result = composeResourceMetadata(
      { namespace: 'CRM', name: 'Customer' },
      [],
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe('invalid_identity');
  });
});
