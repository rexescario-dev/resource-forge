# M3.13 Constraints Framework — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-016. Reuse M3.1–M3.12 Resource / schema / field / relation / operation / annotation / projection surfaces. Do **not** implement concrete constraint kind vocabulary or semantics, payloads/`spec` bags, Field/Relation-attached constraints, runtime enforcement, wire/persistence, Operation kind / signature / execution, annotation vocabulary, field→metadata projection, dual-shape omit-as-empty, or public `validateConstraints` / `validateResourceSchema`.

**Status:** Accepted  
**M5:** Accepted (2026-08-08) — Plan Review; no plan blockers. The plan faithfully implements Accepted RFC-016 without adding product semantics. Required ordered `constraints`, closed `{ name, kind }`, open non-empty `kind`, empty valid / omit invalid (no dual-shape), shape-classification boundaries (missing-kind vs invalid-member), `checkConstraints` as the single validation path, validate-before-snapshot, independent namespaces, and projection non-participation are all executable and covered by explicit TDD tasks. Field / Relation / Operation floors (RFC-012 / RFC-014 / RFC-015) remain unchanged; concrete kinds/payloads/enforcement remain deferred. M6 implementation is authorized only after this status update; task checkboxes remain open until execution. One PR with implementation for #58.  
**Tracking:** [#58](https://github.com/rexescario-dev/resource-forge/issues/58)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted) — M3.13 was blocked on Constraints RFC  
**Source RFC:** RFC-016 Constraints (**Accepted**) — amends RFC-005 `ResourceSchema` with required `constraints` collection + Constraint member/sequence contract  
**Depends on:** RFC-005 (**Accepted**, amended); RFC-006 (**Accepted**); RFC-007 / RFC-009 / RFC-013 / RFC-014 (**Accepted**, Fields unchanged); RFC-008 / RFC-010 / RFC-011 / RFC-013 / RFC-015 (**Accepted**, Relations unchanged); RFC-012 (**Accepted**, Operations unchanged); RFC-016 (**Accepted**); M3.1–M3.12 shipped  
**Package:** `@resource-forge/core`  
**Slice:** M3.13 only — required ordered `ResourceSchema.constraints` of closed `{ name, kind }`; open non-empty `kind`; empty valid; omit/non-sequence invalid; no dual-shape; validate-before-snapshot; projection non-participation; Field/Relation/Operation floors unchanged

**Goal:** Widen `ResourceSchema` from `{ fields, relations, operations }` to `{ fields, relations, operations, constraints }`, validate a required ordered `constraints` sequence of closed `{ name: ConstraintName; kind: string }` members as part of Resource validity via `checkConstraints`, keep `kind` as an open non-empty string (no reserved vocabulary / no kind semantics), keep independent Field/Relation/Operation/Constraint namespaces, redefine Constraint value equality as exact `name` **and** exact `kind` with order-sensitive sequence equality, and keep `projectResourceMetadata` free of any Constraint contribution.

**Architecture:**

```text
raw candidate schema
          │
          ▼
 require constraints member         ← omitted → missing_constraints;
                                      present but not a sequence → invalid_constraints_collection
          │
          ▼
 checkConstraints(candidate)        ← single internal RFC-016 constraint validation
                                      (closed shape + names + kind + uniqueness)
          │
          ├── failure → ConstraintValidationError
          │
          ▼
 validated Constraint values
          │
          ▼
 snapshotConstraints(validated)     ← freeze ordered `{ readonly name, readonly kind }` only;
                                      never lossy-normalize candidates
          │
          ▼
       Resource snapshot
          │
          ▼
 validateResource(resource)         ← authoritative final Resource validity gate
                                      (delegates constraint validation to checkConstraints;
                                       MUST NOT duplicate a second algorithm)
          │
          ▼
 projectResourceMetadata            ← revalidate Resource; annotation-derived metadata only;
                                      constraints contribute nothing
```

**Invariant:** No implementation step may transform an invalid candidate into a valid Constraint or valid schema by discarding information before validation (including stripping unknown properties, defaulting omitted `constraints` to `[]`, or coercing `kind`).

`checkConstraints` is the internal implementation of RFC-016 constraint collection validation and is reused by construction fixtures and `validateResource`. `validateResource` remains the authoritative Resource-level validation gate.

`ConstraintName` is a dedicated identity domain scoped to the Resource's `constraints` sequence (not `FieldName`, not `RelationName`, not `OperationName`, not `MetadataKey`). `Constraint` is closed: `{ name, kind }` only. `kind` is a required open non-empty string (exact equality; no identifier grammar; no reserved kinds). Declaration order is preserved and participates in sequence equality. Uniqueness is **by name only** (same `kind` on different names allowed). Field / Relation / Operation / Constraint uniqueness are independent (same name string may coexist across collections).

**Tech Stack:** TypeScript strict, Vitest (existing `packages/core` scripts)

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-016 Accepted
       ↓
M3.13 plan Draft (this document)
       ↓
M5 Plan Review → Accepted (Status header only; task checkboxes stay open)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M9 / validation as required by the parent M3 workflow
       ↓
one delivery PR for tracking #58 (Accepted plan + implementation together)
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M3.13 delivery slice (Accepted plan + implementation). Do **not** open a separate plan-only merge PR as a required gate. M5 Accept is recorded by updating this plan’s **Status** to Accepted (and M5 rationale); it is not the same event as merging the delivery PR.

**Task checkboxes:** Completed during **M6 execution** only. M5 acceptance records only that the plan is **Accepted** — it does **not** mark implementation task checkboxes complete.

---

## Locked decisions (export / shape review — planning aids)

These freeze the M3.13 implementation surface. They MUST NOT invent product semantics beyond RFC-016 (+ retained Field / Relation / Operation floors).

| Decision | Lock |
| --- | --- |
| `ConstraintName` | Validated string matching `/^[a-z][a-zA-Z0-9]*$/` exactly. Exact string equality; no normalization. Dedicated type/domain — **do not** alias to Field/Relation/Operation name types. |
| `kind` | Required **own** property; must be a string; must be non-empty (`""` invalid); exact string equality; no trim/case-fold/normalize; **no** reserved kinds; **no** identifier grammar. |
| `Constraint` | `{ readonly name: ConstraintName; readonly kind: string }` **exactly**. Additional semantic properties → `invalid_constraint_member`. |
| `constraints` representation | **Implementation-level:** `ReadonlyArray<Constraint>`. Array index **is** semantic order. |
| Required member | `constraints` MUST be present on every `ResourceSchema`. Omission → `missing_constraints`. Non-sequence → `invalid_constraints_collection`. |
| Empty `constraints` | Zero-length array; valid; still produced by `createEmptyResourceSchema` / `createResource`. |
| Dual-shape | **None.** Omit is **not** treated as empty. |
| `fields` / `relations` / `operations` | Unchanged member floors (RFC-014 / RFC-015 / RFC-012). |
| Namespaces | Uniqueness within `constraints` only. Field/Relation/Operation/Constraint sharing the same name string is valid. No cross-collection uniqueness. |
| Kind uniqueness | **Not** required; duplicate `kind` strings allowed when names differ. |
| Key-set comparison | Order-independent own keys. Reuse existing own-key / `hasOwnProperty` mechanism; do not invent enumerability product semantics. |
| Own-property `kind` | Inherited / prototype-derived `kind` does **not** satisfy the closed contract. |
| Shape classification | See table below. |
| Snapshot vs validation | **Separated, non-lossy.** `checkConstraints` validates raw candidates **before** materializing closed members. `snapshotConstraints` freezes already-valid members only. |
| Non-empty Resource construction | **No public builder.** Tests use an **internal** `createResourceWithConstraintsForTests` seam (not barrel-exported). Existing field/relation/operation fixtures MUST supply empty `constraints: []` after this slice. |
| Internal helpers | `validateConstraintName` / `checkConstraints` / `snapshotConstraints` / `constraintsEqual` are **module-local / test-only** (MUST NOT be barrel-/package-exported). |
| Validation ownership | Part of `validateResource` via schema (`checkConstraints`). No public `validateConstraints` / `validateResourceSchema`. |
| Schema error taxonomy | Collection causes + member causes under `ConstraintValidationError` (planning-aid codes below). Field/Relation/Operation causes unchanged. |
| `ResourceValidationError.invalid_schema.cause` | Widen to include `ConstraintValidationError`. |
| Projection | Still annotation-only. Constraints MUST NOT contribute entries. Invalid constraints still fail the projection gate. **Preferred:** no production change to `project.ts`. |
| Equality helper | **Test/internal only** `constraintsEqual` (order-sensitive; member equality = name + kind). |
| Compose / registry | SHALL NOT require compose/registry; SHALL NOT evaluate constraint kinds. |

---

## Constraint shape-classification table (normative for this plan)

Per candidate Constraint member: apply the **existing candidate-object acceptance mechanism** used by Operations/Relations first **only** for the candidate being an acceptable structural object (reject with `invalid_constraint_member` when that object-acceptance mechanism rejects). Then:

| Own-key / property condition | Cause |
| --- | --- |
| Own key `kind` absent and own key set exactly `{ name }` | `missing_constraint_kind` |
| Own key set not exactly `{ name, kind }` after the above special case does not apply (or extras present) | `invalid_constraint_member` |
| Own key `kind` present but value not a non-empty string | `invalid_constraint_kind` |
| `name` fails `ConstraintName` grammar | `invalid_constraint_name` |
| Duplicate `ConstraintName` in the sequence | `duplicate_constraint_name` |

**Explicit boundary mappings (must be tested):**

```text
{ name }                         → missing_constraint_kind
{ name, kind: "x" }              → proceed to name/kind validation
{ name, kind: "" }               → invalid_constraint_kind
{ name, kind: "x", spec: {} }    → invalid_constraint_member   (NOT missing_constraint_kind)
{ kind: "x" }                    → invalid_constraint_member
{ name, kind } with inherited-only kind → missing_constraint_kind when own keys are exactly { name }
```

Inherited-only `kind` does not count as present. Key-set comparisons are order-independent. Special-case ordering MUST NOT be refactored into a generic recursive missing-property check that would reclassify `{ name, kind, spec }` as missing-kind.

**Schema-level collection mappings:**

```text
constraints omitted              → missing_constraints
constraints: null / object / …   → invalid_constraints_collection  (not a sequence)
constraints: []                  → valid (empty)
```

---

## M3.13 public contract surface

| Symbol | Kind | Role |
| --- | --- | --- |
| `ConstraintName` | type | Constraint identity string conforming to RFC-016 grammar |
| `Constraint` | type | `{ readonly name; readonly kind }` |
| `ConstraintValidationError` | type | Collection + member cause codes under `invalid_schema` |
| `ResourceSchema` | type | Public validated schema: prior collections unchanged; `constraints: ReadonlyArray<Constraint>` required. Runtime schema candidates may still be `unknown` / structurally invalid before validation (omit, non-sequence, bad members); those fail via the collection/member causes below. |
| `Resource` | type | Unchanged shape; schema carries `constraints` |
| `validateResource` | function | Validates identity, schema (fields + relations + operations + constraints), annotations |
| `createResource` / `createEmptyResourceSchema` | function | Empty collections including `constraints: []` |
| `projectResourceMetadata` | function | Identity + annotation entries only |
| Field / Relation / Operation / annotation surfaces | retained | Unchanged from M3.3–M3.12 |

**Not public in M3.13:**

- `validateConstraints` / `validateResourceSchema` / `validateConstraintName` / `snapshotConstraints` / `constraintsEqual`
- Public Resource builders
- Concrete constraint kind vocabulary, payloads, enforcement, Field/Relation attachment
- Dual-shape migration helpers / omit-as-empty
- Constraint→metadata contribution
- Field/Relation/Operation floor changes

**Retain:** M2–M3.12 exports; `PACKAGE_NAME` / `PACKAGE_VERSION`.

### Validation error shape (planning aid)

```ts
type Constraint = {
  readonly name: ConstraintName;
  readonly kind: string;
};

type ConstraintValidationError =
  | { readonly code: 'missing_constraints' }
  | { readonly code: 'invalid_constraints_collection' }
  | {
      readonly code: 'invalid_constraint_name';
      readonly index: number;
      readonly name: string;
    }
  | {
      readonly code: 'duplicate_constraint_name';
      readonly index: number;
      readonly name: string;
    }
  | { readonly code: 'missing_constraint_kind'; readonly index: number }
  | {
      readonly code: 'invalid_constraint_kind';
      readonly index: number;
      readonly kind: unknown;
    }
  | { readonly code: 'invalid_constraint_member'; readonly index: number };

type ResourceValidationError =
  | {
      readonly code: 'invalid_identity';
      readonly cause: IdentityValidationError;
    }
  | {
      readonly code: 'invalid_schema';
      readonly cause?:
        | FieldValidationError
        | RelationValidationError
        | OperationValidationError
        | ConstraintValidationError;
    }
  | {
      readonly code: 'invalid_annotations';
      readonly cause: AnnotationValidationError;
    };
```

Do not invent additional constraint cause codes for test convenience. Do not put field/relation/operation failures under constraint causes. Do not invent kind-vocabulary semantics.

### Construction vs validation (normative for this plan)

| Concern | Owner |
| --- | --- |
| Require `constraints` presence / sequence-ness | `validateResource` (schema-level) using the collection causes above |
| Validate raw constraint candidates (shape / names / kind / uniqueness) | Internal `checkConstraints`, reused by construction seams and `validateResource` |
| Establish snapshotted ordered `constraints` | Resource construction seams; only from already-valid Constraints (`snapshotConstraints`) |
| Decide validity of a Resource | `validateResource` (authoritative final gate; delegates members to `checkConstraints`) |
| Project metadata | `projectResourceMetadata` after `validateResource`; annotations only |

**Internal non-empty constraints fixture seam:**

```ts
// internal / test-only — NOT exported from packages/core public API
function createResourceWithConstraintsForTests(
  identity: ResourceIdentity,
  candidateConstraints: readonly object[],
  annotations?: Annotations,
  candidateFields?: readonly object[],
  candidateRelations?: readonly object[],
  candidateOperations?: readonly object[],
): Result<Resource, ResourceValidationError>
```

`createResourceWithConstraintsForTests` calls `checkConstraints` (and optional field/relation/operation checks) **before** constructing the snapshot; successful construction freezes ordered `{ name, kind }` members and then passes the resulting Resource through `validateResource`. Defaults: empty annotations and empty other schema collections.

Existing `createResourceWithFieldsForTests` / `createResourceWithRelationsForTests` / `createResourceWithOperationsForTests` MUST construct `constraints: []` after this slice (not omit).

### Projection behavior (RFC-016 non-participation)

```text
projectResourceMetadata(resource)
  1. validateResource(resource)     // includes constraint validity rules
  2. on failure → invalid_resource
  3. createResourceMetadata(identity, [...resource.annotations])  // constraints ignored
  4. on metadata failure → invalid_metadata (defensive)
  5. success → ResourceMetadata with identity + annotation-derived entries only
```

MUST NOT mutate Resource. MUST NOT invent constraint-derived metadata keys. Invalid `constraints` MUST fail the projection gate.

---

## Constraints (from Accepted RFC-016)

### SHALL

- represent `constraints` as a required ordered sequence of closed `{ name, kind }` Constraints
- enforce `ConstraintName` grammar `/^[a-z][a-zA-Z0-9]*$/` as the sole name constraint
- treat `ConstraintName` as a dedicated domain
- require `kind` as a non-empty string with exact equality and open vocabulary
- enforce unique `ConstraintName`s within the `constraints` sequence only
- allow duplicate `kind` strings when names differ
- allow a Field, Relation, Operation, and Constraint to share the same name string on one Resource
- treat empty `constraints` as valid
- reject omitted `constraints` and non-sequence `constraints`
- validate `constraints` as part of Resource validity via schema
- keep constraint errors distinct from metadata, annotation, field, relation, and operation validation
- preserve declaration order in snapshots; order participates in sequence equality
- define Constraint value equality as exact `name` **and** exact `kind`
- validate candidate closed shape / names / kind / uniqueness before any lossy materialization
- leave Fields / Relations / Operations contracts unchanged
- leave projection free of Constraint contributions while still revalidating the Resource

### SHALL NOT

- invent concrete kind vocabulary, payloads/`spec`, enforcement, Field/Relation attachment, wire/persistence semantics
- treat omit as empty (no dual-shape)
- impose identifier grammar or reserved names on `kind`
- reuse Field/Relation/Operation name types as `ConstraintName`
- introduce a unified cross-collection schema namespace rule
- contribute constraints to `projectResourceMetadata`
- silently drop, normalize, coerce, strip additional semantic properties, default omitted `constraints`, dedupe, or reorder for semantic equality
- transform an invalid candidate into a valid Constraint by discarding information before validation
- introduce public `validateConstraints` / `validateResourceSchema`
- reopen or reinterpret RFC-012 / RFC-014 / RFC-015 member floors
- export `constraintsEqual` / `validateConstraintName` as public product APIs

---

## Package / ownership boundaries

### `@resource-forge/core` owns

- `packages/core/src/resource/*` Constraint types, internal constraint helpers, schema widening, validation integration, fixture updates, projection non-participation tests
- tests for RFC-016 member / sequence / validation / equality / independent namespaces / projection non-participation

### Consume only

- Existing identity / metadata / annotations / fields / relations / operations / result utilities as already used by M3.1–M3.12

### Must remain untouched (feature-free)

- `packages/nest`, `packages/graphql`, `packages/prisma`, `packages/cli`
- Unrelated workflow tooling bumps

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/core/src/resource/types.ts` | `ConstraintName`, `Constraint`, `ConstraintValidationError`; widen `ResourceSchema`; widen `invalid_schema.cause` |
| `packages/core/src/resource/constraints.ts` | **internal** `validateConstraintName` / `checkConstraints` / `snapshotConstraints` / `constraintsEqual` |
| `packages/core/src/resource/constraints.test.ts` | sequence / snapshot / equality / namespaces / kind rules / validation tests |
| `packages/core/src/resource/schema.ts` | `createEmptyResourceSchema` includes `constraints: []` |
| `packages/core/src/resource/validate.ts` | require `constraints` presence/sequence; delegate to `checkConstraints`; snapshot constraints |
| `packages/core/src/resource/validate.test.ts` | empty + valid non-empty; omit / non-sequence; invalid name/kind/member/duplicate |
| `packages/core/src/resource/create.ts` | empty construction includes `constraints: []` |
| `packages/core/src/resource/create-resource-with-constraints.ts` | internal non-empty constraints fixture seam |
| `packages/core/src/resource/create-resource-with-{fields,relations,operations}.ts` | supply empty `constraints: []` |
| `packages/core/src/resource/{fields,relations,operations}.test.ts` | Retarget fixtures that omit `constraints`; keep member floors unchanged |
| `packages/core/src/resource/project.ts` | **Preferred: no production change** |
| `packages/core/src/resource/project.test.ts` | non-empty constraints ⇒ no constraint-derived metadata; invalid ⇒ `invalid_resource`; purity |
| `packages/core/src/resource/exports.test.ts` | public export smoke; assert no `validateConstraints` |
| `packages/core/src/resource/index.ts` / `packages/core/src/index.ts` | export Constraint types as needed |
| `docs/roadmap.md` | Update only as the **final delivery commit** after M6+ gates — record M3.13 ✅ |

Planning note: file names are layout choices, not product module boundaries required by RFC-016.

---

## TDD / verification strategy

For each implementation task after types: write the relevant failing assertions → implement → green → commit. Fixture migration (Task 1A) is prerequisite compile/test hygiene, **not** the breaking-contract regression.

**Must cover:**

1. Empty `constraints` remain valid (`createEmptyResourceSchema` / `createResource`)
2. Valid ordered non-empty `constraints` accepted; order + name + kind preserved
3. **Deliberate** omit-`constraints` schema → `missing_constraints` (breaking vs M3.12)
4. Non-sequence `constraints` → `invalid_constraints_collection`
5. Shape-classification boundaries:
   - `{ name }` → `missing_constraint_kind`
   - `{ name, kind: "x", spec: {} }` → `invalid_constraint_member`
   - `{ kind: "x" }` → `invalid_constraint_member`
   - inherited-only `kind` with own keys `{ name }` → `missing_constraint_kind`
6. Invalid `ConstraintName` (e.g. `Create`, `create-order`, ``) → `invalid_constraint_name`
7. Present-but-invalid kind (`""`, `null`, `1`, `true`) → `invalid_constraint_kind`
8. Duplicate `ConstraintName` → `duplicate_constraint_name` even when `kind` differs
9. Duplicate `kind` with different names → **valid**
10. Independent namespaces: Field + Relation + Operation + Constraint sharing `'create'` → valid Resource
11. **Equality (separate test):** `constraintsEqual` differs when only order differs; differs when only `kind` differs
12. Snapshot ownership: mutating caller-owned candidates MUST NOT change snapshotted members; assert freezes include `kind`
13. **Validate-before-snapshot:** invalid candidates fail in `checkConstraints` and MUST NOT produce a closed Constraint by strip/default
14. Projection: non-empty constraints + empty annotations → no constraint-derived metadata entries
15. Projection: invalid constraints → `invalid_resource`
16. Purity: projection does not mutate Resource / collections
17. Public surface: Constraint types exported; no `validateConstraints`
18. Fields / Relations / Operations regressions remain green under their Accepted floors

**Do not:** invent kind semantics / payloads / enforcement / Field-Relation attachment assertions; accept dual-shape omit-as-empty; contribute constraints to metadata; reopen RFC-012/014/015 floors; require `project.ts` production edits as expected work.

**Regression retarget:** Every Resource/schema fixture that currently omits `constraints` MUST be migrated to include `constraints: []` (or deliberate valid members) in Task 1A. Task 1B keeps deliberate omit/non-sequence candidates so the breaking contract remains protected.

---

### Task 1: Contract types + tests (breaking widen)

**Files:**
- Modify: `packages/core/src/resource/types.ts`
- Create: `packages/core/src/resource/constraints.test.ts` (and/or extend `validate.test.ts`)
- Modify: fixture-bearing tests (`validate` / `project` / `fields` / `relations` / `operations` / exports) as needed
- Modify barrels as needed for type exports

- [x] **Step 1: Widen types** — apply the planning-aid `Constraint` / `ConstraintValidationError` unions; `ResourceSchema.constraints: ReadonlyArray<Constraint>`; widen `invalid_schema.cause`

#### 1A — Fixture migration (prerequisite; not the breaking regression)

- [x] **Step 2A: Update compile-time / intended-valid fixtures** to include `constraints: []` (or valid members) wherever they represent schemas that should remain **valid** after M3.13. Keep Field/Relation/Operation member floors unchanged.

#### 1B — Deliberate omit / non-sequence breaking regressions

- [x] **Step 2B: Add explicit tests** that omit `constraints` or supply a non-sequence and assert `missing_constraints` / `invalid_constraints_collection`. Deliberate invalid shapes MUST exercise **runtime validation** via existing seams / `unknown` boundaries (not TypeScript-only failures).

#### 1C — New invalid / kind / equality / uniqueness / namespace tests

- [x] **Step 2C: Add new RFC-016 tests** that initially fail until Task 2 implements validation:

```ts
it('accepts ordered non-empty constraints and preserves order + kind', () => {
  // { name: 'nonNegativeTotal', kind: 'placeholder' }, { name: 'hasCustomer', kind: 'placeholder' }
});

it('rejects omitted constraints as missing_constraints (breaking)', () => { /* … */ });

it('classifies member shape boundaries without collapsing missing causes', () => {
  // { name } → missing_constraint_kind
  // { name, kind: '', } → invalid_constraint_kind
  // { name, kind: 'x', spec: {} } → invalid_constraint_member
});

it('allows duplicate kinds when names differ', () => { /* … */ });

it('rejects duplicate ConstraintName even when kind differs', () => { /* … */ });

it('constraintsEqual is false when only kind or only order differs', () => { /* … */ });

it('allows Field/Relation/Operation/Constraint to share the same name string', () => { /* … */ });
```

- [x] **Step 3: Run** `pnpm --filter @resource-forge/core test` — expect FAIL from Task 1B/1C (and type errors where `constraints` is required by types but validation not yet widened). Fixture migration alone MUST NOT be treated as proving the breaking contract.
- [x] **Step 4: Commit** `test(core): add failing M3.13 Constraints contract tests`

### Task 2: Validate-before-snapshot + validation integration

**Files:**
- Create: `packages/core/src/resource/constraints.ts`
- Create: `packages/core/src/resource/create-resource-with-constraints.ts`
- Modify: `packages/core/src/resource/validate.ts`
- Modify: `packages/core/src/resource/schema.ts` / create fixtures for empty `constraints: []`
- Update: field/relation/operation fixtures as needed

- [x] **Step 1: Internal helpers** — `validateConstraintName`; **`checkConstraints` as the single Constraint-validation implementation** (classification table + uniqueness + kind rules); `snapshotConstraints` accepts only already-validated Constraints; `constraintsEqual` order-sensitive / name+kind. MUST NOT strip extras, invent `kind`, or default omit-to-empty.
- [x] **Step 2: Internal fixture** — `createResourceWithConstraintsForTests` calls `checkConstraints` before snapshot; then `validateResource`; not barrel-exported
- [x] **Step 3: `validateResource`** — require `constraints` presence/sequence (collection causes); **delegate** member validation to `checkConstraints` (MUST NOT duplicate); retain field/relation/operation checks; snapshot constraints like other collections
- [x] **Step 4: Green** Task 1B/1C acceptance + rejection + classification + equality/uniqueness/namespace causes
- [x] **Step 5: Commit** `feat(core): require ResourceSchema.constraints sequence (RFC-016)`

### Task 3: Projection non-participation + coexistence regressions

**Files:**
- Modify: `packages/core/src/resource/project.test.ts`
- Prefer **no** modification to `packages/core/src/resource/project.ts`

- [x] **Step 1: Ensure projection tests** use schemas with `constraints`; assert zero constraint-derived entries; invalid constraints → `invalid_resource`; purity
- [x] **Step 2: Confirm implementation** still `createResourceMetadata(identity, [...annotations])` with **no** `project.ts` production change (preferred)
- [x] **Step 3: Full suite green including fields / relations / operations / annotations**
- [x] **Step 4: Commit** `test(core): constraints do not contribute to metadata projection`

### Task 4: Exports + final delivery hygiene

**Files:**
- Modify: `packages/core/src/resource/exports.test.ts` / barrels as needed
- Modify: `docs/roadmap.md` — **only** after M6 implementation and the review/refactoring/documentation/validation gates required by the parent M3 workflow are green

Task checkboxes in this document are completed during **M6 execution**. M5 acceptance records only Status **Accepted** (plus M5 rationale) — it does not complete Task 1–4 checkboxes.

- [x] **Step 1: Export smoke** — Constraint types as locked; confirm no `validateConstraints`
- [x] **Step 2: Full `pnpm --filter @resource-forge/core test` green**
- [x] **Step 3: Update `docs/roadmap.md` only after M6+ gates** — record M3.13 ✅; clear “RFC-016 Accepted / delivery pending” wording as appropriate
- [x] **Step 4: Final delivery commit** `docs: record M3.13 constraints framework slice complete`

---

## Traceability

| Task | RFC-016 sections |
| --- | --- |
| Task 1 | §§2–4 terminology / Constraint / ConstraintName / kind / independent namespaces; public surface; §12 breaking omit |
| Task 2 | §§4–6 member model, ordered sequence, validation ownership, error causes, validate-before-snapshot |
| Task 3 | §7 projection non-participation (including validation-gate consequence) |
| Task 4 | Implementation gate / roadmap hygiene |

---

## Explicit deferrals

- Concrete constraint kind vocabulary and semantics (bounds, uniqueness, defaults, cross-member rules, etc.)
- Constraint payloads / `spec` / `body` bags
- Per-member Field or Relation constraint attachment
- Runtime enforcement; wire / serialization; persistence / ORM
- Unified cross-collection schema namespace
- Field / Relation / Operation member-shape changes
- Field / Relation / Operation / Constraint → metadata contribution beyond “none” for constraints
- Annotation vocabulary
- Operation kind / signature / execution
- Public Resource equality / builders
- Public `validateConstraints` / `validateResourceSchema`
- Dual-shape omit-as-empty
- Host adapters

---

## M5 Plan Review checklist (for reviewers)

- [x] No new product semantics beyond RFC-016
- [x] `constraints` is required ordered sequence; empty valid; omit/non-sequence invalid; no dual-shape
- [x] `Constraint` closed `{ name, kind }`; `ConstraintName` grammar sole name constraint; dedicated domain
- [x] `kind` required non-empty open string; no reserved vocabulary; no identifier grammar
- [x] Independent Field/Relation/Operation/Constraint namespaces explicit; kind uniqueness not required
- [x] `checkConstraints` is the single Constraint-validation implementation; reused by fixtures and `validateResource`
- [x] Snapshot construction separated from materialization; validate-before-snapshot; no strip/default/coerce
- [x] Collection causes (`missing_constraints` / `invalid_constraints_collection`) distinct from member causes
- [x] Shape-classification table preserves missing-kind vs invalid-member boundaries
- [x] Non-empty Resources via internal/test seam only (no public builder)
- [x] Constraint helpers internal; public validation remains `validateResource`
- [x] Fields / Relations / Operations floors unchanged (RFC-012 / RFC-014 / RFC-015)
- [x] Projection non-participation required and tested; invalid constraints still fail projection gate
- [x] Concrete kinds / payloads / enforcement / attachment deferred
- [x] Prior omit-`constraints` fixtures explicitly retargeted; deliberate omit regressions retained
- [x] TDD tasks executable without inventing sequencing
- [x] M6 must not start until this plan is **Accepted**
- [x] Delivery packaging: one PR for [#58](https://github.com/rexescario-dev/resource-forge/issues/58) carries Accepted plan + implementation (process constraint; not a substitute for M5 Accept)

---

## Gate

**M5 Accepted.** M6 implementation may begin under this plan and tracking issue #58. Do not invent kind semantics, payloads, enforcement, Field/Relation attachment, dual-shape omit-as-empty, or a public constraints builder. `checkConstraints` remains the single Constraint-validation implementation. Task checkboxes remain open until M6 execution.

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.13 Constraints Framework |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/58 |
| M4 | Plan **Accepted** |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | **Approved** |
| M8 | N/A |
| M9 | N/A |
| Branch | `feat/m3-13-constraints` |
| PR | https://github.com/rexescario-dev/resource-forge/pull/59 |
| Status | **Ready for merge** |

### Shipped

- Required ordered `ResourceSchema.constraints` of closed `{ name, kind }` members
- Open non-empty `kind` (exact equality; no reserved vocabulary); empty sequence valid; omit/non-sequence invalid; no dual-shape
- Distinct collection causes (`missing_constraints` / `invalid_constraints_collection`) and member causes (missing/invalid kind, invalid name/member, duplicates)
- `checkConstraints` as single validation path; validate-before-snapshot; equality name+kind; uniqueness by name; independent namespaces
- No Constraint → metadata contribution; invalid constraints still fail projection gate
- No public `validateConstraints`; Field/Relation/Operation floors unchanged

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (per-file vitest; CI `ci` SUCCESS on #59; constraints 13 on recheck) |
| Typecheck | **Passed** (`tsc --noEmit` in `@resource-forge/core`) |
| Lint | Skipped |
| Build | Skipped |
| Package validation | Skipped |

### Next Gate

**Merge** (then closeout as Slice complete)

**M7 Approved** (2026-08-08). Faithful RFC-016 / plan realization. Required ordered `constraints`; closed `{ name, kind }`; open non-empty `kind`; missing vs invalid collection/member causes; shape-classification boundaries preserved; validate-before-snapshot; independent namespaces; no projection contribution; no public constraint validate helpers; Field/Relation/Operation floors unchanged. CI green on #59.
