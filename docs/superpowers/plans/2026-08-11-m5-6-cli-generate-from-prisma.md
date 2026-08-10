# M5.6 CLI Generate From-Prisma (Bootstrap) — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD. Implement **only** Accepted RFC-041 CLI Generate From-Prisma (Bootstrap). Do **not** invent `schema.prisma → DMMF`, round-trip / RFC-033 verify obligations, `--force`, mkdir outDir, project marker loading, upward discovery, `join` inference, filters, stdin DMMF, Nest/GraphQL wiring, examples population, `run(argv, opts)`, public CLI helpers beyond `run`, or other generate kinds. Preserve RFC-036–040: sole public CLI export `run`; bin stream/exit only; exit `0/1/2` meanings unchanged; doctor registry still requires only `validate` + `doctor`; `generate resource` / `init` / `validate` / `doctor` semantics not reopened. Prisma synthesis MUST use Accepted core construction/validation (`createResourceIdentity` / `validateResource` or equivalent public APIs)—MUST NOT bypass core invariants or add bootstrap-specific repairs/defaulting to appease core. Reverse map is independent of RFC-033/034. Do not sort synthesis emissions in a way that changes member-order semantics; CLI report sorting is separate (model-name). Unexpected-throwable tests use existing boundaries/seams only—no new public injection API. Tests: prisma package unit tests for synthesis + CLI `run(['generate', 'from-prisma', …])`.

**Status:** Accepted  
**M5:** Accepted (2026-08-11) — Plan Review re-entry; no plan blockers after prior return. Minor non-blocking cautions folded: avoid over-coupling throwable tests to internals; preserve distinct member vs report ordering; treat API error as semantic category (named type only if package conventions require); construct per RFC-041 then `validateResource` without bootstrap repairs. RFC-041 remains Accepted and is semantic authority. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#138](https://github.com/rexescario-dev/resource-forge/issues/138)  
**Source RFC:** [RFC-041 CLI Generate From-Prisma (Bootstrap)](../specs/2026-08-10-rfc-041-cli-generate-from-prisma-design.md) (**Accepted**)  
**Depends on:** [RFC-036](../specs/2026-08-10-rfc-036-cli-foundation-design.md) (**Accepted**); [RFC-037](../specs/2026-08-10-rfc-037-cli-resource-validation-design.md) (**Accepted**); [RFC-038](../specs/2026-08-10-rfc-038-cli-package-environment-doctor-design.md) (**Accepted**); [RFC-039](../specs/2026-08-10-rfc-039-cli-generate-resource-design.md) (**Accepted**); [RFC-040](../specs/2026-08-10-rfc-040-cli-init-project-marker-design.md) (**Accepted**) — coexist; semantics not reopened except extending `generate` with kind `from-prisma`  
**Packages:** `@resource-forge/prisma` (synthesis API); `@resource-forge/cli` (thin I/O adapter)  
**Slice:** M5.6 only — DMMF → starter Resource JSON bootstrap  
**Goal:** Deliver `synthesizeResourcesFromDmmf({ dmmf, namespace })` in `@resource-forge/prisma` under the Supported DMMF Profile + closed reverse map, and thin CLI `rf generate from-prisma <dmmfPath> <outDir> --namespace <namespace>` / `run(['generate','from-prisma',…])` with write-safety / exit contracts from RFC-041—without round-trip claims or schema parsing.

**Architecture:**

```text
RFC-041 (Accepted)
└── Bootstrap: DMMF JSON → Resource documents

@resource-forge/prisma
├── validateSupportedDmmfProfile()     # §4.1 — before any model synthesis
├── index complete datamodel.models
├── classify relation conditions       # self / implicit m:n / missing target (complete set)
├── map members (model-local)
├── construct candidate → validateResource()
├── synthesizeResourcesFromDmmf({ dmmf, namespace })
│     → { emissions[], refusals[] } | API error
└── public export of synthesis API (+ result types as needed)

@resource-forge/cli
├── run(argv) sole public export (unchanged)
├── generate handler
│     ├── kind resource → existing RFC-039 path
│     └── kind from-prisma → argv/NS parse → path checks → read JSON
│           → synthesize → collision checks → create-only writes
├── dependency: cli → prisma (public API only) + cli → core
└── tests: run(['generate','from-prisma',…])

Forbidden: schema.prisma parse | Prisma Client/CLI | --force | mkdir outDir |
project discovery | join inference | invert RFC-033/034 | examples/**
recursive related-model synthesis (model-local after global index)
```

**Tech Stack:** TypeScript strict, Vitest, Node ≥20. Sync `fs`/`path` in CLI. Prefer extending existing generate handler. Reuse the existing create-only writer **if its semantics satisfy RFC-041**; otherwise add a narrowly scoped create-only implementation (RFC-041 leaves the concrete primitive implementation-owned — do not force `linkSync` as product contract). No third-party CLI framework.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

**Revision note:** Returned once for targeted test/seam tightenings; M5 Accepted with minor non-blocking cautions recorded in the agent banner (ordering, API-error category, no bootstrap repairs, no public injection API for throw tests).

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-041 Accepted (#138)
       ↓
M5.6 plan Draft → M5 Plan Review → (Accept or Return)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M10 as applicable + Slice Completion Report
       ↓
prefer one delivery PR for tracking #138 containing Accepted plan
+ implementation + SCR
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M5.6 delivery slice. Do **not** open a separate plan-only merge PR as a required gate. Fold plan Accept + implementation into the delivery PR for `#138` when executing M5–M6. M6 treats Accepted RFC-041 text as authoritative for semantics. **Intermediate commits on the delivery branch are permitted**; they are folded into that single delivery PR for `#138`.

**Task checkboxes:** Completed during **M6 execution** only. Leave unchecked until M6 runs.

---

## Locked decisions (planning aids — not new product semantics)

| Decision | Lock (from RFC-041) |
| --- | --- |
| Product semantics owner | RFC-041 Accepted text only |
| Synthesis owner | `@resource-forge/prisma` |
| CLI role | Thin argv / FS / report / exit only |
| Public CLI API | **`run` only** |
| Public prisma API addition | Bootstrap synthesis function + result types required by that function (name MAY be `synthesizeResourcesFromDmmf`); expose a named API-error type only if existing prisma error conventions require it |
| Dependency | `cli → prisma → core` and existing `cli → core`; CLI imports **public** prisma synthesis only |
| Input | Supported DMMF Profile JSON only |
| Duplicate model/field names | **API error** (Accepted RFC-041 §4.1 uniqueness) |
| Namespace | Required; no default |
| Identity | `{ namespace, name: ModelName }` |
| Filename | `{ModelName}.json` (path-safe model names) |
| Per-model | Exactly one of emissions / refusals |
| Scalars | String/Boolean/Int/Float/Decimal only; Float/Decimal → number (lossy) |
| Relations | `kind==="object"`; self + implicit m:n refuse; list → nullable/optional false |
| Inverse | relationName pairing rule; else omit |
| FK scalars | Keep as Fields; no `join` |
| Cascade/fetch | `none` / `lazy` fixed |
| Direction | `outbound` |
| Core authority | `validateResource` (or equivalent public) after mapping |
| Synthesis shape | Profile validate → complete-set relation classify → model-local map → construct → validateResource (no recursive related-model synthesis) |
| CLI surface | `rf generate from-prisma <dmmfPath> <outDir> --namespace <ns>` |
| `--namespace` | Anywhere after kind; sole option |
| FS order | argv → dmmf exists → outDir dir → read/parse → synthesize → destinations → collisions → write |
| Success | ≥1 file written → exit `0` |
| Zero emissions | exit `1`, zero writes |
| Collision | exit `2`, zero writes |
| Missing dmmf path | `2`; unreadable/malformed/profile fail | `1` |
| Write | create-only / no-overwrite; race → `1`; no multi-file rollback |
| Doctor | Still `validate` + `doctor` only |
| Round-trip | **Not required** vs source DMMF |
| Examples | **`examples/**` untouched** |
| Roadmap | May note M5.6 / `#138` when shipping; RFC does not alone mark Done |

### Synthesis Result shape (planning aid — from RFC-041 §4.2)

```ts
type Emission = { model: string; resource: Resource; filename: string };
type Refusal = { model: string; code: string; member?: string; detail: string };
type SynthesisSuccess = { emissions: readonly Emission[]; refusals: readonly Refusal[] };
```

API error vs success-with-refusals distinction is normative (§4.5). Exact refusal `code` strings are implementation-owned (RFC-041 §1.3) so long as they are deterministic and distinguish the refusal classes required by tests.

### File map (planning aid)

| Path | Responsibility |
| --- | --- |
| `packages/prisma/src/bootstrap-from-dmmf.ts` (or split helpers) | Profile validate + map + synthesize |
| `packages/prisma/src/bootstrap-from-dmmf.test.ts` | Unit tests for profile/map/refusals |
| `packages/prisma/src/index.ts` | Export public synthesis API + types |
| `packages/cli/src/commands/generate.ts` | Dispatch `resource` vs `from-prisma` |
| `packages/cli/src/commands/generate-from-prisma.ts` (optional extract) | from-prisma argv + FS orchestration |
| `packages/cli/src/run.ts` | Help text list update if needed |
| `packages/cli/src/run.test.ts` | `run(['generate','from-prisma',…])` coverage |
| `packages/cli/package.json` | Add `@resource-forge/prisma` workspace dep |
| READMEs / `docs/roadmap.md` | Accuracy-only updates |

Exact filenames are planning aids; M6 MAY split/rename within the same ownership boundaries.

---

## Contract inventory (Authorized by RFC-041)

| Surface | Action |
| --- | --- |
| `synthesizeResourcesFromDmmf` (public prisma) | **Add** |
| Emission / Refusal / success types | **Add** as required by the public function |
| Named API-error type | **Add only if** existing prisma error conventions require it |
| `rf generate from-prisma …` | **Add** kind under existing `generate` |
| `rf generate resource …` | **Unchanged** |
| `run` export | **Unchanged** |
| Doctor required registry | **Unchanged** (`validate` + `doctor`) |
| Core package exports | **No new core exports** |
| `schema.prisma` tooling | **Deferred** |
| Round-trip reverse synthesis | **Deferred** |

---

## Slice sequence

1. **Prisma profile + synthesis** (Tasks 1–3) — independently testable without CLI  
2. **CLI adapter** (Tasks 4–5) — depends on public prisma export  
3. **Docs + SCR closeout scaffolding** (Task 6) — after behavior green  

Hard prerequisite: do not wire CLI until synthesis API is exported and covered.

---

## TDD / verification strategy

| Area | Approach |
| --- | --- |
| Prisma synthesis | Vitest first: Supported DMMF / namespace reject as API error; model-level mapping → refusals; unexpected throwables propagate; scalar/relation/inverse/`@map`/`join`-absent seams; model∈exactly-one; field-array ordering |
| CLI | `run(['generate','from-prisma',…])`: usage; namespace placement; **execution-order** path checks; collisions→2 zero writes; zero emissions→1; ≥1 write→0; report model-name order ≠ DMMF order; mid-write create-only fail→1 retained sibling; validate round-trip |
| Doctor | Assert still requires only `validate` + `doctor` |
| Public exports | CLI `run` only; prisma exports synthesis without leaking internals |
| Package checks | `pnpm --filter @resource-forge/prisma test typecheck lint build` and same for `@resource-forge/cli` |

---

## Task breakdown

### Task 1: Supported DMMF Profile validation (prisma)

**Files:**
- Create: `packages/prisma/src/bootstrap-from-dmmf.ts` (profile parse/validate helpers)
- Create: `packages/prisma/src/bootstrap-from-dmmf.test.ts`
- Modify: types/errors as needed (package-local)

**Uniqueness (Accepted RFC-041 §4.1 — not plan-invented semantics):** Duplicate model names and duplicate field names within a model are **API errors**. Rationale already locked by the RFC: deterministic `{ModelName}.json` / identity and the model∈exactly-one invariant cannot be satisfied with ambiguous model names; duplicate field names make member mapping structurally ambiguous under the Supported DMMF Profile.

- [x] **Step 1:** Write failing tests that invalid Supported DMMF rejects the synthesis/profile call as an **API error** (not a model refusal), covering:
  - missing `datamodel.models`
  - field missing `isRequired` / `isList` / `kind` / `type` / `name`
  - object field missing `relationFromFields` / `relationToFields` / `relationName`
  - duplicate model names → API error (RFC-041 §4.1)
  - duplicate field names within a model → API error (RFC-041 §4.1)
  - model-name path safety: separators, `.`, `..`, empty, other non-`^[A-Za-z_][A-Za-z0-9_]*$` identifiers
- [x] **Step 2:** Run tests — expect FAIL.
- [x] **Step 3:** Implement profile validation (before any model synthesis). Do not invent defaults for missing required metadata.
- [x] **Step 4:** Run tests — expect PASS.
- [x] **Step 5:** Commit on delivery branch for `#138` (intermediate commit; folds into single delivery PR).

**Traces:** RFC-041 §4.1, §4.5 (API error vs refusal)

---

### Task 2: Closed reverse map + per-model emit/refuse (prisma)

**Files:**
- Modify: `packages/prisma/src/bootstrap-from-dmmf.ts`
- Modify: `packages/prisma/src/bootstrap-from-dmmf.test.ts`

Pipeline (planning aid): profile OK → index complete model set → classify relation conditions globally → map members model-locally → construct candidate → `validateResource()` → Emission | Refusal. Do **not** recursively synthesize related models.

- [x] **Step 1:** Write failing tests for:
  - Scalar allow-list map + Float/Decimal→number
  - Unsupported scalar / `isList` scalar → model refusal
  - Unsupported `kind` → model refusal (never ignored)
  - `kind === "object"` with unsupported / not-expressible relation shape → refusal (never heuristic mapping)
  - Self-relation → refusal
  - Implicit m:n relation-pair (complete-set, before mapping) → source model refusal
  - Missing related model → source refusal
  - Target model exists but is independently refused (unsupported member) → **source may still emit**; target refused separately
  - Explicit 1:n / 1:1 map with FK scalar retained; **`join` absent** on synthesized relations
  - List relation → `nullable:false` / `optional:false` regardless of `isRequired`
  - Singular relation nullability from `isRequired`
  - Inverse cases (§5.2.5):
    1. non-null equal `relationName` → inverse set
    2. non-null unequal `relationName` → inverse omitted
    3. both null + exactly one backref → inverse set
    4. both null + multiple backrefs → inverse omitted
    5. target has no backref → inverse omitted
  - Field with schema `name` + `dbName` / mapped database name → Resource Field uses DMMF `name` only (`@map` ignored)
  - Model appears in exactly one of emissions/refusals
  - Member order follows `fields` array order
  - Required namespace; invalid/missing namespace → synthesis rejects as API error
  - Model-level mapping problems → refusals (not API errors)
  - Unexpected synthesizer/core throwable → **propagates as API error**; MUST NOT become a model refusal
  - Core construction via public APIs; empty annotations/operations/constraints as core defines
- [x] **Step 2:** Run tests — expect FAIL.
- [x] **Step 3:** Implement mapping + `synthesizeResourcesFromDmmf` (§4.3–4.5, §5). Use `createResourceIdentity` + `validateResource`. Do not call `verifyPrismaCorrespondence`. Do not invent `join`.
- [x] **Step 4:** Run tests — expect PASS.
- [x] **Step 5:** Commit (intermediate; single delivery PR).

**Traces:** RFC-041 §4.2–4.5, §5

---

### Task 3: Public prisma export surface

**Files:**
- Modify: `packages/prisma/src/index.ts`
- Modify: `packages/prisma/src/index.test.ts` (or package export test)
- Modify: `packages/prisma/package.json` description if inaccurate
- Modify: `packages/prisma/README.md` (bootstrap section; state no round-trip guarantee)

- [x] **Step 1:** Write failing export/smoke test that imports synthesis API from package root.
- [x] **Step 2:** Export the public synthesis function and the **result types required by that function** (Emission/Refusal/success). Expose a named API-error type **only if** existing prisma error conventions require it. Keep verify/emit/binding exports intact; do not export internal helpers.
- [x] **Step 3:** `pnpm --filter @resource-forge/prisma test typecheck lint build` — PASS.
- [x] **Step 4:** Commit (intermediate; single delivery PR).

**Traces:** RFC-041 §3, §4.2, §1.3 (export name)

---

### Task 4: CLI dependency + `from-prisma` argv / orchestration

**Files:**
- Modify: `packages/cli/package.json` — add `"@resource-forge/prisma": "workspace:*"`
- Modify: `packages/cli/src/commands/generate.ts` (dispatch kinds)
- Create or modify: `packages/cli/src/commands/generate-from-prisma.ts` (optional extract)
- Modify: `packages/cli/src/run.ts` — help text includes from-prisma
- Modify: `packages/cli/src/run.test.ts`
- Modify: `packages/cli/src/index.ts` comment if needed

- [x] **Step 1:** Write failing `run(['generate','from-prisma',…])` tests for:
  - Usage / unknown options / bare `--namespace` / extra tokens → exit `2`
  - `--namespace` placement variants (three valid forms)
  - **Execution order:** DMMF path missing + outDir also invalid → exit `2`; no synthesis; no read attempt (missing path wins as usage/precondition)
  - **Execution order:** DMMF exists but would be malformed + outDir invalid → exit `2` for outDir; malformed JSON MUST NOT be reported (outDir check precedes read/parse)
  - Missing DMMF path alone → `2`
  - Invalid outDir alone (missing / not directory) → `2` before synthesize
  - Existing path unreadable / malformed JSON / profile-invalid → `1`
  - Synthesis zero emissions → `1`, zero writes
  - Synthesis API error / unexpected throwable surfaced from prisma → exit `1` (not reported as a mere model refusal)
  - Unknown kind still errors; `generate resource` regression still passes
- [x] **Step 2:** Run targeted tests — expect FAIL.
- [x] **Step 3:** Implement argv parse + path resolve + ordered checks (dmmf exists → outDir dir → read/parse → synthesize). Map API errors to exit `1`. Do not implement mapping in CLI.
- [x] **Step 4:** Run tests — expect PASS (may still lack write-success cases until Task 5).
- [x] **Step 5:** Commit (intermediate; single delivery PR).

**Traces:** RFC-041 §3, §6.1–6.2, §7.1–7.2

---

### Task 5: CLI multi-file write-safety + reports + success exits

**Files:**
- Modify: from-prisma CLI module
- Modify: `packages/cli/src/run.test.ts`
- Writer: reuse `packages/cli/src/write-resource-document.ts` **only if** it satisfies RFC-041 create-only / no-overwrite semantics; otherwise add a narrowly scoped create-only helper (do not treat `linkSync` as a product lock)

- [x] **Step 1:** Write failing tests for:
  - Collision any destination → exit `2`, **zero** files written, collisions reported (filename order)
  - ≥1 emission + some refusals → write emissions, exit `0`
  - Report ordering is **model-name sorted** even when DMMF model order differs (e.g. DMMF `User, Comment, Post` → report Comment/Post/User); Resource members still preserve DMMF field declaration order
  - Written document passes RFC-037 validate path
  - Create-only: destination must not be overwritten
  - Mid-write create-only failure (inject/mock writer seam if needed; no new public CLI API) → exit `1`; already-written sibling remains; **no rollback attempted**
  - Doctor still requires only `validate` + `doctor` with `from-prisma` present
- [x] **Step 2:** Run tests — expect FAIL.
- [x] **Step 3:** Implement destination calculation, collision checks, create-only writes, stderr report ordering (§7.4). On create-only race / unexpected write fail → exit `1` (no multi-file rollback). Encode complete `Resource` mechanically (same spirit as RFC-039).
- [x] **Step 4:** `pnpm --filter @resource-forge/cli test typecheck lint build` — PASS.
- [x] **Step 5:** Commit (intermediate; single delivery PR).

**Traces:** RFC-041 §6.2–6.3, §7, §8

---

### Task 6: Docs accuracy + SCR scaffolding

**Files:**
- Modify: `packages/cli/README.md`, `packages/prisma/README.md` as needed
- Modify: `README.md` only if CLI role text inaccurate
- Modify: `docs/roadmap.md` — note M5.6 / `#138` when shipping (do not mark milestone Done solely from this slice)
- Modify: this plan’s SCR during M7–M10

- [x] **Step 1:** Update docs for `from-prisma` argv, exits, DMMF-only, no round-trip, fences. Keep `resource`/`init`/`validate`/`doctor` accurate.
- [x] **Step 2:** **Do not populate `examples/**`.**
- [x] **Step 3:** Fill SCR gates after M7–M10; set Status Slice complete only after delivery merge + SCR closeout.
- [x] **Step 4:** Final workspace verification for touched packages.

**Traces:** RFC-041 §1.2, §8, §13; reporting conventions

---

## Traceability (Accepted RFC-041 → tasks)

| RFC-041 section | Tasks |
| --- | --- |
| §3 package boundaries / deps | Tasks 3–4 |
| §4.1 Supported DMMF Profile (incl. uniqueness) | Task 1 |
| §4.2–4.5 synthesis API / refusals vs errors | Tasks 2–3 |
| §5 reverse map (incl. inverse / `@map` / no `join`) | Task 2 |
| §6 CLI argv / FS / write-safety | Tasks 4–5 |
| §7 exits / reports | Tasks 4–5 |
| §8 testing | Tasks 1–5 |
| §13 deferrals | All tasks (fence) |

---

## Execution / dependency risks (operational)

1. **Do not reuse `normalizeDmmf` blindly** — RFC-033 normalize skips unknown kinds; bootstrap MUST refuse unsupported kinds and require fuller profile metadata. Prefer bootstrap-local profile parse.
2. **`createResource` alone is insufficient** — empty Resources only; build fields/relations then `validateResource`.
3. **Model-local after global index** — do not recursively synthesize related models.
4. **Keep `generate resource` regression green** when extending the generate handler.
5. **`run` stays sync** — sync fs + sync synthesis.
6. **Doctor registry** — adding prisma dep / from-prisma MUST NOT change required `validate` + `doctor` set.
7. **No verifyPrismaCorrespondence** in bootstrap success path.
8. **CLI must not import prisma internals** — public export only.
9. **Filename path-safety** enforced at profile validation, not only at write time.
10. **Implicit m:n** classified on complete model set before mapping.
11. **Create-only writer** — reuse existing helper only if semantics match; RFC does not lock `linkSync`.
12. Do not turn M5.6 into schema.prisma or examples slice.

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M5.6 CLI Generate From-Prisma (Bootstrap) |
| Tracking | [#138](https://github.com/rexescario-dev/resource-forge/issues/138) |
| M4 | Implementation Plan: **Accepted** |
| M5 | Review **Accepted** (2026-08-11) |
| M6 | **Complete** |
| M7 | **Approved** (2026-08-11) |
| M8 | **N/A** (no worthwhile behavior-preserving refactor beyond slice delivery) |
| M9 | **Complete** (prisma/cli/root READMEs + roadmap M5.6 + specs index) |
| M10 | **Accepted** (slice process path; workflow library assets unmodified) |
| Branch | `feat/m5-6-cli-generate-from-prisma` |
| PR | _(pending — fill on open)_ |
| Status | **Ready for merge** |

### Shipped

- `synthesizeResourcesFromDmmf` in `@resource-forge/prisma` (Supported DMMF Profile → emissions/refusals; closed reverse map; no `join` / no RFC-033 verify)
- Thin CLI `rf generate from-prisma <dmmfPath> <outDir> --namespace <ns>` / `run(['generate','from-prisma',…])`
- Ordered FS preflight, destination collision → zero writes, create-only writes, success iff ≥1 written
- Public CLI API remains `run` only; doctor registry still `validate` + `doctor`
- Docs: package READMEs, root package table, roadmap M5.6 / RFC-041

### Verification

| Check | Result |
| --- | --- |
| `pnpm --filter @resource-forge/prisma test` | **PASS** (99 tests incl. 18 bootstrap; tinypool teardown noise ignored) |
| `pnpm --filter @resource-forge/cli test` | **PASS** (69 tests; tinypool teardown noise ignored) |
| typecheck / lint / build (prisma + cli) | **PASS** |
| CI | pending on PR |
| Public CLI export `run` only | **PASS** |
| Doctor registry still `validate` + `doctor` | **PASS** |
| Profile API errors vs model refusals | **PASS** |
| Write-safety (collision→0 writes; create-only; mid-write→1 retained; ≥1→0) | **PASS** |
| No round-trip verify requirement | **PASS** |

### Next Gate

**Merge** — delivery PR for `#138`, then SCR closeout to **Slice complete**.

---

**Status: Accepted.** Authoritative for M5.6 sequencing/execution. RFC-041 remains authoritative for product semantics.
