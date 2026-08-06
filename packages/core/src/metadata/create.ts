import type { ResourceIdentity } from '../identity/types.js';
import type { Result } from '../result.js';
import type {
  MetadataEntry,
  MetadataValidationError,
  ResourceMetadata,
} from './types.js';
import { validateResourceMetadata } from './validate.js';

export function createResourceMetadata(
  identity: ResourceIdentity,
  entries: ReadonlyArray<MetadataEntry>,
): Result<ResourceMetadata, MetadataValidationError> {
  return validateResourceMetadata({ identity, entries });
}
