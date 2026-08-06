import type { ResourceIdentity } from '../identity/types.js';
import { validateResourceIdentity } from '../identity/validate.js';
import { createResourceMetadata } from '../metadata/create.js';
import { validateJsonValue } from '../metadata/json-value.js';
import { createMetadataKey, validateMetadataKey } from '../metadata/key.js';
import type { MetadataEntry, ResourceMetadata } from '../metadata/types.js';
import type { Result } from '../result.js';
import { err, ok } from '../result.js';
import type {
  CompositionError,
  Contribution,
  ContributionValidationError,
  NamespacePartition,
} from './types.js';

function invalidContribution(
  contributionIndex: number,
  cause: ContributionValidationError,
  partitionIndex?: number,
): Result<never, CompositionError> {
  return err({
    code: 'invalid_contribution',
    contributionIndex,
    ...(partitionIndex !== undefined ? { partitionIndex } : {}),
    cause,
  });
}

function findDuplicatePartitionNamespace(
  partitions: ReadonlyArray<NamespacePartition>,
): ContributionValidationError | undefined {
  const indicesByNamespace = new Map<string, number[]>();
  for (let i = 0; i < partitions.length; i += 1) {
    const namespace = partitions[i]!.namespace;
    const indices = indicesByNamespace.get(namespace);
    if (indices === undefined) {
      indicesByNamespace.set(namespace, [i]);
    } else {
      indices.push(i);
    }
  }

  for (const [namespace, partitionIndices] of indicesByNamespace) {
    if (partitionIndices.length > 1) {
      return {
        code: 'duplicate_partition_namespace',
        namespace,
        partitionIndices,
      };
    }
  }

  return undefined;
}

function findDuplicateEntryName(
  entries: NamespacePartition['entries'],
): ContributionValidationError | undefined {
  const indicesByName = new Map<string, number[]>();
  for (let i = 0; i < entries.length; i += 1) {
    const name = entries[i]!.name;
    const indices = indicesByName.get(name);
    if (indices === undefined) {
      indicesByName.set(name, [i]);
    } else {
      indices.push(i);
    }
  }

  for (const [name, entryIndices] of indicesByName) {
    if (entryIndices.length > 1) {
      return {
        code: 'duplicate_entry_name',
        name,
        entryIndices,
      };
    }
  }

  return undefined;
}

function validatePartition(
  partition: NamespacePartition,
  contributionIndex: number,
  partitionIndex: number,
): Result<void, CompositionError> {
  const grammarKind = partition.namespace === 'rf' ? 'framework' : 'extension';

  const namespaceProbe = validateMetadataKey(
    { namespace: partition.namespace, name: 'a' },
    { kind: grammarKind },
  );
  if (!namespaceProbe.ok) {
    return invalidContribution(
      contributionIndex,
      {
        code: 'invalid_key',
        cause: namespaceProbe.error,
      },
      partitionIndex,
    );
  }

  for (let entryIndex = 0; entryIndex < partition.entries.length; entryIndex += 1) {
    const entry = partition.entries[entryIndex]!;

    const keyResult = validateMetadataKey(
      { namespace: partition.namespace, name: entry.name },
      { kind: grammarKind },
    );
    if (!keyResult.ok) {
      return invalidContribution(
        contributionIndex,
        {
          code: 'invalid_key',
          entryIndex,
          cause: keyResult.error,
        },
        partitionIndex,
      );
    }

    const valueResult = validateJsonValue(entry.value);
    if (!valueResult.ok) {
      return invalidContribution(
        contributionIndex,
        {
          code: 'invalid_json_value',
          entryIndex,
          cause: valueResult.error,
        },
        partitionIndex,
      );
    }
  }

  const duplicateEntry = findDuplicateEntryName(partition.entries);
  if (duplicateEntry !== undefined) {
    return invalidContribution(
      contributionIndex,
      duplicateEntry,
      partitionIndex,
    );
  }

  return ok(undefined);
}

function validateContribution(
  contribution: Contribution,
  contributionIndex: number,
): Result<void, CompositionError> {
  if (contribution.kind !== 'framework' && contribution.kind !== 'extension') {
    return invalidContribution(contributionIndex, {
      code: 'invalid_kind',
      kind: contribution.kind,
    });
  }

  const duplicatePartition = findDuplicatePartitionNamespace(
    contribution.partitions,
  );
  if (duplicatePartition !== undefined) {
    return invalidContribution(contributionIndex, duplicatePartition);
  }

  for (
    let partitionIndex = 0;
    partitionIndex < contribution.partitions.length;
    partitionIndex += 1
  ) {
    const partitionResult = validatePartition(
      contribution.partitions[partitionIndex]!,
      contributionIndex,
      partitionIndex,
    );
    if (!partitionResult.ok) {
      return partitionResult;
    }
  }

  return ok(undefined);
}

function assembleEntries(
  contributions: ReadonlyArray<Contribution>,
): MetadataEntry[] {
  const entries: MetadataEntry[] = [];

  for (const contribution of contributions) {
    for (const partition of contribution.partitions) {
      const keyKind = partition.namespace === 'rf' ? 'framework' : 'extension';
      for (const entry of partition.entries) {
        const key = createMetadataKey(partition.namespace, entry.name, {
          kind: keyKind,
        });
        if (!key.ok) {
          throw new Error(
            'composeResourceMetadata: unreachable key failure after validation',
          );
        }
        entries.push({ key: key.value, value: entry.value });
      }
    }
  }

  return entries;
}

export function composeResourceMetadata(
  identity: ResourceIdentity,
  contributions: ReadonlyArray<Contribution>,
): Result<ResourceMetadata, CompositionError> {
  const identityKind = identity.namespace === 'rf' ? 'framework' : 'user';
  const validatedIdentity = validateResourceIdentity(identity, {
    kind: identityKind,
  });
  if (!validatedIdentity.ok) {
    return err({
      code: 'invalid_identity',
      cause: validatedIdentity.error,
    });
  }

  for (
    let contributionIndex = 0;
    contributionIndex < contributions.length;
    contributionIndex += 1
  ) {
    const contributionResult = validateContribution(
      contributions[contributionIndex]!,
      contributionIndex,
    );
    if (!contributionResult.ok) {
      return contributionResult;
    }
  }

  const entries = assembleEntries(contributions);
  const metadata = createResourceMetadata(validatedIdentity.value, entries);
  if (!metadata.ok) {
    throw new Error(
      'composeResourceMetadata: unreachable metadata failure after validation',
    );
  }
  return ok(metadata.value);
}
