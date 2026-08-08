import { err, ok, type Result } from '../result.js';
import type {
  Relation,
  RelationName,
  RelationValidationError,
} from './types.js';

const RELATION_NAME_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

/** Internal: sole normative RelationName grammar (RFC-008). */
export function validateRelationName(
  name: string,
): Result<RelationName, { readonly code: 'invalid_relation_name'; readonly name: string }> {
  if (typeof name !== 'string' || !RELATION_NAME_PATTERN.test(name)) {
    return err({
      code: 'invalid_relation_name',
      name: typeof name === 'string' ? name : String(name),
    });
  }
  return ok(name);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Internal: validate raw candidate members (closed shape, names, uniqueness)
 * before any `{ name }`-only materialization. MUST NOT strip unknown properties.
 */
export function checkRelations(
  candidate: readonly unknown[],
): Result<Relation[], RelationValidationError> {
  if (!Array.isArray(candidate)) {
    return err({ code: 'invalid_relation_member', index: 0 });
  }

  const accepted: Relation[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < candidate.length; index += 1) {
    const member = candidate[index];
    if (!isPlainObject(member)) {
      return err({ code: 'invalid_relation_member', index });
    }

    const keys = Object.keys(member);
    if (keys.length !== 1 || keys[0] !== 'name') {
      return err({ code: 'invalid_relation_member', index });
    }

    const rawName = member.name;
    if (typeof rawName !== 'string') {
      return err({
        code: 'invalid_relation_name',
        index,
        name: String(rawName),
      });
    }

    const nameResult = validateRelationName(rawName);
    if (!nameResult.ok) {
      return err({
        code: 'invalid_relation_name',
        index,
        name: nameResult.error.name,
      });
    }

    if (seen.has(nameResult.value)) {
      return err({
        code: 'duplicate_relation_name',
        index,
        name: nameResult.value,
      });
    }
    seen.add(nameResult.value);
    accepted.push({ name: nameResult.value });
  }

  return ok(accepted);
}

/**
 * Internal: freeze an ordered sequence of already-validated Relations.
 * MUST NOT accept raw candidates or discard unknown properties.
 */
export function snapshotRelations(
  relations: readonly Relation[],
): ReadonlyArray<Relation> {
  return Object.freeze(
    relations.map((relation) => Object.freeze({ name: relation.name })),
  );
}

/** Internal / test-only: order-sensitive Relation sequence equality. */
export function relationsEqual(
  left: readonly Relation[],
  right: readonly Relation[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let i = 0; i < left.length; i += 1) {
    if (left[i]!.name !== right[i]!.name) {
      return false;
    }
  }
  return true;
}
