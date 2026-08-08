# M3.15 Runtime Constraint Enforcement — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-018. Reuse M3.1–M3.14 Resource / schema / field / constraint declaration surfaces. Do **not** reopen RFC-016 / RFC-017 / M3.14 declaration validation; do **not** fold runtime checks into `validateResource` / `checkConstraints`; do **not** implement exclusivity flags, regex flags, collect-all errors, uniqueness, cross-member rules, Relation targeting, wire/persistence, or a full Resource instance model.

**Status:** Accepted  
**M5:** Accepted (2026-08-08) — Plan Review after return revision; no plan blockers. Core `Result` reuse; pattern per-eval `new RegExp(pattern, '')` with no cache/precompile/normalize/mutate; mandatory `index`/`constraintName`/`field`; incremental TDD slices; declaration fixtures feature-free; purity covered; RFC-018 preserved; M3.14 unreopened. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#67](https://github.com/rexescario-dev/resource-forge/issues/67)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-018 Runtime Constraint Enforcement (**Accepted**) — adds evaluation for RFC-017 declared Constraints  
**Depends on:** RFC-009 / RFC-013 / RFC-014 (**Accepted**, Field type / optional / nullable); RFC-016 (**Accepted**, packaging retained); RFC-017 (**Accepted**, declaration shapes retained); RFC-018 (**Accepted**); M3.1–M3.14 shipped (declaration floor on `main`)  
**Related RFC issue:** [#66](https://github.com/rexescario-dev/resource-forge/issues/66) (RFC-018 Accept docs; not this delivery slice)  
**Package:** `@resource-forge/core`  
**Slice:** M3.15 only — field-value map runtime surface; per-Constraint presence/null/type gates; inclusive `range`; ECMAScript full-string `pattern`; `enum` membership via `===`; fail-fast `checkConstraintValues`; declaration floors untouched

**Goal:** Implement the RFC-018 runtime check so callers can evaluate a field-value map against a declaration-valid Resource’s Constraints — without changing declaration-time validation or inventing a general Resource-instance validator.

**Architecture:**

```text
declaration-valid Resource          field-value map
 (M3.14 / validateResource)         (absent ≠ null)
              │                            │
              └────────────┬───────────────┘
                           ▼
              checkConstraintValues (public)
                → Result<void, ConstraintEnforcementError>
                  (packages/core/src/result.ts — reuse only)
                           │
          for each Constraint in schema.constraints order:
                           │
                    presence gate (optional)
                           │
                    null gate (nullable)
                           │
                    type gate (FieldType / finite number)
                           │
                    kind evaluation (range | pattern | enum)
                           │
              ├── skip → next Constraint
              ├── fail → err(ConstraintEnforcementError) (fail-fast)
              └── all done → ok(undefined)
```

**Invariant:** No implementation step may coerce values, rewrite bounds/patterns, reject unknown map keys, invent a separate field-validity pass, or treat runtime enforcement as part of Resource schema declaration validity.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-018 Accepted (#66)
       ↓
M3.15 plan Draft (this document) (#67)
       ↓
M5 Plan Review → Returned → revised Draft → M5 re-review → Accepted
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M9 / validation as required
       ↓
one delivery PR for tracking #67 (Accepted plan + implementation together)
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M3.15 delivery slice (Accepted plan + implementation). Do **not** open a separate plan-only merge PR as a required gate. RFC-018 Accept documentation for [#66](https://github.com/rexescario-dev/resource-forge/issues/66) MAY land in a separate docs PR; it MUST NOT block inventing M3.15 semantics, but M6 assumes RFC-018 text is authoritative (already Accepted).

**Task checkboxes:** Completed during **M6 execution** only.

---

## Locked decisions (export / shape review — planning aids)

| Decision | Lock |
| --- | --- |
| Public surface name | Export `checkConstraintValues` from `@resource-forge/core` (RFC informative name made concrete) |
| Result abstraction | **Reuse** existing `Result` / `ok` / `err` from `packages/core/src/result.ts` (same pattern as registry/compose: `Result<void, E>` + `ok(undefined)`). MUST NOT invent a second result representation, local `{ success }` shape, thrown-only API, or parallel Ok/Err types. |
| Return type | `Result<void, ConstraintEnforcementError>` |
| Declaration APIs | `checkConstraints` / `validateResource` **unchanged**; MUST NOT call runtime enforcement |
| Field-value map input | `ReadonlyMap<string, FieldRuntimeValue>` where missing key = **absent**; present `null` = null value. (`FieldName` keys expected; unknown keys ignored) |
| `FieldRuntimeValue` | `string \| number \| boolean \| null` |
| Declaration-valid precondition | Caller responsibility. Implementation MUST NOT re-run full `validateResource` inside `checkConstraintValues`. Trust `resource.schema.fields` / `constraints` as already snapshotted declaration state. |
| Gate model | **Per Constraint** only — presence/null/type before that Constraint’s kind evaluation; **no** separate field-validity pass |
| Missing required field | Fail only when a Constraint targets that Field and the key is absent and `optional === false` |
| Unknown map keys | **Ignore** (MUST NOT fail) |
| Empty `constraints` | Success immediately; evaluate **no** gates |
| Ordering | `resource.schema.constraints` sequence order; **fail-fast** |
| `range` | Inclusive; `v >= min` / `v <= max` as declared; non-finite never reaches kind evaluation (type gate) |
| `pattern` pipeline | Exactly: declared `Constraint.pattern` → `new RegExp(pattern, '')` → match-extent against the **exact** runtime string. MUST NOT cache, precompile at declaration/snapshot time, normalize, rewrite, or mutate the declared `pattern` string as part of M3.15. |
| `pattern` full-string | Pass iff a match exists with `match.index === 0` and `match[0].length === value.length` (or equivalent extent check). MUST NOT require rewriting the pattern with added `^`/`$`. Ordinary ECMAScript `^`/`$` semantics unchanged. |
| `pattern` compile failure | Catch construct failure → `pattern_compilation_failure` (distinct from mismatch) |
| `enum` equality | ECMAScript `===` for numbers/strings/booleans; `-0` and `0` members-equivalent; MUST NOT use `Object.is` |
| Error type | New `ConstraintEnforcementError` union — **distinct** from declaration `ConstraintValidationError` |
| Diagnostics | M3.15 diagnostics **MUST** include `index`, `constraintName`, and `field` for **every** enforcement failure (mandatory; removes SHOULD ambiguity) |
| Purity | MUST NOT mutate Resource, `schema` / `constraints`, or the supplied field-value map |
| Projection / Resource aggregate | Unchanged; values not stored on Resource |
| Declaration fixtures | MUST NOT modify `create-resource-with-constraints.ts` to add runtime behavior. Reuse existing declaration fixtures when they can express the case; otherwise add **runtime-test-local** composition/helpers in `constraint-values.test.ts` (or adjacent test-only helper). |
| Public validate helpers for declaration | Still none (`validateConstraints` still not required) |

### Pattern evaluation contract (planning lock — preserves RFC-017 opacity)

```text
Constraint.pattern          (declared opaque string; unchanged)
        ↓
new RegExp(pattern, '')     (per evaluation; no cache / precompile / normalize / mutate)
        ↓
match extent against exact runtime string
```

### Enforcement cause → code mapping (planning lock)

| RFC-018 cause | `code` |
| --- | --- |
| Missing required field value | `missing_required_field_value` |
| Null field value | `null_field_value` |
| Field value type mismatch | `field_value_type_mismatch` |
| Range constraint violated | `range_constraint_violated` |
| Pattern compilation failure | `pattern_compilation_failure` |
| Pattern constraint violated | `pattern_constraint_violated` |
| Enum constraint violated | `enum_constraint_violated` |

Informative TypeScript shapes (diagnostics mandatory as locked above):

```ts
import type { Result } from '../result.js'; // packages/core/src/result.ts

type FieldRuntimeValue = string | number | boolean | null;

type ConstraintEnforcementError =
  | {
      readonly code: 'missing_required_field_value';
      readonly index: number;
      readonly constraintName: ConstraintName;
      readonly field: FieldName;
    }
  | {
      readonly code: 'null_field_value';
      readonly index: number;
      readonly constraintName: ConstraintName;
      readonly field: FieldName;
    }
  | {
      readonly code: 'field_value_type_mismatch';
      readonly index: number;
      readonly constraintName: ConstraintName;
      readonly field: FieldName;
      readonly expected: FieldType;
    }
  | {
      readonly code: 'range_constraint_violated';
      readonly index: number;
      readonly constraintName: ConstraintName;
      readonly field: FieldName;
    }
  | {
      readonly code: 'pattern_compilation_failure';
      readonly index: number;
      readonly constraintName: ConstraintName;
      readonly field: FieldName;
    }
  | {
      readonly code: 'pattern_constraint_violated';
      readonly index: number;
      readonly constraintName: ConstraintName;
      readonly field: FieldName;
    }
  | {
      readonly code: 'enum_constraint_violated';
      readonly index: number;
      readonly constraintName: ConstraintName;
      readonly field: FieldName;
    };

// Signature lock:
// checkConstraintValues(resource, values): Result<void, ConstraintEnforcementError>
```

---

## Constraints (from Accepted RFC-018)

### SHALL

- reuse core `Result` / `ok` / `err`; return `Result<void, ConstraintEnforcementError>`
- accept a field-value map with absent ≠ null semantics
- evaluate Constraints in declaration sequence order; fail-fast
- apply per-Constraint optional / nullable / type gates before kind evaluation
- evaluate inclusive `range` on finite numbers reaching kind evaluation
- compile `pattern` per evaluation via `new RegExp(pattern, '')`; full-string match-extent; distinct compile vs mismatch causes
- evaluate `enum` membership with `===` (including `-0`/`0`)
- include `index`, `constraintName`, and `field` on every enforcement failure
- ignore unknown map keys
- succeed immediately on empty `constraints`
- keep declaration validation and runtime enforcement as separate surfaces
- leave Resource / constraints / value map unmutated
- export the runtime check for host use

### SHALL NOT

- invent a second result abstraction
- reopen or alter RFC-016 / RFC-017 / M3.14 declaration contracts or `checkConstraints` behavior
- fold runtime enforcement into `validateResource`
- invent a separate field-validity pass over all Fields
- reject unknown map keys
- cache, precompile, normalize, rewrite, or mutate declared `pattern` strings
- add exclusive bound declaration properties or regex flags properties
- use `Object.is` for enum numeric membership
- collect multiple enforcement errors in one result
- implement uniqueness / cross-member / Relation-targeted constraints
- store field values on Resource or contribute to projection
- coerce, trim, normalize, or repair values / patterns / bounds
- modify `create-resource-with-constraints.ts` to add runtime behavior

---

## Package / ownership boundaries

### `@resource-forge/core` owns

- `packages/core/src/resource/types.ts` — `FieldRuntimeValue`, `ConstraintEnforcementError`
- `packages/core/src/resource/constraint-values.ts` — `checkConstraintValues` implementation (**new**)
- `packages/core/src/resource/constraint-values.test.ts` — RFC-018 contract tests (**new**; runtime-test-local helpers allowed)
- `packages/core/src/resource/index.ts` / `packages/core/src/index.ts` — export new public types + `checkConstraintValues`
- `packages/core/src/resource/exports.test.ts` — export smoke for new surface
- Roadmap M3.15 ✅ only as **final delivery commit** after M6+ gates

### Must remain untouched (feature-free)

- Declaration path: `constraints.ts` `checkConstraints` / snapshot / equality semantics (no behavioral change)
- `validate.ts` Resource declaration gate (MUST NOT call `checkConstraintValues`)
- `create-resource-with-constraints.ts` — **no runtime behavior**; reuse only as declaration fixture seam
- Field / Relation / Operation / Annotation / projection floors
- `packages/core/src/result.ts` — reuse only; do not fork
- `packages/nest`, `packages/graphql`, `packages/prisma`, `packages/cli`
- Unrelated workflow tooling bumps

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/core/src/result.ts` | Existing `Result` / `ok` / `err` — **reuse only** |
| `packages/core/src/resource/types.ts` | Add `FieldRuntimeValue`, `ConstraintEnforcementError` |
| `packages/core/src/resource/constraint-values.ts` | `checkConstraintValues(resource, values)` |
| `packages/core/src/resource/constraint-values.test.ts` | Incremental contract tests + runtime-test-local helpers |
| `packages/core/src/resource/{index,../../index}.ts` | Public exports |
| `packages/core/src/resource/exports.test.ts` | Smoke: exported; declaration helpers still absent |
| `packages/core/src/resource/create-resource-with-constraints.ts` | **Untouched** for runtime; declaration fixture reuse only |
| `docs/roadmap.md` | M3.15 ✅ only on final delivery commit |

Planning note: keep runtime code in a **new module** beside declaration `constraints.ts` so M3.14 declaration ownership stays obvious.

---

## TDD / verification strategy

For each implementation task: failing tests for that slice → implement that slice → green → commit.

**Must cover:**

1. Return type uses core `Result`: success is `ok(undefined)` (`result.ok === true`); failures are `err(...)` with discriminant `code`
2. Contract coverage for **each** `ConstraintEnforcementError` `code` variant (including mandatory `index` / `constraintName` / `field`)
3. Empty `constraints` → ok for any map (including empty / unknown keys); **no** gate evaluation
4. Unknown keys ignored (extra key does not fail when constraints otherwise pass)
5. Absent + `optional: true` → skip that Constraint; later Constraints still evaluated
6. Absent + `optional: false` → `missing_required_field_value` when Constraint targets that Field
7. Untargeted required Field absent → still ok (no general instance validator)
8. `null` + `nullable: true` → skip; `null` + `nullable: false` → `null_field_value`
9. Type mismatch (string for number Field, etc.) → `field_value_type_mismatch`
10. Non-finite number (`NaN`, `Infinity`) → `field_value_type_mismatch` (not range violated)
11. Inclusive `range`: `min`/`max` endpoints pass; outside fails `range_constraint_violated`; min-only / max-only
12. `pattern` valid full-string match passes; substring-only match fails `pattern_constraint_violated`
13. Uncompilable pattern → `pattern_compilation_failure`
14. Pattern with its own `^`/`$` still uses ordinary ECMAScript semantics under the full-string extent rule
15. Declared `pattern` string is unchanged after enforcement (no normalize/mutate); no reliance on cached/precompiled RegExp stored on the Constraint/Resource
16. `enum` membership via `===`; `-0` matches `0` in values; order of `values` irrelevant for membership
17. Fail-fast: earlier Constraint failure prevents later Constraint evaluation (assert via ordering fixture)
18. Multiple Constraints on same Field each gated/evaluated in sequence order
19. Runtime enforcement does **not** mutate Resource, schema/constraints, or the supplied field-value map
20. `checkConstraintValues` exported; `validateResource` still does not enforce values; no `validateConstraints`
21. Declaration regression: existing `constraints.test.ts` / validate / project suites remain green without behavior change

**Do not:** assert exclusivity flags; assert regex flags property; assert collect-all errors; assert unknown-key rejection; assert `Object.is` numeric membership; modify declaration unknown-kind / shape tests’ expectations; extend declaration fixture seams with runtime APIs.

---

### Task 1: Types + Result integration + field-value map / gate tests

**Files:** `types.ts`, `constraint-values.ts` (stub/`checkConstraintValues` skeleton returning `err` or unimplemented enough to fail tests), `constraint-values.test.ts`

- [x] **Step 1:** Add `FieldRuntimeValue` and `ConstraintEnforcementError` (mandatory `index` / `constraintName` / `field` on every arm)
- [x] **Step 2:** Declare `checkConstraintValues(...): Result<void, ConstraintEnforcementError>` importing `Result` / `ok` / `err` from `../result.js` only
- [x] **Step 3:** Add failing tests for: `ok(undefined)` success path with empty constraints; each gate error code (`missing_required_field_value`, `null_field_value`, `field_value_type_mismatch` incl. non-finite); unknown-keys ignored; untargeted required Field absent → ok; optional skip; diagnostics fields present
- [x] **Step 4:** Implement **gates + empty-constraints short-circuit only** (kind evaluation may still be TODO / fail closed for kind cases not yet under test in this task)
- [x] **Step 5:** Green Task 1 suite; commit

### Task 2: Kind evaluation (`range` / `pattern` / `enum`)

**Files:** `constraint-values.ts`, `constraint-values.test.ts`

- [x] **Step 1:** Add failing tests for inclusive `range`; pattern full-string / substring fail / compile failure / anchor semantics; enum `===` + `-0`/`0`; pattern string immutability / no cached RegExp on declaration objects
- [x] **Step 2:** Implement kind evaluation with pattern pipeline `new RegExp(pattern, '')` per call (no cache/precompile/normalize/mutate)
- [x] **Step 3:** Green Task 1–2 suite; commit

### Task 3: Ordering / fail-fast + purity + public surface

**Files:** `constraint-values.ts`, `constraint-values.test.ts`, `resource/index.ts`, `packages/core/src/index.ts`, `exports.test.ts`

- [x] **Step 1:** Add failing tests for fail-fast ordering, multiple Constraints on same Field, purity (Resource / constraints / map unchanged), and remaining error-code contract completeness if any gap remains
- [x] **Step 2:** Finish fail-fast loop details; export `checkConstraintValues`, `FieldRuntimeValue`, `ConstraintEnforcementError`
- [x] **Step 3:** Export smoke + assert declaration path still does not invoke runtime enforcement; run declaration constraint / validate / project regressions
- [x] **Step 4:** Commit

### Task 4: Docs hygiene (final delivery commit only)

**Files:** `docs/roadmap.md`, this plan’s Slice Completion Report

- [x] **Step 1:** After M6+ gates, mark M3.15 ✅ on roadmap; fill SCR
- [x] **Step 2:** Commit on the delivery PR

---

## Traceability

| Spec section | Tasks |
| --- | --- |
| §4 Field-value map + unknown-keys invariant | 1 |
| §5 Per-Constraint gates + matrix + no field-validity pass | 1 |
| §6.1 Inclusive `range` + finite precondition | 1–2 |
| §6.2 ECMAScript `pattern` full-string / compile (no declaration mutate) | 2 |
| §6.3 `enum` `===` membership | 2 |
| §7 Ordering / fail-fast / empty constraints | 1, 3 |
| §8 Failure causes + diagnostics | 1–3 |
| §9 Runtime check surface + Result purity | 1, 3 |
| §10 Projection / aggregate unchanged | 3 |
| §1.2 / §15 Deferrals | all (by omission) |

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Inventing a local result shape | Explicit reuse of `packages/core/src/result.ts`; Task 1 contract tests for `ok`/`err` |
| Accidentally folding into `validateResource` | SHALL NOT + export/integration tests assert declaration path unchanged |
| Pattern cache / `^$` rewrite / mutation | Pipeline lock + immutability / compile-per-call tests |
| Using `Object.is` for enum numbers | Explicit `-0`/`0` membership test + SHALL NOT |
| Building a general instance validator | Untargeted required-Field-absent success test; unknown-keys ignore test |
| Extending declaration fixtures with runtime API | Fixture ownership lock; runtime-test-local helpers only |
| Regressing M3.14 declaration behavior | Do not edit `checkConstraints` semantics; keep declaration suites green |

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.15 Runtime Constraint Enforcement |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/67 |
| M4 | Plan **Accepted** |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | **Approved** |
| M8 | **N/A** |
| M9 | **Complete** |
| Branch | `feat/m3-15-runtime-constraint-enforcement` |
| PR | TBD |
| Status | **Ready for merge** |

### Shipped

- Public `checkConstraintValues(resource, ReadonlyMap)` → `Result<void, ConstraintEnforcementError>` reusing core `Result`
- Per-Constraint optional / nullable / type gates (no separate field-validity pass)
- Inclusive `range`; ECMAScript `pattern` via per-eval `new RegExp(pattern, '')` + match-extent; `enum` via `===` (`-0`/`0`)
- Fail-fast in `constraints` order; ignore unknown keys; empty constraints evaluate nothing
- Mandatory `index` / `constraintName` / `field` diagnostics; purity preserved
- Declaration `checkConstraints` / `validateResource` unchanged

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (constraint-values 15; exports 8; constraints 15; validate 6; project 22; fields 19; relations 28; operations 9; schema 1) |
| Typecheck | **Passed** (`tsc --noEmit` in `@resource-forge/core`) |
| Lint | Skipped |
| Build | Skipped |
| Package validation | Skipped |

### Next Gate

**None — ready for merge** (M7 Approved; M8 N/A; M9 Complete; M10 workflow assets Accepted for this closeout). Merge PR / close [#67](https://github.com/rexescario-dev/resource-forge/issues/67) / [#66](https://github.com/rexescario-dev/resource-forge/issues/66) per human norms; then mark SCR **Slice complete**.

### M7 Code Review

```text
Decision: Approved for merge
Subject: feat/m3-15-runtime-constraint-enforcement (976b10d + M9 docs)
Accepted specification: docs/superpowers/specs/2026-08-08-rfc-018-runtime-constraint-enforcement-design.md
Accepted implementation plan: docs/superpowers/plans/2026-08-08-m3-15-runtime-constraint-enforcement.md

Plan tasks reviewed:
- Task 1 types/Result/gates: ✓
- Task 2 kind evaluation: ✓
- Task 3 order/purity/exports: ✓
- Task 4 docs/roadmap/SCR: ✓

Verification evidence:
- vitest: constraint-values 15, exports 8, constraints 15, validate 6, project 22 — PASS
- tsc --noEmit (@resource-forge/core) — PASS

Review summary: Faithful RFC-018 / plan realization. Public checkConstraintValues reuses core Result; per-Constraint gates; inclusive range; per-eval RegExp('',) + match-extent; enum ===; fail-fast; unknown keys ignored; declaration path untouched; create-resource-with-constraints untouched.
Blocking findings: None (no merge blockers)

Non-blocking observations:
- diagnostic() uses a narrow cast for non-type-mismatch arms; acceptable planning-aid shape, not a merge blocker.

Gate: Merge per human/project norms. M8/M9 may follow when appropriate.
```

### M8 Refactoring

```text
Decision: N/A
Scope: packages/core/src/resource/constraint-values.ts (+ tests)
Goals considered: simplify diagnostic() typing; extract gate helpers
Rationale: Current module is small, readable, and fully covered. Refactor risk exceeds maintainability benefit for this slice.
Verification: N/A (no structural change)
```

### M9 Documentation

Scope: `docs/roadmap.md` (Status paragraph + narrative), `docs/superpowers/specs/README.md` (already indexed), plan SCR.
Content: RFC-018 / M3.15 discoverability; deferred list no longer leads with runtime enforcement.
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

