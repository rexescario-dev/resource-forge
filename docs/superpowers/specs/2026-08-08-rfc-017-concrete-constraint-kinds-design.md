# RFC-017: Concrete Constraint Kinds

**Date:** 2026-08-08  
**Status:** Accepted  
**M3:** Accepted (2026-08-08) — Design Review; no design blockers; closed exclusive `ConstraintKind = "range" | "pattern" | "enum"`; kind-discriminated closed members (no `spec`); schema-level `constraints` + required `field: FieldName`; resolve + type-match at declaration time; finite numeric bounds; practical kind rules; order-sensitive `enum.values` equality intentional; multiple constraints per Field; runtime enforcement / uniqueness / cross-member / Relation targeting deferred; prominent breaking specialization of RFC-016 open-`kind` floor; packaging / projection / Field–Relation–Operation floors retained  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#61](https://github.com/rexescario-dev/resource-forge/issues/61)  
**Depends on:** RFC-001 (Resource Identity — via Resource), RFC-005 (Resource Model — schema aggregate), RFC-006 (Annotations — projection boundary), RFC-007 (Resource Fields — `FieldName` / ordered `fields`; targeting surface), RFC-009 (Resource Field Types — `FieldType` ∈ {string, number, boolean}), RFC-013 / RFC-014 (Field optionality / nullability floors — relied upon unchanged), RFC-016 (Constraints framework — specialized here)  
**Followed by:** Runtime constraint enforcement against Resource instances / values; inclusive/exclusive evaluation semantics for `range`; pattern dialect / compilation / matching semantics; uniqueness constraints; cross-member / cross-field constraints; Relation-targeted constraints; Field-local constraint slots; wire / serialization; persistence / ORM mapping; Operation kind / signature / execution; annotation vocabulary; richer projection; direction / joins; empty-vs-absent / null elements  
**Unblocks:** M3.x Concrete Constraint Kinds implementation planning (M4→M5), then implementation (M6), after this RFC is Accepted — not implementation by itself  
**Amends / specializes:** RFC-016 Constraint member / `kind` openness / Constraint value equality / validation causes. Does **not** reopen RFC-016 packaging (`ResourceSchema.constraints` ordered sequence, `ConstraintName`, independent namespaces, projection non-participation, validate-before-snapshot). Does **not** amend Field / Relation / Operation member floors (RFC-007–RFC-015).

## Primary question

> What closed vocabulary of concrete constraint kinds and kind-discriminated declaration shapes exist, and how are they validated at schema declaration time—without runtime enforcement against Resource instances or values?

## Thesis

RFC-017 **specializes** the RFC-016 Constraint framework floor:

- `kind` is no longer an open non-empty string.
- `ConstraintKind` is the **closed exclusive** vocabulary `"range" | "pattern" | "enum"`.
- Every Constraint is a **kind-discriminated closed member** with required `field: FieldName` and kind-specific properties.
- There is **no** shared `spec` / payload bag and **no** separate constraint registry.
- Declaration-time validation MUST resolve `field` against the Resource’s `fields` sequence and enforce kind↔`FieldType` compatibility.
- **Runtime enforcement** of constraint semantics against instances or values is **explicitly out of scope**.

```text
ResourceSchema.constraints  (RFC-016 packaging retained)
└── Constraint  (RFC-017 specializes member shape)
    ├── { name, kind: "range",   field, min?, max? }     # ≥1 of min/max
    ├── { name, kind: "pattern", field, pattern }
    └── { name, kind: "enum",    field, values }
```

**RFC-016 owns the constraints collection packaging and ConstraintName rules; this RFC owns the closed `ConstraintKind` vocabulary, kind-discriminated member shapes, Field targeting, and declaration-time coherence validation.**

The specialized Constraint floor is normative only **after this RFC is Accepted and the corresponding implementation floor is adopted**. Until that implementation floor is adopted, the live M3.13 RFC-016 floor (`Constraint = { name, kind: string }`, open non-empty `kind`) remains authoritative.

**Breaking change (prominent):** Once Accepted and implemented, schemas that relied on open `kind` strings, bare `{ name, kind }` members, unknown kinds, or Constraints without `field` / kind-specific properties become **invalid**. There is no dual-shape or unknown-kind escape hatch.

## 1. Scope

### 1.1 Goals

1. Define closed exclusive `ConstraintKind = "range" | "pattern" | "enum"`.
2. Specialize Constraint into a **kind-discriminated closed union**; unknown `kind` values are invalid; bare `{ name, kind }` is invalid for every kind.
3. Require `field: FieldName` on every concrete Constraint; retain schema-level `ResourceSchema.constraints` as the authoritative sequence; do **not** add a Field-local `constraints` slot.
4. Define kind-specific closed declaration properties and declaration-time rules for `range`, `pattern`, and `enum` (§5).
5. Require declaration-time **resolve + type-match**: `field` MUST name an existing Field; `range` → `number`; `pattern` → `string`; `enum` → homogeneous values compatible with the target `FieldType`.
6. Redefine Constraint value equality to include `kind`, `field`, and kind-specific properties (§6). Collection uniqueness remains **by name only** (RFC-016).
7. Place specialized validation inside Resource validity via schema; validate-before-snapshot; no silent repair; distinct conceptual failure causes; no public `validateConstraints` pathway required.
8. Preserve RFC-016 projection non-participation: Constraints still contribute no metadata.
9. Introduce a **breaking contract change once Accepted and implemented** relative to the M3.13 open-`kind` floor; no dual-shape; no unknown-kind fallback.
10. Explicitly defer runtime enforcement, inclusive/exclusive evaluation, pattern dialect/matching, uniqueness, cross-member rules, Relation targeting, wire/persistence, and registries (§1.2).

### 1.2 Non-goals

This RFC does not define:

1. Runtime presence / value / constraint enforcement against Resource instances or payloads
2. Inclusive vs exclusive evaluation semantics for `range` bounds (declaration stores numbers only; evaluation later)
3. Pattern dialect, flags, compilation, normalization, or matching semantics (`pattern` is an opaque declared string)
4. Uniqueness constraints
5. Cross-member / cross-field / Resource-wide constraint rules
6. Relation-targeted constraints or Field-local constraint attachment slots
7. Shared `spec` / `body` bags or opaque parameter objects
8. A separate constraint kind registry / plugin mechanism
9. Wire / serialization representation of constraints or evaluation results
10. Persistence / database constraints / ORM mapping
11. Changes to Field / Relation / Operation member floors (RFC-007–RFC-015 remain as Accepted)
12. Constraint → `ResourceMetadata` contribution (still none)
13. Dual-shape transitional validity (open `kind` still accepted alongside closed kinds)
14. Concrete TypeScript APIs, modules, package layout, or error code enums (conceptual separation only)
15. Resource-wide equality, builders, mutation APIs, host adapters, or reverse projection

## 2. Terminology

| Term | Meaning |
| --- | --- |
| `ConstraintKind` | Closed exclusive string vocabulary `"range" \| "pattern" \| "enum"` |
| Concrete Constraint | A kind-discriminated closed Constraint member under this RFC |
| `field` | Required `FieldName` naming the Field this Constraint targets within the same Resource’s `fields` sequence |
| Declaration-time validation | Schema coherence checks (shape, resolve, type-match, kind-specific rules) performed as part of Resource validity — **not** runtime instance evaluation |
| Opaque pattern string | The `pattern` property value: a non-empty string stored and compared exactly at declaration time, without dialect or matching semantics in this RFC |
| Homogeneous enum values | Every element of `values` has the same scalar value kind compatible with the target `FieldType` |

RFC-007 / RFC-009 / RFC-016 terms (`FieldName`, `FieldType`, `fields`, `ConstraintName`, `constraints`, Constraint framework floor) keep their existing meanings except where this RFC specializes Constraint member shape, `kind` openness, equality, and validation.

## 3. Amendment to RFC-016

Once this RFC is **Accepted** and the corresponding implementation floor is adopted:

| Concern | Authority |
| --- | --- |
| `ResourceSchema.constraints` packaging (required ordered sequence; empty valid; omit/non-sequence invalid; snapshot immutability; independent namespaces; projection non-participation) | RFC-016 (unchanged) |
| `ConstraintName` grammar / uniqueness-by-name | RFC-016 (unchanged) |
| Open non-empty `kind: string` | **Superseded** by this RFC’s closed `ConstraintKind` |
| Closed `{ name, kind }` only | **Superseded** by kind-discriminated closed members |
| Constraint value equality (`name` + `kind` only) | **Superseded** by §6 |
| Field / Relation / Operation floors | Unchanged (their Accepted RFCs) |

Until Accept + implementation of this floor, RFC-016 as implemented by M3.13 remains authoritative for Constraint members.

RFC-016’s statement that accepting a `kind` string does not imply evaluation semantics remains true: this RFC adds **declaration** semantics and shape validation only, not runtime enforcement.

## 4. Closed ConstraintKind vocabulary

```text
ConstraintKind ::= "range" | "pattern" | "enum"
```

| Rule | Statement |
| --- | --- |
| Closed | Only the three literals above are valid `kind` values |
| Exclusive | Any other `kind` (including previously valid open strings) is invalid |
| Exact equality | Case-sensitive exact string equality; MUST NOT trim, case-fold, normalize, or alias |
| No escape hatch | Unknown kinds are not accepted as bare `{ name, kind }` |
| No registry | Vocabulary is defined by this RFC; no external registration pathway |

## 5. Kind-discriminated Constraint members

Every Constraint MUST be exactly one of the following closed shapes. Additional semantic properties are invalid. Omitted required properties are invalid.

### 5.1 Common properties

| Property | Rule |
| --- | --- |
| `name` | Valid `ConstraintName`; unique within `constraints` (RFC-016) |
| `kind` | Exact `ConstraintKind` literal for that arm |
| `field` | Required; MUST be a valid `FieldName` string **and** MUST resolve to an existing Field in the same Resource’s `fields` sequence |

Multiple Constraints MAY target the same Field, including multiple Constraints of the same `kind`. Uniqueness remains by `ConstraintName` only.

### 5.2 `range`

```text
RangeConstraint {
  name: ConstraintName
  kind: "range"
  field: FieldName          # MUST resolve to Field with type: number
  min?: number              # present ⇒ number (not NaN / Infinity — see below)
  max?: number
}
```

Declaration rules:

1. Target Field MUST exist and MUST have `type: number`.
2. At least one of `min` / `max` MUST be present.
3. When present, `min` and `max` MUST be finite numbers (IEEE finite; `NaN` / `±Infinity` invalid).
4. When both are present, `min <= max` MUST hold.
5. No additional properties.
6. Inclusive vs exclusive bound **evaluation** is deferred with runtime enforcement; this RFC only validates the declared numeric bounds.

### 5.3 `pattern`

```text
PatternConstraint {
  name: ConstraintName
  kind: "pattern"
  field: FieldName          # MUST resolve to Field with type: string
  pattern: string           # required, non-empty, opaque
}
```

Declaration rules:

1. Target Field MUST exist and MUST have `type: string`.
2. `pattern` MUST be present and MUST be a non-empty string (`""` invalid).
3. `pattern` is an **opaque declared string**: exact string equality for Constraint value equality; no dialect, flags, compilation, normalization, or matching semantics in this RFC.
4. No additional properties.

### 5.4 `enum`

```text
EnumConstraint {
  name: ConstraintName
  kind: "enum"
  field: FieldName          # MUST resolve to an existing Field
  values: ordered sequence  # required, non-empty
}
```

Declaration rules:

1. Target Field MUST exist.
2. `values` MUST be present, MUST be a sequence, and MUST be non-empty.
3. Every value MUST be compatible with the target Field’s `FieldType`:
   - `string` Field → every value is a string
   - `number` Field → every value is a finite number
   - `boolean` Field → every value is a boolean
4. Values MUST be **homogeneous** under that FieldType (all strings, or all finite numbers, or all booleans).
5. Duplicate values are invalid under **exact equality** at the declaration level (case-sensitive strings; numeric exact equality; boolean exact equality).
6. No additional properties.
7. Runtime membership checking of instance values against `values` is deferred.

Conceptual TypeScript shape (informative, not normative API):

```ts
type ConstraintKind = "range" | "pattern" | "enum";

type Constraint =
  | {
      name: ConstraintName;
      kind: "range";
      field: FieldName;
      min?: number;
      max?: number;
    }
  | {
      name: ConstraintName;
      kind: "pattern";
      field: FieldName;
      pattern: string;
    }
  | {
      name: ConstraintName;
      kind: "enum";
      field: FieldName;
      values: ReadonlyArray<string | number | boolean>;
    };
```

For a valid `enum` Constraint, `values` elements are further constrained to the single scalar kind matching the target Field’s `FieldType`.

## 6. Equality

Two Constraint **values** are equal iff:

1. Their `name` strings are exactly equal, and
2. Their `kind` strings are exactly equal, and
3. Their `field` strings are exactly equal, and
4. Kind-specific properties are equal:
   - `range`: both omit or both have exactly equal `min`; both omit or both have exactly equal `max`
   - `pattern`: `pattern` strings exactly equal
   - `enum`: `values` sequences have the same length and exact element equality at every index (order-sensitive)

`constraints` sequence equality remains order-sensitive per RFC-016, using this Constraint value equality.

Collection uniqueness remains **by name only**; equal or overlapping kind-specific declarations on different names are allowed.

## 7. Validation

Specialized Constraint validity is part of Resource validity via the schema (RFC-005 / RFC-016 validation ownership).

A Resource’s `constraints` sequence is valid only if all of the following hold:

1. RFC-016 packaging rules still hold: `constraints` present; sequence; unique `ConstraintName`s; empty valid.
2. Every member is exactly one closed concrete Constraint arm (§5).
3. Every `kind` is a `ConstraintKind` literal; unknown kinds are invalid.
4. Every `field` resolves to an existing Field in the same Resource’s `fields`.
5. Kind↔`FieldType` and kind-specific property rules in §5 hold.
6. No additional semantic properties appear on any member.

Invalid `constraints` → invalid Resource. **Validate-before-snapshot:** Invalid candidates MUST be rejected before they can become Resource snapshot state. Implementations MUST NOT repair by stripping properties, inventing defaults, coercing kinds/types, or dropping unresolved `field` references.

### 7.1 Error ownership

Conceptual failure causes (concrete codes and TypeScript shapes are deferred; separation is normative). RFC-016 causes that still apply are retained; this RFC adds / specializes:

| Cause | When |
| --- | --- |
| Missing constraints / Invalid constraints collection / Invalid constraint name / Duplicate constraint name | RFC-016 (unchanged) |
| Unknown constraint kind | `kind` not in `ConstraintKind` |
| Missing constraint kind | `kind` omitted |
| Invalid constraint kind | `kind` present but not a string / not a closed literal (implementation may collapse with Unknown) |
| Missing constraint field | `field` omitted |
| Invalid constraint field | `field` present but not a valid `FieldName` string |
| Unresolved constraint field | `field` does not name an existing Field in `fields` |
| Constraint field type mismatch | kind targets incompatible `FieldType` |
| Invalid range bounds | missing both `min`/`max`; non-finite; or `min > max` |
| Invalid pattern | missing / non-string / empty `pattern` |
| Invalid enum values | missing / non-sequence / empty; non-homogeneous; incompatible scalar; duplicates |
| Invalid constraint member | wrong closed shape for `kind` (including extra semantic properties, or `range`/`pattern`/`enum` missing required kind-specific members) |

- Failures remain Resource/schema validation failures, distinct from metadata / annotation / field / relation / operation failures.
- No silent dropping, normalization, defaulting, or coercion.
- A separate public `validateConstraints` API is **not** required by this RFC.

**Invariant:** Schema declaration coherence (including resolve + type-match) is mandatory; runtime instance evaluation is not implied.

## 8. Projection non-participation

RFC-016 projection rules remain in force:

1. Constraints do **not** contribute to `projectResourceMetadata`.
2. Invalid `constraints` still fail the projection validation gate.
3. No reverse projection from metadata to constraints.

## 9. Worked examples (conceptual)

```text
fields: [
  { name: total, type: number, optional: false, nullable: false },
  { name: code,  type: string, optional: false, nullable: false },
  { name: status, type: string, optional: false, nullable: false },
]

# Valid
constraints: [
  { name: totalBounds, kind: "range", field: total, min: 0, max: 100 },
  { name: totalMinOnly, kind: "range", field: total, min: 0 },
  { name: codePattern, kind: "pattern", field: code, pattern: "^[A-Z]+$" },
  { name: statusEnum, kind: "enum", field: status, values: ["open", "closed"] },
]

# Also valid: multiple constraints on the same Field
constraints: [
  { name: totalMin, kind: "range", field: total, min: 0 },
  { name: totalMax, kind: "range", field: total, max: 100 },
]

# Invalid — unknown kind (breaking vs M3.13 open kind)
{ name: x, kind: "placeholder" }

# Invalid — bare framework shape
{ name: x, kind: "range" }                    # missing field / bounds
{ name: x, kind: "pattern", field: code }     # missing pattern

# Invalid — unresolved / type mismatch
{ name: x, kind: "range", field: missing, min: 0 }
{ name: x, kind: "range", field: code, min: 0 }          # string Field
{ name: x, kind: "pattern", field: total, pattern: "x" } # number Field
{ name: x, kind: "enum", field: total, values: ["a"] }   # incompatible

# Invalid — kind-specific rules
{ name: x, kind: "range", field: total }                 # neither min nor max
{ name: x, kind: "range", field: total, min: 10, max: 1 }# min > max
{ name: x, kind: "pattern", field: code, pattern: "" }
{ name: x, kind: "enum", field: status, values: [] }
{ name: x, kind: "enum", field: status, values: ["a", "a"] }
{ name: x, kind: "enum", field: status, values: ["a", 1] }

# Invalid — extra properties / spec bag
{ name: x, kind: "range", field: total, min: 0, spec: {} }
```

## 10. Design rationale

- **Specialize, don’t reopen** — RFC-016 already locked packaging; this RFC only closes `kind` and adds declaration shapes.
- **Closed discriminated members** — avoids opaque `spec` bags that smuggle undeclared semantics; matches Field/Relation closed-member discipline.
- **Schema-level + `field`** — keeps a single authoritative sequence while targeting Fields without dual ownership.
- **Resolve + type-match at declaration time** — makes the schema internally coherent without implying instance evaluation.
- **Small practical vocabulary** — `range` / `pattern` / `enum` are enough to make the framework useful; uniqueness and cross-member rules pull in larger design questions.
- **Opaque `pattern`** — prevents smuggling regex-engine semantics into a declaration RFC.
- **Deferred inclusive/exclusive `range` evaluation** — bound storage is enough for declaration coherence; evaluation belongs with runtime enforcement.
- **Exclusive closed vocabulary** — prevents a permanent dual Framework+Concrete declaration mode.
- **Breaking change documented prominently** — open-kind M3.13 callers must migrate; dual-shape would hide the specialization.

## 11. Relationship to other RFCs and milestones

| RFC / milestone | Relationship |
| --- | --- |
| RFC-007 Resource Fields | Relied upon for `FieldName` / `fields`; Field floor unchanged; Constraints target Fields by name |
| RFC-009 Resource Field Types | Relied upon for type-match rules; `FieldType` vocabulary unchanged |
| RFC-013 / RFC-014 | Field optionality / nullability unchanged; orthogonal to constraint declarations |
| RFC-015 Relation Nullability | Unchanged; Relation-targeted constraints deferred |
| RFC-016 Constraints | **Specialized:** closed kinds + discriminated members + Field targeting + declaration coherence |
| Later — runtime enforcement | Evaluates declared constraints against instances / values |
| Later — uniqueness / cross-member | Extends vocabulary beyond this RFC’s three kinds |
| Later — Relation-targeted constraints | Orthogonal attachment |
| M3.x Concrete Constraint Kinds implementation | Only after this RFC is Accepted and an Accepted implementation plan exists |

### Suggested sequence (non-normative)

```text
RFC-016  Constraints framework                 (Accepted)
        │
RFC-017  Concrete constraint kinds (this RFC)  ← declaration shapes only
        │
Later    Runtime enforcement
Later    Uniqueness / cross-member; Relation-targeted constraints
Later    Operation kind / signature / execution; …
```

## 12. Document acceptance criteria (M2 → M3 Design Review)

This RFC may move from Draft to Accepted when Design Review finds:

1. Closed exclusive `ConstraintKind` and “unknown kind invalid” are unambiguous; no escape hatch.
2. Kind-discriminated closed shapes for `range` / `pattern` / `enum` are unambiguous; no shared `spec` bag.
3. Required `field: FieldName` on every Constraint is unambiguous; Field members gain no constraints slot; RFC-016 packaging is retained.
4. Resolve + type-match rules are unambiguous; runtime enforcement remains explicitly out of scope.
5. Kind-specific declaration rules (§5) are unambiguous, including opaque `pattern` and deferred inclusive/exclusive evaluation.
6. Constraint value equality (§6) and uniqueness-by-name are unambiguous.
7. Validation ownership remains Resource-via-schema; validate-before-snapshot; distinct conceptual causes; no required public `validateConstraints`.
8. Projection non-participation remains unchanged.
9. Compatibility impact is clear and prominent: breaking vs M3.13 open-`kind` floor; no dual-shape.
10. Deferred concerns in §1.2 remain deferred (runtime, uniqueness, cross-member, Relation targeting, wire/persistence, registries).

## 13. Explicit deferrals

Deferred concerns are listed in §1.2. This ledger does not add scope; it records that runtime evaluation engines, pattern matching engines, inclusive/exclusive bound evaluation, uniqueness / cross-member vocabularies, Relation attachment, wire/persistence, builders, host adapters, and reverse projection also remain out of scope unless a future RFC says otherwise.

## 14. Compatibility / impact

| Concern | Impact |
| --- | --- |
| M3.13 open-`kind` Constraints | **Breaking once implemented:** unknown kinds, bare `{ name, kind }`, and members lacking required kind-specific / `field` properties become invalid |
| Empty `constraints` | Still valid (RFC-016) |
| Dual-shape / unknown-kind fallback | **Not** provided |
| Field / Relation / Operation floors | Unchanged |
| Projection | Still no Constraint contribution; validation gate still applies |
| Public validate helpers | No `validateConstraints` required by this RFC |

## 15. Open questions for Design Review (M3)

None. M3 Design Review Accepted (2026-08-08). Scrutinized `enum.values` equality: order-sensitive sequence equality is **intentional** (`["open","closed"]` ≠ `["closed","open"]` as Constraint values); set-membership equivalence is not introduced. Finite-number rule retained. No Draft edits required beyond Accept status.
