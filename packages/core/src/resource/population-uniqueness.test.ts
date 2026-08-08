import { describe, expect, it, vi } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { checkConstraintValues } from './constraint-values.js';
import { createResourceWithConstraintsForTests } from './create-resource-with-constraints.js';
import { checkPopulationUniqueness } from './population-uniqueness.js';
import type {
  ConstraintEnforcementError,
  FieldRuntimeValue,
  MissingOccupancyError,
  OccupancyProvider,
  OccupancySurface,
  Resource,
  UniquenessKey,
} from './types.js';

const emailField = {
  name: 'email',
  type: 'string' as const,
  optional: false,
  nullable: false,
};
const usernameField = {
  name: 'username',
  type: 'string' as const,
  optional: false,
  nullable: false,
};
const tenantField = {
  name: 'tenantId',
  type: 'string' as const,
  optional: false,
  nullable: false,
};
const sequenceField = {
  name: 'sequence',
  type: 'number' as const,
  optional: false,
  nullable: false,
};
const nicknameField = {
  name: 'nickname',
  type: 'string' as const,
  optional: true,
  nullable: false,
};

function requireResource(
  result: { ok: true; value: Resource } | { ok: false; error: unknown },
): Resource {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('expected declaration-valid Resource');
  }
  return result.value;
}

function mapOf(
  entries: ReadonlyArray<readonly [string, FieldRuntimeValue]>,
): Map<string, FieldRuntimeValue> {
  return new Map(entries);
}

function resourceWith(
  constraints: readonly object[],
  fields: readonly object[],
): Resource {
  const identity = createResourceIdentity('crm', 'User');
  expect(identity.ok).toBe(true);
  if (!identity.ok) {
    throw new Error('identity');
  }
  return requireResource(
    createResourceWithConstraintsForTests(
      identity.value,
      constraints,
      undefined,
      fields,
    ),
  );
}

/** Host/test helper: structural §7.5 equality — not ECMAScript Set identity. */
function keysEqual(left: UniquenessKey, right: UniquenessKey): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }
    if (left.length !== right.length) {
      return false;
    }
    for (let i = 0; i < left.length; i += 1) {
      if (left[i] !== right[i]) {
        return false;
      }
    }
    return true;
  }
  return left === right;
}

function occupancyFromKeys(
  occupied: ReadonlyArray<UniquenessKey>,
): OccupancySurface {
  return {
    isOccupied(key) {
      for (const candidate of occupied) {
        if (keysEqual(candidate, key)) {
          return true;
        }
      }
      return false;
    },
  };
}

function providerFor(
  byName: ReadonlyMap<string, OccupancySurface | undefined>,
): OccupancyProvider {
  return (constraint) => byName.get(constraint.name);
}

describe('RFC-020 checkPopulationUniqueness', () => {
  it('passes and fails single-field unique via occupancy', () => {
    const resource = resourceWith(
      [{ name: 'emailUnique', kind: 'unique', field: 'email' }],
      [emailField],
    );
    const provider = providerFor(
      new Map([['emailUnique', occupancyFromKeys(['a@x'])]]),
    );

    expect(
      checkPopulationUniqueness(
        resource,
        mapOf([['email', 'b@x']]),
        provider,
      ),
    ).toEqual({ ok: true, value: undefined });

    const occupied = checkPopulationUniqueness(
      resource,
      mapOf([['email', 'a@x']]),
      provider,
    );
    expect(occupied.ok).toBe(false);
    if (!occupied.ok) {
      expect(occupied.error).toEqual({
        code: 'unique_constraint_violated',
        index: 0,
        constraintName: 'emailUnique',
        field: 'email',
      });
    }
  });

  it('keeps occupancy scopes independent per unique Constraint', () => {
    const resource = resourceWith(
      [
        { name: 'emailUnique', kind: 'unique', field: 'email' },
        { name: 'usernameUnique', kind: 'unique', field: 'username' },
      ],
      [emailField, usernameField],
    );
    const provider = providerFor(
      new Map([
        ['emailUnique', occupancyFromKeys(['a@x'])],
        ['usernameUnique', occupancyFromKeys(['neo'])],
      ]),
    );

    expect(
      checkPopulationUniqueness(
        resource,
        mapOf([
          ['email', 'b@x'],
          ['username', 'trinity'],
        ]),
        provider,
      ).ok,
    ).toBe(true);

    const emailClash = checkPopulationUniqueness(
      resource,
      mapOf([
        ['email', 'a@x'],
        ['username', 'trinity'],
      ]),
      provider,
    );
    expect(emailClash.ok).toBe(false);
    if (!emailClash.ok) {
      expect(emailClash.error).toMatchObject({
        code: 'unique_constraint_violated',
        constraintName: 'emailUnique',
      });
    }
  });

  it('supports heterogeneous composite keys with structural equality', () => {
    const resource = resourceWith(
      [
        {
          name: 'tenantSeq',
          kind: 'unique',
          fields: ['tenantId', 'sequence'],
        },
      ],
      [tenantField, sequenceField],
    );
    const occupiedTuple: UniquenessKey = ['acme', 42];
    const provider = providerFor(
      new Map([['tenantSeq', occupancyFromKeys([occupiedTuple])]]),
    );

    expect(
      checkPopulationUniqueness(
        resource,
        mapOf([
          ['tenantId', 'acme'],
          ['sequence', 7],
        ]),
        provider,
      ).ok,
    ).toBe(true);

    const clash = checkPopulationUniqueness(
      resource,
      mapOf([
        ['tenantId', 'acme'],
        ['sequence', 42],
      ]),
      provider,
    );
    expect(clash.ok).toBe(false);
    if (!clash.ok) {
      expect(clash.error).toEqual({
        code: 'unique_constraint_violated',
        index: 0,
        constraintName: 'tenantSeq',
        field: 'tenantId',
      });
    }

    // Host helper must not treat string "42" as number 42.
    expect(keysEqual(['42', 7], [42, 7])).toBe(false);
  });

  it('skips optional absent without requesting provider', () => {
    const resource = resourceWith(
      [{ name: 'nickUnique', kind: 'unique', field: 'nickname' }],
      [nicknameField],
    );
    const isOccupied = vi.fn(() => true);
    const provider: OccupancyProvider = () => ({ isOccupied });

    expect(
      checkPopulationUniqueness(resource, mapOf([]), provider),
    ).toEqual({ ok: true, value: undefined });
    expect(isOccupied).not.toHaveBeenCalled();
    expect(
      checkConstraintValues(resource, mapOf([])).ok,
    ).toBe(true);
  });

  it('fails required-absent gate without requesting provider', () => {
    const resource = resourceWith(
      [{ name: 'emailUnique', kind: 'unique', field: 'email' }],
      [emailField],
    );
    const isOccupied = vi.fn(() => false);
    const provider: OccupancyProvider = () => ({ isOccupied });

    const result = checkPopulationUniqueness(resource, mapOf([]), provider);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        code: 'missing_required_field_value',
        index: 0,
        constraintName: 'emailUnique',
        field: 'email',
      });
    }
    expect(isOccupied).not.toHaveBeenCalled();
  });

  it('reports missing occupancy as invalid invocation, not unique-violated', () => {
    const resource = resourceWith(
      [{ name: 'emailUnique', kind: 'unique', field: 'email' }],
      [emailField],
    );
    const provider: OccupancyProvider = () => undefined;

    const result = checkPopulationUniqueness(
      resource,
      mapOf([['email', 'foo']]),
      provider,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const error = result.error as MissingOccupancyError;
      expect(error).toEqual({
        code: 'missing_occupancy_surface',
        index: 0,
        constraintName: 'emailUnique',
      });
      expect(error.code).not.toBe('unique_constraint_violated');
    }

    const enforcementOnly: ConstraintEnforcementError = {
      code: 'unique_constraint_violated',
      index: 0,
      constraintName: 'emailUnique',
      field: 'email',
    };
    expect(enforcementOnly.code).not.toBe('missing_occupancy_surface');
  });

  it('fail-fast across unique Constraints and skips non-unique kinds', () => {
    const resource = resourceWith(
      [
        { name: 'emailUnique', kind: 'unique', field: 'email' },
        {
          name: 'rangeTotal',
          kind: 'range',
          field: 'sequence',
          min: 0,
          max: 10,
        },
        { name: 'usernameUnique', kind: 'unique', field: 'username' },
      ],
      [emailField, usernameField, sequenceField],
    );
    const provider = providerFor(
      new Map([
        ['emailUnique', occupancyFromKeys(['taken@x'])],
        ['usernameUnique', occupancyFromKeys(['neo'])],
      ]),
    );

    const result = checkPopulationUniqueness(
      resource,
      mapOf([
        ['email', 'taken@x'],
        ['username', 'neo'],
        ['sequence', 100],
      ]),
      provider,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({
        code: 'unique_constraint_violated',
        constraintName: 'emailUnique',
        index: 0,
      });
    }
  });

  it('returns ok for empty constraints and does not mutate inputs', () => {
    const resource = resourceWith([], [emailField]);
    const values = mapOf([['email', 'a@x']]);
    const provider = vi.fn<OccupancyProvider>(() => undefined);
    const frozenResource = structuredClone(resource);
    const frozenValues = new Map(values);

    expect(checkPopulationUniqueness(resource, values, provider)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(provider).not.toHaveBeenCalled();
    expect(resource).toEqual(frozenResource);
    expect(values).toEqual(frozenValues);
  });

  it('checkConstraintValues skips unique without requiring occupancy', () => {
    const resource = resourceWith(
      [
        { name: 'emailUnique', kind: 'unique', field: 'email' },
        {
          name: 'statusEnum',
          kind: 'enum',
          field: 'username',
          values: ['open', 'closed'],
        },
      ],
      [emailField, usernameField],
    );

    expect(
      checkConstraintValues(
        resource,
        mapOf([
          ['email', 'a@x'],
          ['username', 'open'],
        ]),
      ),
    ).toEqual({ ok: true, value: undefined });

    const enumFail = checkConstraintValues(
      resource,
      mapOf([
        ['email', 'a@x'],
        ['username', 'nope'],
      ]),
    );
    expect(enumFail.ok).toBe(false);
    if (!enumFail.ok) {
      expect(enumFail.error.code).toBe('enum_constraint_violated');
    }
  });
});
