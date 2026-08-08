# M3.12 Relation Nullability — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-015. Reuse M3.1–M3.11 Resource / schema / field / relation / operation / annotation / projection surfaces. Do **not** implement null elements in `many`, empty-collection ≡ null / empty-vs-absent, runtime presence/value enforcement of association-reference nullability, wire/serialization of association-reference null vs absence, persistence/DB null, bounds/constraints/defaults, cascade/loading/direction/joins/traversal/execution, Operation optionality / kind / signature / execution, annotation vocabulary, field→metadata projection, Field floor changes (RFC-014 retained), dual-shape compatibility, or public `validateRelations` / `validateNullable` / `validateResourceSchema`.

**Status:** Accepted  
**M5:** Accepted (2026-08-08) — Plan Review; no plan blockers. The plan faithfully implements Accepted RFC-015 without adding product semantics. Relation nullable is association-reference nullability only; the five-member closed Relation floor, exact boolean validation, missing-vs-invalid classification, order-independent own-key boundaries, equality/uniqueness separation, validate-before-snapshot, and projection non-participation are all executable and covered by explicit TDD tasks. Fields, Operations, annotations, and retained Relation contracts remain unchanged. M6 implementation is authorized only after this status update; task checkboxes remain open until execution. One PR with implementation for #53.  
**Tracking:** [#53](https://github.com/rexescario-dev/resource-forge/issues/53)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted) — M3.12 was blocked on Relation Nullability RFC  
**Source RFC:** RFC-015 Relation Nullability (**Accepted**) — amends Relation member floor; partial supersession of RFC-013 Relation closed-member / equality text; association-reference nullability only  
**Depends on:** RFC-005 (**Accepted**); RFC-006 (**Accepted**); RFC-008 (**Accepted**, Relation collection retained); RFC-010 (**Accepted**, `target` retained); RFC-011 (**Accepted**, `multiplicity` retained and orthogonal); RFC-012 (**Accepted**, Operations unchanged); RFC-013 (**Accepted**, `optional` retained and orthogonal; Relation shape partially superseded); RFC-014 (**Accepted**, Field floor retained unchanged); RFC-015 (**Accepted**); M3.1–M3.11 shipped  
**Package:** `@resource-forge/core`  
**Slice:** M3.12 only — required Relation `nullable: boolean` (**association-reference nullability** declaration constraints only); Fields unchanged at RFC-014; breaking vs M3.11 `{ name, target, multiplicity, optional }` Relations; no dual-shape; validate-before-snapshot; projection non-participation unchanged; Operations unchanged

**Goal:** Widen every Relation from `{ name, target, multiplicity, optional }` to exactly `{ name: RelationName; target: ResourceIdentity; multiplicity: RelationMultiplicity; optional: boolean; nullable: boolean }`, validate closed shape + retained upstream rules + exact boolean `nullable` as part of Resource validity via `checkRelations`, redefine Relation value equality to include `nullable` (superseding RFC-013 Relation equality only after this floor is adopted), keep `nullable` fully orthogonal to RFC-013 `optional` and RFC-011 `multiplicity` (all `optional` × `multiplicity` × `nullable` combinations valid, including `many + nullable` without defining collection/runtime representation), leave Fields at RFC-014 `{ name, type, optional, nullable }`, and keep `projectResourceMetadata` free of any Field/Relation→metadata contribution.

**Architecture:**

```text
candidate relations
          │
          ▼
 validate candidate member shape   ← Relation exactly
                                    │ `{ name, target, multiplicity, optional, nullable }`
                                    │ (extras → invalid_relation_member; no strip)
          │
          ▼
 validate retained member rules     ← RelationName + uniqueness + target (RFC-008/010);
                                    │ multiplicity (RFC-011); optional exact boolean (RFC-013)
          │
          ▼
 validate nullable                  ← absent → missing_relation_nullable;
                                    │ present but not exact boolean → invalid_relation_nullable
                                    │ (association-reference nullability only)
          │
          ▼
 snapshot exact valid members       ← freeze widened closed shapes; never invent default nullable
          │
          ▼
       Resource.schema.relations
          │
          ▼
    validateResource               ← authoritative Resource gate (delegates to checkRelations)
          │
          ▼
 projectResourceMetadata           ← revalidate Resource; annotation-derived metadata only;
                                      fields/relations contribute nothing
```

**Invariant:** No implementation step may transform an invalid candidate into a valid Relation by discarding information (including stripping unknown properties or inventing a default `nullable`) before validation. Invalid candidates MUST fail in `checkRelations` **before** any call path that materializes a widened Relation (including `snapshotRelations`); implementations MUST NOT produce even a temporary `{ …, nullable: false }` (or `true`) from a missing/invalid/`extra`-bearing candidate.

`nullable` is **association-reference nullability declaration only** — not declaration presence (`optional`), not multiplicity reinterpretation, not null elements in `many`, not empty≡null, not runtime association checking, wire representation, or persistence. Uniqueness within `relations` remains **by name only**. Relation value equality is exact `name` **and** exact `target` **and** exact `multiplicity` **and** exact `optional` **and** exact `nullable`. `nullable` MUST NOT affect or reinterpret `optional` or `multiplicity`. Fields MUST NOT change; Field value nullability remains RFC-014.

**Tech Stack:** TypeScript strict, Vitest (existing `packages/core` scripts)

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-015 Accepted
       ↓
M3.12 plan Draft (this document)
       ↓
M5 Plan Review → Accepted (Status header only; task checkboxes stay open)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M9 / validation as required by parent M3 workflow
       ↓
one delivery PR for tracking #53 (Accepted plan + implementation together)
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M3.12 delivery slice (Accepted plan + implementation). Do **not** open a separate plan-only merge PR as a required gate. M5 Accept is recorded by updating this plan’s **Status** to Accepted (and M5 rationale); it is not the same event as merging the delivery PR.

**Task checkboxes:** Completed during **M6 execution** only. M5 acceptance records only that the plan is **Accepted** — it does **not** mark implementation task checkboxes complete.

---

## Locked decisions (export / shape review — planning aids)

These freeze the M3.12 implementation surface. They MUST NOT invent product semantics beyond RFC-015 (+ retained RFC-008 / RFC-010 / RFC-011 / RFC-013 / RFC-014 / M3.11 Relation validation mechanism rules).

| Decision | Lock |
| --- | --- |
| Normative term | **Association-reference nullability** — not element nullability, not wire-level `null`. |
| `nullable` | Exact boolean `true \| false` only. No coerce, normalize, string/number/`null` stand-ins, or omit-as-default. |
| Meaning | `true` → association reference **may be null**; `false` → association reference **must be non-null**. Schema-declaration constraints only (not runtime checks). |
| `Relation` | `{ readonly name; readonly target; readonly multiplicity; readonly optional; readonly nullable }` **exactly**. No additional members. |
| `Field` | Unchanged RFC-014 `{ readonly name; readonly type; readonly optional; readonly nullable }` **exactly**. |
| Missing Relation `nullable` | `missing_relation_nullable` when own key `nullable` is absent and the candidate's **order-independent** own key set is exactly `{ name, target, multiplicity, optional }` (breaking vs M3.11 four-member Relations). |
| Key-set comparison | Order-independent. Enumeration **order** MUST NOT be treated as semantic. Reuse the existing Relation own-key / `hasOwnProperty` mechanism for detecting own members; do **not** invent a new RFC-015 requirement that members be enumerable. |
| Own-property `nullable` | `nullable` MUST be an **own** property. Inherited / prototype-derived `nullable` does **not** satisfy the closed Relation contract (classify as missing-nullable when the own-key set matches the special case). |
| Present-but-invalid `nullable` | `invalid_relation_nullable` (not exact boolean). |
| Extra Relation member | `invalid_relation_member` (e.g. premature `default`, direction, joins). Never stripped. |
| Boundary classification | See shape-classification table below. |
| Retained missing special cases | Prior missing-multiplicity / missing-optional special cases retained for their exact own-key sets; do not collapse into a generic recursive missing-property check. |
| Orthogonality | All `optional × multiplicity × nullable` declaration combinations valid (including `many + nullable` without defining null elements or empty≡null representation). |
| Uniqueness | Still by name only (RFC-008). Equality MUST NOT drive uniqueness. |
| `operations` / Fields | Unchanged (Fields remain RFC-014). |
| Structural candidate acceptance | Apply the **existing M3.11 Relation candidate-object acceptance mechanism** first **only** for the candidate being an acceptable structural object; do **not** apply M3.11's closed Relation key-set classification before the RFC-015 classification table. **RFC-015 owns the post-object key-set classification for Relation members.** Do **not** introduce a new M3.12-only “plain object brand” product semantic. |
| Snapshot vs validation | **Separated, non-lossy.** Validate candidates **before** materializing widened closed members. `snapshotRelations` freezes already-valid members only; MUST NOT invent default `nullable`; MUST NOT be reachable for invalid candidates. |
| Non-empty Resource construction | **No public builder.** Tests use existing **internal** `createResourceWithRelationsForTests` / `createResourceWithFieldsForTests` / `createResourceWithOperationsForTests`. |
| Internal helpers | `checkRelations` / `snapshotRelations` / `relationsEqual` remain **module-local same-package seams** (MUST NOT be barrel-/package-exported). |
| Validation ownership | Part of `validateResource` via schema (`checkRelations`). No public `validateRelations` / `validateNullable` / `validateResourceSchema`. |
| Schema error taxonomy | Prior Relation causes retained plus **`missing_relation_nullable`** and **`invalid_relation_nullable`**. No new Field nullable causes. |
| Projection | Still annotation-only. Fields/Relations MUST NOT contribute entries. Invalid Relation nullable still fails the projection gate. **Preferred:** no production change to `project.ts`. |
| Equality helpers | **Test/internal only.** `relationsEqual` includes exact `nullable`. |
| Compose / registry | SHALL NOT require compose/registry; SHALL NOT validate live associations against association-reference nullability. |

---

## Relation shape-classification table (normative for this plan)

Per candidate Relation member: apply the **existing M3.11 candidate-object acceptance mechanism** first **only** for the candidate being an acceptable structural object (reject with `invalid_relation_member` when that object-acceptance mechanism rejects). Do **not** apply M3.11's closed Relation key-set classification before this table. **RFC-015 owns the post-object key-set classification for Relation members:**

| Own-key / property condition | Cause |
| --- | --- |
| Own key `multiplicity` absent and own key set exactly `{ name, target }` | `missing_relation_multiplicity` (RFC-011 / M3.8 retained) |
| Own key `optional` absent and own key set exactly `{ name, target, multiplicity }` | `missing_relation_optional` (RFC-013 / M3.10 retained) |
| Own key `nullable` absent and own key set exactly `{ name, target, multiplicity, optional }` | `missing_relation_nullable` |
| Own key set not exactly `{ name, target, multiplicity, optional, nullable }` after the above special cases do not apply (or extras present) | `invalid_relation_member` |
| Own key `nullable` present but value not exact boolean | `invalid_relation_nullable` |
| Retained name / duplicate / target / multiplicity / optional failures | Existing causes (`invalid_relation_name`, `duplicate_relation_name`, `invalid_relation_target`, `invalid_relation_multiplicity`, `invalid_relation_optional`, …) |

**Explicit boundary mappings (must be tested):**

```text
{ name, target }                                      → missing_relation_multiplicity
{ name, target, multiplicity }                        → missing_relation_optional
{ name, target, multiplicity, optional }              → missing_relation_nullable
{ name, target, multiplicity, optional, default }     → invalid_relation_member   (NOT missing_relation_nullable)
{ name, target, multiplicity, nullable }              → invalid_relation_member   (NOT missing_relation_optional)
{ name, target, multiplicity, optional, nullable }    → proceed to member validation
```

Inherited-only `nullable` does not count as present. Key-set comparisons are order-independent. Special-case ordering MUST NOT be refactored into a generic “recursive missing property” check that would reclassify `{ name, target, multiplicity, nullable }` as missing-optional or `{ name, target, multiplicity, optional, default }` as missing-nullable.

---

## M3.12 public contract surface

| Symbol | Kind | Role |
| --- | --- | --- |
| `Relation` | type | `{ readonly name; readonly target; readonly multiplicity; readonly optional; readonly nullable }` |
| `RelationValidationError` | type | Prior causes + `missing_relation_nullable` + `invalid_relation_nullable` |
| `Field` | type | Unchanged RFC-014 four-member shape |
| `FieldValidationError` | type | Unchanged |
| `ResourceSchema` | type | Unchanged collection slots; Relation members carry `nullable` |
| `validateResource` | function | Validates Relation nullable rules + retained composed rules |
| `createResource` / `createEmptyResourceSchema` | function | Still empty collections |
| `projectResourceMetadata` | function | Identity + annotation entries only |
| Operation / annotation / identity surfaces | retained | Unchanged |

**Not public in M3.12:**

- `validateRelations` / `validateNullable` / `validateResourceSchema`
- `validateRelationName` / `snapshotRelations` / `relationsEqual` as product APIs
- Public Resource builders
- Null elements in `many`, empty≡null / empty-vs-absent, runtime association checks, wire/persistence semantics, bounds, direction/join/cascade/load/traversal/execution
- Dual-shape migration helpers
- Field floor changes
- Field/Relation→metadata projection

**Retain:** M2–M3.11 exports; `PACKAGE_NAME` / `PACKAGE_VERSION`.

### Validation error shape (planning aid)

```ts
type Relation = {
  readonly name: RelationName;
  readonly target: ResourceIdentity;
  readonly multiplicity: RelationMultiplicity;
  readonly optional: boolean;
  readonly nullable: boolean;
};

type RelationValidationError =
  | { readonly code: 'invalid_relation_name'; readonly index: number; readonly name: string }
  | { readonly code: 'duplicate_relation_name'; readonly index: number; readonly name: string }
  | { readonly code: 'invalid_relation_member'; readonly index: number }
  | { readonly code: 'invalid_relation_target'; readonly index: number; readonly cause: IdentityValidationError }
  | { readonly code: 'missing_relation_multiplicity'; readonly index: number }
  | { readonly code: 'invalid_relation_multiplicity'; readonly index: number; readonly multiplicity: unknown }
  | { readonly code: 'missing_relation_optional'; readonly index: number }
  | { readonly code: 'invalid_relation_optional'; readonly index: number; readonly optional: unknown }
  | { readonly code: 'missing_relation_nullable'; readonly index: number }
  | { readonly code: 'invalid_relation_nullable'; readonly index: number; readonly nullable: unknown };
```

---

## Constraints (from Accepted RFC-015 + retained upstream RFCs)

### SHALL

- represent every Relation as exactly `{ name, target, multiplicity, optional, nullable }` after this slice is implemented
- require `nullable` on every Relation; reject absence as `missing_relation_nullable` when the own-key special case applies
- accept only exact boolean `true` / `false` for `nullable`; reject stand-ins as `invalid_relation_nullable`
- treat `nullable` as **association-reference nullability** only
- redefine Relation value equality as exact `name` **and** exact `target` **and** exact `multiplicity` **and** exact `optional` **and** exact `nullable` (supersedes RFC-013 Relation equality only after Accept + implementation of this floor)
- keep `nullable` fully orthogonal to `optional` and `multiplicity` (all declaration combinations valid, including `many + nullable`)
- retain RFC-008 collection rules (order, uniqueness-by-name, empty validity, snapshot ownership)
- retain RFC-010 `target`, RFC-011 multiplicity meanings, RFC-013 `optional` semantics, RFC-014 Field floor, RFC-012 Operations
- validate candidates **before** any materialization of widened closed members
- keep missing vs invalid `nullable` distinct; no silent coercion/defaulting/repair
- leave projection free of field/relation contributions while still revalidating the Resource
- leave Fields unchanged at RFC-014

### SHALL NOT

- accept four-member Relations after this slice (no dual-shape period)
- invent null-element semantics for `many`, empty≡null / empty-vs-absent product semantics, runtime association enforcement, wire/serialization of association-reference null vs absence, persistence/DB null, bounds/constraints/defaults, cascade/loading/direction/joins/traversal/execution
- reinterpret `optional` or `multiplicity` via `nullable`
- default, coerce, normalize, or invent `nullable`
- contribute fields/relations to `projectResourceMetadata`
- transform an invalid candidate into a valid Relation by discarding unknown properties before validation
- introduce public `validateRelations` / `validateNullable` / `validateResourceSchema`
- reopen RFC-014 Field floor, RFC-013 `optional` semantics, RFC-011 multiplicity meanings, or RFC-010 `target` semantics
- export `relationsEqual` / name validators / snapshot helpers as public product APIs
- elevate property enumerability to a new RFC-015 product requirement beyond the existing own-key mechanism
- introduce a new M3.12-only plain-object brand test beyond the existing M3.11 candidate-object acceptance mechanism
- apply M3.11's closed Relation key-set classification before the RFC-015 classification table (RFC-015 owns post-object Relation key-set classification)

---

## Package / ownership boundaries

### `@resource-forge/core` owns

- `packages/core/src/resource/*` Relation types, internal relation helpers, validation integration, fixture comments, regression test updates
- tests for RFC-015 nullable shape / boolean exactness / equality / orthogonality to optional and multiplicity / validation / projection non-participation
- Field regression that RFC-014 floor remains authoritative and unchanged

### Consume only

- Existing identity, metadata, annotations, operations, fields, result utilities as already used by M3.1–M3.11

### Must remain untouched (feature-free)

- `packages/nest`, `packages/graphql`, `packages/prisma`, `packages/cli`
- Unrelated workflow tooling bumps

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/core/src/resource/types.ts` | Widen `Relation`; add missing/invalid nullable error variants |
| `packages/core/src/resource/relations.ts` | Closed `{ name, target, multiplicity, optional, nullable }` validation; exact boolean; non-lossy snapshot; equality includes nullable |
| `packages/core/src/resource/relations.test.ts` | Fixture migration; deliberate four-member regressions; boundary classification; invalid/orthogonality/equality/uniqueness |
| `packages/core/src/resource/fields.ts` | Unchanged Field closed shape (confirm RFC-014 retained) |
| `packages/core/src/resource/fields.test.ts` | Keep Field fixtures valid under RFC-014; no Relation-nullable product assertions |
| `packages/core/src/resource/create-resource-with-relations.ts` | Comments + snapshot of widened members |
| `packages/core/src/resource/validate.ts` | Continues to call `checkRelations` (likely body-stable) |
| `packages/core/src/resource/validate.test.ts` | Update Relation fixtures to include `nullable` |
| `packages/core/src/resource/project.test.ts` | Nullable Relation fixtures; still zero relation→metadata contribution; invalid nullable → `invalid_resource` |
| `packages/core/src/resource/project.ts` | **Preferred: no production change.** If a change appears necessary, stop and return to Plan Review. |
| `packages/core/src/resource/operations.test.ts` | Retarget any Relation fixtures that omit `nullable` |
| `packages/core/src/resource/exports.test.ts` | Widened Relation type exported; assert no public nullable validate helper |
| `packages/core/src/resource/index.ts` / `packages/core/src/index.ts` | Export widened Relation error unions as needed |
| `docs/roadmap.md` | Update only as the **final delivery commit** after M6 implementation and the review/refactoring/documentation/validation gates required by the parent M3 workflow are green — rename M3.x → M3.12 ✅ when recording slice complete |

Planning note: file names are layout choices, not product module boundaries required by RFC-015.

---

## TDD / verification strategy

For each implementation task after types: write the relevant failing assertions → implement → green → commit. Fixture migration (Task 1A) is prerequisite compile/test hygiene, **not** the breaking-contract regression.

**Must cover:**

1. Empty `relations` remain valid (regression)
2. Valid Relations with representative `optional × multiplicity × nullable` combinations accepted (including `many + nullable`); order + name + target + multiplicity + optional + nullable preserved
3. **Deliberate** four-member `{ name, target, multiplicity, optional }` Relation → `missing_relation_nullable` (breaking vs M3.11); key order must not matter — old four-member shape must remain represented in tests after fixture migration
4. Shape-classification boundaries (separate tests):
   - `{ name, target }` → `missing_relation_multiplicity`
   - `{ name, target, multiplicity }` → `missing_relation_optional`
   - `{ name, target, multiplicity, optional }` → `missing_relation_nullable`
   - `{ name, target, multiplicity, nullable }` → `invalid_relation_member` (not missing-optional)
   - `{ name, target, multiplicity, optional, default }` → `invalid_relation_member` (not missing-nullable)
5. Present-but-invalid nullable (`"true"`, `1`, `0`, `null`, `"false"`) → `invalid_relation_nullable`
6. Inherited / prototype-derived `nullable` does **not** satisfy the closed contract → `missing_relation_nullable` when own-key set matches `{ name, target, multiplicity, optional }`
7. Invalid names / duplicates / bad target / bad multiplicity / bad optional still map to existing causes (with valid `nullable` present where needed to isolate the cause)
8. **Equality (separate test):** `relationsEqual` differs when only `nullable` differs
9. **Uniqueness (separate test):** two Relations with the same `name` and different `nullable` → `duplicate_relation_name` (equality MUST NOT drive uniqueness)
10. Snapshot ownership: mutating caller-owned candidates MUST NOT change snapshotted members; assert freezes include `nullable`
11. **Validate-before-snapshot:** invalid candidates (missing nullable / invalid nullable / extras) fail in `checkRelations` and MUST NOT produce a widened Relation with an invented `nullable` (even temporarily); verify by call-path inspection + behavioral tests (invalid candidates never appear on constructed Resources) — no instrumentation seam
12. Fields unchanged: Field fixtures remain RFC-014 four-member; no Field product change in this slice
13. Projection: non-empty relations with nullable + empty annotations → no relation-derived metadata entries
14. Projection: invalid missing-nullable Relation members → `invalid_resource`
15. Purity: projection does not mutate Resource / collections
16. Public surface: widened `Relation` / validation error unions exported; no `validateNullable` / `validateRelations`
17. Operations / annotations / Fields regressions remain green

**Do not:** invent null-element / empty≡null / runtime / wire / persistence / direction-join product assertions; accept dual-shape; default nullable; contribute relations to metadata; reopen Operations or Field floor; require `project.ts` production edits as expected work.

**Regression retarget:** Existing acceptance fixtures that use four-member Relations are migrated in Task 1A. Task 1B keeps deliberate four-member candidates so the breaking contract remains protected. Tests that previously treated Relation `nullable` as an illegal extra become acceptance cases (or move the extras case to a different premature property such as `default`).

---

### Task 1: Contract types + tests (breaking widen)

**Files:**
- Modify: `packages/core/src/resource/types.ts`
- Modify: `packages/core/src/resource/relations.test.ts`
- Modify: `packages/core/src/resource/validate.test.ts`
- Modify: `packages/core/src/resource/project.test.ts` (fixture shapes)
- Modify: `packages/core/src/resource/operations.test.ts` (any relation fixtures)
- Modify: `packages/core/src/resource/exports.test.ts`
- Confirm: `packages/core/src/resource/fields.test.ts` remains RFC-014 valid (no Field product change)

- [x] **Step 1: Widen types** — apply the planning-aid `Relation` / `RelationValidationError` unions above (add only the two new nullable causes; retain all prior Relation causes including optional/multiplicity)

#### 1A — Fixture migration (prerequisite; not the breaking regression)

- [x] **Step 2A: Update compile-time / intended-valid fixtures** to the five-member closed shape wherever they represent Relations that should remain **valid** after M3.12 (including `validate.test.ts` / `project.test.ts` / `operations.test.ts` acceptance fixtures). Retarget Relation “extra member” cases that currently use `nullable: true` to use e.g. `default: ""` instead. Keep Field fixtures at RFC-014 four-member shape.

These updates are prerequisite migration so the suite can compile and so intended-valid cases stay meaningful. They are **not** a substitute for Task 1B.

#### 1B — Deliberate four-member breaking regressions

- [x] **Step 2B: Add explicit tests** that construct the **old four-member** shape and assert `missing_relation_nullable` (including key-order independence). The old four-member candidate MUST remain represented deliberately after 1A.

Deliberate invalid-shape candidates in Task 1B/1C MUST be supplied through the existing test seam's accepted candidate/input type (or an `unknown` boundary where required), so the test exercises **runtime validation** rather than failing solely because the TypeScript `Relation` type requires `nullable`. Follow the existing M3.11 test seam rather than inventing a public API.

```ts
it('rejects four-member Relations as missing_relation_nullable (breaking)', () => {
  const candidates: unknown[] = [
    {
      name: 'customer',
      target: { namespace: 'crm', name: 'Customer' },
      multiplicity: 'one',
      optional: false,
    },
    {
      optional: false,
      multiplicity: 'one',
      target: { namespace: 'crm', name: 'Customer' },
      name: 'customer',
    },
  ];
  for (const candidate of candidates) {
    const resource = createResourceWithRelationsForTests(identity, [candidate as object]);
    expect(resource.ok).toBe(false);
    // cause: missing_relation_nullable
  }
});
```

#### 1C — New invalid / orthogonality / equality / uniqueness / classification tests

- [x] **Step 2C: Add new RFC-015 tests** that initially fail until Task 2 implements validation (same runtime-validation / `unknown` seam rule as 1B for deliberately invalid shapes):

```ts
it('accepts closed Relations with optional × multiplicity × nullable combinations', () => {
  const resource = createResourceWithRelationsForTests(identity, [
    {
      name: 'customer',
      target: { namespace: 'crm', name: 'Customer' },
      multiplicity: 'one',
      optional: false,
      nullable: false,
    },
    {
      name: 'sponsor',
      target: { namespace: 'crm', name: 'Customer' },
      multiplicity: 'one',
      optional: false,
      nullable: true,
    },
    {
      name: 'tags',
      target: { namespace: 'crm', name: 'Tag' },
      multiplicity: 'many',
      optional: true,
      nullable: false,
    },
    {
      name: 'aliases',
      target: { namespace: 'crm', name: 'Alias' },
      multiplicity: 'many',
      optional: true,
      nullable: true,
    },
  ]);
  expect(resource.ok).toBe(true);
  // expect preserved name+target+multiplicity+optional+nullable order
});

it('classifies shape boundaries without collapsing missing causes', () => {
  // { name, target } → missing_relation_multiplicity
  // { name, target, multiplicity } → missing_relation_optional
  // { name, target, multiplicity, optional } → missing_relation_nullable
  // { name, target, multiplicity, nullable } → invalid_relation_member
  // { name, target, multiplicity, optional, default: '' } → invalid_relation_member
});

it('requires relation nullable to be an own property', () => {
  const relation = Object.create({ nullable: true });
  relation.name = 'customer';
  relation.target = { namespace: 'crm', name: 'Customer' };
  relation.multiplicity = 'one';
  relation.optional = false;

  const result = createResourceWithRelationsForTests(identity, [relation]);
  expect(result.ok).toBe(false);
  // cause: missing_relation_nullable — inherited nullable does not satisfy the closed contract
});

it('rejects non-boolean relation nullable as invalid_relation_nullable', () => {
  for (const nullable of ['true', 1, 0, null, 'false'] as const) {
    const resource = createResourceWithRelationsForTests(identity, [
      {
        name: 'customer',
        target: { namespace: 'crm', name: 'Customer' },
        multiplicity: 'one',
        optional: false,
        nullable,
      },
    ]);
    expect(resource.ok).toBe(false);
    // cause: invalid_relation_nullable
  }
});

it('relationsEqual is false when only nullable differs', () => {
  // separate from uniqueness
});

it('rejects duplicate RelationName even when nullable differs', () => {
  const resource = createResourceWithRelationsForTests(identity, [
    {
      name: 'customer',
      target: { namespace: 'crm', name: 'Customer' },
      multiplicity: 'one',
      optional: false,
      nullable: false,
    },
    {
      name: 'customer',
      target: { namespace: 'crm', name: 'Customer' },
      multiplicity: 'one',
      optional: false,
      nullable: true,
    },
  ]);
  expect(resource.ok).toBe(false);
  // cause: duplicate_relation_name
});
```

- [x] **Step 3: Run** `pnpm --filter @resource-forge/core test` — expect FAIL specifically from Task 1B/1C assertions (and type errors where five-member Relations are required by types but validation not yet widened). Fixture migration alone MUST NOT be treated as proving the breaking contract.
- [x] **Step 4: Commit** `test(core): add failing M3.12 Relation nullable contract tests`

### Task 2: Validate-before-snapshot + validation integration

**Files:**
- Modify: `packages/core/src/resource/relations.ts`
- Modify: fixture comment files as needed
- Confirm: `packages/core/src/resource/validate.ts` continues to call `checkRelations`
- Confirm: `packages/core/src/resource/fields.ts` unchanged for closed Field shape (RFC-014 retained)

- [x] **Step 1: Widen `checkRelations`**

Apply the Relation shape-classification table above. Recommended per-member order (planning aid; preserve reject-don’t-repair):

1. Apply the **existing M3.11 candidate-object acceptance mechanism** (same object/structural mechanism; no new M3.12 brand semantics). Do **not** apply M3.11's closed Relation key-set classification here.
2. Apply the **RFC-015 own-key classification table** (this plan owns post-object Relation key-set classification):
   - if **own** key `multiplicity` is absent → `missing_relation_multiplicity` when the candidate's **order-independent own key set** is exactly `{ name, target }`; otherwise `invalid_relation_member` per the table
   - if **own** key `optional` is absent → `missing_relation_optional` when the candidate's **order-independent own key set** is exactly `{ name, target, multiplicity }`; otherwise `invalid_relation_member`
   - if **own** key `nullable` is absent → `missing_relation_nullable` when the candidate's **order-independent own key set** is exactly `{ name, target, multiplicity, optional }`; otherwise `invalid_relation_member`
   - own key set must be exactly `{ name, target, multiplicity, optional, nullable }` → else `invalid_relation_member`
3. `name` string + `validateRelationName` → `invalid_relation_name`
4. uniqueness-by-name → `duplicate_relation_name`
5. `target` via existing RFC-010 / RFC-001 validation → else `invalid_relation_target`
6. `multiplicity` exact vocabulary → else `invalid_relation_multiplicity`
7. `optional` exact boolean → else `invalid_relation_optional` with `optional: unknown`
8. `nullable` exact boolean → else `invalid_relation_nullable` with `nullable: unknown`
9. push `{ name, target, multiplicity, optional, nullable }`

Key-set comparison is order-independent. Inherited `nullable` does not count. MUST NOT strip extras, invent `nullable`, coerce stand-ins, validate live associations, invent null-element semantics, or equate empty collections with null. MUST NOT reclassify `{ name, target, multiplicity, nullable }` as missing-optional or `{ name, target, multiplicity, optional, default }` as missing-nullable.

- [x] **Step 2: Widen `snapshotRelations` / `relationsEqual` (module-local only)**

Freeze widened closed members. Equality MUST include exact `nullable`. MUST NOT barrel-export these helpers. `snapshotRelations` accepts **already-valid** Relations only.

- [x] **Step 3: Verify validate-before-snapshot by implementation call path and behavioral tests** — `checkRelations` rejects missing/invalid/extra-bearing candidates before `snapshotRelations` receives any candidate; invalid candidates never appear in the constructed Resource. Do **not** add a public or production instrumentation seam solely to test invocation order.
- [x] **Step 4: Update fixture comments** to say freeze `{ name, target, multiplicity, optional, nullable }` and note association-reference nullability
- [x] **Step 5: Green** Task 1B/1C nullable acceptance + rejection + classification + equality/uniqueness causes
- [x] **Step 6: Commit** `feat(core): require Relation nullable boolean (RFC-015)`

### Task 3: Projection non-participation + coexistence regressions

**Files:**
- Modify: `packages/core/src/resource/project.test.ts` (nullable Relation fixtures / regression assertions)
- Prefer **no** modification to `packages/core/src/resource/project.ts`

M3.12’s projection requirement is satisfied if the existing projection (1) revalidates the Resource, (2) rejects invalid nullable Relations through Resource validation, and (3) projects only identity + annotations. Task 3 is primarily regression tests.

If `project.ts` appears to need a production change to accommodate Relation nullable, **stop and return to Plan Review** rather than treating that edit as expected work.

- [x] **Step 1: Ensure projection tests** use widened Relations; assert zero relation-derived entries; invalid missing-nullable members → `invalid_resource`; purity
- [x] **Step 2: Confirm implementation** still `createResourceMetadata(identity, [...annotations])` with **no** `project.ts` production change (preferred)
- [x] **Step 3: Full suite green including operations / annotations / fields**
- [x] **Step 4: Commit** `test(core): nullable relations do not contribute to metadata projection`

### Task 4: Exports + final delivery hygiene

**Files:**
- Modify: `packages/core/src/resource/exports.test.ts` / barrels as needed
- Modify: `docs/roadmap.md` — **only** after M6 implementation, review, refactoring, documentation, and validation gates required by the parent M3 workflow are green

Task checkboxes in this document are completed during **M6 execution**. M5 acceptance records only Status **Accepted** (plus M5 rationale) — it does not complete Task 1–4 checkboxes.

- [x] **Step 1: Export smoke** — widened `Relation` / error unions as locked; confirm no `validateNullable` / `validateRelations`
- [x] **Step 2: Full `pnpm --filter @resource-forge/core test` green**
- [x] **Step 3: Update `docs/roadmap.md` only after M6+ gates** — record M3.12 ✅; clear “delivery slice pending” wording
- [x] **Step 4: Final delivery commit** `docs: record M3.12 relation nullability slice complete` — this commit is the **last** delivery commit for the slice, not part of ordinary mid-implementation sequencing

---

## Traceability

| Task | RFC-015 sections |
| --- | --- |
| Task 1 | §§1, 3–5 closed Relation shape, exact boolean, equality including nullable, public surface |
| Task 2 | §§4–7 validation ownership, missing vs invalid nullable, validate-before-snapshot, orthogonality to optional/multiplicity, supersession of RFC-013 Relation floor |
| Task 3 | §8 projection non-participation (including validation-gate consequence) |
| Task 4 | §10 compatibility / §16 implementation gate / roadmap hygiene |

---

## Explicit deferrals

- Null elements inside a `many` association
- Empty-collection ≡ null / empty-collection vs absent-relation representation
- Runtime presence / value enforcement of association-reference nullability against instances or payloads
- Wire / serialization representation of association-reference null vs absence
- Persistence / database nullability / ORM mapping
- Bounds, constraints, defaults, descriptions, per-member annotations
- Cascade, loading/fetch, direction/inverse, joins / local-field handles, traversal, execution
- Operation optionality, kind, signature, input/output, execution (RFC-012 unchanged)
- Annotation vocabulary expansion
- Field → `ResourceMetadata` projection
- Field floor changes (RFC-014 retained)
- Dual-shape transitional validity
- Public Resource equality / builders
- Public `validateRelations` / `validateNullable` / `validateResourceSchema`
- Host adapters
- New enumerability or plain-object brand product semantics beyond the existing M3.11 candidate-object acceptance mechanism

---

## M5 Plan Review checklist (for reviewers)

- [x] No new product semantics beyond RFC-015
- [x] Relation closed exactly `{ name, target, multiplicity, optional, nullable }`; Field closed shape unchanged (RFC-014)
- [x] Exact boolean only; omit invalid; no defaults; no dual-shape
- [x] `nullable: true` / `false` mean association reference may/must be non-null (declaration constraints only; association-reference nullability)
- [x] Missing vs invalid `nullable` distinct causes on Relation
- [x] Shape classification table + order-independent own key-set comparison normative
- [x] Explicit boundary tests: `{name,target}` / `{name,target,multiplicity}` / `{name,target,multiplicity,optional}` / `{name,target,multiplicity,nullable}` / `{name,target,multiplicity,optional,default}`
- [x] Own-property `nullable` required (inherited does not satisfy closed contract); enumerability not newly elevated beyond M3.11 mechanism
- [x] M3.11 candidate-object acceptance only first; RFC-015 owns post-object Relation key-set classification (no premature M3.11 closed-key rejection)
- [x] Equality includes `nullable`; uniqueness remains name-only; tested separately
- [x] `nullable` fully orthogonal to RFC-013 `optional` and RFC-011 `multiplicity` (including `many + nullable` as valid declaration without defining null elements / empty≡null)
- [x] Validate-before-snapshot; no silent strip/default/coerce; no invented nullable on invalid candidates; verified without instrumentation seam
- [x] Task 1 splits fixture migration (1A) from deliberate four-member regressions (1B) and new assertions (1C); invalid shapes use runtime test seam/`unknown`
- [x] `checkRelations` remains the single Relation validation implementation reused by fixtures and `validateResource`
- [x] Fields / Operations / annotations / projection non-participation unchanged; `project.ts` preferred untouched
- [x] Prior Relation “`nullable` as extra” tests explicitly retargeted
- [x] Field floor remains RFC-014 (no Field product change)
- [x] Task checkboxes are M6 execution markers; M5 Accept updates Status only
- [x] Task 4 roadmap/docs commit is final delivery only (after M6+ gates)
- [x] TDD tasks executable without inventing sequencing
- [x] M6 must not start until this plan is **Accepted**
- [x] Delivery packaging: one PR for [#53](https://github.com/rexescario-dev/resource-forge/issues/53) carries Accepted plan + implementation (process constraint; not a substitute for M5 Accept)

---

## Gate

**M5 Accepted.** M6 implementation may begin under this plan and tracking issue #53. Do not invent null-element/empty≡null/runtime/wire/persistence/direction-join semantics, dual-shape compatibility, or default/coerce/strip `nullable`. No invalid Relation may become valid through stripping, defaulting, coercion, or normalization before validation. Apply M3.11 candidate-object acceptance only before RFC-015 key-set classification; deliberate invalid-shape tests must exercise runtime validation.


---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.12 Relation Nullability |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/53 |
| M4 | Plan **Accepted** |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | **Approved** |
| M8 | N/A |
| M9 | N/A |
| Branch | `feat/m3-12-relation-nullability` |
| PR | https://github.com/rexescario-dev/resource-forge/pull/54 |
| Status | **Ready for merge** |

### Shipped

- Widened `Relation` to `{ name, target, multiplicity, optional, nullable }` with required exact-boolean association-reference `nullable`
- Distinct `missing_relation_nullable` / `invalid_relation_nullable` causes; own-property + order-independent key-set classification
- Boundary classification including four-member → missing nullable; extras → invalid member
- Validate-before-snapshot; equality includes `nullable`; uniqueness remains name-only; optional × multiplicity × nullable orthogonality (including `many + nullable`)
- Fields unchanged at RFC-014; no `project.ts` production change
- No public `validateNullable` / `validateRelations`

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (per-file vitest; CI `ci` SUCCESS on #54) |
| Typecheck | **Passed** (`tsc --noEmit` in `@resource-forge/core`) |
| Lint | Skipped |
| Build | Skipped |
| Package validation | Skipped |

### Next Gate

**Merge** (then closeout as Slice complete)

**M7 Approved** (2026-08-08). Faithful RFC-015 / plan realization. Closed Relation `{ name, target, multiplicity, optional, nullable }`; association-reference nullability only; missing vs invalid nullable causes; own-property + order-independent key sets; validate-before-snapshot; optional×multiplicity×nullable orthogonality; Fields unchanged; no projection contribution; no public nullable validate helpers. CI green on #54.
