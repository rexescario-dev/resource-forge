import { resourceIdentitiesEqual } from '../identity/equal.js';
import { validateResourceIdentity } from '../identity/validate.js';
import { err, ok, type Result } from '../result.js';
import { validateFieldName } from './fields.js';
import type {
  CascadePolicy,
  FetchPolicy,
  FieldName,
  Relation,
  RelationDirection,
  RelationJoin,
  RelationMultiplicity,
  RelationName,
  RelationValidationError,
} from './types.js';

const RELATION_NAME_PATTERN = /^[a-z][a-zA-Z0-9]*$/;
const RELATION_MULTIPLICITIES = new Set<RelationMultiplicity>(['one', 'many']);
const RELATION_DIRECTIONS = new Set<RelationDirection>(['outbound', 'inbound']);
const CASCADE_POLICIES = new Set<CascadePolicy>([
  'none',
  'cascade',
  'restrict',
  'setNull',
]);
const FETCH_POLICIES = new Set<FetchPolicy>(['eager', 'lazy']);

const BASE_RELATION_KEYS = [
  'name',
  'target',
  'multiplicity',
  'optional',
  'nullable',
  'direction',
  'onDelete',
  'onUpdate',
  'fetch',
] as const;

const LEGACY_RFC024_BASE_KEYS = [
  'name',
  'target',
  'multiplicity',
  'optional',
  'nullable',
  'direction',
] as const;

/** Post–RFC-026 eight-member base (cascade present, fetch absent). */
const LEGACY_RFC026_BASE_KEYS = [
  'name',
  'target',
  'multiplicity',
  'optional',
  'nullable',
  'direction',
  'onDelete',
  'onUpdate',
] as const;

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

function isAllowedRelationKeySet(member: Record<string, unknown>): boolean {
  return (
    hasExactOwnKeys(member, [...BASE_RELATION_KEYS]) ||
    hasExactOwnKeys(member, [...BASE_RELATION_KEYS, 'inverse']) ||
    hasExactOwnKeys(member, [...BASE_RELATION_KEYS, 'join']) ||
    hasExactOwnKeys(member, [...BASE_RELATION_KEYS, 'inverse', 'join'])
  );
}

function grammarNamePayload(candidate: unknown): string {
  return typeof candidate === 'string' ? candidate : String(candidate);
}

/**
 * Internal: validate raw candidate members (closed shape, names, uniqueness,
 * declarative target, multiplicity, optional, nullable, direction, onDelete,
 * onUpdate, fetch, optional inverse/join) before Relation materialization.
 * MUST NOT strip unknown properties or invent a default multiplicity/optional/
 * nullable/direction/onDelete/onUpdate/fetch/inverse/join.
 *
 * Target structural keys `{ namespace, name }` are the closed Relation boundary;
 * RFC-001 `validateResourceIdentity(..., { kind: 'user' })` remains authoritative
 * for identity semantics (no second identity validity definition).
 *
 * `nullable` is association-reference nullability only (RFC-015).
 * `join.local` resolves against owning field names (RFC-024).
 */
export function checkRelations(
  candidate: readonly unknown[],
  fields: readonly { readonly name: FieldName }[],
): Result<Relation[], RelationValidationError> {
  if (!Array.isArray(candidate)) {
    return err({ code: 'invalid_relation_member', index: 0 });
  }

  const accepted: Relation[] = [];
  const seen = new Set<string>();
  const fieldNames = new Set(fields.map((field) => field.name));

  for (let index = 0; index < candidate.length; index += 1) {
    const member = candidate[index];
    // M3.11 candidate-object acceptance only (not closed key-set classification).
    if (!isPlainObject(member)) {
      return err({ code: 'invalid_relation_member', index });
    }

    const hasMultiplicity = Object.prototype.hasOwnProperty.call(
      member,
      'multiplicity',
    );
    if (!hasMultiplicity) {
      if (hasExactOwnKeys(member, ['name', 'target'])) {
        return err({ code: 'missing_relation_multiplicity', index });
      }
      return err({ code: 'invalid_relation_member', index });
    }

    const hasOptional = Object.prototype.hasOwnProperty.call(member, 'optional');
    if (!hasOptional) {
      if (hasExactOwnKeys(member, ['name', 'target', 'multiplicity'])) {
        return err({ code: 'missing_relation_optional', index });
      }
      return err({ code: 'invalid_relation_member', index });
    }

    const hasNullable = Object.prototype.hasOwnProperty.call(member, 'nullable');
    if (!hasNullable) {
      if (hasExactOwnKeys(member, ['name', 'target', 'multiplicity', 'optional'])) {
        return err({ code: 'missing_relation_nullable', index });
      }
      return err({ code: 'invalid_relation_member', index });
    }

    const hasDirection = Object.prototype.hasOwnProperty.call(member, 'direction');
    if (!hasDirection) {
      if (
        hasExactOwnKeys(member, [
          'name',
          'target',
          'multiplicity',
          'optional',
          'nullable',
        ])
      ) {
        return err({ code: 'missing_relation_direction', index });
      }
      return err({ code: 'invalid_relation_member', index });
    }

    const hasOnDelete = Object.prototype.hasOwnProperty.call(member, 'onDelete');
    if (!hasOnDelete) {
      if (hasExactOwnKeys(member, [...LEGACY_RFC024_BASE_KEYS])) {
        return err({ code: 'missing_relation_on_delete', index });
      }
      return err({ code: 'invalid_relation_member', index });
    }

    const hasOnUpdate = Object.prototype.hasOwnProperty.call(member, 'onUpdate');
    if (!hasOnUpdate) {
      if (
        hasExactOwnKeys(member, [...LEGACY_RFC024_BASE_KEYS, 'onDelete'])
      ) {
        return err({ code: 'missing_relation_on_update', index });
      }
      return err({ code: 'invalid_relation_member', index });
    }

    const hasFetch = Object.prototype.hasOwnProperty.call(member, 'fetch');
    if (!hasFetch) {
      if (hasExactOwnKeys(member, [...LEGACY_RFC026_BASE_KEYS])) {
        return err({ code: 'missing_relation_fetch', index });
      }
      return err({ code: 'invalid_relation_member', index });
    }

    if (!isAllowedRelationKeySet(member)) {
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

    const rawMultiplicity = member.multiplicity;
    if (
      typeof rawMultiplicity !== 'string' ||
      !RELATION_MULTIPLICITIES.has(rawMultiplicity as RelationMultiplicity)
    ) {
      return err({
        code: 'invalid_relation_multiplicity',
        index,
        multiplicity: rawMultiplicity,
      });
    }

    const rawOptional = member.optional;
    if (typeof rawOptional !== 'boolean') {
      return err({
        code: 'invalid_relation_optional',
        index,
        optional: rawOptional,
      });
    }

    const rawNullable = member.nullable;
    if (typeof rawNullable !== 'boolean') {
      return err({
        code: 'invalid_relation_nullable',
        index,
        nullable: rawNullable,
      });
    }

    const rawDirection = member.direction;
    if (
      typeof rawDirection !== 'string' ||
      !RELATION_DIRECTIONS.has(rawDirection as RelationDirection)
    ) {
      return err({
        code: 'invalid_relation_direction',
        index,
        direction: rawDirection,
      });
    }

    const rawOnDelete = member.onDelete;
    if (
      typeof rawOnDelete !== 'string' ||
      !CASCADE_POLICIES.has(rawOnDelete as CascadePolicy)
    ) {
      return err({
        code: 'invalid_relation_on_delete',
        index,
        onDelete: rawOnDelete,
      });
    }

    const rawOnUpdate = member.onUpdate;
    if (
      typeof rawOnUpdate !== 'string' ||
      !CASCADE_POLICIES.has(rawOnUpdate as CascadePolicy)
    ) {
      return err({
        code: 'invalid_relation_on_update',
        index,
        onUpdate: rawOnUpdate,
      });
    }

    const rawFetch = member.fetch;
    if (
      typeof rawFetch !== 'string' ||
      !FETCH_POLICIES.has(rawFetch as FetchPolicy)
    ) {
      return err({
        code: 'invalid_relation_fetch',
        index,
        fetch: rawFetch,
      });
    }

    if (
      (rawOnDelete === 'setNull' || rawOnUpdate === 'setNull') &&
      rawNullable === false
    ) {
      return err({
        code: 'invalid_cascade_set_null_requires_nullable',
        index,
      });
    }

    let inverse: RelationName | undefined;
    const hasInverse = Object.prototype.hasOwnProperty.call(member, 'inverse');
    if (hasInverse) {
      const rawInverse = member.inverse;
      const inverseResult = validateRelationName(rawInverse as string);
      if (!inverseResult.ok) {
        return err({
          code: 'invalid_relation_inverse',
          index,
          inverse: inverseResult.error.name,
        });
      }
      inverse = inverseResult.value;
    }

    let join: RelationJoin | undefined;
    const hasJoin = Object.prototype.hasOwnProperty.call(member, 'join');
    if (hasJoin) {
      const rawJoin = member.join;
      if (!isPlainObject(rawJoin) || !hasExactOwnKeys(rawJoin, ['local', 'remote'])) {
        return err({ code: 'invalid_relation_join', index });
      }

      const rawLocal = rawJoin.local;
      const localNameResult = validateFieldName(rawLocal as string);
      if (!localNameResult.ok) {
        return err({
          code: 'invalid_join_local_field_name',
          index,
          name: grammarNamePayload(rawLocal),
        });
      }

      const rawRemote = rawJoin.remote;
      const remoteNameResult = validateFieldName(rawRemote as string);
      if (!remoteNameResult.ok) {
        return err({
          code: 'invalid_join_remote_field_name',
          index,
          name: grammarNamePayload(rawRemote),
        });
      }

      if (!fieldNames.has(localNameResult.value)) {
        return err({
          code: 'unknown_join_local_field',
          index,
          name: localNameResult.value,
        });
      }

      join = {
        local: localNameResult.value,
        remote: remoteNameResult.value,
      };
    }

    seen.add(nameResult.value);
    const relation: Relation = {
      name: nameResult.value,
      target: targetResult.value,
      multiplicity: rawMultiplicity as RelationMultiplicity,
      optional: rawOptional,
      nullable: rawNullable,
      direction: rawDirection as RelationDirection,
      onDelete: rawOnDelete as CascadePolicy,
      onUpdate: rawOnUpdate as CascadePolicy,
      fetch: rawFetch as FetchPolicy,
      ...(inverse !== undefined ? { inverse } : {}),
      ...(join !== undefined ? { join } : {}),
    };
    accepted.push(relation);
  }

  return ok(accepted);
}

/**
 * Internal: freeze an ordered sequence of already-validated Relations.
 * MUST NOT accept raw candidates, discard unknown properties, invent optional,
 * nullable, direction, onDelete, onUpdate, fetch, inverse, or join.
 */
export function snapshotRelations(
  relations: readonly Relation[],
): ReadonlyArray<Relation> {
  return Object.freeze(
    relations.map((relation) => {
      const snapshot: {
        name: RelationName;
        target: { namespace: string; name: string };
        multiplicity: RelationMultiplicity;
        optional: boolean;
        nullable: boolean;
        direction: RelationDirection;
        onDelete: CascadePolicy;
        onUpdate: CascadePolicy;
        fetch: FetchPolicy;
        inverse?: RelationName;
        join?: RelationJoin;
      } = {
        name: relation.name,
        target: Object.freeze({
          namespace: relation.target.namespace,
          name: relation.target.name,
        }),
        multiplicity: relation.multiplicity,
        optional: relation.optional,
        nullable: relation.nullable,
        direction: relation.direction,
        onDelete: relation.onDelete,
        onUpdate: relation.onUpdate,
        fetch: relation.fetch,
      };
      if (relation.inverse !== undefined) {
        snapshot.inverse = relation.inverse;
      }
      if (relation.join !== undefined) {
        snapshot.join = Object.freeze({
          local: relation.join.local,
          remote: relation.join.remote,
        });
      }
      return Object.freeze(snapshot);
    }),
  );
}

/**
 * Internal / test-only: order-sensitive Relation sequence equality
 * (name, target, multiplicity, optional, nullable, direction, onDelete,
 * onUpdate, fetch, inverse, join).
 */
export function relationsEqual(
  left: readonly Relation[],
  right: readonly Relation[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let i = 0; i < left.length; i += 1) {
    const l = left[i]!;
    const r = right[i]!;
    if (l.name !== r.name) {
      return false;
    }
    if (!resourceIdentitiesEqual(l.target, r.target)) {
      return false;
    }
    if (l.multiplicity !== r.multiplicity) {
      return false;
    }
    if (l.optional !== r.optional) {
      return false;
    }
    if (l.nullable !== r.nullable) {
      return false;
    }
    if (l.direction !== r.direction) {
      return false;
    }
    if (l.onDelete !== r.onDelete) {
      return false;
    }
    if (l.onUpdate !== r.onUpdate) {
      return false;
    }
    if (l.fetch !== r.fetch) {
      return false;
    }
    if (l.inverse !== r.inverse) {
      return false;
    }
    const lJoin = l.join;
    const rJoin = r.join;
    if (lJoin === undefined || rJoin === undefined) {
      if (lJoin !== rJoin) {
        return false;
      }
    } else if (lJoin.local !== rJoin.local || lJoin.remote !== rJoin.remote) {
      return false;
    }
  }
  return true;
}
