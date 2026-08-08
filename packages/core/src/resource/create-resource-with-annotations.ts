import type { ResourceIdentity } from '../identity/types.js';
import type { MetadataEntry } from '../metadata/types.js';
import { err, type Result } from '../result.js';
import { snapshotAnnotations } from './annotations.js';
import { createEmptyResourceSchema } from './schema.js';
import type { Resource, ResourceValidationError } from './types.js';
import { validateResource } from './validate.js';

/**
 * Internal / test-only seam: construct a Resource with snapshotted non-empty annotations.
 * NOT exported from package barrels.
 */
export function createResourceWithAnnotationsForTests(
  identity: ResourceIdentity,
  candidateEntries: readonly MetadataEntry[],
): Result<Resource, ResourceValidationError> {
  const annotations = snapshotAnnotations(candidateEntries);
  if (!annotations.ok) {
    return err({ code: 'invalid_annotations', cause: annotations.error });
  }

  return validateResource({
    identity,
    schema: createEmptyResourceSchema(),
    annotations: annotations.value,
  });
}
