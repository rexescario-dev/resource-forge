# M2.4 Extension Composition — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-004. Reuse M2.1/M2.2 validators, factories, and `Result` helpers — do not invent a parallel outcome model. Do not mutate the registry from composition.

**Status:** Accepted  
**Parent plan:** `docs/superpowers/plans/2026-08-06-m2-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-004 Extension Model (Accepted); depends on RFC-001 / M2.1, RFC-002 / M2.2  
**Package:** `@resource-forge/core`  
**Slice:** M2.4 only — no NestJS / GraphQL / Prisma / discovery / producer callables

**Goal:** Implement pure metadata composition in `@resource-forge/core`: contribution data in, one immutable `ResourceMetadata` or a distinguishable `CompositionError` out — proving RFC-004 invariants with Vitest.

**Architecture:** Composition is a single free function over `ResourceIdentity` + an unordered multiset of immutable `Contribution` values (each tagged with producer `kind` and namespace partitions). No producer callables, no registry side effects. Pipeline stages (validate → authorize `rf` → ownership → assemble) may be private helpers; only the public barrel is a contract. Final snapshots are built via existing `createMetadataKey` / `createResourceMetadata`.

**Tech Stack:** TypeScript strict, Vitest (existing `packages/core` scripts)

---

## Locked decisions (export review)

| Decision | Lock |
| --- | --- |
| Input model | Contribution **data only** — no producer callables in core |
| Entry point | `composeResourceMetadata(identity, contributions)` free function |
| Outcome | `Result<ResourceMetadata, CompositionError>` via existing `Result` / `ok` / `err` |
| Producer role | Explicit `kind: 'framework' \| 'extension'` on each `Contribution` |
| Partitions | `ReadonlyArray<NamespacePartition>`; entries are local `{ name, value }` |
| Intra-contribution duplicate namespace | `invalid_contribution` (malformed contribution) |
| Cross-contribution ownership clash | `duplicate_namespace` (including two framework `rf` owners) |
| Extension + `rf` | `reserved_namespace_violation` (authorization; orthogonal to ownership) |
| Error shape | Flat `CompositionError` codes; index-aware diagnostics; `contributionIndices` arrays |
| Key grammar | Reuse `MetadataKeyValidationError` nested under `invalid_key` — **do not mirror** key codes |
| Step 5 assemble failures | Internal assertion (`assertNever` / `unreachable`) after steps 1–4 — never invent user-facing recovery |
| Public validate-only API | **Not** exported |
| Compose-and-register | **Not** in M2.4 |
| Array typing style | Prefer `ReadonlyArray<T>` (matches M2.1–M2.3) |

### Failure precedence (first failure wins)

1. `invalid_identity`
2. `invalid_contribution` (scan contributions in index order)
3. `reserved_namespace_violation` (after structural validity of the offending contribution)
4. `duplicate_namespace`
5. assemble → `ResourceMetadata`

---

## M2.4 public contract surface

| Symbol | Kind | Role |
| --- | --- | --- |
| `ProducerKind` | type | `'framework' \| 'extension'` |
| `ContributionEntry` | type | Pre-composition `{ name, value }` |
| `NamespacePartition` | type | `{ namespace, entries }` |
| `Contribution` | type | `{ kind, partitions }` |
| `ContributionValidationError` | type | Nested cause for `invalid_contribution` |
| `CompositionError` | type | Flat composition failure union |
| `composeResourceMetadata` | function | Pure composition entry point |

**Not public in M2.4:**

- producer callables / discovery / loading
- `validateContributions` (or any validate-only public helper)
- compose-and-register helpers
- private pipeline helper modules
- concrete `rf` key catalog
- Nest / GraphQL / Prisma adapters

### Types

```ts
type ProducerKind = 'framework' | 'extension';

type ContributionEntry = {
  readonly name: string;
  readonly value: JsonValue;
};

type NamespacePartition = {
  readonly namespace: string;
  readonly entries: ReadonlyArray<ContributionEntry>;
};

type Contribution = {
  readonly kind: ProducerKind;
  readonly partitions: ReadonlyArray<NamespacePartition>;
};

type ContributionValidationError =
  | {
      readonly code: 'invalid_kind';
      readonly kind: unknown;
    }
  | {
      readonly code: 'duplicate_partition_namespace';
      readonly namespace: string;
      readonly partitionIndices: ReadonlyArray<number>;
    }
  | {
      readonly code: 'duplicate_entry_name';
      readonly name: string;
      readonly entryIndices: ReadonlyArray<number>;
    }
  | {
      readonly code: 'invalid_key';
      readonly entryIndex?: number;
      readonly cause: MetadataKeyValidationError;
    }
  | {
      readonly code: 'invalid_json_value';
      readonly entryIndex: number;
      readonly cause: JsonValueValidationError;
    };

type CompositionError =
  | {
      readonly code: 'invalid_identity';
      readonly cause: IdentityValidationError;
    }
  | {
      readonly code: 'invalid_contribution';
      readonly contributionIndex: number;
      readonly partitionIndex?: number;
      readonly cause: ContributionValidationError;
    }
  | {
      readonly code: 'reserved_namespace_violation';
      readonly contributionIndex: number;
      readonly partitionIndex: number;
    }
  | {
      readonly code: 'duplicate_namespace';
      readonly namespace: string;
      readonly contributionIndices: ReadonlyArray<number>;
    };
```

### Function

```ts
composeResourceMetadata(
  identity: ResourceIdentity,
  contributions: ReadonlyArray<Contribution>,
): Result<ResourceMetadata, CompositionError>
```

### Behavioral rules (normative for this plan)

1. **Validate identity** with M2.1; kind = `identity.namespace === 'rf' ? 'framework' : 'user'`. Fail → `invalid_identity`.
2. **Validate each contribution** in ascending index order:
   - Runtime-check `kind` is `'framework'` or `'extension'` (reject other strings via cast/unknown input) → `invalid_kind`.
   - Detect duplicate `namespace` among partitions → `duplicate_partition_namespace` with `partitionIndices`.
   - For each partition, validate namespace/entry names via `validateMetadataKey` / `createMetadataKey` with **grammar kind** `partition.namespace === 'rf' ? 'framework' : 'extension'`. This does **not** authorize extension `rf` ownership.
   - Empty partitions are allowed; still validate the partition `namespace` (implementation detail: probe with a throwaway valid entry name such as `'a'` used only for namespace validation). The probe key is never observable and must not become part of the composed metadata.
   - Validate each entry `value` with `validateJsonValue`.
   - Detect duplicate local `name` within a partition → `duplicate_entry_name`.
   - Failures → `invalid_contribution` with indices + nested `cause`.
3. **Authorize `rf`:** if `contribution.kind === 'extension'` and any partition has `namespace === 'rf'` → `reserved_namespace_violation` for that contribution/partition index. Prefer the lowest partition index when multiple `rf` partitions exist on the same contribution (should already be impossible after step 2 duplicate-partition check).
4. **Exclusive ownership:** scan contributions in index order and partitions in partition order; record namespace → contribution indices. The reported `duplicate_namespace` is the **first ownership conflict encountered during that deterministic scan**, with sorted ascending `contributionIndices`. Includes two framework contributions both owning `rf`.
5. **Assemble:** flatten all partitions into `MetadataEntry[]` via `createMetadataKey(ns, name, { kind: ns === 'rf' ? 'framework' : 'extension' })`, then `createResourceMetadata(identity, entries)`. After steps 1–4, assemble must succeed; if it fails, fail via an internal assertion (`assertNever` / `unreachable`) — do not invent a new user-facing recovery path or fabricated `CompositionError`.
6. **Empty inputs:** empty `contributions` array, or contributions that all have empty `partitions`, succeed with empty-entry metadata.
7. **Purity:** no registry import/use inside composition. Order of contributions affects diagnostic indices only; success payloads are order-independent under `resourceMetadataEqual`.

**Note on `MetadataKeyValidationError.reserved_namespace`:** Extension + `rf` must surface as top-level `reserved_namespace_violation`, not as `invalid_contribution` with nested `reserved_namespace`. Grammar validation intentionally uses namespace-derived kind so authorization stays in step 3.

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/core/src/extension/types.ts` | Public contribution + error types |
| `packages/core/src/extension/compose.ts` | `composeResourceMetadata` (+ private helpers OK in-file or sibling) |
| `packages/core/src/extension/index.ts` | Public barrel |
| `packages/core/src/extension/compose.test.ts` | RFC-004 invariant tests |
| `packages/core/src/extension/types.test.ts` | Lightweight type-surface checks (imports compile, discriminants exist, export names stable) — not runtime proofs of type-level properties |
| `packages/core/src/index.ts` | Re-export extension surface |
| `packages/core/src/index.test.ts` | Package smoke including compose |
| `packages/core/README.md` | Document M2.4 exports |

Private helper files (`validate.ts`, `ownership.ts`, …) are optional implementation details — not public contracts.

Reuse `result.ts`, identity, and metadata APIs. Do not add Nest/GraphQL/Prisma code.

---

### Task 1: Extension types + barrel

**Files:**
- Create: `packages/core/src/extension/types.ts`
- Create: `packages/core/src/extension/index.ts`
- Create: `packages/core/src/extension/types.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing type-surface test**

Create `packages/core/src/extension/types.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type {
  CompositionError,
  Contribution,
  ContributionValidationError,
  NamespacePartition,
  ProducerKind,
} from './types.js';

describe('extension types', () => {
  it('models contribution partitions', () => {
    const kind: ProducerKind = 'extension';
    const partition: NamespacePartition = {
      namespace: 'graphql',
      entries: [{ name: 'typeName', value: 'Customer' }],
    };
    const contribution: Contribution = {
      kind,
      partitions: [partition],
    };
    expect(contribution.partitions).toHaveLength(1);
  });

  it('keeps CompositionError codes distinguishable', () => {
    const errors: CompositionError[] = [
      {
        code: 'invalid_identity',
        cause: { code: 'invalid_namespace', namespace: 'CRM' },
      },
      {
        code: 'invalid_contribution',
        contributionIndex: 0,
        cause: { code: 'invalid_kind', kind: 'other' },
      },
      {
        code: 'reserved_namespace_violation',
        contributionIndex: 0,
        partitionIndex: 0,
      },
      {
        code: 'duplicate_namespace',
        namespace: 'graphql',
        contributionIndices: [0, 1],
      },
    ];
    expect(errors).toHaveLength(4);
  });

  it('nests MetadataKeyValidationError under invalid_key', () => {
    const cause: ContributionValidationError = {
      code: 'invalid_key',
      entryIndex: 0,
      cause: { code: 'invalid_name', name: 'TypeName' },
    };
    expect(cause.code).toBe('invalid_key');
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (module missing)

```bash
pnpm --filter @resource-forge/core test -- src/extension/types.test.ts
```

Expected: FAIL — cannot find module / exports.

- [ ] **Step 3: Implement types + barrels + package re-exports**

`packages/core/src/extension/types.ts` — implement the types from **M2.4 public contract surface** above (import `IdentityValidationError`, `JsonValue`, `JsonValueValidationError`, `MetadataKeyValidationError` from identity/metadata).

`packages/core/src/extension/index.ts`:

```ts
export type {
  CompositionError,
  Contribution,
  ContributionEntry,
  ContributionValidationError,
  NamespacePartition,
  ProducerKind,
} from './types.js';
```

Append to `packages/core/src/index.ts`:

```ts
export type {
  CompositionError,
  Contribution,
  ContributionEntry,
  ContributionValidationError,
  NamespacePartition,
  ProducerKind,
} from './extension/index.js';
```

(Do not export `composeResourceMetadata` until Task 2.)

- [ ] **Step 4: Tests PASS; commit**

```bash
pnpm --filter @resource-forge/core test -- src/extension/types.test.ts
```

```bash
git add packages/core/src/extension/types.ts \
  packages/core/src/extension/index.ts \
  packages/core/src/extension/types.test.ts \
  packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): add M2.4 extension composition types

EOF
)"
```

---

### Task 2: Empty composition + invalid identity

**Files:**
- Create: `packages/core/src/extension/compose.ts`
- Create: `packages/core/src/extension/compose.test.ts`
- Modify: `packages/core/src/extension/index.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/core/src/extension/compose.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/create.js';
import { resourceMetadataEqual } from '../metadata/equal.js';
import { composeResourceMetadata } from './compose.js';

describe('composeResourceMetadata', () => {
  it('composes empty contributions into empty-entry metadata', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = composeResourceMetadata(identity.value, []);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(
      resourceMetadataEqual(result.value, {
        identity: identity.value,
        entries: [],
      }),
    ).toBe(true);
  });

  it('rejects invalid identity', () => {
    const result = composeResourceMetadata(
      { namespace: 'CRM', name: 'Customer' },
      [],
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe('invalid_identity');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm --filter @resource-forge/core test -- src/extension/compose.test.ts
```

- [ ] **Step 3: Implement minimal compose (identity + empty assemble)**

`packages/core/src/extension/compose.ts`:

```ts
import type { ResourceIdentity } from '../identity/types.js';
import { validateResourceIdentity } from '../identity/validate.js';
import { createResourceMetadata } from '../metadata/create.js';
import type { ResourceMetadata } from '../metadata/types.js';
import type { Result } from '../result.js';
import { err, ok } from '../result.js';
import type { CompositionError, Contribution } from './types.js';

export function composeResourceMetadata(
  identity: ResourceIdentity,
  contributions: ReadonlyArray<Contribution>,
): Result<ResourceMetadata, CompositionError> {
  const identityKind = identity.namespace === 'rf' ? 'framework' : 'user';
  const validatedIdentity = validateResourceIdentity(identity, {
    kind: identityKind,
  });
  if (!validatedIdentity.ok) {
    return err({
      code: 'invalid_identity',
      cause: validatedIdentity.error,
    });
  }

  // Later tasks fill contribution validation / ownership.
  void contributions;

  const metadata = createResourceMetadata(validatedIdentity.value, []);
  if (!metadata.ok) {
    throw new Error(
      'composeResourceMetadata: unreachable metadata failure after validation',
    );
  }
  return ok(metadata.value);
}
```

Export `composeResourceMetadata` from `extension/index.ts` and `packages/core/src/index.ts`. (Task 2 only handles identity + empty assemble; later tasks must keep every public revision returning typed `Result` for user input — never throw on invalid contributions.)

- [ ] **Step 4: Tests PASS; commit**

```bash
pnpm --filter @resource-forge/core test -- src/extension/compose.test.ts
```

```bash
git add packages/core/src/extension/compose.ts \
  packages/core/src/extension/compose.test.ts \
  packages/core/src/extension/index.ts \
  packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): compose empty metadata and reject invalid identity

EOF
)"
```

---

### Task 3: Happy path with structural validation

**Files:**
- Modify: `packages/core/src/extension/compose.ts`
- Modify: `packages/core/src/extension/compose.test.ts`

**Requirement:** This commit must preserve the public `Result` contract for user input. Do **not** introduce an intermediate revision where invalid keys/values throw invariant errors. Implement algorithm step 2 (structural contribution validation) + assemble here; Task 4 expands diagnostic coverage with explicit failure tests. `reserved_namespace_violation` and `duplicate_namespace` may wait until Tasks 5–6.

- [ ] **Step 1: Write failing tests**

Append to `compose.test.ts`:

```ts
  it('unions disjoint namespace partitions', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = composeResourceMetadata(identity.value, [
      {
        kind: 'framework',
        partitions: [
          {
            namespace: 'rf',
            entries: [{ name: 'description', value: 'CRM customer' }],
          },
        ],
      },
      {
        kind: 'extension',
        partitions: [
          {
            namespace: 'graphql',
            entries: [{ name: 'typeName', value: 'Customer' }],
          },
        ],
      },
      {
        kind: 'extension',
        partitions: [],
      },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const rfKey = createMetadataKey('rf', 'description', { kind: 'framework' });
    const gqlKey = createMetadataKey('graphql', 'typeName');
    expect(rfKey.ok && gqlKey.ok).toBe(true);
    if (!rfKey.ok || !gqlKey.ok) {
      return;
    }

    expect(
      resourceMetadataEqual(result.value, {
        identity: identity.value,
        entries: [
          { key: rfKey.value, value: 'CRM customer' },
          { key: gqlKey.value, value: 'Customer' },
        ],
      }),
    ).toBe(true);
  });

  it('treats empty contribution partitions as a no-op', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const withEmpty = composeResourceMetadata(identity.value, [
      { kind: 'extension', partitions: [] },
    ]);
    const without = composeResourceMetadata(identity.value, []);
    expect(withEmpty.ok && without.ok).toBe(true);
    if (!withEmpty.ok || !without.ok) {
      return;
    }
    expect(resourceMetadataEqual(withEmpty.value, without.value)).toBe(true);
  });
```

Add `createMetadataKey` import from metadata.

- [ ] **Step 2: Run — expect FAIL** (empty assemble ignores partitions)

- [ ] **Step 3: Implement structural validation + assemble**

In `compose.ts`, after identity validation:

1. Validate each contribution (algorithm step 2): `kind`, duplicate partition namespaces, key grammar via `validateMetadataKey` / `createMetadataKey`, `validateJsonValue`, duplicate entry names. Empty-partition namespace probe with `'a'` is an implementation detail — never observable in the snapshot.
2. On any structural failure, return `err({ code: 'invalid_contribution', … })` — never throw for user input.
3. Assemble validated partitions into `MetadataEntry[]`, then `createResourceMetadata`. Assemble failure after successful validation → internal assertion only.

Sketch (validation helpers may be private functions in-file or siblings):

```ts
import { createMetadataKey } from '../metadata/key.js';
import { validateJsonValue } from '../metadata/json-value.js';
import { validateMetadataKey } from '../metadata/key.js';
import type { MetadataEntry } from '../metadata/types.js';

// after identity OK — pseudostructure:
for (let contributionIndex = 0; contributionIndex < contributions.length; contributionIndex += 1) {
  const contribution = contributions[contributionIndex]!;
  // validate kind, partitions, keys, values → return err(invalid_contribution) on failure
}

const entries: MetadataEntry[] = [];
for (const contribution of contributions) {
  for (const partition of contribution.partitions) {
    const keyKind = partition.namespace === 'rf' ? 'framework' : 'extension';
    for (const entry of partition.entries) {
      const key = createMetadataKey(partition.namespace, entry.name, {
        kind: keyKind,
      });
      if (!key.ok) {
        throw new Error(
          'composeResourceMetadata: unreachable key failure after validation',
        );
      }
      entries.push({ key: key.value, value: entry.value });
    }
  }
}

const metadata = createResourceMetadata(validatedIdentity.value, entries);
if (!metadata.ok) {
  throw new Error(
    'composeResourceMetadata: unreachable metadata failure after validation',
  );
}
return ok(metadata.value);
```

Task 4 adds explicit tests for each `ContributionValidationError` code; the validation implementation itself belongs in this task so the happy-path commit never throws on bad keys/values.

- [ ] **Step 4: Tests PASS; commit**

```bash
pnpm --filter @resource-forge/core test -- src/extension/compose.test.ts
```

```bash
git add packages/core/src/extension/compose.ts \
  packages/core/src/extension/compose.test.ts
git commit -m "$(cat <<'EOF'
feat(core): compose partitions with structural contribution validation

EOF
)"
```

---

### Task 4: Contribution validation failure coverage

**Files:**
- Modify: `packages/core/src/extension/compose.ts` (diagnostics only if gaps remain)
- Modify: `packages/core/src/extension/compose.test.ts`

Cover every public `ContributionValidationError` code with explicit tests (validation logic should already exist from Task 3):

- [ ] **Step 1: Write failing tests**

```ts
  it('rejects invalid producer kind', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = composeResourceMetadata(identity.value, [
      {
        kind: 'other' as unknown as 'extension',
        partitions: [],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toEqual({
      code: 'invalid_contribution',
      contributionIndex: 0,
      cause: { code: 'invalid_kind', kind: 'other' },
    });
  });

  it('rejects duplicate partition namespaces inside one contribution', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = composeResourceMetadata(identity.value, [
      {
        kind: 'extension',
        partitions: [
          { namespace: 'graphql', entries: [] },
          { namespace: 'graphql', entries: [] },
        ],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe('invalid_contribution');
    if (result.error.code !== 'invalid_contribution') {
      return;
    }
    expect(result.error.contributionIndex).toBe(0);
    expect(result.error.cause).toEqual({
      code: 'duplicate_partition_namespace',
      namespace: 'graphql',
      partitionIndices: [0, 1],
    });
  });

  it('rejects duplicate entry names inside one partition', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = composeResourceMetadata(identity.value, [
      {
        kind: 'extension',
        partitions: [
          {
            namespace: 'graphql',
            entries: [
              { name: 'typeName', value: 'A' },
              { name: 'typeName', value: 'B' },
            ],
          },
        ],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe('invalid_contribution');
    if (result.error.code !== 'invalid_contribution') {
      return;
    }
    expect(result.error.partitionIndex).toBe(0);
    expect(result.error.cause).toEqual({
      code: 'duplicate_entry_name',
      name: 'typeName',
      entryIndices: [0, 1],
    });
  });

  it('surfaces invalid json values as invalid_contribution', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = composeResourceMetadata(identity.value, [
      {
        kind: 'extension',
        partitions: [
          {
            namespace: 'graphql',
            entries: [
              {
                name: 'typeName',
                value: undefined as unknown as string,
              },
            ],
          },
        ],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe('invalid_contribution');
    if (result.error.code !== 'invalid_contribution') {
      return;
    }
    expect(result.error.cause.code).toBe('invalid_json_value');
  });

  it('wraps MetadataKeyValidationError under invalid_key', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = composeResourceMetadata(identity.value, [
      {
        kind: 'extension',
        partitions: [
          {
            namespace: 'GraphQL',
            entries: [{ name: 'typeName', value: 'Customer' }],
          },
        ],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe('invalid_contribution');
    if (result.error.code !== 'invalid_contribution') {
      return;
    }
    expect(result.error.cause).toEqual({
      code: 'invalid_key',
      cause: { code: 'invalid_namespace', namespace: 'GraphQL' },
    });
  });
```

- [ ] **Step 2: Run — expect FAIL** only where Task 3 validation/diagnostics are incomplete; otherwise expect PASS and tighten assertions/payloads as needed.

- [ ] **Step 3: Fill any diagnostic gaps**

Confirm Task 3 validation returns the exact payloads in these tests:

1. `kind` not `'framework'` / `'extension'` → `invalid_kind`.
2. Duplicate partition namespaces → `duplicate_partition_namespace` with `partitionIndices`.
3. Key failures → `invalid_key` wrapping `MetadataKeyValidationError` (`entryIndex` when attributable; omit for empty-partition namespace probes).
4. Value failures → `invalid_json_value` with `entryIndex` and `cause`.
5. Duplicate entry names → `duplicate_entry_name` with `entryIndices`.
6. `partitionIndex` set when the failure is partition-scoped.

Scan order remains: kind → partition namespace uniqueness → per-partition entries. No duplicated M2.1/M2.2 grammar — reuse validators/factories only.

- [ ] **Step 4: Tests PASS; commit**

```bash
pnpm --filter @resource-forge/core test -- src/extension/compose.test.ts
```

```bash
git add packages/core/src/extension/compose.ts \
  packages/core/src/extension/compose.test.ts
git commit -m "$(cat <<'EOF'
test(core): cover composition contribution validation error codes

EOF
)"
```

---

### Task 5: Reserved namespace violation

**Files:**
- Modify: `packages/core/src/extension/compose.ts`
- Modify: `packages/core/src/extension/compose.test.ts`

- [ ] **Step 1: Write failing test**

```ts
  it('rejects extension contributions that include rf', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = composeResourceMetadata(identity.value, [
      {
        kind: 'extension',
        partitions: [
          {
            namespace: 'rf',
            entries: [{ name: 'description', value: 'nope' }],
          },
        ],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toEqual({
      code: 'reserved_namespace_violation',
      contributionIndex: 0,
      partitionIndex: 0,
    });
  });
```

- [ ] **Step 2: Run — expect FAIL** (today this may incorrectly succeed via grammar kind `framework`)

- [ ] **Step 3: After structural validation of all contributions (or after each), enforce step 3**

For each contribution with `kind === 'extension'`, if any partition namespace is `'rf'`, return `reserved_namespace_violation`. Do **not** convert this into `invalid_contribution` / `reserved_namespace` key errors.

- [ ] **Step 4: Tests PASS; commit**

```bash
git add packages/core/src/extension/compose.ts \
  packages/core/src/extension/compose.test.ts
git commit -m "$(cat <<'EOF'
feat(core): reject extension rf contributions during compose

EOF
)"
```

---

### Task 6: Duplicate namespace ownership

**Files:**
- Modify: `packages/core/src/extension/compose.ts`
- Modify: `packages/core/src/extension/compose.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
  it('rejects cross-contribution duplicate namespaces', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = composeResourceMetadata(identity.value, [
      {
        kind: 'extension',
        partitions: [
          {
            namespace: 'graphql',
            entries: [{ name: 'typeName', value: 'Customer' }],
          },
        ],
      },
      {
        kind: 'extension',
        partitions: [
          {
            namespace: 'graphql',
            entries: [{ name: 'typeName', value: 'CrmCustomer' }],
          },
        ],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toEqual({
      code: 'duplicate_namespace',
      namespace: 'graphql',
      contributionIndices: [0, 1],
    });
  });

  it('rejects two framework contributions both owning rf as duplicate_namespace', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const result = composeResourceMetadata(identity.value, [
      {
        kind: 'framework',
        partitions: [
          {
            namespace: 'rf',
            entries: [{ name: 'description', value: 'a' }],
          },
        ],
      },
      {
        kind: 'framework',
        partitions: [
          {
            namespace: 'rf',
            entries: [{ name: 'description', value: 'b' }],
          },
        ],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toEqual({
      code: 'duplicate_namespace',
      namespace: 'rf',
      contributionIndices: [0, 1],
    });
  });
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement ownership check (algorithm step 4) before assemble**

Scan contributions in ascending index order and partitions in partition order, recording namespace → contribution indices. When a partition’s namespace is already owned by a different contribution, that is the reported conflict: return `duplicate_namespace` with that `namespace` and sorted ascending `contributionIndices` for all claimants seen so far (at least the prior owner and the current index). The reported duplicate namespace is the **first ownership conflict encountered during that deterministic contribution/partition scan** — do not sort namespace strings or rely on `Map` iteration order to choose which conflict to report.

- [ ] **Step 4: Tests PASS; commit**

```bash
git add packages/core/src/extension/compose.ts \
  packages/core/src/extension/compose.test.ts
git commit -m "$(cat <<'EOF'
feat(core): enforce exclusive namespace ownership in compose

EOF
)"
```

---

### Task 7: Order independence

**Files:**
- Modify: `packages/core/src/extension/compose.test.ts`

- [ ] **Step 1: Write failing test (should pass if assemble is multiset-correct; red only if order leaks into equality)**

```ts
  it('is independent of contribution order for successful composition', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const a: Contribution = {
      kind: 'framework',
      partitions: [
        {
          namespace: 'rf',
          entries: [{ name: 'description', value: 'CRM customer' }],
        },
      ],
    };
    const b: Contribution = {
      kind: 'extension',
      partitions: [
        {
          namespace: 'graphql',
          entries: [{ name: 'typeName', value: 'Customer' }],
        },
      ],
    };

    const ab = composeResourceMetadata(identity.value, [a, b]);
    const ba = composeResourceMetadata(identity.value, [b, a]);
    expect(ab.ok && ba.ok).toBe(true);
    if (!ab.ok || !ba.ok) {
      return;
    }
    expect(resourceMetadataEqual(ab.value, ba.value)).toBe(true);
  });
```

Import `Contribution` type.

- [ ] **Step 2: Run — expect PASS** (if Task 3 used `resourceMetadataEqual` correctly). If FAIL, fix assemble to not depend on contribution order for semantic equality (entry array order may differ; equality must ignore order — already true in M2.2).

- [ ] **Step 3: Commit test**

```bash
git add packages/core/src/extension/compose.test.ts
git commit -m "$(cat <<'EOF'
test(core): prove compose success is order-independent

EOF
)"
```

---

### Task 8: Package smoke + README + parent checkpoint

**Files:**
- Modify: `packages/core/src/index.test.ts`
- Modify: `packages/core/README.md`
- Modify: `docs/superpowers/plans/2026-08-06-m2-implementation-plan.md` (checkpoint only)

- [ ] **Step 1: Write failing smoke test**

Append to `packages/core/src/index.test.ts`:

```ts
  it('exposes composeResourceMetadata from the package entry', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }

    const composed = composeResourceMetadata(identity.value, [
      {
        kind: 'extension',
        partitions: [
          {
            namespace: 'graphql',
            entries: [{ name: 'typeName', value: 'Customer' }],
          },
        ],
      },
    ]);
    expect(composed.ok).toBe(true);
    if (!composed.ok) {
      return;
    }
    expect(resourceMetadataEqual(composed.value, composed.value)).toBe(true);
  });
```

Import `composeResourceMetadata` from `./index.js`.

- [ ] **Step 2: Run package tests; update README**

Replace the “planned M2.4” / non-goals composition lines with M2.4 export documentation mirroring M2.3’s style:

- list public symbols
- note: pure function; contribution data only; no registry mutation; no producer discovery

Update parent plan §11 checkpoint to mark M2.4 task plan path and leave code checkbox for after gate.

- [ ] **Step 3: Core gate**

```bash
pnpm --filter @resource-forge/core lint
pnpm --filter @resource-forge/core typecheck
pnpm --filter @resource-forge/core test
pnpm --filter @resource-forge/core build
```

All must pass.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/index.test.ts \
  packages/core/README.md \
  docs/superpowers/plans/2026-08-06-m2-implementation-plan.md
git commit -m "$(cat <<'EOF'
docs(core): document M2.4 composition exports and smoke path

EOF
)"
```

---

## Completion criteria

M2.4 is done when:

- [ ] All tasks above committed
- [ ] Public exports match the locked surface in this plan
- [ ] RFC-004 test categories in parent plan §7 Composition are green, plus explicit coverage for `invalid_kind`, `duplicate_entry_name`, `invalid_json_value`, and `invalid_key` nesting
- [ ] No registry mutation, discovery, or producer callables in core
- [ ] No new validation logic duplicated from M2.1/M2.2; existing validators/factories are reused
- [ ] Core gate green (lint, typecheck, tests, build)

---

## Self-review (plan author)

1. **Spec coverage:** RFC-004 producer kinds, exclusive ownership, `rf` restriction, pure/order-independent compose, empty success, failure classes, registry separation — each mapped to a task/test.
2. **Placeholders:** None intentional; helper filenames remain intentionally flexible.
3. **Type consistency:** `composeResourceMetadata` / `CompositionError` / `Contribution*` names match §1–§2 locks; `ReadonlyArray` style matches M2.x.
4. **No mirrored key codes:** `invalid_key.cause: MetadataKeyValidationError` only.
5. **Extension + `rf`:** top-level `reserved_namespace_violation`, not nested `reserved_namespace`.
6. **Result safety:** Task 3 includes structural validation so intermediate commits never throw on invalid user input; Step 5 failures use internal assertion only.
7. **Ownership determinism:** first conflict during contribution/partition scan — not Map iteration / namespace sort.
