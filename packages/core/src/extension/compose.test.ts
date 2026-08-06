import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/create.js';
import { resourceMetadataEqual } from '../metadata/equal.js';
import { createMetadataKey } from '../metadata/key.js';
import { composeResourceMetadata } from './compose.js';
import type { Contribution } from './types.js';

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

  it('rejects invalid producer kind', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = composeResourceMetadata(identity.value, [
      {
        kind: 'other' as unknown as 'extension',
        partitions: [],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toEqual({
      code: 'invalid_contribution',
      contributionIndex: 0,
      cause: { code: 'invalid_kind', kind: 'other' },
    });
  });

  it('rejects duplicate partition namespaces inside one contribution', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = composeResourceMetadata(identity.value, [
      {
        kind: 'extension',
        partitions: [
          { namespace: 'graphql', entries: [] },
          { namespace: 'graphql', entries: [] },
        ],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe('invalid_contribution');
    if (result.error.code !== 'invalid_contribution') {
      return;
    }
    expect(result.error.contributionIndex).toBe(0);
    expect(result.error.cause).toEqual({
      code: 'duplicate_partition_namespace',
      namespace: 'graphql',
      partitionIndices: [0, 1],
    });
  });

  it('rejects duplicate entry names inside one partition', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = composeResourceMetadata(identity.value, [
      {
        kind: 'extension',
        partitions: [
          {
            namespace: 'graphql',
            entries: [
              { name: 'typeName', value: 'A' },
              { name: 'typeName', value: 'B' },
            ],
          },
        ],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe('invalid_contribution');
    if (result.error.code !== 'invalid_contribution') {
      return;
    }
    expect(result.error.partitionIndex).toBe(0);
    expect(result.error.cause).toEqual({
      code: 'duplicate_entry_name',
      name: 'typeName',
      entryIndices: [0, 1],
    });
  });

  it('surfaces invalid json values as invalid_contribution', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = composeResourceMetadata(identity.value, [
      {
        kind: 'extension',
        partitions: [
          {
            namespace: 'graphql',
            entries: [
              {
                name: 'typeName',
                value: undefined as unknown as string,
              },
            ],
          },
        ],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe('invalid_contribution');
    if (result.error.code !== 'invalid_contribution') {
      return;
    }
    expect(result.error.cause.code).toBe('invalid_json_value');
  });

  it('wraps MetadataKeyValidationError under invalid_key', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = composeResourceMetadata(identity.value, [
      {
        kind: 'extension',
        partitions: [
          {
            namespace: 'GraphQL',
            entries: [{ name: 'typeName', value: 'Customer' }],
          },
        ],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe('invalid_contribution');
    if (result.error.code !== 'invalid_contribution') {
      return;
    }
    expect(result.error.cause).toEqual({
      code: 'invalid_key',
      cause: { code: 'invalid_namespace', namespace: 'GraphQL' },
    });
  });

  it('rejects extension contributions that include rf', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = composeResourceMetadata(identity.value, [
      {
        kind: 'extension',
        partitions: [
          {
            namespace: 'rf',
            entries: [{ name: 'description', value: 'nope' }],
          },
        ],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toEqual({
      code: 'reserved_namespace_violation',
      contributionIndex: 0,
      partitionIndex: 0,
    });
  });

  it('rejects cross-contribution duplicate namespaces', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = composeResourceMetadata(identity.value, [
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
        partitions: [
          {
            namespace: 'graphql',
            entries: [{ name: 'typeName', value: 'CrmCustomer' }],
          },
        ],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toEqual({
      code: 'duplicate_namespace',
      namespace: 'graphql',
      contributionIndices: [0, 1],
    });
  });

  it('rejects two framework contributions both owning rf as duplicate_namespace', () => {
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
            entries: [{ name: 'description', value: 'a' }],
          },
        ],
      },
      {
        kind: 'framework',
        partitions: [
          {
            namespace: 'rf',
            entries: [{ name: 'description', value: 'b' }],
          },
        ],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toEqual({
      code: 'duplicate_namespace',
      namespace: 'rf',
      contributionIndices: [0, 1],
    });
  });

  it('is independent of contribution order for successful composition', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const a: Contribution = {
      kind: 'framework',
      partitions: [
        {
          namespace: 'rf',
          entries: [{ name: 'description', value: 'CRM customer' }],
        },
      ],
    };
    const b: Contribution = {
      kind: 'extension',
      partitions: [
        {
          namespace: 'graphql',
          entries: [{ name: 'typeName', value: 'Customer' }],
        },
      ],
    };

    const ab = composeResourceMetadata(identity.value, [a, b]);
    const ba = composeResourceMetadata(identity.value, [b, a]);
    expect(ab.ok && ba.ok).toBe(true);
    if (!ab.ok || !ba.ok) {
      return;
    }
    expect(resourceMetadataEqual(ab.value, ba.value)).toBe(true);
  });
});
