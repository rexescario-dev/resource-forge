# M4.3.3 Prisma Client Persistence Bindings — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD. Implement **only** Accepted RFC-035 Prisma Client persistence bindings in `@resource-forge/prisma`. Do **not** change `@resource-forge/core` product semantics. Do **not** depend on `@resource-forge/nest` or `@resource-forge/graphql`. Do **not** import/require `@prisma/client`, Prisma CLI/engine, or database access. Do **not** require `verifyPrismaCorrespondence` / `dmmf` for binding. Do **not** invent Resource PK, Relation writes, `findMany`, transactions, includes, cascade/fetch realization, raw Prisma-arg public APIs, Client registry/unit binder, or reopen RFC-005–RFC-034 / M3. Do **not** use realized model name for delegate lookup or runtime model/delegate correspondence validation (host injects the delegate). Preserve: Resource-shaped scalar CRUD; realization-only mapping source; structural delegate port; `Result<T, PrismaBindingError>` categories; emit/verify Client-free install invariant.

**Status:** Accepted  
**M5:** Accepted (2026-08-10) — Plan Review; no plan blockers after editorial corrections: (1) create requiredness follows existing Resource declared requiredness semantics (currently `optional` governs; never Prisma metadata); (2) realized model name is binding-map metadata only — never delegate lookup or runtime model/delegate validation. Async/rejection → `delegate_failed` with cause; bidirectional name-overlay + `prismaExtra` non-projection tests required; missing projected field tested only after delegate success. Core untouched; Nest/GraphQL/Client/CLI/`findMany`/relation writes/tx/includes/cascade/fetch/reverse fenced. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#118](https://github.com/rexescario-dev/resource-forge/issues/118)  
**Source RFC:** [RFC-035 Prisma Client Persistence Bindings](../specs/2026-08-10-rfc-035-prisma-client-bindings-design.md) (**Accepted**)  
**Depends on:** RFC-001 / RFC-005 / RFC-007 / RFC-009 / RFC-013 / RFC-014 / RFC-024 / RFC-028 (**Accepted**; consumed); RFC-008 / RFC-010 / RFC-011 / RFC-015 / RFC-026 / RFC-027 (**fenced**); RFC-031 / RFC-032 (**Accepted**; closed/independent); RFC-033 (**Accepted**; optional compose only); RFC-034 (**Accepted**; `PrismaRealizationMapping` / identity / names reused — **not** redefined); M4.3.1 / M4.3.2 Slice complete  
**Package:** `@resource-forge/prisma` (consumes `@resource-forge/core`; **no** runtime `@prisma/client` import; **no** required Prisma CLI/engine)  
**Slice:** M4.3.3 only — thin per-Resource persistence binding  
**Goal:** Deliver `createPrismaResourceBinding` so a host can inject a structural model delegate and perform Resource-shaped scalar `create` / `findUnique` / `update` / `delete` using RFC-034 realization mapping—without making Prisma authoritative, without requiring verification proofs, and without expanding into query/relation/transaction runtime.

**Architecture:**

```text
RFC-035 (Accepted)
└── Thin per-Resource persistence binding

@resource-forge/prisma
├── PrismaBindingError (+ categories)
├── StructuralModelDelegate (compile-time type)
├── resolveBindingMap (internal; realization-only)
├── createPrismaResourceBinding(...)
│     └── { create, findUnique, update, delete }
└── tests with fake delegates only

Existing (untouched semantics):
├── emitPrismaSchema
└── verifyPrismaCorrespondence

packages/core — consumed only; no product-surface change
packages/nest, packages/graphql — untouched; no dependency
```

**Tech Stack:** TypeScript strict, Vitest, existing `@resource-forge/core` APIs (`Result` / `ok` / `err`, Resource Field `optional`/`nullable`, identity). Reuse RFC-034 `PrismaRealizationMapping` / `InstanceIdentity` types from `realization.ts`. Extend `@resource-forge/prisma` only.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-035 Accepted (#118)
       ↓
M4.3.3 plan Draft → M5 Plan Review → Accepted
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M10 as applicable + Slice Completion Report
       ↓
one delivery PR for tracking #118 containing Accepted RFC
+ Accepted plan + implementation + SCR
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M4.3.3 delivery slice. Do **not** open a separate plan-only merge PR as a required gate. M6 treats Accepted RFC-035 text as authoritative for semantics.

**Task checkboxes:** Completed during **M6 execution** only. Leave unchecked until M6 runs.

---

## Locked decisions (planning aids — not new product semantics)

| Decision | Lock (from RFC-035) |
| --- | --- |
| Product semantics owner | RFC-035 Accepted text only |
| Package | `@resource-forge/prisma` only |
| Core product changes | **Forbidden** |
| Nest / GraphQL package deps | **Forbidden** |
| Runtime `@prisma/client` import | **Forbidden** |
| Emit/verify need Client installed | **Forbidden** (install invariant) |
| `peerDependencies` on `@prisma/client` | **Prefer omit** in this slice (README documents host Client ownership). Adding a peer would risk emit/verify install friction; packaging MAY revisit later without new product semantics |
| Public Prisma-arg façade | **Forbidden** — `delegate.create({ data })` etc. stay **internal** behind Resource-shaped ops |
| Factory | `createPrismaResourceBinding({ resource, realization, delegate })` |
| Ops | `create` / `findUnique` / `update` / `delete` only |
| Value language | Resource-shaped scalars in/out |
| Mapping source | `PrismaRealizationMapping` only |
| Verify / `dmmf` precondition | **Forbidden** |
| Identity | Single-field RFC-034 rule; `prismaExtra` separate input |
| Required create scalars | Follow the Resource Field’s **existing declared requiredness** semantics; in the current Field model, `optional === false` means the value must be supplied and `optional === true` permits omission. Do **not** infer requiredness from Prisma metadata (nullability/`@default`). M4.3.3 is not the authority over Field semantics. |
| Realized model name | Resolved into the internal binding map as **metadata only**. MUST NOT be used for delegate lookup (`delegate[modelName]`) or runtime validation that the injected delegate corresponds to that model. Host owns delegate selection. |
| `findUnique` miss | `ok(null)` |
| Update identity Field in patch | `identity_invalid` |
| Missing projected column | `binding_invalid` — only after delegate **success** (not conflated with `delegate_failed`) |
| Delegate throw / reject | `delegate_failed` + cause; structural port MUST allow Promise rejection / async failure, not sync-only |
| Runtime delegate check | callability of four methods only |

### Planning placement of modules (non-normative layout)

```text
packages/prisma/src/
  binding-errors.ts      # PrismaBindingError + categories/codes + helpers
  binding-delegate.ts    # StructuralModelDelegate type
  binding-map.ts         # resolve internal binding map
  binding.ts             # createPrismaResourceBinding + ops
  binding.test.ts        # fake-delegate tests
  index.ts               # exports
```

Internal Prisma call shapes (planning detail, **not** public API):

```text
delegate.create({ data })
delegate.findUnique({ where })
delegate.update({ where, data })
delegate.delete({ where })
```

These shapes MUST be derived only to satisfy the structural delegate contract and realization field names. Do **not** export them as a public Prisma-argument abstraction. Methods MAY return Promises; rejection MUST become `delegate_failed` while retaining the original cause. Do **not** make the structural port synchronous-only.

---

## Goal / non-goals of this plan

**Goal:** Sequence M6 so `@resource-forge/prisma` gains `createPrismaResourceBinding` implementing RFC-035, with fake-delegate tests covering the fail-closed catalog and happy paths, without changing core or reopening deferred slices.

**Non-goals (plan):** `findMany`; relation writes; transactions; includes/fetch; cascade actions; Nest/GraphQL composition; reverse generation; uniqueness/1:1 unlocks; public Emit Model / Client registry; changing emit/verify semantics; inventing semantics missing from RFC-035.

---

## Constraints (SHALL / SHALL NOT)

Derived only from Accepted RFC-035:

1. SHALL place product surface in `@resource-forge/prisma` (RFC-035 §3).
2. SHALL depend on `@resource-forge/core`; core MUST NOT depend on Prisma.
3. SHALL NOT depend on Nest or GraphQL.
4. SHALL NOT import or require `@prisma/client`, Prisma CLI/engine, or DB access.
5. SHALL keep emit/verify usable without installing `@prisma/client`.
6. SHALL implement `createPrismaResourceBinding` → `{ create, findUnique, update, delete }` with Resource-shaped scalars.
7. SHALL use `PrismaRealizationMapping` as the sole realization source; no second mapping layer; no raw Prisma-arg public escape hatch.
8. SHALL NOT require verify success, proofs, or `dmmf` for binding.
9. SHALL use `Result<T, PrismaBindingError>` with distinguishable categories `binding_invalid` / `payload_invalid` / `identity_invalid` / `delegate_failed`.
10. SHALL treat `delegate_failed` as an operation-failure category retaining cause; MUST NOT classify it as Resource/correspondence/mapping validation.
11. SHALL runtime-check only that the four delegate ops are callable; MUST NOT claim runtime Prisma arg-shape validation.
12. SHALL fail closed per RFC-035 §7 (including identity collision, missing projection fields, unknown/Relation keys, identity-in-patch).
13. SHALL NOT invent Resource Fields for `prismaExtra` identity or reserved payload identity slots.
14. SHALL NOT reopen RFC-005–034 product locks or change `emitPrismaSchema` / `verifyPrismaCorrespondence` semantics.
15. SHALL resolve realized model name into the binding map as metadata only; SHALL NOT use it for delegate lookup or runtime model/delegate correspondence validation (host injects the delegate).
16. SHALL follow existing Resource declared requiredness for create (currently `optional`); SHALL NOT infer requiredness from Prisma metadata.

---

## Ownership boundaries

| Area | Role |
| --- | --- |
| `packages/prisma/src/binding*.ts` | New binding surface + tests |
| `packages/prisma/src/realization.ts` | **Reuse types only**; no emit-semantic changes |
| `packages/prisma/src/index.ts` | Export binding public surface |
| `packages/prisma/README.md` | Document binding + Client-free emit/verify + host owns Client |
| `docs/roadmap.md`, specs index, this plan + SCR | Closeout |
| `packages/core`, `packages/nest`, `packages/graphql` | **Untouched** product surface |
| Emit / verify modules | **Untouched** product semantics |

---

## Contract inventory (authorized surfaces)

| Surface | Role | RFC-035 |
| --- | --- | --- |
| `createPrismaResourceBinding(...)` | Public factory | §3.2 |
| `PrismaResourceBinding` ops | CRUD | §6.3 |
| `StructuralModelDelegate` | Compile-time port | §3.3 |
| `PrismaBindingError` + categories | Failure product | §8 |
| Internal binding map | Realization-derived | §5 |
| Existing `PrismaRealizationMapping` | Sole mapping source | §3.4 / RFC-034 |

Deferred: `findMany`; relation writes; transactions; includes; cascade/fetch; Nest/GraphQL; Client registry; unit binder; raw Prisma public args; reverse generation.

---

## Slice / milestone sequence

```text
Task 1  Errors + StructuralModelDelegate types
Task 2  Binding map resolution (factory fail-closed)
Task 3  createPrismaResourceBinding + CRUD ops (TDD)
Task 4  Public exports + README + dependency posture check
Task 5  Roadmap / SCR scaffolding (filled at M6–M10)
```

Hard prerequisites: Task 1 before 2–3; Task 2 before or with 3; Task 4 after 3 green.

---

## TDD / verification strategy

1. All binding tests use **fake structural delegates** only (RFC-035 §9).
2. For each behavior: write failing test → implement → green.
3. After implementation: `pnpm --filter @resource-forge/prisma test|typecheck|lint`.
4. Confirm `packages/prisma/package.json` has **no** `@prisma/client` dependency (runtime or hard peer that breaks emit/verify-only installs).
5. Confirm emit/verify existing tests still pass unchanged in contract.

---

## Task breakdown

### Task 1: Binding errors + delegate type

**Files:**
- Create: `packages/prisma/src/binding-errors.ts`
- Create: `packages/prisma/src/binding-delegate.ts`
- Test: extend via Task 3 suite (or thin `binding-errors` smoke if useful)

- [x] **Step 1:** Define `PrismaBindingErrorCategory` = `binding_invalid` \| `payload_invalid` \| `identity_invalid` \| `delegate_failed` and `PrismaBindingError` (`category`, `code?`, `message`, `cause?`) plus helper(s). Exact `code` string enums may refine within categories (RFC-035 §1.3 / §8).
- [x] **Step 2:** Define `StructuralModelDelegate` with the four methods. Document that call argument objects are Prisma-shaped **internally** only.
- [x] **Step 3:** Typecheck module; no `@prisma/client` imports.

**Trace:** RFC-035 §3.3, §8.

### Task 2: Resolve internal binding map

**Files:**
- Create: `packages/prisma/src/binding-map.ts`
- Test: covered primarily in Task 3 factory cases

- [x] **Step 1:** Implement `resolveBindingMap(resource, realization)` → `Result<InternalBindingMap, PrismaBindingError>` covering:
  - missing identity → `binding_invalid`
  - invalid `resourceField` / `prismaExtra` reuse of RFC-034 identity rules → `binding_invalid`
  - unknown field name overlays → `binding_invalid`
  - `prismaExtra` collision when a Resource Field maps to the realized `@id` field name → `binding_invalid`
  - bindable Fields = declared scalar Fields only; empty set allowed under `prismaExtra`
  - Field name defaults + overlays from realization (**operational**)
  - Realized model name (default + overlay) stored as **metadata only** — do **not** use it for delegate lookup or runtime validation that the injected delegate matches that model
  - Map contents needed for execution: Field→Prisma field names; identity kind; realized `@id` Prisma field; bindable scalar set; optional model-name metadata
- [x] **Step 2:** Do **not** call verify, touch `dmmf`, use Emit Model, or look up delegates from a Client object graph.

**Trace:** RFC-035 §5, §6.2.2, §7.1.

### Task 3: Factory + CRUD operations (TDD)

**Files:**
- Create: `packages/prisma/src/binding.ts`
- Create: `packages/prisma/src/binding.test.ts`
- Reuse: `packages/prisma/src/test-fixtures.ts` / realization types as needed

- [x] **Step 1:** Write failing tests for factory:
  - happy resolve + returns four ops
  - missing/non-callable delegate method → `binding_invalid`
  - missing identity / collision → `binding_invalid`
- [x] **Step 2:** Write failing tests for ops (`resourceField`):
  - create/findUnique/update/delete happy path with name overlays
  - **Bidirectional create projection:** Resource `{ id, displayName }` → internal `delegate.create({ data: { realized_id, realized_display_name } })` → returned Prisma row maps back to Resource `{ id, displayName }`
  - `findUnique` miss → `ok(null)`
  - unknown / Relation keys → `payload_invalid`
  - missing create value when Field declared requiredness requires supply (currently `optional: false`) → `payload_invalid`
  - missing identity Field on create → `identity_invalid`
  - identity Field in update patch → `identity_invalid`
  - **After delegate success**, missing mapped column on returned row → `binding_invalid` (not `delegate_failed`)
  - delegate throw → `delegate_failed` with cause
  - delegate **Promise reject** → `delegate_failed` with cause
  - update/delete delegate not-found throw/reject → `delegate_failed`
- [x] **Step 3:** Write failing tests for `prismaExtra`:
  - `create(data, identity)` places identity on realized `@id`
  - **Returned projection does not invent identity Field:** Prisma row `{ id: "db-1", name: "Rex" }` → Resource `{ name: "Rex" }` (no `id` key)
  - empty bindable set: `create({}, identity)`, `update(id, {})`, find/delete
  - missing host identity → `identity_invalid`
- [x] **Step 4:** Implement `createPrismaResourceBinding` + ops to green. Map Resource↔Prisma **field** names via binding map only. Do **not** select delegates via model name. Keep Prisma `{ data }` / `{ where }` / `{ where, data }` **private** to the adapter. Support sync throw and async reject → `delegate_failed`.
- [x] **Step 5:** Run `pnpm --filter @resource-forge/prisma test` — all binding + existing suites green.

**Trace:** RFC-035 §3–§7, §6.1, §6.2.2, §7.3, §9.

### Task 4: Exports, README, dependency posture

**Files:**
- Modify: `packages/prisma/src/index.ts`
- Modify: `packages/prisma/src/index.test.ts`
- Modify: `packages/prisma/README.md`
- Modify: `packages/prisma/package.json` (description only unless packaging requires otherwise)
- Verify: no `@prisma/client` in dependencies

- [x] **Step 1:** Export public binding factory, types, and error types from package entry.
- [x] **Step 2:** README: binding usage; host owns Client lifecycle and selects/injects the model delegate (e.g. `client.customer`); realized model name is not used for lookup; emit/verify remain Client-free (no `@prisma/client` install required for those surfaces); no engine in package tests.
- [x] **Step 3:** Export smoke test; confirm package.json has no Client dependency.

**Trace:** RFC-035 §3.1, §9.

### Task 5: Docs closeout hooks (execute with M6–M10 / SCR)

**Files:**
- Modify: `docs/roadmap.md` (M4.3.3 ✅ at delivery)
- Modify: this plan’s Slice Completion Report section at M6–M10
- Specs index already Accepted for RFC-035

- [x] **Step 1 (M9):** Mark roadmap M4.3.3 complete with `#118` link; optionally refresh M4 Status preamble to include M4.3.2/M4.3.3.
- [x] **Step 2:** Fill SCR gates after M7–M10; set Status Slice complete only after delivery merge + SCR closeout per repo convention.

**Trace:** process / RFC-035 §12 deferrals remain fenced in roadmap language.

---

## Traceability matrix

| RFC-035 | Plan tasks |
| --- | --- |
| §3 Package / public surface | 1, 3, 4 |
| §3.3 Delegate port | 1, 3 |
| §5 Binding map | 2, 3 |
| §6 Operations / identity / projection | 3 |
| §6.1 Resource requiredness | 3 |
| §6.1 returned projection / missing field | 3 |
| §6.2.2 `prismaExtra` collision | 2, 3 |
| §7 Fail-closed catalog | 2, 3 |
| §7.3 delegate failure semantics | 3 |
| §8 Errors | 1, 3 |
| §9 Testing | 3, 4 |
| §12 Deferrals | Non-goals; no tasks |

---

## Execution / dependency risks (operational)

1. Accidental public export of Prisma arg types → reject in M7; keep internal.
2. Accidental `@prisma/client` dependency → breaks emit/verify install invariant.
3. Reusing emit-model internals for binding → prefer realization types + local map; do not couple to Emit Model API (still internal/non-public).
4. Inferring requiredness from Prisma metadata → forbidden; use Resource declared requiredness (currently `optional`).
5. Using realized model name for delegate lookup / Client registry → forbidden; host injects delegate.

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M4.3.3 Prisma Client Persistence Bindings |
| Tracking | [#118](https://github.com/rexescario-dev/resource-forge/issues/118) |
| M4 | Implementation Plan: **Accepted** |
| M5 | Review **Accepted** (2026-08-10) |
| M6 | **Complete** |
| M7 | **Approved** (2026-08-10) |
| M8 | **N/A** (no worthwhile behavior-preserving refactor beyond slice delivery) |
| M9 | **Complete** (package README + roadmap M4.3.3 + specs index) |
| Branch | `feat/m4-3-3-prisma-client-bindings` |
| PR | Pending delivery PR for `#118` |
| Status | **Ready for merge** |

### Shipped

- Public `createPrismaResourceBinding` in `@resource-forge/prisma` (Resource-shaped scalar CRUD over injected structural delegate)
- `PrismaBindingError` categories: `binding_invalid` / `payload_invalid` / `identity_invalid` / `delegate_failed`
- Realization-only binding map; model name metadata only; no Client registry
- `resourceField` / `prismaExtra` identity rules; bidirectional name overlays; projection fail-closed
- Fake-delegate tests; no `@prisma/client` dependency; emit/verify unchanged
- Docs: package README, roadmap M4.3.3 ✅, RFC-035 Accepted in specs index

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (`pnpm --filter @resource-forge/prisma test` — 80 tests) |
| Typecheck | **Passed** |
| Lint | **Passed** |
| Build | N/A (package typechecks; dist not required for review) |
| Package validation | **Passed** (deps: `@resource-forge/core` only; no nest/graphql/client) |

### Next Gate

**Merge delivery PR** — then mark Status **Slice complete** / Next Gate **None** after merge (SCR closeout if needed).

### M7 outcome (record)

```text
Decision: Approved for merge
Subject: feat/m4-3-3-prisma-client-bindings / tracking #118
Accepted specification: docs/superpowers/specs/2026-08-10-rfc-035-prisma-client-bindings-design.md
Accepted plan: docs/superpowers/plans/2026-08-10-m4-3-3-prisma-client-bindings.md
Plan tasks: 1–5 covered
Verification: prisma test 80 / typecheck / lint green; packages/core untouched; no nest/graphql/client deps
Rationale: Implements RFC-035 Resource-shaped createPrismaResourceBinding within @resource-forge/prisma; no invented core/Nest/GraphQL/Client-engine semantics; no merge blockers.
```

### M8 / M9 / M10

- **M8:** N/A — no worthwhile behavior-preserving refactor beyond M6 structure.
- **M9:** Complete — package README + roadmap M4.3.3 indexing; RFC-035 already Accepted in specs index.
- **M10:** Accepted for this slice’s process path (gates reachable; SCR emitted; one PR per tracking issue). Workflow prompt library assets were not modified; no library revalidation required.

---

## Document status

**Status: Accepted.** Authoritative for M4.3.3 sequencing/execution history. RFC-035 remains authoritative for product semantics. Delivery ready via tracking `#118`.
