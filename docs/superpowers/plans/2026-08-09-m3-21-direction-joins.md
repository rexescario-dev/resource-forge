# M3.21 Direction / Joins — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-024. Widen closed Relation with required `direction` and optional `inverse` / `join`. Do **not** implement runtime traversal, query/load, cascade, persistence/FK ownership, empty-vs-absent / null elements, mutual-inverse, mirrored-join, or FieldType join compatibility. Do **not** invent `missing_target_schema` or treat unsupplied targets as cross-ref failures. Do **not** authorize Relation→metadata projection. Do **not** reopen RFC-023 / M3.20. Ordinary `validateResource` MUST remain free of target-schema loading (RFC-010 spirit). Multi-Resource resolve is a separate explicit entrypoint that **skips** Relations whose target schema is not supplied.

**Status:** Accepted  
**M5:** Accepted (2026-08-09) — Plan Review after return revision; no plan blockers. `missing_target_schema` removed; unsupplied targets skipped; join grammar order `local` then `remote` with `String(candidate)` name payload; legacy five-member classification protected. M6 authorized; task checkboxes remain open until execution.  


**Tracking:** [#87](https://github.com/rexescario-dev/resource-forge/issues/87)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-024 Direction / Joins — Relationship Traversal Semantics (**Accepted**) — supersedes RFC-015 Relation member shape / equality only  
**Depends on:** RFC-001 (**Accepted**); RFC-007 (**Accepted**, `FieldName` / `fields`); RFC-008 (**Accepted**, `relations` collection); RFC-010 (**Accepted**, `target`); RFC-011 / RFC-013 / RFC-015 (**Accepted**, retained meanings); RFC-024 (**Accepted**); M3.1–M3.20 shipped  
**Related RFC issue:** [#86](https://github.com/rexescario-dev/resource-forge/issues/86) (RFC-024 Accept docs; not this delivery slice’s sole packaging identity)  
**Package:** `@resource-forge/core`  
**Slice:** M3.21 only — declarative direction / inverse / join on Relation (Resource-local + optional multi-Resource resolve)

**Goal:** Implement RFC-024 so every Relation declares required `direction`, may declare optional reverse-edge `inverse` and optional `{ local, remote }` `join`, with Resource-local validation (including `join.local` resolve against owning Fields) and an explicit multi-Resource resolve surface for counterpart existence / counterpart-target / opposite-direction / `join.remote`—without inventing runtime traversal or stronger bidirectional invariants.

**Architecture:**

```text
Relation (closed widen)
├── name, target, multiplicity, optional, nullable   ← retained
├── direction: "outbound" | "inbound"                ← required
├── inverse?: RelationName                           ← optional; on target
└── join?: { local: FieldName; remote: FieldName }   ← optional

Resource-local (validateResource / checkRelations):
  closed key sets · direction · inverse grammar · join shape
  join.local → owning fields (fields already checked)

Multi-Resource (explicit entrypoint; NOT inside validateResource):
  for each owner Relation:
    find target schema in supplied `targets` by Relation.target
    if supplied → resolve inverse / join.remote
    if not supplied → skip (not a failure)
```

**Invariant:** No implementation step may require reciprocal `inverse`, mirrored joins, FieldType compatibility, runtime traversal/query/load, empty-vs-absent semantics, invent completeness/`missing_target_schema` failures for unsupplied targets, or make single-Resource validity depend on loading the target Resource.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-024 Accepted (#86)
       ↓
M3.21 plan Draft → M5 Plan Review → Accepted (#87)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M9 / validation as required
       ↓
one delivery PR for tracking #87 (Accepted plan + implementation together)
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M3.21 delivery slice (Accepted plan + implementation). Do **not** open a separate plan-only merge PR as a required gate. RFC-024 Accept documentation for [#86](https://github.com/rexescario-dev/resource-forge/issues/86) MAY land in the same PR or earlier; M6 treats Accepted RFC text as authoritative.

**Task checkboxes:** Completed during **M6 execution** only.

---

## Locked decisions (export / shape review — planning aids)

| Decision | Lock |
| --- | --- |
| Relation shape | Flat closed widen: required `direction`; optional `inverse`; optional `join` |
| `RelationDirection` | Exact `"outbound" \| "inbound"` |
| `inverse` | Bare `RelationName` (no qualified inverse identity object) |
| `join` | Closed `{ local: FieldName; remote: FieldName }` when present |
| Defaults | **None** (missing `direction` invalid; omit means absent for optionals) |
| Allowed own-key sets | Six-member base ± `inverse` ± `join` (four allowed sets per RFC-024 §7.1) |
| Legacy five-member | `missing_relation_direction` **only** when own keys exactly `{ name, target, multiplicity, optional, nullable }` |
| Non-legacy missing direction | e.g. `{ name, target, multiplicity, optional, nullable, inverse }` without `direction` → `invalid_relation_member` (not `missing_relation_direction`) |
| Equality | Include `direction` and presence/value of `inverse` / `join` |
| Snapshot | Freeze new members; omit absent optionals (do not invent `undefined` properties) |
| Resource-local `join.local` | Resolve against owning Resource `fields` during Resource validation |
| Join validation precedence | **shape → FieldName grammar (`local` then `remote`) → local Field existence**; grammar `name` = string candidate or `String(nonString)` (same as existing invalid-name errors) |
| `checkRelations` signature | Accept owning field-name set (or validated `Field[]`) so `join.local` can resolve; create/validate call sites pass fields after `checkFields` |
| Multi-Resource resolve | **Separate** pure function (planning name: `checkRelationCrossRefs`); **not** called from `validateResource` |
| Multi-Resource public API | **Export** `checkRelationCrossRefs` from `@resource-forge/core`; keep `checkRelations` / `relationsEqual` / `snapshotRelations` internal unless already exported |
| `targets` completeness | **Not** required — `targets` is an explicitly supplied partial schema set, not a registry; unsupplied targets are skipped |
| Reciprocal inverse | **Forbidden** to require |
| Mirrored joins | **Forbidden** to require |
| FieldType join match | **Deferred** |
| Runtime traversal | **Deferred** |
| Invented `missing_target_schema` | **Forbidden** — not an RFC-024 category |
| Error codes | Distinct codes for RFC-024 semantic categories only; concrete unions are planning locks below |

### Resource-local error codes (planning lock)

Widen `RelationValidationError` with:

| RFC-024 category | `code` |
| --- | --- |
| Missing relation direction | `missing_relation_direction` |
| Invalid relation direction | `invalid_relation_direction` (`direction: unknown`) |
| Invalid relation inverse | `invalid_relation_inverse` (`inverse: unknown`) |
| Invalid relation join | `invalid_relation_join` |
| Invalid join local field name | `invalid_join_local_field_name` (`name: string`) |
| Unknown join local field | `unknown_join_local_field` (`name: FieldName`) |
| Invalid join remote field name | `invalid_join_remote_field_name` (`name: string`) |

Retain existing name/target/multiplicity/optional/nullable codes. Continue wrapping under Resource `invalid_schema` as today.

**Join validation precedence (Resource-local, normative for M6):** when `join` is present, classify failures in this order and stop at the first match:

1. **Shape** — not closed `{ local, remote }` with both own keys present (extra keys / non-object / missing member) → `invalid_relation_join`
2. **FieldName grammar** — after shape succeeds, validate members independently in deterministic order **`local`, then `remote`**. The first member that fails RFC-007 `FieldName` grammar determines the error (`invalid_join_local_field_name` or `invalid_join_remote_field_name`). Do not invent a separate “type/shape” category for non-string members.
3. **Local Field existence** — only after both members pass grammar: grammar-valid `local` not on owning Resource → `unknown_join_local_field`

**`name` payload for grammar failures (planning lock, matches existing `invalid_relation_name` / `invalid_field_name` convention):** RFC-024 defers concrete error unions to planning and only requires the semantic category. Report:

```text
name: typeof candidate === 'string' ? candidate : String(candidate)
```

So:

```text
join: { local: 123, remote: "id" }
→ invalid_join_local_field_name { name: "123" }

join: { local: "Missing", remote: "id" }   // grammar fail (uppercase)
→ invalid_join_local_field_name { name: "Missing" }

join: { local: "missing", remote: "id" }   // grammar ok, field absent
→ unknown_join_local_field { name: "missing" }
```

Do not emit `unknown_join_local_field` when grammar failed. Do not leave `name` unrepresentable for non-string candidates.

### Multi-Resource error codes (planning lock)

```text
checkRelationCrossRefs(
  owner: { identity: ResourceIdentity; relations: ReadonlyArray<Relation> },
  targets: ReadonlyArray<{ identity: ResourceIdentity; fields: ReadonlyArray<Field>; relations: ReadonlyArray<Relation> }>,
): Result<void, RelationCrossRefValidationError>

// `targets` is an explicitly supplied partial set of schemas — not a registry and not required to be exhaustive.

RelationCrossRefValidationError:
  | { code: 'unknown_inverse_relation'; relation: RelationName; inverse: RelationName }
  | { code: 'inverse_target_mismatch'; relation: RelationName; inverse: RelationName }
  | { code: 'inverse_direction_mismatch'; relation: RelationName; inverse: RelationName }
  | { code: 'unknown_join_remote_field'; relation: RelationName; name: FieldName }
```

**Algorithm (locked):**

```text
for each owner Relation:
  find target schema in `targets` by Relation.target (RFC-001 equality)

  if target schema is supplied:
    if inverse present:
      require named Relation exists on target
      require counterpart.target == owner.identity
      require counterpart.direction opposite owner.direction
    if join present:
      require join.remote resolves on target.fields

  if target schema is not supplied:
    skip cross-resource resolution for this Relation
    (not a validation failure)
```

| Rule | Behavior |
| --- | --- |
| Target schema lookup | Match `Relation.target` to an entry in `targets` by RFC-001 identity equality |
| Unsupplied target | **Skip** — do **not** fail; `targets` need not be exhaustive |
| Relations without `inverse`/`join` | No cross-ref work required for that member (even if target is supplied) |
| Self-target | Owning schema MAY appear in `targets`; same reverse-edge rules when supplied |
| Invented completeness errors | **Forbidden** — no `missing_target_schema` (or equivalent) |

Do **not** collapse cross-ref failures into Resource-local codes without a discriminant. Do **not** treat `targets` as a registry that must contain every Relation target.

---

## Constraints (SHALL / SHALL NOT)

### SHALL

1. Require `direction` on every Relation; exact `"outbound" | "inbound"` (RFC-024 §4).
2. Accept optional `inverse` as bare `RelationName`; optional `join` as closed `{ local, remote }` (RFC-024 §5–§6).
3. Enforce allowed own-key sets; legacy five-member → `missing_relation_direction` (RFC-024 §7.1).
4. Resolve `join.local` against owning Fields during Resource-local validation (RFC-024 §6.3).
5. Keep ordinary Resource validity independent of target schema presence (RFC-024 §7.1 / RFC-010 spirit).
6. Provide multi-Resource resolve that, **only when** target schema is supplied: inverse exists; counterpart `target` equals owning identity; opposite direction; `join.remote` resolves — and **skip** when target is unsupplied (RFC-024 §5.3, §7.2).
7. Update Relation value equality and snapshots for `direction` and present optionals (RFC-024 §8.1).
8. Apply identical rules to self-target Relations (RFC-024 §8.2).
9. Keep Relation projection non-participation unchanged.
10. Keep packages’ existing green suites green after fixture updates for the breaking Relation widen.

### SHALL NOT

1. Require `B.inverse = A` when `A.inverse = B`.
2. Require mirrored joins, multiplicity/optional/nullable agreement across inverse pairs.
3. Implement runtime traversal, query planning, loading, cascade, persistence/FK ownership.
4. Implement empty-vs-absent / null-element semantics.
5. Require FieldType compatibility between `join.local` and `join.remote`.
6. Call multi-Resource resolve from `validateResource`.
7. Invent defaults for `direction` / `inverse` / `join`.
8. Authorize Relation → metadata emission.
9. Reopen RFC-023 composition or annotation vocabulary.
10. Soft/warn-only validation modes.
11. Invent `missing_target_schema` (or treat unsupplied targets as cross-ref failures / require exhaustive `targets`).

---

## Package / ownership boundaries

| Area | Role |
| --- | --- |
| `packages/core/src/resource/types.ts` | `RelationDirection`, `RelationJoin`, widen `Relation`, widen `RelationValidationError`, add `RelationCrossRefValidationError` |
| `packages/core/src/resource/relations.ts` | `checkRelations` key-set/direction/inverse/join/`join.local`; `snapshotRelations`; `relationsEqual` |
| `packages/core/src/resource/relation-cross-refs.ts` (**create**) | `checkRelationCrossRefs` (file-layout decision) |
| `packages/core/src/resource/relation-cross-refs.test.ts` (**create**) | Multi-Resource TDD |
| `packages/core/src/resource/relations.test.ts` | Resource-local TDD + fixture widen |
| `packages/core/src/resource/validate.ts` | Pass owning fields into `checkRelations`; do **not** call cross-refs |
| `packages/core/src/resource/create-resource-*.ts` | Pass fields into `checkRelations` where Relations are validated |
| `packages/core/src/resource/project.test.ts` / other Resource fixtures | Update Relation literals to include `direction` |
| `packages/core/src/index.ts` / `resource/index.ts` | Export new public types + `checkRelationCrossRefs` |
| `packages/core/src/resource/exports.test.ts` | Export smoke for direction/join types + cross-ref entrypoint; keep internals non-exported |
| `docs/roadmap.md` | M3.21 ✅ on final delivery commit only |

---

## Slice sequence

| Slice | Delivers | Prerequisite |
| --- | --- | --- |
| A | Types + Resource-local `checkRelations` / snapshot / equality + relations tests | RFC-024 Accepted |
| B | Wire validate/create call sites with fields; update Resource fixtures / project tests | Slice A |
| C | `checkRelationCrossRefs` + tests (counterpart target/direction/remote; skip unsupplied targets) | Slice A |
| D | Exports + roadmap / SCR closeout docs | A–C green |

---

## Contract inventory

| Contract | Action |
| --- | --- |
| Required `direction` | **Implement** |
| Optional `inverse` identity | **Implement** |
| Optional `join` binding identity | **Implement** |
| Resource-local validation | **Implement** |
| Multi-Resource resolve entrypoint | **Implement** |
| Opposite direction + counterpart targets owner | **Implement** (cross-ref only) |
| Reciprocal inverse / mirrored join | **Defer** (forbidden to require) |
| Runtime traversal / load / query | **Defer** |
| Empty-vs-absent / null elements | **Defer** |
| Relation projection emission | **Defer** |

---

## TDD / verification strategy

### Resource-local (Slice A–B)

- Accept six-member Relation with `direction` only; with `inverse`; with `join`; with both.
- Reject legacy five-member → `missing_relation_direction` (key-order independent).
- Reject `{ name, target, multiplicity, optional, nullable, inverse }` without `direction` → `invalid_relation_member` (**not** `missing_relation_direction`).
- Reject invalid `direction` string / non-string → `invalid_relation_direction`.
- Reject bad `inverse` grammar → `invalid_relation_inverse`.
- Reject malformed `join` (missing local/remote, extra keys, non-object) → `invalid_relation_join`.
- After shape succeeds, reject invalid local/remote FieldName grammar in order `local` then `remote` (`join: { local: 123, remote: "id" }` → `invalid_join_local_field_name` with `name: "123"`; not `unknown_join_local_field`).
- Reject unknown `join.local` against owning fields after shape+grammar succeed → `unknown_join_local_field`.
- `relationsEqual` false when only `direction` / only `inverse` presence / only `join` differs.
- Snapshot omits absent optionals; freezes present ones.
- Self-target Resource-local accept (no special case).
- Projection/validate fixtures updated; invalid direction fails projection via invalid schema.

### Multi-Resource (Slice C)

- Valid asymmetric inverse (counterpart targets owner, opposite direction; no back `inverse`).
- Reject unknown inverse name → `unknown_inverse_relation`.
- Reject counterpart target ≠ owner → `inverse_target_mismatch`.
- Reject same-direction counterpart → `inverse_direction_mismatch`.
- Reject unknown `join.remote` on target → `unknown_join_remote_field`.
- Unsupplied target with `inverse`/`join` present → **skip / success** for that Relation (no `missing_target_schema`).
- Partial `targets` (some Relations resolved, others skipped) → ok when supplied targets satisfy rules.
- Self-target cross-ref with opposite direction + owner target succeeds without reciprocal inverse.
- Confirm `validateResource` still succeeds for Relations with `inverse`/`join` when target schema is absent.

### Commands

- `pnpm exec vitest run --pool=threads --maxWorkers=1 --minWorkers=1` on touched tests
- `pnpm exec tsc --noEmit` in `@resource-forge/core`
- Lint/build skipped unless already required by repo norms

---

## Task breakdown

### Task 1 — Types (Slice A)

**Files:** `packages/core/src/resource/types.ts`

- [x] **Step 1:** Add `RelationDirection = 'outbound' | 'inbound'`
- [x] **Step 2:** Add `RelationJoin = { readonly local: FieldName; readonly remote: FieldName }`
- [x] **Step 3:** Widen `Relation` with required `direction` and optional `inverse?` / `join?`
- [x] **Step 4:** Widen `RelationValidationError` with Resource-local codes locked above
- [x] **Step 5:** Add `RelationCrossRefValidationError` union locked above

**Trace:** RFC-024 §4–§8, §7.1–§7.2

### Task 2 — Resource-local validation / snapshot / equality (Slice A)

**Files:** `packages/core/src/resource/relations.ts`, `relations.test.ts`

- [x] **Step 1 (TDD):** Add failing tests for accept/reject matrices in TDD strategy (Resource-local), including: (a) legacy five-member → `missing_relation_direction`; (b) five-member + `inverse` without `direction` → `invalid_relation_member`; (c) join precedence — `local: 123` → `invalid_join_local_field_name` `{ name: "123" }`; unknown local name → `unknown_join_local_field`
- [x] **Step 2:** Change `checkRelations` to accept owning field names (e.g. second arg `fields: readonly { name: FieldName }[]` or `ReadonlySet<FieldName>`) for `join.local` resolve
- [x] **Step 3:** Implement closed key-set classification (`missing_relation_direction` **only** for exact five-member legacy; allowed six-member ± optional keys; other missing-direction shapes → `invalid_relation_member`)
- [x] **Step 4:** Validate `direction`, optional `inverse` grammar, optional `join` with precedence **shape → grammar (`local` then `remote`) → local existence**; grammar `name` payload uses `typeof === 'string' ? candidate : String(candidate)`
- [x] **Step 5:** Materialize `Relation` including only present optionals
- [x] **Step 6:** Update `snapshotRelations` / `relationsEqual` for new members
- [x] **Step 7:** Make tests green

**Trace:** RFC-024 §4–§8, §7.1

### Task 3 — Wire validate / create + fixture widen (Slice B)

**Files:** `validate.ts`, `create-resource-*.ts` that call `checkRelations`, Resource/project/exports tests with Relation literals

- [x] **Step 1:** Pass validated fields into `checkRelations` from `validateResource` and create helpers
- [x] **Step 2 (TDD):** Resource with `direction` (+ optional inverse/join with local field) validates; legacy five-member fails Resource validation
- [x] **Step 3:** Update all in-repo Relation fixtures to include `direction` (and join fields where tests need join)
- [x] **Step 4:** Confirm projection still non-participating; invalid direction fails project via invalid schema
- [x] **Step 5:** Full touched-suite green

**Trace:** RFC-024 §7.1, §9

### Task 4 — Multi-Resource cross-ref entrypoint (Slice C)

**Files:** create `relation-cross-refs.ts` + `relation-cross-refs.test.ts`

- [x] **Step 1 (TDD):** Add failing tests covering asymmetric valid inverse; wrong counterpart target; same direction; unknown inverse; unknown remote; **skip when target unsupplied** (success, no invented completeness error); partial `targets`; self-target without reciprocal inverse
- [x] **Step 2:** Implement `checkRelationCrossRefs` per locked algorithm (resolve only when target supplied; otherwise skip)
- [x] **Step 3:** Confirm it is **not** invoked from `validateResource` and does **not** define `missing_target_schema`
- [x] **Step 4:** Make the Task 4 tests pass

**Trace:** RFC-024 §5.3, §7.2, §10 examples

### Task 5 — Exports + docs closeout (Slice D)

**Files:** `packages/core/src/index.ts`, `resource/index.ts`, `exports.test.ts`, `docs/roadmap.md`, this plan’s SCR

- [x] **Step 1:** Export `RelationDirection`, `RelationJoin`, widened `Relation` / error unions, and `checkRelationCrossRefs`
- [x] **Step 2:** Export smoke: cross-ref entrypoint public; `checkRelations` / `relationsEqual` remain non-exported
- [x] **Step 3:** After M6+ gates, mark M3.21 ✅ on roadmap; Later remains empty-vs-absent; fill SCR
- [x] **Step 4:** Do not reopen RFC-023 / M3.20

**Trace:** RFC-024 §15; roadmap discoverability

---

## Traceability matrix

| RFC-024 section | Tasks |
| --- | --- |
| §4 Direction | Task 1–3 |
| §5 Inverse (+ counterpart target/direction) | Task 1–2 (grammar); Task 4 (resolve) |
| §6 Join | Task 1–3 (local); Task 4 (remote) |
| §7.1 Resource-local validation | Task 2–3 |
| §7.2 Multi-Resource resolve | Task 4 |
| §8 Member model / equality / self-target | Task 2–3 |
| §9 Orthogonality / projection non-participation | Task 3 |
| §10 Examples | Task 2–4 tests |
| §1.2 / §14 Deferrals | SHALL NOT |
| §15 Implementation gate | Lifecycle; M5 before M6 |

---

## Execution risks (operational — not redesign)

| Risk | Mitigation |
| --- | --- |
| Accidentally calling cross-ref from `validateResource` | SHALL NOT + Task 4 Step 3 |
| Treating unsupplied targets as failures / inventing `missing_target_schema` | Removed from plan; skip algorithm locked; Task 4 tests |
| Misclassifying five-member+`inverse` as `missing_relation_direction` | Explicit TDD case → `invalid_relation_member` |
| Ambiguous join failure codes | Precedence lock shape → grammar → local existence |
| Forgetting fixture widen → mass test failures | Task 3 dedicated fixture pass |
| Requiring reciprocal inverse in tests “for neatness” | Explicit asymmetric valid cases in Task 4 |
| Treating `join` as FK ownership | RFC wording + SHALL NOT |
| Treating `targets` as a registry | Partial supplied-set wording + skip rule |
| Dual-shape compatibility for five-member Relations | Breaking lock; `missing_relation_direction` tests |
| Inventing FieldType join checks | Deferred / SHALL NOT |
| RFC-024 Accept docs not yet on `main` | Land [#86](https://github.com/rexescario-dev/resource-forge/issues/86) docs before or with delivery; M6 treats Accepted RFC text as authoritative |

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.21 Direction / Joins |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/87 |
| M4 | Plan **Accepted** |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | **Approved** |
| M8 | **N/A** |
| M9 | **Complete** |
| Branch | `feat/m3-21-direction-joins` |
| PR | https://github.com/rexescario-dev/resource-forge/pull/88 |
| Status | **Slice complete** |

### M5 Plan Review

```text
Decision: Accepted
Subject (plan): docs/superpowers/plans/2026-08-09-m3-21-direction-joins.md
Accepted specification: docs/superpowers/specs/2026-08-09-rfc-024-direction-joins-design.md
Delivery goal: Implement RFC-024 declarative direction/inverse/join without runtime traversal

Review summary: Return ledger resolved. missing_target_schema removed; unsupplied targets skipped; join grammar order local→remote with String(candidate) name payload; legacy five-member classification protected. No further task/API/architecture changes. M6 authorized.

Findings: None (no plan blockers)
Traceability: adequate (coverage + deferrals checked)
Authority: Plan governs sequencing/execution; specification governs product semantics.
Gate: Proceed to M6.
```

### Shipped

- Required `direction` + optional `inverse` / `{ local, remote }` `join` on closed Relation (breaking vs five-member floor)
- Resource-local `checkRelations(fields)` with join precedence shape → grammar → local existence
- Public `checkRelationCrossRefs` (skip unsupplied targets; counterpart target + opposite direction; no reciprocal/mirror)
- Equality/snapshot widened; Relation projection still non-participating
- RFC-024 Accept docs + roadmap M3.1–M3.21 ✅

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (relations 39; relation-cross-refs 9; project 24; exports 14; validate 6; full core 292) via `vitest run --pool=threads --maxWorkers=1 --minWorkers=1` |
| Typecheck | **Passed** (`tsc --noEmit` in `@resource-forge/core`) |
| Lint | Skipped |
| Build | Skipped |
| Package validation | Skipped |

### M7 Code Review

```text
Decision: Approved for merge
Subject: feat/m3-21-direction-joins (#87)
Accepted plan: docs/superpowers/plans/2026-08-09-m3-21-direction-joins.md
Accepted specification: docs/superpowers/specs/2026-08-09-rfc-024-direction-joins-design.md

Review summary: Implementation matches Accepted plan Tasks 1–5. Direction required; inverse/join optional; cross-ref skip-when-unsupplied; no missing_target_schema; join precedence locked; validateResource does not call cross-refs; checkRelationCrossRefs exported; internals not exported. Verification green (vitest + tsc).

Findings: None (no merge blockers)
Gate: Proceed to M8/M9 as applicable.
```

### M8 Refactoring

```text
Decision: N/A
Reason: No worthwhile behavior-preserving refactor identified beyond the focused Relation widen + cross-ref helper already delivered under TDD.
```

### M9 Documentation

```text
Decision: Accepted
Scope: docs/roadmap.md; docs/superpowers/specs/README.md; RFC-024 Status Accepted; plan SCR
Summary: Roadmap lists RFC-024 Accepted and M3.21 ✅; specs index updated; SCR Slice complete; Later remains empty-vs-absent.
```

### M10 Workflow Validation

```text
Decision: Accepted
Subject: installed docs/workflows assets (no prompt edits this slice)
Summary: M2–M10 prompts remain coherent for this delivery; no workflow asset changes required for M3.21 closeout.
```

### Next Gate

**None — slice complete**
