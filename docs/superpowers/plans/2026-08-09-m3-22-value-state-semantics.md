# M3.22 Value-State Semantics — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-025. Implement a pure value-state check surface for Field and Relation instance maps. Do **not** amend declaration floors (`optional` / `nullable` / multiplicity / direction). Do **not** add `elementNullable`. Do **not** implement wire/serialization, persistence/ORM, cascade, loading/fetch, runtime traversal/query, or Relation→metadata projection. Do **not** amend RFC-018 `checkConstraintValues` gates. Do **not** call value-state checks from `validateResource`. Do **not** reopen RFC-024 / M3.21. Relation classification MUST check `value === null` **before** `Array.isArray` / collection refinement so `many + null` is association-level null, never a shape mismatch. Keep association placeholders opaque (not Resource / ResourceIdentity / target types); do not inspect direction/inverse/join during value-state checks.

**Status:** Accepted  
**M5:** Accepted (2026-08-09) — Plan Review; no plan blockers. Traceability complete; Field/Relation matrices, empty≠absent, empty≢null, null-element forbid, association-only `Relation.nullable`, no Field.nullable inheritance, no `elementNullable`, RFC-018/`validateResource`/RFC-024 untouched, wire/ORM/cascade/load/traversal deferred. Preserve null-before-array ordering for Relations; opaque association placeholders only. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#90](https://github.com/rexescario-dev/resource-forge/issues/90)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-025 Value-State Semantics (**Accepted**) — fills deferred empty-vs-absent / null-elements gap; does not reopen RFC-013 / RFC-014 / RFC-015 / RFC-024  
**Depends on:** RFC-011 / RFC-013 / RFC-014 / RFC-015 / RFC-018 (**Accepted**); RFC-025 (**Accepted**); M3.1–M3.21 shipped  
**Related RFC issue:** [#89](https://github.com/rexescario-dev/resource-forge/issues/89) (RFC-025 Accept docs; not this delivery slice’s sole packaging identity)  
**Package:** `@resource-forge/core`  
**Slice:** M3.22 only — Field / Relation value-state classification + permission enforcement (conceptual runtime maps; not wire)

**Goal:** Implement RFC-025 so callers can validate Field and Relation instance/payload value states against declaration permissions—locking `empty ≠ absent`, `empty ≢ association-level null`, association-level null via RFC-015 only, and forbidding `many` null elements—without changing schema declaration floors or inventing serialization/persistence semantics.

**Architecture:**

```text
Declaration-valid Resource
        │
        ├─ fieldValues: Map<FieldName, FieldRuntimeValue>     (absent = missing key)
        └─ relationValues: Map<RelationName, RelationRuntimeValue>
                │
                ▼
checkFieldValueStates(resource, fieldValues)       ← NEW (RFC-025 §4)
  for each declared Field (schema order): fail-fast permission matrix
                │
checkRelationValueStates(resource, relationValues) ← NEW (RFC-025 §5)
  for each declared Relation (schema order):
    classify top-level { absent | present(null) | present(non-null) }
    if many ∧ present(non-null): require Array; empty | non-empty; forbid null elements
                │
                ▼
Result<void, ValueStateError>   (distinct from declaration / constraint errors)

NOT called from validateResource
Does NOT amend checkConstraintValues
```

**Invariant:** Declaration permission ≠ value state. No implementation step may reinterpret `Relation.nullable` as element-null permission, inherit element nulls from target `Field.nullable`, collapse empty↔absent or empty↔null, or treat `many` as “always a collection including when association-level null.”

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-025 Accepted (#89)
       ↓
M3.22 plan Draft → M5 Plan Review → Accepted (#90)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M9 / validation as required
       ↓
one delivery PR for tracking #90 (Accepted plan + implementation together;
RFC-025 Accept docs from #89 MAY land in the same PR)
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M3.22 delivery slice (Accepted plan + implementation). Do **not** open a separate plan-only merge PR as a required gate. M6 treats Accepted RFC text as authoritative.

**Task checkboxes:** Completed during **M6 execution** only.

---

## Locked decisions (export / shape review — planning aids)

| Decision | Lock |
| --- | --- |
| Public entrypoints | **Export** `checkFieldValueStates` and `checkRelationValueStates` from `@resource-forge/core` |
| Call from `validateResource` | **Forbidden** |
| Amend `checkConstraintValues` | **Forbidden** (RFC-018 remains owner of constraint gates) |
| Field value map | `ReadonlyMap<string, FieldRuntimeValue>` — **absent = missing key**; present null = `null` (same surface convention as RFC-018) |
| Relation value map | `ReadonlyMap<string, RelationRuntimeValue>` — **absent = missing key** |
| `RelationRuntimeValue` | Planning surface (not wire): `null` \| `RelationSingularAssociation` \| `ReadonlyArray<RelationAssociationElement \| null>` |
| Singular non-null (`one`) | Non-null **and** not an array — opaque association placeholder type `RelationSingularAssociation` (branded empty object or equivalent planning type; tests use a shared fixture object) |
| Collection non-null (`many`) | **Must** be a readonly array (including `[]` for empty) |
| Association-level null | Exactly `null` at the Relation map value (top-level); never an empty array |
| Empty | `many` + present array with `length === 0` |
| Null element | Any `null` at an array index in a `many` collection → forbidden |
| Field type gates | **Out of this slice** — Field value-state checks presence/null only; do not duplicate RFC-018 type mismatch |
| Unknown map keys | **Ignore** (do not fail) |
| Evaluation order | Declared `fields` / `relations` schema order; **fail-fast** (first error) |
| Declaration floors | **Unchanged** — no `elementNullable`; no Relation/Field shape widen |
| RFC-024 members | Untouched |
| Projection | Untouched |

### `RelationRuntimeValue` (planning lock)

```text
RelationSingularAssociation  // opaque non-null non-array association placeholder
RelationAssociationElement   // opaque non-null element placeholder (same brand family OK)

RelationRuntimeValue =
  | null
  | RelationSingularAssociation
  | ReadonlyArray<RelationAssociationElement | null>
```

**Classification algorithm (Relations):**

```text
for each declared Relation R in schema.relations order:
  if key R.name missing in map:
    if R.optional === false → fail forbidden_absent_relation
    else continue
  value = map.get(R.name)

  if value === null:
    if R.nullable === false → fail forbidden_null_relation
    else continue   // association-level null; do NOT treat as collection

  // present non-null association
  if R.multiplicity === "one":
    if Array.isArray(value) → fail relation_value_shape_mismatch
    // singular placeholder OK (non-null, non-array)
    continue

  if R.multiplicity === "many":
    if !Array.isArray(value) → fail relation_value_shape_mismatch
    // empty array is allowed (present non-null empty) — satisfies optional:false
    for i, elem of value:
      if elem === null → fail forbidden_null_relation_element { index: i }
    continue
```

**Classification algorithm (Fields):**

```text
for each declared Field F in schema.fields order:
  if key F.name missing:
    if F.optional === false → fail forbidden_absent_field
    else continue
  value = map.get(F.name)
  if value === null:
    if F.nullable === false → fail forbidden_null_field
    else continue
  // present non-null scalar — OK for value-state (no FieldType gate here)
```

### Error codes (planning lock)

```text
checkFieldValueStates(
  resource: Resource,
  values: ReadonlyMap<string, FieldRuntimeValue>,
): Result<void, FieldValueStateError>

FieldValueStateError:
  | { code: 'forbidden_absent_field'; field: FieldName }
  | { code: 'forbidden_null_field'; field: FieldName }

checkRelationValueStates(
  resource: Resource,
  values: ReadonlyMap<string, RelationRuntimeValue>,
): Result<void, RelationValueStateError>

RelationValueStateError:
  | { code: 'forbidden_absent_relation'; relation: RelationName }
  | { code: 'forbidden_null_relation'; relation: RelationName }
  | { code: 'relation_value_shape_mismatch'; relation: RelationName; multiplicity: RelationMultiplicity }
  | { code: 'forbidden_null_relation_element'; relation: RelationName; index: number }

// Optional umbrella (export if useful for callers; not required):
ValueStateError = FieldValueStateError | RelationValueStateError
```

**Precondition:** `resource` is declaration-valid (same spirit as `checkConstraintValues`). Do not re-run full `validateResource` inside these helpers unless an existing helper pattern already does; plan default: **trust caller / assume valid Resource snapshot** like other runtime checks.

---

## Constraints (SHALL / SHALL NOT)

### SHALL

1. Classify Field values as absent / present null / present non-null per RFC-025 §4.
2. Enforce Field permission matrix from `optional` × `nullable` (RFC-025 §4.1).
3. Classify Relation values with top-level taxonomy `{absent | present(null) | present(non-null)}` (RFC-025 §5.1).
4. Refine `many` + present(non-null) into empty / non-empty collections; forbid null elements (RFC-025 §5.2, §5.5).
5. Treat empty collection as present (satisfies `optional: false`) and distinct from absence and association-level null (RFC-025 §5.3).
6. Keep association-level null governed only by `Relation.nullable` (RFC-025 §5.4–§5.5).
7. Keep element-null forbidden and not inherited from target Field `nullable` (RFC-025 §5.5).
8. Export public check entrypoints + error/types; keep helpers internal as needed.
9. Leave declaration validation, projection, direction/join, and constraint evaluation behavior unchanged.

### SHALL NOT

1. Add declaration members (`elementNullable` or similar).
2. Reinterpret `Relation.nullable` as element-null permission.
3. Collapse empty↔absent or empty↔association-null.
4. Treat association-level null as a collection / empty array.
5. Implement wire, persistence, cascade, load, traversal, or Relation projection.
6. Amend RFC-018 `checkConstraintValues` semantics or error shapes.
7. Invoke value-state checks from `validateResource` / create helpers.
8. Reopen RFC-024 / M3.21.
9. Require reciprocal/mirror/join FieldType rules (orthogonal / deferred).

---

## Package / ownership boundaries

| Area | Role |
| --- | --- |
| `packages/core/src/resource/types.ts` | Add `RelationRuntimeValue` / association placeholder types; `FieldValueStateError`; `RelationValueStateError`; optional `ValueStateError` |
| `packages/core/src/resource/field-value-states.ts` (**create**) | `checkFieldValueStates` |
| `packages/core/src/resource/field-value-states.test.ts` (**create**) | Field matrix TDD |
| `packages/core/src/resource/relation-value-states.ts` (**create**) | `checkRelationValueStates` |
| `packages/core/src/resource/relation-value-states.test.ts` (**create**) | Relation taxonomy / empty / null-element TDD |
| `packages/core/src/resource/constraint-values.ts` | **Do not modify** behavior |
| `packages/core/src/resource/validate.ts` / `relations.ts` / create helpers | **Do not** wire value-state checks into declaration validation |
| `packages/core/src/index.ts` / `resource/index.ts` | Export new public types + both check functions |
| `packages/core/src/resource/exports.test.ts` | Export smoke |
| `docs/roadmap.md` | RFC-025 Accepted + M3.22 ✅; Later follow-ons only — on final delivery commit |
| `docs/superpowers/specs/README.md` | Index RFC-025 if not already — on delivery commit |
| `docs/superpowers/specs/2026-08-09-rfc-025-value-state-semantics-design.md` | Already Accepted; ship with PR |
| `docs/superpowers/plans/2026-08-09-m3-22-value-state-semantics.md` | This plan + SCR at closeout |

---

## Slice sequence

| Slice | Delivers | Prerequisite |
| --- | --- | --- |
| A | Types + `checkFieldValueStates` + field tests | RFC-025 Accepted |
| B | `RelationRuntimeValue` types + `checkRelationValueStates` + relation tests | RFC-025 Accepted (may parallel A) |
| C | Exports + export smoke | A–B green |
| D | Roadmap / specs index / SCR closeout docs | A–C green |

---

## Contract inventory

| Contract | Action |
| --- | --- |
| Field absent / present / null states | **Implement** |
| Field permission matrix | **Implement** |
| Relation top-level taxonomy | **Implement** |
| `many` empty vs non-empty | **Implement** |
| `empty ≠ absent`, `empty ≢ null` | **Implement** |
| Forbid null elements in `many` | **Implement** |
| Association null via `Relation.nullable` only | **Implement** |
| Element null not from Field `nullable` | **Implement** (by omission of inheritance) |
| RFC-018 constraint gates | **Defer / leave unchanged** |
| Wire / persistence / cascade / load / traversal | **Defer** |
| `elementNullable` declaration | **Defer** |
| Relation projection | **Defer** |

---

## TDD / verification strategy

### Fields (Slice A)

- `optional: false`, absent → `forbidden_absent_field`
- `optional: true`, absent → ok
- `nullable: false`, present `null` → `forbidden_null_field`
- `nullable: true`, present `null` → ok
- present non-null scalar → ok for all four `optional`×`nullable` combos where allowed
- Unknown map keys ignored
- Fail-fast: first declared Field failure wins
- Empty `fields` → ok with empty map

### Relations (Slice B)

- Absent vs `optional` matrix (mirror Fields with relation codes)
- Association-level `null` vs `nullable` matrix
- `many` + `[]` → ok (empty ≠ absent); with `optional: false` → ok
- `many` + `null` → association null path (not empty)
- `many` + `[elem]` → ok; `many` + `[elem, null]` → `forbidden_null_relation_element` with index
- `many` + non-array non-null → `relation_value_shape_mismatch`
- `one` + array → `relation_value_shape_mismatch`
- `one` + singular placeholder → ok
- `nullable: true` does **not** allow `[null]`
- Fail-fast on first declared Relation failure
- Direction/inverse/join presence irrelevant to value-state outcomes (fixtures may include them)

### Exports (Slice C)

- Public: both check functions + error/runtime types
- Non-export: internal helpers if any

### Full suite

- Existing `@resource-forge/core` suites remain green (no declaration fixture break expected)

---

## Task breakdown

### Task 1: Field value-state types + `checkFieldValueStates` (Slice A)

**Files:** `types.ts`, `field-value-states.ts`, `field-value-states.test.ts`

- [x] **Step 1:** Write failing tests for Field permission matrix + fail-fast + unknown-key ignore
- [x] **Step 2:** Add `FieldValueStateError` to `types.ts`
- [x] **Step 3:** Implement `checkFieldValueStates` per locked algorithm
- [x] **Step 4:** Confirm tests green; do not touch `constraint-values.ts`

### Task 2: Relation runtime types + `checkRelationValueStates` (Slice B)

**Files:** `types.ts`, `relation-value-states.ts`, `relation-value-states.test.ts`

- [x] **Step 1:** Write failing tests for taxonomy, empty≠absent, empty≢null, shape mismatch, null elements, nullable≠element-null
- [x] **Step 2:** Add `RelationSingularAssociation` / `RelationAssociationElement` / `RelationRuntimeValue` / `RelationValueStateError` (and optional `ValueStateError` union)
- [x] **Step 3:** Implement `checkRelationValueStates` per locked algorithm (null branch before array branch)
- [x] **Step 4:** Confirm tests green

### Task 3: Public exports (Slice C)

**Files:** `resource/index.ts`, `packages/core/src/index.ts`, `exports.test.ts`

- [x] **Step 1:** Export types + both check functions
- [x] **Step 2:** Export smoke tests

### Task 4: Docs closeout (Slice D — with delivery)

**Files:** `docs/roadmap.md`, `docs/superpowers/specs/README.md`, this plan SCR

- [x] **Step 1:** Mark RFC-025 Accepted + M3.22 ✅; remove/replace Later empty-vs-absent row with follow-on Later items as appropriate (cascade / load / persistence / traversal / Relation projection remain Later—do not invent a new empty-vs-absent Later)
- [x] **Step 2:** Ensure specs index lists RFC-025
- [x] **Step 3:** Fill Slice Completion Report after M6–M10

---

## Traceability

| Plan item | RFC-025 |
| --- | --- |
| Field states + matrix | §4, §4.1 |
| RFC-018 non-amendment | §4.2, §6.10 |
| Relation taxonomy tree | §5.1 |
| Many empty/non-empty + element positions | §5.2 |
| Distinctions empty≠absent / empty≢null | §5.3 |
| Association permission matrix | §5.4 |
| Element null forbidden / no inheritance | §5.5 |
| Invariants | §6 |
| Deferred wire/persistence/… | §1.2, §11 |

---

## Risks (operational)

| Risk | Mitigation |
| --- | --- |
| Confusion with RFC-018 Field gate errors | Distinct error type + codes; do not reuse `ConstraintEnforcementError` |
| Accidental wiring into `validateResource` | Explicit SHALL NOT; export tests + code review |
| Treating `[]` as null or absent | Dedicated tests; algorithm checks `null` before array |
| Over-specifying association identity | Opaque placeholders only; no ResourceIdentity/wire invent |

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.22 Value-State Semantics |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/90 |
| M4 | Plan **Accepted** |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | **Approved** |
| M8 | **N/A** |
| M9 | **Complete** |
| Branch | `feat/m3-22-value-state-semantics` |
| PR | https://github.com/rexescario-dev/resource-forge/pull/91 |
| Status | **Slice complete** |

### M5 Plan Review

```text
Decision: Accepted
Subject (plan): docs/superpowers/plans/2026-08-09-m3-22-value-state-semantics.md
Accepted specification: docs/superpowers/specs/2026-08-09-rfc-025-value-state-semantics-design.md
Delivery goal: Implement RFC-025 pure Field/Relation value-state checks without declaration, wire, or traversal redesign

Review summary: No plan blockers. Traceability and matrices match RFC-025; null-before-array ordering and opaque association placeholders preserved as M6 execution constraints. RFC-018 / validateResource / RFC-024 untouched; deferred surfaces explicit.

Findings: None (no plan blockers)
Traceability: adequate (coverage + deferrals checked)
Gate: Proceed to M6.
Authority: Plan governs sequencing/execution; specification governs product semantics.
```

### Shipped

- Public `checkFieldValueStates` / `checkRelationValueStates` (not wired into `validateResource`)
- Field optional×nullable presence/null matrix; Relation taxonomy with null-before-array ordering
- `many` empty ≠ absent; `many + null` = association-level null; null elements forbidden
- Opaque association placeholders; RFC-018 / RFC-024 untouched
- RFC-025 Accept docs + roadmap M3.1–M3.22 ✅

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (field-value-states 8; relation-value-states 13; exports 15; full core **314**) via `vitest run --pool=threads --maxWorkers=1 --minWorkers=1` |
| Typecheck | **Passed** (`tsc --noEmit` in `@resource-forge/core`) |
| Lint | Skipped |
| Build | Skipped |
| Package validation | Skipped |

### M7 Code Review

```text
Decision: Approved for merge
Subject: feat/m3-22-value-state-semantics (#90)
Accepted plan: docs/superpowers/plans/2026-08-09-m3-22-value-state-semantics.md
Accepted specification: docs/superpowers/specs/2026-08-09-rfc-025-value-state-semantics-design.md

Review summary: Implementation matches Accepted plan Tasks 1–4. Null-before-array ordering locked; association placeholders opaque; no declaration floor changes; validateResource / checkConstraintValues untouched. Verification green (vitest 314 + tsc).

Findings: None (no merge blockers)
Gate: Proceed to M8/M9 as applicable.
```

### M8 Refactoring

```text
Decision: N/A
Reason: No worthwhile behavior-preserving refactor beyond the focused value-state modules delivered under TDD.
```

### M9 Documentation

```text
Decision: Accepted
Scope: docs/roadmap.md; docs/superpowers/specs/README.md; RFC-025 Status Accepted; plan SCR
Summary: Roadmap lists RFC-025 Accepted and M3.22 ✅; Later follow-ons are cascade/load/persistence/traversal/Relation projection; SCR Slice complete.
```

### M10 Workflow Validation

```text
Decision: Accepted
Subject: installed docs/workflows assets (no prompt edits this slice)
Summary: M2–M10 prompts remain coherent for this delivery; no workflow asset changes required for M3.22 closeout.
```

### Next Gate

**None — slice complete**
