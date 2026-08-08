# M3.8 Resource Relation Multiplicity — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-011. Reuse M3.1–M3.7 Resource / schema / field / relation / annotation / projection surfaces. Do **not** implement optional/required, nullability, min/max bounds, direction/inverse, local-field/join, cascade, loading/fetch, persistence/ORM, polymorphic targets, registry resolution, association→metadata projection, dual-shape compatibility, Operations widening, or public `validateRelations` / `validateRelationMultiplicity` APIs.

**Status:** Accepted  
**M5:** Accepted (2026-08-08) — Plan Review; no plan blockers; hygiene: Task 2 helpers remain module-local (same-package seams only, not barrel-exported); `validateRelationMultiplicity` optional/inline; Task 1 split fixture updates vs new failing cases; one PR with implementation for #33  
**Tracking:** [#33](https://github.com/rexescario-dev/resource-forge/issues/33)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted) — M3.8 was blocked on Relation Multiplicity RFC  
**Source RFC:** RFC-011 Relation Multiplicity (**Accepted**) — amends Relation member shape; partial supersession of RFC-010 §5  
**Depends on:** RFC-001 (**Accepted**, `user` context for targets); RFC-005 (**Accepted**); RFC-006 (**Accepted**); RFC-007 / RFC-009 (**Accepted**, Fields unchanged); RFC-008 (**Accepted**, collection rules retained); RFC-010 (**Accepted**, declarative `target` retained); RFC-011 (**Accepted**); M3.1–M3.7 shipped  
**Package:** `@resource-forge/core`  
**Slice:** M3.8 only — required Relation `multiplicity: "one" | "many"` (singular vs collection relationship shape); breaking vs M3.7 `{ name, target }` Relations; no dual-shape; validate-before-snapshot; projection non-participation unchanged

**Goal:** Widen every Relation from `{ name, target }` to exactly `{ name: RelationName; target: ResourceIdentity; multiplicity: RelationMultiplicity }`, validate closed shape + RelationName + uniqueness + declarative target + exact multiplicity vocabulary as part of Resource validity, redefine Relation value equality to include `multiplicity`, and keep `projectResourceMetadata` free of any Relation→metadata contribution.

**Architecture:**

```text
candidate relations sequence
          │
          ▼
 validate candidate member shape   ← exactly `{ name, target, multiplicity }` (extras → invalid_relation_member; no strip)
          │
          ▼
 validate RelationName + uniqueness ← RFC-008 grammar + duplicates-by-name → failure
          │
          ▼
 validate target (RFC-010)          ← structured ResourceIdentity; validateResourceIdentity(..., { kind: 'user' })
          │
          ▼
 validate multiplicity              ← absent → missing_relation_multiplicity;
                                    │ present but not exact "one"|"many" → invalid_relation_multiplicity
          │
          ▼
 snapshot exact valid Relations     ← freeze ordered `{ name, target, multiplicity }`; never invent default multiplicity
          │
          ▼
       Resource.schema
          │
          ▼
    validateResource               ← authoritative Resource gate
          │
          ▼
 projectResourceMetadata           ← revalidate Resource; annotation-derived metadata only; relations contribute nothing
```

**Invariant:** No implementation step may transform an invalid candidate into a valid Relation by discarding information (including stripping unknown properties or inventing a default `multiplicity`) before validation.

`multiplicity` is declared relationship shape only — not optional/required, nullability, min/max, instance-count validation, direction, join, load, or persistence. Uniqueness within `relations` remains **by name only** (RFC-008). Relation value equality is exact `name` **and** RFC-001 `target` equality **and** exact `multiplicity` equality (RFC-011). The `relations` sequence (RFC-008 collection of declarations) is distinct from `multiplicity: "many"` (target relationship shape of one Relation).

**Tech Stack:** TypeScript strict, Vitest (existing `packages/core` scripts)

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Locked decisions (export / shape review — planning aids)

These freeze the M3.8 implementation surface. They MUST NOT invent product semantics beyond RFC-011 (+ retained RFC-008 / RFC-010 / RFC-001 rules).

| Decision | Lock |
| --- | --- |
| `RelationMultiplicity` | Exact closed set `"one" \| "many"`. Case-sensitive; no trim/alias/coerce/normalize. |
| `Relation` | `{ readonly name: RelationName; readonly target: ResourceIdentity; readonly multiplicity: RelationMultiplicity }` **exactly**. No additional members. |
| `"one"` / `"many"` meaning | Singular vs collection **relationship shape only**. Not exactly-one / not zero-or-more / not one-or-more / not required to-one / no min/max. |
| Missing `multiplicity` | `missing_relation_multiplicity` (structural absence). |
| Present-but-invalid `multiplicity` | `invalid_relation_multiplicity` (vocabulary violation). |
| Extra Relation member | `invalid_relation_member` (e.g. `{ name, target, multiplicity, optional }`). |
| Two-member `{ name, target }` | **Invalid** after this slice (breaking vs M3.7). No dual-shape; maps to `missing_relation_multiplicity` when `multiplicity` key is absent and no extras obscure the absence. |
| Name-only / malformed structure | Retain RFC-010 / RFC-008 causes (`invalid_relation_member`, name/duplicate/target as applicable). |
| `RelationName` / uniqueness / order / empty | Unchanged RFC-008. Uniqueness by name only — not by `(name, target, multiplicity)`. |
| Declarative `target` | Unchanged RFC-010; still `validateResourceIdentity(..., { kind: 'user' })`. |
| Self-target / same target different names | Allowed (unchanged). |
| `relations` representation | `ReadonlyArray<Relation>` (array index is semantic order). |
| `fields` / `operations` | Unchanged from M3.7. |
| Snapshot vs validation | **Separated, non-lossy.** Validate candidates **before** materializing `{ name, target, multiplicity }`. `snapshotRelations` freezes already-valid members; MUST NOT invent default `multiplicity`. |
| Non-empty Resource construction | **No public builder.** Tests use existing **internal** `createResourceWithRelationsForTests` (validate-before-snapshot). |
| Internal helpers | `validateRelationName` / `checkRelations` / `snapshotRelations` / `relationsEqual` remain **module-local same-package seams** (existing M3.5–M3.7 mechanism; MUST NOT be barrel-/package-exported). The implementation MAY validate multiplicity **inline** in `checkRelations`; a separate internal `validateRelationMultiplicity` helper is **optional** and MUST NOT become public. |
| Validation ownership | Part of `validateResource` via schema. No public `validateRelations` / `validateRelationMultiplicity`. |
| Schema error taxonomy | Relation failures: `invalid_schema` **with** `cause: RelationValidationError` using existing causes plus **`missing_relation_multiplicity`** and **`invalid_relation_multiplicity`**. |
| Projection | Still annotation-only. Relations MUST NOT contribute entries. |
| Equality helper | **Test/internal only** `relationsEqual`: order-sensitive; each index compares `name` + `resourceIdentitiesEqual(target)` + exact `multiplicity`. |
| Compose / registry | SHALL NOT require compose/registry; SHALL NOT look up targets or validate instance counts. |

---

## M3.8 public contract surface

| Symbol | Kind | Role |
| --- | --- | --- |
| `RelationName` | type | Retained (RFC-008) |
| `RelationMultiplicity` | type | Closed `"one" \| "many"` |
| `Relation` | type | `{ readonly name; readonly target; readonly multiplicity }` |
| `RelationValidationError` | type | Prior causes + `missing_relation_multiplicity` + `invalid_relation_multiplicity` |
| `ResourceSchema` | type | Unchanged collection slots; `relations` members carry multiplicity |
| `validateResource` | function | Validates multiplicity rules + retained RFC-008/010/009/005/006 rules |
| `createResource` / `createEmptyResourceSchema` | function | Still empty collections |
| `projectResourceMetadata` | function | Identity + annotation entries only |
| Field / annotation / identity surfaces | retained | Unchanged |

**Not public in M3.8:**

- `validateRelations` / `validateRelationMultiplicity` / `validateRelationName` / `snapshotRelations` / `relationsEqual`
- Public Resource builders / `createResource(identity, relations?)`
- Optional/required, nullability, min/max, direction, join, cascade, load, persistence, polymorphism
- Registry-backed resolution or instance-count validation
- Relation→metadata projection
- Dual-shape migration helpers
- Operations members beyond empty

**Retain:** M2–M3.7 exports; `PACKAGE_NAME` / `PACKAGE_VERSION`.

### Relation validation error shape (planning aid)

```ts
type RelationMultiplicity = 'one' | 'many';

type Relation = {
  readonly name: RelationName;
  readonly target: ResourceIdentity;
  readonly multiplicity: RelationMultiplicity;
};

type RelationValidationError =
  | {
      readonly code: 'invalid_relation_name';
      readonly index: number;
      readonly name: string;
    }
  | {
      readonly code: 'duplicate_relation_name';
      readonly index: number;
      readonly name: string;
    }
  | {
      readonly code: 'invalid_relation_member';
      readonly index: number;
    }
  | {
      readonly code: 'invalid_relation_target';
      readonly index: number;
      readonly cause: IdentityValidationError;
    }
  | {
      readonly code: 'missing_relation_multiplicity';
      readonly index: number;
    }
  | {
      readonly code: 'invalid_relation_multiplicity';
      readonly index: number;
      readonly multiplicity: unknown;
    };
```

Do not invent additional relation cause codes beyond RFC-011 conceptual separation. Do not put field/operation emptiness failures under relation causes.

### Construction vs validation (normative for this plan)

| Concern | Owner |
| --- | --- |
| Validate raw candidates (shape / names / uniqueness / target / multiplicity) | Internal fixture / construction seam — **before** snapshot |
| Establish snapshotted ordered `relations` from **already-valid** Relations | Empty schema constructors; **internal** fixtures for non-empty tests |
| Decide validity of a Resource’s relations | `validateResource` |
| Project metadata | `projectResourceMetadata` after revalidation — annotations only |

**Internal non-empty relations fixture seam (existing; update comments + behavior):**

```ts
// internal / test-only — NOT exported from packages/core public API
function createResourceWithRelationsForTests(
  identity: ResourceIdentity,
  candidateRelations: readonly object[],
  annotations?: Annotations,
  candidateFields?: readonly object[],
): Result<Resource, ResourceValidationError>
```

`createResourceWithRelationsForTests` validates candidate closed shape (`name` + `target` + `multiplicity` exactly), names, uniqueness, declarative target under RFC-001 `user` context, and exact multiplicity vocabulary **before** constructing the snapshot; successful construction freezes ordered `{ readonly name, readonly target, readonly multiplicity }` and then passes the Resource through `validateResource`.

Failure mapping MUST use the same `invalid_schema` + `RelationValidationError` causes as `validateResource` (no silent success after stripping or inventing `multiplicity`).

### Projection behavior (unchanged non-participation)

```text
projectResourceMetadata(resource)
  1. validateResource(resource)     // includes multiplicity validity rules
  2. on failure → invalid_resource
  3. createResourceMetadata(identity, [...resource.annotations])  // relations ignored
  4. on metadata failure → invalid_metadata (defensive)
  5. success → ResourceMetadata with identity + annotation-derived entries only
```

MUST NOT mutate Resource. MUST NOT invent relation-derived metadata keys/envelopes.

---

## Constraints (from Accepted RFC-011 + retained RFC-008 / RFC-010 / RFC-001)

### SHALL

- represent every Relation as exactly `{ name, target, multiplicity }`
- require `multiplicity` on every Relation; reject absence as `missing_relation_multiplicity`
- accept only exact `"one"` and `"many"`; reject aliases/cased/trimmed/bounds expressions as `invalid_relation_multiplicity`
- redefine Relation value equality as exact `name` **and** RFC-001 target equality **and** exact `multiplicity`
- retain RFC-008 `RelationName`, ordered sequence, uniqueness-by-name, empty validity, snapshot ownership, independent namespaces
- retain RFC-010 declarative `target` + `user` validation context
- validate candidates **before** any materialization of `{ name, target, multiplicity }`
- keep relation errors distinct; separate missing vs invalid multiplicity
- keep fields/operations/annotations unchanged
- leave projection free of relation contributions

### SHALL NOT

- accept two-member `{ name, target }` Relations (no dual-shape period)
- invent optional/required, nullability, min/max, direction/inverse, local-field/join, cascade, loading/fetch, persistence/ORM, or polymorphic targets
- interpret `"one"` as exactly-one / required to-one, or `"many"` as zero-or-more / one-or-more / any bound
- default, coerce, normalize, or invent `multiplicity`
- contribute relations to `projectResourceMetadata`
- transform an invalid candidate into a valid Relation by discarding unknown properties before validation
- introduce public `validateRelations` / `validateRelationMultiplicity` / `validateResourceSchema`
- widen operations beyond empty
- export `relationsEqual` / `validateRelationName` / `validateRelationMultiplicity` as public product APIs
- conflate the `relations` sequence with `multiplicity: "many"` semantics

---

## Package / ownership boundaries

### `@resource-forge/core` owns

- `packages/core/src/resource/*` Relation types, internal relation helpers, validation integration, fixture comments, regression test updates
- tests for RFC-011 multiplicity shape / vocabulary / equality / validation / projection non-participation

### Consume only

- Existing identity, metadata, annotations, fields, result utilities as already used by M3.1–M3.7

### Must remain untouched (feature-free)

- `packages/nest`, `packages/graphql`, `packages/prisma`, `packages/cli`

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/core/src/resource/types.ts` | Add `RelationMultiplicity`; widen `Relation`; add missing/invalid multiplicity error variants |
| `packages/core/src/resource/relations.ts` | Closed `{ name, target, multiplicity }` validation; exact vocabulary; non-lossy snapshot; equality includes multiplicity |
| `packages/core/src/resource/relations.test.ts` | Accept one/many; reject two-member / missing / aliases / extras; equality includes multiplicity |
| `packages/core/src/resource/create-resource-with-relations.ts` | Comments + snapshot of three-member Relations |
| `packages/core/src/resource/validate.ts` | Uses widened `checkRelations` (likely body-stable) |
| `packages/core/src/resource/validate.test.ts` | Update fixtures to include `multiplicity` |
| `packages/core/src/resource/project.test.ts` | Multiplicity fixtures; still zero relation→metadata contribution |
| `packages/core/src/resource/exports.test.ts` | Export `RelationMultiplicity`; assert no public multiplicity validate helper |
| `packages/core/src/resource/index.ts` / `packages/core/src/index.ts` | Export `RelationMultiplicity` alongside widened Relation types |
| `docs/roadmap.md` | Mark M3.8 implementation complete only after M6 verification is green |

Planning note: file names are layout choices, not product module boundaries required by RFC-011.

---

## TDD / verification strategy

For each task: write failing tests → implement → green → commit.

**Must cover:**

1. Empty `relations` remains valid (regression)
2. Valid Relations with `multiplicity: "one"` and `"many"` accepted; order + target + multiplicity preserved
3. Self-target + `"one"` / `"many"` still allowed
4. Same target under different names with multiplicities allowed
5. Two-member `{ name, target }` (missing multiplicity) → `missing_relation_multiplicity` (breaking vs M3.7)
6. Extra property (e.g. `optional: true`) → `invalid_relation_member` — never stripped
7. Present-but-invalid multiplicity (`"toOne"`, `"One"`, `"0..*"`, `"many "`, non-string) → `invalid_relation_multiplicity`
8. Invalid `RelationName` / duplicate name / bad target still map to existing causes (with valid multiplicity present where needed to isolate the cause)
9. Uniqueness by name only: same name with different multiplicity cannot coexist → `duplicate_relation_name`
10. Snapshot ownership: mutating caller-owned candidate array/members MUST NOT change snapshotted Relations; assert freezes on array, each Relation, each `target`
11. Order-sensitive equality (internal/test): different multiplicity → unequal; different order → unequal
12. Independent namespaces: Field and Relation may share name string
13. Projection: non-empty relations with multiplicity + empty annotations → no relation-derived metadata entries
14. Projection: invalid two-member relations → `invalid_resource`
15. Purity: projection does not mutate Resource / relations
16. Public surface: `RelationMultiplicity` + widened `Relation` / `RelationValidationError` exported; no `validateRelationMultiplicity` / `validateRelations`
17. Fields / operations / annotations regressions remain green

**Do not:** invent bounds/optional/null semantics; accept dual-shape; default multiplicity; contribute relations to metadata.

---

### Task 1: Contract types + failing tests (breaking widen)

**Files:**
- Modify: `packages/core/src/resource/types.ts`
- Modify: `packages/core/src/resource/relations.test.ts`
- Modify: `packages/core/src/resource/validate.test.ts`
- Modify: `packages/core/src/resource/project.test.ts` (fixture shapes)
- Modify: `packages/core/src/resource/exports.test.ts`

- [x] **Step 1: Widen types**

```ts
export type RelationMultiplicity = 'one' | 'many';

export type Relation = {
  readonly name: RelationName;
  readonly target: ResourceIdentity;
  readonly multiplicity: RelationMultiplicity;
};

export type RelationValidationError =
  | { readonly code: 'invalid_relation_name'; readonly index: number; readonly name: string }
  | { readonly code: 'duplicate_relation_name'; readonly index: number; readonly name: string }
  | { readonly code: 'invalid_relation_member'; readonly index: number }
  | {
      readonly code: 'invalid_relation_target';
      readonly index: number;
      readonly cause: IdentityValidationError;
    }
  | { readonly code: 'missing_relation_multiplicity'; readonly index: number }
  | {
      readonly code: 'invalid_relation_multiplicity';
      readonly index: number;
      readonly multiplicity: unknown;
    };
```

- [x] **Step 2: Update fixtures + add failing multiplicity tests**

1. Update existing **valid** M3.7 fixtures that used `{ name, target }` to the new accepted three-member shape (prerequisite compatibility — these should stay green once implemented).
2. Add **new** RFC-011 regression tests that initially fail (missing multiplicity, invalid vocabulary, extras, equality includes multiplicity).
3. Run tests and expect failure specifically from the new multiplicity behavior (not from fixture typos).

```ts
it('accepts closed Relations with multiplicity one and many', () => {
  const resource = createResourceWithRelationsForTests(identity, [
    {
      name: 'customer',
      target: { namespace: 'crm', name: 'Customer' },
      multiplicity: 'one',
    },
    {
      name: 'lineItems',
      target: { namespace: 'crm', name: 'LineItem' },
      multiplicity: 'many',
    },
  ]);
  expect(resource.ok).toBe(true);
  // expect preserved name+target+multiplicity order
});

it('rejects two-member Relations as missing_relation_multiplicity (breaking)', () => {
  const resource = createResourceWithRelationsForTests(identity, [
    { name: 'customer', target: { namespace: 'crm', name: 'Customer' } },
  ]);
  expect(resource.ok).toBe(false);
  // cause: missing_relation_multiplicity
});

it('rejects invalid multiplicity vocabulary as invalid_relation_multiplicity', () => {
  for (const multiplicity of ['toOne', 'One', '0..*', 'many '] as const) {
    const resource = createResourceWithRelationsForTests(identity, [
      {
        name: 'customer',
        target: { namespace: 'crm', name: 'Customer' },
        multiplicity,
      },
    ]);
    expect(resource.ok).toBe(false);
    // cause: invalid_relation_multiplicity
  }
});

it('rejects extra Relation members without stripping', () => {
  const resource = createResourceWithRelationsForTests(identity, [
    {
      name: 'customer',
      target: { namespace: 'crm', name: 'Customer' },
      multiplicity: 'one',
      optional: true,
    },
  ]);
  expect(resource.ok).toBe(false);
  // cause: invalid_relation_member
});

it('treats Relations equal only when name, target, and multiplicity match', () => {
  expect(
    relationsEqual(
      [
        {
          name: 'a',
          target: { namespace: 'crm', name: 'A' },
          multiplicity: 'one',
        },
      ],
      [
        {
          name: 'a',
          target: { namespace: 'crm', name: 'A' },
          multiplicity: 'many',
        },
      ],
    ),
  ).toBe(false);
});
```

Also update `validate.test.ts` / `project.test.ts` acceptance fixtures to three-member Relations.

- [x] **Step 3: Run** `pnpm --filter @resource-forge/core test` — expect FAIL on new/updated multiplicity cases
- [x] **Step 4: Commit** `test(core): add failing M3.8 Relation multiplicity contract tests`

### Task 2: Validate-before-snapshot + validation integration

**Files:**
- Modify: `packages/core/src/resource/relations.ts`
- Modify: `packages/core/src/resource/create-resource-with-relations.ts` (comments / snapshot shape)
- Confirm: `packages/core/src/resource/validate.ts` continues to call `checkRelations`

- [x] **Step 1: Widen `checkRelations`**

Recommended per-member order (planning aid; preserve reject-don’t-repair):

1. plain object required → else `invalid_relation_member`
2. if own key `multiplicity` is absent → `missing_relation_multiplicity` (do this before treating two-member objects as generic invalid members)
3. `Object.keys(member)` must be exactly `{ name, target, multiplicity }` → else `invalid_relation_member` (extras / missing name or target)
4. `name` string + `validateRelationName` → `invalid_relation_name`
5. uniqueness-by-name → `duplicate_relation_name`
6. `target` plain object with keys exactly `{ namespace, name }` → else `invalid_relation_member`
7. `validateResourceIdentity(..., { kind: 'user' })` → on failure `invalid_relation_target`
8. `multiplicity` exact membership in `"one" \| "many"` → else `invalid_relation_multiplicity` with `multiplicity: unknown` (inline check is fine; separate helper optional)
9. push `{ name, target, multiplicity }`

For step 2: prefer `missing_relation_multiplicity` when keys are exactly `{ name, target }` (multiplicity absent, no extras). Name-only / other malformed shapes without a clean two-member absence continue to map to `invalid_relation_member`.

MUST NOT strip extras, invent `multiplicity`, coerce aliases, or validate live instance counts.

- [x] **Step 2: Widen `snapshotRelations` / `relationsEqual` (module-local only)**

Same-package module-local seams (existing mechanism — **not** public/barrel exports):

```ts
// module-local only — MUST NOT barrel-export
function snapshotRelations(
  relations: readonly Relation[],
): ReadonlyArray<Relation> {
  return Object.freeze(
    relations.map((relation) =>
      Object.freeze({
        name: relation.name,
        target: Object.freeze({
          namespace: relation.target.namespace,
          name: relation.target.name,
        }),
        multiplicity: relation.multiplicity,
      }),
    ),
  );
}

// module-local only — MUST NOT barrel-export
function relationsEqual(
  left: readonly Relation[],
  right: readonly Relation[],
): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i]!.name !== right[i]!.name) return false;
    if (!resourceIdentitiesEqual(left[i]!.target, right[i]!.target)) return false;
    if (left[i]!.multiplicity !== right[i]!.multiplicity) return false;
  }
  return true;
}
```

Retain the existing M3.5–M3.7 TypeScript module-local visibility pattern for same-package imports/tests; do not package-export these helpers.

- [x] **Step 3: Update fixture comments** to say freeze `{ name, target, multiplicity }`
- [x] **Step 4: Green** Task 1 multiplicity acceptance + rejection causes
- [x] **Step 5: Commit** `feat(core): require Relation multiplicity one|many (RFC-011)`

### Task 3: Projection non-participation + field coexistence regressions

**Files:**
- Modify: `packages/core/src/resource/project.test.ts` (finish multiplicity fixtures if needed)
- Touch `project.ts` only if needed (body should remain annotation-only)

- [x] **Step 1: Ensure projection tests** use three-member Relations; assert zero relation-derived entries; invalid two-member relations → `invalid_resource`; purity
- [x] **Step 2: Confirm implementation** still `createResourceMetadata(identity, [...annotations])`
- [x] **Step 3: Full suite green including fields / annotations**
- [x] **Step 4: Commit** `test(core): multiplicity relations do not contribute to metadata projection`

### Task 4: Exports, roadmap, plan status hygiene

**Files:**
- Modify: `packages/core/src/resource/exports.test.ts` / barrels as needed
- Modify: `docs/roadmap.md` — mark M3.8 **implementation** complete only after M6 verification is green
- Update this plan’s Status / M5 note only when Plan Review Accepts (M5), and checkboxes when M6 completes

- [x] **Step 1: Export smoke** — `RelationMultiplicity` exported; widened `Relation` / `RelationValidationError`; no `validateRelationMultiplicity` / `validateRelations`
- [x] **Step 2: Full** `pnpm --filter @resource-forge/core test` **green** (expect ≥ prior 142; net new multiplicity cases)
- [x] **Step 3: Docs status updates only after verification**
- [x] **Step 4: Commit** `docs: record M3.8 relation multiplicity slice complete`

---

## Traceability

| Task | RFC-011 sections |
| --- | --- |
| Task 1 | §§1–5 multiplicity vocabulary / Relation shape / equality / supersession; public surface |
| Task 2 | §§4–6 missing vs invalid multiplicity; validate-before-snapshot; conceptual causes |
| Task 3 | §7 projection / adjacent contracts unchanged |
| Task 4 | §8 compatibility; §15 implementation gate / roadmap hygiene |

Retained RFC-008 collection rules and RFC-010 target rules are exercised across Tasks 1–3 without reopening their authority.

---

## Explicit deferrals

- Optional / required relationship presence
- Nullability
- `min` / `max` / UML ranges / open cardinality expressions
- Additional multiplicity values or aliases
- Direction, inverse relations, bidirectional pairing
- Local-field handles, foreign keys, join mapping
- Cascade behavior
- Loading / fetch / query semantics
- Persistence / ORM mapping
- Polymorphic targets / union targets
- Registry-backed resolution or existence checks
- Runtime instance-count validation against data
- Association → metadata projection / cross-source composition
- Dual-shape migration helpers or adapters
- Public `validateRelations` / `validateRelationMultiplicity` / Resource builders
- Operations members; annotation vocabulary; field shape changes

---

## M5 Plan Review checklist (for reviewers)

- [x] No new product semantics beyond RFC-011 (+ retained RFC-008 / RFC-010 / RFC-001 rules)
- [x] Relation is exactly `{ name, target, multiplicity }`; two-member rejected; no dual-shape
- [x] `RelationMultiplicity` is closed `"one" \| "many"` by exact membership
- [x] `"one"` / `"many"` are shape-only (not bounds / optional / null / instance counts)
- [x] Missing `multiplicity` → `missing_relation_multiplicity`; present-but-invalid → `invalid_relation_multiplicity`
- [x] Extras → `invalid_relation_member`; target still via `validateResourceIdentity(..., { kind: 'user' })`
- [x] Relation equality includes `multiplicity`; uniqueness remains by name only
- [x] Snapshot construction separated from `validateResource`; no default `multiplicity`
- [x] Non-empty Resources via internal/test seams only (no public builder)
- [x] Relation helpers internal/test-only; public validation remains `validateResource`
- [x] Projection non-participation required and tested
- [x] Optional/required / nullability / min-max / direction / join / load / persistence / polymorphism / Operations deferred
- [x] Fields / operations / annotations unchanged
- [x] TDD tasks executable without inventing sequencing
- [x] M6 must not start until this plan is **Accepted**
- [x] Delivery packaging: Accepted plan + implementation in **one PR** for [#33](https://github.com/rexescario-dev/resource-forge/issues/33) (no plan-only merge)

---

## M5 review record

```text
Decision: Accepted
Subject (plan): docs/superpowers/plans/2026-08-08-m3-8-relation-multiplicity.md
Accepted specification: docs/superpowers/specs/2026-08-08-rfc-011-relation-multiplicity-design.md
Delivery goal: Breaking widen Relation to exactly { name, target, multiplicity } with closed "one"|"many"; missing vs invalid multiplicity; validate-before-snapshot; no dual-shape; projection unchanged
Review summary: No plan blockers. Hygiene recorded: helpers module-local/not barrel-exported; validateRelationMultiplicity optional/inline; Task 1 fixture updates vs new failing cases clarified.
Findings: None (no plan blockers)
Traceability: adequate (coverage + deferrals checked)
Gate: Proceed to M6. No implementation activity before this Accept.
Authority: Plan governs sequencing/execution; specification governs product semantics.
```

---

## Gate

**M5 Accepted.** Proceed to **M6 Implementation** on [#33](https://github.com/rexescario-dev/resource-forge/issues/33) / [#34](https://github.com/rexescario-dev/resource-forge/pull/34).