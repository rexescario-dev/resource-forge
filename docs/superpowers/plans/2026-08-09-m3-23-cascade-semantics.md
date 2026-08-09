# M3.23 Cascade Semantics — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-026. Widen closed Relation with required `onDelete` / `onUpdate` (`CascadePolicy`). Implement declaration validation (`setNull` ⇒ `nullable: true` as sole gate — `optional` is not an additional gate) and a pure contract-level `evaluateCascadeEvent` surface. Do **not** implement persistence/ORM, load/fetch, runtime traversal/query, wire/serialization, Relation→metadata projection, multi-hop/cycle execution, dirty tracking, or ownership-transfer engines. Do **not** reinterpret RFC-024 `direction` / `inverse` / `join` as cascade inputs. Do **not** reopen RFC-024 / M3.21 or RFC-025 / M3.22. Do **not** treat `setNull` as `[]`, element removal, or element null. Inbound Relations MUST participate exactly like outbound. `restrict` MUST be presence-symmetric for delete and update. Null-element shape mismatch applies only for non-`none` policies; `none` skips the Relation without value-state validation. Do **not** add defensive declaration/value-state validation inside `evaluateCascadeEvent`.

**Status:** Accepted  
**M5:** Accepted (2026-08-09) — Plan Review; no plan blockers after three clarifications: (1) `optional: false` does not prohibit `setNull`; `setNull` yields present(null); `nullable` is the sole declaration gate; (2) `many` null-element → `cascade_relation_value_shape_mismatch` only when policy ≠ `none`; `none` skips without value-state validation; (3) evaluation tests use declaration-valid Resources and RFC-025-valid values except the locked cascade shape-mismatch boundary — no defensive validateResource/value-state inside `evaluateCascadeEvent`. Traceability complete; RFC-024/025 untouched; persistence/load/traversal/wire deferred. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#93](https://github.com/rexescario-dev/resource-forge/issues/93)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-026 Cascade Semantics (**Accepted**) — fills deferred cascade gap; does not reopen RFC-024 / RFC-025  
**Depends on:** RFC-011 / RFC-013 / RFC-015 / RFC-024 / RFC-025 (**Accepted**); RFC-026 (**Accepted**); M3.1–M3.22 shipped  
**Related RFC issue:** [#92](https://github.com/rexescario-dev/resource-forge/issues/92) (RFC-026 Accept docs; not this delivery slice’s sole packaging identity)  
**Package:** `@resource-forge/core`  
**Slice:** M3.23 only — Relation cascade declaration floor + contract-level event evaluation

**Goal:** Implement RFC-026 so every Relation declares required independent `onDelete` / `onUpdate` policies, declaration validation enforces closed vocabulary and `setNull` ⇒ `nullable: true`, and callers can evaluate a declared delete/update event against Relation value states to obtain restrict blocks / cascade targets / setNull intents—without inventing persistence, fetch, traversal, or dirty-tracking semantics.

**Architecture:**

```text
Relation (closed widen)
├── … RFC-024 floor …
├── onDelete: CascadePolicy    ← required
└── onUpdate: CascadePolicy    ← required

CascadePolicy = "none" | "cascade" | "restrict" | "setNull"

Resource-local (validateResource / checkRelations):
  closed key sets · policy vocabulary · setNull ⇒ nullable
  equality / snapshot include onDelete + onUpdate

Contract evaluation (explicit entrypoint; NOT inside validateResource):
  evaluateCascadeEvent(resource, event, relationValues)
    for each Relation in schema order:
      policy = event === "delete" ? onDelete : onUpdate
      classify value via RFC-025 taxonomy (null-before-array)
      apply §4 / §7 matrix → restrict err | accumulate cascade/setNull effects
```

**Invariant:** Cascade is Relation-scoped contract propagation. No implementation step may derive cascade from `direction` / `inverse` / `join`, collapse `setNull` into empty/element mutation, require mirrored inverse policies, wire evaluation into `validateResource`, or implement ORM/FK/flush behavior.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-026 Accepted (#92)
       ↓
M3.23 plan Draft → M5 Plan Review → Accepted (#93)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M9 / validation as required
       ↓
one delivery PR for tracking #93 (Accepted plan + implementation together;
RFC-026 Accept docs from #92 MAY land in the same PR)
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M3.23 delivery slice (Accepted plan + implementation). Do **not** open a separate plan-only merge PR as a required gate. M6 treats Accepted RFC text as authoritative.

**Task checkboxes:** Completed during **M6 execution** only.

---

## Locked decisions (export / shape review — planning aids)

| Decision | Lock |
| --- | --- |
| Relation shape | Flat closed widen: required `onDelete` + `onUpdate`; retain RFC-024 members |
| `CascadePolicy` | Exact `"none" \| "cascade" \| "restrict" \| "setNull"` |
| Defaults | **None** — missing policies invalid; `"none"` must be explicit |
| Allowed own-key sets | Eight-member base ± `inverse` ± `join` (four allowed sets) |
| Base keys | `{ name, target, multiplicity, optional, nullable, direction, onDelete, onUpdate }` |
| Legacy six-member (post–RFC-024 base) | Exact `{ name, target, multiplicity, optional, nullable, direction }` → `missing_relation_on_delete` **only** |
| Missing `onUpdate` after `onDelete` present | Exact eight-base-minus-`onUpdate` → `missing_relation_on_update`; other incomplete sets → `invalid_relation_member` |
| Non-legacy missing policies | e.g. base+`inverse` without cascade members → `invalid_relation_member` (not the legacy missing codes) |
| `setNull` ⇒ `nullable` | Declaration-time: if either policy is `"setNull"` and `nullable === false` → `invalid_cascade_set_null_requires_nullable` |
| `setNull` vs `optional` | **`optional` is not a `setNull` gate.** `optional: false` does **not** prohibit `setNull`. `setNull` produces **present(null)** (association-level null), not absence. Sole declaration gate remains `nullable: true`. |
| Equality | Include `onDelete` and `onUpdate` |
| Snapshot | Freeze new members; omit absent optionals only (`inverse`/`join`); always include both policies |
| Inbound vs outbound | **Identical** cascade behavior; do not branch on `direction` |
| Inverse mirrored policies | **Forbidden** to require |
| Call from `validateResource` | Evaluation **Forbidden**; declaration validation remains inside `checkRelations` as today |
| Public evaluation API | **Export** `evaluateCascadeEvent` from `@resource-forge/core` |
| Value map | Reuse `ReadonlyMap<string, RelationRuntimeValue>` (RFC-025 / M3.22); absent = missing key |
| Classification | Null-before-array; empty `many` ≠ absent ≠ association null |
| `setNull` effect | Association-level null intent only — never `[]`, never remove-one-element, never element null |
| Update event | Opaque declared event token `"update"` — no field dirty set parameter |
| Multi-hop / cycles | **Deferred** — one Relation hop only |
| Persistence / load / wire / projection | **Deferred** |
| Amend `checkRelationValueStates` / `checkConstraintValues` | **Forbidden** (orthogonal; may be called by hosts separately) |

### Resource-local error codes (planning lock)

Widen `RelationValidationError` with:

| RFC-026 category | `code` |
| --- | --- |
| Missing onDelete (legacy six-member upgrade) | `missing_relation_on_delete` |
| Missing onUpdate (seven-member: base+onDelete without onUpdate) | `missing_relation_on_update` |
| Invalid onDelete | `invalid_relation_on_delete` (`onDelete: unknown`) |
| Invalid onUpdate | `invalid_relation_on_update` (`onUpdate: unknown`) |
| setNull without nullable | `invalid_cascade_set_null_requires_nullable` |

Retain existing name/target/multiplicity/optional/nullable/direction/inverse/join codes. Continue wrapping under Resource `invalid_schema` as today.

**Declaration validation order (planning lock):** after direction is accepted into the candidate path, require `onDelete` then `onUpdate` (legacy missing codes as above), then `isAllowedRelationKeySet` against the **new** eight-key base ± inverse ± join, then validate policy vocabulary, then enforce `setNull` ⇒ `nullable` (fail if either policy is `setNull` and `nullable` is false). Stop at first failure.

### Evaluation API (planning lock)

```text
CascadeEvent = "delete" | "update"

evaluateCascadeEvent(
  resource: Resource,
  event: CascadeEvent,
  values: ReadonlyMap<string, RelationRuntimeValue>,
): Result<CascadeEffects, CascadeEvaluationError>

CascadeEffects = {
  readonly cascades: ReadonlyArray<{
    readonly relation: RelationName;
    readonly targets: ReadonlyArray<
      RelationSingularAssociation | RelationAssociationElement
    >;
  }>;
  readonly setNulls: ReadonlyArray<{
    readonly relation: RelationName;
  }>;
}

CascadeEvaluationError =
  | {
      readonly code: 'cascade_restricted';
      readonly relation: RelationName;
      readonly event: CascadeEvent;
    }
  | {
      readonly code: 'cascade_relation_value_shape_mismatch';
      readonly relation: RelationName;
      readonly multiplicity: RelationMultiplicity;
    }
```

**Algorithm (locked — RFC-026 §4 / §7):**

```text
effects = { cascades: [], setNulls: [] }

for each Relation R in resource.schema.relations order:
  policy = event === "delete" ? R.onDelete : R.onUpdate
  if policy === "none":
    continue

  // Classify (null-before-array; unknown keys ignored)
  if key R.name missing:
    state = absent
  else if values.get(R.name) === null:
    state = present_null
  else:
    value = values.get(R.name)
    if R.multiplicity === "one":
      if Array.isArray(value) → fail cascade_relation_value_shape_mismatch
      state = present_non_null_one (target = value)
    else: // many
      if !Array.isArray(value) → fail cascade_relation_value_shape_mismatch
      if any element === null → fail cascade_relation_value_shape_mismatch
      state = length === 0 ? present_empty_many : present_non_empty_many (targets = elements)

  switch policy:
    "restrict":
      if state in { present_non_null_one, present_non_empty_many }:
        fail cascade_restricted { relation, event }
      else continue
    "cascade":
      if state === present_non_null_one:
        effects.cascades.push({ relation, targets: [value] })
      else if state === present_non_empty_many:
        effects.cascades.push({ relation, targets: elements })
      else continue  // absent / null / empty → no targets
    "setNull":
      if state in { present_non_null_one, present_empty_many, present_non_empty_many }:
        effects.setNulls.push({ relation })  // association-level null intent
      else continue  // absent / already null → no-op
      // NEVER push empty-collection or per-element intents

return ok(effects)
```

**Null-element lock for evaluation:** For a **non-`none`** policy only, if a `many` array contains any `null` element, fail `cascade_relation_value_shape_mismatch` (do not remove-one-element; do not treat as association null). When policy is `"none"`, evaluation **skips** the Relation and does **not** validate its value state (including null elements). Hosts that want the RFC-025-specific element error should call `checkRelationValueStates` first; this keeps `evaluateCascadeEvent` from becoming a second RFC-025 validator or inventing element-cascade semantics.

**Precondition:** `resource` is declaration-valid. Relation values are assumed RFC-025-valid except where a test intentionally exercises the locked cascade shape-mismatch boundary (non-`none` + `many` with null elements, or one/many shape mismatch). Do **not** re-run `validateResource`, `checkRelationValueStates`, or other defensive declaration/value-state validation inside `evaluateCascadeEvent`. Do not inspect `direction` / `inverse` / `join`.

---

## Constraints (SHALL / SHALL NOT)

### SHALL

1. Require `onDelete` and `onUpdate` on every Relation (RFC-026 §3).
2. Accept only closed `CascadePolicy` strings (RFC-026 §3.2).
3. Reject `setNull` unless `nullable: true` (RFC-026 §4.4 / §5.1) — sole declaration gate; do not use `optional` as an additional gate.
4. Include cascade members in equality and snapshots (RFC-026 §3.3).
5. Evaluate delete/update with presence-symmetric `restrict` (RFC-026 §4.3).
6. Treat `setNull` as association-level null intent (present(null)) for both `one` and `many` (RFC-026 §4.4) — never absence, never `[]`.
7. Apply inbound policies identically to outbound (RFC-026 §5.1 / §8).
8. Bound update to declared event token only (RFC-026 §6).
9. Export `CascadePolicy`, related errors/effects types, and `evaluateCascadeEvent`.
10. Update Relation fixtures across `@resource-forge/core` for the breaking widen.

### SHALL NOT

1. Implement ORM/SQL/FK/flush/transaction semantics.
2. Implement load/fetch, traversal/query engines, or multi-hop cascade graphs.
3. Implement wire/serialization or Relation→metadata projection.
4. Derive cascade from `direction` / `inverse` / `join`.
5. Require mirrored inverse cascade policies.
6. Interpret `setNull` as `[]`, element removal, or element null.
7. Accept omitted policies / invent defaults.
8. Wire `evaluateCascadeEvent` into `validateResource`.
9. Amend RFC-025 value-state checkers or RFC-018 constraint gates.
10. Reopen RFC-024 / M3.21 or RFC-025 / M3.22.
11. Add dirty-tracking parameters to update evaluation.

---

## Package / ownership boundaries

| Area | Role |
| --- | --- |
| `packages/core/src/resource/types.ts` | Add `CascadePolicy`, `CascadeEvent`, `CascadeEffects`, `CascadeEvaluationError`; widen `Relation`; widen `RelationValidationError` |
| `packages/core/src/resource/relations.ts` | Declaration validation, equality, snapshot for cascade members |
| `packages/core/src/resource/relations.test.ts` | Declaration / legacy / setNull⇒nullable / equality TDD |
| `packages/core/src/resource/cascade.ts` (**create**) | `evaluateCascadeEvent` |
| `packages/core/src/resource/cascade.test.ts` (**create**) | Policy × value-state matrix TDD |
| `packages/core/src/resource/relation-value-states.ts` | **Do not modify** behavior (orthogonal) |
| `packages/core/src/resource/validate.ts` | **Do not** call `evaluateCascadeEvent` |
| Fixture sites (`*.test.ts` creating Relations) | Add `onDelete` / `onUpdate` (typically `"none"`) |
| `packages/core/src/index.ts` / `resource/index.ts` | Export new public types + `evaluateCascadeEvent` |
| `packages/core/src/resource/exports.test.ts` | Export smoke |
| `docs/roadmap.md` | RFC-026 Accepted + M3.23 ✅; Later without cascade lead — on delivery commit |
| `docs/superpowers/specs/README.md` | Ensure RFC-026 Accepted indexed — on delivery commit |
| `docs/superpowers/specs/2026-08-09-rfc-026-cascade-semantics-design.md` | Already Accepted; ship with PR |
| `docs/superpowers/plans/2026-08-09-m3-23-cascade-semantics.md` | This plan + SCR at closeout |

---

## Slice sequence

| Slice | Delivers | Prerequisite |
| --- | --- | --- |
| A | Types + `checkRelations` widen + declaration tests + fixture migration | RFC-026 Accepted |
| B | `evaluateCascadeEvent` + cascade matrix tests | A green |
| C | Exports + export smoke | A–B green |
| D | Roadmap / specs index / SCR closeout docs | A–C green |

---

## Contract inventory

| Contract | Action |
| --- | --- |
| Required `onDelete` / `onUpdate` | **Implement** |
| Closed `CascadePolicy` vocabulary | **Implement** |
| `setNull` ⇒ `nullable: true` | **Implement** (declaration) |
| Presence-symmetric `restrict` | **Implement** (evaluation) |
| `cascade` target collection (one hop) | **Implement** (evaluation effects) |
| `setNull` association-null intent | **Implement** (evaluation effects) |
| Inbound = outbound | **Implement** (by non-branching) |
| Declared update event boundary | **Implement** (`CascadeEvent` only) |
| Persistence / load / traversal / wire / projection | **Defer** |
| Multi-hop / cycles / dirty tracking | **Defer** |
| Mirrored inverse cascade | **Defer / forbid requirement** |

---

## TDD / verification strategy

### Declaration (Slice A)

- Exact post–RFC-024 six-member Relation → `missing_relation_on_delete`
- Base + `onDelete` without `onUpdate` → `missing_relation_on_update`
- Invalid policy strings → `invalid_relation_on_delete` / `invalid_relation_on_update`
- `onDelete: "setNull"` + `nullable: false` → `invalid_cascade_set_null_requires_nullable` (same for `onUpdate`)
- `setNull` + `nullable: true` → ok (including `many`)
- **`optional: false` + `nullable: true` + `onDelete`/`onUpdate: "setNull"` → ok** (`optional` is not a `setNull` gate; post-`setNull` is present(null), not absence)
- Allowed key sets: base ± inverse ± join only
- Equality differs when policies differ
- Snapshot freezes both policies
- Existing suites green after fixture migration (`onDelete`/`onUpdate: "none"`)

### Evaluation (Slice B)

**Test precondition:** Evaluation tests provide declaration-valid Resources and RFC-025-valid Relation values except where testing the explicitly locked cascade shape-mismatch boundary. Do not add defensive declaration/value-state validation inside `evaluateCascadeEvent`.

- `none` → empty effects; Relation value is **not** inspected (including `many` with null elements)
- `restrict` + present non-null `one` / non-empty `many` → `cascade_restricted` for both events
- `restrict` + absent / association-null / empty `many` → ok (no block)
- `cascade` + present targets → effects.cascades populated; empty/absent/null → no cascade entry
- `setNull` + present non-null / empty `many` → effects.setNulls; absent/already-null → no-op
- `many` + `setNull` never yields empty-collection semantics in effects (association-level null intent only)
- For a **non-`none`** policy, `many` + `[null, …]` → `cascade_relation_value_shape_mismatch` (no element cascade). With `"none"`, evaluation skips and does not validate that value state.
- Inbound `direction` fixtures produce identical outcomes to outbound for same policies/values
- Unknown map keys ignored
- Fail-fast on first Relation failure
- Does not call `validateResource` / `checkRelationValueStates`

### Exports (Slice C)

- Public: `CascadePolicy`, `CascadeEvent`, `CascadeEffects`, `CascadeEvaluationError`, `evaluateCascadeEvent`, widened Relation types/errors as needed
- Non-export: internal helpers

### Full suite

- `@resource-forge/core` remains green after breaking Relation widen

---

## Task breakdown

### Task 1: Relation cascade declaration floor (Slice A)

**Files:** `types.ts`, `relations.ts`, `relations.test.ts`, other Relation fixtures in `packages/core`

- [x] **Step 1:** Write failing declaration tests (legacy missing, invalid policies, setNull⇒nullable sole gate including `optional: false` + `setNull` ok, equality/snapshot, allowed key sets)
- [x] **Step 2:** Add `CascadePolicy`; widen `Relation` + `RelationValidationError`
- [x] **Step 3:** Update `BASE_RELATION_KEYS` / allowed sets / validation / equality / snapshot
- [x] **Step 4:** Migrate all Relation fixtures to include `onDelete` / `onUpdate`
- [x] **Step 5:** Confirm declaration + existing suites green

### Task 2: `evaluateCascadeEvent` (Slice B)

**Files:** `types.ts`, `cascade.ts`, `cascade.test.ts`

- [x] **Step 1:** Write failing evaluation tests for policy × value-state matrix (both events), inbound parity, setNull≠empty, null-element fail only when policy ≠ `none`, fail-fast — using declaration-valid / RFC-025-valid fixtures except locked shape-mismatch cases
- [x] **Step 2:** Add `CascadeEvent` / `CascadeEffects` / `CascadeEvaluationError`
- [x] **Step 3:** Implement `evaluateCascadeEvent` per locked algorithm (no defensive validateResource / checkRelationValueStates)
- [x] **Step 4:** Confirm cascade tests green; do not wire into `validateResource`

### Task 3: Public exports (Slice C)

**Files:** `resource/index.ts`, `packages/core/src/index.ts`, `exports.test.ts`

- [x] **Step 1:** Export types + `evaluateCascadeEvent`
- [x] **Step 2:** Export smoke tests

### Task 4: Docs closeout (Slice D — with delivery)

**Files:** `docs/roadmap.md`, `docs/superpowers/specs/README.md`, this plan SCR

- [x] **Step 1:** Mark RFC-026 Accepted + M3.23 ✅; Later list drops cascade lead (load / persistence / traversal / Relation projection remain)
- [x] **Step 2:** Ensure specs index lists RFC-026 Accepted
- [x] **Step 3:** Fill Slice Completion Report after M6–M10

---

## Traceability

| Plan item | RFC-026 |
| --- | --- |
| Required paired policies + vocabulary | §3, §3.1–§3.2 |
| Relation shape widen | §3.3 |
| Mode meanings | §4 |
| Presence-symmetric restrict | §4.3 |
| setNull association-null + nullable gate | §4.4, §5.1 |
| Inbound = outbound; no mirrored inverse | §5.1, §8 |
| Update event boundary | §6 |
| Value-state matrix | §7 |
| RFC-024 orthogonality | §8 |
| Invariants | §9 |
| Deferred persistence/load/… | §1.2, §14 |

---

## Risks (operational)

| Risk | Mitigation |
| --- | --- |
| Fixture breakage across core tests | Dedicated migration step; prefer `"none"` defaults in fixtures |
| Accidental ORM-shaped API | Effects are intents only; no SQL/FK types; code review SHALL NOT |
| `setNull` misread as empty | Tests for `many` + setNull → setNulls only; never `[]` |
| Wiring evaluation into validateResource | Explicit SHALL NOT; export/docs review |
| Element-level cascade creep | Null elements fail shape mismatch; no remove-one-element effects |

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.23 Cascade Semantics |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/93 |
| M4 | Plan **Accepted** |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | **Approved** |
| M8 | **N/A** |
| M9 | **Complete** |
| Branch | `feat/m3-23-cascade-semantics` |
| PR | https://github.com/rexescario-dev/resource-forge/pull/94 |
| Status | **Slice complete** |

### M5 Plan Review

```text
Decision: Accepted
Subject (plan): docs/superpowers/plans/2026-08-09-m3-23-cascade-semantics.md
Accepted specification: docs/superpowers/specs/2026-08-09-rfc-026-cascade-semantics-design.md
Delivery goal: Implement RFC-026 Relation cascade declaration + contract-level evaluateCascadeEvent without persistence/load/traversal redesign

Review summary: No plan blockers after three clarifications folded in: optional is not a setNull gate; null-element shape mismatch only for non-none policies; evaluation tests/precondition forbid defensive declaration/value-state validation inside evaluateCascadeEvent. Semantic locks match Accepted RFC-026.

Findings: None (no plan blockers)
Traceability: adequate (coverage + deferrals checked)
Gate: Proceed to M6.
Authority: Plan governs sequencing/execution; specification governs product semantics.
```

### Shipped

- Required Relation `onDelete` / `onUpdate` (`CascadePolicy`) with declaration validation
- `setNull` ⇒ `nullable: true` sole gate; `optional` not a second gate; `many + setNull` → association-null intent
- Public `evaluateCascadeEvent` (presence-symmetric restrict; one-hop cascade/setNull effects; not wired into `validateResource`)
- Inbound = outbound; RFC-024 / RFC-025 untouched
- RFC-026 Accept docs + roadmap M3.1–M3.23 ✅

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (relations cascade declaration 9; cascade evaluation 14; exports 16; full core **338**) via `vitest run` in `@resource-forge/core` |
| Typecheck | **Passed** (`tsc --noEmit` in `@resource-forge/core`) |
| Lint | Skipped |
| Build | Skipped |
| Package validation | Skipped |

### M7 Code Review

```text
Decision: Approved for merge
Subject: feat/m3-23-cascade-semantics (#93)
Accepted plan: docs/superpowers/plans/2026-08-09-m3-23-cascade-semantics.md
Accepted specification: docs/superpowers/specs/2026-08-09-rfc-026-cascade-semantics-design.md

Review summary: Implementation matches Accepted plan Tasks 1–4. Declaration widen + setNull⇒nullable + evaluateCascadeEvent algorithm match RFC-026 locks; none skips value inspection; validateResource / checkRelationValueStates untouched. Verification green (vitest 338 + tsc).

Findings: None (no merge blockers)
Gate: Proceed to M8/M9 as applicable.
```

### M8 Refactoring

```text
Decision: N/A
Reason: No worthwhile behavior-preserving refactor beyond the focused cascade declaration + evaluation modules delivered under TDD.
```

### M9 Documentation

```text
Decision: Accepted
Scope: docs/roadmap.md; docs/superpowers/specs/README.md; RFC-026 Status Accepted; plan SCR
Summary: Roadmap lists RFC-026 Accepted and M3.23 ✅; Later follow-ons are load/persistence/traversal/Relation projection; SCR Slice complete.
```

### M10 Workflow Validation

```text
Decision: Accepted
Subject: installed docs/workflows assets (no prompt edits this slice)
Summary: M2–M10 prompts remain coherent for this delivery; no workflow asset changes required for M3.23 closeout.
```

### Next Gate

**None — slice complete**
