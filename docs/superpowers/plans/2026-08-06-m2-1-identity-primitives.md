# M2.1 Identity Primitives — Implementation Tasks

> **For agentic workers:** Status is Accepted. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Steps use checkbox (`- [ ]`) syntax for tracking. Follow TDD; do not invent semantics beyond RFC-001.

**Status:** Accepted  
**Parent plan:** `docs/superpowers/plans/2026-08-06-m2-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-001 Resource Identity (Accepted)  
**Package:** `@resource-forge/core`  
**Slice:** M2.1 only — no metadata, registry, or composition

**Goal:** Implement structured resource identity construction, validation, and equality in `@resource-forge/core`, proving RFC-001 invariants with Vitest.

**Architecture:** Identity is a validated `(namespace, name)` value created by core. Public surface is construct + validate + equal. Canonical string parse/format remain non-public. Semantic validation failures use explicit result types; throws are reserved for programmer misuse later if needed (none required in M2.1).

**Tech Stack:** TypeScript strict, Vitest (existing `packages/core` scripts)

---

## M2.1 public contract surface

| Symbol | Kind | Role |
| --- | --- | --- |
| `ResourceIdentity` | type | Readonly structured `{ namespace, name }` |
| `ResourceIdentityKind` | type | `'user' \| 'framework'` — validation context |
| `createResourceIdentity` | function | Construct validated identity; default kind `'user'` |
| `validateResourceIdentity` | function | Validate a candidate `{ namespace, name }` under a kind; returns a validated `ResourceIdentity` on success |
| `resourceIdentitiesEqual` | function | RFC-001 equality (exact string match, case-sensitive) |
| `IdentityValidationError` | type | Discriminated failure reason for create/validate |
| `Ok` / `Err` / `Result` | types + helpers | Minimal shared result envelope for semantic outcomes |

**Not public in M2.1:**

- `parse` / `format` for `namespace/name`
- serialization helpers
- metadata, registry, extension modules

**Retain:** existing `PACKAGE_NAME` / `PACKAGE_VERSION` placeholder exports.

### Result shape (names freeze with this plan if accepted)

```ts
type Result<T, E> = Ok<T> | Err<E>;
type Ok<T> = { readonly ok: true; readonly value: T };
type Err<E> = { readonly ok: false; readonly error: E };

type IdentityValidationError =
  | { readonly code: 'invalid_namespace'; readonly namespace: string }
  | { readonly code: 'invalid_name'; readonly name: string }
  | { readonly code: 'reserved_namespace'; readonly namespace: string };
```

Both `createResourceIdentity` and `validateResourceIdentity` return:

```text
Result<ResourceIdentity, IdentityValidationError>
```

Validation returns a **validated identity value**, not a boolean. `createResourceIdentity` is sugar that builds a candidate pair and validates it.

**Locked behavior for create:**

```ts
createResourceIdentity(namespace: string, name: string, options?: { kind?: ResourceIdentityKind })
  → Result<ResourceIdentity, IdentityValidationError>
```

- default `kind: 'user'`
- `kind: 'user'` → `rf` namespace fails with `reserved_namespace`
- `kind: 'framework'` → `rf` allowed if grammar otherwise valid
- never silently normalize casing or repair strings

**Locked behavior for equal:**

```ts
resourceIdentitiesEqual(a: ResourceIdentity, b: ResourceIdentity): boolean
```

true iff `a.namespace === b.namespace && a.name === b.name` (no trimming/casefold).

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/core/src/result.ts` | `Result` / `Ok` / `Err` helpers (shared, exported) |
| `packages/core/src/identity/types.ts` | `ResourceIdentity`, `ResourceIdentityKind`, `IdentityValidationError` |
| `packages/core/src/identity/validate.ts` | grammar + reserved-namespace checks |
| `packages/core/src/identity/create.ts` | `createResourceIdentity` |
| `packages/core/src/identity/equal.ts` | `resourceIdentitiesEqual` |
| `packages/core/src/identity/index.ts` | identity barrel |
| `packages/core/src/identity/*.test.ts` | RFC-001 invariant tests |
| `packages/core/src/index.ts` | re-export identity + result + keep package placeholders |

---

### Task 1: Result helpers

**Files:**
- Create: `packages/core/src/result.ts`
- Create: `packages/core/src/result.test.ts`
- Modify: `packages/core/src/index.ts` (export `Result`, `Ok`, `Err`, `ok`, `err`)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { err, ok } from './result.js';

describe('Result', () => {
  it('constructs ok values', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
  });

  it('constructs err values', () => {
    expect(err('x')).toEqual({ ok: false, error: 'x' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @resource-forge/core test -- src/result.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Minimal implementation**

```ts
export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}
```

- [ ] **Step 4: Export from package entry and re-run tests**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/result.ts packages/core/src/result.test.ts packages/core/src/index.ts
git commit -m "feat(core): add Result helpers for semantic outcomes"
```

---

### Task 2: Identity types and validation

**Files:**
- Create: `packages/core/src/identity/types.ts`
- Create: `packages/core/src/identity/validate.ts`
- Create: `packages/core/src/identity/validate.test.ts`
- Create: `packages/core/src/identity/index.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing validation tests (grammar + reserved namespace)**

Cover at least:

- valid user identities: `crm`/`Customer`, `machine-learning`/`ModelCard`, `billing`/`OAuth2Client`
- invalid namespace: `Auth`, `CRM`, empty, leading digit, underscore
- invalid name: `customer`, `customer-record`, empty, leading lowercase
- user kind rejects `rf`/`Resource` with `reserved_namespace`
- framework kind accepts `rf`/`Resource` when grammar-valid
- no silent repair: input `"CRM"` does not become `"crm"`

```ts
import { describe, expect, it } from 'vitest';
import { validateResourceIdentity } from './validate.js';

describe('validateResourceIdentity', () => {
  it('accepts a valid user identity', () => {
    const result = validateResourceIdentity(
      { namespace: 'crm', name: 'Customer' },
      { kind: 'user' },
    );
    expect(result).toEqual({
      ok: true,
      value: { namespace: 'crm', name: 'Customer' },
    });
  });

  it('rejects reserved rf for user kind', () => {
    const result = validateResourceIdentity(
      { namespace: 'rf', name: 'Resource' },
      { kind: 'user' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('reserved_namespace');
    }
  });

  it('accepts rf for framework kind', () => {
    const result = validateResourceIdentity(
      { namespace: 'rf', name: 'Resource' },
      { kind: 'framework' },
    );
    expect(result.ok).toBe(true);
  });
});
```

Add further cases from RFC-001 §8.2 as separate `it` blocks in the same file.

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Implement types + validate**

```ts
// types.ts (illustrative)
export type ResourceIdentity = {
  readonly namespace: string;
  readonly name: string;
};

export type ResourceIdentityKind = 'user' | 'framework';

export type IdentityValidationError =
  | { readonly code: 'invalid_namespace'; readonly namespace: string }
  | { readonly code: 'invalid_name'; readonly name: string }
  | { readonly code: 'reserved_namespace'; readonly namespace: string };
```

Validation rules (derived from RFC-001; RFC-001 remains authoritative):

- `Namespace ::= ^[a-z][a-z0-9-]*$`
- `Name ::= ^[A-Z][A-Za-z0-9]*$`
- if `kind === 'user'` and `namespace === 'rf'` → `reserved_namespace`
- return `ok({ namespace, name })` with the **exact** input strings on success (no cloning mutations beyond readonly object)

- [ ] **Step 4: Export via `identity/index.ts` and package `index.ts`; tests PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(core): validate ResourceIdentity per RFC-001"
```

---

### Task 3: createResourceIdentity

**Files:**
- Create: `packages/core/src/identity/create.ts`
- Create: `packages/core/src/identity/create.test.ts`
- Modify: `packages/core/src/identity/index.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from './create.js';

describe('createResourceIdentity', () => {
  it('defaults to user kind', () => {
    const denied = createResourceIdentity('rf', 'Resource');
    expect(denied.ok).toBe(false);
  });

  it('creates a validated identity', () => {
    const result = createResourceIdentity('crm', 'Customer');
    expect(result).toEqual({
      ok: true,
      value: { namespace: 'crm', name: 'Customer' },
    });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement as validate wrapper**

```ts
export function createResourceIdentity(
  namespace: string,
  name: string,
  options?: { kind?: ResourceIdentityKind },
): Result<ResourceIdentity, IdentityValidationError> {
  return validateResourceIdentity(
    { namespace, name },
    { kind: options?.kind ?? 'user' },
  );
}
```

- [ ] **Step 4: Tests PASS; commit**

```bash
git commit -m "feat(core): add createResourceIdentity"
```

---

### Task 4: Equality

**Files:**
- Create: `packages/core/src/identity/equal.ts`
- Create: `packages/core/src/identity/equal.test.ts`
- Modify barrels / package index

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { resourceIdentitiesEqual } from './equal.js';

describe('resourceIdentitiesEqual', () => {
  it('is true for exact matches', () => {
    expect(
      resourceIdentitiesEqual(
        { namespace: 'crm', name: 'Customer' },
        { namespace: 'crm', name: 'Customer' },
      ),
    ).toBe(true);
  });

  it('is false when case differs', () => {
    expect(
      resourceIdentitiesEqual(
        { namespace: 'crm', name: 'Customer' },
        { namespace: 'CRM', name: 'Customer' },
      ),
    ).toBe(false);
  });
});
```

- [ ] **Step 2–4: Implement `a.namespace === b.namespace && a.name === b.name`; PASS; commit**

```bash
git commit -m "feat(core): add resourceIdentitiesEqual"
```

---

### Task 5: Public export smoke + package README

**Files:**
- Modify: `packages/core/src/index.test.ts`
- Modify: `packages/core/README.md`

- [ ] **Step 1: Extend package smoke test** to import public identity symbols from `./index.js` and assert create+equal round-trip for `crm`/`Customer`

- [ ] **Step 2: Update README** Current status → M2.1 identity contracts; list public identity exports; restate non-goals (no parse/format, no adapters)

- [ ] **Step 3: Run full core quality gate**

```bash
pnpm --filter @resource-forge/core lint
pnpm --filter @resource-forge/core typecheck
pnpm --filter @resource-forge/core test
pnpm --filter @resource-forge/core build
```

Expected: all pass

- [ ] **Step 4: Commit**

```bash
git commit -m "docs(core): document M2.1 identity exports"
```

---

## Acceptance criteria (this task plan)

- [x] Public symbols in the table above are agreed.
- [x] `validateResourceIdentity` returns `Result<ResourceIdentity, IdentityValidationError>` (validated value, not boolean).
- [x] parse/format remain non-public.
- [x] Result philosophy matches the parent plan (§5.3).
- [x] Tasks are small enough to execute with TDD without inventing new semantics.
- [x] Out of scope remains: metadata, registry, composition, adapters, discovery.

## M2.1 implementation complete when

- All tasks checked off with green tests
- No public parse/format
- User vs framework kind enforced for `rf`
- Equality is exact and case-sensitive
- `@resource-forge/nest|graphql|prisma|cli` unchanged

---

## Checkpoint

```text
M2 plan                         ✅
Export categories / results     ✅
M2.1 construct+validate lock    ✅
M2.1 task breakdown             ✅ Accepted
M2.1 code                       🔓 Task 1 next
```
