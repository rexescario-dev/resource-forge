# RFC-019: Intra-Instance Cross-Member Constraints

**Date:** 2026-08-08  
**Status:** Draft  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#70](https://github.com/rexescario-dev/resource-forge/issues/70)  
**Depends on:** RFC-001 (Resource Identity — via Resource), RFC-005 (Resource Model — aggregate / schema), RFC-007 (Resource Fields — `FieldName` / ordered `fields`), RFC-009 (Resource Field Types — `FieldType` ∈ {string, number, boolean}), RFC-013 / RFC-014 (Field optionality / nullability — relied upon for runtime gates), RFC-016 (Constraints framework — packaging retained), RFC-017 (Concrete Constraint Kinds — specialized here for cross-member kinds), RFC-018 (Runtime Constraint Enforcement — field-value map / order / fail-fast / gates retained and extended for multi-field kinds)  
**Followed by:** Population / database uniqueness (set-of-instances or host-supplied key surface); Relation-targeted constraints; Field-local constraint slots; additional cross-member operators (ordering, co-presence, etc.) only if a future RFC justifies them; wire / serialization; persistence / ORM mapping; Operation kind / signature / execution; annotation vocabulary; richer projection; direction / joins; empty-vs-absent / null elements for Relations  
**Unblocks:** M3.x cross-member constraint implementation planning (M4→M5), then implementation (M6), after this RFC is Accepted — not implementation by itself  
**Amends / specializes:** RFC-017 closed `ConstraintKind` vocabulary and the former invariant that every Constraint has required `field: FieldName`. Amends RFC-018 kind-evaluation coverage so `distinct` / `equal` are evaluated against the existing field-value map. Does **not** reopen RFC-016 packaging, RFC-017 member-local `range` / `pattern` / `enum` shapes, or RFC-018’s single-map / fail-fast / ignore-unknown-keys model. Does **not** introduce population uniqueness.

## Primary question

> How are **intra-instance cross-member** Constraints declared and evaluated—targeting multiple Fields of the same Resource instance against the existing field-value map—without inventing population uniqueness, persistence, or a second runtime model?

## Thesis

RFC-019 extends the constraint stack with **intra-instance cross-member** Constraints only:

- Packaging remains the single RFC-016 `ResourceSchema.constraints` sequence.
- `ConstraintKind` gains two closed multi-field kinds: **`distinct`** and **`equal`**.
- Member-local kinds (`range` / `pattern` / `enum`) retain required `field: FieldName`.
- Cross-member kinds use required `fields: FieldName[]` (`length >= 2`, unique names, each resolved) and **MUST NOT** declare `field`.
- Declaration validates shape, resolve, and **homogeneous** target `FieldType`.
- Runtime evaluation uses the **existing RFC-018 field-value map**, sequence order, and fail-fast result model.
- Multi-field presence / null / type gates run before kind evaluation; if any targeted Field gates to **skip**, the Constraint **skips**; if any gates to **fail**, the Constraint **fails**.
- Kind rules compare the gathered non-null scalars with the same equality relation RFC-018 uses for `enum` membership (`===` for numbers, including `-0`/`0`).
- **Population uniqueness** (across instances / stores / queries / indexes) is explicitly out of scope.

```text
ResourceSchema.constraints  (RFC-016 packaging retained)
└── Constraint
    ├── member-local (RFC-017 retained)
    │   ├── { name, kind: "range",   field, min?, max? }
    │   ├── { name, kind: "pattern", field, pattern }
    │   └── { name, kind: "enum",    field, values }
    └── cross-member (this RFC)
        ├── { name, kind: "distinct", fields }   # ≥2 FieldNames
        └── { name, kind: "equal",    fields }   # ≥2 FieldNames

Runtime surface (RFC-018 retained): one field-value map per check
```

**Cut recorded on [#70](https://github.com/rexescario-dev/resource-forge/issues/70):** Approach **B** (intra-instance only) + packaging Approach **1** (closed multi-field kinds in the existing `constraints` sequence).

## 1. Scope

### 1.1 Goals

1. Distinguish **member-local** Constraints (single `field`) from **cross-member** Constraints (multi-field `fields`) within one Resource instance.
2. Extend closed `ConstraintKind` to `"range" | "pattern" | "enum" | "distinct" | "equal"`.
3. Define closed declaration shapes for `distinct` and `equal` with `fields: FieldName[]`.
4. Require `fields.length >= 2`, unique `FieldName`s within `fields`, successful resolve against the Resource’s `fields` sequence, and homogeneous `FieldType` across targets.
5. Explicitly amend RFC-017’s “every Constraint has `field`” invariant: member-local kinds keep `field`; cross-member kinds use `fields` and MUST NOT declare `field`.
6. Define declaration-time validation causes for multi-field shape / resolve / homogeneity failures.
7. Extend RFC-018 evaluation so `distinct` / `equal` run in `constraints` order with fail-fast against the same field-value map.
8. Define multi-field gate procedure (per targeted Field; skip-all / fail-fast) and kind contracts (pairwise distinctness; all-equal).
9. Preserve projection non-participation and Field / Relation / Operation declaration floors.
10. Explicitly defer population uniqueness and all set/store/query/persistence surfaces (§1.2).

### 1.2 Non-goals

This RFC does not define:

1. **Population uniqueness** — “no two instances share this key,” sets of field-value maps, registries of instances, or host-supplied key sets
2. Persistence / database UNIQUE indexes, query planners, ORM mapping, or store-specific uniqueness engines
3. A second runtime check surface distinct from RFC-018’s field-value map
4. A generic `cross` / operator / `spec` / payload bag
5. Additional cross-member operators beyond `distinct` and `equal` (ordering, co-presence, implication, etc.)
6. Relation-targeted constraints or Field-local constraint attachment slots
7. Changes to RFC-016 packaging (`constraints` sequence, `ConstraintName`, namespaces, projection non-participation)
8. Changes to member-local `range` / `pattern` / `enum` declaration shapes or their RFC-018 evaluation contracts
9. Reopening inclusive `range`, ECMAScript `pattern`, or `enum` membership rules from RFC-018
10. Wire / serialization of Constraints or enforcement results
11. Concrete TypeScript API names, modules, or error-code enums (conceptual separation only; informative names may appear)
12. A full Resource instance / aggregate value model beyond the field-value map
13. Runtime enforcement of Relations, Operations, or Annotations

## 2. Terminology

| Term | Meaning |
| --- | --- |
| Member-local Constraint | A Constraint that targets exactly one Field via `field` (`range` / `pattern` / `enum`) |
| Cross-member Constraint | A Constraint that targets two or more Fields of the **same** Resource via `fields` (`distinct` / `equal`) |
| Intra-instance | Evaluation scoped to one Resource instance’s field-value map; not across a population |
| `fields` (constraint property) | Ordered sequence of `FieldName` on a cross-member Constraint — distinct from `ResourceSchema.fields` |
| Homogeneous targets | Every resolved Field named by a cross-member Constraint’s `fields` has the same `FieldType` |
| Population uniqueness | Uniqueness across multiple instances or a store — **out of scope** here |

RFC-016 / RFC-017 / RFC-018 terms (`ConstraintName`, `constraints`, `ConstraintKind`, field-value map, skip/fail gates, fail-fast) keep their existing meanings except where this RFC amends `ConstraintKind` and targeting shape.

## 3. Relationship to RFC-017 and RFC-018

| Concern | Authority after this RFC is Accepted (+ implementation floor) |
| --- | --- |
| `constraints` packaging / names / order / projection | RFC-016 (unchanged) |
| Member-local kinds + `field` shapes + declaration rules | RFC-017 (unchanged) |
| “Every Constraint has `field`” | **Amended** — true only for member-local kinds |
| Closed `ConstraintKind` vocabulary | **Extended** by this RFC (`distinct`, `equal`) |
| Field-value map; ignore unknown keys; order; fail-fast | RFC-018 (unchanged) |
| Member-local runtime kind evaluation | RFC-018 (unchanged) |
| Cross-member declaration + runtime evaluation | **This RFC** |
| Population uniqueness | Deferred (not this RFC) |

**Invariant:** Cross-member Constraints are still ordinary members of `constraints`. They MUST NOT require a parallel collection or a second enforcement API.

**Invariant:** RFC-018’s single field-value map remains the only runtime value surface used here. This RFC MUST NOT introduce set-of-maps evaluation.

## 4. Closed ConstraintKind vocabulary (amended)

```text
ConstraintKind ::= "range" | "pattern" | "enum" | "distinct" | "equal"
```

| Rule | Statement |
| --- | --- |
| Closed | Only the five literals above are valid `kind` values |
| Exclusive | Any other `kind` is invalid |
| Exact equality | Case-sensitive exact string equality; MUST NOT trim, case-fold, normalize, or alias |
| No escape hatch | Unknown kinds are not accepted |
| No registry | Vocabulary is defined by Accepted RFCs; no external registration pathway |
| No operator bag | `distinct` / `equal` are explicit kinds — not parameters of a generic cross-member kind |

**Breaking change (prominent):** Once Accepted and implemented, schemas using only the RFC-017 three-kind floor remain valid. Schemas that relied on inventing open strings for uniqueness/cross-member remain invalid (they already were under RFC-017). New valid schemas MAY use `distinct` / `equal`. Implementations that hard-code the three-kind union MUST widen to five kinds.

## 5. Kind-discriminated Constraint members

### 5.1 Targeting rule (amends RFC-017 §5.1)

| Kind class | Targeting property | Forbidden |
| --- | --- | --- |
| Member-local: `range`, `pattern`, `enum` | Required `field: FieldName` | Declaring `fields` |
| Cross-member: `distinct`, `equal` | Required `fields: FieldName[]` | Declaring `field` |

Common properties for every Constraint:

| Property | Rule |
| --- | --- |
| `name` | Valid `ConstraintName`; unique within `constraints` (RFC-016) |
| `kind` | Exact `ConstraintKind` literal for that arm |

Multiple Constraints MAY target overlapping Fields. Uniqueness remains by `ConstraintName` only.

### 5.2 Member-local kinds (retained)

RFC-017 §5.2–§5.4 remain authoritative for `range` / `pattern` / `enum` declaration shapes and declaration-time rules. This RFC does not amend those arms except by coexistence in the widened `ConstraintKind` union.

### 5.3 `distinct`

```text
DistinctConstraint {
  name: ConstraintName
  kind: "distinct"
  fields: ordered sequence of FieldName   # length >= 2
}
```

Declaration rules:

1. `fields` MUST be present and MUST be a sequence.
2. `fields.length` MUST be `>= 2`.
3. Every element MUST be a valid `FieldName` string.
4. Names within `fields` MUST be unique (exact string equality); duplicates are invalid.
5. Every name MUST resolve to an existing Field in the same Resource’s `fields` sequence.
6. All resolved target Fields MUST share the same `FieldType` (homogeneous targets).
7. `field` MUST NOT be present.
8. No additional properties.

**Runtime intent (normative in §7):** among the gathered non-null scalar values for `fields` (in declaration order), every pair MUST be unequal under §7.3 equality.

### 5.4 `equal`

```text
EqualConstraint {
  name: ConstraintName
  kind: "equal"
  fields: ordered sequence of FieldName   # length >= 2
}
```

Declaration rules: identical to §5.3 items 1–8.

**Runtime intent (normative in §7):** among the gathered non-null scalar values for `fields`, every value MUST be equal under §7.3 equality.

### 5.5 Informative TypeScript shape

```ts
type ConstraintKind = "range" | "pattern" | "enum" | "distinct" | "equal";

type Constraint =
  | { name: ConstraintName; kind: "range"; field: FieldName; min?: number; max?: number }
  | { name: ConstraintName; kind: "pattern"; field: FieldName; pattern: string }
  | { name: ConstraintName; kind: "enum"; field: FieldName; values: ReadonlyArray<string | number | boolean> }
  | { name: ConstraintName; kind: "distinct"; fields: readonly FieldName[] }
  | { name: ConstraintName; kind: "equal"; fields: readonly FieldName[] };
```

## 6. Declaration-time validation

Cross-member validity is part of Resource validity via the schema (same ownership as RFC-016 / RFC-017).

A Resource’s `constraints` sequence is valid only if all RFC-016 / RFC-017 rules still hold for packaging and member-local arms, **and**:

1. Every `kind` is one of the five `ConstraintKind` literals.
2. Every `distinct` / `equal` member satisfies §5.3 / §5.4.
3. No Constraint declares both `field` and `fields`.
4. No member-local kind declares `fields`; no cross-member kind declares `field`.

Invalid `constraints` → invalid Resource. **Validate-before-snapshot.** No silent repair (no dedupe of `fields`, no inventing missing names, no coercing types).

### 6.1 Additional / specialized conceptual causes

| Cause | When |
| --- | --- |
| Unknown constraint kind | `kind` not in the five-literal vocabulary |
| Missing constraint field | Member-local kind omits `field` (RFC-017 retained) |
| Missing constraint fields | Cross-member kind omits `fields` |
| Invalid constraint fields | `fields` present but not a sequence, empty, length 1, or contains non-`FieldName` elements |
| Duplicate constraint field target | Duplicate `FieldName` within one Constraint’s `fields` |
| Unresolved constraint field | A name in `fields` (or member-local `field`) does not resolve |
| Heterogeneous constraint field types | Resolved targets do not share one `FieldType` |
| Invalid constraint targeting shape | `field` used on cross-member kind, or `fields` used on member-local kind, or both present |

Concrete codes / TypeScript unions remain deferred to implementation planning; **separation** of these causes is normative.

## 7. Runtime evaluation (extends RFC-018)

### 7.1 Retained RFC-018 floor

The following remain authoritative and unreopened:

1. Field-value map surface; absent ≠ `null`; ignore unknown keys.
2. Declaration-valid Resource precondition.
3. Evaluation in `constraints` sequence order; fail-fast; empty `constraints` succeeds.
4. Member-local per-Constraint gates and `range` / `pattern` / `enum` kind contracts.
5. Distinct conceptual enforcement causes for member-local failures.

### 7.2 Multi-field gate procedure

For Constraint `C` with `kind` ∈ {`distinct`, `equal`} and `fields: [F1, …, Fn]`:

Walk target Fields in **`fields` declaration order**. For each `Fi`:

1. Apply RFC-018 §5.1–§5.2 presence / null / type gates to `Fi` and the map entry for `Fi.name`.
2. If the gate result is **fail** → **fail** the check with that gate’s cause; stop. Diagnostics MUST identify the failing Field (`Fi.name`) in addition to Constraint identity (same diagnostic spirit as RFC-018’s mandatory `field` on enforcement failures).
3. If the gate result is **skip** → **skip** entire Constraint `C` (no kind evaluation; not a failure). Later Fields are not inspected for this Constraint.
4. If the gate result is **continue** → the map entry for `Fi.name` is a present, non-null scalar of `Fi`’s declared `FieldType`; collect that scalar **without coercion** and proceed to the next `Fi`.

If every `Fi` continues → proceed to kind evaluation (§7.3 / §7.4) with the ordered collected values `v1…vn`.

**Gate-order invariant:** Target Fields are gated strictly in the declared `fields` order. A `skip` terminates gate processing for the Constraint immediately; therefore later targeted Fields are neither gated nor diagnosed for that Constraint. This ordering is normative and is not merely an implementation optimization. Consequently, with `fields: ["optionalA", "requiredB"]`, an absent `optionalA` causes the Constraint to skip without inspecting `requiredB` — intentional under all-or-nothing skip, not an underspecified race between skip and missing-required failure.

**Invariant (cross-member all-or-nothing skip):** A cross-member Constraint kind-evaluates only when **every** targeted Field yields a present non-null type-matching scalar. Any targeted optional-absent or nullable-null causes the Constraint to skip (subject to the gate-order invariant: the first such Field in `fields` order triggers skip). This preserves RFC-018’s rule that kind evaluation applies only to non-null scalars, without inventing null-participating comparison modes.

**Invariant (per-Constraint gates):** Runtime enforcement still does **not** establish a separate field-validity pass. Gates run as evaluation walks Constraints.

### 7.3 Equality relation (shared)

For scalars gathered after gates, equality is the same relation RFC-018 uses for `enum` membership:

| `FieldType` | Equal iff |
| --- | --- |
| `string` | Case-sensitive exact string equality |
| `number` | ECMAScript strict equality (`===`); therefore `-0` and `0` are equal. Non-finite numbers never reach kind evaluation (type gate). |
| `boolean` | Exact boolean equality |

Implementations MUST NOT use `Object.is` (or other SameValue relations) for numeric comparison under this RFC.

### 7.4 `distinct`

Applies when `C.kind === "distinct"` and §7.2 collected `v1…vn` (`n >= 2`).

Passes iff for every pair of indices `i < j`, `vi` is **not** equal to `vj` under §7.3.

Failure cause: **Distinct constraint violated**.

### 7.5 `equal`

Applies when `C.kind === "equal"` and §7.2 collected `v1…vn` (`n >= 2`).

Passes iff for every index `i` from `2…n`, `vi` is equal to `v1` under §7.3.

Failure cause: **Equal constraint violated**.

### 7.6 Ordering integration

When evaluation reaches a cross-member Constraint, apply §7.2 then §7.4 / §7.5 exactly as RFC-018 §7 integrates member-local kinds: skip continues; fail stops; success continues. No regrouping by Field. No collect-all mode.

## 8. Constraint value equality (amends RFC-017 §6)

Two Constraint **values** are equal iff:

1. Their `name` strings are exactly equal, and
2. Their `kind` strings are exactly equal, and
3. Targeting properties are equal:
   - Member-local: `field` strings exactly equal (RFC-017)
   - Cross-member: `fields` sequences have the same length and exact `FieldName` equality at every index (**order-sensitive**)
4. Kind-specific properties are equal for member-local kinds as in RFC-017 §6; `distinct` / `equal` have no additional properties beyond `fields`.

Collection uniqueness remains **by name only**.

## 9. Worked examples (informative)

### 9.1 `equal` — confirmation pair

Fields: `password` (string, required, non-null), `passwordConfirm` (string, required, non-null).

```text
{ name: "passwordsMatch", kind: "equal", fields: ["password", "passwordConfirm"] }
```

| Map | Result |
| --- | --- |
| `{ password: "x", passwordConfirm: "x" }` | pass |
| `{ password: "x", passwordConfirm: "y" }` | fail — Equal constraint violated |
| `{ password: "x" }` (confirm absent) | fail — Missing required field value (`passwordConfirm`) |

### 9.2 `distinct` — two emails must differ

Fields: `primaryEmail`, `billingEmail` (both string, required, non-null).

```text
{ name: "emailsDiffer", kind: "distinct", fields: ["primaryEmail", "billingEmail"] }
```

| Map | Result |
| --- | --- |
| `{ primaryEmail: "a@x", billingEmail: "b@x" }` | pass |
| `{ primaryEmail: "a@x", billingEmail: "a@x" }` | fail — Distinct constraint violated |

### 9.3 Optional skip (all-or-nothing)

Fields: `nickname` optional string; `handle` required string; Constraint `equal` on `["nickname", "handle"]`.

| Map | Result |
| --- | --- |
| nickname absent, handle `"a"` | **skip** Constraint (optional target absent) |
| nickname `"a"`, handle `"a"` | pass |
| nickname `"a"`, handle `"b"` | fail — Equal constraint violated |

### 9.4 Not in scope — population uniqueness

“No two User resources may share the same `email`” requires a population surface. This RFC does **not** express that rule. A later RFC may introduce it deliberately.

## 10. Rationale

- **Intra-instance only (cut B)** — extends RFC-018’s map rather than inventing stores/queries in `core`.
- **Approach 1 packaging** — one sequence, closed kinds, no parallel collection, no operator/`spec` bag.
- **Both `distinct` and `equal`** — each has concrete semantics and examples; neither is a filler kind.
- **Homogeneous FieldType** — keeps `===` comparison coherent at declaration time; mixed-type “always unequal” tricks are rejected rather than silently accepted.
- **All-or-nothing skip** — avoids null/absent participating in equality without defining a second null-comparison mode; aligned with RFC-018 kind-eval-on-non-null-scalars.
- **Order-sensitive `fields` equality** — matches RFC-017’s order-sensitive `enum.values` declaration equality posture.
- **Population uniqueness deferred** — different runtime abstraction; must not be smuggled into this slice.

## 11. Document acceptance criteria (M2 → M3 Design Review)

This RFC may move from Draft to Accepted when Design Review finds:

1. Intra-instance cut is unambiguous; population uniqueness remains deferred.
2. Packaging Approach 1 is unambiguous: single `constraints` sequence; no parallel collection; no operator bag.
3. `ConstraintKind` five-literal vocabulary and targeting amendment (`field` vs `fields`) are unambiguous.
4. `distinct` / `equal` declaration rules (`length >= 2`, unique names, resolve, homogeneous types) are unambiguous.
5. Multi-field gate procedure (fail-fast on gate fail; skip terminates gate processing in `fields` order; continue collects without coercion) is unambiguous and does not invent a field-validity pass.
6. Runtime kind contracts and equality relation align with RFC-018 `enum` equality without reopening member-local kinds.
7. Fail-fast / sequence-order integration with RFC-018 is unambiguous.
8. Projection / RFC-016 packaging / member-local RFC-017 shapes remain unreopened.
9. Deferred concerns in §1.2 remain deferred.
10. Worked examples match the normative rules.

## 12. Explicit deferrals

Deferred concerns are listed in §1.2. This ledger records that population uniqueness, persistence/query/index engines, Relation targeting, additional cross-member operators, wire formats, and a full instance model remain out of scope unless a future RFC says otherwise.

## 13. Compatibility / impact

| Concern | Impact |
| --- | --- |
| RFC-016 packaging | **Unchanged** |
| RFC-017 member-local shapes | **Unchanged** |
| RFC-017 “every Constraint has `field`” | **Amended** as in §5.1 |
| RFC-018 map / fail-fast / member-local evaluation | **Unchanged**; extended for two kinds |
| Existing declaration-valid Resources using only `range`/`pattern`/`enum` | Remain valid |
| Projection | Still no Constraint contribution |

## 14. Open questions for Design Review (M3)

None blocking Draft. Reviewers may still challenge:

1. Whether all-or-nothing skip is preferable to “skip only the absent optional Field and compare the remainder” (rejected here to keep `n >= 2` kind semantics stable and null-free).
2. Whether homogeneous `FieldType` should be relaxed (rejected here for coherence).

## 15. Suggested implementation slice (non-normative)

After Accept → M4 plan → M5 Accept:

- Widen `ConstraintKind` / `Constraint` union; declaration validation for `fields`
- Extend `checkConstraintValues` for `distinct` / `equal` gates + kind rules
- Keep declaration `checkConstraints` / `validateResource` free of population semantics
- Roadmap / docs discoverability for RFC-019
