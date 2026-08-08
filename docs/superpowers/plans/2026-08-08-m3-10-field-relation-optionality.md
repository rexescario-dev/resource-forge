# M3.10 Field/Relation Optionality — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-013. Reuse M3.1–M3.9 Resource / schema / field / relation / operation / annotation / projection surfaces. Do **not** implement `nullable`, runtime presence enforcement, empty-collection vs absent, persistence/DB null, bounds/constraints/defaults, cascade/loading/direction/joins, Operation optionality / kind / signature / execution, annotation vocabulary, field→metadata projection, dual-shape compatibility, or public `validateFields` / `validateRelations` / `validateOptional` / `validateResourceSchema`.

**Status:** Accepted  
**M5:** Accepted (2026-08-08) — Plan Review; no plan blockers after four editorial clarifications: order-independent key-set comparison for missing-optional; normative Field/Relation shape-classification tables; own-property `optional` requirement + test; Task 4 roadmap commit only as final delivery after M6+ gates; one PR with implementation for #42  
**Tracking:** [#42](https://github.com/rexescario-dev/resource-forge/issues/42)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted) — M3.10 was blocked on Field/Relation Optionality RFC  
**Source RFC:** RFC-013 Field/Relation Optionality (**Accepted**) — amends Field and Relation member floors; partial supersession of RFC-009 / RFC-011 closed-member / equality text  
**Depends on:** RFC-001 (**Accepted**, `user` context for Relation targets); RFC-005 (**Accepted**); RFC-006 (**Accepted**); RFC-007 (**Accepted**, Field collection retained); RFC-008 (**Accepted**, Relation collection retained); RFC-009 (**Accepted**, `FieldType` retained; Field shape partially superseded); RFC-010 (**Accepted**, declarative `target` retained); RFC-011 (**Accepted**, `multiplicity` meanings retained and orthogonal; Relation shape partially superseded); RFC-012 (**Accepted**, Operations unchanged); RFC-013 (**Accepted**); M3.1–M3.9 shipped  
**Package:** `@resource-forge/core`  
**Slice:** M3.10 only — required Field/Relation `optional: boolean` (schema-declaration presence only); breaking vs M3.6 `{ name, type }` Fields and M3.8 `{ name, target, multiplicity }` Relations; no dual-shape; validate-before-snapshot; projection non-participation unchanged; Operations unchanged

**Goal:** Widen every Field from `{ name, type }` to exactly `{ name: FieldName; type: FieldType; optional: boolean }` and every Relation from `{ name, target, multiplicity }` to exactly `{ name: RelationName; target: ResourceIdentity; multiplicity: RelationMultiplicity; optional: boolean }`, validate closed shapes + retained upstream rules + exact boolean `optional` as part of Resource validity, redefine Field/Relation value equality to include `optional`, keep `optional` fully orthogonal to RFC-011 `multiplicity`, and keep `projectResourceMetadata` free of any Field/Relation→metadata contribution.

**Architecture:**

```text
candidate fields / relations
          │
          ▼
 validate candidate member shape   ← Field exactly `{ name, type, optional }`;
                                    │ Relation exactly `{ name, target, multiplicity, optional }`
                                    │ (extras → invalid_*_member; no strip)
          │
          ▼
 validate retained member rules     ← FieldName + uniqueness + FieldType (RFC-007/009);
                                    │ RelationName + uniqueness + target (RFC-008/010);
                                    │ multiplicity exact "one"|"many" (RFC-011)
          │
          ▼
 validate optional                  ← absent → missing_*_optional;
                                    │ present but not exact boolean → invalid_*_optional
          │
          ▼
 snapshot exact valid members       ← freeze widened closed shapes; never invent default optional
          │
          ▼
       Resource.schema
          │
          ▼
    validateResource               ← authoritative Resource gate (delegates to checkFields / checkRelations)
          │
          ▼
 projectResourceMetadata           ← revalidate Resource; annotation-derived metadata only;
                                      fields/relations contribute nothing
```

**Invariant:** No implementation step may transform an invalid candidate into a valid Field/Relation by discarding information (including stripping unknown properties or inventing a default `optional`) before validation.

`optional` is **schema-declaration presence only** — not value nullability, runtime instance presence, empty-collection vs absent, persistence, or bounds. Uniqueness within `fields` / `relations` remains **by name only**. Field value equality is exact `name` **and** exact `type` **and** exact `optional`. Relation value equality is exact `name` **and** RFC-001 `target` equality **and** exact `multiplicity` **and** exact `optional`. `optional` MUST NOT affect or reinterpret `multiplicity` (all four combinations valid).

**Tech Stack:** TypeScript strict, Vitest (existing `packages/core` scripts)

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Locked decisions (export / shape review — planning aids)

These freeze the M3.10 implementation surface. They MUST NOT invent product semantics beyond RFC-013 (+ retained RFC-007 / RFC-008 / RFC-009 / RFC-010 / RFC-011 / RFC-012 rules).

| Decision | Lock |
| --- | --- |
| `optional` | Exact boolean `true \| false` only. No coerce, normalize, string/number/`null` stand-ins, or omit-as-default. |
| Meaning | `true` → declaration **may be absent**; `false` → declaration **must be present**. Schema-declaration presence only. |
| `Field` | `{ readonly name: FieldName; readonly type: FieldType; readonly optional: boolean }` **exactly**. No additional members. |
| `Relation` | `{ readonly name: RelationName; readonly target: ResourceIdentity; readonly multiplicity: RelationMultiplicity; readonly optional: boolean }` **exactly**. No additional members. |
| Missing Field `optional` | `missing_field_optional` when own key `optional` is absent and the candidate's **order-independent** key set is exactly `{ name, type }` (breaking vs M3.6 two-member Fields). |
| Missing Relation `optional` | `missing_relation_optional` when own key `optional` is absent and the candidate's **order-independent** key set is exactly `{ name, target, multiplicity }` (breaking vs M3.8 three-member Relations). |
| Key-set comparison | Order-independent. `Object.keys()` cardinality/order MUST NOT be treated as semantic. `{ name, type }` and `{ type, name }` both classify as missing Field `optional`; likewise for Relation key-set special cases. |
| Own-property `optional` | `optional` MUST be an **own** property. Inherited / prototype-derived `optional` does **not** satisfy the closed Field/Relation contract (classify as missing-optional when the own-key set matches the special case). |
| Present-but-invalid `optional` | `invalid_field_optional` / `invalid_relation_optional` (not exact boolean). |
| Extra Field/Relation member | `invalid_field_member` / `invalid_relation_member` (e.g. premature `nullable`, defaults, direction). Never stripped. `{ name, type, nullable }` is `invalid_field_member`, not `missing_field_optional`. |
| Orthogonality | All four `multiplicity × optional` combinations valid. Empty collection vs absent for `"many"` remains undefined / untested as product semantics. |
| Uniqueness | Still by name only (RFC-007 / RFC-008) — not by `(name, optional)` or `(name, multiplicity, optional)`. |
| `FieldType` / `target` / `multiplicity` meanings | Unchanged (RFC-009 / RFC-010 / RFC-011). |
| `operations` | Unchanged RFC-012 name-only floor. |
| Snapshot vs validation | **Separated, non-lossy.** Validate candidates **before** materializing widened closed members. `snapshotFields` / `snapshotRelations` freeze already-valid members; MUST NOT invent default `optional`. |
| Non-empty Resource construction | **No public builder.** Tests use existing **internal** `createResourceWithFieldsForTests` / `createResourceWithRelationsForTests` / `createResourceWithOperationsForTests` (validate-before-snapshot). |
| Internal helpers | `checkFields` / `checkRelations` / `snapshotFields` / `snapshotRelations` / `fieldsEqual` / `relationsEqual` remain **module-local same-package seams** (existing mechanism; MUST NOT be barrel-/package-exported). Optional may be validated **inline**; separate internal helpers are optional and MUST NOT become public. |
| Validation ownership | Part of `validateResource` via schema (`checkFields` / `checkRelations`). No public `validateFields` / `validateRelations` / `validateOptional` / `validateResourceSchema`. |
| Schema error taxonomy | Field failures: existing causes plus **`missing_field_optional`** and **`invalid_field_optional`**. Relation failures: existing causes plus **`missing_relation_optional`** and **`invalid_relation_optional`**. |
| Projection | Still annotation-only. Fields/Relations MUST NOT contribute entries. Invalid optional still fails the projection gate. |
| Equality helpers | **Test/internal only.** `fieldsEqual` includes exact `optional`. `relationsEqual` includes exact `optional` (and retained name/target/multiplicity). |
| Compose / registry | SHALL NOT require compose/registry; SHALL NOT validate live instance presence. |

---

## M3.10 public contract surface

| Symbol | Kind | Role |
| --- | --- | --- |
| `Field` | type | `{ readonly name; readonly type; readonly optional }` |
| `FieldValidationError` | type | Prior causes + `missing_field_optional` + `invalid_field_optional` |
| `Relation` | type | `{ readonly name; readonly target; readonly multiplicity; readonly optional }` |
| `RelationValidationError` | type | Prior causes + `missing_relation_optional` + `invalid_relation_optional` |
| `RelationMultiplicity` / `FieldType` / names | type | Retained |
| `ResourceSchema` | type | Unchanged collection slots; members carry `optional` |
| `validateResource` | function | Validates optional rules + retained composed rules |
| `createResource` / `createEmptyResourceSchema` | function | Still empty collections |
| `projectResourceMetadata` | function | Identity + annotation entries only |
| Operation / annotation / identity surfaces | retained | Unchanged |

**Not public in M3.10:**

- `validateFields` / `validateRelations` / `validateOptional` / `validateResourceSchema`
- `validateFieldName` / `validateRelationName` / `snapshotFields` / `snapshotRelations` / `fieldsEqual` / `relationsEqual` as product APIs
- Public Resource builders / `createResource(identity, fields?, relations?)`
- `nullable`, runtime presence, empty-vs-absent product semantics, persistence, bounds, direction/join/cascade/load
- Dual-shape migration helpers
- Operation optionality / kind / signature / execution
- Field/Relation→metadata projection

**Retain:** M2–M3.9 exports; `PACKAGE_NAME` / `PACKAGE_VERSION`.

### Validation error shape (planning aid)

```ts
type Field = {
  readonly name: FieldName;
  readonly type: FieldType;
  readonly optional: boolean;
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
    }
  | {
      readonly code: 'missing_field_optional';
      readonly index: number;
    }
  | {
      readonly code: 'invalid_field_optional';
      readonly index: number;
      readonly optional: unknown;
    };

type Relation = {
  readonly name: RelationName;
  readonly target: ResourceIdentity;
  readonly multiplicity: RelationMultiplicity;
  readonly optional: boolean;
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
    }
  | {
      readonly code: 'missing_relation_optional';
      readonly index: number;
    }
  | {
      readonly code: 'invalid_relation_optional';
      readonly index: number;
      readonly optional: unknown;
    };
```

Do not invent additional optional cause codes beyond RFC-013 conceptual separation. Do not put operation / annotation failures under field/relation optional causes. Do not invent `nullable`-related cause codes.

### Shape classification (normative for this plan)

Key-set comparison is **order-independent**; missing-optional classification applies only when the candidate's **own** key set is exactly the special-case set below. `Object.keys()` enumeration order MUST NOT be treated as semantic.

**Field:**

| Candidate shape | Result |
| --- | --- |
| `{ name, type }` (own keys exactly; any key order) | `missing_field_optional` |
| `{ name, type, optional }` (own keys exactly) | continue validation |
| `{ name, type, extra }` (e.g. `nullable`) | `invalid_field_member` |
| `{ name, type, optional, extra }` | `invalid_field_member` |
| non-object | `invalid_field_member` |
| own keys omit `optional`, but set is not exactly `{ name, type }` | `invalid_field_member` |

**Relation:**

| Candidate shape | Result |
| --- | --- |
| `{ name, target }` (own keys exactly; any key order) | `missing_relation_multiplicity` |
| `{ name, target, multiplicity }` (own keys exactly; any key order) | `missing_relation_optional` |
| `{ name, target, multiplicity, optional }` (own keys exactly) | continue validation |
| anything else with extras / missing members | `invalid_relation_member` unless a retained special-case applies |

### Construction vs validation (normative for this plan)

| Concern | Owner |
| --- | --- |
| Validate raw candidates (closed shape / names / uniqueness / type or target+multiplicity / optional) | Internal `checkFields` / `checkRelations`, reused by construction seams and `validateResource` |
| Establish snapshotted ordered collections from **already-valid** members | Empty schema constructors; **internal** fixtures for non-empty tests |
| Decide validity of a Resource | `validateResource` (authoritative; delegates to `checkFields` / `checkRelations` / `checkOperations`) |
| Project metadata | `projectResourceMetadata` after revalidation — annotations only |

Existing internal fixtures continue to call `checkFields` / `checkRelations` **before** snapshotting; failure mapping MUST use the same `invalid_schema` + field/relation causes as `validateResource` (no silent success after stripping or inventing `optional`).

### Projection behavior (unchanged non-participation)

```text
projectResourceMetadata(resource)
  1. validateResource(resource)     // includes optional validity rules
  2. on failure → invalid_resource
  3. createResourceMetadata(identity, [...resource.annotations])  // fields/relations ignored
  4. on metadata failure → invalid_metadata (defensive)
  5. success → ResourceMetadata with identity + annotation-derived entries only
```

MUST NOT mutate Resource. MUST NOT invent field/relation-derived metadata keys/envelopes. Invalid `optional` MUST fail the projection gate (no bypass because fields/relations contribute nothing).

---

## Constraints (from Accepted RFC-013 + retained upstream RFCs)

### SHALL

- represent every Field as exactly `{ name, type, optional }`
- represent every Relation as exactly `{ name, target, multiplicity, optional }`
- require `optional` on every Field and every Relation; reject absence as `missing_*_optional`
- accept only exact boolean `true` / `false`; reject stand-ins as `invalid_*_optional`
- redefine Field value equality as exact `name` **and** exact `type` **and** exact `optional`
- redefine Relation value equality as exact `name` **and** RFC-001 target equality **and** exact `multiplicity` **and** exact `optional`
- keep `optional` fully orthogonal to `multiplicity` (all four combinations valid)
- retain RFC-007 / RFC-008 collection rules (order, uniqueness-by-name, empty validity, independent namespaces, snapshot ownership)
- retain RFC-009 `FieldType`, RFC-010 declarative `target` + `user` context, RFC-011 `"one"|"many"` meanings, RFC-012 Operations
- validate candidates **before** any materialization of widened closed members
- keep missing vs invalid `optional` distinct; no silent coercion/defaulting/repair
- leave projection free of field/relation contributions while still revalidating the Resource

### SHALL NOT

- accept two-member Fields or three-member Relations after this slice (no dual-shape period)
- invent `nullable`, runtime presence enforcement, empty-vs-absent product semantics, persistence/DB null, bounds/constraints/defaults, cascade/loading/direction/joins
- reinterpret `multiplicity` via `optional`, or invent Operation optionality
- default, coerce, normalize, or invent `optional`
- contribute fields/relations to `projectResourceMetadata`
- transform an invalid candidate into a valid Field/Relation by discarding unknown properties before validation
- introduce public `validateFields` / `validateRelations` / `validateOptional` / `validateResourceSchema`
- reopen RFC-009 type vocabulary, RFC-010 association floor, RFC-011 multiplicity meanings, or RFC-012 `{ name }` Operations
- export `fieldsEqual` / `relationsEqual` / name validators / snapshot helpers as public product APIs

---

## Package / ownership boundaries

### `@resource-forge/core` owns

- `packages/core/src/resource/*` Field/Relation types, internal field/relation helpers, validation integration, fixture comments, regression test updates
- tests for RFC-013 optional shape / boolean exactness / equality / orthogonality / validation / projection non-participation

### Consume only

- Existing identity, metadata, annotations, operations, result utilities as already used by M3.1–M3.9

### Must remain untouched (feature-free)

- `packages/nest`, `packages/graphql`, `packages/prisma`, `packages/cli`
- Local uncommitted `cursor@0.2.0` / session-handoff install artifacts (chore-only; out of this delivery PR)

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/core/src/resource/types.ts` | Widen `Field` / `Relation`; add missing/invalid optional error variants |
| `packages/core/src/resource/fields.ts` | Closed `{ name, type, optional }` validation; exact boolean; non-lossy snapshot; equality includes optional |
| `packages/core/src/resource/relations.ts` | Closed `{ name, target, multiplicity, optional }` validation; exact boolean; non-lossy snapshot; equality includes optional; retain multiplicity missing/invalid causes |
| `packages/core/src/resource/fields.test.ts` | Accept true/false; reject two-member / missing / non-boolean / extras; equality includes optional |
| `packages/core/src/resource/relations.test.ts` | Accept four-member + all multiplicity×optional combos; retarget prior “`optional` as extra” case to premature `nullable` (or similar); reject three-member missing optional |
| `packages/core/src/resource/create-resource-with-fields.ts` / `create-resource-with-relations.ts` / `create-resource-with-operations.ts` | Comments + snapshot of widened members; empty collections unchanged |
| `packages/core/src/resource/validate.ts` | Continues to call `checkFields` / `checkRelations` / `checkOperations` (likely body-stable) |
| `packages/core/src/resource/validate.test.ts` | Update fixtures to include `optional` |
| `packages/core/src/resource/project.test.ts` | Optional fixtures; still zero field/relation→metadata contribution; invalid optional → `invalid_resource` |
| `packages/core/src/resource/operations.test.ts` | Retarget any field/relation fixtures that omit `optional` |
| `packages/core/src/resource/exports.test.ts` | Widened types exported; assert no public optional validate helper |
| `packages/core/src/resource/index.ts` / `packages/core/src/index.ts` | Export widened Field/Relation error unions as needed |
| `docs/roadmap.md` | Update only as the **final delivery commit** after M6 implementation and the review/refactoring/documentation/validation gates required by the parent M3 workflow are green |

Planning note: file names are layout choices, not product module boundaries required by RFC-013.

---

## TDD / verification strategy

For each task: write failing tests → implement → green → commit.

**Must cover:**

1. Empty `fields` / `relations` remain valid (regression)
2. Valid Fields with `optional: true` and `optional: false` accepted; order + name + type + optional preserved
3. Valid Relations with all four `multiplicity × optional` combinations accepted
4. Two-member `{ name, type }` Field → `missing_field_optional` (breaking vs M3.6); key order must not matter (`{ type, name }` same cause)
5. Three-member `{ name, target, multiplicity }` Relation → `missing_relation_optional` (breaking vs M3.8); key order must not matter
6. Present-but-invalid optional (`"true"`, `1`, `0`, `null`, `"false"`) → `invalid_*_optional`
7. Extra property (e.g. Field/Relation `nullable: true`) → `invalid_*_member` — never stripped; not classified as missing-optional
8. Inherited / prototype-derived `optional` does **not** satisfy the closed contract → `missing_*_optional` when own-key set matches the special case
9. **Retarget** current Relation test that uses `optional: true` as an “extra” property — after this slice `optional` is required; use a different premature property (e.g. `nullable`) for the extras case
10. Invalid names / duplicates / bad type / bad target / missing or invalid multiplicity still map to existing causes (with valid `optional` present where needed to isolate the cause)
11. Uniqueness by name only: same name with different `optional` cannot coexist → duplicate name cause
12. Snapshot ownership: mutating caller-owned candidates MUST NOT change snapshotted members; assert freezes
13. Order-sensitive equality (internal/test): different `optional` → unequal; different order → unequal
14. Independent namespaces: Field / Relation / Operation may share name string
15. Projection: non-empty fields/relations with optional + empty annotations → no field/relation-derived metadata entries
16. Projection: invalid missing-optional members → `invalid_resource`
17. Purity: projection does not mutate Resource / collections
18. Public surface: widened `Field` / `Relation` / validation error unions exported; no `validateOptional` / `validateFields` / `validateRelations`
19. Operations / annotations regressions remain green

**Do not:** invent nullability/runtime/empty-vs-absent product assertions; accept dual-shape; default optional; contribute fields/relations to metadata; reopen Operations.

**Regression retarget:** All existing acceptance fixtures that use two-member Fields or three-member Relations MUST be updated to the new closed shapes. Tests that previously treated `optional` as an illegal extra Relation property MUST switch to a different premature property.

---

### Task 1: Contract types + failing tests (breaking widen)

**Files:**
- Modify: `packages/core/src/resource/types.ts`
- Modify: `packages/core/src/resource/fields.test.ts`
- Modify: `packages/core/src/resource/relations.test.ts`
- Modify: `packages/core/src/resource/validate.test.ts`
- Modify: `packages/core/src/resource/project.test.ts` (fixture shapes)
- Modify: `packages/core/src/resource/operations.test.ts` (any field/relation fixtures)
- Modify: `packages/core/src/resource/exports.test.ts`

- [x] **Step 1: Widen types** — apply the planning-aid `Field` / `Relation` / validation-error unions above (add only the four new optional causes; retain all prior causes including multiplicity)

- [x] **Step 2: Update fixtures + add failing optional tests**

1. Update existing **valid** M3.6/M3.8 fixtures that omit `optional` to the new accepted closed shapes (prerequisite compatibility — these should stay green once implemented).
2. Retarget Relation “extra member” cases that currently use `optional: true` to use e.g. `nullable: true` instead.
3. Add **new** RFC-013 regression tests that initially fail (missing optional including key-order independence and inherited-only `optional`, invalid boolean stand-ins, extras, equality includes optional, multiplicity×optional orthogonality).

```ts
it('accepts closed Fields with optional true and false', () => {
  const resource = createResourceWithFieldsForTests(identity, [
    { name: 'email', type: 'string', optional: false },
    { name: 'nickname', type: 'string', optional: true },
  ]);
  expect(resource.ok).toBe(true);
  // expect preserved name+type+optional order
});

it('rejects two-member Fields as missing_field_optional (breaking)', () => {
  for (const candidate of [
    { name: 'email', type: 'string' },
    { type: 'string', name: 'email' },
  ] as const) {
    const resource = createResourceWithFieldsForTests(identity, [candidate]);
    expect(resource.ok).toBe(false);
    // cause: missing_field_optional
  }
});

it('requires optional to be an own property', () => {
  const field = Object.create({ optional: true });
  field.name = 'email';
  field.type = 'string';

  const result = createResourceWithFieldsForTests(identity, [field]);
  expect(result.ok).toBe(false);
  // cause: missing_field_optional — inherited optional does not satisfy the closed contract
});

it('rejects non-boolean field optional as invalid_field_optional', () => {
  for (const optional of ['true', 1, 0, null, 'false'] as const) {
    const resource = createResourceWithFieldsForTests(identity, [
      { name: 'email', type: 'string', optional },
    ]);
    expect(resource.ok).toBe(false);
    // cause: invalid_field_optional
  }
});

it('accepts all multiplicity × optional Relation combinations', () => {
  const resource = createResourceWithRelationsForTests(identity, [
    { name: 'customer', target: { namespace: 'crm', name: 'Customer' }, multiplicity: 'one', optional: false },
    { name: 'manager', target: { namespace: 'crm', name: 'User' }, multiplicity: 'one', optional: true },
    { name: 'items', target: { namespace: 'crm', name: 'LineItem' }, multiplicity: 'many', optional: false },
    { name: 'tags', target: { namespace: 'crm', name: 'Tag' }, multiplicity: 'many', optional: true },
  ]);
  expect(resource.ok).toBe(true);
});

it('rejects three-member Relations as missing_relation_optional (breaking)', () => {
  const resource = createResourceWithRelationsForTests(identity, [
    {
      name: 'customer',
      target: { namespace: 'crm', name: 'Customer' },
      multiplicity: 'one',
    },
  ]);
  expect(resource.ok).toBe(false);
  // cause: missing_relation_optional
});
```

Also update `validate.test.ts` / `project.test.ts` / `operations.test.ts` acceptance fixtures to include `optional`. Mirror own-property / key-order missing-optional coverage for Relations as needed.

- [x] **Step 3: Run** `pnpm --filter @resource-forge/core test` — expect FAIL on new/updated optional cases (and compile breaks where two-/three-member shapes were assumed)
- [x] **Step 4: Commit** `test(core): add failing M3.10 Field/Relation optional contract tests`

### Task 2: Validate-before-snapshot + validation integration

**Files:**
- Modify: `packages/core/src/resource/fields.ts`
- Modify: `packages/core/src/resource/relations.ts`
- Modify: fixture comment files as needed
- Confirm: `packages/core/src/resource/validate.ts` continues to call `checkFields` / `checkRelations`

- [x] **Step 1: Widen `checkFields`**

Apply the Field shape-classification table above. Recommended per-member order (planning aid; preserve reject-don’t-repair):

1. plain object required → else `invalid_field_member`
2. if **own** key `optional` is absent → `missing_field_optional` when the candidate's **order-independent own key set** is exactly `{ name, type }`; otherwise `invalid_field_member` (same principle as Relation missing-optional / malformed mapping)
3. own key set must be exactly `{ name, type, optional }` → else `invalid_field_member`
4. `name` string + `validateFieldName` → `invalid_field_name`
5. uniqueness-by-name → `duplicate_field_name`
6. `type` exact FieldType vocabulary → else `invalid_field_type`
7. `optional` exact boolean → else `invalid_field_optional` with `optional: unknown`
8. push `{ name, type, optional }`

Key-set comparison is order-independent; missing-optional classification applies only when the candidate's own key set is exactly `{ name, type }`. Inherited `optional` does not count. MUST NOT strip extras, invent `optional`, coerce stand-ins, or validate live instance presence.

- [x] **Step 2: Widen `checkRelations`**

Apply the Relation shape-classification table above. Recommended per-member order (planning aid):

1. plain object required → else `invalid_relation_member`
2. retain existing missing-multiplicity special case for **order-independent** own key set exactly `{ name, target }` → `missing_relation_multiplicity`
3. if **own** key `optional` is absent → `missing_relation_optional` when the candidate's **order-independent own key set** is exactly `{ name, target, multiplicity }`; otherwise `invalid_relation_member` unless another retained special-case applies (same explicit principle as Field)
4. own key set must be exactly `{ name, target, multiplicity, optional }` → else `invalid_relation_member`
5. retained name / uniqueness / target / multiplicity checks (same causes as M3.8)
6. `optional` exact boolean → else `invalid_relation_optional` with `optional: unknown`
7. push `{ name, target, multiplicity, optional }`

Key-set comparison is order-independent; missing-optional classification applies only when the candidate's own key set is exactly `{ name, target, multiplicity }`. Inherited `optional` does not count. Preserve M3.8 multiplicity missing vs invalid separation. MUST NOT invent default `optional` or reinterpret `multiplicity`.

- [x] **Step 3: Widen `snapshotFields` / `snapshotRelations` / `fieldsEqual` / `relationsEqual` (module-local only)**

Freeze widened closed members. Equality MUST include exact `optional`. Retain freeze of Relation `target`. MUST NOT barrel-export these helpers.

- [x] **Step 4: Update fixture comments** to say freeze widened closed shapes
- [x] **Step 5: Green** Task 1 optional acceptance + rejection causes
- [x] **Step 6: Commit** `feat(core): require Field/Relation optional boolean (RFC-013)`

### Task 3: Projection non-participation + coexistence regressions

**Files:**
- Modify: `packages/core/src/resource/project.test.ts` (finish optional fixtures if needed)
- Touch `project.ts` only if needed (body should remain annotation-only)

- [x] **Step 1: Ensure projection tests** use widened Fields/Relations; assert zero field/relation-derived entries; invalid missing-optional members → `invalid_resource`; purity
- [x] **Step 2: Confirm implementation** still `createResourceMetadata(identity, [...annotations])`
- [x] **Step 3: Full suite green including operations / annotations**
- [x] **Step 4: Commit** `test(core): optional fields/relations do not contribute to metadata projection`

### Task 4: Exports + final delivery hygiene

**Files:**
- Modify: `packages/core/src/resource/exports.test.ts` / barrels as needed
- Modify: `docs/roadmap.md` — **only** after M6 implementation, review, refactoring, documentation, and validation gates required by the parent M3 workflow are green
- Mark this plan’s task checkboxes complete when M6 completes (Status/M5 Accept already recorded)

- [x] **Step 1: Export smoke** — widened `Field` / `Relation` / error unions as locked; confirm no `validateOptional` / `validateFields` / `validateRelations`
- [x] **Step 2: Full `pnpm --filter @resource-forge/core test` green**
- [x] **Step 3: Update `docs/roadmap.md` only after M6 implementation, review, refactoring, documentation, and validation gates required by the parent M3 workflow are green**
- [x] **Step 4: Final delivery commit** `docs: record M3.10 field/relation optionality slice complete` — this commit is the **last** delivery commit for the slice, not part of ordinary mid-implementation sequencing

---

## Traceability

| Task | RFC-013 sections |
| --- | --- |
| Task 1 | §§1, 3–6 closed shapes, exact boolean, equality including optional, public surface |
| Task 2 | §§4–7 validation ownership, missing vs invalid optional, validate-before-snapshot, orthogonality to multiplicity, supersession of RFC-009/011 member floors |
| Task 3 | §8 projection non-participation (including validation-gate consequence) |
| Task 4 | §10 compatibility / §16 implementation gate / roadmap hygiene |

---

## Explicit deferrals

- `nullable` / value nullability
- Runtime presence enforcement against instances or payloads
- Empty-collection vs absent-relation representation for `multiplicity: "many"`
- Persistence / database nullability / ORM mapping
- Bounds, constraints, defaults, descriptions, per-member annotations
- Cascade, loading/fetch, direction/inverse, joins / local-field handles
- Operation optionality, kind, signature, input/output, execution (RFC-012 unchanged)
- Annotation vocabulary expansion
- Field → `ResourceMetadata` projection
- Dual-shape transitional validity
- Public Resource equality / builders
- Public `validateFields` / `validateRelations` / `validateOptional` / `validateResourceSchema`
- Host adapters

---

## M5 Plan Review checklist (for reviewers)

- [x] No new product semantics beyond RFC-013
- [x] Field closed exactly `{ name, type, optional }`; Relation closed exactly `{ name, target, multiplicity, optional }`
- [x] Exact boolean only; omit invalid; no defaults; no dual-shape
- [x] `optional: true` / `false` mean declaration may/must be present (schema only)
- [x] Missing vs invalid `optional` distinct causes on Field and Relation
- [x] Shape classification tables + order-independent own key-set comparison normative
- [x] Own-property `optional` required (inherited does not satisfy closed contract)
- [x] Equality includes `optional`; uniqueness remains name-only
- [x] `optional` fully orthogonal to RFC-011 `multiplicity` (all four combinations tested)
- [x] Validate-before-snapshot; no silent strip/default/coerce
- [x] `checkFields` / `checkRelations` remain the single field/relation validation implementations reused by fixtures and `validateResource`
- [x] Operations / annotations / projection non-participation unchanged
- [x] Prior “`optional` as Relation extra” tests explicitly retargeted
- [x] Prior two-/three-member acceptance fixtures explicitly widened
- [x] Task 4 roadmap/docs commit is final delivery only (after M6+ gates)
- [x] TDD tasks executable without inventing sequencing
- [x] M6 must not start until this plan is **Accepted**
- [x] Delivery packaging: Accepted plan + implementation in **one PR** for [#42](https://github.com/rexescario-dev/resource-forge/issues/42) (no plan-only merge)
- [x] Local `cursor@0.2.0` / session-handoff install stays out of this PR unless intentionally scoped

---

## Gate

**M5 Accepted.** M6 implementation may begin under this plan and tracking issue #42. Do not invent nullability/runtime/empty-vs-absent/Operations semantics, dual-shape compatibility, or default/coerce/strip `optional`. No invalid Field or Relation may become valid through stripping, defaulting, coercion, or normalization before validation.


---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.10 Field/Relation Optionality |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/42 |
| M4 | Plan **Accepted** |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | Pending |
| M8 | N/A |
| M9 | N/A |
| Branch | `feat/m3-10-field-relation-optionality` |
| PR | https://github.com/rexescario-dev/resource-forge/pull/43 |
| Status | **Ready for M7** |

### Shipped

- Widened `Field` to `{ name, type, optional }` and `Relation` to `{ name, target, multiplicity, optional }`
- Distinct `missing_*_optional` / `invalid_*_optional` causes; own-property + order-independent key-set classification
- Validate-before-snapshot; equality includes `optional`; multiplicity×optional orthogonality
- No Field/Relation → metadata contribution; missing optional still fails projection gate
- No public `validateOptional` / `validateFields` / `validateRelations`

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (170 in `@resource-forge/core`) |
| Typecheck | **Passed** |
| Lint | Skipped |
| Build | Skipped |
| Package validation | Skipped |

### Next Gate

**M7 Code Review** on PR #43
