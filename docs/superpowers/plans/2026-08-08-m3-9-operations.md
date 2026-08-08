# M3.9 Resource Operations — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-012. Reuse M3.1–M3.8 Resource / schema / field / relation / annotation / projection surfaces. Do **not** implement `kind`, signatures, IO, execution, persistence, loading, joins, cascade, direction, bounds, optionality/nullability, Field/Relation reopen (RFC-009/010/011), unified schema namespace, field→metadata projection, or public `validateOperations` / `validateResourceSchema`.

**Status:** Accepted  
**M5:** Accepted (2026-08-08) — Plan Review; no plan blockers after validation-ownership correction; `checkOperations` is the single internal Operation validation implementation reused by construction fixtures and `validateResource`; one PR with implementation for #38  
**Tracking:** [#38](https://github.com/rexescario-dev/resource-forge/issues/38)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted) — M3.9 was blocked on Resource Operations RFC  
**Source RFC:** RFC-012 Resource Operations (**Accepted**) — fills RFC-005 deferred `operations` member slot  
**Depends on:** RFC-005 (**Accepted**); RFC-006 (**Accepted**); RFC-007 / RFC-009 (**Accepted**, Fields unchanged); RFC-008 / RFC-010 / RFC-011 (**Accepted**, Relations unchanged); RFC-012 (**Accepted**); M3.1–M3.8 shipped  
**Package:** `@resource-forge/core`  
**Slice:** M3.9 only — Operation / `OperationName` + ordered `operations` sequence + Resource validation; projection non-participation; Fields/Relations contracts unchanged

**Goal:** Widen `ResourceSchema.operations` from the empty-only placeholder to an ordered sequence of closed name-only Operations with unique `OperationName`s, validate that sequence as part of `validateResource`, keep independent Field/Relation/Operation namespaces, and keep `projectResourceMetadata` free of any Operation contribution.

**Architecture:**

```text
raw candidate
          │
          ▼
 checkOperations(candidate)        ← single internal RFC-012 operation validation (shape + names + uniqueness)
          │
          ├── failure → OperationValidationError
          │
          ▼
 validated Operation values
          │
          ▼
 snapshotOperations(validated)     ← freeze ordered `{ readonly name }` only; never lossy-normalize candidates
          │
          ▼
       Resource snapshot
          │
          ▼
 validateResource(resource)        ← authoritative final Resource validity gate
          │                         (delegates operation member/sequence validation to checkOperations;
          │                          MUST NOT duplicate a second operation-validation algorithm)
          ▼
 projectResourceMetadata           ← revalidate Resource; annotation-derived metadata only; operations contribute nothing
```

**Invariant:** No implementation step may transform an invalid candidate into a valid Operation by discarding information before validation.

`checkOperations` is the internal implementation of RFC-012 operation collection validation and is reused by construction fixtures and `validateResource`. `validateResource` remains the authoritative Resource-level validation gate; it delegates operation member/sequence validation to the same internal operation validation logic.

`OperationName` is a dedicated identity domain scoped to the Resource's `operations` sequence (not `FieldName`, not `RelationName`, not `MetadataKey`). `Operation` is closed: `{ name: OperationName }` only (exactly one declared semantic property). Declaration order is preserved and participates in sequence equality. Field, Relation, and Operation uniqueness are independent (same name string may coexist across collections). Equality of sequences is order-sensitive (test/internal helper only; public Resource equality remains deferred).

**Tech Stack:** TypeScript strict, Vitest (existing `packages/core` scripts)

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Locked decisions (export / shape review — planning aids)

These freeze the M3.9 implementation surface. They MUST NOT invent product semantics beyond RFC-012.

| Decision | Lock |
| --- | --- |
| `OperationName` | Validated string matching `/^[a-z][a-zA-Z0-9]*$/` exactly. The label “camelCase” is descriptive only — not an extra constraint. Exact string equality; no normalization. Dedicated type/domain — **do not** alias to `FieldName` or `RelationName`. |
| `Operation` | `{ readonly name: OperationName }` only. Additional semantic properties → operation-member failure (implementation code `invalid_operation_member`). |
| `operations` representation | **Implementation-level:** `ReadonlyArray<Operation>`. Array index **is** semantic order. |
| Empty `operations` | Zero-length array; still produced by `createEmptyResourceSchema` / `createResource`. |
| `fields` / `relations` | Unchanged RFC-007/009 and RFC-008/010/011 contracts. |
| `EmptySchemaCollection` | **Stop using** for `operations`. After this slice, `ResourceSchema.operations` is `ReadonlyArray<Operation>` (may be empty). If `EmptySchemaCollection` has no remaining callers, remove the type from barrels; do not keep a permanently empty-typed operations slot. |
| Namespaces | Uniqueness within `operations` only. Field/Relation/Operation sharing the same name string is valid. No cross-collection uniqueness check. |
| Snapshot construction vs validation | **Separated, non-lossy.** `checkOperations` validates raw candidates (closed shape, names, uniqueness) **before** any snapshot that materializes `{ name }` only. `snapshotOperations` accepts only already-validated `Operation` members and freezes an ordered sequence; it MUST NOT discard, strip, or normalize unknown semantic properties. `validateResource` is the authoritative final Resource validity gate and **reuses** `checkOperations` — it MUST NOT implement a second, independent operation-validation algorithm. |
| Non-empty Resource construction | **No public builder.** Public `createResource(identity)` remains empty schema collections + empty annotations. Tests needing non-empty `operations` use an **internal** fixture seam (not barrel-exported) that calls `checkOperations` before snapshotting. Coexistence tests may pass optional candidate fields/relations through the same internal seam (or colocated helpers). |
| Internal helpers | `validateOperationName` / `checkOperations` / `snapshotOperations` / `operationsEqual` are **internal or test-only**, not public product APIs. Public validation remains `validateResource`. |
| Validation ownership | `checkOperations` owns Operation collection semantics (single implementation). `validateResource` owns Resource-level validity and delegates to `checkOperations`. No public `validateOperations` / `validateResourceSchema`. |
| Schema error taxonomy | Operation failures: `invalid_schema` **with** `cause: OperationValidationError` using only `invalid_operation_name` / `duplicate_operation_name` / `invalid_operation_member` (maps RFC-012 prose causes). Field/Relation failures retain their existing causes. Non-member schema failures (missing collections, non-object schema): `invalid_schema` **without** field/relation/operation cause. |
| `ResourceValidationError.invalid_schema.cause` | Widen to `FieldValidationError \| RelationValidationError \| OperationValidationError` (optional). |
| Projection | After revalidation, still `createResourceMetadata(identity, [...annotations])` only. Operations MUST NOT contribute entries. Field/Relation projection rules remain unchanged. |
| Reserved names | None. `create` / `read` / `update` / `delete` are ordinary grammar-valid names with **no** special meaning. |
| Kind / signature / execution | Out of scope. |
| Equality helper | **Test/internal only** `operationsEqual` (order-sensitive). MUST NOT be a public product API. |
| Compose / registry | SHALL NOT require `composeResourceMetadata`; SHALL NOT register. |

---

## M3.9 public contract surface

| Symbol | Kind | Role |
| --- | --- | --- |
| `OperationName` | type | Operation identity string conforming to RFC-012 grammar |
| `Operation` | type | `{ readonly name: OperationName }` |
| `OperationValidationError` | type | Three cause codes under `invalid_schema` |
| `ResourceSchema` | type | `fields` / `relations` unchanged; `operations: ReadonlyArray<Operation>` |
| `Resource` | type | Unchanged shape; schema may carry non-empty `operations` |
| `validateResource` | function | Validates identity, schema (fields + relations + operations rules), annotations |
| `createResource` | function | Minimal Resource: empty fields / relations / operations + `emptyAnnotations` |
| `createEmptyResourceSchema` | function | Empty collections snapshot |
| `projectResourceMetadata` | function | Identity + annotation entries only (operations ignored for contribution) |
| `ResourceValidationError` | type | `invalid_schema` optional `cause` for field, relation, **or** operation failures |
| Field / Relation / annotation surfaces | retained | Unchanged from M3.3–M3.8 |

**Not public in M3.9:**

- `validateOperations` / `validateResourceSchema` / `validateOperationName` / `snapshotOperations` / `operationsEqual`
- Public Resource builders / `createResource(identity, operations?)`
- Operation `kind`, signatures, IO, execution/handlers
- Field/Relation member-shape changes
- Field→metadata projection; Operation→metadata contribution
- Annotation vocabulary
- Unified schema namespace enforcement
- Public Resource equality
- Reverse projection; registry helpers

**Retain:** M2–M3.8 exports; `PACKAGE_NAME` / `PACKAGE_VERSION`. Drop `EmptySchemaCollection` from public export **only if** unused after the widen.

### Operation validation error shape (planning aid)

```ts
type OperationValidationError =
  | {
      readonly code: 'invalid_operation_name';
      readonly index: number;
      readonly name: string;
    }
  | {
      readonly code: 'duplicate_operation_name';
      readonly index: number;
      readonly name: string;
    }
  | {
      readonly code: 'invalid_operation_member';
      readonly index: number;
    };

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
        | OperationValidationError;
    }
  | {
      readonly code: 'invalid_annotations';
      readonly cause: AnnotationValidationError;
    };
```

Do not invent additional operation cause codes for test convenience. Do not put field/relation failures under operation causes. Do not invent `kind`-related cause codes.

### Construction vs validation (normative for this plan)

| Concern | Owner |
| --- | --- |
| Validate raw operation candidates (shape / names / uniqueness) | Internal Operation validation logic (`checkOperations`), reused by construction seams and `validateResource` |
| Establish snapshotted ordered `operations` | Resource construction seams; only from already-valid Operations (`snapshotOperations`) |
| Decide validity of a Resource | `validateResource` (authoritative final gate; delegates operations to `checkOperations`) |
| Project metadata | `projectResourceMetadata` after `validateResource`; annotations only |

**Internal non-empty operations fixture seam:**

```ts
// internal / test-only — NOT exported from packages/core public API
// Candidates are opaque objects so extra properties remain observable at runtime.
function createResourceWithOperationsForTests(
  identity: ResourceIdentity,
  candidateOperations: readonly object[],
  annotations?: Annotations,
  candidateFields?: readonly object[],
  candidateRelations?: readonly object[],
): Result<Resource, ResourceValidationError>
```

`createResourceWithOperationsForTests` calls `checkOperations` (and optional `checkFields` / `checkRelations`) **before** constructing the snapshot; successful construction freezes the ordered `{ readonly name }` operation members (and validated field/relation members as applicable) and then passes the resulting Resource through `validateResource`. Default annotations: `emptyAnnotations`. Default fields/relations: empty sequences.

Failure mapping for the fixture MUST use the same `invalid_schema` + field/relation/operation causes as `validateResource` (no silent success after stripping). `validateResource` MUST call the same `checkOperations` — not a duplicated algorithm.

Existing `createResourceWithFieldsForTests` / `createResourceWithRelationsForTests` remain for field/relation-focused tests; after this slice they MUST construct empty `operations` as `ReadonlyArray<Operation>` (empty array), not as `EmptySchemaCollection`.

### Projection behavior (RFC-012 non-participation)

```text
projectResourceMetadata(resource)
  1. validateResource(resource)     // includes field + relation + operation validity rules
  2. on failure → invalid_resource
  3. createResourceMetadata(identity, [...resource.annotations])  // operations ignored
  4. on metadata failure → invalid_metadata (defensive)
  5. success → ResourceMetadata with identity + annotation-derived entries only
```

MUST NOT mutate Resource. MUST NOT invent operation-derived metadata keys/envelopes. Invalid `operations` MUST fail the projection gate (no bypass because operations contribute nothing).

---

## Constraints (from Accepted RFC-012)

### SHALL

- represent `operations` as an ordered sequence of name-only Operations
- enforce `OperationName` grammar `/^[a-z][a-zA-Z0-9]*$/` as the sole name constraint
- treat `OperationName` as a dedicated domain (not `FieldName`, not `RelationName`, not `MetadataKey`)
- enforce unique `OperationName`s within the `operations` sequence only
- allow a Field, Relation, and Operation to share the same name string on one Resource
- treat empty `operations` as valid
- validate `operations` as part of Resource validity via schema
- keep operation errors distinct from metadata, annotation, field, and relation validation
- preserve declaration order in snapshots; order participates in sequence equality
- validate candidate closed shape / names / uniqueness before any lossy materialization of `{ name }`
- leave Fields and Relations contracts unchanged
- leave projection free of Operation contributions while still revalidating the Resource

### SHALL NOT

- invent `kind`, signatures, IO, execution/handlers, persistence, loading, joins, cascade, direction, or bounds
- reuse `FieldName` / `RelationName` / `MetadataKey` as the Operation identity type/domain
- reserve any `OperationName`s or treat CRUD names specially
- introduce a unified cross-collection schema namespace rule
- contribute operations to `projectResourceMetadata`
- silently drop, normalize, coerce, strip additional semantic properties, dedupe, or reorder for semantic equality
- transform an invalid candidate into a valid Operation by discarding additional semantic properties before validation
- introduce public `validateOperations` / `validateResourceSchema`
- reopen or reinterpret RFC-009 / RFC-010 / RFC-011 Field/Relation member contracts
- invent annotation vocabulary or field→metadata projection
- export a new public Resource builder solely to support operation tests
- export `operationsEqual` / `validateOperationName` as public product APIs in this slice

---

## Package / ownership boundaries

### `@resource-forge/core` owns

- `packages/core/src/resource/*` Operation types, internal operation helpers, schema widening, validation integration, projection non-participation tests
- tests for RFC-012 member / sequence / validation / equality / independent namespaces / projection non-participation

### Consume only

- Existing identity / metadata / annotations / fields / relations / result utilities as already used by M3.1–M3.8

### Must remain untouched (feature-free)

- `packages/nest`, `packages/graphql`, `packages/prisma`, `packages/cli`

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/core/src/resource/types.ts` | `OperationName`, `Operation`, `OperationValidationError`; widen `ResourceSchema.operations`; widen `invalid_schema.cause`; remove or stop using `EmptySchemaCollection` for operations |
| `packages/core/src/resource/operations.ts` | **internal** candidate validators + `snapshotOperations` (validated Operations only; non-lossy) + optional `operationsEqual` |
| `packages/core/src/resource/operations.test.ts` | sequence / snapshot / equality / namespaces / validation integration tests (via Resource seams) |
| `packages/core/src/resource/schema.ts` | `createEmptyResourceSchema` still empty; types align with widened schema |
| `packages/core/src/resource/validate.ts` | integrate operation validity; replace empty-only `operations` check; retain field/relation checks; snapshot operations like fields/relations |
| `packages/core/src/resource/validate.test.ts` | empty + valid non-empty operations; invalid name/duplicate/member; cross-collection same name ok |
| `packages/core/src/resource/create.ts` | unchanged empty construction (typed as empty `ReadonlyArray<Operation>`) |
| `packages/core/src/resource/create-resource-with-operations.ts` | internal non-empty operations fixture seam |
| `packages/core/src/resource/create-resource-with-fields.ts` | empty `operations` as `ReadonlyArray<Operation>` empty array |
| `packages/core/src/resource/create-resource-with-relations.ts` | empty `operations` as `ReadonlyArray<Operation>` empty array |
| `packages/core/src/resource/fields.test.ts` / `relations.test.ts` | Retarget any “non-empty operations always fail” cases: name-only ops are valid; invalid op members still fail without field/relation causes as appropriate |
| `packages/core/src/resource/project.ts` | no operation contribution (likely unchanged body; revalidation picks up new rules) |
| `packages/core/src/resource/project.test.ts` | non-empty operations ⇒ annotation-derived metadata only; invalid operations ⇒ `invalid_resource`; purity |
| `packages/core/src/resource/exports.test.ts` | public export smoke; assert no `validateOperations` |
| `packages/core/src/resource/index.ts` / `packages/core/src/index.ts` | export `Operation` / `OperationName` / `OperationValidationError` as needed; drop unused `EmptySchemaCollection` if applicable |

Planning note: file names are layout choices, not product module boundaries required by RFC-012.

---

## TDD / verification strategy

For each task: write failing tests → implement → green → commit.

**Must cover:**

1. Empty `operations` valid (M3.1–M3.8 regression)
2. Valid ordered non-empty `operations` accepted via internal fixture; order preserved on Resource
3. Invalid `OperationName` (e.g. `Create`, `create-order`, ``) → `invalid_schema` / `invalid_operation_name`
4. Grammar-valid but “odd camelCase” names (e.g. `createID`) **accepted** — regex is sole constraint
5. Ordinary names `create` / `read` / `update` / `delete` accepted with **no** special semantics
6. Duplicate `OperationName` → `invalid_schema` / `duplicate_operation_name`
7. Extra semantic property on member (e.g. `{ name: 'create', kind: 'command' }`) → `invalid_schema` / `invalid_operation_member` via fixture **and** via `validateResource` — never accepted as `{ name: 'create' }` after silent strip
8. Independent namespaces: Field + Relation + Operation sharing `'create'` → valid Resource
9. Snapshot-by-value / freeze: mutating caller-owned candidate array or member objects MUST NOT change `resource.schema.operations` (only after a **successful** validate-then-snapshot construction)
10. Order-sensitive equality (internal/test): `[create, cancel] ≠ [cancel, create]`
11. Projection: Resource with non-empty `operations` + empty annotations → identity + **no** metadata entries from operations
12. Projection: non-empty `operations` + non-empty annotations → annotation entries only (RFC-006 regression)
13. Projection: invalid operations → `invalid_resource` (validation gate; no bypass)
14. Purity: projection does not mutate Resource / operations order
15. Public surface: `Operation` / `OperationName` / `OperationValidationError` exported as planned; `validateOperations` not exported
16. Fields / Relations regressions remain green (typed Field; associated Relation with multiplicity)
17. No kind / signature / execution / reserved-name / unified-namespace assertions

**Do not:** invent operation→metadata keys; test operation failures via `validateResource` / `invalid_resource` only.

**Regression retarget:** Tests that previously asserted “any non-empty `operations` ⇒ `invalid_schema`” MUST be updated. Name-only non-empty sequences become valid; failures require grammar/duplicate/closed-member violations (or unrelated schema defects).

---

### Task 1: Contract types + failing tests

**Files:**
- Modify: `packages/core/src/resource/types.ts`
- Modify: `packages/core/src/resource/index.ts` / `packages/core/src/index.ts`
- Create: `packages/core/src/resource/operations.test.ts` (and/or extend `validate.test.ts`) with failing expectations
- Update: tests that assumed non-empty operations always fail

- [x] **Step 1: Widen types** — `OperationName`, `Operation`, `OperationValidationError`; `ResourceSchema.operations: ReadonlyArray<Operation>`; `invalid_schema` optional `cause` as `FieldValidationError | RelationValidationError | OperationValidationError`; stop typing operations as `EmptySchemaCollection`
- [x] **Step 2: Write failing tests** for grammar, duplicates, closed member, order preservation, independent namespaces (field+relation+operation), export smoke (`validateOperations` absent), CRUD names as ordinary names
- [x] **Step 3: Run** `pnpm --filter @resource-forge/core test` — expect FAIL on new cases (and compile breaks where empty-only typing was assumed)
- [x] **Step 4: Commit** `test(core): add failing M3.9 operation contract tests`

### Task 2: Snapshot construction + validation integration

**Files:**
- Create: `packages/core/src/resource/operations.ts` (**internal** helpers)
- Create: `packages/core/src/resource/create-resource-with-operations.ts` (internal fixture)
- Modify: `packages/core/src/resource/validate.ts`
- Modify: `packages/core/src/resource/schema.ts` / `create-resource-with-fields.ts` / `create-resource-with-relations.ts` for empty `ReadonlyArray<Operation>`
- Update: `fields.test.ts` / `relations.test.ts` non-empty-operations expectations

- [x] **Step 1: Internal helpers** — `validateOperationName` (`/^[a-z][a-zA-Z0-9]*$/`); **`checkOperations` as the single Operation-validation implementation** (closed shape + uniqueness); `snapshotOperations` accepts only already-validated Operation members and creates a new frozen ordered sequence — MUST NOT discard or normalize additional semantic properties. Raw candidate validation via `checkOperations` occurs before snapshotting.
- [x] **Step 2: Internal fixture** — `createResourceWithOperationsForTests` calls `checkOperations` before snapshot; optional fields/relations; then `validateResource`; not barrel-exported
- [x] **Step 3: `validateResource`** — **delegate** authoritative `operations` validation to `checkOperations` (MUST NOT duplicate the algorithm); retain field/relation checks; remove empty-only `isEmptySchemaCollection(schema.operations)` gate; empty operations still ok; wire `invalid_schema` + operation `cause`; snapshot operations like fields/relations
- [x] **Step 4: Green construction / snapshot / validate / order-sensitive equality / independent-namespace tests** — include proof that `{ name: 'create', kind: 'command' }` fails with `invalid_operation_member` (no silent strip-to-valid)
- [x] **Step 5: Commit** `feat(core): Resource operations sequence and validation (RFC-012)`

### Task 3: Projection non-participation

**Files:**
- Modify: `packages/core/src/resource/project.test.ts`
- Modify: `packages/core/src/resource/project.ts` only if needed (body should remain annotation-only)

- [x] **Step 1: Failing tests** — non-empty operations + empty annotations ⇒ zero entries; operations + annotations ⇒ annotation entries only; invalid operations ⇒ `invalid_resource`; purity / order unchanged
- [x] **Step 2: Confirm implementation** — still `createResourceMetadata(identity, [...annotations])`; no operation mapping
- [x] **Step 3: Green tests**
- [x] **Step 4: Commit** `test(core): operations do not contribute to metadata projection`

### Task 4: Exports, roadmap, slice closeout

**Files:**
- Modify: `packages/core/src/resource/exports.test.ts` / barrels as needed
- Modify: `docs/roadmap.md` — mark M3.9 **implementation** complete only after M6 verification is green
- Mark this plan Status **Accepted** tasks complete only after green (status flip is M5; checkboxes are M6)

- [x] **Step 1: Export smoke** — `Operation` / `OperationName` / `OperationValidationError` as locked; confirm no `validateOperations`; drop unused `EmptySchemaCollection` if applicable
- [x] **Step 2: Full `pnpm --filter @resource-forge/core test` green** (expect ≥ prior count; operations cases added)
- [x] **Step 3: Docs status updates only after verification**
- [x] **Step 4: Commit** `docs: record M3.9 operations slice complete`

---

## Traceability

| Task | RFC-012 sections |
| --- | --- |
| Task 1 | §§2–3 terminology / Operation / OperationName / independent namespaces; public surface |
| Task 2 | §§3–5 snapshot, ordered sequence, uniqueness, validation ownership, error causes, validate-before-snapshot |
| Task 3 | §6 projection non-participation (including validation-gate consequence) |
| Task 4 | Implementation gate / roadmap hygiene |

---

## Explicit deferrals

- Operation `kind`, verb catalogs, CRUD taxonomies, HTTP/RPC mapping
- Signatures, parameters, return types, input/output schemas, error contracts
- Execution, handlers, runtime dispatch, side effects, transactions
- Persistence / ORM, loading / fetch, joins, cascade, direction, bounds
- Optional vs required operations; nullability
- Unified cross-collection schema namespace
- Field / Relation member-shape changes (RFC-009 / RFC-010 / RFC-011)
- Field → metadata projection; Operation → metadata contribution beyond “none”
- Annotation vocabulary
- Public Resource equality / builders / `createResource(identity, operations?)`
- Public `validateOperations` / `validateResourceSchema`
- Reserved `OperationName` catalogs
- Host adapters

---

## M5 Plan Review checklist (for reviewers)

- [x] No new product semantics beyond RFC-012
- [x] `operations` is ordered sequence; equality order-sensitive (test/internal)
- [x] `Operation` closed name-only; regex is sole `OperationName` constraint; dedicated domain (not Field/Relation name)
- [x] Independent Field/Relation/Operation namespaces explicit and tested
- [x] `checkOperations` is the single Operation-validation implementation; reused by fixtures and `validateResource` (no duplicated algorithm)
- [x] Snapshot construction separated from `validateResource`; candidates validated via `checkOperations` before any `{ name }`-only materialization
- [x] `snapshotOperations` never strips additional semantic properties; invalid candidates cannot become valid Operations by discard
- [x] Non-empty Resources via internal/test seam only (no public builder)
- [x] Operation helpers internal; public validation remains `validateResource`
- [x] Operation errors under `invalid_schema` with only three cause codes; field/relation causes unchanged
- [x] Fields / Relations contracts unchanged (RFC-009 / RFC-010 / RFC-011)
- [x] Projection non-participation required and tested; invalid operations still fail projection gate
- [x] Kind / signature / execution / reserved names / unified namespace deferred
- [x] Prior “non-empty operations always fail” tests explicitly retargeted
- [x] TDD tasks executable without inventing sequencing
- [x] M6 must not start until this plan is **Accepted**
- [x] Delivery packaging: Accepted plan + implementation in **one PR** for [#38](https://github.com/rexescario-dev/resource-forge/issues/38) (no plan-only merge)

---

## Gate

**M5 Accepted.** M6 implementation may begin under this plan and tracking issue #38. Do not invent kind/IO/execution semantics, Field/Relation reopen, or a public operations builder. `checkOperations` remains the single Operation-validation implementation.

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.9 Resource Operations |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/38 |
| M4 | Plan **Accepted** |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | Pending |
| M8 | Pending |
| M9 | Pending |
| Branch | `feat/m3-9-operations` |
| PR | https://github.com/rexescario-dev/resource-forge/pull/39 |
| Status | **Ready for M7** |

### Shipped

- Widened `ResourceSchema.operations` to ordered `ReadonlyArray<Operation>` (`Operation = { name }`)
- `checkOperations` as single Operation-validation implementation; reused by fixture + `validateResource`
- Validate-before-snapshot; closed member (no strip of `kind`); empty valid; independent namespaces
- No Operation → metadata contribution; invalid ops still fail projection gate
- Removed `EmptySchemaCollection`; no public `validateOperations`

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (159 in `@resource-forge/core`) |
| Typecheck | **Passed** |
| Lint | Skipped |
| Build | Skipped |
| Package validation | Skipped |

### Next Gate

**M7 — Code Review**
