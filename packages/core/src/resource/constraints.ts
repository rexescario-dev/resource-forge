import { err, ok, type Result } from '../result.js';
import type {
  Constraint,
  ConstraintName,
  ConstraintValidationError,
} from './types.js';

const CONSTRAINT_NAME_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

/** Internal: sole normative ConstraintName grammar (RFC-016). */
export function validateConstraintName(
  name: string,
): Result<
  ConstraintName,
  { readonly code: 'invalid_constraint_name'; readonly name: string }
> {
  if (typeof name !== 'string' || !CONSTRAINT_NAME_PATTERN.test(name)) {
    return err({
      code: 'invalid_constraint_name',
      name: typeof name === 'string' ? name : String(name),
    });
  }
  return ok(name);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ownKeySet(member: object): Set<string> {
  return new Set(Object.keys(member));
}

function setsEqual(left: Set<string>, right: ReadonlyArray<string>): boolean {
  if (left.size !== right.length) {
    return false;
  }
  for (const key of right) {
    if (!left.has(key)) {
      return false;
    }
  }
  return true;
}

/**
 * Internal: single RFC-016 constraint collection validation (closed shape, names,
 * kind, uniqueness) before `{ name, kind }` materialization. MUST NOT strip
 * additional semantic properties. Reused by construction fixtures and
 * `validateResource`.
 */
export function checkConstraints(
  candidate: readonly unknown[],
): Result<Constraint[], ConstraintValidationError> {
  if (!Array.isArray(candidate)) {
    return err({ code: 'invalid_constraints_collection' });
  }

  const accepted: Constraint[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < candidate.length; index += 1) {
    const member = candidate[index];
    if (!isPlainObject(member)) {
      return err({ code: 'invalid_constraint_member', index });
    }

    const keys = ownKeySet(member);
    const hasOwnKind = Object.prototype.hasOwnProperty.call(member, 'kind');

    if (!hasOwnKind && setsEqual(keys, ['name'])) {
      return err({ code: 'missing_constraint_kind', index });
    }

    if (!setsEqual(keys, ['name', 'kind'])) {
      return err({ code: 'invalid_constraint_member', index });
    }

    const rawName = member.name;
    if (typeof rawName !== 'string') {
      return err({
        code: 'invalid_constraint_name',
        index,
        name: String(rawName),
      });
    }

    const nameResult = validateConstraintName(rawName);
    if (!nameResult.ok) {
      return err({
        code: 'invalid_constraint_name',
        index,
        name: nameResult.error.name,
      });
    }

    const rawKind = member.kind;
    if (typeof rawKind !== 'string' || rawKind.length === 0) {
      return err({
        code: 'invalid_constraint_kind',
        index,
        kind: rawKind,
      });
    }

    if (seen.has(nameResult.value)) {
      return err({
        code: 'duplicate_constraint_name',
        index,
        name: nameResult.value,
      });
    }

    seen.add(nameResult.value);
    accepted.push({ name: nameResult.value, kind: rawKind });
  }

  return ok(accepted);
}

/**
 * Internal: freeze an ordered sequence of already-validated Constraints.
 * MUST NOT accept raw candidates or discard additional semantic properties.
 */
export function snapshotConstraints(
  constraints: readonly Constraint[],
): ReadonlyArray<Constraint> {
  return Object.freeze(
    constraints.map((constraint) =>
      Object.freeze({ name: constraint.name, kind: constraint.kind }),
    ),
  );
}

/** Internal / test-only: order-sensitive Constraint sequence equality. */
export function constraintsEqual(
  left: readonly Constraint[],
  right: readonly Constraint[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let i = 0; i < left.length; i += 1) {
    if (
      left[i]!.name !== right[i]!.name ||
      left[i]!.kind !== right[i]!.kind
    ) {
      return false;
    }
  }
  return true;
}
