# M3.14 Concrete Constraint Kinds — Implementation Tasks

> **For agentic workers:** Status is **Draft** until M5 Accepts. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-017. Reuse M3.1–M3.13 Resource / schema / field / relation / operation / annotation / projection / constraint-framework surfaces. Do **not** implement runtime enforcement, inclusive/exclusive `range` evaluation, pattern dialect/matching, uniqueness, cross-member constraints, Relation targeting, Field-local constraint slots, `spec` bags, registries, wire/persistence, or public `validateConstraints` / `validateResourceSchema`.

**Status:** Draft  
**M5:** Returned for Revision (2026-08-08) — cause-precedence looseness for missing closed-arm properties; snapshot wording risk. Revised (same date): deterministic closed-member vs semantic causes; snapshot reuses existing nested immutability. Pending re-review / Accept.  
**Tracking:** [#63](https://github.com/rexescario-dev/resource-forge/issues/63)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-017 Concrete Constraint Kinds (**Accepted**) — specializes RFC-016 Constraint member / `kind` / equality / validation  
**Depends on:** RFC-007 / RFC-009 / RFC-013 / RFC-014 (**Accepted**, Fields unchanged as targets); RFC-016 (**Accepted**, packaging retained); RFC-017 (**Accepted**); M3.1–M3.13 shipped  
**Package:** `@resource-forge/core`  
**Slice:** M3.14 only — closed exclusive `ConstraintKind`; kind-discriminated closed Constraint members with required `field`; declaration-time resolve + type-match; practical `range` / `pattern` / `enum` rules; order-sensitive `enum.values` equality; breaking vs M3.13 open-`kind` floor; runtime enforcement deferred

**Goal:** Specialize the M3.13 Constraint framework so every Constraint is a closed discriminated member of kind `"range" | "pattern" | "enum"`, each requiring a resolving `field: FieldName` with kind↔`FieldType` compatibility and kind-specific declaration rules, validated at Resource schema declaration time via an extended `checkConstraints` path — without runtime instance evaluation.

**Architecture:**

```text
raw candidate schema
          │
          ▼
 require constraints member         ← RFC-016 packaging retained
          │
          ▼
 checkFields(fields)                ← must succeed first (resolve targets)
          │
          ▼
 checkConstraints(constraints, fields)
          │  closed ConstraintKind
          │  kind-discriminated key sets
          │  field resolve + type-match
          │  range / pattern / enum rules
          │  name uniqueness (RFC-016)
          │
          ├── failure → ConstraintValidationError (widened causes)
          │
          ▼
 snapshotConstraints(validated)     ← freeze discriminated members (incl. values)
          │
          ▼
       Resource snapshot
          │
          ▼
 validateResource                   ← authoritative gate; single constraints algorithm
          │
          ▼
 projectResourceMetadata            ← still no Constraint contribution
```

**Invariant:** No implementation step may transform an invalid candidate into a valid Constraint by stripping properties, coercing kinds/types, inventing defaults, or dropping unresolved `field` references. Unknown kinds and bare `{ name, kind }` are invalid (breaking vs M3.13).

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-017 Accepted
       ↓
M3.14 plan Draft (this document)
       ↓
M5 Plan Review → Accepted (Status header only; task checkboxes stay open)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M9 / validation as required
       ↓
one delivery PR for tracking #63 (Accepted plan + implementation together)
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M3.14 delivery slice (Accepted plan + implementation). Do **not** open a separate plan-only merge PR as a required gate.

**Task checkboxes:** Completed during **M6 execution** only.

---

## Locked decisions (export / shape review — planning aids)

| Decision | Lock |
| --- | --- |
| `ConstraintKind` | Closed exclusive `"range" \| "pattern" \| "enum"`; exact equality; no aliases |
| Unknown kind | Distinct `unknown_constraint_kind` (MUST NOT collapse into `invalid_constraint_kind`) |
| Bare `{ name, kind }` / missing closed-arm keys | Always `invalid_constraint_member` (closed-member shape failure) — see cause precedence |
| `field` | Required own property on every concrete arm; valid `FieldName` grammar; MUST resolve against already-validated `fields` |
| `checkConstraints` signature | Internal: `checkConstraints(candidateConstraints, validatedFields)` (or equivalent) so resolve/type-match can run; MUST NOT invent a second public API |
| Validation order | `checkFields` before `checkConstraints` inside `validateResource` (already true); pass snapshotted/validated Field list into constraint check |
| `range` keys (closed shapes that proceed past shape check) | Own key set exactly `{ name, kind, field, min }`, `{ name, kind, field, max }`, or `{ name, kind, field, min, max }` |
| `range` field-only exception | Own key set exactly `{ name, kind, field }` → **not** a closed shape success; diagnose `invalid_range_bounds` (neither `min` nor `max`) after kind is recognized — see precedence |
| `pattern` keys | Own key set exactly `{ name, kind, field, pattern }` |
| `enum` keys | Own key set exactly `{ name, kind, field, values }` |
| Finite numbers | `Number.isFinite` for present `min`/`max` and numeric enum values; `NaN` / `±Infinity` invalid |
| `range` bounds | ≥1 of `min`/`max`; if both, `min <= max`; inclusive/exclusive evaluation **not** implemented |
| `pattern` | Non-empty string; opaque; no RegExp compile/match |
| `enum.values` | Non-empty array; homogeneous + FieldType-compatible; duplicates invalid (exact equality); equality **order-sensitive** |
| Multiple constraints / Field | Allowed (incl. same kind); uniqueness by `ConstraintName` only |
| Snapshot | Snapshot all declared properties using the **existing** Resource snapshot immutability rules; `enum.values` MUST receive the same nested snapshot/freeze treatment already used for nested sequence state (no new recursive deep-freeze product semantic) |
| Equality helper | Internal `constraintsEqual`: name + kind + field + kind-specific props; `enum.values` order-sensitive |
| Projection | No Constraint contribution; invalid constraints still fail gate |
| Public validate helpers | Still none |
| Field / Relation / Operation floors | Unchanged |
| Runtime enforcement | SHALL NOT |

---

## Constraint shape-classification (normative for this plan)

### Cause precedence (deterministic — must be tested)

Apply in order per candidate member (plain object required; else `invalid_constraint_member`):

1. Own key `kind` absent and own keys exactly `{ name }` → `missing_constraint_kind` (RFC-016 retained edge).
2. Own key `kind` present but not a string / empty string → `invalid_constraint_kind`.
3. Own key `kind` present as non-empty string not in `ConstraintKind` → `unknown_constraint_kind`.
4. **Closed-member shape check (key set):**
   - `range`: own keys must be exactly one of `{ name, kind, field, min }`, `{ name, kind, field, max }`, `{ name, kind, field, min, max }`, **or** the bounds-missing diagnostic shape `{ name, kind, field }`.
   - `pattern`: own keys must be exactly `{ name, kind, field, pattern }`.
   - `enum`: own keys must be exactly `{ name, kind, field, values }`.
   - Any other key set (missing `field`, missing required arm property, extras such as `spec`, `{ name, kind }` only, `{ name, kind, min }` without `field`, etc.) → **`invalid_constraint_member`**.
5. **Semantic declaration checks** (only after the key set is one of the shapes in step 4):
   - `range` with keys `{ name, kind, field }` → **`invalid_range_bounds`** (neither `min` nor `max`).
   - `range` with min/max present: non-finite or `min > max` → **`invalid_range_bounds`**.
   - `pattern` with `pattern` present but not a non-empty string → **`invalid_pattern`**.
   - `enum` with `values` present but empty / non-array / mixed / incompatible / duplicate / non-finite number → **`invalid_enum_values`**.
   - `field` present but not a valid `FieldName` string → **`invalid_constraint_field`**.
   - grammar-valid `field` not in validated `fields` → **`unresolved_constraint_field`**.
   - kind↔`FieldType` mismatch → **`constraint_field_type_mismatch`**.

**Separation rule:** Absence of a required closed-arm property is always a **shape** failure (`invalid_constraint_member`), never `invalid_pattern` / `invalid_enum_values` / `missing_constraint_field`. Semantic causes apply only when the property is present (or, for `range` bounds, when the only remaining failure is “neither `min` nor `max`” on the explicit `{ name, kind, field }` shape).

### Per-kind property causes (planning aid)

| Cause | When |
| --- | --- |
| `invalid_constraint_member` | Closed-member key-set failure (including missing `field` / missing `pattern` / missing `values` / extras / bare `{ name, kind }`) |
| `invalid_constraint_field` | `field` present but not a valid `FieldName` string |
| `unresolved_constraint_field` | grammar-valid `field` not present in validated `fields` |
| `constraint_field_type_mismatch` | kind targets incompatible `FieldType` |
| `invalid_range_bounds` | `{ name, kind, field }` (neither bound); non-finite bound; or `min > max` |
| `invalid_pattern` | `pattern` **present** but not a non-empty string |
| `invalid_enum_values` | `values` **present** but empty / non-array / non-homogeneous / incompatible / duplicates / non-finite numbers |

Do **not** introduce `missing_constraint_field` as a separate cause for absent `field` — absent `field` is `invalid_constraint_member`.

**Explicit boundary mappings (must be tested):**

```text
{ name, kind: "placeholder" }                         → unknown_constraint_kind
{ name, kind: "range" }                               → invalid_constraint_member
{ name, kind: "range", min: 0 }                       → invalid_constraint_member   (no field)
{ name, kind: "range", field: "total" }               → invalid_range_bounds
{ name, kind: "range", field: "total", min: 0 }       → proceed (if Field total:number exists)
{ name, kind: "range", field: "code", min: 0 }        → constraint_field_type_mismatch (string Field)
{ name, kind: "range", field: "total", min: 10, max: 1 } → invalid_range_bounds
{ name, kind: "pattern", field: "code" }              → invalid_constraint_member
{ name, kind: "pattern", field: "code", pattern: "" } → invalid_pattern
{ name, kind: "enum", field: "status" }               → invalid_constraint_member
{ name, kind: "enum", field: "status", values: [] }   → invalid_enum_values
{ name, kind: "enum", field: "status", values: ["a","a"] } → invalid_enum_values
{ name, kind: "enum", field: "status", values: ["a", 1] }  → invalid_enum_values
{ name, kind: "range", field: "total", min: 0, spec: {} } → invalid_constraint_member
constraints: []                                       → still valid
```

---

## M3.14 public contract surface

| Symbol | Kind | Role |
| --- | --- | --- |
| `ConstraintName` | type | Unchanged (RFC-016) |
| `ConstraintKind` | type | `"range" \| "pattern" \| "enum"` |
| `Constraint` | type | Discriminated closed union per RFC-017 |
| `ConstraintValidationError` | type | Widened with new causes; retain collection causes |
| `ResourceSchema.constraints` | field | Still required `ReadonlyArray<Constraint>` |
| `validateResource` / `createResource` / projection | functions | Integrate specialized validation; empty `constraints: []` remains valid |
| Field / Relation / Operation / annotation surfaces | retained | Unchanged |

**Not public:** `checkConstraints` / `snapshotConstraints` / `constraintsEqual` / `validateConstraints` / builders / runtime evaluators.

### Planning-aid types

```ts
type ConstraintKind = 'range' | 'pattern' | 'enum';

type Constraint =
  | {
      readonly name: ConstraintName;
      readonly kind: 'range';
      readonly field: FieldName;
      readonly min?: number;
      readonly max?: number;
    }
  | {
      readonly name: ConstraintName;
      readonly kind: 'pattern';
      readonly field: FieldName;
      readonly pattern: string;
    }
  | {
      readonly name: ConstraintName;
      readonly kind: 'enum';
      readonly field: FieldName;
      readonly values: ReadonlyArray<string | number | boolean>;
    };
```

---

## Constraints (from Accepted RFC-017)

### SHALL

- accept only `"range" | "pattern" | "enum"` as `kind`
- require kind-discriminated closed members with required `field`
- resolve `field` against validated `fields` and enforce type-match rules
- enforce practical `range` / `pattern` / `enum` declaration rules (incl. finite numbers; order-sensitive enum equality)
- retain RFC-016 packaging (required ordered sequence; empty valid; omit/non-sequence invalid; uniqueness by name; independent namespaces; validate-before-snapshot; projection non-participation)
- keep constraint errors under `invalid_schema` distinct from field/relation/operation/annotation failures

### SHALL NOT

- evaluate Resource instances / values against constraints
- interpret `pattern` as a regex engine input
- define inclusive/exclusive `range` evaluation
- accept unknown kinds or bare `{ name, kind }`
- introduce `spec` bags, registries, Relation targeting, uniqueness/cross-member kinds
- reopen Field/Relation/Operation floors
- contribute constraints to metadata
- export public constraint validate helpers

---

## Package / ownership boundaries

### `@resource-forge/core` owns

- `packages/core/src/resource/types.ts` — widen Constraint / error unions; export `ConstraintKind`
- `packages/core/src/resource/constraints.ts` — specialize `checkConstraints` / snapshot / equality
- `packages/core/src/resource/constraints.test.ts` — RFC-017 contract tests
- `packages/core/src/resource/validate.ts` — pass validated fields into constraint check
- Fixture seams / regression tests as needed
- Roadmap M3.14 ✅ only as **final delivery commit** after M6+ gates

### Must remain untouched (feature-free)

- `packages/nest`, `packages/graphql`, `packages/prisma`, `packages/cli`
- Unrelated workflow tooling bumps
- RFC-016 packaging rules (except specialized member validation)

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/core/src/resource/types.ts` | `ConstraintKind`, discriminated `Constraint`, widened `ConstraintValidationError` |
| `packages/core/src/resource/constraints.ts` | Specialized validation / snapshot / equality |
| `packages/core/src/resource/constraints.test.ts` | Kind / field / type-match / kind-rules / equality / breaking open-kind tests |
| `packages/core/src/resource/validate.ts` | Wire `checkConstraints(..., fields)` |
| `packages/core/src/resource/validate.test.ts` | Integration omit/empty/valid/invalid paths |
| `packages/core/src/resource/create-resource-with-constraints.ts` | Fixture seam supplies Fields when testing non-empty constraints |
| `packages/core/src/resource/{project,exports,fields,relations,operations,schema}.test.ts` | Retarget any open-kind / bare placeholders; keep floors unchanged |
| `packages/core/src/resource/index.ts` / `packages/core/src/index.ts` | Export `ConstraintKind` + widened Constraint types |
| `docs/roadmap.md` | M3.14 ✅ only on final delivery commit |

---

## TDD / verification strategy

For each implementation task after types: failing tests → implement → green → commit.

**Must cover:**

1. Empty `constraints` still valid
2. Valid `range` / `pattern` / `enum` members accepted; properties preserved in snapshot
3. Unknown kind (e.g. `"placeholder"`) → `unknown_constraint_kind` (**breaking** vs M3.13)
4. Bare `{ name, kind: "range" }` / `{ name, kind: "pattern", field }` / `{ name, kind: "enum", field }` → `invalid_constraint_member` (shape)
5. Extra props / `spec` → `invalid_constraint_member`
6. `{ name, kind: "range", field }` → `invalid_range_bounds`; invalid / unresolved `field` when shape otherwise closed
7. Type mismatch: `range`→string, `pattern`→number, `enum` incompatible values
8. `range`: non-finite; `min > max`; min-only / max-only / both valid
9. `pattern`: `pattern: ""` → `invalid_pattern`; opaque non-empty accepted without RegExp semantics
10. `enum`: `values: []` / duplicates / mixed types → `invalid_enum_values`; order-sensitive equality (`["a","b"]` ≠ `["b","a"]`)
11. Multiple constraints on same Field (incl. same kind) valid when names differ
12. Duplicate ConstraintName still invalid
13. Independent namespaces retained
14. Validate-before-snapshot: invalid candidates never materialize
15. Projection: non-empty concrete constraints contribute no metadata; invalid still fail gate
16. Public surface: `ConstraintKind` / Constraint types exported; no `validateConstraints`
17. Field/Relation/Operation regressions green

**Do not:** assert runtime evaluation; assert regex compilation; assert set-equality for enum; accept dual open-kind mode.

---

### Task 1: Contract types + breaking unknown-kind tests

**Files:** `types.ts`, `constraints.test.ts`, barrels

- [ ] **Step 1:** Introduce `ConstraintKind` and discriminated `Constraint`; widen `ConstraintValidationError`
- [ ] **Step 2:** Add failing tests for unknown kind / bare framework shapes / valid discriminated shapes (types-level + runtime via seams)
- [ ] **Step 3:** Export `ConstraintKind` from public barrels
- [ ] **Step 4:** Commit

### Task 2: Specialize `checkConstraints` + snapshot/equality

**Files:** `constraints.ts`, `constraints.test.ts`, `validate.ts`, fixture seam

- [ ] **Step 1:** Change internal `checkConstraints` to accept validated Fields; implement kind discrimination, resolve/type-match, kind rules, finite numbers
- [ ] **Step 2:** Update `snapshotConstraints` / `constraintsEqual` for discriminated members (order-sensitive `values`)
- [ ] **Step 3:** Wire `validateResource` to pass validated fields into `checkConstraints`
- [ ] **Step 4:** Update `createResourceWithConstraintsForTests` (and any fixtures using open kinds) to supply compatible Fields + concrete shapes
- [ ] **Step 5:** Green suite for Task 2 coverage; commit

### Task 3: Integration + projection + export regressions

**Files:** `validate.test.ts`, `project.test.ts`, `exports.test.ts`, other retargeted fixtures

- [ ] **Step 1:** Integration tests for empty / valid multi-kind / breaking open-kind via `validateResource`
- [ ] **Step 2:** Projection non-participation with concrete constraints; invalid → `invalid_resource`
- [ ] **Step 3:** Export smoke; Field/Relation/Operation floors unchanged
- [ ] **Step 4:** Commit

### Task 4: Docs hygiene (final delivery commit only)

**Files:** `docs/roadmap.md`, this plan’s Slice Completion Report

- [ ] **Step 1:** After M6+ gates, mark M3.14 ✅ on roadmap; fill SCR
- [ ] **Step 2:** Commit on the delivery PR

---

## Traceability

| Spec section | Tasks |
| --- | --- |
| §4 Closed ConstraintKind | 1–2 |
| §5 Discriminated members + field targeting | 1–2 |
| §5.2–5.4 kind rules | 2 |
| §6 Equality (order-sensitive enum) | 2 |
| §7 Validation / causes | 2–3 |
| §8 Projection non-participation | 3 |
| §14 Breaking vs M3.13 | 1–3 |

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Fixture debt from M3.13 open-kind placeholders | Task 2 retarget all non-empty constraint fixtures |
| `checkConstraints` needs Fields context | Pass validated fields; keep helper internal |
| Over-implementing regex/runtime | Explicit SHALL NOT + tests that do not compile/match patterns |
| Enum order vs set confusion | Tests lock order-sensitive equality as Accepted |

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.14 Concrete Constraint Kinds |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/63 |
| M4 | Plan **Draft** (pending M5) |
| M5 | Pending |
| M6 | Pending |
| M7 | Pending |
| M8 | N/A |
| M9 | N/A |
| Branch | `feat/m3-14-concrete-constraint-kinds` |
| PR | TBD |
| Status | **Draft plan** |

### Shipped

_(filled at M6)_

### Validation

| Check | Result |
| --- | --- |
| Tests | Pending |
| Typecheck | Pending |
| Lint | Pending |
| Build | Pending |
| Package validation | Pending |

### Next Gate

**M5 Plan Review** — do not begin M6 until this plan is **Accepted**.
