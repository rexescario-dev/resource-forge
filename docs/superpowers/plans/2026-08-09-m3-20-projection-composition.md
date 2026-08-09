# M3.20 Projection Composition — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-023. Reframe `projectResourceMetadata` entry assembly as RFC-023 composition with the sole concrete **`annotations`** source (RFC-006 direct 1:1 retained). Do **not** authorize or implement Field / Relation / Operation → metadata emission. Do **not** add precedence, last/first-wins, deep-equality deduplication, value merge, or silent drop. Do **not** implement composition by calling RFC-004 `composeResourceMetadata` (different contract / ownership grain). Do **not** reopen RFC-022 / M3.19 vocabulary or member floors. Equal `JsonValue`s still collide on the same `MetadataKey`. Compose helper returns `ProjectionCompositionError` only; `projectResourceMetadata` maps 1:1 to `ResourceProjectionError`. Reuse `metadataKeysEqual`. No third within-contribution duplicate error code.

**Status:** Accepted  
**M5:** Accepted (2026-08-09) — Plan Review after return revision; no plan blockers. Internal `ProjectionCompositionError` vs public `ResourceProjectionError` ownership locked (helper must not return the public type). Within-contribution uniqueness treated as input invariant (no third error code). Collision detection reuses `metadataKeysEqual`. Three-way collision test locks `sources` to colliding contributors only. Composition operator, public API boundary, annotations-only wiring, and task decomposition unchanged. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#84](https://github.com/rexescario-dev/resource-forge/issues/84)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-023 Richer Projection — Composition Semantics (**Accepted**) — amends RFC-005 projection composition/collision gap; amends RFC-006 by classifying annotation projection as the `annotations` source  
**Depends on:** RFC-002 (**Accepted**, `MetadataKey` / `JsonValue` / unordered unique entries); RFC-005 (**Accepted**, `projectResourceMetadata`); RFC-006 (**Accepted**, annotations contribution); RFC-022 (**Accepted**, `rf` adoption on annotations source); RFC-023 (**Accepted**); M3.1–M3.19 shipped  
**Related RFC issue:** [#83](https://github.com/rexescario-dev/resource-forge/issues/83) (RFC-023 Accept docs; not this delivery slice’s sole packaging identity)  
**Package:** `@resource-forge/core`  
**Slice:** M3.20 only — projection composition contract (disjoint union; hard `MetadataKey` collision; annotations sole concrete source; no new emitters)

**Goal:** Implement RFC-023 so `projectResourceMetadata` assembles metadata entries by composing projection contributions under hard cross-source `MetadataKey` collision failure, while today’s annotations-only successful projection floor remains behaviorally preserved—and without expanding which Resource constructs emit metadata.

**Architecture:**

```text
Resource
   │
   ▼
validateResource                    ← unchanged precondition
   │
   ▼
annotations contribution            ← RFC-006 direct 1:1 Mapping (sole concrete source)
   │
   ▼
composeProjectionContributions      ← NEW pure composition (RFC-023 §4)
   │  unordered set of { sourceId, entries }
   │  fail: duplicate ProjectionSource identity
   │  fail: same MetadataKey from ≥2 sources (values ignored)
   │  ok:   disjoint union → MetadataEntry[]
   │
   ▼
createResourceMetadata(identity, entries)
   │
   ▼
ResourceMetadata
```

**Invariant:** No implementation step may accept cross-source key collisions (including deep-equal values), invent precedence/merge/silent-drop, emit Field/Relation/Operation metadata, route Resource projection through RFC-004 namespace-partition composition, or remove the annotations source from `projectResourceMetadata`.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-023 Accepted (#83)
       ↓
M3.20 plan Draft → M5 Plan Review → Accepted (#84)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M9 / validation as required
       ↓
one delivery PR for tracking #84 (Accepted plan + implementation together)
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M3.20 delivery slice (Accepted plan + implementation). Do **not** open a separate plan-only merge PR as a required gate. RFC-023 Accept documentation for [#83](https://github.com/rexescario-dev/resource-forge/issues/83) MAY land in a separate docs PR; M6 treats Accepted RFC text as authoritative.

**Task checkboxes:** Completed during **M6 execution** only.

---

## Locked decisions (export / shape review — planning aids)

| Decision | Lock |
| --- | --- |
| Composition operator | **Disjoint union** of contributions only |
| Cross-source collision | Same `MetadataKey` (RFC-002 equality) from ≥2 sources → **hard failure** |
| Equal values | Still collide (no deep-equality collapse) |
| Precedence / ranking | **Forbidden** |
| Last/first-wins | **Forbidden** |
| Value merge / overlay | **Forbidden** |
| Silent drop | **Forbidden** |
| Concrete sources today | Exactly `{ annotations }` |
| Annotations contribution | RFC-006 direct 1:1 exact preservation; empty → empty contribution |
| New emitters | **None** in this slice |
| RFC-004 `composeResourceMetadata` | **Must not** be used to implement Resource projection composition |
| Abstract zero contributions | Valid for the pure compose helper (empty entry list); `projectResourceMetadata` always supplies `annotations` |
| Duplicate source identity | Composition-input error, **distinct** from `MetadataKey` collision |
| Public API | Keep `projectResourceMetadata` as the public Resource projection entry. Composition helper MAY stay package-internal (relative imports from tests) — **do not** add a second public projection API unless M5 explicitly requires export for verification. Planning default: **internal module**, not re-exported from `packages/core/src/index.ts` |
| Error ownership | **Two layers:** compose returns internal `ProjectionCompositionError` only; `projectResourceMetadata` maps 1:1 into public `ResourceProjectionError`. The helper MUST NOT return `ResourceProjectionError` |

### Composition error codes (planning lock)

```text
composeProjectionContributions(
  contributions
): Result<MetadataEntry[], ProjectionCompositionError>

ProjectionCompositionError:
  | { code: 'duplicate_projection_source'; sourceId: string }
  | { code: 'projection_key_collision'; key: MetadataKey; sources: readonly string[] }

projectResourceMetadata:
  ProjectionCompositionError → ResourceProjectionError   (1:1 code/fields mapping)
```

| RFC-023 category | `code` (shared by both layers) |
| --- | --- |
| Duplicate `ProjectionSource` identity in one composition input | `duplicate_projection_source` (`sourceId: string`) |
| Cross-source `MetadataKey` collision | `projection_key_collision` (`key: MetadataKey`, `sources: readonly string[]` — contributors of the colliding key only; order of `sources` non-normative) |

Public boundary: widen `ResourceProjectionError` with the same two arms so callers of `projectResourceMetadata` observe composition failures. That widening is the **boundary mapping**, not the helper’s type.

Do **not** collapse these into `invalid_metadata` without a composition discriminant—M6 tests and M5 review need stable codes. Do **not** add a third normative/public error category in this slice.

Existing public codes remain: `invalid_resource`, `invalid_metadata`.

### Contribution / source representation (planning lock)

Internal (non-normative shapes OK if behavior matches RFC-023):

```text
ProjectionSourceId = non-empty string identity
  reserved concrete id: "annotations"

ProjectionContribution = {
  sourceId: ProjectionSourceId
  entries: ReadonlyArray<MetadataEntry>   // unordered unique-entry representation
}

composeProjectionContributions(contributions):
  Result<MetadataEntry[], ProjectionCompositionError>
```

The helper receives `ProjectionContribution.entries` as an unordered mapping / unique-entry representation. **Within-contribution uniqueness is therefore an input invariant.** Within-contribution uniqueness for the annotations path remains RFC-006’s job (already validated on the Resource). Defensive detection of malformed duplicate keys inside one contribution MAY be implemented as an internal assertion/guard, but this slice does **not** define a new public or normative error category for malformed contribution construction. Do **not** invent a third composition error code for within-contribution duplicates.

---

## Constraints (SHALL / SHALL NOT)

### SHALL

1. Assemble `projectResourceMetadata` entries via RFC-023 composition with the `annotations` source contributing RFC-006 direct 1:1 entries (RFC-023 §3.3, §4).
2. Fail composition on cross-source `MetadataKey` collision even when values are deeply equal (RFC-023 §4.2–§4.3).
3. Fail composition on duplicate `ProjectionSource` identity as a distinct input error (RFC-023 §3.1).
4. On success, emit the disjoint union with exact key/value preservation (no normalization) (RFC-023 §4.4).
5. Keep evaluation order semantically irrelevant for success/failure classification and successful results (RFC-023 §4.6).
6. Preserve today’s successful annotations-only projection floor (empty and non-empty) (RFC-023 §4.7).
7. Keep Resource validation as a precondition; composition failures distinct from invalid Resource / structural metadata failures (RFC-023 §4.1).
8. Keep Field / Relation / Operation non-participation (no new emitters) (RFC-023 §3.4, §1.2).
9. Keep annotation vocabulary enforcement on the annotations source (RFC-022) unchanged.
10. Keep packages’ existing green suites for annotations / validate / project / metadata / extension compose (regression).

### SHALL NOT

1. Implement Field → metadata, Relation → metadata, or Operation → metadata emission.
2. Add precedence, ranking, last/first-wins, deep-equality deduplication, value merge, or silent drop.
3. Implement Resource projection composition by calling `composeResourceMetadata` (RFC-004).
4. Remove or bypass the `annotations` source in `projectResourceMetadata`.
5. Change RFC-006 within-annotation uniqueness / exact-preservation contribution rules.
6. Amend RFC-022 catalog or add annotation vocabulary keys.
7. Implement direction/joins or empty-vs-absent / null-element semantics.
8. Reinterpret colliding equal values as success.
9. Expose composition as a required public product API in this slice (internal helper is enough unless M5 requires export).
10. Reopen M3.19 / member floors.

---

## Package / ownership boundaries

| Area | Role |
| --- | --- |
| `packages/core/src/resource/types.ts` | Widen public `ResourceProjectionError` with composition arms (boundary mapping) |
| `packages/core/src/resource/projection-compose.ts` (**create**) | Pure compose helper + internal `ProjectionCompositionError` (file-layout decision) |
| `packages/core/src/resource/projection-compose.test.ts` (**create**) | Multi-source / collision / duplicate-source / order-independence TDD |
| `packages/core/src/resource/project.ts` | Wire validate → annotations contribution → compose → `createResourceMetadata` |
| `packages/core/src/resource/project.test.ts` | Single-source floor regressions + projection error mapping for composition (if reachable) |
| `packages/core/src/resource/exports.test.ts` | Optional smoke that new projection error codes exist on the public `ResourceProjectionError` union |
| `packages/core/src/extension/**` | **Untouched** (RFC-004 compose remains separate) |
| `packages/core/src/metadata/**` | Untouched except reuse of `createResourceMetadata` / entry types |
| `packages/core/src/resource/annotations.ts` | Untouched except read-only reuse of validated annotation entries |
| `packages/core/src/index.ts` / `resource/index.ts` | Export widened `ResourceProjectionError` only (already exported); do **not** export compose helper by default |
| `docs/roadmap.md` | M3.20 ✅ on final delivery commit only |

Planning note: placing compose in `projection-compose.ts` (rather than inlining in `project.ts`) is a **file-layout** decision so multi-source collision can be tested without inventing Resource emitters.

---

## Slice sequence

| Slice | Delivers | Prerequisite |
| --- | --- | --- |
| A | Types + pure `composeProjectionContributions` + unit tests (incl. synthetic multi-source collisions) | None (RFC-023 Accepted) |
| B | Wire `projectResourceMetadata` through compose with `{ annotations }`; project suite regressions | Slice A |
| C | Export smoke (error union) / roadmap / SCR closeout docs | A+B green |

---

## Contract inventory

| Contract | Action |
| --- | --- |
| Abstract projection source / contribution | **Implement** (internal shapes) |
| Disjoint-union composition | **Implement** |
| Hard `MetadataKey` collision (incl. equal values) | **Implement** |
| Duplicate source-identity input error | **Implement** |
| Order-independent success | **Implement** / test |
| Annotations as sole concrete source in `projectResourceMetadata` | **Implement** |
| Annotations direct 1:1 contribution | **Retain** |
| Field/Relation/Operation emission | **Defer** |
| Precedence / merge / dedup | **Defer** (explicitly forbidden, not “later soft merge”) |
| Direction / joins; empty-vs-absent | **Defer** |
| Public compose API | **Defer** (internal unless M5 requires) |

---

## TDD / verification strategy

### Compose helper (Slice A) — synthetic contributions

- **Empty set:** zero contributions → ok, `[]` entries (abstract; RFC-023 §4.7.4).
- **Single empty contribution:** `{ annotations, [] }` → ok, `[]`.
- **Single non-empty:** annotations-like entries preserved exactly.
- **Disjoint multi-source:** two synthetic sources with different keys → union of both (exact values).
- **Collision unequal values:** same key, different values → `projection_key_collision`.
- **Collision equal values:** same key, deep-equal values → `projection_key_collision` (critical lock).
- **Duplicate source id:** two contributions with `sourceId: "annotations"` → `duplicate_projection_source` (not key collision).
- **Order independence:** same two disjoint contributions fed in opposite array orders → semantically equal entry sets (compare as unordered by key).
- **Three-way collision:** three sources where only two share a key; non-colliding third source must not appear in `sources`. Example lock:

```text
A: (rf, description) → "x"
B: (rf, description) → "y"
C: (rf, label)       → "z"     // illustrative synthetic key; not an emitter authorization

→ projection_key_collision
   key = (rf, description)
   sources = {"A", "B"}          // MUST NOT be {"A","B","C"}
```

### `projectResourceMetadata` (Slice B)

- Minimal Resource (empty annotations) still projects successfully with `entries: []`.
- Non-empty annotations still project exact 1:1 (existing cases remain green).
- Invalid Resource still fails with `invalid_resource` (composition not attempted / not blamed).
- No Field/Relation/Operation-derived keys appear.
- Extension `composeResourceMetadata` suite remains green and untouched.

### Commands

- `pnpm exec vitest run --pool=threads --maxWorkers=1 --minWorkers=1` on `projection-compose.test.ts`, `project.test.ts`, and related suites as needed
- `pnpm exec tsc --noEmit` in `@resource-forge/core`
- Lint/build: skipped unless already required by repo norms for the slice

---

## Task breakdown

### Task 1 — Public boundary types (Slice A)

**Files:** `packages/core/src/resource/types.ts`

- [x] **Step 1:** Widen public `ResourceProjectionError` with the boundary-mapping arms (same codes/fields as `ProjectionCompositionError`):
  - `{ code: 'duplicate_projection_source'; sourceId: string }`
  - `{ code: 'projection_key_collision'; key: MetadataKey; sources: readonly string[] }`
- [x] **Step 2:** Confirm existing `projectResourceMetadata` / export type references still typecheck
- [x] **Step 3:** Do **not** define `ProjectionCompositionError` here unless colocating is clearer—prefer declaring the internal helper error type next to the compose helper (Task 2). Public widening is boundary mapping only.

**Trace:** RFC-023 §3.1, §4.2–§4.3

### Task 2 — Pure composition helper (Slice A)

**Files:** create `packages/core/src/resource/projection-compose.ts`, `projection-compose.test.ts`

- [x] **Step 1 (TDD):** Failing tests for the compose matrix in “TDD / verification strategy” (empty set; single source; disjoint multi-source; equal-value collision; unequal-value collision; duplicate source id; order independence; three-way collision with `sources = {"A","B"}` only)
- [x] **Step 2:** Implement `composeProjectionContributions` as a pure function returning `Result<MetadataEntry[], ProjectionCompositionError>` only — the helper MUST NOT return `ResourceProjectionError`
- [x] **Step 3:** Collision detection by RFC-002 `MetadataKey` equality only. **Reuse the existing repository primitive `metadataKeysEqual`** (from `@resource-forge/core` metadata key module / already used by annotations). Do **not** use `JsonValue` equality for collision. Do **not** rely on object identity, `JSON.stringify`, or any invented canonicalization/serialization unless that is already what `metadataKeysEqual` does
- [x] **Step 4:** Duplicate `sourceId` detected before/with contribution fold; distinct code from key collision
- [x] **Step 5:** Successful path builds disjoint union with exact entry preservation (no sort requirement for semantic equality)
- [x] **Step 6:** Do not add a normative within-contribution duplicate error code; treat within-contribution uniqueness as an input invariant (annotations path already validated)

**Trace:** RFC-023 §3–§4, §5 examples

### Task 3 — Wire `projectResourceMetadata` (Slice B)

**Files:** `packages/core/src/resource/project.ts`, `project.test.ts`

- [x] **Step 1:** After successful `validateResource`, build the sole contribution `{ sourceId: 'annotations', entries: validated.annotations }` (annotations already `MetadataEntry[]`-compatible / convert exactly as today’s spread into `createResourceMetadata`)
- [x] **Step 2:** Call compose; on `ProjectionCompositionError`, map 1:1 into `ResourceProjectionError` and return `err`
- [x] **Step 3:** On success, `createResourceMetadata(identity, composedEntries)` as today
- [x] **Step 4 (TDD/regression):** Re-run / retain project suite cases for empty + non-empty annotations exact 1:1; invalid resource; vocabulary invalid still `invalid_resource`
- [x] **Step 5:** Confirm no import/use of `composeResourceMetadata` from `extension/`

**Trace:** RFC-023 §3.3, §4.1, §4.7; RFC-006 contribution retained

### Task 4 — Exports + docs closeout (Slice C)

**Files:** `exports.test.ts` (optional), `docs/roadmap.md`, this plan’s SCR

- [x] **Step 1:** Optional export smoke that `ResourceProjectionError` includes the new composition codes (still no public compose export)
- [x] **Step 2:** After M6+ gates, mark M3.20 ✅ on roadmap; ensure RFC-023 Accepted discoverability; fill SCR
- [x] **Step 3:** Later list remains direction/joins → empty-vs-absent; do not reopen M3.19

**Trace:** RFC-023 §10; roadmap discoverability

---

## Traceability matrix

| RFC-023 section | Tasks |
| --- | --- |
| §3.1 Abstract source / duplicate source id | Task 1–2 |
| §3.2 Contribution shape | Task 2–3 |
| §3.3 Annotations concrete source | Task 3 |
| §3.4 Emitter-set invariant | Task 3–4 (SHALL NOT emitters) |
| §4.1 Purity / inputs / outcomes | Task 2–3 |
| §4.2 Collision detection | Task 2 |
| §4.3 Hard failure / no reconciliation | Task 2 |
| §4.4 Disjoint union | Task 2–3 |
| §4.5 Merge never | Task 2 (operator lock) |
| §4.6 Determinism / ordering | Task 2 |
| §4.7 Single-source / empty / abstract zero | Task 2–3 |
| §4.8 `rf` adoption | Retained via annotations validation (no new work) |
| §5 Examples | Task 2 tests (synthetic multi-source) |
| §7 RFC-004 grain separation | Task 3 Step 5 |
| §9 Deferrals | SHALL NOT / contract inventory |
| §10 Implementation gate | Lifecycle; M5 before M6 |

---

## Execution risks (operational — not redesign)

| Risk | Mitigation |
| --- | --- |
| Accidentally implementing Field/Relation emitters “to test collisions” | Synthetic contributions in `projection-compose.test.ts` only; SHALL NOT list |
| Using RFC-004 `composeResourceMetadata` | Explicit SHALL NOT + no extension imports in `project.ts` |
| Treating equal-value collision as success | Dedicated TDD case; code must not compare values for collision |
| Collapsing composition errors into `invalid_metadata` | Locked distinct codes; helper uses `ProjectionCompositionError`; project maps 1:1 |
| Inventing a third within-contribution duplicate error | Input invariant + no new error code (Task 2 Step 6) |
| Inventing MetadataKey canonicalization | Reuse `metadataKeysEqual` only |
| Exporting compose as accidental public API | Default: internal module; exports test only widens error union |
| RFC-023 Accept docs not yet on `main` | Land [#83](https://github.com/rexescario-dev/resource-forge/issues/83) docs before or with delivery; M6 treats Accepted RFC text as authoritative |
| Changing annotation contribution semantics while wiring | Keep exact spread/equality with existing project tests |

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.20 Projection Composition |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/84 |
| M4 | Plan **Accepted** |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | **Approved** |
| M8 | **N/A** |
| M9 | **Complete** |
| Branch | `feat/m3-20-projection-composition` |
| PR | _(set after open)_ |
| Status | **Slice complete** |

### M5 Plan Review

```text
Decision: Accepted
Subject (plan): docs/superpowers/plans/2026-08-09-m3-20-projection-composition.md
Accepted specification: docs/superpowers/specs/2026-08-09-rfc-023-richer-projection-composition-design.md
Delivery goal: Implement RFC-023 projection composition (disjoint union; hard MetadataKey collision; annotations sole concrete source) without authorizing new emitters

Review summary: Return ledger items resolved. ProjectionCompositionError vs ResourceProjectionError ownership locked; within-contribution duplicates are input invariants (no third error code); collision reuse of metadataKeysEqual locked; three-way collision sources assertion strengthened. No further task/API/architecture changes. M6 authorized.

Findings: None (no plan blockers)
Traceability: adequate (coverage + deferrals checked)
Authority: Plan governs sequencing/execution; specification governs product semantics.
Gate: Proceed to M6.
```

### Shipped

- Internal `composeProjectionContributions` + `ProjectionCompositionError` (not publicly exported)
- Public `ResourceProjectionError` widened with `duplicate_projection_source` / `projection_key_collision` (1:1 boundary mapping)
- `projectResourceMetadata` wires validate → annotations contribution → compose → `createResourceMetadata`
- Hard `MetadataKey` collision via `metadataKeysEqual` (equal values still collide); annotations sole concrete source
- RFC-023 Accept docs + roadmap M3.1–M3.20 ✅; no Field/Relation/Operation emitters; RFC-004 compose untouched

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (projection-compose 9; project 24; exports 13; annotations 10; extension compose 13) via `vitest run --pool=threads --maxWorkers=1 --minWorkers=1` |
| Typecheck | **Passed** (`tsc --noEmit` in `@resource-forge/core`) |
| Lint | Skipped |
| Build | Skipped |
| Package validation | Skipped |

### M7 Code Review

```text
Decision: Approved for merge
Subject: feat/m3-20-projection-composition (#84)
Accepted plan: docs/superpowers/plans/2026-08-09-m3-20-projection-composition.md
Accepted specification: docs/superpowers/specs/2026-08-09-rfc-023-richer-projection-composition-design.md

Review summary: Implementation matches Accepted plan Tasks 1–4. Helper returns ProjectionCompositionError only; project maps 1:1; metadataKeysEqual used; equal-value collision covered; three-way sources lock covered; compose not exported; project does not import extension compose; annotations-only wiring; no new emitters. Verification green (vitest + tsc).

Findings: None (no merge blockers)
Gate: Proceed to M8/M9 as applicable.
```

### M8 Refactoring

```text
Decision: N/A
Reason: No worthwhile behavior-preserving refactor identified beyond the focused compose helper + project wire already delivered under TDD.
```

### M9 Documentation

```text
Decision: Accepted
Scope: docs/roadmap.md; docs/superpowers/specs/README.md; RFC-023 Status Accepted; plan SCR
Summary: Roadmap lists RFC-023 Accepted and M3.20 ✅; specs index updated; SCR Slice complete.
```

### M10 Workflow Validation

```text
Decision: Accepted
Subject: installed docs/workflows assets (no prompt edits this slice)
Summary: M2–M10 prompts remain coherent for this delivery; no workflow asset changes required for M3.20 closeout.
```

### Next Gate

**None — slice complete**
