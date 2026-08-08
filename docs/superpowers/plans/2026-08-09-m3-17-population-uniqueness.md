# M3.17 Population Uniqueness — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-020. Reuse M3.1–M3.16 Resource / schema / field / constraint declaration and `checkConstraintValues` surfaces. Do **not** fold occupancy into `checkConstraintValues`. Do **not** implement SQL/ORM/persistence uniqueness engines, Relation-targeted uniqueness, filtered/partial uniqueness, operator/`spec` bags, collect-all errors, or a combined “check everything” API. Do **not** reopen RFC-017 member-local shapes, RFC-019 `distinct` / `equal` contracts (including their homogeneous-target rule), or RFC-018 gate/`range`/`pattern`/`enum` evaluation beyond skipping `unique`. Missing occupancy MUST be a distinct invalid-invocation result — never `unique_constraint_violated`. `core` MUST NOT reinterpret or enforce equality inside an arbitrary `isOccupied` implementation — the provider is authoritative for occupancy answers and MUST itself honor RFC-020 §7.5. `missing_occupancy_surface` MUST NOT appear on `ConstraintEnforcementError`.

**Status:** Accepted  
**M5:** Accepted (2026-08-09) — Plan Review; no plan blockers after required wording locks. Provider equality responsibility explicit (`isOccupied` answers under §7.5; `core` treats provider as authoritative). Error taxonomy locked: `PopulationUniquenessError = ConstraintEnforcementError | MissingOccupancyError`; `unique_constraint_violated` on enforcement union only; `missing_occupancy_surface` MUST NOT appear on `ConstraintEnforcementError`. `index` = zero-based `constraints` position. Provider requested only after key extraction continues. Purity covers Resource / values / provider / surface. Heterogeneous composite `unique` retained; `distinct`/`equal` homogeneity unreopened. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#75](https://github.com/rexescario-dev/resource-forge/issues/75)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-020 Population Uniqueness (**Accepted**) — extends RFC-017/019 vocabulary and adds a population evaluation surface  
**Depends on:** RFC-007 / RFC-009 / RFC-013 / RFC-014 (**Accepted**); RFC-016 (**Accepted**, packaging retained); RFC-017 (**Accepted**, member-local shapes retained); RFC-018 (**Accepted**, field-value map / fail-fast retained); RFC-019 (**Accepted**, `field`/`fields` + gate-order + equality retained; homogeneity for `distinct`/`equal` retained); RFC-020 (**Accepted**); M3.1–M3.16 shipped  
**Related RFC issue:** [#74](https://github.com/rexescario-dev/resource-forge/issues/74) (RFC-020 Accept docs; not this delivery slice)  
**Package:** `@resource-forge/core`  
**Slice:** M3.17 only — closed `unique`; `field` XOR `fields` declaration; heterogeneous composites; `checkConstraintValues` skips `unique`; separate population check + Constraint-scoped occupancy provider; invalid-invocation vs unique-violated

**Goal:** Implement RFC-020 so declaration-valid Resources may include `unique` Constraints, `checkConstraintValues` remains strictly intra-instance (skipping `unique`), and a separate population check evaluates `unique` against a host occupancy provider — without inventing persistence engines or smuggling population state into the intra-instance API.

**Architecture:**

```text
raw candidate schema
          │
          ▼
 checkConstraints(constraints, fields)     ← widen for unique
          │  ConstraintKind += unique
          │  unique: field XOR fields (≥2); resolve; names unique in fields
          │  composite unique: NO homogeneity requirement
          │  distinct/equal homogeneity unchanged
          │
          ▼
 snapshotConstraints → Resource
          │
          ├──────────────────────────────┐
          ▼                              ▼
 checkConstraintValues              checkPopulationUniqueness
 (Resource, map)                    (Resource, map, occupancyProvider)
          │                              │
          walk constraints               walk constraints
          unique → skip                  non-unique → skip
          other kinds → RFC-018/019      unique → extract key → O_C.isOccupied
          │                              │
          └── Result<void,               ├── ok
              ConstraintEnforcementError>├── err(enforcement…)
                                         └── err(missing_occupancy_surface)
                                              (invalid invocation — distinct code)
```

**Invariant:** No implementation step may accept occupancy on `checkConstraintValues`, report missing occupancy as `unique_constraint_violated`, coerce uniqueness-key elements, use ECMAScript `Set` reference identity for composite key membership, share one undifferentiated occupancy bag across distinct `unique` Constraints, or reopen RFC-019 homogeneity for `distinct` / `equal`.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-020 Accepted (#74)
       ↓
M3.17 plan Accepted (this document) (#75)
       ↓
M5 Plan Review → Accepted
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M9 / validation as required
       ↓
one delivery PR for tracking #75 (Accepted plan + implementation together)
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M3.17 delivery slice (Accepted plan + implementation). Do **not** open a separate plan-only merge PR as a required gate. RFC-020 Accept documentation for [#74](https://github.com/rexescario-dev/resource-forge/issues/74) MAY land in a separate docs PR; it MUST NOT block inventing M3.17 semantics, but M6 assumes RFC-020 text is authoritative (already Accepted).

**Task checkboxes:** Completed during **M6 execution** only.

---

## Locked decisions (export / shape review — planning aids)

| Decision | Lock |
| --- | --- |
| `ConstraintKind` | Closed exclusive `"range" \| "pattern" \| "enum" \| "distinct" \| "equal" \| "unique"` |
| `unique` single-field arm | `{ name, kind: "unique", field }` only; MUST NOT accept `fields` |
| `unique` composite arm | `{ name, kind: "unique", fields }` only; `fields.length >= 2`; unique names; each resolves; **heterogeneous `FieldType` allowed**; MUST NOT accept `field` |
| Closed key sets | `unique` own keys exactly `{ name, kind, field }` or `{ name, kind, fields }` |
| Declaration API | Extend internal `checkConstraints` / `snapshotConstraints` only; still no public `validateConstraints` |
| Intra-instance API | Existing `checkConstraintValues` — when `kind === "unique"`, **skip** (continue). MUST NOT take occupancy parameters. MUST NOT fail solely because population state was omitted. |
| Population API name | Export `checkPopulationUniqueness` from `@resource-forge/core` (RFC informative name made concrete) |
| Population inputs | `(resource, values, occupancyProvider)` — declaration-valid Resource + `ReadonlyMap<string, FieldRuntimeValue>` + occupancy provider |
| Occupancy provider | Function `(constraint, index) => OccupancySurface \| undefined` where `constraint` is a `unique` arm. Scoped **per Constraint** (independent key spaces). `index` is the **zero-based position of that Constraint in `ResourceSchema.constraints`** (not a Field index / not a `fields[]` index). |
| Occupancy surface | `{ isOccupied(key: UniquenessKey): boolean }` — single conceptual answer form. MUST NOT require a second mandated public “collection adapter” API in `core`. |
| `isOccupied` equality responsibility | **`isOccupied` MUST answer occupancy according to RFC-020 §7.5 key equality. `core` treats the provider as authoritative and does not inspect or reinterpret its internal membership mechanism.** `core` extracts the uniqueness key and calls `isOccupied(k)`; it MUST NOT re-implement collection membership “under §7.5” inside an opaque provider. |
| Provider invocation timing | Request the provider **only after key extraction reaches `continue`**. Optional-absent / nullable-null skip → provider never requested for that Constraint. Gate failure → provider never requested for that Constraint. |
| `UniquenessKey` | Single-field: `Exclude<FieldRuntimeValue, null>`. Composite: `ReadonlyArray<Exclude<FieldRuntimeValue, null>>` in `fields` declaration order. |
| Key equality (key extraction / host duty) | When hosts/tests implement membership, reuse RFC-018/019 scalar `===` per element / FieldType; tuple equal iff same length and per-index equal. MUST NOT coerce; MUST NOT use `Object.is`; MUST NOT treat `("42", 7)` as equal to `(42, 7)`. Applies to host/test helpers — not as a claim that `core` can enforce equality inside arbitrary providers. |
| Existing-key collections | Hosts MAY implement `isOccupied` via conceptual membership under §7.5. Tests MUST NOT rely on `new Set(tuples)` reference identity for composites. Optional **test-local** helpers OK; not a required product export. |
| Population result | `Result<void, PopulationUniquenessError>` reusing core `Result` / `ok` / `err` |
| Error taxonomy (discriminated by `code`) | `PopulationUniquenessError` = `ConstraintEnforcementError` (includes gate codes + `unique_constraint_violated`) **\|** `MissingOccupancyError` (`missing_occupancy_surface` only). See diagram below. |
| `PopulationUniquenessError` | `ConstraintEnforcementError \| MissingOccupancyError` (union). Callers distinguish by `code`. |
| `MissingOccupancyError` | `{ code: "missing_occupancy_surface"; index; constraintName }` — **invalid invocation / host-contract**. MUST NOT be a member of `ConstraintEnforcementError`. MUST NOT be reported as `unique_constraint_violated`. |
| `unique_constraint_violated` placement | Add **only** to `ConstraintEnforcementError`. **`missing_occupancy_surface` MUST NOT appear in the `ConstraintEnforcementError` union.** |
| Unique violated diagnostics | `unique_constraint_violated` with `index` (constraints position), `constraintName`, and `field` (single-field: that field; composite: **`fields[0]`** diagnostic lock — normative identity remains Constraint + full key) |
| Gate reuse | Single-field: RFC-018 gates. Composite: RFC-019 §7.2 multi-field gate procedure (order, skip terminates, no coercion). |
| Homogeneity | Composite `unique`: **do not** emit `heterogeneous_constraint_field_types`. `distinct` / `equal`: keep existing homogeneity failures. |
| Declaration-valid precondition | Caller responsibility for both runtime surfaces; MUST NOT re-run full `validateResource` inside them |
| Purity | MUST NOT mutate Resource, schema, constraints, field-value map, occupancy provider, or occupancy surface |
| Projection | Still no Constraint contribution |
| Fixtures | MUST NOT teach persistence/SQL uniqueness in `create-resource-with-constraints.ts`. Prefer test-local helpers for population cases. |
| Persistence | **Out of scope** — no SQL/ORM/index APIs |

```text
PopulationUniquenessError
├── ConstraintEnforcementError
│   ├── gate codes (reuse)
│   └── unique_constraint_violated
└── MissingOccupancyError
    └── missing_occupancy_surface   ← MUST NOT appear on ConstraintEnforcementError
```

### Declaration cause → code mapping (planning lock)

| RFC-020 cause | `code` |
| --- | --- |
| Unknown constraint kind | `unknown_constraint_kind` (reuse; vocabulary now six literals) |
| Missing constraint field | `missing_constraint_field` / existing member-local missing-field handling (reuse for single-field `unique`) |
| Missing constraint fields | `missing_constraint_fields` (reuse for composite `unique`) |
| Invalid constraint fields | `invalid_constraint_fields` (reuse; includes length &lt; 2 for composite `unique`) |
| Duplicate constraint field target | `duplicate_constraint_field_target` (reuse) |
| Unresolved constraint field | `unresolved_constraint_field` (reuse) |
| Invalid constraint targeting shape | `invalid_constraint_targeting_shape` (reuse; both present, wrong property for kind, neither when kind requires one form) |
| Heterogeneous types on `unique` | **Not a declaration error** |

### Population / enforcement cause → code mapping (planning lock)

| RFC-020 cause | `code` / class |
| --- | --- |
| Gate failures | Existing enforcement codes (`missing_required_field_value`, `null_field_value`, `field_value_type_mismatch`) |
| Unique constraint violated | `unique_constraint_violated` (**constraint-enforcement**) |
| Missing occupancy surface | `missing_occupancy_surface` (**invalid invocation** — on `PopulationUniquenessError` only) |

---

## Constraints (SHALL / SHALL NOT)

### SHALL

1. Widen `ConstraintKind` / `Constraint` union per RFC-020 §4–§5.
2. Validate `unique` declaration rules (RFC-020 §5.3–§5.4, §6) inside the existing declaration path; allow heterogeneous composites.
3. Snapshot `field` / `fields` with the same immutability treatment used today.
4. Amend `checkConstraintValues` to **skip** `unique` (RFC-020 §7.1).
5. Implement `checkPopulationUniqueness` with Constraint-scoped occupancy provider (RFC-020 §7).
6. Keep missing occupancy distinguishable from unique-violated in the result contract.
7. Keep member-local and cross-member (`distinct` / `equal`) behavior green (regression).
8. Export new public types / function from existing export surfaces.

### SHALL NOT

1. Pass occupancy into `checkConstraintValues` or fail that API for absent population state.
2. Report `missing_occupancy_surface` as `unique_constraint_violated`, or place `missing_occupancy_surface` on `ConstraintEnforcementError`.
3. Claim or implement that `core` enforces §7.5 equality *inside* an arbitrary provider — the provider is authoritative for `isOccupied` answers.
4. Require homogeneous `FieldType` for composite `unique`.
5. Change RFC-019 homogeneity enforcement for `distinct` / `equal`.
6. Implement SQL/ORM/store uniqueness engines or instance identity / self-exclusion helpers as product APIs.
7. Mandate a second public “existing-key collection” adapter alongside `isOccupied` (hosts/tests may build their own).
8. Introduce a parallel schema collection or operator/`spec` bag.
9. Coerce key elements; use `Object.is` for numeric comparison; share occupancy across Constraints.
10. Fold population checks into `validateResource` / `checkConstraints`.
11. Request the occupancy provider before key extraction continues (skip/fail paths).

---

## Package / ownership boundaries

| Area | Role |
| --- | --- |
| `packages/core/src/resource/types.ts` | Widen `ConstraintKind` / `Constraint`; add population error / key / occupancy types |
| `packages/core/src/resource/constraints.ts` | Declaration validation + snapshot + equality for `unique` arms |
| `packages/core/src/resource/constraints.test.ts` | Declaration TDD |
| `packages/core/src/resource/constraint-values.ts` | Skip `unique` in `checkConstraintValues` |
| `packages/core/src/resource/constraint-values.test.ts` | Skip-invariant + regression TDD |
| `packages/core/src/resource/population-uniqueness.ts` | **Create** — `checkPopulationUniqueness` + key extract / occupancy eval |
| `packages/core/src/resource/population-uniqueness.test.ts` | **Create** — population TDD |
| `packages/core/src/resource/index.ts` / `packages/core/src/index.ts` | Export new public surface |
| `packages/core/src/resource/exports.test.ts` | Export / kind smoke |
| `docs/roadmap.md` | M3.17 ✅ on final delivery commit only |
| `create-resource-with-constraints.ts` | Untouched except unavoidable type widen compile fixes |

Planning note: placing population evaluation in `population-uniqueness.ts` (rather than growing `constraint-values.ts`) is a **file-layout** decision, not a product boundary. Shared gate helpers MAY be extracted internally if needed without changing public contracts.

---

## Slice sequence

| Slice | Delivers | Prerequisite |
| --- | --- | --- |
| A | Types + declaration validation for `unique` | None (RFC-020 Accepted) |
| B | `checkConstraintValues` skip `unique` | Slice A |
| C | `checkPopulationUniqueness` + occupancy provider | Slice A (declaration-valid fixtures) |
| D | Exports / roadmap / SCR closeout docs | A+B+C green |

---

## TDD / verification strategy

- **Declaration:** failing tests first for valid single/composite `unique`; reject both/neither targeting; length &lt; 2; duplicates; unresolved; `field` on composite form / `fields` on single form; **accept** heterogeneous composite; confirm `distinct` still rejects heterogeneous.
- **Intra-instance skip:** Resource with `unique` + other kinds; `checkConstraintValues` skips `unique`, still evaluates others; MUST NOT fail for missing occupancy.
- **Population:** failing tests first for pass/fail occupancy; independent scopes for two `unique` Constraints; heterogeneous composite key; host/test helpers use structural §7.5 equality (not `Set` reference identity); optional skip **without** provider call; gate failure **without** provider call; missing occupancy → `missing_occupancy_surface` (not unique-violated; not on `ConstraintEnforcementError`); fail-fast among multiple `unique`; non-`unique` kinds skipped by population API; purity (Resource / values / provider / surface unchanged).
- **Regression:** existing `constraints` / `constraint-values` / `validate` / `exports` suites remain green.
- **Commands:** `pnpm exec vitest run` on touched test files; `pnpm exec tsc --noEmit` in `@resource-forge/core`.
- **Lint/build:** skipped unless already required by repo norms for the slice.

---

## Task breakdown

### Task 1 — Types (Slice A)

**Files:** `packages/core/src/resource/types.ts`

- [x] **Step 1:** Widen `ConstraintKind` to include `'unique'`
- [x] **Step 2:** Add Constraint arms `{ name, kind: 'unique', field }` and `{ name, kind: 'unique', fields: ReadonlyArray<FieldName> }`
- [x] **Step 3:** Add `UniquenessKey`, `OccupancySurface`, `OccupancyProvider` types (planning locks above)
- [x] **Step 4:** Add `unique_constraint_violated` **only** to `ConstraintEnforcementError` (`index` = constraints position, `constraintName`, `field`)
- [x] **Step 5:** Add `MissingOccupancyError` (`missing_occupancy_surface`) + `PopulationUniquenessError = ConstraintEnforcementError | MissingOccupancyError`. Assert in types/tests that `missing_occupancy_surface` is **not** assignable as a `ConstraintEnforcementError` code.

**Trace:** RFC-020 §4, §5, §7.1–§7.2, §7.6

### Task 2 — Declaration validation (Slice A)

**Files:** `packages/core/src/resource/constraints.ts`, `constraints.test.ts`

- [x] **Step 1 (TDD):** Valid single-field + composite `unique`; reject targeting-shape violations; length &lt; 2; duplicates; unresolved; accept heterogeneous composite; `distinct` heterogeneous still fails
- [x] **Step 2:** Extend `CONSTRAINT_KINDS` and closed-key handling for both `unique` arms
- [x] **Step 3:** Implement resolve / uniqueness-in-`fields`; **skip** homogeneity for `unique`
- [x] **Step 4:** Snapshot immutably; extend equality helper (order-sensitive `fields`)
- [x] **Step 5:** Confirm member-local + `distinct`/`equal` declaration tests still pass

**Trace:** RFC-020 §5–§6, §8

### Task 3 — Intra-instance skip (Slice B)

**Files:** `packages/core/src/resource/constraint-values.ts`, `constraint-values.test.ts`

- [x] **Step 1 (TDD):** `unique` alone → `checkConstraintValues` ok without occupancy; `unique` before a failing `range` still fails on `range`; `unique` after passing `enum` still ok
- [x] **Step 2:** In the constraint walk, `kind === 'unique'` → `continue` (skip)
- [x] **Step 3:** Confirm M3.15/M3.16 constraint-values suite still passes

**Trace:** RFC-020 §7.1, §7.7

### Task 4 — Population evaluation (Slice C)

**Files:** Create `packages/core/src/resource/population-uniqueness.ts`, `population-uniqueness.test.ts`; reuse gate helpers from `constraint-values.ts` as needed (extract shared internal helpers only if required)

- [x] **Step 1 (TDD):** Single-field pass/fail; composite pass/fail; independent occupancy scopes; heterogeneous composite; host helper structural equality (no `Set` identity); optional skip with provider **not** invoked; required-absent gate fail with provider **not** invoked; missing occupancy → `missing_occupancy_surface` (distinct from unique-violated); occupied → `unique_constraint_violated`; fail-fast across two `unique`; skip non-`unique` kinds; empty constraints ok; purity (Resource, values, provider, surface unchanged)
- [x] **Step 2:** Implement `checkPopulationUniqueness(resource, values, occupancyProvider)`
- [x] **Step 3:** Key extraction via single-field / multi-field gates (reuse gate-order); on skip/fail do not call provider
- [x] **Step 4:** After key extraction **continues**, resolve `O_C` from provider; missing/undefined → `missing_occupancy_surface` (invalid invocation). If present, call `isOccupied(k)` and treat the boolean as authoritative — do **not** re-check or reinterpret membership under §7.5 inside `core`.
- [x] **Step 5:** Diagnostic `field` = target field or `fields[0]` for unique-violated; `index` = constraints position

**Trace:** RFC-020 §7

### Task 5 — Exports + docs closeout (Slice D)

**Files:** `resource/index.ts`, `packages/core/src/index.ts`, `exports.test.ts`, `docs/roadmap.md`, this plan’s SCR

- [x] **Step 1:** Export `checkPopulationUniqueness` and related types
- [x] **Step 2:** Export smoke for `unique` kind + population API + error codes
- [x] **Step 3:** After M6+ gates, mark M3.17 ✅ on roadmap; fill SCR

**Trace:** RFC-020 §13; roadmap discoverability

---

## Traceability matrix

| RFC-020 section | Tasks |
| --- | --- |
| §4 ConstraintKind | Task 1–2 |
| §5 `unique` shapes / targeting | Task 1–2 |
| §6 declaration validation | Task 2 |
| §7.1 surface split / skip invariant | Task 3–4 |
| §7.2 occupancy provider / missing occupancy class | Task 1, 4 |
| §7.3–§7.5 key extract / equality | Task 4 |
| §7.6–§7.7 occupancy eval / ordering | Task 4 |
| §8 constraint value equality | Task 2 |
| §9 examples | Tasks 2–4 tests |
| §13 compatibility | Task 3 regression + Task 5 |

---

## Execution risks (operational — not redesign)

| Risk | Mitigation |
| --- | --- |
| Accidentally applying homogeneity to composite `unique` | Explicit negative declaration test: heterogeneous `unique` accepts; `distinct` still rejects |
| `new Set(tuples)` false confidence in tests | Assert membership via `isOccupied` helpers using structural equality; document in test comments |
| Collapsing missing occupancy into unique-violated | Dedicated result-code assertion in TDD Step 1 of Task 4; type lock that `missing_occupancy_surface` is not a `ConstraintEnforcementError` code |
| Assuming `core` enforces §7.5 inside providers | Task 4 Step 4: call `isOccupied` only; document host/test helper equality duty separately |
| Growing `constraint-values.ts` past clarity | Keep population API in `population-uniqueness.ts`; share gates via small internal extract if needed |
| RFC-020 Accept docs not yet on `main` | Land [#74](https://github.com/rexescario-dev/resource-forge/issues/74) docs PR before or with delivery; M6 treats Accepted RFC text as authoritative |

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.17 Population Uniqueness |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/75 |
| M4 | Plan **Accepted** |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | **Approved** |
| M8 | **N/A** |
| M9 | **Complete** |
| Branch | `feat/m3-17-population-uniqueness` |
| PR | |
| Status | **Slice complete** |

### Shipped

- Widened `ConstraintKind` / `Constraint` with `unique` (`field` XOR `fields`; heterogeneous composites allowed)
- Declaration validation + snapshot/equality for `unique`; `distinct`/`equal` homogeneity retained
- `checkConstraintValues` skips `unique` (no population state)
- `checkPopulationUniqueness` with Constraint-scoped occupancy provider; provider called only after key continue
- `missing_occupancy_surface` on `MissingOccupancyError` only; `unique_constraint_violated` on enforcement union
- Public exports + roadmap M3.1–M3.17 ✅

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (constraints 26; constraint-values 21; population-uniqueness 9; exports 10; validate 6) |
| Typecheck | **Passed** (`tsc --noEmit` in `@resource-forge/core`) |
| Lint | Skipped |
| Build | Skipped |
| Package validation | Skipped |

### Next Gate

**None — slice complete**

### M5 Plan Review

```text
Decision: Accepted
Subject (plan): docs/superpowers/plans/2026-08-09-m3-17-population-uniqueness.md
Accepted specification: docs/superpowers/specs/2026-08-09-rfc-020-population-uniqueness-design.md
Delivery goal: Implement closed unique + Constraint-scoped population check; keep checkConstraintValues intra-instance; distinguish missing occupancy from unique-violated

Review summary: Plan executable and traceable. Required M5 wording locks applied before Accept: (1) isOccupied equality is provider responsibility; core is authoritative-consumer only; (2) explicit PopulationUniquenessError taxonomy with missing_occupancy_surface excluded from ConstraintEnforcementError. Minor tightenings: index = constraints position; provider only after key continue; purity covers provider/surface. Heterogeneous composite unique retained.

Findings: None (no plan blockers)

Traceability: adequate (coverage + deferrals checked)
Gate: Proceed to M6. No implementation activity before this Accept.
Authority: Plan governs sequencing/execution; specification governs product semantics.
```

### M7 Code Review

```text
Decision: Approved for merge
Subject: feat/m3-17-population-uniqueness
Accepted specification: docs/superpowers/specs/2026-08-09-rfc-020-population-uniqueness-design.md
Accepted implementation plan: docs/superpowers/plans/2026-08-09-m3-17-population-uniqueness.md

Plan tasks reviewed:
- Task 1 types: ✓
- Task 2 declaration validation: ✓
- Task 3 intra-instance skip: ✓
- Task 4 population evaluation: ✓
- Task 5 exports/docs/SCR: ✓

Verification evidence:
- vitest (per-file): constraints 26, constraint-values 21, population-uniqueness 9, exports 10, validate 6 — PASS
- tsc --noEmit (@resource-forge/core) — PASS

Review summary: Faithful RFC-020 / plan realization. Closed unique with field XOR fields; heterogeneous composites; checkConstraintValues skip; Constraint-scoped occupancy provider authoritative for isOccupied; missing_occupancy_surface excluded from ConstraintEnforcementError; provider only after key continue; no persistence surface.

Blocking findings: None (no merge blockers)

Non-blocking observations:
- Local vitest may emit tinypool teardown noise; per-file runs remain authoritative for this environment.
- gateField is exported from constraint-values.ts for internal reuse by population-uniqueness.ts but is not re-exported from package barrels.

Gate: Merge per human/project norms. M8/M9 may follow when appropriate.
```

### M8 Refactoring

```text
Decision: N/A
Scope: packages/core/src/resource/constraints.ts + constraint-values.ts + population-uniqueness.ts
Goals considered: further extract shared key/gate helpers across files
Rationale: Modules are focused and covered; refactor risk exceeds benefit for this slice.
Verification: N/A (no structural change)
```

### M9 Documentation

Scope: `docs/roadmap.md` (Status + narrative + M3.17 ✅), `docs/superpowers/specs/README.md` (RFC-020 Accepted), plan SCR, RFC-020 already Accepted.
Content: RFC-020 / M3.17 discoverability; Later deferred list no longer leads with population uniqueness.
Editorial: Status consistency Accepted/✅ aligned with approved implementation; internal links to RFC-020 / plan / issues checked.

### M10 Workflow Validation

```text
Decision: Accepted
Subject: workflow prompt library (installed docs/workflows)
Governing specification: docs/workflows/specs/agent-workflow-design.md

Asset inventory:
- M1 conventions: conventions/prompt-library.md
- M2–M10 prompts: specification, design-review, implementation-planning, plan-review, implementation-execution, code-review, refactoring, documentation-execution, workflow-validation
- Reporting: conventions/reporting-conventions.md
- README stage map present

Blocking findings: None
Non-blocking observations: This closeout exercised M2→M9 for a product slice; M10 confirms installed workflow assets remain coherent (no prompt edits required).
Gate: Workflow validated
```
