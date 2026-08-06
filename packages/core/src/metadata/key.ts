import { err, ok, type Result } from '../result.js';
import type {
  MetadataKey,
  MetadataKeyKind,
  MetadataKeyValidationError,
} from './types.js';

const NAMESPACE_PATTERN = /^[a-z][a-z0-9-]*$/;
const NAME_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

export function validateMetadataKey(
  candidate: { namespace: string; name: string },
  options?: { kind?: MetadataKeyKind },
): Result<MetadataKey, MetadataKeyValidationError> {
  const kind = options?.kind ?? 'extension';
  const { namespace, name } = candidate;

  if (!NAMESPACE_PATTERN.test(namespace)) {
    return err({ code: 'invalid_namespace', namespace });
  }

  if (!NAME_PATTERN.test(name)) {
    return err({ code: 'invalid_name', name });
  }

  if (kind === 'extension' && namespace === 'rf') {
    return err({ code: 'reserved_namespace', namespace });
  }

  return ok({ namespace, name });
}

export function createMetadataKey(
  namespace: string,
  name: string,
  options?: { kind?: MetadataKeyKind },
): Result<MetadataKey, MetadataKeyValidationError> {
  return validateMetadataKey({ namespace, name }, options);
}

export function metadataKeysEqual(a: MetadataKey, b: MetadataKey): boolean {
  return a.namespace === b.namespace && a.name === b.name;
}
