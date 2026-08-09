# M3.24 Loading / Fetch Semantics — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-027. Widen closed Relation with required `fetch` (`FetchPolicy = eager|lazy`). Implement declaration validation (closed vocabulary; no omitted default) and a pure contract-level `checkRelationLoadStates` surface. Do **not** implement persistence/ORM, query/hydration/proxy/batching/caching, runtime traversal/query, wire/serialization, Relation→metadata projection, Field-level fetch, depth/include graphs, or subsequent-load APIs. Do **not** reinterpret RFC-024 `direction` / `inverse` / `join` as fetch inputs. Do **not** reopen RFC-024 / M3.21, RFC-025 / M3.22, or RFC-026 / M3.23. Do **not** collapse **not-loaded** into absent / empty / association-null / present. Do **not** treat `lazy` as `optional` or as “must defer.” Do **not** wire load-state checks into `validateResource`. Do **not** add defensive declaration/value-state/cascade validation inside `checkRelationLoadStates`. **Precondition for `checkRelationLoadStates`:** `resource` is declaration-valid and `states` entries are structurally valid `RelationLoadStateEntry` values — this function does **not** validate declaration shape or loaded value semantics. “Completed owning Resource load” remains a contract claim boundary — do not encode query completion, hydration, or ORM lifecycle. Task 1 MUST assert exact legacy error codes and precedence (eight-member → `missing_relation_fetch`; other incomplete → `invalid_relation_member`; six-member cascade legacy still `missing_relation_on_delete` / `missing_relation_on_update` before fetch).

**Status:** Accepted  
**M5:** Accepted (2026-08-09) — Plan Review; no plan blockers after two clarifications: (1) Task 1 tests MUST assert exact legacy missing-fetch classification and precedence — post–RFC-026 exact 8-member → `missing_relation_fetch`; other incomplete key sets → `invalid_relation_member`; older six-member cascade shape still hits `missing_relation_on_delete` / `missing_relation_on_update` before fetch validation; (2) `checkRelationLoadStates` precondition is prominent — declaration-valid resource + structurally valid `RelationLoadStateEntry` values; no defensive declaration/value-state validation. Traceability complete; RFC-024/025/026 untouched; persistence/traversal/wire deferred. No loadState on Relation/Resource, no third FetchPolicy, no RFC-025↔load converters, no runtime load operation, no optional/nullable/target validation of loaded values, no direction/inverse/cascade branching. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#96](https://github.com/rexescario-dev/resource-forge/issues/96)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-027 Loading / Fetch Semantics (**Accepted**) — fills deferred loading/fetch gap; does not reopen RFC-024 / RFC-025 / RFC-026  
**Depends on:** RFC-011 / RFC-013 / RFC-015 / RFC-024 / RFC-025 / RFC-026 (**Accepted**); RFC-027 (**Accepted**); M3.1–M3.23 shipped  
**Related RFC issue:** [#95](https://github.com/rexescario-dev/resource-forge/issues/95) (RFC-027 Accept docs; not this delivery slice’s sole packaging identity)  
**Package:** `@resource-forge/core`  
**Slice:** M3.24 only — Relation fetch declaration floor + contract-level load-state checking

**Goal:** Implement RFC-027 so every Relation declares required `fetch: "eager" | "lazy"`, declaration validation enforces the closed vocabulary with no omitted default, and callers can check Relation loading states after a claimed completed owning Resource load (`eager` ⇒ loaded; `lazy` ⇒ not-loaded or loaded)—without inventing persistence, traversal, wire, or collapsing not-loaded into RFC-025 value states.

**Architecture:**

```text
Relation (closed widen)
├── … RFC-026 floor …
└── fetch: FetchPolicy          ← required

FetchPolicy = "eager" | "lazy"

Resource-local (validateResource / checkRelations):
  closed key sets · fetch vocabulary
  equality / snapshot include fetch

Contract load-state check (explicit entrypoint; NOT inside validateResource):
  checkRelationLoadStates(resource, states)
    for each Relation in schema order:
      entry = states.get(name)   // missing → missing_relation_load_state
      if fetch === "eager" && entry.status === "not-loaded"
        → eager_relation_not_loaded
      if fetch === "lazy"
        → not-loaded or loaded both ok
      // do NOT classify loaded values via RFC-025 here
```

**Invariant:** Not-loaded is a loading state, not a Resource value state. No implementation step may collapse not-loaded into absent/empty/association-null/present, derive fetch from `direction` / `inverse` / `join`, treat `lazy` as `optional`, wire load checks into `validateResource`, or implement ORM/query/hydration behavior.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-027 Accepted (#95)
       ↓
M3.24 plan Draft → M5 Plan Review → Accepted (#96)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M9 / validation as required
       ↓
one delivery PR for tracking #96 (Accepted plan + implementation together;
RFC-027 Accept docs from #95 MAY land in the same PR)
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M3.24 delivery slice (Accepted plan + implementation). Do **not** open a separate plan-only merge PR as a required gate. M6 treats Accepted RFC text as authoritative.

**Task checkboxes:** Completed during **M6 execution** only.

---

## Locked decisions (export / shape review — planning aids)

| Decision | Lock |
| --- | --- |
| Relation shape | Flat closed widen: required `fetch`; retain RFC-026 members |
| `FetchPolicy` | Exact `"eager" \| "lazy"` |
| Defaults | **None** — missing `fetch` invalid; no inferred eager/lazy |
| Allowed own-key sets | Nine-member base ± `inverse` ± `join` (four allowed sets) |
| Base keys | `{ name, target, multiplicity, optional, nullable, direction, onDelete, onUpdate, fetch }` |
| Legacy eight-member (post–RFC-026 base) | Exact `{ name, target, multiplicity, optional, nullable, direction, onDelete, onUpdate }` → `missing_relation_fetch` **only** |
| Legacy six-member / missing cascade | Unchanged cascade legacy codes first (`missing_relation_on_delete` / `missing_relation_on_update`) before fetch checks |
| Non-legacy missing `fetch` | e.g. base+`inverse` without `fetch` → `invalid_relation_member` (not the legacy missing code) |
| Equality | Include `fetch` |
| Snapshot | Freeze `fetch`; omit absent optionals only (`inverse`/`join`); always include `fetch` |
| Inbound vs outbound | **Identical** fetch/load-state behavior; do not branch on `direction` |
| Inverse mirrored fetch | **Forbidden** to require |
| Call from `validateResource` | Load-state check **Forbidden**; declaration validation remains inside `checkRelations` as today |
| Public load-state API | **Export** `checkRelationLoadStates` from `@resource-forge/core` |
| Load-state map entry | Discriminated union (below) — **not** missing-key-as-not-loaded (missing key ≠ not-loaded; missing key ≠ absent) |
| Classify loaded values | **Forbidden** inside `checkRelationLoadStates` — hosts call `checkRelationValueStates` separately when loaded |
| Amend `checkRelationValueStates` / `evaluateCascadeEvent` / `checkConstraintValues` | **Forbidden** (orthogonal) |
| Persistence / query / hydration / traversal / wire / projection | **Deferred** |
| Field-level fetch / depth hints / third policy | **Forbidden** in this slice |

### Resource-local error codes (planning lock)

Widen `RelationValidationError` with:

| RFC-027 category | `code` |
| --- | --- |
| Missing fetch (legacy eight-member upgrade) | `missing_relation_fetch` |
| Invalid fetch | `invalid_relation_fetch` (`fetch: unknown`) |

Retain existing name/target/multiplicity/optional/nullable/direction/inverse/join/cascade codes. Continue wrapping under Resource `invalid_schema` as today.

**Declaration validation order (planning lock):** after `onDelete` / `onUpdate` are accepted into the candidate path (existing cascade legacy missing codes unchanged), require `fetch` (legacy eight-member → `missing_relation_fetch`; other incomplete sets → `invalid_relation_member`), then `isAllowedRelationKeySet` against the **new** nine-key base ± inverse ± join, then validate fetch vocabulary. Stop at first failure.

### Load-state API (planning lock)

```text
FetchPolicy = "eager" | "lazy"

RelationLoadStateEntry =
  | { readonly status: "not-loaded" }
  | { readonly status: "loaded"; readonly value: RelationRuntimeValue }

checkRelationLoadStates(
  resource: Resource,
  states: ReadonlyMap<string, RelationLoadStateEntry>,
): Result<void, RelationLoadStateError>

RelationLoadStateError =
  | {
      readonly code: "missing_relation_load_state";
      readonly relation: RelationName;
    }
  | {
      readonly code: "eager_relation_not_loaded";
      readonly relation: RelationName;
    }
```

**Algorithm (locked — RFC-027 §4 / §5):**

```text
// Precondition: resource is declaration-valid.
// Caller claims a completed owning Resource load (contract claim; not a mechanism).

for each Relation R in resource.schema.relations order:
  entry = states.get(R.name)
  if entry === undefined:
    fail missing_relation_load_state { relation: R.name }

  if R.fetch === "eager":
    if entry.status === "not-loaded":
      fail eager_relation_not_loaded { relation: R.name }
    // status === "loaded" → ok for load check
    // do NOT inspect entry.value (no RFC-025 classification here)
    continue

  // R.fetch === "lazy"
  // status === "not-loaded" OR "loaded" → ok
  // do NOT inspect entry.value
  continue

return ok(undefined)
```

**Not-loaded representation lock:** `status: "not-loaded"` is the **only** not-loaded encoding for this API. Implementations MUST NOT treat a missing map key as not-loaded, absent, empty, or association-null. Missing key is solely `missing_relation_load_state` for a schema Relation under a claimed completed load.

**Loaded value lock:** When `status: "loaded"`, `value` is carried for host convenience / later RFC-025 checks but **MUST NOT** be classified or validated inside `checkRelationLoadStates`. Shape/null/empty/absent rules remain owned by `checkRelationValueStates`.

**Unknown map keys:** Ignored.

**Fail-fast:** Stop at the first Relation failure in schema order.

**Precondition (M5 lock — prominent):** `resource` is declaration-valid and `states` entries are structurally valid `RelationLoadStateEntry` values. This function does **not** validate either declaration shape or loaded value semantics. Do **not** re-run `validateResource`, `checkRelationValueStates`, or `evaluateCascadeEvent` inside `checkRelationLoadStates`. Do not inspect `direction` / `inverse` / `join` / cascade policies. Do not validate that `loaded.value` satisfies `optional` / `nullable`, matches multiplicity shape, or is associated with `target`.

**“Completed owning Resource load”:** Remains the RFC-027 contract claim. This API evaluates load-state outcomes under that claim; it does **not** define how hosts establish completion.

---

## Constraints (SHALL / SHALL NOT)

### SHALL

1. Require `fetch` on every Relation (RFC-027 §3).
2. Accept only closed `FetchPolicy` strings `"eager"` / `"lazy"` (RFC-027 §3.2).
3. Include `fetch` in equality and snapshots (RFC-027 §3.3).
4. After claimed completed owning Resource load: `eager` ⇒ loaded only; `lazy` ⇒ not-loaded or loaded (RFC-027 §4 / §5.4).
5. Treat not-loaded as a loading state never collapsed into RFC-025 value states (RFC-027 §5.2).
6. Apply inbound fetch/load-state rules identically to outbound (RFC-027 §6.1 / §7).
7. Export `FetchPolicy`, load-state entry/error types, and `checkRelationLoadStates`.
8. Update Relation fixtures across `@resource-forge/core` for the breaking widen.

### SHALL NOT

1. Implement ORM/SQL/query/hydration/proxy/batching/caching semantics.
2. Implement runtime traversal/query engines or subsequent-load APIs.
3. Implement wire/serialization or Relation→metadata projection.
4. Derive fetch from `direction` / `inverse` / `join`.
5. Require mirrored inverse fetch policies.
6. Collapse not-loaded into absent / empty / association-null / present.
7. Treat `lazy` as `optional` or as mandatory deferral.
8. Accept omitted `fetch` / invent defaults.
9. Wire `checkRelationLoadStates` into `validateResource`.
10. Amend RFC-025 value-state checkers, RFC-026 cascade evaluation, or RFC-018 constraint gates.
11. Reopen RFC-024 / M3.21, RFC-025 / M3.22, or RFC-026 / M3.23.
12. Add Field-level fetch, depth hints, or a third fetch policy.
13. Encode query-completion / hydration / ORM lifecycle as product semantics.

---

## Package / ownership boundaries

| Area | Role |
| --- | --- |
| `packages/core/src/resource/types.ts` | Add `FetchPolicy`, `RelationLoadStateEntry`, `RelationLoadStateError`; widen `Relation`; widen `RelationValidationError` |
| `packages/core/src/resource/relations.ts` | Declaration validation, equality, snapshot for `fetch` |
| `packages/core/src/resource/relations.test.ts` | Declaration / legacy missing fetch / vocabulary / equality TDD |
| `packages/core/src/resource/load-states.ts` (**create**) | `checkRelationLoadStates` |
| `packages/core/src/resource/load-states.test.ts` (**create**) | Policy × loading-state matrix TDD |
| `packages/core/src/resource/relation-value-states.ts` | **Do not modify** behavior (orthogonal) |
| `packages/core/src/resource/cascade.ts` | **Do not modify** behavior (orthogonal; remains unwired) |
| `packages/core/src/resource/validate.ts` | **Do not** call `checkRelationLoadStates` |
| Fixture sites (`*.test.ts` creating Relations) | Add `fetch` (typically `"eager"` or `"lazy"` as fixture needs; prefer `"eager"` unless testing lazy) |
| `packages/core/src/index.ts` / `resource/index.ts` | Export new public types + `checkRelationLoadStates` |
| `packages/core/src/resource/exports.test.ts` | Export smoke |
| `docs/roadmap.md` | RFC-027 Accepted + M3.24 ✅; Later without load lead — on delivery commit |
| `docs/superpowers/specs/README.md` | Ensure RFC-027 Accepted indexed — on delivery commit |
| `docs/superpowers/specs/2026-08-09-rfc-027-loading-fetch-semantics-design.md` | Already Accepted; ship with PR |
| `docs/superpowers/plans/2026-08-09-m3-24-loading-fetch-semantics.md` | This plan + SCR at closeout |

---

## Slice sequence

| Slice | Delivers | Prerequisite |
| --- | --- | --- |
| A | Types + `checkRelations` widen + declaration tests + fixture migration | RFC-027 Accepted |
| B | `checkRelationLoadStates` + load-state matrix tests | A green |
| C | Exports + export smoke | A–B green |
| D | Roadmap / specs index / SCR closeout docs | A–C green |

---

## Contract inventory

| Contract | Action |
| --- | --- |
| Required `fetch` | **Implement** |
| Closed `FetchPolicy` vocabulary | **Implement** |
| Not-loaded loading state (≠ value state) | **Implement** (load-state API) |
| Eager ⇒ loaded after completed owning load | **Implement** (load-state API) |
| Lazy permits not-loaded | **Implement** (load-state API) |
| Inbound = outbound | **Implement** (by non-branching) |
| Persistence / query / hydration / traversal / wire / projection | **Defer** |
| Subsequent-load APIs for lazy | **Defer** |
| Mirrored inverse fetch | **Defer / forbid requirement** |
| Field-level fetch / third policy | **Forbid** |

---

## TDD / verification strategy

### Declaration (Slice A)

**Exact error + precedence (M5 lock):** Task 1 tests MUST assert the specific `code` (and must not accept a generic failure):

| Candidate shape | Exact expected `code` |
| --- | --- |
| Exact post–RFC-026 eight-member (no `fetch`) | `missing_relation_fetch` |
| Exact RFC-024 six-member (no cascade/fetch) | `missing_relation_on_delete` (before fetch) |
| Exact seven-member: six + `onDelete` only | `missing_relation_on_update` (before fetch) |
| Incomplete non-legacy (e.g. eight-base + `inverse`, no `fetch`) | `invalid_relation_member` (**not** `missing_relation_fetch`) |
| Invalid fetch string on otherwise valid nine-base | `invalid_relation_fetch` |

Also:

- Allowed key sets: nine-base ± inverse ± join only
- Equality differs when `fetch` differs
- Snapshot freezes `fetch`
- Existing suites green after fixture migration (add `fetch`)

### Load-state check (Slice B)

**Test precondition / API precondition (M5 lock):** `resource` is declaration-valid and `states` entries are structurally valid `RelationLoadStateEntry` values. This function does **not** validate declaration shape or loaded value semantics. Do not add defensive declaration/value-state/cascade validation inside `checkRelationLoadStates`.

- Missing map entry for a schema Relation → `missing_relation_load_state`
- `eager` + `not-loaded` → `eager_relation_not_loaded`
- `eager` + `loaded` (any carried value, including values that would fail RFC-025) → ok for **this** API (value not inspected)
- `lazy` + `not-loaded` → ok
- `lazy` + `loaded` → ok
- Not-loaded MUST NOT be interchangeable with missing key / absent / `null` / `[]` encodings in this API
- Inbound `direction` fixtures produce identical outcomes to outbound for same fetch/states
- Unknown map keys ignored
- Fail-fast on first Relation failure
- Does not call `validateResource` / `checkRelationValueStates` / `evaluateCascadeEvent`

### Exports (Slice C)

- Public: `FetchPolicy`, `RelationLoadStateEntry`, `RelationLoadStateError`, `checkRelationLoadStates`, widened Relation types/errors as needed
- Non-export: internal helpers

### Full suite

- `@resource-forge/core` remains green after breaking Relation widen

---

## Task breakdown

### Task 1: Relation fetch declaration floor (Slice A)

**Files:** `types.ts`, `relations.ts`, `relations.test.ts`, other Relation fixtures in `packages/core`

- [x] **Step 1:** Write failing declaration tests that assert **exact** error codes and precedence (M5 lock table above): eight-member → `missing_relation_fetch`; six-member → `missing_relation_on_delete`; seven-member → `missing_relation_on_update`; eight+`inverse` without fetch → `invalid_relation_member`; invalid fetch string → `invalid_relation_fetch`; plus equality/snapshot/allowed key sets
- [x] **Step 2:** Add `FetchPolicy`; widen `Relation` + `RelationValidationError`
- [x] **Step 3:** Update `BASE_RELATION_KEYS` / allowed sets / validation / equality / snapshot
- [x] **Step 4:** Migrate all Relation fixtures to include `fetch`
- [x] **Step 5:** Confirm declaration + existing suites green

### Task 2: `checkRelationLoadStates` (Slice B)

**Files:** `types.ts`, `load-states.ts`, `load-states.test.ts`

**Precondition (M5 lock):** `resource` is declaration-valid and `states` entries are structurally valid `RelationLoadStateEntry` values. This function does **not** validate either declaration shape or loaded value semantics.

- [x] **Step 1:** Write failing load-state tests for fetch × loading-state matrix, missing entry, inbound parity, fail-fast, no value inspection — using declaration-valid fixtures
- [x] **Step 2:** Add `RelationLoadStateEntry` / `RelationLoadStateError`
- [x] **Step 3:** Implement `checkRelationLoadStates` per locked algorithm (no defensive validateResource / value-state / cascade; do not validate optional/nullable/target of `loaded.value`)
- [x] **Step 4:** Confirm load-state tests green; do not wire into `validateResource`

### Task 3: Public exports (Slice C)

**Files:** `resource/index.ts`, `packages/core/src/index.ts`, `exports.test.ts`

- [x] **Step 1:** Export types + `checkRelationLoadStates`
- [x] **Step 2:** Export smoke tests

### Task 4: Docs closeout (Slice D — with delivery)

**Files:** `docs/roadmap.md`, `docs/superpowers/specs/README.md`, this plan SCR

- [x] **Step 1:** Mark RFC-027 Accepted + M3.24 ✅; Later list drops load lead (persistence / traversal / Relation projection remain)
- [x] **Step 2:** Ensure specs index lists RFC-027 Accepted
- [x] **Step 3:** Fill Slice Completion Report after M6–M10

---

## Traceability

| Plan item | RFC-027 |
| --- | --- |
| Required `fetch` + vocabulary | §3, §3.1–§3.2 |
| Relation shape widen | §3.3 |
| Eager / lazy meanings | §4 |
| Not-loaded loading state + forbidden collapses | §5.1–§5.2 |
| Layering with RFC-025 when loaded | §5.3 |
| Policy × loading-state matrix | §5.4 |
| Inbound = outbound; no mirrored inverse | §6.1, §7 |
| Cascade separation / unwired | §8 |
| Invariants | §9 |
| Deferred persistence/traversal/… | §1.2, §14 |
| Completed owning Resource load boundary | §2, §4.1 |

---

## Risks (operational)

| Risk | Mitigation |
| --- | --- |
| Fixture breakage across core tests | Dedicated migration step; prefer `"eager"` in ordinary fixtures |
| Missing key confused with not-loaded/absent | Discriminated `status: "not-loaded"` only; missing → dedicated error |
| Accidental RFC-025 re-check inside load API | Explicit SHALL NOT; tests with loaded+invalid value still ok for load API |
| Accidental ORM/hydration API | No query/proxy types; code review SHALL NOT |
| Wiring into validateResource | Explicit SHALL NOT; export/docs review |
| Weakening eager to SHOULD / forcing lazy deferral | Keep asymmetric MUST/MAY matrix; M5/M7 check |

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.24 Loading / Fetch Semantics |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/96 |
| M4 | Plan **Accepted** |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | — |
| M8 | — |
| M9 | — |
| Branch | `feat/m3-24-loading-fetch` |
| PR | — |
| Status | **Ready for M7** |

### M5 Plan Review

```text
Decision: Accepted
Subject (plan): docs/superpowers/plans/2026-08-09-m3-24-loading-fetch-semantics.md
Accepted specification: docs/superpowers/specs/2026-08-09-rfc-027-loading-fetch-semantics-design.md
Delivery goal: Implement RFC-027 Relation fetch declaration + contract-level checkRelationLoadStates without persistence/traversal/wire redesign

Review summary: No plan blockers after two clarifications folded in: (1) Task 1 exact legacy error codes and precedence (8-member → missing_relation_fetch; other incomplete → invalid_relation_member; cascade six/seven-member legacy unchanged before fetch); (2) checkRelationLoadStates precondition prominent — declaration-valid resource + structurally valid RelationLoadStateEntry; no defensive declaration/value-state validation. Semantic locks match Accepted RFC-027; no loadState property, third policy, RFC-025 converters, runtime load ops, or cascade/direction branching.

Findings: None (no plan blockers)
Traceability: adequate (coverage + deferrals checked)
Gate: Proceed to M6.
Authority: Plan governs sequencing/execution; specification governs product semantics.
```

### Shipped

- Required Relation `fetch` (`FetchPolicy = eager|lazy`) with declaration validation (exact legacy precedence)
- Public `checkRelationLoadStates` (eager MUST loaded; lazy MAY not-loaded; missing key ≠ not-loaded; loaded values opaque)
- Inbound = outbound; RFC-024 / RFC-025 / RFC-026 untouched; cascade remains unwired
- RFC-027 Accept docs + roadmap M3.1–M3.24 ✅

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (relations fetch declaration 8; load-states 8; exports 17; full core **355**) via `vitest run` in `@resource-forge/core` |
| Typecheck | **Passed** (`tsc --noEmit` in `@resource-forge/core`) |
| Lint | Skipped |
| Build | Skipped |
| Package validation | Skipped |

### Next Gate

**M7 Code Review**
