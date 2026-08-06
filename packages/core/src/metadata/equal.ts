import { resourceIdentitiesEqual } from '../identity/equal.js';
import { metadataKeysEqual } from './key.js';
import type { JsonValue, ResourceMetadata } from './types.js';

function jsonValuesEqual(a: JsonValue, b: JsonValue): boolean {
  if (a === b) {
    return true;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => jsonValuesEqual(item, b[index]!));
  }

  if (
    a !== null &&
    b !== null &&
    typeof a === 'object' &&
    typeof b === 'object'
  ) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
      return false;
    }
    return aKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(b, key) &&
        jsonValuesEqual(a[key]!, b[key]!),
    );
  }

  return false;
}

export function resourceMetadataEqual(
  a: ResourceMetadata,
  b: ResourceMetadata,
): boolean {
  if (!resourceIdentitiesEqual(a.identity, b.identity)) {
    return false;
  }

  if (a.entries.length !== b.entries.length) {
    return false;
  }

  return a.entries.every((entry) => {
    const match = b.entries.find((other) =>
      metadataKeysEqual(entry.key, other.key),
    );
    return match !== undefined && jsonValuesEqual(entry.value, match.value);
  });
}
