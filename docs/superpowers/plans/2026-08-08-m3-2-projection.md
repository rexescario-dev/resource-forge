# M3.2 Projection — Implementation Tasks

> **For agentic workers:** Status is **Draft — Ready for M5 Plan Review** until M5 Accept. After Accept, REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-005. Reuse M3.1 `Resource` / `validateResource` and M2.2 `createResourceMetadata` — do not invent parallel metadata or outcome models. Do **not** implement annotation vocabulary or schema members. Do **not** fabricate or mock an `invalid_metadata` scenario.

**Status:** Draft — Ready for M5 Plan Review  
**Tracking:** [#6](https://github.com/rexescario-dev/resource-forge/issues/6)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-005 Resource Model (Accepted) §§3, 4.3; depends on RFC-001 / RFC-002 / M3.1  
**Package:** `@resource-forge/core`  
**Slice:** M3.2 only — `projectResourceMetadata` floor; no annotation/schema vocabulary

**Goal:** Implement the RFC-005 projection floor so a minimal Resource projects one-way to RFC-002-valid `ResourceMetadata` with identity agreement, purity, and distinguishable failure for invalid Resources.

**Architecture:** Projection is a pure function over an already-constructed Resource. Re-validate with M3.1 `validateResource`, then build metadata via M2.2 `createResourceMetadata` with **empty `entries`** (no vocabulary). Do not call the registry. Do not require `composeResourceMetadata`.

**Tech Stack:** TypeScript strict, Vitest (existing `packages/core` scripts)

**Depends on (authoritative):**

- `docs/superpowers/specs/2026-08-07-rfc-005-resource-model-design.md` (**Accepted**)
- `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (**Accepted**) — M3.2 slice
- `docs/superpowers/plans/2026-08-07-m3-1-resource-contracts.md` (**Accepted**, shipped)

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Locked decisions (export review)

| Decision | Lock |
| --- | --- |
| Public symbol | `projectResourceMetadata` |
| Signature | `(resource: Resource) => Result<ResourceMetadata, ResourceProjectionError>` |
| Floor entries | empty `entries: []` only — no reserved keys / schema vocabulary |
| Compose | **SHALL NOT** require `composeResourceMetadata`; implement via `createResourceMetadata` |
| Validity gate | re-run `validateResource` before projecting |
| Failure | invalid Resource → `invalid_resource`; `invalid_metadata` is defensive only (see Projection behavior) |
| Mutation / registry | none — pure; no `register` / `replace` |
| Reverse projection | deferred / out of scope |
| Annotations / members | not in M3.2 |
| `invalid_metadata` tests | **Do not** fabricate/mock a metadata failure; branch remains in the return contract for completeness |

---

## M3.2 public contract surface

| Symbol | Kind | Role |
| --- | --- | --- |
| `projectResourceMetadata` | function | One-way Resource → `ResourceMetadata` (RFC-005 floor) |
| `ResourceProjectionError` | type | Discriminated failure reasons |

**Not public in M3.2:**

- annotation projection vocabulary
- field / relation / operation → metadata mapping
- reserved metadata keys
- reverse projection
- registry helpers that wrap projection + register
- equality / builders / mutators for Resource

**Retain:** all M2 and M3.1 exports; `PACKAGE_NAME` / `PACKAGE_VERSION`.

### Result return type

```text
projectResourceMetadata(resource)
  → Result<ResourceMetadata, ResourceProjectionError>
```

### Locked shapes

```ts
type ResourceProjectionError =
  | {
      readonly code: 'invalid_resource';
      readonly cause: ResourceValidationError;
    }
  | {
      readonly code: 'invalid_metadata';
      readonly cause: MetadataValidationError;
    };
```

### Projection behavior

```ts
projectResourceMetadata(resource: Resource): Result<ResourceMetadata, ResourceProjectionError>
```

1. `validateResource(resource)`.
2. On validation failure → `{ code: 'invalid_resource', cause }`.
3. `createResourceMetadata(validated.identity, [])`.
4. On metadata failure → `{ code: 'invalid_metadata', cause }`.
5. On success → RFC-002-valid `ResourceMetadata` whose identity equals the Resource identity under RFC-001 equality.
6. MUST NOT mutate `resource`, MUST NOT call registry APIs, MUST NOT require `composeResourceMetadata`.

**`invalid_metadata` expectation:** `invalid_metadata` is a defensive error branch required by the locked return contract. Under RFC-001/RFC-002 validity and the empty-entry floor, the branch is expected to be unreachable for a successfully validated Resource; M3.2 does not fabricate or mock a metadata failure to exercise it. Given a `validateResource`-successful Resource, `createResourceMetadata(validated.identity, [])` should succeed under the currently accepted RFC-002 contract.

---

## Constraints (from Accepted specs)

### SHALL

- implement RFC-005 §§3, 4.3 projection floor only
- preserve identity (RFC-001 equality)
- produce RFC-002-valid `ResourceMetadata`
- succeed for minimal Resource (empty schema collections + empty annotations)
- remain pure

### SHALL NOT

- invent annotation representation or projection of non-empty annotations
- invent schema / reserved metadata vocabulary
- require `composeResourceMetadata`
- reverse-project
- register or replace snapshots inside projection
- touch Nest / GraphQL / Prisma / CLI packages beyond placeholders
- reopen M3.1 Resource shape

---

## Package / ownership boundaries

### `@resource-forge/core` owns (additive)

- `projectResourceMetadata` + `ResourceProjectionError`
- tests for parent plan §7 Projection checklist

### Unchanged

- M2 identity / metadata / registry / composition
- M3.1 Resource contracts (consume only)

### Must remain untouched (feature-free)

- `packages/nest`, `packages/graphql`, `packages/prisma`, `packages/cli`

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/core/src/resource/project.ts` | `projectResourceMetadata` |
| `packages/core/src/resource/types.ts` | add `ResourceProjectionError` |
| `packages/core/src/resource/project.test.ts` | RFC-005 projection invariants |
| `packages/core/src/resource/index.ts` | barrel export |
| `packages/core/src/index.ts` | package public export |
| `packages/core/src/index.test.ts` | smoke export for projection |

---

### Task 1: Types + failing projection tests

**Files:**
- Modify: `packages/core/src/resource/types.ts`
- Modify: `packages/core/src/resource/index.ts` — **export `ResourceProjectionError`**
- Create: `packages/core/src/resource/project.test.ts`

- [ ] **Step 1: Add `ResourceProjectionError` to types and export from `resource/index.ts`**

```ts
import type { MetadataValidationError } from '../metadata/types.js';

export type ResourceProjectionError =
  | {
      readonly code: 'invalid_resource';
      readonly cause: ResourceValidationError;
    }
  | {
      readonly code: 'invalid_metadata';
      readonly cause: MetadataValidationError;
    };
```

In `resource/index.ts`, re-export type `ResourceProjectionError` (function export waits for Task 2).

- [ ] **Step 2: Write the failing tests**

Do **not** add a test that fabricates or mocks `invalid_metadata`. Cover happy-path success (including RFC-002 validity of empty entries), purity, and `invalid_resource` only.

```ts
import { describe, expect, it } from 'vitest';
import { createResourceIdentity, resourceIdentitiesEqual } from '../identity/index.js';
import { validateResourceMetadata } from '../metadata/index.js';
import { createResource } from './create.js';
import { emptyAnnotations } from './empty-annotations.js';
import { createEmptyResourceSchema } from './schema.js';
import { projectResourceMetadata } from './project.js';

describe('projectResourceMetadata', () => {
  it('projects a minimal Resource to RFC-002-valid metadata with identity agreement', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResource(identity.value);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const projected = projectResourceMetadata(resource.value);
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;

    expect(
      resourceIdentitiesEqual(projected.value.identity, resource.value.identity),
    ).toBe(true);
    expect(projected.value.entries).toEqual([]);
    expect(validateResourceMetadata(projected.value).ok).toBe(true);
  });

  it('does not mutate the Resource', () => {
    const identity = createResourceIdentity('billing', 'Invoice');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;
    const resource = createResource(identity.value);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const before = structuredClone(resource.value);
    const projected = projectResourceMetadata(resource.value);
    expect(projected.ok).toBe(true);
    expect(resource.value).toEqual(before);
  });

  it('fails for an invalid Resource without projecting', () => {
    const projected = projectResourceMetadata({
      identity: { namespace: 'rf', name: 'Nope' },
      schema: createEmptyResourceSchema(),
      annotations: emptyAnnotations,
    });
    expect(projected.ok).toBe(false);
    if (projected.ok) return;
    expect(projected.error.code).toBe('invalid_resource');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @resource-forge/core test -- src/resource/project.test.ts`  
Expected: FAIL (module not found / export missing)

- [ ] **Step 4: Commit types + failing tests only**

```bash
git add packages/core/src/resource/types.ts packages/core/src/resource/project.test.ts packages/core/src/resource/index.ts
git commit -m "test(core): add failing M3.2 projection floor tests"
```

---

### Task 2: Implement `projectResourceMetadata`

**Files:**
- Create: `packages/core/src/resource/project.ts`
- Modify: `packages/core/src/resource/index.ts` — add **function** export only (`ResourceProjectionError` already exported in Task 1)
- Modify: `packages/core/src/index.ts` — export type `ResourceProjectionError` + function `projectResourceMetadata`

- [ ] **Step 1: Minimal implementation**

```ts
import { createResourceMetadata } from '../metadata/create.js';
import { err, ok, type Result } from '../result.js';
import type { ResourceMetadata } from '../metadata/types.js';
import type { Resource, ResourceProjectionError } from './types.js';
import { validateResource } from './validate.js';

export function projectResourceMetadata(
  resource: Resource,
): Result<ResourceMetadata, ResourceProjectionError> {
  const validated = validateResource(resource);
  if (!validated.ok) {
    return err({ code: 'invalid_resource', cause: validated.error });
  }

  const metadata = createResourceMetadata(validated.value.identity, []);
  if (!metadata.ok) {
    return err({ code: 'invalid_metadata', cause: metadata.error });
  }

  return ok(metadata.value);
}
```

- [ ] **Step 2: Export function from barrels**

- `resource/index.ts`: export `projectResourceMetadata` (type already exported in Task 1)
- `packages/core/src/index.ts`: export type `ResourceProjectionError` + function `projectResourceMetadata`

- [ ] **Step 3: Run projection tests — expect PASS**

Run: `pnpm --filter @resource-forge/core test -- src/resource/project.test.ts`

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/resource/project.ts packages/core/src/resource/index.ts packages/core/src/index.ts
git commit -m "feat(core): add projectResourceMetadata RFC-005 floor"
```

---

### Task 3: Package export smoke + parent §7 checklist

**Files:**
- Modify: `packages/core/src/index.test.ts`
- Modify: `docs/roadmap.md` — mark M3.2 **implementation** complete only after M6 verification is green
- Modify: `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` — §11 M3.2 code complete only after M6 verification is green

- [ ] **Step 1: Extend public export smoke**

```ts
import {
  createResource,
  createResourceIdentity,
  projectResourceMetadata,
  resourceIdentitiesEqual,
} from '../index.js';

describe('M3.2 public exports', () => {
  it('exposes projectResourceMetadata', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;
    const resource = createResource(identity.value);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;
    const projected = projectResourceMetadata(resource.value);
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;
    expect(
      resourceIdentitiesEqual(projected.value.identity, resource.value.identity),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run full core suite**

Run: `pnpm --filter @resource-forge/core test`  
Expected: PASS (M2 + M3.1 + M3.2)

- [ ] **Step 3: Confirm non-goals**

- no annotation vocabulary beyond `EmptyAnnotations`
- no field / relation / operation member types
- no Nest/GraphQL/Prisma imports under `packages/core/src/resource/`
- projection does not import registry modules
- no fabricated `invalid_metadata` test

- [ ] **Step 4: Update status docs (implementation complete only)**

Do this step **only after** Steps 2–3 are green (M6 verification). Plan Accept alone must not mark M3.2 code complete.

- `docs/roadmap.md` — mark M3.2 implementation complete only after M6 verification is green; next M3.3+ blocked on RFC-006+
- Parent plan §11 — M3.2 export/task/code ✅ only after M6 verification is green

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/index.test.ts docs/roadmap.md docs/superpowers/plans/2026-08-07-m3-implementation-plan.md
git commit -m "docs: record M3.2 projection floor complete"
```

---

## TDD / verification strategy

| Obligation (parent §7 Projection) | Covered by |
| --- | --- |
| minimal Resource projects successfully | Task 1/2 happy-path test |
| projected identity equals Resource identity | Task 1 identity agreement assertion |
| projected snapshot is RFC-002-valid | `validateResourceMetadata` assertion (empty entries) |
| projection does not mutate Resource | mutation test |
| projection does not call register/replace | implementation constraint + no registry import |
| invalid Resource failure distinguishable | `invalid_resource` test |
| `invalid_metadata` | **Not exercised** — defensive branch only; do not fabricate |

Full suite: `pnpm --filter @resource-forge/core test`.

---

## Traceability

| Task | RFC-005 / plan |
| --- | --- |
| Task 1–2 | RFC-005 §3.2 invariants 1–5; §4.3; §5.1–5.3 examples; parent §6 M3.2; §7 Projection |
| Task 3 | Parent §5.4 M3.2 export lock; §9.2 slice gate; roadmap hygiene |

---

## Completion criteria (M3.2)

- [ ] Parent plan §7 Projection checklist is green
- [ ] Public exports match the locked surface above
- [ ] Empty `entries` floor only — no metadata vocabulary
- [ ] No `composeResourceMetadata` requirement in the public contract
- [ ] No annotation / schema member work
- [ ] Placeholder packages remain feature-free

---

## Self-review *(planner)*

1. **Spec coverage:** RFC-005 projection floor + identity agreement + purity + invalid Resource failure — mapped to Tasks 1–2. Vocabulary deferred.
2. **No new product semantics:** empty entries + validate-then-`createResourceMetadata` are planning locks authorized by parent §8 open decisions.
3. **Executable order:** types/tests → implementation → smoke/docs.
4. **Stop condition:** M3.3+ remains blocked on RFC-006 / schema RFCs.

---

## Gate

**Status: Draft — Ready for M5 Plan Review.** Do not implement until Status is **Accepted**.

Lifecycle:

```text
Draft — Ready for M5 Plan Review
  ↓
M5 Plan Review → Accepted
  ↓
M6 TDD Implementation
  ↓
Tests + exports + verification green
  ↓
M3.2 Code Complete (roadmap / parent §11)
```

## After Accept

Coding begins only when this plan’s **Status** is **Accepted**. Prefer subagent-driven TDD per task. Prefer one PR for this tracking issue (#6) carrying Accept + M6. Do not mark roadmap/parent-plan M3.2 complete at Accept—only after M6 verification is green.
