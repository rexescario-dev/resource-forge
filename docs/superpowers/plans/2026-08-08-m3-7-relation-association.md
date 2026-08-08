# M3.7 Resource Relation Association — Implementation Tasks

> **For agentic workers:** Status is **Draft** (awaiting M5 Plan Review). After **Accepted**, REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-010. Reuse M3.1–M3.6 Resource / schema / field / relation / annotation / projection surfaces. Do **not** implement cardinality, direction/inverse, local-field/join, cascade, loading/fetch, persistence/ORM, polymorphic targets, registry resolution, association→metadata projection, dual-shape compatibility, Operations widening, or public `validateRelations` / `validateRelationTarget` APIs.

**Status:** Draft  
**Tracking:** [#28](https://github.com/rexescario-dev/resource-forge/issues/28)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted) — M3.7 was blocked on Relation Association RFC  
**Source RFC:** RFC-010 Relation Association Semantics (**Accepted**) — amends Relation member shape; partial supersession of RFC-008 §3.2  
**Depends on:** RFC-001 (**Accepted**, `user` context for targets); RFC-005 (**Accepted**); RFC-006 (**Accepted**); RFC-007 / RFC-009 (**Accepted**, Fields unchanged); RFC-008 (**Accepted**, collection rules retained); RFC-010 (**Accepted**); M3.1–M3.6 shipped  
**Package:** `@resource-forge/core`  
**Slice:** M3.7 only — required associated Relation `{ name, target }` with declarative `ResourceIdentity` target under RFC-001 **`user`** validation context; breaking vs M3.5 name-only Relations; no dual-shape; validate-before-snapshot; projection non-participation unchanged

**Goal:** Widen every Relation from name-only `{ name }` to exactly `{ name: RelationName; target: ResourceIdentity }`, validate closed shape + RelationName + uniqueness + declarative target (RFC-001 `user` context) as part of Resource validity, redefine Relation value equality to include `target`, and keep `projectResourceMetadata` free of any Relation→metadata contribution.

**Architecture:**

```text
candidate relations sequence
          │
          ▼
 validate candidate member shape   ← exactly `{ name, target }`; missing/extra → invalid_relation_member (no strip)
          │
          ▼
 validate RelationName + uniqueness ← RFC-008 grammar + duplicates-by-name → failure
          │
          ▼
 validate target structure          ← plain object; exactly `{ namespace, name }` keys on target value
          │
          ▼
 validateResourceIdentity(target, { kind: 'user' })
                                    ← RFC-001 grammar + reserved `rf` rejection; no registry lookup
          │
          ▼
 snapshot exact valid Relations     ← freeze ordered `{ readonly name, readonly target }`; never invent default target
          │
          ▼
       Resource.schema
          │
          ▼
    validateResource               ← authoritative Resource gate; fields per RFC-009; operations empty-only
          │
          ▼
 projectResourceMetadata           ← revalidate Resource; annotation-derived metadata only; relations contribute nothing
```

**Invariant:** No implementation step may transform an invalid candidate into a valid Relation by discarding information (including stripping unknown properties or inventing a default `target`) before validation.

`target` is declared association identity only — not registry resolution, existence, or runtime load. Uniqueness within `relations` remains **by name only** (RFC-008). Relation value equality is exact `name` **and** RFC-001 `target` equality (RFC-010). Collection order, empty validity, snapshot ownership, independent Field/Relation namespaces, and projection non-participation remain RFC-008.

**Tech Stack:** TypeScript strict, Vitest (existing `packages/core` scripts)

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Locked decisions (export / shape review — planning aids)

These freeze the M3.7 implementation surface. They MUST NOT invent product semantics beyond RFC-010 (+ retained RFC-008 collection rules + RFC-001 identity rules).

| Decision | Lock |
| --- | --- |
| `Relation` | `{ readonly name: RelationName; readonly target: ResourceIdentity }` **exactly**. No additional members. |
| `target` | Structured `{ readonly namespace: string; readonly name: string }` satisfying RFC-001 under **`user`** context. |
| Target validation | Call existing `validateResourceIdentity(candidate, { kind: 'user' })`. Do **not** invent Relation-local reservation rules or a new validation context. |
| Missing `target` | `invalid_relation_member` (required member absent). |
| Extra Relation member | `invalid_relation_member` (e.g. `{ name, target, cardinality }`). |
| Name-only `{ name }` | **Invalid** after this slice (breaking vs M3.5). No dual-shape acceptance. |
| String / canonical target | `target: "crm/Customer"` → `invalid_relation_member` (not structured `ResourceIdentity`). No parse path. |
| Malformed target value | `target` not a plain object, or target object keys ≠ exactly `{ namespace, name }` → `invalid_relation_member`. |
| Present structured target failing RFC-001 `user` validation | `invalid_relation_target` with `cause: IdentityValidationError` (includes reserved `rf`). |
| `RelationName` / uniqueness / order / empty | Unchanged RFC-008. Uniqueness by name only — not by `(name, target)`. |
| Self-target | Allowed (no cycle analysis). |
| Same target, different names | Allowed. |
| `relations` representation | `ReadonlyArray<Relation>` (array index is semantic order). |
| `fields` / `operations` | Unchanged from M3.6 (`ReadonlyArray<Field>` typed; operations empty-only). |
| Snapshot construction vs validation | **Separated, non-lossy.** Raw candidate validation happens **before** any snapshot that materializes `{ name, target }` only. `snapshotRelations` accepts only already-validated `Relation` members and freezes an ordered sequence; it MUST NOT discard, strip, normalize, or invent `target`. |
| Non-empty Resource construction | **No public builder.** Public `createResource(identity)` remains empty schema collections + empty annotations. Tests use existing **internal** fixtures (`createResourceWithRelationsForTests` / field fixtures) that validate candidates before snapshotting. |
| Internal helpers | Preserve the **existing** M3.5 mechanism: `validateRelationName` / `checkRelations` / `snapshotRelations` / `relationsEqual` may remain **module-local exports** in `relations.ts` for same-package seams and tests, but MUST NOT be barrel-/package-exported. Target checks use public/package-internal `validateResourceIdentity` + `resourceIdentitiesEqual` — no new public Relation validate API. |
| Validation ownership | Part of `validateResource` via schema. No public `validateRelations` / `validateRelationTarget` / `validateResourceSchema`. |
| Schema error taxonomy | Relation failures: `invalid_schema` **with** `cause: RelationValidationError` using `invalid_relation_name` / `duplicate_relation_name` / `invalid_relation_member` / **`invalid_relation_target`**. Field failures unchanged. |
| Projection | After revalidation, still `createResourceMetadata(identity, [...annotations])` only. Relations MUST NOT contribute entries. |
| Equality helper | **Test/internal only** `relationsEqual`: order-sensitive; each index compares exact `name` **and** `resourceIdentitiesEqual(target)`. MUST NOT be a public product API. |
| Compose / registry | SHALL NOT require `composeResourceMetadata`; SHALL NOT register; SHALL NOT look up target Resources. |

---

## M3.7 public contract surface

| Symbol | Kind | Role |
| --- | --- | --- |
| `RelationName` | type | Retained (RFC-008) |
| `Relation` | type | `{ readonly name: RelationName; readonly target: ResourceIdentity }` |
| `RelationValidationError` | type | Four cause codes under `invalid_schema` (adds `invalid_relation_target`) |
| `ResourceSchema` | type | Unchanged collection slots; `relations` members are associated Relations |
| `validateResource` | function | Validates associated Relation rules + retained RFC-008/009/005/006 rules |
| `createResource` / `createEmptyResourceSchema` | function | Still empty collections |
| `projectResourceMetadata` | function | Identity + annotation entries only (relations ignored for contribution) |
| Field / annotation surfaces | retained | Unchanged from M3.6 / M3.3 |
| `ResourceIdentity` / `validateResourceIdentity` | retained | Used for target validation (`user` context) |

**Not public in M3.7:**

- `validateRelations` / `validateRelationTarget` / `validateRelationName` / `snapshotRelations` / `relationsEqual`
- Public Resource builders / `createResource(identity, relations?)`
- Cardinality / direction / join / cascade / load / persistence / polymorphism
- Registry-backed resolution or existence checks
- Relation→metadata projection
- Dual-shape migration helpers
- Operations members beyond empty

**Retain:** M2–M3.6 exports; `PACKAGE_NAME` / `PACKAGE_VERSION`.

### Relation validation error shape (planning aid)

```ts
type Relation = {
  readonly name: RelationName;
  readonly target: ResourceIdentity;
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
    };
```

Do not invent additional relation cause codes. Do not put field/operation emptiness failures under relation causes.

### Construction vs validation (normative for this plan)

| Concern | Owner |
| --- | --- |
| Validate raw candidates (shape / names / uniqueness / target) | Internal fixture / construction seam — **before** snapshot |
| Establish snapshotted ordered `relations` from **already-valid** Relations | Resource construction seams (`createEmptyResourceSchema` / `createResource` for empty; **internal** fixtures for non-empty tests) |
| Decide validity of a Resource’s relations | `validateResource` (final gate on the constructed Resource) |
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

`createResourceWithRelationsForTests` validates candidate closed shape (`name` + `target` exactly), names, uniqueness, and declarative target under RFC-001 `user` context **before** constructing the snapshot; successful construction freezes the ordered `{ readonly name, readonly target }` members and then passes the resulting Resource through `validateResource`.

Failure mapping MUST use the same `invalid_schema` + `RelationValidationError` causes as `validateResource` (no silent success after stripping or inventing `target`).

### Projection behavior (RFC-008 / RFC-010 non-participation)

```text
projectResourceMetadata(resource)
  1. validateResource(resource)     // includes associated Relation validity rules
  2. on failure → invalid_resource
  3. createResourceMetadata(identity, [...resource.annotations])  // relations ignored
  4. on metadata failure → invalid_metadata (defensive)
  5. success → ResourceMetadata with identity + annotation-derived entries only
```

MUST NOT mutate Resource. MUST NOT invent relation-derived metadata keys/envelopes.

---

## Constraints (from Accepted RFC-010 + retained RFC-008 + RFC-001)

### SHALL

- represent every Relation as exactly `{ name, target }` with structured `ResourceIdentity` target
- require `target` on every Relation; reject missing `target` as invalid member
- validate targets with `validateResourceIdentity(..., { kind: 'user' })` (exact RFC-001 reuse)
- reject string/canonical and opaque target representations without parsing them into identities
- reject extra Relation members without stripping
- redefine Relation value equality as exact `name` **and** RFC-001 target equality
- retain RFC-008 `RelationName` grammar, ordered sequence, uniqueness-by-name, empty validity, snapshot ownership, independent namespaces
- validate candidate closed shape / names / uniqueness / target **before** any materialization of `{ name, target }`
- keep relation errors distinct from metadata, annotation, and field validation; separate Invalid relation target from Invalid relation member
- allow self-target and same-target-under-different-names
- keep fields/operations / annotations contracts unchanged in this slice
- leave projection free of relation contributions

### SHALL NOT

- accept name-only `{ name }` Relations (no dual-shape period)
- invent cardinality, direction/inverse, local-field/join, cascade, loading/fetch, persistence/ORM, or polymorphic targets
- perform registry lookup, existence checks, cross-Resource validation, or registration-order dependencies
- parse `"namespace/name"` strings as Relation targets
- introduce a new identity validation context or Relation-local `rf` rule
- contribute relations to `projectResourceMetadata`
- silently drop, normalize, coerce, reorder, or invent a default `target`
- transform an invalid candidate into a valid Relation by discarding unknown properties before validation
- introduce public `validateRelations` / `validateRelationTarget` / `validateResourceSchema`
- widen operations beyond empty
- invent annotation vocabulary or cross-source merge
- export a new public Resource builder solely to support relation tests
- export `relationsEqual` / `validateRelationName` as public product APIs in this slice

---

## Package / ownership boundaries

### `@resource-forge/core` owns

- `packages/core/src/resource/*` Relation types, internal relation helpers, validation integration, fixture comments, regression test updates
- tests for RFC-010 associated Relation shape / target / equality / validation / projection non-participation

### Consume only

- Existing identity (`validateResourceIdentity`, `resourceIdentitiesEqual`), metadata, annotations, fields, result utilities as already used by M3.1–M3.6

### Must remain untouched (feature-free)

- `packages/nest`, `packages/graphql`, `packages/prisma`, `packages/cli`

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/core/src/resource/types.ts` | Widen `Relation`; add `invalid_relation_target` to `RelationValidationError` |
| `packages/core/src/resource/relations.ts` | Closed `{ name, target }` candidate validation; `user`-context target via `validateResourceIdentity`; non-lossy `snapshotRelations`; `relationsEqual` includes target |
| `packages/core/src/resource/relations.test.ts` | Associated Relation acceptance; reject name-only / bad target / extras / `rf`; equality includes target; flip M3.5 “target is extra” case |
| `packages/core/src/resource/create-resource-with-relations.ts` | Comments + snapshot of `{ name, target }`; same validate-before-snapshot seam |
| `packages/core/src/resource/validate.ts` | Uses widened `checkRelations` (likely body-stable) |
| `packages/core/src/resource/validate.test.ts` | Update non-empty relations fixtures to associated Relations |
| `packages/core/src/resource/project.test.ts` | Associated Relation fixtures; still zero relation→metadata contribution; invalid relations → `invalid_resource` |
| `packages/core/src/resource/exports.test.ts` | Widened `Relation` / `RelationValidationError`; assert no `validateRelations` / `validateRelationTarget` |
| `packages/core/src/resource/index.ts` / `packages/core/src/index.ts` | Export surface unchanged aside from widened Relation types (already exported) |
| `docs/roadmap.md` | Mark RFC-010 Accepted / M3.7 implementation complete only after M6 verification is green |

Planning note: file names are layout choices, not product module boundaries required by RFC-010.

---

## TDD / verification strategy

For each task: write failing tests → implement → green → commit.

**Must cover:**

1. Empty `relations` remains valid (regression)
2. Valid associated Relations accepted via internal fixture; order + `target` preserved on Resource
3. Self-target allowed (`target` equals owning Resource identity)
4. Same target under different RelationNames allowed
5. Name-only `{ name: 'author' }` → `invalid_schema` / `invalid_relation_member` (breaking vs M3.5)
6. Missing `target` → `invalid_relation_member`
7. Extra property (e.g. `{ name, target, cardinality: 'many' }`) → `invalid_relation_member` — never stripped
8. String target (`target: 'crm/Customer'`) → `invalid_relation_member` (no parse)
9. Malformed target object (wrong/missing keys, non-object) → `invalid_relation_member`
10. Invalid identity under `user` context (bad namespace/name grammar; `rf/*`) → `invalid_schema` / `invalid_relation_target` with `cause`
11. Invalid `RelationName` / duplicate name still map to existing causes (with valid `target` present)
12. Uniqueness by name only: two Relations same name different targets cannot coexist → `duplicate_relation_name`
13. Snapshot ownership: mutating caller-owned candidate **array** and **member/target objects** MUST NOT change snapshotted Relations; assert `Object.isFrozen` on the relations array, each Relation member, and each `target`
14. Order-sensitive equality (internal/test): different order unequal; same names/order but different targets unequal
15. Independent namespaces: Field and Relation may share name string (with typed Field + associated Relation)
16. Projection: non-empty associated relations + empty annotations → identity + **no** metadata entries from relations
17. Projection: associated relations + annotations → annotation entries only
18. Projection: invalid relations (name-only or bad target) → `invalid_resource`
19. Purity: projection does not mutate Resource / relations
20. Public surface: widened `Relation` / `RelationValidationError` exported; `validateRelations` / `validateRelationTarget` not exported
21. Fields / operations / annotations regressions remain green

**Do not:** invent relation→metadata keys; invent cardinality; accept dual-shape; registry-resolve targets.

---

### Task 1: Contract types + failing tests (breaking widen)

**Files:**
- Modify: `packages/core/src/resource/types.ts`
- Modify: `packages/core/src/resource/relations.test.ts`
- Modify: `packages/core/src/resource/validate.test.ts`
- Modify: `packages/core/src/resource/project.test.ts` (fixture shapes)
- Modify: `packages/core/src/resource/exports.test.ts`

- [ ] **Step 1: Widen types**

```ts
export type Relation = {
  readonly name: RelationName;
  readonly target: ResourceIdentity;
};

export type RelationValidationError =
  | { readonly code: 'invalid_relation_name'; readonly index: number; readonly name: string }
  | { readonly code: 'duplicate_relation_name'; readonly index: number; readonly name: string }
  | { readonly code: 'invalid_relation_member'; readonly index: number }
  | {
      readonly code: 'invalid_relation_target';
      readonly index: number;
      readonly cause: IdentityValidationError;
    };
```

Ensure `IdentityValidationError` is imported/available in `types.ts` (already used for identity failures).

- [ ] **Step 2: Rewrite / add failing tests**

Update existing fixtures that used name-only Relations so tests express the **post-M3.7** contract. Add explicit cases:

```ts
it('accepts closed associated Relations and preserves order + targets', () => {
  const resource = createResourceWithRelationsForTests(identity, [
    { name: 'customer', target: { namespace: 'crm', name: 'Customer' } },
    { name: 'lineItems', target: { namespace: 'crm', name: 'LineItem' } },
  ]);
  expect(resource.ok).toBe(true);
  // expect preserved name+target order
});

it('allows self-target', () => {
  const resource = createResourceWithRelationsForTests(identity, [
    { name: 'parent', target: { namespace: 'crm', name: 'Order' } },
  ]);
  expect(resource.ok).toBe(true);
});

it('rejects name-only Relations as invalid_relation_member (breaking)', () => {
  const resource = createResourceWithRelationsForTests(identity, [
    { name: 'author' },
  ]);
  expect(resource.ok).toBe(false);
  // cause: invalid_relation_member
});

it('rejects string targets without parsing', () => {
  const resource = createResourceWithRelationsForTests(identity, [
    { name: 'customer', target: 'crm/Customer' },
  ]);
  expect(resource.ok).toBe(false);
  // cause: invalid_relation_member
});

it('rejects rf targets under user context as invalid_relation_target', () => {
  const resource = createResourceWithRelationsForTests(identity, [
    { name: 'meta', target: { namespace: 'rf', name: 'Resource' } },
  ]);
  expect(resource.ok).toBe(false);
  // cause: invalid_relation_target; cause.cause.code === 'reserved_namespace'
});

it('rejects extra Relation members without stripping', () => {
  const resource = createResourceWithRelationsForTests(identity, [
    {
      name: 'customer',
      target: { namespace: 'crm', name: 'Customer' },
      cardinality: 'many',
    },
  ]);
  expect(resource.ok).toBe(false);
  // cause: invalid_relation_member
});

it('treats Relations equal only when name and target match (order-sensitive)', () => {
  expect(
    relationsEqual(
      [{ name: 'a', target: { namespace: 'crm', name: 'A' } }],
      [{ name: 'a', target: { namespace: 'crm', name: 'B' } }],
    ),
  ).toBe(false);
});
```

**Flip** the M3.5 test that expected `{ name: 'author', target: 'User' }` → `invalid_relation_member` as “extra property”: after this slice, a **structured** `target` is required; keep rejecting non-structured / extra-member cases under the new rules.

Also update `validate.test.ts` / `project.test.ts` acceptance fixtures to associated Relations.

- [ ] **Step 3: Run** `pnpm --filter @resource-forge/core test` — expect FAIL on new/updated association cases
- [ ] **Step 4: Commit** `test(core): add failing M3.7 associated Relation contract tests`

### Task 2: Validate-before-snapshot + validation integration

**Files:**
- Modify: `packages/core/src/resource/relations.ts`
- Modify: `packages/core/src/resource/create-resource-with-relations.ts` (comments / snapshot shape)
- Confirm: `packages/core/src/resource/validate.ts` continues to call `checkRelations`

- [ ] **Step 1: Widen `checkRelations`**

Keep the existing module-local `export function checkRelations`. For each candidate member:

1. plain object required → else `invalid_relation_member`
2. `Object.keys(member)` must be exactly the set `{ name, target }` → else `invalid_relation_member`
3. `name` string + `validateRelationName` → `invalid_relation_name` on failure
4. uniqueness-by-name → `duplicate_relation_name`
5. `target` must be plain object with keys exactly `{ namespace, name }` → else `invalid_relation_member`
6. `validateResourceIdentity({ namespace, name }, { kind: 'user' })` → on failure `invalid_relation_target` with `cause: IdentityValidationError`
7. push `{ name, target: identityResult.value }`

MUST NOT strip extras, parse canonical strings, invent `target`, or call the registry.

- [ ] **Step 2: Widen `snapshotRelations` / `relationsEqual`**

```ts
export function snapshotRelations(
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
      }),
    ),
  );
}

export function relationsEqual(
  left: readonly Relation[],
  right: readonly Relation[],
): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i]!.name !== right[i]!.name) return false;
    if (!resourceIdentitiesEqual(left[i]!.target, right[i]!.target)) return false;
  }
  return true;
}
```

Snapshot ownership test (member + target + array); assert freezes.

- [ ] **Step 3: Update fixture comments** to say freeze `{ name, target }`
- [ ] **Step 4: Green** Task 1 relation/validate tests for associated acceptance + rejection causes
- [ ] **Step 5: Commit** `feat(core): require associated Relations { name, target } (RFC-010)`

### Task 3: Projection non-participation + field coexistence regressions

**Files:**
- Modify: `packages/core/src/resource/project.test.ts` (finish associated fixtures if not done in Task 1)
- Touch `project.ts` only if needed (body should remain annotation-only)
- Confirm fields tests still pass (fields unchanged; relation coexistence tests use associated Relations)

- [ ] **Step 1: Ensure projection tests** use associated Relations; assert zero relation-derived entries; invalid relations → `invalid_resource`; purity
- [ ] **Step 2: Confirm implementation** still `createResourceMetadata(identity, [...annotations])`
- [ ] **Step 3: Full suite green including fields / annotations**
- [ ] **Step 4: Commit** `test(core): associated relations do not contribute to metadata projection`

### Task 4: Exports, roadmap, plan status hygiene

**Files:**
- Modify: `packages/core/src/resource/exports.test.ts` / barrels as needed
- Modify: `docs/roadmap.md` — mark RFC-010 Accepted and M3.7 **implementation** complete only after M6 verification is green
- Update this plan’s Status / M5 note only when Plan Review Accepts (M5), and checkboxes when M6 completes

- [ ] **Step 1: Export smoke** — widened `Relation` / `RelationValidationError`; no `validateRelations` / `validateRelationTarget`
- [ ] **Step 2: Full** `pnpm --filter @resource-forge/core test` **green** (expect ≥ prior 134; net new association cases)
- [ ] **Step 3: Docs status updates only after verification**
- [ ] **Step 4: Commit** `docs: record M3.7 relation association slice complete`

---

## Traceability

| Task | RFC-010 sections |
| --- | --- |
| Task 1 | §§1–5 association shape / target / equality / supersession; public surface |
| Task 2 | §§4–6 validation context (`user`), validate-before-snapshot, conceptual causes |
| Task 3 | §7 projection / adjacent contracts unchanged |
| Task 4 | §8 compatibility; §15 implementation gate / roadmap hygiene |

Retained RFC-008 collection rules (RelationName, order, uniqueness-by-name, empty, snapshot ownership, independent namespaces, projection non-participation) are exercised across Tasks 1–3 without reopening Relation collection authority.

---

## Explicit deferrals

- Cardinality / multiplicity
- Direction, inverse relations, bidirectional pairing
- Local-field handles, foreign keys, join mapping
- Cascade behavior
- Loading / fetch semantics
- Persistence / ORM mapping
- Polymorphic targets / union targets
- Registry-backed resolution or existence checks
- Association → metadata projection / cross-source composition
- Dual-shape migration helpers or adapters
- Public `validateRelations` / `validateRelationTarget` / Resource builders
- Operations members; annotation vocabulary; field shape changes

---

## M5 Plan Review checklist (for reviewers)

- [ ] No new product semantics beyond RFC-010 (+ retained RFC-008 collection rules + RFC-001 `user` context)
- [ ] Relation is exactly `{ name, target }`; name-only rejected; no dual-shape
- [ ] Target is structured `ResourceIdentity`; validated via `validateResourceIdentity(..., { kind: 'user' })`
- [ ] No string parse; no registry/existence/resolution
- [ ] Missing `target` / extras / malformed target structure → `invalid_relation_member`
- [ ] Identity grammar / reserved `rf` failures → `invalid_relation_target` with cause
- [ ] Relation equality includes `target`; uniqueness remains by name only
- [ ] Self-target allowed; same target under different names allowed
- [ ] Snapshot construction separated from `validateResource`; candidates validated before `{ name, target }` materialization
- [ ] `snapshotRelations` never strips unknown properties or invents default `target`; freezes relation + target
- [ ] Non-empty Resources via internal/test seams only (no public builder)
- [ ] Relation helpers internal/test-only (existing module-local export mechanism); public validation remains `validateResource`
- [ ] Projection non-participation required and tested
- [ ] Cardinality / direction / join / cascade / load / persistence / polymorphism / registry resolution deferred
- [ ] Fields / operations / annotations unchanged
- [ ] TDD tasks executable without inventing sequencing
- [ ] M6 must not start until this plan is **Accepted**
- [ ] Delivery packaging: Accepted plan + implementation in **one PR** for [#28](https://github.com/rexescario-dev/resource-forge/issues/28) (no plan-only merge)

---

## Gate

**M4 Draft complete.** Ready for **M5 Plan Review**. Do not begin M6 until this plan is **Accepted**.
