# M2.3 Registry Contracts — Implementation Tasks

> **For agentic workers:** Status is Accepted. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-003. Reuse M2.1/M2.2 validators and `Result` helpers — do not invent a parallel outcome model.

**Status:** Accepted  
**Parent plan:** `docs/superpowers/plans/2026-08-06-m2-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-003 Registry Contracts (Accepted); depends on RFC-001 / M2.1, RFC-002 / M2.2  
**Package:** `@resource-forge/core`  
**Slice:** M2.3 only — no composition (M2.4)

**Goal:** Implement the Resource Registry contract and an in-memory reference implementation in `@resource-forge/core`, proving RFC-003 association invariants with Vitest.

**Architecture:** `ResourceRegistry` is a stateful association service (identity → current immutable `ResourceMetadata`). Public surface is the interface, a factory for the in-memory reference impl, lookup Hit/Miss types, and mutation error types. Mutations use `Result<void, …>`; lookup returns `LookupResult`; enumerate returns a snapshot array. Composition stays out of this slice.

**Tech Stack:** TypeScript strict, Vitest (existing `packages/core` scripts)

---

## Locked decisions (export review)

| Decision | Lock |
| --- | --- |
| Object shape | `ResourceRegistry` interface + `createInMemoryResourceRegistry(): ResourceRegistry` |
| Concrete Map class | Internal only — not exported |
| Lookup | `LookupResult` discriminant (`hit` / `miss`); not wrapped in `Result` |
| Mutation success | `Result<void, …>` via `ok(undefined)` — state transition only |
| Mutation errors | Canonical `RegistryMutationError` + `Extract<>` aliases per op |
| Enumerate | `ReadonlyArray<ResourceIdentity>` — **snapshot**, order non-normative |
| Validation | Full re-validate on `register` / `replace`; `unregister` validates identity; `lookup` invalid → `miss` |
| Trust model | Namespace-derived kinds (same as M2.2 snapshot validate) |
| Map keying | Private `"${namespace}/${name}"`; enumerate from `metadata.identity` |
| Snapshot retention | On successful register/replace, retain the supplied immutable `ResourceMetadata` instance (no clone/reconstruct) |
| Outcome model | Reuse `Result` / `ok` / `err` |

---

## M2.3 public contract surface

| Symbol | Kind | Role |
| --- | --- | --- |
| `ResourceRegistry` | interface | register / replace / unregister / lookup / enumerate |
| `createInMemoryResourceRegistry` | function | Factory for the reference impl |
| `LookupResult` | type | `{ status: 'hit'; metadata } \| { status: 'miss' }` |
| `RegistryMutationError` | type | Canonical mutation failure union |
| `RegisterError` | type | `Extract` of codes valid for `register` |
| `ReplaceError` | type | `Extract` of codes valid for `replace` |
| `UnregisterError` | type | `Extract` of codes valid for `unregister` |

**Not public in M2.3:**

- concrete in-memory class name / file
- internal Map key string encoding
- composition / producer APIs
- persistence, discovery, indexing, history

### Interface

```ts
interface ResourceRegistry {
  register(
    identity: ResourceIdentity,
    metadata: ResourceMetadata,
  ): Result<void, RegisterError>;

  replace(
    identity: ResourceIdentity,
    metadata: ResourceMetadata,
  ): Result<void, ReplaceError>;

  unregister(identity: ResourceIdentity): Result<void, UnregisterError>;

  lookup(identity: ResourceIdentity): LookupResult;

  enumerate(): ReadonlyArray<ResourceIdentity>;
}
```

### Result / query return types

```text
register   → Result<void, RegisterError>
replace    → Result<void, ReplaceError>
unregister → Result<void, UnregisterError>
lookup     → LookupResult
enumerate  → ReadonlyArray<ResourceIdentity>
```

### Error taxonomy

```ts
type RegistryMutationError =
  | {
      readonly code: 'duplicate_registration';
      readonly identity: ResourceIdentity;
    }
  | {
      readonly code: 'not_registered';
      readonly identity: ResourceIdentity;
    }
  | {
      readonly code: 'invalid_identity';
      readonly cause: IdentityValidationError;
    }
  | {
      readonly code: 'invalid_metadata';
      readonly cause: MetadataValidationError;
    }
  | {
      readonly code: 'identity_mismatch';
      readonly identity: ResourceIdentity;
      readonly metadataIdentity: ResourceIdentity;
    };

type RegisterError = Extract<
  RegistryMutationError,
  {
    code:
      | 'duplicate_registration'
      | 'invalid_identity'
      | 'invalid_metadata'
      | 'identity_mismatch';
  }
>;

type ReplaceError = Extract<
  RegistryMutationError,
  {
    code:
      | 'not_registered'
      | 'invalid_identity'
      | 'invalid_metadata'
      | 'identity_mismatch';
  }
>;

type UnregisterError = Extract<
  RegistryMutationError,
  { code: 'not_registered' | 'invalid_identity' }
>;
```

### Behavioral rules (normative for this plan)

**Shared mutation preconditions** (`register` / `replace`), in order:

1. Validate `identity` with M2.1 (`kind` = `identity.namespace === 'rf' ? 'framework' : 'user'`).
2. Validate `metadata` with M2.2 `validateResourceMetadata`.
3. If `!resourceIdentitiesEqual(identity, metadata.identity)` → `identity_mismatch`.
4. Apply registry state rule.

**Per operation:**

| Op | Success | Failures |
| --- | --- | --- |
| `register` | Associate; `ok(undefined)` | `invalid_*`, `identity_mismatch`, `duplicate_registration` |
| `replace` | Replace current snapshot (no history); `ok(undefined)` | `invalid_*`, `identity_mismatch`, `not_registered` |
| `unregister` | Remove association; `ok(undefined)` | `invalid_identity`, `not_registered` |
| `lookup` | `hit` with stored metadata, else `miss` | — (ill-formed identity → `miss`) |
| `enumerate` | New array of current `metadata.identity` values | — |

**Snapshot retention (normative):** On successful `register` and `replace`, the registry retains the caller-supplied immutable `ResourceMetadata` instance. It MUST NOT clone, reconstruct, merge, or normalize the stored snapshot.

**`enumerate` guarantees:**

- Returns a **snapshot** (new array), never a live view of internal storage.
- Later mutations must not alter the returned array’s length or elements.
- **Order is non-normative.**

**In-memory reference impl (private):**

```text
Map<string, ResourceMetadata>
key = `${namespace}/${name}`   # implementation detail only
```

- `enumerate()` collects `metadata.identity` from map values (do not parse the key).
- Each factory call returns an independent empty registry.

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/core/src/registry/types.ts` | `LookupResult`, error unions, `ResourceRegistry` |
| `packages/core/src/registry/in-memory.ts` | `createInMemoryResourceRegistry` + private Map impl |
| `packages/core/src/registry/index.ts` | public barrel |
| `packages/core/src/registry/in-memory.test.ts` | RFC-003 invariant tests |
| `packages/core/src/index.ts` | re-export registry surface |
| `packages/core/src/index.test.ts` | package smoke including registry |
| `packages/core/README.md` | document M2.3 exports |

Reuse `result.ts`, identity, and metadata APIs. Do not add Nest/GraphQL/Prisma code.

---

### Task 1: Registry types + interface

**Files:**
- Create: `packages/core/src/registry/types.ts`
- Create: `packages/core/src/registry/index.ts`
- Create: `packages/core/src/registry/types.test.ts`
- Modify: `packages/core/src/index.ts`

- [x] **Step 1: Write failing type-level / compile-surface test**

Create `packages/core/src/registry/types.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { ResourceIdentity } from '../identity/types.js';
import type { ResourceMetadata } from '../metadata/types.js';
import type {
  LookupResult,
  RegisterError,
  RegistryMutationError,
  ReplaceError,
  ResourceRegistry,
  UnregisterError,
} from './types.js';

// Type-surface fixtures only — runtime values are irrelevant.
const identity = {
  namespace: 'crm',
  name: 'Customer',
} as ResourceIdentity;
const metadata = {
  identity,
  entries: [],
} as ResourceMetadata;

describe('registry types', () => {
  it('models lookup hit and miss', () => {
    const hit: LookupResult = {
      status: 'hit',
      metadata,
    };
    const miss: LookupResult = { status: 'miss' };
    expect(hit.status).toBe('hit');
    expect(miss.status).toBe('miss');
  });

  it('keeps RegisterError free of not_registered', () => {
    const err: RegisterError = {
      code: 'duplicate_registration',
      identity,
    };
    expect(err.code).toBe('duplicate_registration');

    // @ts-expect-error not_registered is not a RegisterError
    const _bad: RegisterError = {
      code: 'not_registered',
      identity,
    };
    void _bad;
  });

  it('allows RegistryMutationError to carry all codes', () => {
    const other = {
      namespace: 'billing',
      name: 'Invoice',
    } as ResourceIdentity;
    const errors: RegistryMutationError[] = [
      {
        code: 'duplicate_registration',
        identity,
      },
      {
        code: 'not_registered',
        identity,
      },
      {
        code: 'invalid_identity',
        cause: { code: 'invalid_namespace', namespace: 'CRM' },
      },
      {
        code: 'invalid_metadata',
        cause: {
          code: 'invalid_identity',
          cause: { code: 'invalid_name', name: 'customer' },
        },
      },
      {
        code: 'identity_mismatch',
        identity,
        metadataIdentity: other,
      },
    ];
    expect(errors).toHaveLength(5);
  });

  it('types ResourceRegistry method results', () => {
    type RegisterReturn = ReturnType<ResourceRegistry['register']>;
    type LookupReturn = ReturnType<ResourceRegistry['lookup']>;
    type EnumerateReturn = ReturnType<ResourceRegistry['enumerate']>;

    const _r: RegisterReturn = { ok: true, value: undefined };
    const _l: LookupReturn = { status: 'miss' };
    const _e: EnumerateReturn = [];
    void _r;
    void _l;
    void _e;

    type _ReplaceErr = ReplaceError;
    type _UnregisterErr = UnregisterError;
  });
});
```

- [x] **Step 2: Run — expect FAIL** (module missing)

```bash
pnpm --filter @resource-forge/core test -- src/registry/types.test.ts
```

Expected: FAIL — cannot find module / exports.  
Note: `import type` is erased at runtime, so the red phase is primarily a typecheck failure until `types.ts` exists; implement Step 3 promptly.

- [x] **Step 3: Implement types + barrel + package re-exports**

`packages/core/src/registry/types.ts`:

```ts
import type {
  IdentityValidationError,
  ResourceIdentity,
} from '../identity/types.js';
import type {
  MetadataValidationError,
  ResourceMetadata,
} from '../metadata/types.js';
import type { Result } from '../result.js';

export type LookupResult =
  | {
      readonly status: 'hit';
      readonly metadata: ResourceMetadata;
    }
  | {
      readonly status: 'miss';
    };

export type RegistryMutationError =
  | {
      readonly code: 'duplicate_registration';
      readonly identity: ResourceIdentity;
    }
  | {
      readonly code: 'not_registered';
      readonly identity: ResourceIdentity;
    }
  | {
      readonly code: 'invalid_identity';
      readonly cause: IdentityValidationError;
    }
  | {
      readonly code: 'invalid_metadata';
      readonly cause: MetadataValidationError;
    }
  | {
      readonly code: 'identity_mismatch';
      readonly identity: ResourceIdentity;
      readonly metadataIdentity: ResourceIdentity;
    };

export type RegisterError = Extract<
  RegistryMutationError,
  {
    code:
      | 'duplicate_registration'
      | 'invalid_identity'
      | 'invalid_metadata'
      | 'identity_mismatch';
  }
>;

export type ReplaceError = Extract<
  RegistryMutationError,
  {
    code:
      | 'not_registered'
      | 'invalid_identity'
      | 'invalid_metadata'
      | 'identity_mismatch';
  }
>;

export type UnregisterError = Extract<
  RegistryMutationError,
  { code: 'not_registered' | 'invalid_identity' }
>;

export interface ResourceRegistry {
  register(
    identity: ResourceIdentity,
    metadata: ResourceMetadata,
  ): Result<void, RegisterError>;

  replace(
    identity: ResourceIdentity,
    metadata: ResourceMetadata,
  ): Result<void, ReplaceError>;

  unregister(identity: ResourceIdentity): Result<void, UnregisterError>;

  lookup(identity: ResourceIdentity): LookupResult;

  enumerate(): ReadonlyArray<ResourceIdentity>;
}
```

`packages/core/src/registry/index.ts`:

```ts
export type {
  LookupResult,
  RegisterError,
  RegistryMutationError,
  ReplaceError,
  ResourceRegistry,
  UnregisterError,
} from './types.js';
```

Append to `packages/core/src/index.ts`:

```ts
export type {
  LookupResult,
  RegisterError,
  RegistryMutationError,
  ReplaceError,
  ResourceRegistry,
  UnregisterError,
} from './registry/index.js';
```

- [x] **Step 4: Tests PASS; commit**

```bash
pnpm --filter @resource-forge/core test -- src/registry/types.test.ts
```

```bash
git add packages/core/src/registry packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): add ResourceRegistry types and error taxonomy

EOF
)"
```

---

### Task 2: register success + duplicate

**Files:**
- Create: `packages/core/src/registry/in-memory.ts`
- Create: `packages/core/src/registry/in-memory.test.ts`
- Modify: `packages/core/src/registry/index.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/create.js';
import { createResourceMetadata } from '../metadata/create.js';
import { resourceMetadataEqual } from '../metadata/equal.js';
import { createInMemoryResourceRegistry } from './in-memory.js';

function mustIdentity(namespace: string, name: string) {
  const result = createResourceIdentity(namespace, name);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('expected identity');
  }
  return result.value;
}

function mustMetadata(namespace: string, name: string) {
  const identity = mustIdentity(namespace, name);
  const result = createResourceMetadata(identity, []);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('expected metadata');
  }
  return { identity, metadata: result.value };
}

describe('createInMemoryResourceRegistry — register', () => {
  it('registers a metadata snapshot for an identity', () => {
    const registry = createInMemoryResourceRegistry();
    const { identity, metadata } = mustMetadata('crm', 'Customer');

    const registered = registry.register(identity, metadata);
    expect(registered).toEqual({ ok: true, value: undefined });

    const lookedUp = registry.lookup(identity);
    expect(lookedUp.status).toBe('hit');
    if (lookedUp.status !== 'hit') {
      return;
    }
    expect(resourceMetadataEqual(lookedUp.metadata, metadata)).toBe(true);
    expect(lookedUp.metadata).toBe(metadata); // retain supplied instance
  });

  it('rejects duplicate registration', () => {
    const registry = createInMemoryResourceRegistry();
    const { identity, metadata } = mustMetadata('crm', 'Customer');

    expect(registry.register(identity, metadata).ok).toBe(true);
    const duplicate = registry.register(identity, metadata);
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) {
      return;
    }
    expect(duplicate.error).toEqual({
      code: 'duplicate_registration',
      identity,
    });
  });

  it('isolates registries created by separate factory calls', () => {
    const a = createInMemoryResourceRegistry();
    const b = createInMemoryResourceRegistry();
    const { identity, metadata } = mustMetadata('crm', 'Customer');

    expect(a.register(identity, metadata).ok).toBe(true);
    expect(b.lookup(identity)).toEqual({ status: 'miss' });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm --filter @resource-forge/core test -- src/registry/in-memory.test.ts
```

- [ ] **Step 3: Minimal `createInMemoryResourceRegistry` with `register` + `lookup`**

Implement in `packages/core/src/registry/in-memory.ts`:

- Private `Map<string, ResourceMetadata>`
- Internal helper `toKey(identity) => \`${identity.namespace}/${identity.name}\``
- `register`: validate identity → validate metadata → equality → duplicate check → `map.set` → `ok(undefined)`
- `lookup`: if identity validation fails → `{ status: 'miss' }`; else Map get → hit/miss
- For Task 2, implement `register` + working `lookup`. Stub the remaining methods with typed placeholders until Tasks 3–4:

```ts
replace(identity, metadata) {
  void metadata;
  return err({ code: 'not_registered', identity });
}
unregister(identity) {
  return err({ code: 'not_registered', identity });
}
enumerate() {
  return [];
}
```

Export factory from barrel + `packages/core/src/index.ts`:

```ts
export { createInMemoryResourceRegistry } from './registry/index.js';
```

- [ ] **Step 4: Tests PASS; commit**

```bash
git add packages/core/src/registry packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): register associations in in-memory ResourceRegistry

EOF
)"
```

---

### Task 3: replace + unregister

**Files:**
- Modify: `packages/core/src/registry/in-memory.ts`
- Modify: `packages/core/src/registry/in-memory.test.ts`

- [ ] **Step 1: Append failing tests**

```ts
describe('createInMemoryResourceRegistry — replace / unregister', () => {
  it('replaces the current snapshot with no history', () => {
    const registry = createInMemoryResourceRegistry();
    const identity = mustIdentity('crm', 'Customer');
    const first = createResourceMetadata(identity, []);
    const second = createResourceMetadata(identity, []);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }

    expect(registry.register(identity, first.value).ok).toBe(true);
    const replaced = registry.replace(identity, second.value);
    expect(replaced).toEqual({ ok: true, value: undefined });

    const lookedUp = registry.lookup(identity);
    expect(lookedUp.status).toBe('hit');
    if (lookedUp.status !== 'hit') {
      return;
    }
    expect(lookedUp.metadata).toBe(second.value);
    expect(lookedUp.metadata).not.toBe(first.value);
  });

  it('rejects replace when not registered', () => {
    const registry = createInMemoryResourceRegistry();
    const { identity, metadata } = mustMetadata('crm', 'Customer');
    const result = registry.replace(identity, metadata);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toEqual({ code: 'not_registered', identity });
  });

  it('unregisters a registered identity', () => {
    const registry = createInMemoryResourceRegistry();
    const { identity, metadata } = mustMetadata('crm', 'Customer');
    expect(registry.register(identity, metadata).ok).toBe(true);

    const removed = registry.unregister(identity);
    expect(removed).toEqual({ ok: true, value: undefined });
    expect(registry.lookup(identity)).toEqual({ status: 'miss' });
  });

  it('rejects unregister when not registered', () => {
    const registry = createInMemoryResourceRegistry();
    const identity = mustIdentity('crm', 'Customer');
    const result = registry.unregister(identity);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toEqual({ code: 'not_registered', identity });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `replace` and `unregister`**

- `replace`: shared preconditions → require key present → `map.set` with supplied metadata → `ok(undefined)`
- `unregister`: validate identity → require key present → `map.delete` → `ok(undefined)`

- [ ] **Step 4: Tests PASS; commit**

```bash
git commit -m "$(cat <<'EOF'
feat(core): replace and unregister ResourceRegistry associations

EOF
)"
```

---

### Task 4: lookup miss paths + enumerate snapshot

**Files:**
- Modify: `packages/core/src/registry/in-memory.ts`
- Modify: `packages/core/src/registry/in-memory.test.ts`

- [ ] **Step 1: Append failing tests**

```ts
describe('createInMemoryResourceRegistry — lookup / enumerate', () => {
  it('returns miss for an unknown identity', () => {
    const registry = createInMemoryResourceRegistry();
    const identity = mustIdentity('crm', 'Customer');
    expect(registry.lookup(identity)).toEqual({ status: 'miss' });
  });

  it('returns miss for an invalid identity without reporting validation', () => {
    const registry = createInMemoryResourceRegistry();
    const lookedUp = registry.lookup({
      namespace: 'CRM',
      name: 'Customer',
    });
    expect(lookedUp).toEqual({ status: 'miss' });
  });

  it('enumerates currently registered identities as a snapshot', () => {
    const registry = createInMemoryResourceRegistry();
    const a = mustMetadata('crm', 'Customer');
    const b = mustMetadata('billing', 'Invoice');
    expect(registry.register(a.identity, a.metadata).ok).toBe(true);
    expect(registry.register(b.identity, b.metadata).ok).toBe(true);

    const snapshot = registry.enumerate();
    expect(snapshot).toHaveLength(2);
    expect(
      snapshot.some(
        (id) => id.namespace === 'crm' && id.name === 'Customer',
      ),
    ).toBe(true);
    expect(
      snapshot.some(
        (id) => id.namespace === 'billing' && id.name === 'Invoice',
      ),
    ).toBe(true);

    // Mutating the returned array must not affect the registry
    (snapshot as ResourceIdentity[]).length = 0;
    expect(registry.enumerate()).toHaveLength(2);

    // Registry mutation must not rewrite a prior snapshot array
    expect(registry.unregister(a.identity).ok).toBe(true);
    expect(snapshot).toHaveLength(0);
    expect(registry.enumerate()).toEqual([b.identity]);
  });
});
```

Import `ResourceIdentity` type in the test file if needed.

- [ ] **Step 2: Run — expect FAIL** (enumerate still stubbed)

- [ ] **Step 3: Implement `enumerate`**

```ts
enumerate(): ReadonlyArray<ResourceIdentity> {
  return Array.from(this.store.values(), (metadata) => metadata.identity);
}
```

Ensure `lookup` validates identity first and returns `miss` on failure (no `Result`).

- [ ] **Step 4: Tests PASS; commit**

```bash
git commit -m "$(cat <<'EOF'
feat(core): lookup miss and enumerate snapshot for ResourceRegistry

EOF
)"
```

---

### Task 5: Validation and identity-mismatch failures

**Files:**
- Modify: `packages/core/src/registry/in-memory.ts` (if gaps remain)
- Modify: `packages/core/src/registry/in-memory.test.ts`

- [ ] **Step 1: Append failing tests**

```ts
describe('createInMemoryResourceRegistry — validation', () => {
  it('rejects register with invalid identity', () => {
    const registry = createInMemoryResourceRegistry();
    const identity = { namespace: 'CRM', name: 'Customer' };
    const metadata = {
      identity: { namespace: 'crm', name: 'Customer' },
      entries: [],
    };
    const result = registry.register(identity, metadata as never);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe('invalid_identity');
  });

  it('rejects register with invalid metadata', () => {
    const registry = createInMemoryResourceRegistry();
    const identity = mustIdentity('crm', 'Customer');
    const result = registry.register(identity, {
      identity,
      entries: [
        {
          key: { namespace: 'graphql', name: 'typeName' },
          value: undefined as never,
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe('invalid_metadata');
  });

  it('rejects register when identity does not match metadata.identity', () => {
    const registry = createInMemoryResourceRegistry();
    const identity = mustIdentity('crm', 'Customer');
    const other = mustMetadata('billing', 'Invoice');
    const result = registry.register(identity, other.metadata);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toEqual({
      code: 'identity_mismatch',
      identity,
      metadataIdentity: other.identity,
    });
  });

  it('rejects unregister with invalid identity', () => {
    const registry = createInMemoryResourceRegistry();
    const result = registry.unregister({
      namespace: 'CRM',
      name: 'Customer',
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe('invalid_identity');
  });

  it('rejects replace with identity mismatch when registered', () => {
    const registry = createInMemoryResourceRegistry();
    const { identity, metadata } = mustMetadata('crm', 'Customer');
    expect(registry.register(identity, metadata).ok).toBe(true);
    const other = mustMetadata('billing', 'Invoice');
    const result = registry.replace(identity, other.metadata);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe('identity_mismatch');
  });

  it('reports invalid_identity when both identity and metadata are invalid', () => {
    const registry = createInMemoryResourceRegistry();
    const result = registry.register(
      { namespace: 'CRM', name: 'Customer' },
      {
        identity: { namespace: 'also-bad', name: 'notValid' },
        entries: [
          {
            key: { namespace: 'graphql', name: 'typeName' },
            value: undefined as never,
          },
        ],
      } as never,
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    // Identity validation precedes metadata validation.
    expect(result.error.code).toBe('invalid_identity');
  });
});
```

Note on validation order: for `register(identity, mismatchedMetadata)`, if both sides are structurally valid, failure is `identity_mismatch` (not metadata invalid). For forged invalid metadata values, prefer asserting `code` only when nested causes may vary. When both inputs are invalid, the result MUST be `invalid_identity`.

- [ ] **Step 2: Run — expect FAIL** if validation not yet complete

- [ ] **Step 3: Ensure shared precondition helper**

Suggested private helper inside `in-memory.ts`:

```ts
function prepareAssociation(
  identity: ResourceIdentity,
  metadata: ResourceMetadata,
): Result<
  { identity: ResourceIdentity; metadata: ResourceMetadata },
  Extract<
    RegistryMutationError,
    { code: 'invalid_identity' | 'invalid_metadata' | 'identity_mismatch' }
  >
> {
  const identityKind =
    identity.namespace === 'rf' ? 'framework' : 'user';
  const validatedIdentity = validateResourceIdentity(identity, {
    kind: identityKind,
  });
  if (!validatedIdentity.ok) {
    return err({ code: 'invalid_identity', cause: validatedIdentity.error });
  }

  const validatedMetadata = validateResourceMetadata(metadata);
  if (!validatedMetadata.ok) {
    return err({ code: 'invalid_metadata', cause: validatedMetadata.error });
  }

  if (
    !resourceIdentitiesEqual(
      validatedIdentity.value,
      validatedMetadata.value.identity,
    )
  ) {
    return err({
      code: 'identity_mismatch',
      identity: validatedIdentity.value,
      metadataIdentity: validatedMetadata.value.identity,
    });
  }

  return ok({
    identity: validatedIdentity.value,
    metadata: validatedMetadata.value,
  });
}
```

**Important:** After `prepareAssociation` succeeds, store the **caller-supplied** `metadata` argument (see normative snapshot retention). Validation decides acceptance; it must not replace the stored reference:

```ts
// After prepareAssociation succeeds — retain caller-supplied instance:
this.store.set(toKey(identity), metadata);
```

- [ ] **Step 4: Full registry tests PASS; commit**

```bash
pnpm --filter @resource-forge/core test -- src/registry
```

```bash
git commit -m "$(cat <<'EOF'
feat(core): enforce registry validation and identity match

EOF
)"
```

---

### Task 6: Package export smoke + README

**Files:**
- Modify: `packages/core/src/index.test.ts`
- Modify: `packages/core/README.md`

- [ ] **Step 1: Smoke-test register → lookup → enumerate → unregister**

Append to `packages/core/src/index.test.ts`:

```ts
import { createInMemoryResourceRegistry } from './index.js';

it('exposes in-memory ResourceRegistry from the package entry', () => {
  const identity = createResourceIdentity('crm', 'Customer');
  expect(identity.ok).toBe(true);
  if (!identity.ok) {
    return;
  }
  const metadata = createResourceMetadata(identity.value, []);
  expect(metadata.ok).toBe(true);
  if (!metadata.ok) {
    return;
  }

  const registry = createInMemoryResourceRegistry();
  expect(registry.register(identity.value, metadata.value).ok).toBe(true);
  expect(registry.lookup(identity.value).status).toBe('hit');
  expect(registry.enumerate()).toHaveLength(1);
  expect(registry.unregister(identity.value).ok).toBe(true);
  expect(registry.lookup(identity.value)).toEqual({ status: 'miss' });
});
```

- [ ] **Step 2: README** — mark Registry as implemented; list public symbols; note:

  - association-only (no composition)
  - concrete Map impl not exported
  - enumerate snapshot / order non-normative
  - lookup miss ≠ error

- [ ] **Step 3: Full core gate**

```bash
pnpm --filter @resource-forge/core lint
pnpm --filter @resource-forge/core typecheck
pnpm --filter @resource-forge/core test
pnpm --filter @resource-forge/core build
```

Expected: all green (prior M2.1/M2.2 tests still pass).

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
docs(core): document M2.3 registry exports

EOF
)"
```

---

## Acceptance criteria (this task plan)

- [x] Public symbols in the table are agreed.
- [x] `ResourceRegistry` + `createInMemoryResourceRegistry` only concrete export path.
- [x] Mutations return `Result<void, …>`; lookup returns `LookupResult`; enumerate returns snapshot array.
- [x] Full re-validation on register/replace; unregister validates identity; lookup invalid → miss.
- [x] Supplied metadata instance retained on successful register/replace (normative).
- [x] Validation order: identity before metadata (covered by Task 5 test).
- [x] No composition, persistence, discovery, or history in this slice.

## M2.3 implementation complete when

- All tasks checked off with green tests
- RFC-003 §7 registry obligations covered (register, duplicate, replace, unregister, hit/miss, mismatch, invalid inputs, enumerate current only)
- `@resource-forge/nest|graphql|prisma|cli` unchanged
- M2.4 not started until this slice is committed

---

## Checkpoint

```text
M2.1 Identity                 ✅
M2.2 Metadata                 ✅
M2.3 export decisions         ✅
M2.3 task breakdown           ✅ Accepted
M2.3 code                     ⏳ Task 1 next
M2.4 Composition              ⏳
```
