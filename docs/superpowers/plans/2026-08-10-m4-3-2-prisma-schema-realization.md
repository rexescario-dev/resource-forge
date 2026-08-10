# M4.3.2 Prisma Schema Realization — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD. Implement **only** Accepted RFC-034 Prisma schema realization in `@resource-forge/prisma`. Do **not** change `@resource-forge/core` product semantics. Do **not** depend on `@resource-forge/nest` or `@resource-forge/graphql`. Do **not** require Prisma Client, Prisma CLI/engine, or database access for emit. Do **not** invent Resource PK, invent local FK Fields, invent `@unique`, invent `@relation(name: ...)`, realize cascade/fetch, allow implicit m-n, allow FK-realized 1:1, infer unilateral counterparts, or reopen RFC-005–RFC-033 / M3. Preserve: Resource-authoritative emission; single internal Emit Model → `models` + derived DMMF-shaped `dmmf`; Emission Correspondence Invariant (emitter contract; verify composition test/host-only); §4.7 verification-input identity; instance identity `resourceField|prismaExtra` with `@id` scalars `String|Int` only; `number`→`Float` + `Int|Float|Decimal` overlay; join ownership + participant rules; `inverse` absent ⇒ non-pairable; §5.1 phase-ordered fail-closed; provider-independent emit; fail-closed catalog per RFC-034 §7.

**Status:** Accepted  
**M5:** Accepted (2026-08-10) — Plan Review; no plan blockers after M5-readiness revisions (§4.6 provider-independence tests; Emit Model–only `models`; §5.1 phase-ordered short-circuit; unilateral inverse matrix incl. coincidental non-inference; disambiguator fail-closed without synthesis; invariant ≠ verify runtime coupling). Core untouched; Nest/GraphQL/Client/CLI/uniqueness/cascade/fetch/reverse fenced. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#115](https://github.com/rexescario-dev/resource-forge/issues/115)  
**Source RFC:** [RFC-034 Prisma Schema Realization](../specs/2026-08-10-rfc-034-prisma-schema-realization-design.md) (**Accepted**)  
**Depends on:** RFC-001 / RFC-005 / RFC-007 / RFC-008 / RFC-009 / RFC-010 / RFC-011 / RFC-013 / RFC-014 / RFC-015 / RFC-024 / RFC-028 (**Accepted**); RFC-026 / RFC-027 (**fenced**); RFC-031 / RFC-032 (**Accepted**; closed/independent); RFC-033 (**Accepted**; compose with `verifyPrismaCorrespondence`); M4.3.1 Slice complete  
**Package:** `@resource-forge/prisma` (consumes `@resource-forge/core`; extends existing verifier package; **no** Prisma Client; **no** required Prisma CLI/engine public runtime contract)  
**Slice:** M4.3.2 only — Resource → Prisma model schema realization (+ derived DMMF-shaped view)  
**Goal:** Deliver `emitPrismaSchema` so a host can deterministically realize a validated Resource unit as Prisma model semantics (`models`), with a package-defined DMMF-shaped companion (`dmmf`) derived from the same internal Emit Model such that the Emission Correspondence Invariant holds—without inventing core surfaces or coupling Nest/GraphQL.

**Architecture:**

```text
RFC-034 (Accepted)
└── Resource-authoritative Prisma schema realization (no Nest/GraphQL)

@resource-forge/prisma
├── realization resolve (identity, number overlays, join/ownership, names, collisions)
├── Emit Model (internal) ← single semantic source
├── render models (normative product; serialization form planning detail)
├── derive dmmf (package-defined DMMF-shaped; not Prisma-internal DMMF)
└── emitPrismaSchema(resources, realization, options?)  ← public

Existing (untouched semantics):
└── verifyPrismaCorrespondence(resources, dmmf, mapping?)  ← compose via §4.7

packages/core — consumed only; no product-surface change in this slice
packages/nest, packages/graphql — untouched; no dependency
```

**Tech Stack:** TypeScript strict, Vitest, existing `@resource-forge/core` APIs (`createResourceIdentity`, `validateResource`, Field/Relation members, `Result` / `ok` / `err`). Reuse M4.3.1 fixtures/helpers where safe. Extend `@resource-forge/prisma` only.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-034 Accepted (#115)
       ↓
M4.3.2 plan Draft → M5 Plan Review → **Accepted**
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M10 as applicable + Slice Completion Report
       ↓
one delivery PR for tracking #115 containing Accepted RFC (if not already on main)
+ Accepted plan + implementation + SCR
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M4.3.2 delivery slice. Do **not** open a separate plan-only merge PR as a required gate. M6 treats Accepted RFC-034 text as authoritative for semantics.

**Task checkboxes:** Completed during **M6 execution** only. Leave unchecked until M6 runs.

---

## Locked decisions (planning aids — not new product semantics)

| Decision | Lock (from RFC-034) |
| --- | --- |
| Product semantics owner | RFC-034 Accepted text only |
| Package | `@resource-forge/prisma` only |
| Core product changes | **Forbidden** |
| Nest / GraphQL package deps | **Forbidden** |
| Prisma Client / DB / CLI required for emit | **Forbidden** |
| Primary product | `models` = realized Prisma model **semantics** derived from the internal Emit Model; serialization form (SDL string vs AST) is planning detail (§1.3). **`models` is not “whatever Prisma accepts.”** Emit MUST NOT use Prisma parsing/validation as an additional semantic source |
| Companion | Package-defined DMMF-shaped `dmmf` from same Emit Model; not Prisma-internal DMMF |
| Public Emit Model API | **Internal only** in this slice |
| Instance identity | Required per Resource: `resourceField` \| `prismaExtra` |
| `@id` scalars | `String` \| `Int` only (both forms) |
| `resourceField` | `nullable: false` + resolved `String`/`Int` |
| Identity defaults | Structured `cuid` \| `uuid` \| `autoincrement` only |
| `number` | Default `Float`; overlay `Int`\|`Float`\|`Decimal` |
| Join | Resource `join` or host overlay; no invented local FK Fields; remote = target instance `@id` |
| FK ownership | Relation carrying `join` (or overlay-identified owner); dual joins must agree |
| Topology matrix | 1:n/n:1 OK; **1:1 fail**; **m:n fail** |
| `inverse` absent | **Non-pairable**; no invent/infer counterpart |
| `many + nullable:true` | Fail closed |
| Cascade / fetch | Not realized |
| `@relation(name: ...)` | Not synthesized; when topology leaves multiple interpretations requiring a disambiguator → **fail closed** (do not invent a name) |
| Preamble | Optional; composition only; provider-specific validity host-owned (§4.6) |
| Provider validation | Emit validates **only** RFC-034 provider-independent realization/schema semantics; MUST NOT invoke Prisma CLI/engine/client for provider-specific rejection |
| Emission Correspondence Invariant | **Emitter contract** (property of Emit Model). Tests MAY compose emit output with `verifyPrismaCorrespondence`; `emitPrismaSchema` MUST NOT depend on verification execution to produce success |
| §4.7 | Correspondence-relevant realization ≡ verification-facing mapping |
| §5.1 failure ordering | Phases run in RFC-034 §5.1 order; each phase short-circuits on its first applicable failure; no partial artifact |

### Planning placement of Emit Model (non-normative layout; order is normative per RFC-034 §5.1)

```text
1. Reject empty unit
2. validateResource every Resource
3. Resolve realization mapping + collisions
       ↓
build Emit Model (internal)
       ↓
4–6 render models + derive dmmf + invariant property
7. Return success or fail closed
```

---

## Goal / non-goals of this plan

**Goal:** Sequence M6 so `@resource-forge/prisma` gains `emitPrismaSchema` implementing RFC-034, with tests covering RFC-034 §11 case list, without changing core or reopening deferred slices.

**Non-goals (plan):** M4.3.3 Client bindings; uniqueness/`@unique` surface; cascade/fetch realization; reverse generation; Nest/GraphQL composition; public `buildPrismaEmitModel`; inventing semantics missing from RFC-034.

---

## Constraints (SHALL / SHALL NOT)

Derived only from Accepted RFC-034:

1. SHALL place product surface in `@resource-forge/prisma` (RFC-034 §3).
2. SHALL depend on `@resource-forge/core`; core MUST NOT depend on Prisma.
3. SHALL NOT depend on Nest or GraphQL.
4. SHALL NOT require Prisma Client, DB, or Prisma CLI/engine for emit.
5. SHALL use one internal Emit Model as sole semantic source for `models` and `dmmf`. The emitter’s `models` artifact is derived from that Emit Model **without** requiring Prisma parsing/validation; Prisma syntax serialization MUST NOT become an additional semantic source.
6. SHALL implement Emission Correspondence Invariant and §4.7 verification-input identity as an **emitter contract**. Tests MAY compose with `verifyPrismaCorrespondence`; `emitPrismaSchema` MUST NOT call/require verify to succeed.
7. SHALL fail closed per RFC-034 §7 (including empty unit, 1:1, m:n, unilateral non-pairing, invalid `@id` scalars, etc.).
8. SHALL execute RFC-034 §5.1 phases in order; each phase short-circuits on its first applicable failure; MUST NOT return a partial success artifact.
9. SHALL NOT invent Resource PK, local FK Fields, `@unique`, `@relation(name: ...)`, cascade/fetch, or inferred inverses.
10. SHALL NOT perform provider-specific Prisma validation or invoke Prisma CLI/engine/client for emit success/failure (RFC-034 §4.6).
11. SHALL NOT reopen RFC-005–033 product locks or change `verifyPrismaCorrespondence` semantics (compose only).

---

## Ownership boundaries

| Area | Role |
| --- | --- |
| `packages/prisma/src/**` | Emit realization + public `emitPrismaSchema` + tests |
| Existing verify/mapping modules | Reuse where concepts identical; do not force emit-only overlays into verify types |
| `packages/prisma/README.md` | Document emit + compose-with-verify |
| `docs/roadmap.md`, specs index, this plan + SCR | Closeout |
| `packages/core`, `packages/nest`, `packages/graphql` | **Untouched** product surface |

---

## Contract inventory (authorized surfaces)

| Surface | Role | RFC-034 |
| --- | --- | --- |
| `emitPrismaSchema(resources, realization, options?)` | Public emit entry | §3.2 |
| Success `{ models, preamble?, dmmf }` | Split artifact | §3.3 |
| EmitError / fail-closed codes | Failure product | §7 |
| Prisma realization mapping | Identity, number overlays, join overlays, names | §4 |
| Optional preamble options | Host composition only | §4.6 |
| Internal Emit Model | Single semantic source | Thesis / §3.2 |
| `verifyPrismaCorrespondence` | Existing; compose via §4.7 | RFC-033 + §4.7 |

Deferred: public Emit Model API; Client; uniqueness; cascade/fetch; reverse; Nest/GraphQL; custom relation disambiguators.

---

## Slice sequence

```text
A — Emit errors + realization types + fixtures
B — Instance identity + number overlays + name mapping + collisions
C — Join ownership + participants + topology matrix + unilateral non-pairing
D — Emit Model build + models render + dmmf derive
E — emitPrismaSchema orchestration + Emission Correspondence Invariant tests
F — README + roadmap/SCR + public exports closeout
```

Hard prerequisites: A before B/C; B+C before D; D before E; E before F.

---

## Public surfaces requiring implementation (planning aids)

Exact TypeScript spellings are planning aids; roles are normative per RFC-034.

| Export / surface | Notes |
| --- | --- |
| `emitPrismaSchema` | Required public |
| Realization mapping types | Emit-side; may share naming helpers with M4.3.1 where identical |
| Emit error types | Distinct from or extended alongside correspondence errors as planning chooses—semantics per §7 |
| `models` representation | Derived from Emit Model only; prefer structured AST internally; expose serializable form sufficient for hosts to write `schema.prisma` model blocks—exact form planning detail. MUST NOT mean “Prisma-validated schema text” as a second semantic source |
| `dmmf` | Shape sufficient for existing `verifyPrismaCorrespondence` / `normalizeDmmf` consumption |

---

## TDD / verification strategy

1. For each task: write failing Vitest tests first, then implement.
2. Cover RFC-034 §11 item 10 case list (1–17) as automated tests.
3. Round-trip **composition** property (test-only): successful emit ⇒ `verifyPrismaCorrespondence(resources, dmmf, verificationFacingMapping)` succeeds with §4.7 mapping. This does **not** authorize making verify part of emit’s runtime success path.
4. Provider-independence: tests assert emit validates only RFC-034 realization/schema semantics; no Prisma CLI/engine/client invocation; provider-specific validity is not required for emit success.
5. Package gates: `pnpm --filter @resource-forge/prisma test|typecheck|lint`.
6. Assert `packages/core` delivery diff empty; no nest/graphql/client deps; package/source must not add Prisma CLI/engine/client as a required emit runtime dependency.

---

## Task breakdown

### Task 1: Emit errors, realization types, fixtures (Slice A)

- Create/Modify: emit error module; realization type module; extend `test-fixtures.ts`
- [x] **Step 1:** Add `EmitError` / codes covering RFC-034 §7 classes (empty unit, invalid resource, missing/invalid identity, invalid identity scalar/default, invalid number overlay, join/ownership/participant failures, collisions, topology matrix failures, unilateral non-pairing, many+nullable, disambiguator-required realization failure, emit-model/invariant construction failure, …). Note: “correspondence invariant failure” is an **emit-side** fail-closed outcome if the Emit Model cannot be constructed such that the invariant would hold—not a requirement to run `verifyPrismaCorrespondence` inside emit.
- [x] **Step 2:** Add realization mapping types: instance identity discriminant, number overlays, join overlays (including FK-owning Relation id + local/remote + prismaExtra remote reference), optional name mapping, optional preamble options.
- [x] **Step 3:** Extend fixtures for paired 1:n Resources, unilateral Relations, coincidental counterparts, 1:1 pairs, many↔many, identity variants.
- [x] **Step 4:** Confirm package deps remain `@resource-forge/core` only (no Prisma Client/CLI/engine).
- [x] **Step 5:** Commit when M6 runs.

**Trace:** RFC-034 §3–§4, §7.

### Task 2: Identity, scalars, names, collisions (Slice B)

- [x] **Step 1:** Failing tests: `resourceField` String/Int success; `resourceField` nullable true fail; `number`→Float identity fail; `prismaExtra` String/Int success; Float/Decimal/BigInt fail; defaults cuid/uuid/autoincrement + incompatible pairs fail; name collisions fail.
- [x] **Step 2:** Implement resolution of identity + number overlays + name mapping + collision matrix (§4.5).
- [x] **Step 3:** Tests green.

**Trace:** RFC-034 §4.1–§4.2, §4.4–§4.5.

### Task 3: Join ownership, participants, topology, unilateral (Slice C)

Unilateral / inverse matrix (expected):

| Relation situation | Expected |
| --- | --- |
| `inverse` present and valid counterpart | Pairable |
| `inverse` absent | **Non-pairable** → fail when Prisma requires two relation fields |
| `inverse` absent + unrelated `B.aLike` exists | **Still non-pairable** → fail; MUST NOT infer counterpart (§8.8b) |
| `inverse` names nonexistent relation | Fail closed |
| `inverse` points to wrong/incompatible relation | Fail closed |

- [x] **Step 1:** Failing tests covering the matrix above plus: join on singular FK-owning end success; dual conflicting joins fail; missing overlay fail; invent local FK fail; remote non-`@id` fail; `prismaExtra` remote overlay success; 1:1 fail; m:n fail; `many+nullable` fail.
- [x] **Step 2:** When RFC-034’s relation topology leaves multiple valid relation interpretations within the same Prisma model pair that would require `@relation(name: ...)`, fail with the **disambiguator-required** emit error; do **not** synthesize `@relation(name: ...)`.
- [x] **Step 3:** Implement §4.3.1–§4.3.4 + §5.3.5/§5.3.9 relation rules used by emit (including non-inference of coincidental counterparts).
- [x] **Step 4:** Tests green.

**Trace:** RFC-034 §4.3, §5.3, §7, §8.8–§8.10.

### Task 4: Emit Model + models render + dmmf derive (Slice D)

- [x] **Step 1:** Failing tests: Emit Model produces `models` semantics + DMMF-shaped view agreeing on §2 “same emitted model semantics”; preamble passthrough optional and does not affect model/dmmf.
- [x] **Step 2:** Implement internal Emit Model builder + models renderer + dmmf derivation from that model only (no second Resource→dmmf path). The `models` artifact is derived from the Emit Model **without** requiring Prisma parsing/validation; Prisma syntax serialization MUST NOT become an additional semantic source.
- [x] **Step 3:** Provider-independent emission tests: emit validates only RFC-034 realization/schema semantics; provider-specific validity is not required and is not rejected by the emitter unless RFC-034 itself requires it; assert no Prisma CLI/engine/client invocation on the emit success path.
- [x] **Step 4:** Tests green. Do **not** export Emit Model builder as public API.

**Trace:** RFC-034 Thesis, §2, §3.2–§3.3, §4.6, §6.

### Task 5: `emitPrismaSchema` orchestration + invariant (Slice E)

- [x] **Step 1:** Failing end-to-end tests for RFC-034 §5.1 order and §11 case list; empty unit fail. Emission Correspondence Invariant composition tests MAY call `verifyPrismaCorrespondence` with §4.7 mapping; implementation MUST NOT require verify execution to return success.
- [x] **Step 2:** Implement `emitPrismaSchema` according to RFC-034 §5.1 ordering; each phase short-circuits on its first applicable failure and no partial artifact is returned.
- [x] **Step 3:** Export from `index.ts`; update package README usage (emit + compose-with-verify; fence Prisma CLI/Client).
- [x] **Step 4:** Tests green.

**Trace:** RFC-034 §3–§8, §11.

### Task 6: Docs + SCR closeout (Slice F)

- [x] **Step 1:** Update `packages/prisma/README.md` for emit + compose-with-verify; fence Client/CLI/schema-env invention; state provider-specific validity is host-owned.
- [x] **Step 2:** Update `docs/roadmap.md` M4.3.2 indexing when delivery merges.
- [x] **Step 3:** Fill Slice Completion Report below during M6–M10; link delivery PR.
- [x] **Step 4:** Ensure specs README already Accepted for RFC-034.

**Trace:** RFC-034 §12 (docs closeout); process SCR.

---

## Traceability matrix

| RFC-034 section | Tasks |
| --- | --- |
| §3 Public surface / package | 1, 5, 6 |
| §4 Realization mapping | 1–3 |
| §4.6 Provider neutrality | 4–6 |
| §5 Emission rules / order | 3–5 |
| §6 Emission Correspondence Invariant | 4–5 |
| §7 Fail-closed | 1–5 |
| §8 Examples / §11 cases | 2–5 |
| §12 Deferrals | 6 (docs fences) |

---

## Execution / dependency risks (operational)

1. Reusing M4.3.1 mapping types too aggressively could leak emit-only overlays into verify — keep emit realization types separate unless concepts are identical (RFC-034 §3.2 / §4.7).
2. DMMF-shaped derive must remain consumable by existing `normalizeDmmf` / verify without claiming Prisma-internal isomorphism.
3. Avoid accidental Prisma CLI/engine/client dependency for “validity” or provider checks (§4.6).
4. Do not “helpfully” emit `@unique` for 1:1, invent inverses, or infer coincidental counterparts during M6.
5. Do not couple emit success to running `verifyPrismaCorrespondence` — invariant is an Emit Model contract; verify composition belongs in tests/hosts.
6. Do not treat “first failure” as arbitrary iteration order — follow RFC-034 §5.1 phase order.

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M4.3.2 Prisma Schema Realization |
| Tracking | [#115](https://github.com/rexescario-dev/resource-forge/issues/115) |
| M4 | Implementation Plan: **Accepted** |
| M5 | Review **Accepted** (2026-08-10) |
| M6 | **Complete** |
| M7 | **Approved** (2026-08-10) |
| M8 | **N/A** (no worthwhile behavior-preserving refactor beyond slice delivery) |
| M9 | **Complete** (package README + roadmap + specs index) |
| Branch | `feat/m4-3-2-prisma-schema-realization` |
| PR | [#116](https://github.com/rexescario-dev/resource-forge/pull/116) |
| Status | **Slice complete** |

### Shipped

- Public `emitPrismaSchema` in `@resource-forge/prisma` (Resource → Prisma model SDL + derived DMMF-shaped `dmmf`)
- Realization mapping: instance identity (`resourceField` \| `prismaExtra`), number overlays, join overlays, name mapping, optional preamble
- Fail-closed catalog covering RFC-034 §7 / §11 cases 1–17
- Emission Correspondence Invariant composition with existing `verifyPrismaCorrespondence` via `toVerificationMapping` (verify not on emit success path)
- Docs: package README, roadmap M4.3.2 ✅, RFC-034 Accepted in specs index

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (`pnpm --filter @resource-forge/prisma test` — 62 tests) |
| Typecheck | **Passed** |
| Lint | **Passed** |
| Build | N/A (package typechecks; dist not required for review) |
| Package validation | **Passed** (deps: `@resource-forge/core` only; no nest/graphql/client); CI green on [#116](https://github.com/rexescario-dev/resource-forge/pull/116) |

### Next Gate

**None — slice complete.**

### M7 outcome (record)

```text
Decision: Approved for merge
Subject: feat/m4-3-2-prisma-schema-realization / tracking #115 / PR #116
Accepted specification: docs/superpowers/specs/2026-08-10-rfc-034-prisma-schema-realization-design.md
Accepted plan: docs/superpowers/plans/2026-08-10-m4-3-2-prisma-schema-realization.md
Plan tasks: 1–6 covered
Verification: prisma test 62 / typecheck / lint green; packages/core untouched; no nest/graphql/client deps
Rationale: Implements RFC-034 Resource-authoritative emitPrismaSchema within @resource-forge/prisma; no invented core/Nest/GraphQL/Client semantics; no merge blockers.
```

### M8 / M9 / M10

- **M8:** N/A — no worthwhile behavior-preserving refactor beyond M6 structure.
- **M9:** Complete — package README + roadmap M4.3.2 indexing; RFC-034 already Accepted in specs index.
- **M10:** Accepted for this slice’s process path (gates reachable; SCR emitted; one PR per tracking issue). Workflow prompt library assets were not modified; no library revalidation required.

---

## Document status

**Status: Accepted.** Authoritative for M4.3.2 sequencing/execution history. RFC-034 remains authoritative for product semantics. Delivery complete via [#116](https://github.com/rexescario-dev/resource-forge/pull/116).
