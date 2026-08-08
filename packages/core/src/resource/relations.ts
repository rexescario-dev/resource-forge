import { resourceIdentitiesEqual } from '../identity/equal.js';
import { validateResourceIdentity } from '../identity/validate.js';
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

function hasExactOwnKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value);
  if (keys.length !== expected.length) {
    return false;
  }
  return expected.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

/**
 * Internal: validate raw candidate members (closed shape, names, uniqueness,
 * declarative target) before any `{ name, target }` materialization.
 * MUST NOT strip unknown properties or invent a default target.
 *
 * Target structural keys `{ namespace, name }` are the closed Relation boundary;
 * RFC-001 `validateResourceIdentity(..., { kind: 'user' })` remains authoritative
 * for identity semantics (no second identity validity definition).
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

    if (!hasExactOwnKeys(member, ['name', 'target'])) {
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

    const rawTarget = member.target;
    if (!isPlainObject(rawTarget) || !hasExactOwnKeys(rawTarget, ['namespace', 'name'])) {
      return err({ code: 'invalid_relation_member', index });
    }

    const namespace = rawTarget.namespace;
    const targetName = rawTarget.name;
    if (typeof namespace !== 'string' || typeof targetName !== 'string') {
      return err({ code: 'invalid_relation_member', index });
    }

    const targetResult = validateResourceIdentity(
      { namespace, name: targetName },
      { kind: 'user' },
    );
    if (!targetResult.ok) {
      return err({
        code: 'invalid_relation_target',
        index,
        cause: targetResult.error,
      });
    }

    seen.add(nameResult.value);
    accepted.push({ name: nameResult.value, target: targetResult.value });
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
    relations.map((relation) =>
      Object.freeze({
        name: relation.name,
        target: Object.freeze({
          namespace: relation.target.namespace,
          name: relation.target.name,
        }),
      }),
    ),
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
    if (!resourceIdentitiesEqual(left[i]!.target, right[i]!.target)) {
      return false;
    }
  }
  return true;
}
