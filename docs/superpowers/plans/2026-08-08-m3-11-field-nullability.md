# M3.11 Field Nullability — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-014. Reuse M3.1–M3.10 Resource / schema / field / relation / operation / annotation / projection surfaces. Do **not** implement Relation nullability, runtime presence/value enforcement, wire/serialization of absence vs null, empty-collection vs absent, persistence/DB null, bounds/constraints/defaults, cascade/loading/direction/joins, Operation optionality / kind / signature / execution, annotation vocabulary, field→metadata projection, `"null"` as a `FieldType`, dual-shape compatibility, or public `validateFields` / `validateNullable` / `validateResourceSchema`.

**Status:** Accepted  
**M5:** Accepted (2026-08-08) — Plan Review; no plan blockers after three clarifications: M3.10 candidate-object acceptance only (RFC-014 owns Field key-set classification); deliberate invalid-shape tests must exercise runtime validation via the existing test seam/`unknown` boundary; validate-before-snapshot verified by call-path + behavior without instrumentation; one PR with implementation for #48  
**Tracking:** [#48](https://github.com/rexescario-dev/resource-forge/issues/48)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted) — M3.11 was blocked on Field Nullability RFC  
**Source RFC:** RFC-014 Field Nullability (**Accepted**) — amends Field member floor; partial supersession of RFC-013 Field closed-member / equality text  
**Depends on:** RFC-005 (**Accepted**); RFC-006 (**Accepted**); RFC-007 (**Accepted**, Field collection retained); RFC-009 (**Accepted**, `FieldType` retained unchanged); RFC-013 (**Accepted**, `optional` retained and orthogonal; Field shape partially superseded); RFC-014 (**Accepted**); M3.1–M3.10 shipped  
**Package:** `@resource-forge/core`  
**Slice:** M3.11 only — required Field `nullable: boolean` (value-nullability declaration constraints only); Relations unchanged; breaking vs M3.10 `{ name, type, optional }` Fields; no dual-shape; validate-before-snapshot; projection non-participation unchanged; Operations unchanged

**Goal:** Widen every Field from `{ name, type, optional }` to exactly `{ name: FieldName; type: FieldType; optional: boolean; nullable: boolean }`, validate closed shape + retained upstream rules + exact boolean `nullable` as part of Resource validity via `checkFields`, redefine Field value equality to include `nullable`, keep `nullable` fully orthogonal to RFC-013 `optional` (all four combinations valid), leave Relations at `{ name, target, multiplicity, optional }`, and keep `projectResourceMetadata` free of any Field/Relation→metadata contribution.

**Architecture:**

```text
candidate fields
          │
          ▼
 validate candidate member shape   ← Field exactly `{ name, type, optional, nullable }`
                                    │ (extras → invalid_field_member; no strip)
          │
          ▼
 validate retained member rules     ← FieldName + uniqueness + FieldType (RFC-007/009);
                                    │ optional exact boolean (RFC-013)
          │
          ▼
 validate nullable                  ← absent → missing_field_nullable;
                                    │ present but not exact boolean → invalid_field_nullable
          │
          ▼
 snapshot exact valid members       ← freeze widened closed shapes; never invent default nullable
          │
          ▼
       Resource.schema.fields
          │
          ▼
    validateResource               ← authoritative Resource gate (delegates to checkFields)
          │
          ▼
 projectResourceMetadata           ← revalidate Resource; annotation-derived metadata only;
                                      fields/relations contribute nothing
```

**Invariant:** No implementation step may transform an invalid candidate into a valid Field by discarding information (including stripping unknown properties or inventing a default `nullable`) before validation. Invalid candidates MUST fail in `checkFields` **before** any call path that materializes a widened Field (including `snapshotFields`); implementations MUST NOT produce even a temporary `{ …, nullable: false }` (or `true`) from a missing/invalid/`extra`-bearing candidate.

`nullable` is **value-nullability declaration only** — not declaration presence (`optional`), runtime instance checking, wire representation, or persistence. Uniqueness within `fields` remains **by name only**. Field value equality is exact `name` **and** exact `type` **and** exact `optional` **and** exact `nullable`. `nullable` MUST NOT affect or reinterpret `optional`. Relations MUST NOT gain `nullable`; Relation nullability remains deferred by name.

**Tech Stack:** TypeScript strict, Vitest (existing `packages/core` scripts)

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-014 Accepted
       ↓
M3.11 plan Draft (this document)
       ↓
M5 Plan Review → Accepted (Status header only; task checkboxes stay open)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M9 / validation as required by parent M3 workflow
       ↓
one delivery PR for tracking #48 (Accepted plan + implementation together)
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M3.11 delivery slice (Accepted plan + implementation). Do **not** open a separate plan-only merge PR as a required gate. M5 Accept is recorded by updating this plan’s **Status** to Accepted (and M5 rationale); it is not the same event as merging the delivery PR.

**Task checkboxes:** Completed during **M6 execution** only. M5 acceptance records only that the plan is **Accepted** — it does **not** mark implementation task checkboxes complete.

---

## Locked decisions (export / shape review — planning aids)

These freeze the M3.11 implementation surface. They MUST NOT invent product semantics beyond RFC-014 (+ retained RFC-007 / RFC-009 / RFC-013 / M3.10 Field validation mechanism rules).

| Decision | Lock |
| --- | --- |
| `nullable` | Exact boolean `true \| false` only. No coerce, normalize, string/number/`null` stand-ins, or omit-as-default. |
| Meaning | `true` → declared value **may be null**; `false` → declared value **must be non-null**. Schema-declaration constraints only (not runtime checks). |
| `Field` | `{ readonly name: FieldName; readonly type: FieldType; readonly optional: boolean; readonly nullable: boolean }` **exactly**. No additional members. |
| `Relation` | Unchanged `{ readonly name; readonly target; readonly multiplicity; readonly optional }` **exactly**. `nullable` on a Relation → `invalid_relation_member`. |
| Missing Field `nullable` | `missing_field_nullable` when own key `nullable` is absent and the candidate's **order-independent** own key set is exactly `{ name, type, optional }` (breaking vs M3.10 three-member Fields). |
| Key-set comparison | Order-independent. Enumeration **order** MUST NOT be treated as semantic. Reuse the M3.10 Field own-key / `hasOwnProperty` mechanism for detecting own members; do **not** invent a new RFC-014 requirement that members be enumerable. (`Object.keys()` may remain an implementation detail of the existing M3.10 helper only insofar as M3.10 already uses it — enumerability is not elevated to product contract by this plan.) |
| Own-property `nullable` | `nullable` MUST be an **own** property (RFC-014 / this plan). Inherited / prototype-derived `nullable` does **not** satisfy the closed Field contract (classify as missing-nullable when the own-key set matches the special case). |
| Present-but-invalid `nullable` | `invalid_field_nullable` (not exact boolean). |
| Extra Field member | `invalid_field_member` (e.g. premature `default`, constraints). Never stripped. |
| Boundary classification | `{ name, type }` → `missing_field_optional`; `{ name, type, optional }` → `missing_field_nullable`; `{ name, type, nullable }` → `invalid_field_member` (not missing-optional); `{ name, type, optional, default }` → `invalid_field_member` (not missing-nullable). |
| Retained optional missing special case | `{ name, type }` (own keys, order-independent) still → `missing_field_optional` when `optional` own key absent. |
| Orthogonality | All four `optional × nullable` combinations valid. |
| Uniqueness | Still by name only (RFC-007) — not by `(name, nullable)` or `(name, optional, nullable)`. Equality MUST NOT drive uniqueness. |
| `FieldType` | Unchanged (RFC-009). `"null"` is not a FieldType. |
| `operations` / Relations | Unchanged. |
| Structural candidate acceptance | Apply the **existing M3.10 candidate-object acceptance mechanism** first **only** for the candidate being an acceptable structural object; do **not** apply M3.10's closed Field key-set classification before the RFC-014 classification table. **RFC-014 owns the post-object key-set classification for Field members.** Do **not** introduce a new M3.11-only “plain object brand” product semantic. |
| Snapshot vs validation | **Separated, non-lossy.** Validate candidates **before** materializing widened closed members. `snapshotFields` freezes already-valid members only; MUST NOT invent default `nullable`; MUST NOT be reachable for invalid candidates. |
| Non-empty Resource construction | **No public builder.** Tests use existing **internal** `createResourceWithFieldsForTests` / `createResourceWithRelationsForTests` / `createResourceWithOperationsForTests`. |
| Internal helpers | `checkFields` / `snapshotFields` / `fieldsEqual` remain **module-local same-package seams** (MUST NOT be barrel-/package-exported). |
| Validation ownership | Part of `validateResource` via schema (`checkFields`). No public `validateFields` / `validateNullable` / `validateResourceSchema`. |
| Schema error taxonomy | Prior Field causes retained plus **`missing_field_nullable`** and **`invalid_field_nullable`**. No new Relation nullable causes. |
| Projection | Still annotation-only. Fields/Relations MUST NOT contribute entries. Invalid nullable still fails the projection gate. **Preferred:** no production change to `project.ts`. |
| Equality helpers | **Test/internal only.** `fieldsEqual` includes exact `nullable`. |
| Compose / registry | SHALL NOT require compose/registry; SHALL NOT validate live instance values against nullability. |

---

## Field shape-classification table (normative for this plan)

Per candidate Field member: apply the **existing M3.10 candidate-object acceptance mechanism** first **only** for the candidate being an acceptable structural object (reject with `invalid_field_member` when that object-acceptance mechanism rejects). Do **not** apply M3.10's closed Field key-set classification before this table. **RFC-014 owns the post-object key-set classification for Field members:**

| Own-key / property condition | Cause |
| --- | --- |
| Own key `optional` absent and own key set exactly `{ name, type }` | `missing_field_optional` (RFC-013 / M3.10 retained) |
| Own key `nullable` absent and own key set exactly `{ name, type, optional }` | `missing_field_nullable` |
| Own key set not exactly `{ name, type, optional, nullable }` after the above special cases do not apply (or extras present) | `invalid_field_member` |
| Own key `nullable` present but value not exact boolean | `invalid_field_nullable` |
| Retained name / duplicate / type / optional failures | Existing causes (`invalid_field_name`, `duplicate_field_name`, `invalid_field_type`, `invalid_field_optional`, …) |

**Explicit boundary mappings (must be tested):**

```text
{ name, type }                         → missing_field_optional
{ name, type, optional }               → missing_field_nullable
{ name, type, nullable }               → invalid_field_member   (NOT missing_field_optional)
{ name, type, optional, default }      → invalid_field_member   (NOT missing_field_nullable)
{ name, type, optional, nullable }     → proceed to member-field validation (name/type/optional/nullable)
```

Inherited-only `nullable` does not count as present. Key-set comparisons are order-independent. Special-case ordering MUST NOT be refactored into a generic “recursive missing property” check that would reclassify `{ name, type, nullable }` as missing-optional or `{ name, type, optional, default }` as missing-nullable.

---

## M3.11 public contract surface

| Symbol | Kind | Role |
| --- | --- | --- |
| `Field` | type | `{ readonly name; readonly type; readonly optional; readonly nullable }` |
| `FieldValidationError` | type | Prior causes + `missing_field_nullable` + `invalid_field_nullable` |
| `Relation` | type | Unchanged four-member shape |
| `RelationValidationError` | type | Unchanged (no nullable variants) |
| `ResourceSchema` | type | Unchanged collection slots; Field members carry `nullable` |
| `validateResource` | function | Validates nullable rules + retained composed rules |
| `createResource` / `createEmptyResourceSchema` | function | Still empty collections |
| `projectResourceMetadata` | function | Identity + annotation entries only |
| Operation / annotation / identity surfaces | retained | Unchanged |

**Not public in M3.11:**

- `validateFields` / `validateNullable` / `validateResourceSchema`
- `validateFieldName` / `snapshotFields` / `fieldsEqual` as product APIs
- Public Resource builders
- Relation nullability, runtime value checks, wire/persistence semantics, bounds, direction/join/cascade/load
- Dual-shape migration helpers
- `"null"` FieldType / type unions
- Field/Relation→metadata projection

**Retain:** M2–M3.10 exports; `PACKAGE_NAME` / `PACKAGE_VERSION`.

### Validation error shape (planning aid)

```ts
type Field = {
  readonly name: FieldName;
  readonly type: FieldType;
  readonly optional: boolean;
  readonly nullable: boolean;
};

type FieldValidationError =
  | { readonly code: 'invalid_field_name'; readonly index: number; readonly name: string }
  | { readonly code: 'duplicate_field_name'; readonly index: number; readonly name: string }
  | { readonly code: 'invalid_field_member'; readonly index: number }
  | { readonly code: 'invalid_field_type'; readonly index: number; readonly type: unknown }
  | { readonly code: 'missing_field_optional'; readonly index: number }
  | { readonly code: 'invalid_field_optional'; readonly index: number; readonly optional: unknown }
  | { readonly code: 'missing_field_nullable'; readonly index: number }
  | { readonly code: 'invalid_field_nullable'; readonly index: number; readonly nullable: unknown };
```

---

## Constraints (from Accepted RFC-014 + retained upstream RFCs)

### SHALL

- represent every Field as exactly `{ name, type, optional, nullable }` after this slice is implemented
- require `nullable` on every Field; reject absence as `missing_field_nullable` when the own-key special case applies
- accept only exact boolean `true` / `false` for `nullable`; reject stand-ins as `invalid_field_nullable`
- redefine Field value equality as exact `name` **and** exact `type` **and** exact `optional` **and** exact `nullable`
- keep `nullable` fully orthogonal to `optional` (all four combinations valid)
- retain RFC-007 collection rules (order, uniqueness-by-name, empty validity, snapshot ownership)
- retain RFC-009 `FieldType`, RFC-013 `optional` semantics, Relation floor, RFC-012 Operations
- validate candidates **before** any materialization of widened closed members
- keep missing vs invalid `nullable` distinct; no silent coercion/defaulting/repair
- leave projection free of field/relation contributions while still revalidating the Resource
- leave Relations unchanged; treat Relation `nullable` as an extra member (`invalid_relation_member`)

### SHALL NOT

- accept three-member Fields after this slice (no dual-shape period)
- invent Relation nullability, runtime value enforcement, wire/serialization of absence vs null, empty-vs-absent product semantics, persistence/DB null, bounds/constraints/defaults, cascade/loading/direction/joins
- introduce `"null"` as a `FieldType` or reinterpret `optional` via `nullable`
- default, coerce, normalize, or invent `nullable`
- contribute fields/relations to `projectResourceMetadata`
- transform an invalid candidate into a valid Field by discarding unknown properties before validation
- introduce public `validateFields` / `validateNullable` / `validateResourceSchema`
- reopen RFC-009 type vocabulary, RFC-013 `optional` semantics, or Relation member floor
- export `fieldsEqual` / name validators / snapshot helpers as public product APIs
- elevate property enumerability to a new RFC-014 product requirement beyond the existing M3.10 own-key mechanism
- introduce a new M3.11-only plain-object brand test beyond the existing M3.10 candidate-object acceptance mechanism
- apply M3.10's closed Field key-set classification before the RFC-014 classification table (RFC-014 owns post-object Field key-set classification)

---

## Package / ownership boundaries

### `@resource-forge/core` owns

- `packages/core/src/resource/*` Field types, internal field helpers, validation integration, fixture comments, regression test updates
- tests for RFC-014 nullable shape / boolean exactness / equality / orthogonality to optional / validation / projection non-participation
- Relation regression that `nullable` remains an illegal Relation extra

### Consume only

- Existing identity, metadata, annotations, operations, result utilities as already used by M3.1–M3.10

### Must remain untouched (feature-free)

- `packages/nest`, `packages/graphql`, `packages/prisma`, `packages/cli`
- Unrelated workflow tooling bumps

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/core/src/resource/types.ts` | Widen `Field`; add missing/invalid nullable error variants |
| `packages/core/src/resource/fields.ts` | Closed `{ name, type, optional, nullable }` validation; exact boolean; non-lossy snapshot; equality includes nullable |
| `packages/core/src/resource/fields.test.ts` | Fixture migration; deliberate three-member regressions; boundary classification; invalid/orthogonality/equality/uniqueness |
| `packages/core/src/resource/relations.ts` | Unchanged closed Relation shape (confirm `nullable` still extra → `invalid_relation_member`) |
| `packages/core/src/resource/relations.test.ts` | Keep/adjust Relation extra-member case using `nullable: true` |
| `packages/core/src/resource/create-resource-with-fields.ts` | Comments + snapshot of widened members |
| `packages/core/src/resource/validate.ts` | Continues to call `checkFields` (likely body-stable) |
| `packages/core/src/resource/validate.test.ts` | Update Field fixtures to include `nullable` |
| `packages/core/src/resource/project.test.ts` | Nullable fixtures; still zero field→metadata contribution; invalid nullable → `invalid_resource` |
| `packages/core/src/resource/project.ts` | **Preferred: no production change.** If a change appears necessary, stop and return to Plan Review. |
| `packages/core/src/resource/operations.test.ts` | Retarget any Field fixtures that omit `nullable` |
| `packages/core/src/resource/exports.test.ts` | Widened Field type exported; assert no public nullable validate helper |
| `packages/core/src/resource/index.ts` / `packages/core/src/index.ts` | Export widened Field error unions as needed |
| `docs/roadmap.md` | Update only as the **final delivery commit** after M6 implementation and the review/refactoring/documentation/validation gates required by the parent M3 workflow are green — rename M3.x → M3.11 ✅ when recording slice complete |

Planning note: file names are layout choices, not product module boundaries required by RFC-014.

---

## TDD / verification strategy

For each implementation task after types: write the relevant failing assertions → implement → green → commit. Fixture migration (Task 1A) is prerequisite compile/test hygiene, **not** the breaking-contract regression.

**Must cover:**

1. Empty `fields` remain valid (regression)
2. Valid Fields with all four `optional × nullable` combinations accepted; order + name + type + optional + nullable preserved
3. **Deliberate** three-member `{ name, type, optional }` Field → `missing_field_nullable` (breaking vs M3.10); key order must not matter — old three-member shape must remain represented in tests after fixture migration
4. Shape-classification boundaries (separate tests):
   - `{ name, type }` → `missing_field_optional`
   - `{ name, type, optional }` → `missing_field_nullable`
   - `{ name, type, nullable }` → `invalid_field_member` (not missing-optional)
   - `{ name, type, optional, default }` → `invalid_field_member` (not missing-nullable)
5. Present-but-invalid nullable (`"true"`, `1`, `0`, `null`, `"false"`) → `invalid_field_nullable`
6. Inherited / prototype-derived `nullable` does **not** satisfy the closed contract → `missing_field_nullable` when own-key set matches `{ name, type, optional }`
7. Invalid names / duplicates / bad type / bad optional still map to existing causes (with valid `nullable` present where needed to isolate the cause)
8. **Equality (separate test):** `fieldsEqual` differs when only `nullable` differs
9. **Uniqueness (separate test):** two Fields with the same `name` and different `nullable` → `duplicate_field_name` (equality MUST NOT drive uniqueness)
10. Snapshot ownership: mutating caller-owned candidates MUST NOT change snapshotted members; assert freezes include `nullable`
11. **Validate-before-snapshot:** invalid candidates (missing nullable / invalid nullable / extras) fail in `checkFields` and MUST NOT produce a widened Field with an invented `nullable` (even temporarily); verify by call-path inspection + behavioral tests (invalid candidates never appear on constructed Resources) — no instrumentation seam
12. Relations unchanged: Relation with `nullable: true` → `invalid_relation_member`
13. Projection: non-empty fields with nullable + empty annotations → no field-derived metadata entries
14. Projection: invalid missing-nullable members → `invalid_resource`
15. Purity: projection does not mutate Resource / collections
16. Public surface: widened `Field` / validation error unions exported; no `validateNullable` / `validateFields`
17. Operations / annotations / Relations regressions remain green

**Do not:** invent Relation nullability/runtime/wire/persistence product assertions; accept dual-shape; default nullable; contribute fields to metadata; reopen Operations or FieldType; require `project.ts` production edits as expected work.

**Regression retarget:** Existing acceptance fixtures that use three-member Fields are migrated in Task 1A. Task 1B keeps deliberate three-member candidates so the breaking contract remains protected. Tests that previously treated Field `nullable` as an illegal extra become acceptance cases (or move the extras case to a different premature property such as `default`).

---

### Task 1: Contract types + tests (breaking widen)

**Files:**
- Modify: `packages/core/src/resource/types.ts`
- Modify: `packages/core/src/resource/fields.test.ts`
- Modify: `packages/core/src/resource/relations.test.ts` (Relation `nullable` remains extra)
- Modify: `packages/core/src/resource/validate.test.ts`
- Modify: `packages/core/src/resource/project.test.ts` (fixture shapes)
- Modify: `packages/core/src/resource/operations.test.ts` (any field fixtures)
- Modify: `packages/core/src/resource/exports.test.ts`

- [x] **Step 1: Widen types** — apply the planning-aid `Field` / `FieldValidationError` unions above (add only the two new nullable causes; retain all prior Field causes including optional)

#### 1A — Fixture migration (prerequisite; not the breaking regression)

- [x] **Step 2A: Update compile-time / intended-valid fixtures** to the four-member closed shape wherever they represent Fields that should remain **valid** after M3.11 (including `validate.test.ts` / `project.test.ts` / `operations.test.ts` acceptance fixtures). Retarget Field “extra member” cases that currently use `nullable: true` to use e.g. `default: ""` instead. Keep / confirm Relation extras case that uses `nullable: true` → `invalid_relation_member`.

These updates are prerequisite migration so the suite can compile and so intended-valid cases stay meaningful. They are **not** a substitute for Task 1B.

#### 1B — Deliberate three-member breaking regressions

- [x] **Step 2B: Add explicit tests** that construct the **old three-member** shape and assert `missing_field_nullable` (including key-order independence). The old three-member candidate MUST remain represented deliberately after 1A.

Deliberate invalid-shape candidates in Task 1B/1C MUST be supplied through the existing test seam's accepted candidate/input type (or an `unknown` boundary where required), so the test exercises **runtime validation** rather than failing solely because the TypeScript `Field` type requires `nullable`. Follow the existing M3.10 test seam rather than inventing a public API.

```ts
it('rejects three-member Fields as missing_field_nullable (breaking)', () => {
  const candidates: unknown[] = [
    { name: 'email', type: 'string', optional: false },
    { optional: false, type: 'string', name: 'email' },
  ];
  for (const candidate of candidates) {
    const resource = createResourceWithFieldsForTests(identity, [candidate as object]);
    expect(resource.ok).toBe(false);
    // cause: missing_field_nullable
  }
});
```

#### 1C — New invalid / orthogonality / equality / uniqueness / classification tests

- [x] **Step 2C: Add new RFC-014 tests** that initially fail until Task 2 implements validation (same runtime-validation / `unknown` seam rule as 1B for deliberately invalid shapes):

```ts
it('accepts closed Fields with all optional × nullable combinations', () => {
  const resource = createResourceWithFieldsForTests(identity, [
    { name: 'email', type: 'string', optional: false, nullable: false },
    { name: 'nickname', type: 'string', optional: true, nullable: false },
    { name: 'bio', type: 'string', optional: false, nullable: true },
    { name: 'middle', type: 'string', optional: true, nullable: true },
  ]);
  expect(resource.ok).toBe(true);
  // expect preserved name+type+optional+nullable order
});

it('classifies shape boundaries without collapsing missing causes', () => {
  // { name, type } → missing_field_optional
  // { name, type, optional } → missing_field_nullable
  // { name, type, nullable } → invalid_field_member
  // { name, type, optional, default: '' } → invalid_field_member
});

it('requires nullable to be an own property', () => {
  const field = Object.create({ nullable: true });
  field.name = 'email';
  field.type = 'string';
  field.optional = false;

  const result = createResourceWithFieldsForTests(identity, [field]);
  expect(result.ok).toBe(false);
  // cause: missing_field_nullable — inherited nullable does not satisfy the closed contract
});

it('rejects non-boolean field nullable as invalid_field_nullable', () => {
  for (const nullable of ['true', 1, 0, null, 'false'] as const) {
    const resource = createResourceWithFieldsForTests(identity, [
      { name: 'email', type: 'string', optional: false, nullable },
    ]);
    expect(resource.ok).toBe(false);
    // cause: invalid_field_nullable
  }
});

it('fieldsEqual is false when only nullable differs', () => {
  // separate from uniqueness
});

it('rejects duplicate FieldName even when nullable differs', () => {
  const resource = createResourceWithFieldsForTests(identity, [
    { name: 'email', type: 'string', optional: false, nullable: false },
    { name: 'email', type: 'string', optional: false, nullable: true },
  ]);
  expect(resource.ok).toBe(false);
  // cause: duplicate_field_name
});

it('rejects Relation nullable as invalid_relation_member', () => {
  const resource = createResourceWithRelationsForTests(identity, [
    {
      name: 'customer',
      target: { namespace: 'crm', name: 'Customer' },
      multiplicity: 'one',
      optional: false,
      nullable: true,
    },
  ]);
  expect(resource.ok).toBe(false);
  // cause: invalid_relation_member
});
```

- [x] **Step 3: Run** `pnpm --filter @resource-forge/core test` — expect FAIL specifically from Task 1B/1C assertions (and type errors where four-member Fields are required by types but validation not yet widened). Fixture migration alone MUST NOT be treated as proving the breaking contract.
- [x] **Step 4: Commit** `test(core): add failing M3.11 Field nullable contract tests`

### Task 2: Validate-before-snapshot + validation integration

**Files:**
- Modify: `packages/core/src/resource/fields.ts`
- Modify: fixture comment files as needed
- Confirm: `packages/core/src/resource/validate.ts` continues to call `checkFields`
- Confirm: `packages/core/src/resource/relations.ts` unchanged for closed shape (still rejects `nullable`)

- [x] **Step 1: Widen `checkFields`**

Apply the Field shape-classification table above. Recommended per-member order (planning aid; preserve reject-don’t-repair):

1. Apply the **existing M3.10 candidate-object acceptance mechanism** (same object/structural mechanism; no new M3.11 brand semantics). Do **not** apply M3.10's closed Field key-set classification here.
2. Apply the **RFC-014 own-key classification table** (this plan owns post-object Field key-set classification):
   - if **own** key `optional` is absent → `missing_field_optional` when the candidate's **order-independent own key set** is exactly `{ name, type }`; otherwise continue / `invalid_field_member` per the table
   - if **own** key `nullable` is absent → `missing_field_nullable` when the candidate's **order-independent own key set** is exactly `{ name, type, optional }`; otherwise `invalid_field_member`
   - own key set must be exactly `{ name, type, optional, nullable }` → else `invalid_field_member`
3. `name` string + `validateFieldName` → `invalid_field_name`
4. uniqueness-by-name → `duplicate_field_name`
5. `type` exact FieldType vocabulary → else `invalid_field_type`
6. `optional` exact boolean → else `invalid_field_optional` with `optional: unknown`
7. `nullable` exact boolean → else `invalid_field_nullable` with `nullable: unknown`
8. push `{ name, type, optional, nullable }`

Key-set comparison is order-independent. Inherited `nullable` does not count. MUST NOT strip extras, invent `nullable`, coerce stand-ins, or validate live instance values. MUST NOT reclassify `{ name, type, nullable }` as missing-optional or `{ name, type, optional, default }` as missing-nullable.

- [x] **Step 2: Widen `snapshotFields` / `fieldsEqual` (module-local only)**

Freeze widened closed members. Equality MUST include exact `nullable`. MUST NOT barrel-export these helpers. `snapshotFields` accepts **already-valid** Fields only.

- [x] **Step 3: Verify validate-before-snapshot by implementation call path and behavioral tests** — `checkFields` rejects missing/invalid/extra-bearing candidates before `snapshotFields` receives any candidate; invalid candidates never appear in the constructed Resource. Do **not** add a public or production instrumentation seam solely to test invocation order.
- [x] **Step 4: Update fixture comments** to say freeze `{ name, type, optional, nullable }`
- [x] **Step 5: Green** Task 1B/1C nullable acceptance + rejection + classification + equality/uniqueness causes
- [x] **Step 6: Commit** `feat(core): require Field nullable boolean (RFC-014)`

### Task 3: Projection non-participation + coexistence regressions

**Files:**
- Modify: `packages/core/src/resource/project.test.ts` (nullable fixtures / regression assertions)
- Prefer **no** modification to `packages/core/src/resource/project.ts`

M3.11’s projection requirement is satisfied if the existing projection (1) revalidates the Resource, (2) rejects invalid nullable Fields through Resource validation, and (3) projects only identity + annotations. Task 3 is primarily regression tests.

If `project.ts` appears to need a production change to accommodate nullable, **stop and return to Plan Review** rather than treating that edit as expected work.

- [x] **Step 1: Ensure projection tests** use widened Fields; assert zero field-derived entries; invalid missing-nullable members → `invalid_resource`; purity
- [x] **Step 2: Confirm implementation** still `createResourceMetadata(identity, [...annotations])` with **no** `project.ts` production change (preferred)
- [x] **Step 3: Full suite green including operations / annotations / relations**
- [x] **Step 4: Commit** `test(core): nullable fields do not contribute to metadata projection`

### Task 4: Exports + final delivery hygiene

**Files:**
- Modify: `packages/core/src/resource/exports.test.ts` / barrels as needed
- Modify: `docs/roadmap.md` — **only** after M6 implementation, review, refactoring, documentation, and validation gates required by the parent M3 workflow are green

Task checkboxes in this document are completed during **M6 execution**. M5 acceptance records only Status **Accepted** (plus M5 rationale) — it does not complete Task 1–4 checkboxes.

- [x] **Step 1: Export smoke** — widened `Field` / error unions as locked; confirm no `validateNullable` / `validateFields`
- [x] **Step 2: Full `pnpm --filter @resource-forge/core test` green**
- [x] **Step 3: Update `docs/roadmap.md` only after M6+ gates** — record M3.11 ✅; clear “delivery slice pending” wording
- [x] **Step 4: Final delivery commit** `docs: record M3.11 field nullability slice complete` — this commit is the **last** delivery commit for the slice, not part of ordinary mid-implementation sequencing

---

## Traceability

| Task | RFC-014 sections |
| --- | --- |
| Task 1 | §§1, 3–5 closed Field shape, exact boolean, equality including nullable, public surface |
| Task 2 | §§4–7 validation ownership, missing vs invalid nullable, validate-before-snapshot, orthogonality to optional, supersession of RFC-013 Field floor |
| Task 3 | §8 projection non-participation (including validation-gate consequence) |
| Task 4 | §10 compatibility / §16 implementation gate / roadmap hygiene |

---

## Explicit deferrals

- Relation nullability (deferred by name)
- Runtime presence / value enforcement against instances or payloads
- Wire / serialization representation of absence vs null
- Empty-collection vs absent-relation representation
- Persistence / database nullability / ORM mapping
- Bounds, constraints, defaults, descriptions, per-member annotations
- Cascade, loading/fetch, direction/inverse, joins / local-field handles
- `"null"` as a `FieldType` / type unions
- Operation optionality, kind, signature, input/output, execution (RFC-012 unchanged)
- Annotation vocabulary expansion
- Field → `ResourceMetadata` projection
- Dual-shape transitional validity
- Public Resource equality / builders
- Public `validateFields` / `validateNullable` / `validateResourceSchema`
- Host adapters
- New enumerability or plain-object brand product semantics beyond the existing M3.10 candidate-object acceptance mechanism

---

## M5 Plan Review checklist (for reviewers)

- [x] No new product semantics beyond RFC-014
- [x] Field closed exactly `{ name, type, optional, nullable }`; Relation closed shape unchanged
- [x] Exact boolean only; omit invalid; no defaults; no dual-shape
- [x] `nullable: true` / `false` mean declared value may/must be non-null (declaration constraints only)
- [x] Missing vs invalid `nullable` distinct causes on Field
- [x] Shape classification table + order-independent own key-set comparison normative
- [x] Explicit boundary tests: `{name,type}` / `{name,type,optional}` / `{name,type,nullable}` / `{name,type,optional,default}`
- [x] Own-property `nullable` required (inherited does not satisfy closed contract); enumerability not newly elevated beyond M3.10 mechanism
- [x] M3.10 candidate-object acceptance only first; RFC-014 owns post-object Field key-set classification (no premature M3.10 closed-key rejection)
- [x] Equality includes `nullable`; uniqueness remains name-only; tested separately
- [x] `nullable` fully orthogonal to RFC-013 `optional` (all four combinations tested)
- [x] Validate-before-snapshot; no silent strip/default/coerce; no invented nullable on invalid candidates; verified without instrumentation seam
- [x] Task 1 splits fixture migration (1A) from deliberate three-member regressions (1B) and new assertions (1C); invalid shapes use runtime test seam/`unknown`
- [x] `checkFields` remains the single Field validation implementation reused by fixtures and `validateResource`
- [x] Relations / Operations / annotations / projection non-participation unchanged; `project.ts` preferred untouched
- [x] Prior Field “`nullable` as extra” tests explicitly retargeted
- [x] Relation `nullable` remains `invalid_relation_member`
- [x] Task checkboxes are M6 execution markers; M5 Accept updates Status only
- [x] Task 4 roadmap/docs commit is final delivery only (after M6+ gates)
- [x] TDD tasks executable without inventing sequencing
- [x] M6 must not start until this plan is **Accepted**
- [x] Delivery packaging: one PR for [#48](https://github.com/rexescario-dev/resource-forge/issues/48) carries Accepted plan + implementation (process constraint; not a substitute for M5 Accept)

---

## Gate

**M5 Accepted.** M6 implementation may begin under this plan and tracking issue #48. Do not invent Relation nullability/runtime/wire/persistence/Operations semantics, dual-shape compatibility, or default/coerce/strip `nullable`. No invalid Field may become valid through stripping, defaulting, coercion, or normalization before validation. Apply M3.10 candidate-object acceptance only before RFC-014 key-set classification; deliberate invalid-shape tests must exercise runtime validation.


---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.11 Field Nullability |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/48 |
| M4 | Plan **Accepted** |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | **Approved** |
| M8 | N/A |
| M9 | N/A |
| Branch | `feat/m3-11-field-nullability` |
| PR | https://github.com/rexescario-dev/resource-forge/pull/49 |
| Status | **Slice complete** |

### Shipped

- Widened `Field` to `{ name, type, optional, nullable }` with required exact boolean `nullable`
- Distinct `missing_field_nullable` / `invalid_field_nullable` causes; own-property + order-independent key-set classification
- Boundary classification: `{name,type}` / `{name,type,optional}` / `{name,type,nullable}` / `{name,type,optional,default}`
- Validate-before-snapshot; equality includes `nullable`; uniqueness remains name-only; optional×nullable orthogonality
- Relations unchanged (`nullable` on Relation → `invalid_relation_member`); no `project.ts` production change
- No public `validateNullable` / `validateFields`

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (per-file vitest; CI `ci` SUCCESS on #49) |
| Typecheck | **Passed** (`tsc --noEmit` in `@resource-forge/core`) |
| Lint | Skipped |
| Build | Skipped |
| Package validation | Skipped |

### Next Gate

**None — slice complete**

**M7 Approved** (2026-08-08, post-merge formal review of `main` @ `cb88a18`). Faithful RFC-014 / plan realization. Closed Field `{ name, type, optional, nullable }`; missing vs invalid nullable causes; own-property + order-independent key sets; validate-before-snapshot; optional×nullable orthogonality; Relations unchanged; no projection contribution; no public nullable validate helpers. CI green on #49; merge already completed under project norms before this formal M7 record.
