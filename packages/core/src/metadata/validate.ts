import type { ResourceIdentity } from '../identity/types.js';
import { validateResourceIdentity } from '../identity/validate.js';
import { err, ok, type Result } from '../result.js';
import { validateJsonValue } from './json-value.js';
import { metadataKeysEqual, validateMetadataKey } from './key.js';
import type {
  MetadataEntry,
  MetadataValidationError,
  ResourceMetadata,
} from './types.js';

export function validateResourceMetadata(candidate: {
  identity: ResourceIdentity;
  entries: ReadonlyArray<MetadataEntry>;
}): Result<ResourceMetadata, MetadataValidationError> {
  const identityKind =
    candidate.identity.namespace === 'rf' ? 'framework' : 'user';
  const identity = validateResourceIdentity(candidate.identity, {
    kind: identityKind,
  });
  if (!identity.ok) {
    return err({ code: 'invalid_identity', cause: identity.error });
  }

  const entries: MetadataEntry[] = [];

  for (let index = 0; index < candidate.entries.length; index += 1) {
    const entry = candidate.entries[index]!;
    const keyKind =
      entry.key.namespace === 'rf' ? 'framework' : 'extension';
    const key = validateMetadataKey(entry.key, { kind: keyKind });
    if (!key.ok) {
      return err({ code: 'invalid_key', index, cause: key.error });
    }

    const value = validateJsonValue(entry.value);
    if (!value.ok) {
      return err({ code: 'invalid_value', index, cause: value.error });
    }

    for (let prior = 0; prior < entries.length; prior += 1) {
      if (metadataKeysEqual(entries[prior]!.key, key.value)) {
        return err({
          code: 'duplicate_key',
          index,
          key: key.value,
        });
      }
    }

    entries.push({ key: key.value, value: value.value });
  }

  return ok({
    identity: identity.value,
    entries,
  });
}
