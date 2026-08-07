import { describe, expect, it } from 'vitest';
import type {
  CompositionError,
  Contribution,
  ContributionValidationError,
  NamespacePartition,
  ProducerKind,
} from './types.js';

describe('extension types', () => {
  it('models contribution partitions', () => {
    const kind: ProducerKind = 'extension';
    const partition: NamespacePartition = {
      namespace: 'graphql',
      entries: [{ name: 'typeName', value: 'Customer' }],
    };
    const contribution: Contribution = {
      kind,
      partitions: [partition],
    };
    expect(contribution.partitions).toHaveLength(1);
  });

  it('keeps CompositionError codes distinguishable', () => {
    const errors: CompositionError[] = [
      {
        code: 'invalid_identity',
        cause: { code: 'invalid_namespace', namespace: 'CRM' },
      },
      {
        code: 'invalid_contribution',
        contributionIndex: 0,
        cause: { code: 'invalid_kind', kind: 'other' },
      },
      {
        code: 'reserved_namespace_violation',
        contributionIndex: 0,
        partitionIndex: 0,
      },
      {
        code: 'duplicate_namespace',
        namespace: 'graphql',
        contributionIndices: [0, 1],
      },
    ];
    expect(errors).toHaveLength(4);
  });

  it('nests MetadataKeyValidationError under invalid_key', () => {
    const cause: ContributionValidationError = {
      code: 'invalid_key',
      entryIndex: 0,
      cause: { code: 'invalid_name', name: 'TypeName' },
    };
    expect(cause.code).toBe('invalid_key');
  });
});
