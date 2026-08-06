import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/create.js';
import { resourceMetadataEqual } from '../metadata/equal.js';
import { createMetadataKey } from '../metadata/key.js';
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

  it('unions disjoint namespace partitions', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = composeResourceMetadata(identity.value, [
      {
        kind: 'framework',
        partitions: [
          {
            namespace: 'rf',
            entries: [{ name: 'description', value: 'CRM customer' }],
          },
        ],
      },
      {
        kind: 'extension',
        partitions: [
          {
            namespace: 'graphql',
            entries: [{ name: 'typeName', value: 'Customer' }],
          },
        ],
      },
      {
        kind: 'extension',
        partitions: [],
      },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const rfKey = createMetadataKey('rf', 'description', { kind: 'framework' });
    const gqlKey = createMetadataKey('graphql', 'typeName');
    expect(rfKey.ok && gqlKey.ok).toBe(true);
    if (!rfKey.ok || !gqlKey.ok) {
      return;
    }

    expect(
      resourceMetadataEqual(result.value, {
        identity: identity.value,
        entries: [
          { key: rfKey.value, value: 'CRM customer' },
          { key: gqlKey.value, value: 'Customer' },
        ],
      }),
    ).toBe(true);
  });

  it('treats empty contribution partitions as a no-op', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const withEmpty = composeResourceMetadata(identity.value, [
      { kind: 'extension', partitions: [] },
    ]);
    const without = composeResourceMetadata(identity.value, []);
    expect(withEmpty.ok && without.ok).toBe(true);
    if (!withEmpty.ok || !without.ok) {
      return;
    }
    expect(resourceMetadataEqual(withEmpty.value, without.value)).toBe(true);
  });
});
