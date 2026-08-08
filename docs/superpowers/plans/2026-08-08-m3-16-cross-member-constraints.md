# M3.16 Intra-Instance Cross-Member Constraints — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-019. Reuse M3.1–M3.15 Resource / schema / field / constraint declaration and `checkConstraintValues` surfaces. Do **not** implement population uniqueness, sets of instances, stores, queries, indexes, persistence, Relation targeting, Field-local constraint slots, operator/`spec` bags, collect-all errors, or a second runtime check API. Do **not** reopen RFC-017 member-local `range` / `pattern` / `enum` shapes or RFC-018 member-local evaluation contracts beyond additive kinds. Kind-violation diagnostics MUST use `field = fields[0]` exactly as the planning lock (do not invent a “more precise” violating field).

**Status:** Accepted  
**M5:** Accepted (2026-08-08) — Plan Review; no plan blockers. Closed `distinct`/`equal`; `field` vs `fields` targeting; declaration resolve/homogeneity; immutable `fields` snapshot; gate-order + immediate skip; no coercion; `===` not `Object.is`; kind-violation `fields[0]` diagnostic lock; fail-fast retained; RFC-017/018 regression; population uniqueness / second runtime surface excluded; fixture locality retained. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#72](https://github.com/rexescario-dev/resource-forge/issues/72)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-019 Intra-Instance Cross-Member Constraints (**Accepted**) — extends RFC-017 vocabulary and RFC-018 evaluation for multi-field kinds  
**Depends on:** RFC-007 / RFC-009 / RFC-013 / RFC-014 (**Accepted**); RFC-016 (**Accepted**, packaging retained); RFC-017 (**Accepted**, member-local shapes retained); RFC-018 (**Accepted**, field-value map / fail-fast retained); RFC-019 (**Accepted**); M3.1–M3.15 shipped  
**Related RFC issue:** [#70](https://github.com/rexescario-dev/resource-forge/issues/70) (RFC-019 Accept docs; not this delivery slice)  
**Package:** `@resource-forge/core`  
**Slice:** M3.16 only — closed `distinct` / `equal`; `fields: FieldName[]` declaration rules; multi-field gates with normative gate-order; pairwise `distinct` / all-to-first `equal` via `===`; extend existing `checkConstraintValues`; population uniqueness deferred

**Goal:** Implement RFC-019 so declaration-valid Resources may include `distinct` / `equal` Constraints, and `checkConstraintValues` evaluates them against the existing single field-value map — without inventing population uniqueness or a second runtime model.

**Architecture:**

```text
raw candidate schema
          │
          ▼
 checkConstraints(constraints, fields)     ← widen for distinct/equal
          │  ConstraintKind += distinct|equal
          │  fields: length≥2, unique, resolve, homogeneous FieldType
          │  member-local arms unchanged (still require field)
          │
          ▼
 snapshotConstraints → Resource
          │
          ▼
 checkConstraintValues(resource, map)      ← extend RFC-018 path
          │
          for each Constraint in order:
            if member-local → existing RFC-018 gates + kind eval
            if distinct|equal → §7.2 multi-field gates (fields order)
                              → §7.4 / §7.5 kind eval
          │
          ├── skip → next
          ├── fail → err(ConstraintEnforcementError) fail-fast
          └── done → ok(undefined)
```

**Invariant:** No implementation step may coerce collected scalars, inspect later Fields after a skip, invent set-of-maps evaluation, fold cross-member checks into declaration `checkConstraints` as runtime value checks, or treat unknown map keys as failures.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-019 Accepted (#70)
       ↓
M3.16 plan Accepted (this document) (#72)
       ↓
M5 Plan Review → Accepted
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M9 / validation as required
       ↓
one delivery PR for tracking #72 (Accepted plan + implementation together)
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M3.16 delivery slice (Accepted plan + implementation). Do **not** open a separate plan-only merge PR as a required gate. RFC-019 Accept documentation for [#70](https://github.com/rexescario-dev/resource-forge/issues/70) MAY land in a separate docs PR; it MUST NOT block inventing M3.16 semantics, but M6 assumes RFC-019 text is authoritative (already Accepted).

**Task checkboxes:** Completed during **M6 execution** only.

---

## Locked decisions (export / shape review — planning aids)

| Decision | Lock |
| --- | --- |
| `ConstraintKind` | Closed exclusive `"range" \| "pattern" \| "enum" \| "distinct" \| "equal"` |
| Member-local arms | Unchanged closed shapes with required `field`; MUST NOT accept `fields` |
| Cross-member arms | `{ name, kind: "distinct"\|"equal", fields }` only; MUST NOT accept `field` |
| `fields` | Own property; array/sequence; `length >= 2`; each element valid `FieldName`; unique within the array (exact string equality); each resolves; homogeneous `FieldType` |
| Closed key sets | Cross-member own keys exactly `{ name, kind, fields }` |
| Declaration API | Extend internal `checkConstraints` / `snapshotConstraints` only; still no public `validateConstraints` |
| Runtime API | Extend existing public `checkConstraintValues` — MUST NOT add a second public check function |
| Result / purity | Reuse core `Result`; MUST NOT mutate Resource, schema, constraints, or the map |
| Gate-order | Strictly declared `fields` order; skip terminates immediately; later Fields neither gated nor diagnosed |
| Continue | Collect present non-null scalar of declared `FieldType` **without coercion** |
| Equality | Same as RFC-018 `enum`: `===` for numbers (`-0`/`0` equal); MUST NOT use `Object.is` |
| `distinct` | Pass iff every pair `i < j` is not equal under that relation |
| `equal` | Pass iff every `vi` (`i ≥ 2`) equals `v1` |
| Diagnostics (runtime) | Every enforcement failure MUST include `index`, `constraintName`, and `field`. Gate failures: `field` = the Field being gated. Kind violations (`distinct` / `equal`): `field` = **first** name in declared `fields` (deterministic planning lock; not a product claim that only the first Field violated). |
| Declaration causes | Add codes for missing/invalid/duplicate/heterogeneous `fields` and invalid targeting shape (see mapping below); retain existing member-local codes |
| Population uniqueness | **Out of scope** — no APIs, no tests that imply multi-instance uniqueness |
| Fixtures | MUST NOT teach `create-resource-with-constraints.ts` population semantics. Prefer runtime-test-local helpers for multi-field cases. |
| Projection | Still no Constraint contribution |

### Declaration cause → code mapping (planning lock)

| RFC-019 cause | `code` |
| --- | --- |
| Missing constraint fields | `missing_constraint_fields` |
| Invalid constraint fields | `invalid_constraint_fields` |
| Duplicate constraint field target | `duplicate_constraint_field_target` |
| Unresolved constraint field | `unresolved_constraint_field` (reuse; apply to names in `fields`) |
| Heterogeneous constraint field types | `heterogeneous_constraint_field_types` |
| Invalid constraint targeting shape | `invalid_constraint_targeting_shape` |
| Unknown constraint kind | `unknown_constraint_kind` (reuse; vocabulary now five literals) |

### Enforcement cause → code mapping (planning lock)

| RFC-019 / RFC-018 cause | `code` |
| --- | --- |
| Missing required field value | `missing_required_field_value` (reuse) |
| Null field value | `null_field_value` (reuse) |
| Field value type mismatch | `field_value_type_mismatch` (reuse) |
| Distinct constraint violated | `distinct_constraint_violated` |
| Equal constraint violated | `equal_constraint_violated` |
| Member-local kind causes | Unchanged from M3.15 |

---

## Constraints (SHALL / SHALL NOT)

### SHALL

1. Widen `ConstraintKind` / `Constraint` union per RFC-019 §4–§5.
2. Validate cross-member declaration rules (RFC-019 §5.3–§5.4, §6) inside the existing declaration path.
3. Snapshot `fields` with the same nested immutability treatment used for other sequences.
4. Extend `checkConstraintValues` for `distinct` / `equal` per RFC-019 §7 (gate-order, all-or-nothing skip, kind contracts).
5. Keep member-local RFC-017 / RFC-018 behavior green (regression).
6. Export widened types from existing public export surfaces (no new validate helpers).

### SHALL NOT

1. Implement population uniqueness or any set-of-maps / store / query surface.
2. Introduce a parallel `crossConstraints` collection or second runtime API.
3. Introduce a generic operator / `spec` bag.
4. Coerce values; use `Object.is` for numeric comparison; diagnose later Fields after a skip.
5. Fold runtime value checks into `validateResource` / `checkConstraints`.
6. Reopen inclusive `range`, pattern dialect, or `enum` membership rules.

---

## Package / ownership boundaries

| Area | Role |
| --- | --- |
| `packages/core/src/resource/types.ts` | Widen `ConstraintKind`, `Constraint`, declaration + enforcement error unions |
| `packages/core/src/resource/constraints.ts` | Declaration validation + snapshot + equality for cross-member arms |
| `packages/core/src/resource/constraints.test.ts` | Declaration TDD |
| `packages/core/src/resource/constraint-values.ts` | Runtime multi-field gates + kind eval |
| `packages/core/src/resource/constraint-values.test.ts` | Runtime TDD |
| `packages/core/src/resource/exports.test.ts` | Export / kind smoke |
| `packages/core/src/index.ts` / `resource/index.ts` | Re-export widened types only as needed |
| `docs/roadmap.md` | M3.16 ✅ on final delivery commit only |
| `create-resource-with-constraints.ts` | Untouched except unavoidable type widen compile fixes (behavior unchanged) |

---

## Slice sequence

| Slice | Delivers | Prerequisite |
| --- | --- | --- |
| A | Types + declaration validation for `distinct` / `equal` | None (RFC-019 Accepted) |
| B | Runtime `checkConstraintValues` extension | Slice A (declaration-valid fixtures) |
| C | Exports / roadmap / SCR closeout docs | A+B green |

---

## TDD / verification strategy

- **Declaration:** failing tests first for shape / length / duplicates / unresolved / heterogeneous / targeting-shape; then implement.
- **Runtime:** failing tests first for gate-order skip (optionalA before requiredB), continue-without-coercion, distinct pairwise, equal all-to-first, `-0`/`0`, fail-fast vs member-local mix; then implement.
- **Regression:** existing `constraints` / `constraint-values` / `validate` / `exports` suites remain green.
- **Commands:** `pnpm exec vitest run` on touched test files; `pnpm exec tsc --noEmit` in `@resource-forge/core`.
- **Lint/build:** skipped unless already required by repo norms for the slice.

---

## Task breakdown

### Task 1 — Types (Slice A)

**Files:** `packages/core/src/resource/types.ts`

- [x] **Step 1:** Widen `ConstraintKind` to include `'distinct' | 'equal'`
- [x] **Step 2:** Add Constraint arms `{ name, kind: 'distinct'|'equal', fields: ReadonlyArray<FieldName> }`
- [x] **Step 3:** Extend `ConstraintValidationError` with planning-lock codes
- [x] **Step 4:** Extend `ConstraintEnforcementError` with `distinct_constraint_violated` / `equal_constraint_violated` (each with `index`, `constraintName`, `field`)

**Trace:** RFC-019 §4, §5, §6.1, §7.4–§7.5

### Task 2 — Declaration validation (Slice A)

**Files:** `packages/core/src/resource/constraints.ts`, `constraints.test.ts`

- [x] **Step 1 (TDD):** Tests for valid `distinct` / `equal`; reject length &lt; 2; duplicates; unresolved; heterogeneous types; `field` on cross-member; `fields` on member-local; both present
- [x] **Step 2:** Extend `CONSTRAINT_KINDS` and closed-key handling
- [x] **Step 3:** Implement `fields` resolve + uniqueness + homogeneity
- [x] **Step 4:** Snapshot `fields` immutably; extend equality helper order-sensitively
- [x] **Step 5:** Confirm member-local declaration tests still pass

**Trace:** RFC-019 §5–§6, §8

### Task 3 — Runtime evaluation (Slice B)

**Files:** `packages/core/src/resource/constraint-values.ts`, `constraint-values.test.ts`

- [x] **Step 1 (TDD):** Gate-order skip (`optionalA` absent ⇒ skip without diagnosing `requiredB`); missing required when first in order; null skip; type mismatch; distinct pass/fail; equal pass/fail; `-0`/`0`; mixed sequence fail-fast with member-local
- [x] **Step 2:** Branch `checkConstraintValues` on targeting shape (`field` vs `fields`) without breaking member-local path
- [x] **Step 3:** Implement §7.2 multi-field gates (order, skip terminate, collect without coercion)
- [x] **Step 4:** Implement §7.4 / §7.5 kind evaluation; kind-violation `field` = `fields[0]`
- [x] **Step 5:** Confirm M3.15 constraint-values suite still passes

**Trace:** RFC-019 §7

### Task 4 — Exports + docs closeout (Slice C)

**Files:** `exports.test.ts`, `docs/roadmap.md`, this plan’s SCR

- [x] **Step 1:** Export smoke for new kinds / error codes as needed
- [x] **Step 2:** After M6+ gates, mark M3.16 ✅ on roadmap; fill SCR
- [x] **Step 3:** Do **not** claim population uniqueness anywhere

**Trace:** RFC-019 §13; roadmap discoverability

---

## Traceability matrix

| RFC-019 section | Tasks |
| --- | --- |
| §4 Vocabulary | 1, 2 |
| §5 Shapes / targeting | 1, 2 |
| §6 Declaration validation | 2 |
| §7 Runtime evaluation | 3 |
| §8 Constraint value equality | 2 |
| §1.2 / population deferral | All (SHALL NOT) |
| §13 Compatibility | 3 regression, 4 |

---

## Risks (operational)

| Risk | Mitigation |
| --- | --- |
| `constraint.field` access assumes every Constraint is member-local | Branch on `kind` / `'fields' in constraint` before reading `field` |
| Diagnostic `field` for kind violations underspecified in RFC | Planning lock: `fields[0]` |
| Accidental population-uniqueness scope creep | Explicit SHALL NOT + no multi-instance tests |

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.16 Intra-Instance Cross-Member Constraints |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/72 |
| M4 | Plan **Accepted** |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | **Approved** |
| M8 | **N/A** |
| M9 | **Complete** |
| Branch | `feat/m3-16-cross-member-constraints` |
| PR | https://github.com/rexescario-dev/resource-forge/pull/73 |
| Status | **Slice complete** |

### Shipped

- Widened `ConstraintKind` / `Constraint` with `distinct` / `equal` and `fields: FieldName[]`
- Declaration validation: length ≥ 2, unique names, resolve, homogeneous `FieldType`, targeting-shape errors
- Extended `checkConstraintValues` multi-field gates (gate-order, skip terminate, no coercion) + kind eval
- Kind-violation diagnostics use `field = fields[0]` (planning lock)
- Roadmap M3.1–M3.16 ✅; population uniqueness remains deferred

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (constraints 23; constraint-values 20; exports 9; validate 6) |
| Typecheck | **Passed** (`tsc --noEmit` in `@resource-forge/core`) |
| Lint | Skipped |
| Build | Skipped |
| Package validation | Skipped |

### Next Gate

**None — slice complete**

### M7 Code Review

```text
Decision: Approved for merge
Subject: feat/m3-16-cross-member-constraints
Accepted specification: docs/superpowers/specs/2026-08-08-rfc-019-uniqueness-cross-member-constraints-design.md
Accepted implementation plan: docs/superpowers/plans/2026-08-08-m3-16-cross-member-constraints.md

Plan tasks reviewed:
- Task 1 types: ✓
- Task 2 declaration validation: ✓
- Task 3 runtime evaluation: ✓
- Task 4 exports/docs/SCR: ✓

Verification evidence:
- vitest: constraints 23, constraint-values 20, exports 9, validate 6 — PASS
- tsc --noEmit (@resource-forge/core) — PASS

Review summary: Faithful RFC-019 / plan realization. Closed distinct/equal; field vs fields; gate-order skip; fields[0] kind diagnostics; member-local path retained; no population uniqueness surface.
Blocking findings: None (no merge blockers)

Non-blocking observations:
- Local vitest may emit tinypool teardown noise; per-file runs remain authoritative for this environment.

Gate: Merge per human/project norms. M8/M9 may follow when appropriate.
```

### M8 Refactoring

```text
Decision: N/A
Scope: packages/core/src/resource/constraints.ts + constraint-values.ts
Goals considered: further extract cross-member helpers
Rationale: Module changes are focused and covered; refactor risk exceeds benefit for this slice.
Verification: N/A (no structural change)
```

### M9 Documentation

Scope: `docs/roadmap.md` (Status + narrative + M3.16 ✅), plan SCR, specs README already Accepted for RFC-019.
Content: RFC-019 / M3.16 discoverability; Later leads with population uniqueness.
Editorial: Status consistency Accepted/✅ aligned with approved implementation.

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
