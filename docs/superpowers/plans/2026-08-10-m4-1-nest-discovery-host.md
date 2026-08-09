# M4.1 Nest Discovery-First Host — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD. Implement **only** Accepted RFC-031 Nest hosting semantics in `@resource-forge/nest`. Do **not** change `@resource-forge/core` product semantics. Do **not** implement GraphQL, Prisma/ORM, decorator DSL beyond discoverability, metadata emitters, query/navigation APIs, or a transactional core registry. Do **not** reopen RFC-005–RFC-030 / M3. Preserve: DI availability of `RESOURCE_REGISTRY` ≡ full hosting success; `provideResource(): Resource | Promise<Resource>` only (no `Resource[]` API); lifecycle unit fails closed without claiming DI atomicity.

**Status:** Accepted  
**M5:** Accepted (2026-08-10) — Plan Review; no plan blockers after required corrections: (1) public declaration contract is `provideResource(): Resource | Promise<Resource>` with explicit await at Nest resolution boundary; `Resource[]` not a supported return shape—malformed zero/multiple only via test doubles/internal boundary; (2) Task 3 asserts lifecycle failure propagation only; no-partial-**exposure** asserted at `ResourceForgeModule` (Task 4) with host-in-factory DI≡success. Fresh private init registry; no shared pre-visible mutation; no transactional core registry; core untouched; GraphQL/Prisma/emitters/query fenced. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#106](https://github.com/rexescario-dev/resource-forge/issues/106)  
**Source RFC:** [RFC-031 Nest Discovery-First Host Integration](../specs/2026-08-10-rfc-031-nest-discovery-host-integration-design.md) (**Accepted**)  
**Depends on:** RFC-001 / RFC-002 / RFC-003 / RFC-005 / RFC-006 / RFC-023 / RFC-030 (**Accepted**); RFC-031 (**Accepted**); M3 Resource model Done  
**Package:** `@resource-forge/nest` (consumes `@resource-forge/core`; Nest as peer)  
**Slice:** M4.1 only — Nest discovery-first host module + lifecycle + DI exposure
**Goal:** Deliver `@resource-forge/nest` so a Nest app can discover marked resource declaration providers, run **discover → resolve → validate → project → register** against a private fresh core `ResourceRegistry`, and expose that registry via Nest DI only after full success—without putting Nest concerns into core.

**Architecture:**

```text
RFC-031 (Accepted)
└── Nest hosts core ResourceRegistry (no parallel registry)

@resource-forge/nest
├── ResourceForgeModule.forRoot / forRootAsync
├── discoverability marker + ResourceDeclarationProvider
├── private fresh init registry (createInMemoryResourceRegistry)
├── hosting lifecycle (core validate → project → register)
└── DI token exposes registry only after full success

packages/core — consumed only; no product-surface change in this slice
```

**Tech Stack:** TypeScript strict, Vitest, NestJS (`@nestjs/common` / `@nestjs/core` peers), existing `@resource-forge/core` APIs (`createResource`, `validateResource`, `projectResourceMetadata`, `createInMemoryResourceRegistry`, `ResourceRegistry`)

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-031 Accepted (#106)
       ↓
M4.1 plan Draft → M5 Plan Review → Accepted (#106)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M10 as applicable + Slice Completion Report
       ↓
one delivery PR for tracking #106 containing Accepted plan + implementation + SCR
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M4.1 delivery slice. Do **not** open a separate plan-only merge PR as a required gate. M6 treats Accepted RFC-031 text as authoritative for semantics.

**Task checkboxes:** Completed during **M6 execution** only.

---

## Locked decisions (planning aids — not new product semantics)

| Decision | Lock |
| --- | --- |
| Product semantics owner | RFC-031 Accepted text only |
| Registry type | Core `ResourceRegistry` via `createInMemoryResourceRegistry()` for the init registry |
| Parallel Nest registry model | **Forbidden** |
| Init isolation | Fresh private init registry; DI exposure only after all registrations succeed |
| Shared pre-visible registry mutation via `forRootAsync` | **Forbidden** |
| Transactional core registry API | **Forbidden** (do not add to core) |
| Discoverability marker | Nest metadata decorator only — no Field/Relation/Operation DSL |
| Declaration provider contract | Nest-local `provideResource(): Resource \| Promise<Resource>` — exactly one core `Resource` (sync or awaited). **`Resource[]` is not a supported return shape.** |
| Async resolution | **Allowed** — hosting awaits `Promise<Resource>` at the Nest resolution boundary (no fetch/load semantics) |
| DI availability invariant | `RESOURCE_REGISTRY` DI availability ≡ successful completion of the entire hosting lifecycle |
| Validation / projection | Call core `validateResource` then `projectResourceMetadata`; no Nest reimplementation |
| Duplicate identity | Surface core `duplicate_registration` as hosting failure; no last-wins |
| GraphQL / Prisma / emitters / query APIs | **Out of scope** |
| `packages/core/**` product changes | **Forbidden** in this delivery diff |
| Nest peer major | Peer `@nestjs/common` + `@nestjs/core` `^10.0.0 \|\| ^11.0.0` (planning pin; adjust only if install proves incompatible—do not invent product semantics) |

---

## Goal / non-goals of this plan

### In scope

1. Package wiring: Nest peers/devDeps; keep dependency on `@resource-forge/core` only among RF packages.
2. Discoverability marker + `ResourceDeclarationProvider` contract.
3. Hosting lifecycle implementation using core validate/project/register.
4. `ResourceForgeModule.forRoot` / `forRootAsync` with fail-closed readiness and private init registry.
5. Nest DI token for the populated `ResourceRegistry` after success.
6. Vitest coverage for success path and RFC-031 failure modes.
7. Package README update + Slice Completion Report; roadmap/index consistency for M4.1 delivery.

### Out of scope (plan non-goals)

1. Any `@resource-forge/core` semantic/API change.
2. GraphQL or Prisma packages.
3. Decorator DSL beyond discoverability.
4. Metadata emitters; query/navigation host APIs.
5. Intentional `replace` on re-init.
6. Expanding RFC-028 into ORM realization.

---

## Constraints (SHALL / SHALL NOT)

Derived only from Accepted RFC-031:

1. SHALL place product surface in `@resource-forge/nest` (RFC-031 §3).
2. SHALL depend on `@resource-forge/core`; core MUST NOT depend on Nest (RFC-031 §3).
3. SHALL NOT depend on `@resource-forge/graphql` or `@resource-forge/prisma` (RFC-031 §3).
4. SHALL use a core `ResourceRegistry` and MUST NOT invent a parallel Nest registry model (RFC-031 §4).
5. SHALL keep the init registry private until all discovered declarations register successfully; DI exposure only then (RFC-031 §4 / §8 / §10).
6. SHALL own a fresh init registry (or equivalent isolation); MUST NOT mutate a shared already-visible registry during init (RFC-031 §4 / §5).
7. SHALL NOT invent a transactional `ResourceRegistry` API in core (RFC-031 §4 / §8).
8. SHALL discover marked providers that resolve to exactly one core `Resource` (RFC-031 §6).
9. SHALL limit markers to discoverability only (RFC-031 §6.2).
10. SHALL run lifecycle **discover → resolve → validate → project → register** using core validate/project (RFC-031 §7).
11. SHALL fail closed on discovery/resolution/validation/projection/registration failure (RFC-031 §8).
12. SHALL treat core `duplicate_registration` as hosting failure with no Nest conflict policy (RFC-031 §9).
13. SHALL NOT introduce resource-loading/fetch semantics via `forRootAsync` (RFC-031 §5).
14. SHALL NOT reopen M3 / RFC-005–030 / deferred emitters (RFC-031 §1.2 / §15).

---

## Ownership boundaries

| Area | Role |
| --- | --- |
| `docs/superpowers/specs/2026-08-10-rfc-031-nest-discovery-host-integration-design.md` | Authoritative Accepted semantics — do not redesign |
| `packages/nest/**` | Implementation ownership |
| `packages/nest/package.json` | Nest peer/dev dependency wiring |
| `packages/core/**` | **Must remain untouched** in this delivery diff |
| `packages/graphql/**`, `packages/prisma/**` | Untouched |
| `docs/roadmap.md`, specs index, this plan + SCR | Docs/process closeout for the slice |

---

## Contract inventory (planning surface names)

Exact export spellings are planning aids; roles are normative per RFC-031.

| Surface | Role | RFC-031 |
| --- | --- | --- |
| `ResourceForgeModule` | Nest dynamic module entry (`forRoot` / `forRootAsync`) | §5 |
| `DiscoverableResource` (decorator) | Discoverability marker only | §6 |
| `ResourceDeclarationProvider` | Nest-local `provideResource(): Resource \| Promise<Resource>` → exactly one `Resource` (`Resource[]` not supported) | §6 |
| `RESOURCE_REGISTRY` (DI token) | Injects populated core `ResourceRegistry` after success | §10 |
| Hosting lifecycle runner | Ordered validate → project → register into init registry | §7–§9 |
| Nest discovery adapter | Finds marked providers in Nest context | §6 |

**Deferred / not authorized:** GraphQL/Prisma surfaces; Field/Relation/Operation decorators; emitter APIs; query APIs; core transactional registry.

---

## File structure (planning)

| Path | Responsibility |
| --- | --- |
| `packages/nest/package.json` | peers/devDeps for Nest; keep `core` dependency |
| `packages/nest/src/tokens.ts` | `RESOURCE_REGISTRY` injection token |
| `packages/nest/src/discoverable.decorator.ts` | Discoverability metadata marker |
| `packages/nest/src/resource-declaration.ts` | `ResourceDeclarationProvider` interface + type guard helpers |
| `packages/nest/src/hosting-lifecycle.ts` | Pure/host-agnostic lifecycle over `Resource[]` + `ResourceRegistry` |
| `packages/nest/src/hosting.explorer.ts` | Nest `DiscoveryService` → resolve providers → `Resource[]` |
| `packages/nest/src/resource-forge.module.ts` | `ResourceForgeModule` + factory that hosts then provides registry |
| `packages/nest/src/index.ts` | Public exports |
| `packages/nest/src/*.test.ts` | Vitest unit + Nest testing-module integration tests |
| `packages/nest/README.md` | Host usage aligned with RFC-031 |

---

## Slice sequence

```text
Slice A — Package wiring (Nest peers/devDeps; reflect-metadata as needed for tests)
Slice B — Marker + declaration provider contract + hosting lifecycle (unit TDD)
Slice C — Nest discovery + ResourceForgeModule forRoot (integration TDD)
Slice D — forRootAsync + isolation / failure-mode tests
Slice E — README + docs index consistency + SCR (M7–M10 as applicable)
```

Hard prerequisites: A before C/D; B before C; C before D preferred; E last. Do **not** mark M4.1 ✅ until product tasks + SCR complete.

---

## TDD / verification strategy

**TDD:** Required for `@resource-forge/nest` product code.

**Primary behaviors to prove:**

1. Success: one marked provider → registry lookup hit after module init; injected registry is the populated instance.
2. Lifecycle order uses core validate/project/register (spy or observable effects: invalid resource never registered; valid resource registered with projected metadata).
3. Duplicate identity → module init fails; registry DI not successfully usable as ready integration.
4. Resolution failures at module/explorer boundary: throw; non-Resource; zero/multiple via **malformed test doubles** (not via advertised `Resource[]` API) → init fails.
5. Sync and `Promise<Resource>` providers both succeed when they yield one valid `Resource`.
6. Init isolation / no-partial-exposure: fresh registry; failed init does not expose `RESOURCE_REGISTRY` as a successful ready integration (**asserted at `ResourceForgeModule` level**).
7. `forRootAsync` configures Nest options without inventing fetch/load APIs and without accepting a shared pre-visible registry to mutate.
8. Dependency boundary: nest `package.json` has no graphql/prisma deps; `git diff` shows **no** `packages/core` product changes.

**Commands (M6):**

```bash
pnpm --filter @resource-forge/nest test
pnpm --filter @resource-forge/nest typecheck
git diff --name-status <base>...HEAD -- packages/core   # expect empty
```

---

## Task breakdown

### Task 1: Nest package wiring (Slice A)

**Files:**
- Modify: `packages/nest/package.json`
- Modify: `packages/nest/README.md` (dependency note only if needed)
- Possibly root install lockfile via `pnpm` from repo root

- [x] **Step 1:** Add peerDependencies `@nestjs/common` and `@nestjs/core` (`^10.0.0 \|\| ^11.0.0`)
- [x] **Step 2:** Add matching devDependencies so Vitest/Nest testing module can compile and run
- [x] **Step 3:** Ensure `reflect-metadata` is available to tests (devDependency or documented Nest peer expectation—prefer explicit nest test setup import)
- [x] **Step 4:** Confirm dependencies still include `@resource-forge/core` and do **not** include `@resource-forge/graphql` or `@resource-forge/prisma`
- [x] **Step 5:** Run `pnpm install` at repo root; `pnpm --filter @resource-forge/nest typecheck` still passes (placeholder exports OK)

### Task 2: Tokens, marker, declaration contract (Slice B)

**Files:**
- Create: `packages/nest/src/tokens.ts`
- Create: `packages/nest/src/discoverable.decorator.ts`
- Create: `packages/nest/src/resource-declaration.ts`
- Create: `packages/nest/src/discoverable.decorator.test.ts`
- Create: `packages/nest/src/resource-declaration.test.ts`
- Modify: `packages/nest/src/index.ts`

- [x] **Step 1: Write failing tests** for:
  - `RESOURCE_REGISTRY` token exists (unique injection token)
  - `@DiscoverableResource()` sets discoverability metadata readable via Nest `Reflector` / metadata key
  - `isResourceDeclarationProvider` accepts objects with `provideResource` function
- [x] **Step 2: Run tests — expect FAIL**
- [x] **Step 3: Minimal implementation**

Planning shapes (non-normative names OK if roles preserved):

```ts
// tokens.ts
export const RESOURCE_REGISTRY = Symbol('RESOURCE_REGISTRY');

// discoverable.decorator.ts
export const DISCOVERABLE_RESOURCE_METADATA = 'resource-forge:discoverable-resource';
export function DiscoverableResource(): ClassDecorator { /* SetMetadata(...) */ }

// resource-declaration.ts
import type { Resource } from '@resource-forge/core';
export interface ResourceDeclarationProvider {
  /** Exactly one already-constructed core Resource (sync or Promise). Resource[] is not supported. */
  provideResource(): Resource | Promise<Resource>;
}
```

- [x] **Step 4: Tests PASS**
- [x] **Step 5:** Export marker, token, and interface from package index

### Task 3: Hosting lifecycle unit (Slice B)

**Files:**
- Create: `packages/nest/src/hosting-lifecycle.ts`
- Create: `packages/nest/src/hosting-lifecycle.test.ts`

- [x] **Step 1: Write failing tests** covering:
  1. Happy path: valid `Resource[]` → `createInMemoryResourceRegistry()` → after `runHostingLifecycle`, `lookup` is hit with projected metadata identity
  2. Calls `validateResource` then `projectResourceMetadata` then `register` (spies OK)
  3. Invalid resource → **lifecycle failure is surfaced and does not return a successful hosting result** (partial internal mutation of the private registry is allowed at this layer; no-partial-**exposure** is asserted in Task 4)
  4. Duplicate identities in input → failure via core `duplicate_registration`
  5. Empty input list → success with empty registry (no providers is valid)
- [x] **Step 2: Run — expect FAIL**
- [x] **Step 3: Implement** `runHostingLifecycle(resources: Resource[], registry: ResourceRegistry): Result<void, HostingError>` (error type Nest-local; wrap core errors; do not reimplement validation rules)
- [x] **Step 4: Resolution await helper** (explorer/module boundary; not a public `Resource[]` contract) in `resource-declaration.ts` or explorer:

```ts
// planning aid — internal resolution boundary only
async function awaitProvidedResource(
  provider: ResourceDeclarationProvider,
): Promise<Result<Resource, HostingError>>
// await provideResource() when Promise
// on throw → hosting failure
// on fulfilled value: subject to core validateResource in lifecycle
// zero/multiple/malformed: exercise via test doubles casting unknown at this boundary only
// do NOT advertise Resource[] as a supported provideResource() return type
```

- [x] **Step 5: Tests PASS**

### Task 4: Nest explorer + module forRoot (Slice C)

**Files:**
- Create: `packages/nest/src/hosting.explorer.ts`
- Create: `packages/nest/src/resource-forge.module.ts`
- Create: `packages/nest/src/resource-forge.module.test.ts`
- Modify: `packages/nest/src/index.ts`

- [x] **Step 1: Write failing Nest testing-module tests** (`@nestjs/testing`):
  1. App with `ResourceForgeModule.forRoot()` + one `@DiscoverableResource()` provider implementing sync `provideResource(): Resource` → `app.get(RESOURCE_REGISTRY)` lookup hit
  2. Same with `provideResource(): Promise<Resource>` → lookup hit
  3. Duplicate identity providers → `NestFactory.create` / `compile`+`init` fails; `RESOURCE_REGISTRY` is **not** available as a successful ready integration
  4. Resolution failures via **malformed test doubles** (throw; non-Resource; zero/multiple yielded through an internal/test-only boundary—not a public `Resource[]` API) → init fails; no successful DI exposure
  5. Unmarked provider returning a Resource → **not** discovered (registry miss for that identity)
  6. **No-partial-exposure:** when a later provider fails after an earlier one would have registered, module init fails and dependents must not observe a ready `RESOURCE_REGISTRY` exposing the partial population
- [x] **Step 2: Run — expect FAIL**
- [x] **Step 3: Implement explorer** using Nest `DiscoveryService` + metadata key to collect instances, `await` `provideResource()`, gather `Resource[]` for the lifecycle
- [x] **Step 4: Implement `ResourceForgeModule.forRoot()`** so that:
  - factory creates **fresh** `createInMemoryResourceRegistry()`
  - runs discovery + `runHostingLifecycle` **inside** the provider factory (or equivalent gate) **before** the registry token resolves successfully
  - on failure, factory throws / returns rejected init so Nest bootstrap fails
  - on success, provide the same registry instance via `RESOURCE_REGISTRY`
  - import `DiscoveryModule` as required by Nest discovery
  - preserve invariant: **DI availability of `RESOURCE_REGISTRY` ≡ successful completion of the entire hosting lifecycle**
- [x] **Step 5: Tests PASS**
- [x] **Step 6:** Export `ResourceForgeModule`, `DiscoverableResource`, `RESOURCE_REGISTRY`, `ResourceDeclarationProvider`

**Isolation note (implements RFC-031 §4/§8):** Do not register a globally visible registry provider that is mutated later in `onModuleInit` after dependents could have injected it. Prefer “host-in-factory, then expose” so DI availability ≡ success. Layering: `hosting-lifecycle` = ordered processing + failure propagation; `ResourceForgeModule` = private registry + lifecycle + expose only on success.

### Task 5: forRootAsync + config isolation (Slice D)

**Files:**
- Modify: `packages/nest/src/resource-forge.module.ts`
- Modify: `packages/nest/src/resource-forge.module.test.ts`

- [x] **Step 1: Write failing tests** for `forRootAsync`:
  1. Async Nest options factory can supply Nest-only options (even if options are currently empty/`Record` placeholder) and still host successfully
  2. Does **not** expose a public option to inject an external shared `ResourceRegistry` for mutation during init (absence is the lock—do not add `registry:` option)
  3. No API resembling resource fetch/load policy configuration
- [x] **Step 2: Implement `forRootAsync`** with standard Nest `useFactory`/`inject`/`imports` pattern for module options only
- [x] **Step 3: Tests PASS**

### Task 6: Docs + boundary verification (Slice E)

**Files:**
- Modify: `packages/nest/README.md`
- Modify: `docs/roadmap.md` (M4.1 delivery status when shipping)
- Verify: `docs/superpowers/specs/README.md` already lists RFC-031 Accepted
- Modify: this plan SCR section during M6–M10

- [x] **Step 1:** Rewrite nest README for discovery-first host usage (module, marker, provider, inject registry); remove “placeholder only” wording
- [x] **Step 2:** Confirm `git diff --name-status <base>...HEAD -- packages/core` is empty
- [x] **Step 3:** Confirm nest package.json has no graphql/prisma dependencies
- [x] **Step 4:** Run full nest test + typecheck green
- [x] **Step 5:** Fill Slice Completion Report; mark M4.1 ✅ on roadmap only after SCR complete

### Task 7: Placeholder cleanup

**Files:**
- Modify: `packages/nest/src/index.ts`
- Modify: `packages/nest/src/index.test.ts`

- [x] **Step 1:** Keep or replace `PACKAGE_NAME` / `PACKAGE_VERSION` smoke exports consistently with other packages
- [x] **Step 2:** Update index tests so they assert public hosting exports exist (module, token, decorator) rather than only placeholder strings
- [x] **Step 3:** Remove obsolete TODO comments that claim no Nest integration exists

---

## Traceability

| Task | RFC-031 sections |
| --- | --- |
| Task 1 package wiring | §3 |
| Task 2 marker/token/provider | §6, §10 |
| Task 3 hosting lifecycle | §7, §8, §9 |
| Task 4 module forRoot + discovery | §4, §5, §6, §7, §8, §10 |
| Task 5 forRootAsync | §5, §4 isolation |
| Task 6 docs/verification | §1.2 deferrals; packaging |
| Task 7 export cleanup | §3, §10 |

---

## Execution risks (operational — not redesign)

1. Nest provider init ordering: prefer host-in-factory over post-inject `onModuleInit` mutation to satisfy DI availability ≡ success.
2. Nest testing module + ESM: follow existing vitest config; import `reflect-metadata` first in Nest tests if required.
3. Local vitest/tinypool flakiness may appear; prefer package-filter runs and CI as source of truth if environment issues recur.
4. Do not “fix” isolation by adding core transactional APIs.

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M4.1 Nest Discovery-First Host |
| Tracking | [#106](https://github.com/rexescario-dev/resource-forge/issues/106) |
| M4 | Implementation Plan: **Accepted** |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | **Approved** |
| M8 | **N/A** (no broad refactor pass required) |
| M9 | **Complete** (package README + roadmap indexing) |
| Branch | `feat/m4-1-nest-discovery-host` |
| PR | _pending fill after open_ |
| Status | **Ready for merge** |

### Shipped

- `@resource-forge/nest` discovery-first host: `ResourceForgeModule.forRoot` / `forRootAsync`
- `@DiscoverableResource` marker + `ResourceDeclarationProvider` (`Resource | Promise<Resource>`)
- Hosting lifecycle validate → project → register into fresh private core `ResourceRegistry`
- DI token `RESOURCE_REGISTRY` available only after full hosting success (host-in-factory)
- Vitest coverage for success, async provider, duplicates, resolution failures, unmarked providers, no-partial-exposure
- Docs: nest README + roadmap M4.1 ✅; RFC-031 Accepted indexed

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (`pnpm --filter @resource-forge/nest test` — 24) |
| Typecheck | **Passed** (`pnpm --filter @resource-forge/nest typecheck`) |
| Lint | **Skipped** (not required by plan) |
| Build | **Skipped** (typecheck covers compile of src) |
| Package validation | **Passed** (`packages/core` delivery diff empty; no graphql/prisma nest deps) |

### Next Gate

**None — slice complete** (await human merge of `#106` PR). M4.2 GraphQL only when explicitly started.

---

## Document status

**Status: Accepted.** Authoritative for M4.1 sequencing/execution. RFC-031 remains authoritative for product semantics. M6 may begin.
