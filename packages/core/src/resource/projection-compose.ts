import { metadataKeysEqual } from '../metadata/key.js';
import type { MetadataEntry, MetadataKey } from '../metadata/types.js';
import { err, ok, type Result } from '../result.js';

export type ProjectionSourceId = string;

export type ProjectionContribution = {
  readonly sourceId: ProjectionSourceId;
  readonly entries: ReadonlyArray<MetadataEntry>;
};

export type ProjectionCompositionError =
  | {
      readonly code: 'duplicate_projection_source';
      readonly sourceId: string;
    }
  | {
      readonly code: 'projection_key_collision';
      readonly key: MetadataKey;
      readonly sources: readonly string[];
    };

export function composeProjectionContributions(
  contributions: ReadonlyArray<ProjectionContribution>,
): Result<MetadataEntry[], ProjectionCompositionError> {
  const seenSourceIds = new Set<string>();
  for (const contribution of contributions) {
    if (seenSourceIds.has(contribution.sourceId)) {
      return err({
        code: 'duplicate_projection_source',
        sourceId: contribution.sourceId,
      });
    }
    seenSourceIds.add(contribution.sourceId);
  }

  const owned: Array<{ key: MetadataKey; sourceId: string }> = [];
  const composed: MetadataEntry[] = [];

  for (const contribution of contributions) {
    for (const entry of contribution.entries) {
      const prior = owned.find((item) =>
        metadataKeysEqual(item.key, entry.key),
      );
      if (prior !== undefined) {
        return err({
          code: 'projection_key_collision',
          key: entry.key,
          sources: [prior.sourceId, contribution.sourceId],
        });
      }
      owned.push({ key: entry.key, sourceId: contribution.sourceId });
      composed.push(entry);
    }
  }

  return ok(composed);
}
