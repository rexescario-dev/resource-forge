import {
  metadataKeysEqual,
  validateJsonValue,
  validateMetadataKey,
} from '../metadata/index.js';
import type { JsonValue, MetadataEntry } from '../metadata/types.js';
import { err, ok, type Result } from '../result.js';
import type { AnnotationValidationError, Annotations } from './types.js';

const RF_ANNOTATION_CATALOG = new Set(['description', 'displayName']);

function freezeJsonValue(value: JsonValue): JsonValue {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => freezeJsonValue(item));
    return Object.freeze(items) as JsonValue;
  }

  const record: { [key: string]: JsonValue } = {};
  for (const [key, nested] of Object.entries(value)) {
    record[key] = freezeJsonValue(nested);
  }
  return Object.freeze(record) as JsonValue;
}

/** Internal: validate annotation container rules (RFC-006 / RFC-002). Not a public export. */
export function checkAnnotations(
  candidate: readonly MetadataEntry[],
): Result<Annotations, AnnotationValidationError> {
  if (!Array.isArray(candidate)) {
    return err({
      code: 'invalid_value',
      index: 0,
      cause: { code: 'invalid_json_value', path: '' },
    });
  }

  const accepted: MetadataEntry[] = [];

  for (let index = 0; index < candidate.length; index += 1) {
    const entry = candidate[index]!;
    const kind = entry.key.namespace === 'rf' ? 'framework' : 'extension';
    const key = validateMetadataKey(entry.key, { kind });
    if (!key.ok) {
      return err({ code: 'invalid_key', index, cause: key.error });
    }

    const value = validateJsonValue(entry.value);
    if (!value.ok) {
      return err({ code: 'invalid_value', index, cause: value.error });
    }

    for (let prior = 0; prior < accepted.length; prior += 1) {
      if (metadataKeysEqual(accepted[prior]!.key, key.value)) {
        return err({ code: 'duplicate_key', index, key: key.value });
      }
    }

    // RFC-022 vocabulary (after key / JsonValue / duplicate — locked precedence)
    if (key.value.namespace === 'rf') {
      if (!RF_ANNOTATION_CATALOG.has(key.value.name)) {
        return err({
          code: 'unknown_rf_annotation_key',
          index,
          key: key.value,
        });
      }
      // Catalogued keys require the JsonValue string variant (null / non-strings invalid).
      if (typeof value.value !== 'string') {
        return err({
          code: 'invalid_rf_annotation_value_shape',
          index,
          key: key.value,
        });
      }
    }

    accepted.push({ key: key.value, value: value.value });
  }

  return ok(accepted);
}

/**
 * Internal: establish snapshot-by-value Annotations from candidate mappings.
 * Deep-covers entry/key containers and nested JsonValue graphs.
 */
export function snapshotAnnotations(
  candidate: readonly MetadataEntry[],
): Result<Annotations, AnnotationValidationError> {
  const checked = checkAnnotations(candidate);
  if (!checked.ok) {
    return checked;
  }

  const cloned = structuredClone(checked.value) as MetadataEntry[];
  const snapshotted = cloned.map((entry) =>
    Object.freeze({
      key: Object.freeze({
        namespace: entry.key.namespace,
        name: entry.key.name,
      }),
      value: freezeJsonValue(entry.value),
    }),
  );

  return ok(Object.freeze(snapshotted));
}
