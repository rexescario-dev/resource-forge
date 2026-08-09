# M3.19 Annotation Vocabulary — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-022. Reuse M3.3 Annotations packaging (`checkAnnotations` / `snapshotAnnotations` / Resource validation — **no second public annotation-validation entry point**; still no public `validateAnnotations`). Do **not** rewrite general `ResourceMetadata` validate for all producers. Do **not** change RFC-006 direct 1:1 projection. Do **not** accept unknown `rf` annotation names or non-string `JsonValue` variants for catalogued keys. Do **not** reopen Field/Relation/Operation/Constraint floors or M3.18 / RFC-021. Do **not** implement richer projection, UI/authz catalogs, or per-member annotations. Obey locked per-entry validation precedence (key → JsonValue → duplicate → vocab name → vocab shape).

**Status:** Accepted  
**M5:** Accepted (2026-08-09) — Plan Review after return revision; no plan blockers. Annotation-scoped enforcement retained. Value-shape checks locked to RFC-002 `JsonValue` string variant (not JS `typeof` as product semantics). Per-entry precedence locked to existing `checkAnnotations` order plus vocabulary steps after `duplicate_key`. Distinct vocabulary error codes retained. Metadata validate / projection untouched. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#81](https://github.com/rexescario-dev/resource-forge/issues/81)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-022 Annotation Vocabulary (**Accepted**) — amends RFC-006 annotation validation; specializes RFC-002 concrete `rf` keys on the annotation surface  
**Depends on:** RFC-002 (**Accepted**, `MetadataKey` / `JsonValue` / reserved `rf`); RFC-006 (**Accepted**, container / uniqueness / direct projection retained); RFC-022 (**Accepted**); M3.1–M3.18 / M3.3 Annotations shipped  
**Related RFC issue:** [#80](https://github.com/rexescario-dev/resource-forge/issues/80) (RFC-022 Accept docs; not this delivery slice’s sole packaging identity)  
**Package:** `@resource-forge/core`  
**Slice:** M3.19 only — closed annotation-scoped `rf` catalog (`description` \| `displayName`); string value shapes; unknown `rf` / wrong shapes rejected on annotations; non-`rf` opaque; projection unchanged

**Goal:** Implement RFC-022 so Resource annotation validation recognizes only the closed `rf` catalog with string value shapes, while RFC-006 container, uniqueness, snapshot, and direct 1:1 projection remain unchanged—and without establishing a universal `ResourceMetadata` producer validity rule.

**Architecture:**

```text
raw candidate annotations (MetadataEntry[])
          │
          ▼
 checkAnnotations(candidates)          ← extend for RFC-022 vocabulary
          │  RFC-006: key grammar / unique keys / JsonValue structure
          │  + when namespace == "rf":
          │       name ∈ { description, displayName }
          │       value is JSON string ("" allowed; null/object/… invalid)
          │  non-rf: structural only (opaque)
          │  (sole declaration path; reused by validateResource / fixtures)
          ▼
 snapshotAnnotations → valid Resource snapshot
          │
          ▼
 projectResourceMetadata               ← unchanged (exact 1:1 preservation)
```

**Invariant:** No implementation step may accept unknown `rf` annotation names, coerce non-strings into strings, invent last-wins duplicate semantics, alter projection, rewrite metadata validate for non-annotation producers, expose a second public annotation-validation API, or treat this catalog as automatically enforced on every `ResourceMetadata` producer.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-022 Accepted (#80)
       ↓
M3.19 plan Draft → M5 Plan Review → Accepted (#81)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M9 / validation as required
       ↓
one delivery PR for tracking #81 (Accepted plan + implementation together)
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M3.19 delivery slice (Accepted plan + implementation). Do **not** open a separate plan-only merge PR as a required gate. RFC-022 Accept documentation for [#80](https://github.com/rexescario-dev/resource-forge/issues/80) MAY land in a separate docs PR; M6 treats Accepted RFC text as authoritative.

**Task checkboxes:** Completed during **M6 execution** only.

---

## Locked decisions (export / shape review — planning aids)

| Decision | Lock |
| --- | --- |
| Closed catalog | Exactly `(rf, description)` and `(rf, displayName)` |
| Value shape | RFC-002 `JsonValue` **string** variant only for both keys |
| Empty string | `""` **valid** |
| Null / non-string | JSON `null` and every non-string `JsonValue` variant **invalid** for catalogued keys (no coercion) |
| Unknown `rf` name | **Invalid** on annotations |
| Non-`rf` entries | Structural only (RFC-006 / RFC-002); no vocabulary interpretation |
| Presence | Both catalogued keys optional; empty annotations still valid |
| Uniqueness | RFC-006 unique `MetadataKey` — at most one entry per catalogued key; no last-wins |
| Declaration API | Extend internal `checkAnnotations` / `snapshotAnnotations` only; still no public `validateAnnotations`; single path behind `validateResource` / fixtures |
| Enforcement scope | **Annotations only** — MUST NOT change general metadata validate to reject unknown `rf` keys globally in this slice |
| Projection | Unchanged exact 1:1; no vocabulary-driven rewrite |
| Equality / snapshot | Retain existing annotation equality/snapshot behavior; vocabulary does not add normalization (no trim/case-fold) |
| Growth | Do not hard-code forward-compat acceptance of extra `rf` names |
| Per-entry validation precedence | Lock below — extends today’s `checkAnnotations` order; do not invent a different order in M6 |

### Per-entry validation precedence (planning lock)

Today’s `checkAnnotations` loop order is: key grammar → `JsonValue` structural → duplicate-key vs already-accepted → accept. M3.19 inserts RFC-022 checks **after** those existing steps and **before** accept:

```text
Validation precedence (per annotation entry):
1. existing key grammar validation (`invalid_key`)
2. existing JsonValue structural validation (`invalid_value`)
3. existing duplicate-key detection (`duplicate_key`)
4. RFC-022 vocabulary-name validation for `rf` (`unknown_rf_annotation_key`)
5. RFC-022 value-shape validation for catalogued `rf` keys (`invalid_rf_annotation_value_shape`)
6. accept entry
```

Consequence examples M6 MUST NOT reinterpret: a second `(rf, description)` that is also a non-string reports **`duplicate_key`** (step 3), not a vocabulary shape code; a first `(rf, description)` with JSON `null` reports **`invalid_rf_annotation_value_shape`** only after structural `JsonValue` accepts `null` (steps 2 then 5).

### Vocabulary cause → code mapping (planning lock)

Widen `AnnotationValidationError` with vocabulary failures (distinct from `invalid_key` / `invalid_value` / `duplicate_key`):

| RFC-022 category | `code` (planning) |
| --- | --- |
| Unknown `rf` annotation name | `unknown_rf_annotation_key` (`index`, `key`) |
| Catalogued key with non-string / null value | `invalid_rf_annotation_value_shape` (`index`, `key`) |

Keep these under `invalid_annotations` via existing Resource validation wrapping. Do **not** collapse vocabulary failures into plain `invalid_value` without a vocabulary-discriminating code—M6 tests and M4→M5 review need a stable discriminant.

Existing codes remain for RFC-006 container failures (`invalid_key`, `invalid_value`, `duplicate_key`).

---

## Constraints (SHALL / SHALL NOT)

### SHALL

1. Reject unknown `rf` names on annotations inside `checkAnnotations` (RFC-022 §3–§4).
2. Reject JSON `null` and every non-string `JsonValue` variant for `(rf, description)` and `(rf, displayName)`.
3. Accept `JsonValue` string values including `""` for catalogued keys.
4. Obey locked per-entry precedence (key → JsonValue → duplicate → vocab name → vocab shape).
5. Leave non-`rf` entries under existing structural validation only.
6. Preserve RFC-006 uniqueness (including at most one entry per catalogued key).
7. Preserve snapshot-by-value and direct 1:1 projection behavior.
8. Keep annotation vocabulary failures as `invalid_annotations` causes distinct from metadata-aggregate failures.
9. Keep Field/Relation/Operation/Constraint/projection/metadata suites green (regression).
10. Export any newly public error-code types only if they are already part of the exported `AnnotationValidationError` surface (no new public validate API).

### SHALL NOT

1. Rewrite `ResourceMetadata` validate to enforce this catalog on all producers.
2. Change projection to interpret, rename, envelope, or normalize vocabulary values.
3. Accept unknown `rf` annotation names as forward-compatible.
4. Coerce non-string `JsonValue` variants into strings.
5. Require any catalogued key to be present.
6. Invent last-wins / merge for duplicate catalogued keys.
7. Add `icon` / `tags` / `label` or other `rf` keys in this slice.
8. Implement richer projection, per-member annotations, UI/authz catalogs.
9. Expose a new public `validateAnnotations` entry point.
10. Reopen M3.18 / RFC-021 or other member floors.

---

## Package / ownership boundaries

| Area | Role |
| --- | --- |
| `packages/core/src/resource/types.ts` | Widen `AnnotationValidationError` with vocabulary codes |
| `packages/core/src/resource/annotations.ts` | Vocabulary checks inside `checkAnnotations` (sole path) |
| `packages/core/src/resource/annotations.test.ts` | Vocabulary TDD (+ retain M3.3 container tests) |
| `packages/core/src/resource/validate.ts` | Untouched except via `checkAnnotations` reuse |
| `packages/core/src/resource/project.test.ts` | Regression: valid vocab still projects 1:1; invalid vocab fails before project |
| `packages/core/src/metadata/**` | **Untouched** for catalog enforcement (annotation-scoped only) |
| `packages/core/src/resource/index.ts` / `packages/core/src/index.ts` | Export surface unchanged unless error union already exported (it is) |
| `packages/core/src/resource/exports.test.ts` | Optional smoke that vocabulary error codes exist on the union / rejection path |
| `docs/roadmap.md` | M3.19 ✅ on final delivery commit only |

Planning note: keeping vocabulary logic inside `annotations.ts` (rather than a new module) is a **file-layout** decision, not a product boundary.

---

## Slice sequence

| Slice | Delivers | Prerequisite |
| --- | --- | --- |
| A | Error-union widen + `checkAnnotations` vocabulary rules + annotation tests | None (RFC-022 Accepted) |
| B | Projection / validate regressions for vocab success & failure | Slice A |
| C | Export smoke (if needed) / roadmap / SCR closeout docs | A+B green |

---

## Contract inventory

| Contract | Action |
| --- | --- |
| Closed `rf` catalog on annotations | **Implement** |
| String value shapes (+ empty string) | **Implement** |
| Unknown `rf` / wrong shape errors | **Implement** |
| Non-`rf` opacity | **Retain** |
| RFC-006 uniqueness / snapshot | **Retain** |
| Direct 1:1 projection | **Retain** |
| Universal metadata-producer catalog enforcement | **Defer** (later RFCs must explicitly adopt) |
| Additional `rf` keys / UI / authz / per-member annotations | **Defer** |

---

## TDD / verification strategy

- **Vocabulary accept:** `(rf, description)` string; `(rf, displayName)` string; both together; `""` for either; catalogued key + opaque non-`rf` entry together.
- **Vocabulary reject:** `(rf, icon)` (or any non-catalog name); `(rf, description)` with `null` / number / boolean / object / array; same for `displayName`.
- **Uniqueness retained:** two `(rf, description)` entries → `duplicate_key` (not last-wins).
- **Non-`rf` retained:** invalid key grammar / bad JsonValue / duplicates still use existing codes.
- **Projection:** vocabulary-valid Resource projects exact keys/values; vocabulary-invalid Resource fails projection via `invalid_resource` / `invalid_annotations` (no partial project).
- **Metadata non-regression:** existing metadata tests that use arbitrary `rf` keys (if any beyond catalog) MUST remain green — do **not** tighten metadata validate in this slice. Annotation tests cover the catalog.
- **Regression:** annotations / validate / project / exports suites green.
- **Commands:** `pnpm exec vitest run --pool=threads --maxWorkers=1 --minWorkers=1` on touched test files; `pnpm exec tsc --noEmit` in `@resource-forge/core`.
- **Lint/build:** skipped unless already required by repo norms for the slice.

---

## Task breakdown

### Task 1 — Types (Slice A)

**Files:** `packages/core/src/resource/types.ts`

- [x] **Step 1:** Add `AnnotationValidationError` arms:
  - `{ code: 'unknown_rf_annotation_key'; index; key: MetadataKey }`
  - `{ code: 'invalid_rf_annotation_value_shape'; index; key: MetadataKey }`
- [x] **Step 2:** Confirm Resource `invalid_annotations` wrapping still typechecks with the widened union

**Trace:** RFC-022 §3–§4.1

### Task 2 — Vocabulary validation in `checkAnnotations` (Slice A)

**Files:** `packages/core/src/resource/annotations.ts`, `annotations.test.ts`

- [x] **Step 1 (TDD):** Failing tests for accept matrix (description/displayName/both/empty string/with opaque non-`rf`) and reject matrix (unknown `rf` name; non-string/null shapes for both keys); duplicate catalogued key still `duplicate_key`
- [x] **Step 2:** Implement vocabulary checks using the locked precedence (key → JsonValue → duplicate → vocab name → vocab shape → accept). If `key.namespace === 'rf'`: require `name` ∈ `{ 'description', 'displayName' }` else `unknown_rf_annotation_key`
- [x] **Step 3:** For catalogued keys, require the existing `JsonValue` string variant; JSON `null` and every non-string `JsonValue` variant are invalid → `invalid_rf_annotation_value_shape`
- [x] **Step 4:** Add/adjust TDD cases that lock precedence (e.g. duplicate catalogued key with bad shape → `duplicate_key`; first catalogued key with `null` → `invalid_rf_annotation_value_shape`)
- [x] **Step 5:** Confirm `snapshotAnnotations` continues to call `checkAnnotations` (no second path)
- [x] **Step 6:** Update/replace the M3.3 test that only asserted “any rf key under framework kind” so it asserts **catalogued** acceptance and adds unknown-`rf` rejection (do not leave a test that implies open `rf.*` on annotations)

**Trace:** RFC-022 §3–§4, §5.1 examples

### Task 3 — Projection / validate regression (Slice B)

**Files:** `packages/core/src/resource/project.test.ts`, `validate.test.ts` (only if needed)

- [x] **Step 1 (TDD):** Valid Resource with both catalogued strings (+ optional opaque entry) projects exact entries
- [x] **Step 2 (TDD):** Unknown `rf` annotation fails `projectResourceMetadata` via invalid resource/annotations (vocabulary cause visible)
- [x] **Step 3:** Confirm existing projection exact-preservation and empty-annotations cases still pass
- [x] **Step 4:** Confirm metadata package tests unchanged/green (no catalog enforcement leak)

**Trace:** RFC-022 §5; RFC-006 projection retained

### Task 4 — Exports + docs closeout (Slice C)

**Files:** `exports.test.ts` (optional discriminant smoke), `docs/roadmap.md`, this plan’s SCR

- [x] **Step 1:** If useful, export smoke that vocabulary rejection codes appear on the public error union / rejection path (still no `validateAnnotations`)
- [x] **Step 2:** After M6+ gates, mark M3.19 ✅ on roadmap; note RFC-022 Accepted discoverability already present; fill SCR
- [x] **Step 3:** Later list remains richer projection → direction/joins → empty-vs-absent (no reopen of M3.18)

**Trace:** RFC-022 §10; roadmap discoverability

---

## Traceability matrix

| RFC-022 section | Tasks |
| --- | --- |
| §3.1 Closed catalog | Task 1–2 |
| §3.2 Value shapes | Task 2 |
| §3.3 Unknown / reservation interaction | Task 2 |
| §3.4 Growth / breaking removals | Task 2 (no forward-compat accept); docs note only |
| §4 Validation / error ownership | Task 1–2 |
| §4.2 Enforcement scope (annotations only) | Task 2–3 (metadata untouched) |
| §5 Projection unchanged | Task 3 |
| §5.1 Examples | Task 2–3 tests |
| §9 Deferrals | Explicit non-goals / SHALL NOT |
| §10 Implementation gate | Lifecycle; M5 before M6 |

---

## Execution risks (operational — not redesign)

| Risk | Mitigation |
| --- | --- |
| Accidentally enforcing catalog in metadata validate | SHALL NOT + metadata suite regression; only touch `annotations.ts` |
| Leaving M3.3 test that implies open `rf.*` on annotations | Task 2 Step 6 explicitly updates that test |
| Collapsing vocab errors into `invalid_value` | Locked distinct codes; TDD asserts codes |
| Implementing last-wins for duplicate catalogued keys | Retain RFC-006 `duplicate_key` test |
| Scope creep into richer projection / extra `rf` keys | SHALL NOT list; deferrals explicit |
| RFC-022 Accept docs not yet on `main` | Land [#80](https://github.com/rexescario-dev/resource-forge/issues/80) docs before or with delivery; M6 treats Accepted RFC text as authoritative |

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.19 Annotation Vocabulary |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/81 |
| M4 | Plan **Accepted** |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | **Approved** |
| M8 | **N/A** |
| M9 | **Complete** |
| Branch | `feat/m3-19-annotation-vocabulary` |
| PR | https://github.com/rexescario-dev/resource-forge/pull/82 |
| Status | **Slice complete** |

### Shipped

- Widened `AnnotationValidationError` with `unknown_rf_annotation_key` / `invalid_rf_annotation_value_shape`
- Vocabulary validation in sole `checkAnnotations` path (closed `description`\|`displayName`; JsonValue string shapes)
- Locked precedence: key → JsonValue → duplicate → vocab name → vocab shape
- Projection exact 1:1 retained; metadata validate untouched
- Public export smoke + roadmap M3.1–M3.19 ✅; RFC-022 Accept docs

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (annotations 10; project 24; exports 12; validate 6; metadata 22) via `vitest run --pool=threads --maxWorkers=1 --minWorkers=1` |
| Typecheck | **Passed** (`tsc --noEmit` in `@resource-forge/core`) |
| Lint | Skipped |
| Build | Skipped |
| Package validation | Skipped |

### M5 Plan Review

```text
Decision: Accepted
Subject (plan): docs/superpowers/plans/2026-08-09-m3-19-annotation-vocabulary.md
Accepted specification: docs/superpowers/specs/2026-08-09-rfc-022-annotation-vocabulary-design.md
Delivery goal: Implement closed annotation-scoped rf catalog (description|displayName) with JsonValue string shapes inside checkAnnotations; retain RFC-006 container/projection; do not rewrite metadata validate

Review summary: Return ledger items resolved. Value-shape locked to JsonValue string variant; per-entry precedence locked to existing checkAnnotations order plus vocabulary after duplicate_key. No further task/API/architecture changes. M6 authorized.

Findings: None (no plan blockers)
Traceability: adequate (coverage + deferrals checked)
Authority: Plan governs sequencing/execution; specification governs product semantics.
Gate: Proceed to M6.
```

### M7 Code Review

```text
Decision: Approved for merge
Subject: feat/m3-19-annotation-vocabulary (#81)
Accepted plan: docs/superpowers/plans/2026-08-09-m3-19-annotation-vocabulary.md
Accepted specification: docs/superpowers/specs/2026-08-09-rfc-022-annotation-vocabulary-design.md

Review summary: Implementation matches Accepted plan Tasks 1–4. Sole path checkAnnotations; annotation-scoped catalog only; JsonValue string shapes; precedence locked; M3.3 open-rf test replaced; projection exact preservation; metadata suite untouched/green; no validateAnnotations; no M3.18 reopen. Verification green (vitest + tsc).

Findings: None (no merge blockers)
Gate: Proceed to M8/M9 as applicable.
```

### M8 Refactoring

```text
Decision: N/A
Reason: No worthwhile behavior-preserving refactor identified beyond TDD-local vocabulary checks inside annotations.ts.
```

### M9 Documentation

```text
Decision: Accepted
Scope: docs/roadmap.md; docs/superpowers/specs/README.md; RFC-022 Status Accepted; plan SCR
Summary: Roadmap lists RFC-022 Accepted and M3.19 ✅; specs index updated; SCR Slice complete.
```

### M10 Workflow Validation

```text
Decision: Accepted
Subject: installed docs/workflows assets (no prompt edits this slice)
Summary: M2–M10 prompts remain coherent for this delivery; no workflow asset changes required for M3.19 closeout.
```

### Next Gate

**None — slice complete**
