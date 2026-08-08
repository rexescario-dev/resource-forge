# M3.6 Resource Field Types — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-009. Reuse M3.1–M3.5 Resource / schema / field / relation / annotation / projection surfaces. Do **not** implement nullability, constraints, defaults, enums, composites, named refs, additional scalars, value validation/coercion, field→metadata projection, association semantics, dual-shape compatibility, or public `validateFields` / `validateFieldType` APIs.

**Status:** Accepted  
**M5:** Accepted (2026-08-08) — Plan Review; no plan blockers; tightened internal `validateFieldType` non-export wording + snapshot ownership assertions; validate-before-snapshot and no dual-shape locked; one PR with implementation for #23  
**Tracking:** [#23](https://github.com/rexescario-dev/resource-forge/issues/23)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted) — M3.6 was blocked on Resource Field Types RFC  
**Source RFC:** RFC-009 Resource Field Types (**Accepted**) — amends Field member shape; partial supersession of RFC-007 §3.2  
**Depends on:** RFC-005 (**Accepted**); RFC-006 (**Accepted**); RFC-007 (**Accepted**, collection rules retained); RFC-008 (**Accepted**, unchanged); RFC-009 (**Accepted**); M3.1–M3.5 shipped  
**Package:** `@resource-forge/core`  
**Slice:** M3.6 only — required typed Field `{ name, type }` + closed `FieldType`; breaking vs M3.4 name-only Fields; no dual-shape; validate-before-snapshot; projection non-participation unchanged

**Goal:** Widen every Field from name-only `{ name }` to exactly `{ name: FieldName; type: FieldType }` with `FieldType ∈ { "string", "number", "boolean" }` by exact membership, validate type/shape as part of Resource validity, redefine Field value equality to include `type`, and keep `projectResourceMetadata` free of any field→metadata contribution.

**Architecture:**

```text
candidate fields sequence
          │
          ▼
 validate candidate member shape   ← exactly `{ name, type }`; missing/extra → invalid_field_member (no strip)
          │
          ▼
 validate FieldName + uniqueness   ← RFC-007 grammar + duplicates-by-name → failure
          │
          ▼
 validate FieldType membership     ← exact vocabulary; case-sensitive; no trim/alias/coerce
          │
          ▼
 snapshot exact valid Fields       ← freeze ordered `{ readonly name, readonly type }`; never invent default type
          │
          ▼
       Resource.schema
          │
          ▼
    validateResource               ← authoritative Resource gate; relations per RFC-008; operations empty-only
          │
          ▼
 projectResourceMetadata           ← revalidate Resource; annotation-derived metadata only; fields contribute nothing
```

**Invariant:** No implementation step may transform an invalid candidate into a valid Field by discarding information (including stripping unknown properties or inventing a default `type`) before validation.

`FieldType` is declared type identity only — not runtime value validation or coercion. Uniqueness within `fields` remains **by name only** (RFC-007). Field value equality is exact `name` **and** exact `type` (RFC-009). Collection order, empty validity, snapshot ownership, and projection non-participation remain RFC-007.

**Tech Stack:** TypeScript strict, Vitest (existing `packages/core` scripts)

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Locked decisions (export / shape review — planning aids)

These freeze the M3.6 implementation surface. They MUST NOT invent product semantics beyond RFC-009 (+ retained RFC-007 collection rules).

| Decision | Lock |
| --- | --- |
| `FieldType` | Closed string union `"string" \| "number" \| "boolean"`. Exact membership; case-sensitive; no trim, alias, coerce, or normalize. `"String"`, `" string "`, `"str"`, `"integer"`, `"null"` are **not** valid. |
| `Field` | `{ readonly name: FieldName; readonly type: FieldType }` **exactly**. No additional members. |
| Missing `type` | `invalid_field_member` (required member absent). |
| Extra member | `invalid_field_member` (e.g. `{ name, type, description }`). |
| Present but invalid `type` | `invalid_field_type` (dedicated cause; includes observed value for diagnostics). |
| Non-object / malformed structure | `invalid_field_member`. |
| Name-only `{ name }` | **Invalid** after this slice (breaking vs M3.4). No dual-shape acceptance. |
| `FieldName` / uniqueness / order / empty | Unchanged RFC-007. Uniqueness by name only — not by `(name, type)`. |
| `fields` representation | `ReadonlyArray<Field>` (array index is semantic order). |
| `relations` / `operations` | Unchanged from M3.5 (`ReadonlyArray<Relation>`; operations empty-only). |
| Snapshot construction vs validation | **Separated, non-lossy.** Raw candidate validation (closed shape, names, uniqueness, type membership) happens **before** any snapshot that materializes `{ name, type }` only. `snapshotFields` accepts only already-validated `Field` members and freezes an ordered sequence; it MUST NOT discard, strip, normalize, or invent `type`. |
| Non-empty Resource construction | **No public builder.** Public `createResource(identity)` remains empty schema collections + empty annotations. Tests use existing **internal** fixtures (`createResourceWithFieldsForTests` / `createResourceWithRelationsForTests`) that validate candidates before snapshotting. |
| Internal helpers | Preserve the **existing** M3.4 mechanism: `validateFieldName` / `checkFields` / `snapshotFields` / `fieldsEqual` may remain **module-local exports** in `fields.ts` for same-package seams and tests, but MUST NOT be barrel-/package-exported. New `validateFieldType` is a **non-exported** helper inside `fields.ts` only (not module-exported, not barrel-exported). Public validation remains `validateResource`. |
| Validation ownership | Part of `validateResource` via schema. No public `validateFields` / `validateFieldType` / `validateResourceSchema`. |
| Schema error taxonomy | Field failures: `invalid_schema` **with** `cause: FieldValidationError` using `invalid_field_name` / `duplicate_field_name` / `invalid_field_member` / **`invalid_field_type`**. Relation failures unchanged. Non-member schema failures: `invalid_schema` without field/relation cause. |
| Projection | After revalidation, still `createResourceMetadata(identity, [...annotations])` only. Fields MUST NOT contribute entries. |
| Equality helper | **Test/internal only** `fieldsEqual`: order-sensitive; each index compares exact `name` **and** exact `type`. MUST NOT be a public product API. |
| Compose / registry | SHALL NOT require `composeResourceMetadata`; SHALL NOT register. |

---

## M3.6 public contract surface

| Symbol | Kind | Role |
| --- | --- | --- |
| `FieldType` | type | Closed `"string" \| "number" \| "boolean"` |
| `FieldName` | type | Retained (RFC-007) |
| `Field` | type | `{ readonly name: FieldName; readonly type: FieldType }` |
| `FieldValidationError` | type | Four cause codes under `invalid_schema` (adds `invalid_field_type`) |
| `ResourceSchema` | type | Unchanged collection slots; `fields` members are typed Fields |
| `validateResource` | function | Validates typed Field rules + retained RFC-007/008/005/006 rules |
| `createResource` / `createEmptyResourceSchema` | function | Still empty collections |
| `projectResourceMetadata` | function | Identity + annotation entries only (fields ignored for contribution) |
| Relation / annotation surfaces | retained | Unchanged from M3.5 / M3.3 |

**Not public in M3.6:**

- `validateFields` / `validateFieldType` / `validateFieldName` / `snapshotFields` / `fieldsEqual`
- Public Resource builders / `createResource(identity, fields?)`
- Nullability / constraints / defaults / enums / composites / named refs / additional scalars
- Field→metadata projection
- Dual-shape migration helpers
- Value validation / coercion APIs
- Association semantics; non-empty operations

**Retain:** M2 exports; M3.1–M3.5 surfaces; `PACKAGE_NAME` / `PACKAGE_VERSION`.

### Field validation error shape (planning aid)

```ts
type FieldType = 'string' | 'number' | 'boolean';

type Field = {
  readonly name: FieldName;
  readonly type: FieldType;
};

type FieldValidationError =
  | {
      readonly code: 'invalid_field_name';
      readonly index: number;
      readonly name: string;
    }
  | {
      readonly code: 'duplicate_field_name';
      readonly index: number;
      readonly name: string;
    }
  | {
      readonly code: 'invalid_field_member';
      readonly index: number;
    }
  | {
      readonly code: 'invalid_field_type';
      readonly index: number;
      readonly type: unknown;
    };
```

Do not invent additional field cause codes. Do not put relation/operation emptiness failures under field causes.

### Construction vs validation (normative for this plan)

| Concern | Owner |
| --- | --- |
| Validate raw candidates (shape / names / uniqueness / type membership) | Internal fixture / construction seam — **before** snapshot |
| Establish snapshotted ordered `fields` from **already-valid** Fields | Resource construction seams (`createEmptyResourceSchema` / `createResource` for empty; **internal** fixtures for non-empty tests) |
| Decide validity of a Resource’s fields | `validateResource` (final gate on the constructed Resource) |
| Project metadata | `projectResourceMetadata` after revalidation — annotations only |

**Internal non-empty fields fixture seam (existing; update comments + behavior):**

```ts
// internal / test-only — NOT exported from packages/core public API
function createResourceWithFieldsForTests(
  identity: ResourceIdentity,
  candidateFields: readonly object[],
  annotations?: Annotations,
): Result<Resource, ResourceValidationError>
```

`createResourceWithFieldsForTests` (and the fields path inside `createResourceWithRelationsForTests`) validates candidate closed shape (`name` + `type` exactly), names, uniqueness, and `FieldType` membership **before** constructing the snapshot; successful construction freezes the ordered `{ readonly name, readonly type }` members and then passes the resulting Resource through `validateResource`.

Failure mapping MUST use the same `invalid_schema` + `FieldValidationError` causes as `validateResource` (no silent success after stripping or inventing `type`).

### Projection behavior (RFC-007 / RFC-009 non-participation)

```text
projectResourceMetadata(resource)
  1. validateResource(resource)     // includes typed Field validity rules
  2. on failure → invalid_resource
  3. createResourceMetadata(identity, [...resource.annotations])  // fields ignored
  4. on metadata failure → invalid_metadata (defensive)
  5. success → ResourceMetadata with identity + annotation-derived entries only
```

MUST NOT mutate Resource. MUST NOT invent field-derived metadata keys/envelopes.

---

## Constraints (from Accepted RFC-009 + retained RFC-007)

### SHALL

- represent every Field as exactly `{ name, type }` with `FieldType ∈ { string, number, boolean }`
- require `type` on every Field; reject missing `type` as invalid member
- enforce exact vocabulary membership (case-sensitive; no trim/alias/coerce/normalize)
- reject extra Field members without stripping
- redefine Field value equality as exact `name` **and** exact `type`
- retain RFC-007 `FieldName` grammar, ordered sequence, uniqueness-by-name, empty validity, snapshot ownership
- validate candidate closed shape / names / uniqueness / type **before** any materialization of `{ name, type }`
- keep field errors distinct from metadata and annotation validation; separate Invalid field type from Invalid field member
- keep relations/operations / annotations contracts unchanged in this slice
- leave projection free of field contributions

### SHALL NOT

- accept name-only `{ name }` Fields (no dual-shape period)
- invent nullability, constraints, defaults, enums, composites, named refs, or additional scalars
- treat `null` as a `FieldType`
- validate or coerce field **values**
- contribute fields to `projectResourceMetadata`
- silently drop, normalize, coerce, reorder, or invent a default `type`
- transform an invalid candidate into a valid Field by discarding unknown properties before validation
- introduce public `validateFields` / `validateFieldType` / `validateResourceSchema`
- widen relations association semantics or operations beyond empty
- invent annotation vocabulary or cross-source merge
- export a new public Resource builder solely to support field tests
- export `fieldsEqual` / `validateFieldName` / `validateFieldType` as public product APIs in this slice

---

## Package / ownership boundaries

### `@resource-forge/core` owns

- `packages/core/src/resource/*` Field / FieldType types, internal field helpers, validation integration, fixture comments, regression test updates
- tests for RFC-009 typed Field shape / vocabulary / equality / validation / projection non-participation

### Consume only

- Existing identity / metadata / annotations / relations / result utilities as already used by M3.1–M3.5

### Must remain untouched (feature-free)

- `packages/nest`, `packages/graphql`, `packages/prisma`, `packages/cli`

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/core/src/resource/types.ts` | Add `FieldType`; widen `Field`; add `invalid_field_type` to `FieldValidationError` |
| `packages/core/src/resource/fields.ts` | Closed `{ name, type }` candidate validation; `validateFieldType`; non-lossy `snapshotFields`; `fieldsEqual` includes `type` |
| `packages/core/src/resource/fields.test.ts` | Typed Field acceptance; reject name-only / missing type / bad vocab / extras; equality includes type; flip M3.4 “type is extra” case |
| `packages/core/src/resource/create-resource-with-fields.ts` | Comments + snapshot of `{ name, type }`; same validate-before-snapshot seam |
| `packages/core/src/resource/create-resource-with-relations.ts` | Comments only if needed; fields path reuses widened `checkFields` / `snapshotFields` |
| `packages/core/src/resource/validate.ts` | Uses widened `checkFields` (likely body-stable) |
| `packages/core/src/resource/validate.test.ts` | Update non-empty fields fixtures to typed Fields |
| `packages/core/src/resource/project.test.ts` | Typed Field fixtures; still zero field→metadata contribution; invalid typed fields → `invalid_resource` |
| `packages/core/src/resource/exports.test.ts` | Export `FieldType`; assert no `validateFieldType` / `validateFields` |
| `packages/core/src/resource/index.ts` / `packages/core/src/index.ts` | Export `FieldType` alongside `Field` / `FieldName` / `FieldValidationError` |
| `docs/roadmap.md` | Mark M3.6 implementation complete only after M6 verification is green |

Planning note: file names are layout choices, not product module boundaries required by RFC-009.

---

## TDD / verification strategy

For each task: write failing tests → implement → green → commit.

**Must cover:**

1. Empty `fields` remains valid (regression)
2. Valid typed Fields accepted via internal fixture; order + `type` preserved on Resource
3. All three vocabulary members accepted: `string`, `number`, `boolean`
4. Name-only `{ name: 'id' }` → `invalid_schema` / `invalid_field_member` (breaking vs M3.4)
5. Missing `type` (same as name-only) → `invalid_field_member`
6. Extra property (e.g. `{ name: 'id', type: 'string', description: 'x' }`) → `invalid_field_member` — never stripped
7. Invalid vocabulary (`"String"`, `" string "`, `"str"`, `"integer"`, `"null"`, non-string) → `invalid_schema` / `invalid_field_type` with observed `type`
8. Invalid `FieldName` / duplicate name still map to existing causes (with valid `type` present)
9. Uniqueness by name only: two Fields same name different types cannot coexist → `duplicate_field_name`
10. Snapshot ownership: mutating caller-owned candidate **array** and **member objects** MUST NOT change snapshotted Fields; assert `Object.isFrozen` on the fields array and each Field member (after successful validate-then-snapshot)
11. Order-sensitive equality (internal/test): `[id:string, email:string] ≠ [email:string, id:string]`; same names/order but different types unequal
12. Projection: non-empty typed fields + empty annotations → identity + **no** metadata entries from fields
13. Projection: typed fields + annotations → annotation entries only
14. Projection: invalid fields (name-only or bad type) → `invalid_resource`
15. Purity: projection does not mutate Resource / fields
16. Public surface: `FieldType` / widened `Field` / `FieldValidationError` exported; `validateFields` / `validateFieldType` not exported
17. Relations / operations / annotations regressions remain green

**Do not:** invent field→metadata keys; invent nullability; test value validation; accept dual-shape.

---

### Task 1: Contract types + failing tests (breaking widen)

**Files:**
- Modify: `packages/core/src/resource/types.ts`
- Modify: `packages/core/src/resource/index.ts` / `packages/core/src/index.ts`
- Modify: `packages/core/src/resource/fields.test.ts`
- Modify: `packages/core/src/resource/validate.test.ts`
- Modify: `packages/core/src/resource/project.test.ts` (fixture shapes that must fail before implementation)
- Modify: `packages/core/src/resource/exports.test.ts`

- [x] **Step 1: Widen types**

```ts
export type FieldType = 'string' | 'number' | 'boolean';

export type Field = {
  readonly name: FieldName;
  readonly type: FieldType;
};

export type FieldValidationError =
  | { readonly code: 'invalid_field_name'; readonly index: number; readonly name: string }
  | { readonly code: 'duplicate_field_name'; readonly index: number; readonly name: string }
  | { readonly code: 'invalid_field_member'; readonly index: number }
  | { readonly code: 'invalid_field_type'; readonly index: number; readonly type: unknown };
```

Export `FieldType` from resource + package barrels.

- [x] **Step 2: Rewrite / add failing tests**

Update existing fixtures that used name-only Fields so tests express the **post-M3.6** contract (typed Fields for acceptance paths). Add explicit cases:

```ts
it('accepts closed typed Fields for all FieldType members', () => {
  const resource = createResourceWithFieldsForTests(identity, [
    { name: 'id', type: 'string' },
    { name: 'age', type: 'number' },
    { name: 'active', type: 'boolean' },
  ]);
  expect(resource.ok).toBe(true);
  // expect preserved name+type order
});

it('rejects name-only Fields as invalid_field_member (breaking)', () => {
  const resource = createResourceWithFieldsForTests(identity, [{ name: 'id' }]);
  expect(resource.ok).toBe(false);
  // cause: invalid_field_member
});

it('rejects invalid FieldType vocabulary as invalid_field_type', () => {
  for (const type of ['String', ' string ', 'str', 'integer', 'null', 1]) {
    const resource = createResourceWithFieldsForTests(identity, [
      { name: 'id', type },
    ]);
    expect(resource.ok).toBe(false);
    // cause: invalid_field_type with observed type
  }
});

it('rejects extra Field members without stripping', () => {
  const resource = createResourceWithFieldsForTests(identity, [
    { name: 'id', type: 'string', description: 'x' },
  ]);
  expect(resource.ok).toBe(false);
  // cause: invalid_field_member
});

it('treats Fields equal only when name and type match (order-sensitive sequence)', () => {
  expect(
    fieldsEqual(
      [{ name: 'id', type: 'string' }],
      [{ name: 'id', type: 'number' }],
    ),
  ).toBe(false);
});
```

**Flip** the M3.4 test that expected `{ name: 'id', type: 'string' }` → `invalid_field_member` (that shape becomes the valid closed member). Replace it with the extra-member / name-only rejection cases above.

Also update `validate.test.ts` / `project.test.ts` acceptance fixtures to typed Fields so they fail for the right reason until implementation lands (name-only will be invalid).

- [x] **Step 3: Run** `pnpm --filter @resource-forge/core test` — expect FAIL on new/updated Field Type cases (and likely on still name-only fixtures until Task 2)
- [x] **Step 4: Commit** `test(core): add failing M3.6 typed Field contract tests` — deferred pending human review (no commit this session)

### Task 2: Validate-before-snapshot + validation integration

**Files:**
- Modify: `packages/core/src/resource/fields.ts`
- Modify: `packages/core/src/resource/create-resource-with-fields.ts` (comments / snapshot shape)
- Modify: `packages/core/src/resource/create-resource-with-relations.ts` (comments if needed)
- Confirm: `packages/core/src/resource/validate.ts` continues to call `checkFields`

- [x] **Step 1: Internal (non-exported) `validateFieldType`**

```ts
const FIELD_TYPES = new Set(['string', 'number', 'boolean']);

/** Module-private — not exported from fields.ts; not barrel-exported. */
function validateFieldType(
  type: unknown,
): Result<FieldType, { readonly code: 'invalid_field_type'; readonly type: unknown }> {
  if (typeof type !== 'string' || !FIELD_TYPES.has(type)) {
    return err({ code: 'invalid_field_type', type });
  }
  return ok(type as FieldType);
}
```

Exact membership only — no trim/lowercase. Do **not** add `export` on this helper.

- [x] **Step 2: Widen `checkFields`**

Keep the existing module-local `export function checkFields` (same-package / test import only). For each candidate member:

1. plain object required → else `invalid_field_member`
2. `Object.keys(member)` must be exactly the set `{ name, type }` (order irrelevant; length 2; both keys present) → else `invalid_field_member`
3. `name` string + `validateFieldName` → `invalid_field_name` on failure
4. uniqueness-by-name → `duplicate_field_name`
5. `validateFieldType(member.type)` → `invalid_field_type` on failure
6. push `{ name, type }`

MUST NOT strip extras or invent `type`.

- [x] **Step 3: Widen `snapshotFields` / `fieldsEqual`**

Preserve existing module-local exports (not package barrels):

```ts
export function snapshotFields(fields: readonly Field[]): ReadonlyArray<Field> {
  return Object.freeze(
    fields.map((field) =>
      Object.freeze({ name: field.name, type: field.type }),
    ),
  );
}

export function fieldsEqual(left: readonly Field[], right: readonly Field[]): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i]!.name !== right[i]!.name) return false;
    if (left[i]!.type !== right[i]!.type) return false;
  }
  return true;
}
```

Snapshot ownership test (member + array); assert freezes:

```ts
const candidates = [{ name: 'id', type: 'string' as const }];
const list: object[] = [candidates[0]!];
const resource = createResourceWithFieldsForTests(identity, list);
expect(resource.ok).toBe(true);
if (!resource.ok) return;

candidates[0]!.name = 'changed';
list.push({ name: 'extra', type: 'number' });

expect(resource.value.schema.fields.map((f) => f.name)).toEqual(['id']);
expect(resource.value.schema.fields[0]?.type).toBe('string');
expect(Object.isFrozen(resource.value.schema.fields)).toBe(true);
expect(Object.isFrozen(resource.value.schema.fields[0])).toBe(true);
```

- [x] **Step 4: Update fixture comments** to say freeze `{ name, type }` (behavior already via `checkFields`/`snapshotFields`)
- [x] **Step 5: Green** Task 1 field/validate tests for typed acceptance + rejection causes
- [x] **Step 6: Commit** `feat(core): require typed Fields { name, type } (RFC-009)` — deferred pending human review (no commit this session)

### Task 3: Projection non-participation + relation coexistence regressions

**Files:**
- Modify: `packages/core/src/resource/project.test.ts` (finish typed fixtures if not done in Task 1)
- Touch `project.ts` only if needed (body should remain annotation-only)
- Confirm relations tests still pass (relations unchanged; optional field candidates in coexistence tests must be typed if present)

- [x] **Step 1: Ensure projection tests** use typed Fields; assert zero field-derived entries; invalid typed/name-only fields → `invalid_resource`; purity
- [x] **Step 2: Confirm implementation** still `createResourceMetadata(identity, [...annotations])`
- [x] **Step 3: Full suite green including relations**
- [x] **Step 4: Commit** `test(core): typed fields do not contribute to metadata projection` — deferred pending human review (no commit this session)

### Task 4: Exports, roadmap, plan status hygiene

**Files:**
- Modify: `packages/core/src/resource/exports.test.ts` / barrels as needed
- Modify: `docs/roadmap.md` — mark M3.6 **implementation** complete only after M6 verification is green
- Update this plan’s Status / M5 note only when Plan Review Accepts (M5), and checkboxes when M6 completes

- [x] **Step 1: Export smoke** — `FieldType` present; `Field` widened; no `validateFields` / `validateFieldType`
- [x] **Step 2: Full** `pnpm --filter @resource-forge/core test` **green** (expect ≥ prior 130; net new typed-field cases)
- [x] **Step 3: Docs status updates only after verification**
- [x] **Step 4: Commit** `docs: record M3.6 field types slice complete` — deferred pending human review (no commit this session)

---

## Traceability

| Task | RFC-009 sections |
| --- | --- |
| Task 1 | §§1–5 FieldType / Field shape / equality / supersession; public surface |
| Task 2 | §§5–6 validation, validate-before-snapshot, conceptual causes |
| Task 3 | §7 projection / adjacent contracts unchanged |
| Task 4 | §8 compatibility; §14 implementation gate / roadmap hygiene |

Retained RFC-007 collection rules (FieldName, order, uniqueness-by-name, empty, snapshot ownership, projection non-participation) are exercised across Tasks 1–3 without reopening Field shape authority.

---

## Explicit deferrals

- Nullability / optionality
- Constraints, defaults, descriptions, per-field annotations
- Enums, arrays, composites / object schemas
- Named / opaque type references
- Additional `FieldType` members (`integer`, `datetime`, `uuid`, …)
- `null` as a Field type
- Field value validation, coercion, serialization
- Field → metadata projection / cross-source composition
- Dual-shape migration helpers or adapters
- Public `validateFields` / `validateFieldType` / Resource builders
- Association semantics; Operations members; annotation vocabulary

---

## M5 Plan Review checklist (for reviewers)

- [x] No new product semantics beyond RFC-009 (+ retained RFC-007 collection rules)
- [x] Field is exactly `{ name, type }`; name-only rejected; no dual-shape
- [x] `FieldType` closed exact membership; dedicated `invalid_field_type`
- [x] Missing `type` / extras → `invalid_field_member`
- [x] Field equality includes `type`; uniqueness remains by name only
- [x] Snapshot construction separated from `validateResource`; candidates validated before `{ name, type }` materialization
- [x] `snapshotFields` never strips unknown properties or invents default `type`
- [x] Non-empty Resources via internal/test seams only (no public builder)
- [x] Field helpers internal/test-only (existing module-local export mechanism); `validateFieldType` non-exported; public validation remains `validateResource`
- [x] Projection non-participation required and tested
- [x] Nullability / constraints / enums / composites / value validation / field→metadata deferred
- [x] Relations / operations / annotations unchanged
- [x] TDD tasks executable without inventing sequencing
- [x] M6 must not start until this plan is **Accepted**
- [x] Delivery packaging: Accepted plan + implementation in **one PR** for [#23](https://github.com/rexescario-dev/resource-forge/issues/23) (no plan-only merge)

---

## M5 review record

```text
Decision: Accepted
Subject (plan): docs/superpowers/plans/2026-08-08-m3-6-field-types.md
Accepted specification: docs/superpowers/specs/2026-08-08-rfc-009-resource-field-types-design.md
Delivery goal: Breaking widen Field to exactly { name, type } with closed FieldType; validate-before-snapshot; no dual-shape; projection unchanged
Review summary: No plan blockers. Pre-Accept wording tightened so validateFieldType is unambiguously non-exported; existing fields.ts module-local export mechanism preserved; snapshot ownership tests strengthened (member + array + Object.isFrozen).
Findings: None (no plan blockers)
Traceability: adequate (coverage + deferrals checked)
Gate: Proceed to M6. No implementation activity before this Accept.
Authority: Plan governs sequencing/execution; specification governs product semantics.
```

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.6 Field Types |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/23 |
| M4 | Plan **Accepted** (Draft reviewed) |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | **Approved** |
| M8 | **N/A** |
| M9 | **Complete** (roadmap + plan status in delivery PR) |
| Branch | `feat/m3-6-field-types` (merged) |
| PR | https://github.com/rexescario-dev/resource-forge/pull/24 |
| Status | **Slice complete** |

### Shipped

- Accepted M3.6 implementation plan for RFC-009 typed Fields
- Breaking Field widen to exactly `{ name, type }` with closed `FieldType`
- `invalid_field_type` vs `invalid_field_member`; validate-before-snapshot; frozen ownership on validated Resources
- Projection non-participation retained; relations/annotations/operations unchanged

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (134) |
| Typecheck | **Passed** |
| Lint | Skipped |
| Build | Skipped |
| Package validation | Skipped |
| CI | **Passed** (https://github.com/rexescario-dev/resource-forge/actions/runs/31239498193/job/93057958624) |

### Next Gate

None — slice complete

---

## M7 review record

```text
Decision: Approved for merge
Subject: https://github.com/rexescario-dev/resource-forge/pull/24 (merged as 2048fb3)
Accepted specification: docs/superpowers/specs/2026-08-08-rfc-009-resource-field-types-design.md
Accepted implementation plan: docs/superpowers/plans/2026-08-08-m3-6-field-types.md

Plan tasks reviewed:
- Task 1 types + failing tests: ✓
- Task 2 validate-before-snapshot + checkFields/snapshot/equality: ✓
- Task 3 projection non-participation + relation coexistence: ✓
- Task 4 exports + roadmap: ✓

Verification evidence:
- pnpm --filter @resource-forge/core test → 134 passed (local on main @ 2048fb3)
- pnpm --filter @resource-forge/core typecheck → Passed
- CI ci → pass (actions/runs/31239498193)

Review summary: Faithful RFC-009 / plan realization. Closed { name, type }; exact FieldType membership; name-only rejected; invalid_field_type vs invalid_field_member; validate then freeze; no dual-shape; no field→metadata; helpers not barrel-exported; validateFieldType non-exported. Scope limited to @resource-forge/core.

Blocking findings: None (no merge blockers)

Non-blocking observations:
- validateResource now re-snapshots fields/relations after check (supports ownership freezes; slightly beyond fixture-only snapshotting, still plan-consistent).

Gate: Already merged. M8 N/A. Slice complete.
```

---

## Gate

**M7 Approved.** Slice M3.6 complete on [#23](https://github.com/rexescario-dev/resource-forge/issues/23) / [#24](https://github.com/rexescario-dev/resource-forge/pull/24).
