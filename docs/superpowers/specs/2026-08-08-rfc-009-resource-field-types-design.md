# RFC-009: Resource Field Types

**Date:** 2026-08-08  
**Status:** Accepted  
**M3:** Accepted (2026-08-08) — Design Review; no design blockers; required typed Field floor confirmed; closed `FieldType` vocabulary; partial supersession of RFC-007 §3.2; breaking vs M3.4 name-only Fields; no dual-shape period  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#21](https://github.com/rexescario-dev/resource-forge/issues/21)  
**Depends on:** RFC-005 (Resource Model), RFC-006 (Annotations — projection boundary), RFC-007 (Resource Fields — collection semantics; Field shape partially superseded), RFC-008 (Resource Relations — unchanged)  
**Followed by:** Nullability / optionality; constraints; defaults; enums; composites; named/opaque type references; additional scalar members (`integer`, `datetime`, `uuid`, …); field→metadata projection; value validation / coercion RFCs  
**Unblocks:** M3.6 Field Types implementation planning (M4→M5), then implementation (M6), after this RFC is Accepted — not implementation by itself  
**Amends / supersedes:** RFC-007 §3.2 Field member shape (and related closed-member / Field equality text). See §3.

## Primary question

> What type is this Field—without deciding nullability, value validity, defaults, enums/composites, or projection?

## Thesis

RFC-009 amends the Field member contract so every Field is a **closed** `{ name: FieldName; type: FieldType }` with **exactly those two members** and required `FieldType ∈ { string, number, boolean }` by exact membership. `type` is declared type identity only—not runtime validation or coercion. RFC-009 introduces a **breaking contract change** relative to M3.4 / RFC-007: name-only Fields are no longer valid once this floor is Accepted and implemented. No dual-shape compatibility period.

```text
Field
├── name: FieldName     ← RFC-007
└── type: FieldType     ← this RFC
              ├── string
              ├── number
              └── boolean
```

**RFC-007 owns the Fields collection; RFC-009 owns what a Field is.**

## 1. Scope

### 1.1 Goals

1. Introduce named contract-level `FieldType` for the closed scalar vocabulary `string` | `number` | `boolean`.
2. Redefine Field as exactly `{ name: FieldName; type: FieldType }` (no additional members).
3. Require `type` on every Field; exact vocabulary membership; case-sensitive; no trim, alias, coerce, or normalize.
4. Redefine Field value equality as exact `name` **and** exact `type` equality.
5. Place type/shape validity in Resource validity via schema with distinct conceptual causes; validate-before-snapshot retained; no silent repair.
6. Explicitly supersede RFC-007 §3.2 Field shape and document the M3.4 compatibility break.
7. Leave RFC-007 authoritative for `FieldName`, ordered `fields` sequence, uniqueness-by-name, snapshot/ownership, and field projection non-participation.
8. Explicitly defer nullability, constraints, defaults, enums, composites, named refs, additional scalars, value validation, and field→metadata projection.

### 1.2 Non-goals

This RFC does not define:

1. Nullability / optionality
2. Constraints, defaults, descriptions, or per-field annotations
3. Enums, composites / object schemas, arrays, or named/opaque type references
4. Additional scalars (`integer`, `datetime`, `uuid`, …)
5. `null` as a Field type
6. Field **value** validation, coercion, serialization, or runtime typing
7. Field → `ResourceMetadata` projection or any change to RFC-006 / RFC-007 / RFC-008 projection rules
8. Changes to Relations or Operations member contracts
9. Dual-shape transitional validity (`{ name }` still accepted)
10. Concrete TypeScript APIs, modules, package layout, or error code enums (conceptual separation only)
11. Resource-wide equality, builders, mutation APIs, serialization, adapters, or reverse projection

## 2. Terminology

| Term | Meaning |
| --- | --- |
| `FieldType` | Closed scalar type identity: exactly one of `"string"`, `"number"`, `"boolean"`; exact string equality; not a `MetadataKey`, not a field value |
| Field | Closed schema member `{ name: FieldName; type: FieldType }` (this RFC) |
| Declared type identity | What `Field.type` asserts; does **not** imply runtime validation or coercion of values |

RFC-007 terms (`FieldName`, `fields` ordered sequence, uniqueness within `fields`) keep their existing meanings except where this RFC supersedes Field shape and Field equality.

## 3. Supersession / amendment of RFC-007

Once this RFC is **Accepted** and the corresponding implementation floor is adopted:

| Concern | Authority |
| --- | --- |
| Field member shape | **RFC-009** (supersedes RFC-007 §3.2) |
| Required `type` / `FieldType` vocabulary | **RFC-009** |
| Field value equality | **RFC-009** |
| Field member validity (shape + type) | **RFC-009** (with RFC-007 name rules) |
| `FieldName` grammar / equality | RFC-007 |
| Ordered `fields` sequence; empty valid | RFC-007 |
| Uniqueness of `FieldName` within `fields` | RFC-007 (by name only — not by `(name, type)`) |
| Snapshot / ownership of `fields` | RFC-007 |
| Field projection non-participation | RFC-007 (unchanged by this RFC) |

RFC-007’s name-only `{ name }` Field contract is **no longer normative** after this supersession. Implementers MUST NOT combine the old name-only shape with the new required-type contract as simultaneously valid.

This RFC does **not** rewrite RFC-007 wholesale.

## 4. FieldType

```text
FieldType ::= "string" | "number" | "boolean"
```

- **Identity:** exact string membership in the set above.
- **Case-sensitive:** `"String"` is not `"string"`.
- **No trimming:** `" string "` is invalid.
- **No aliases:** `"str"` is not `"string"`.
- **No coercion or normalization.**
- **`null` is not a `FieldType`.**
- The vocabulary is **closed for this RFC**; adding new `FieldType` members requires a future explicit RFC.

`FieldType` is a contract-level named type. This RFC does not prescribe TypeScript module layout, exports, or runtime representation.

Informative alignment: the three members match RFC-002’s JSON scalar kinds excluding `null`. That alignment is consistency only; `FieldType` is not `JsonValue` and does not import metadata value semantics.

## 5. Field member model

```text
Field {
  name: FieldName
  type: FieldType
}
```

- A Field MUST contain **exactly** the members `name` and `type`. No additional members are permitted.
- `name` MUST be a valid `FieldName` (RFC-007).
- `type` MUST be a valid `FieldType` (this RFC).
- Missing `type` is invalid.
- Members with additional properties are invalid (not ignored or stripped).
- Later RFCs may extend or amend the Field model explicitly; such extensions do not become valid under this RFC merely because future evolution is anticipated. Unknown properties MUST NOT silently become part of Field semantics.

### 5.1 Field value equality

Two Field **values** are equal if and only if:

1. their `name`s are exactly equal; and
2. their `type`s are exactly equal.

Changing only `type` makes two Fields unequal.

### 5.2 Interaction with the `fields` sequence (RFC-007)

| Rule | Statement |
| --- | --- |
| Order | Declaration order preserved; sequence equality remains order-sensitive (RFC-007), using RFC-009 Field value equality at each index |
| Uniqueness | At most one Field per `FieldName` (RFC-007) |
| Consequence | Two Fields with the same name and different types cannot coexist in one collection, even though they are unequal as standalone Field values |
| Empty | Zero members still valid (RFC-007) |

## 6. Validation

`fields` validity remains part of Resource validity via the schema. Under this RFC, every member must satisfy the Field contract in §5 in addition to RFC-007 sequence rules.

**Validate-before-snapshot:** Invalid candidates MUST be rejected before they can become Resource snapshot state. Implementations MUST NOT transform an invalid candidate into a valid Field by discarding information (including stripping unknown properties or inventing a default `type`) before validation.

### 6.1 Conceptual failure causes

Concrete codes and TypeScript shapes are deferred; separation is normative:

| Cause | When |
| --- | --- |
| Invalid field member | Non-object, missing required member, extra member, or malformed member structure not attributable to a `FieldName` or `FieldType` violation |
| Invalid field name | `name` fails `FieldName` grammar (RFC-007) |
| Duplicate field name | repeated `FieldName` in the sequence (RFC-007) |
| Invalid field type | `type` is present but is not an exact `FieldType` vocabulary member |

- These remain Resource/schema validation failures, distinct from metadata and annotation failures.
- No silent dropping, normalization, or coercion.
- A separate public `validateFields` / `validateFieldType` API is **not** required by this RFC.
- This validates **declared type identity only**. It does **not** validate field values.

**Invariant:** A Resource is valid only if its complete schema, including every Field’s `name` and `type`, is valid under RFC-007 + this RFC.

## 7. Projection and adjacent contracts

1. **Fields / projection** — RFC-007 field projection rules remain unchanged. This RFC introduces no field→metadata contribution.
2. **Validation gate** — `projectResourceMetadata` continues to re-run Resource validation; typed Fields that fail §6 still fail projection.
3. **Annotations (RFC-006)** — unchanged.
4. **Relations (RFC-008)** — unchanged; independent namespaces unchanged.
5. **Operations** — remain empty-only until their RFC; unchanged by this RFC.

## 8. Compatibility / impact

| Concern | Impact |
| --- | --- |
| M3.4 name-only Fields | **Breaking.** After Accept + implementation of this floor, `{ name }` without `type` is invalid |
| Dual-shape period | **None.** No transitional acceptance of name-only Fields |
| Existing empty `fields` | Remains valid |
| RFC-007 collection rules | Unchanged (order, uniqueness-by-name, snapshot) |
| Projection | Unchanged non-participation |
| Relations / operations / annotations | Unchanged |

Implementations that currently treat Fields as name-only MUST widen the member contract only after this RFC is Accepted and an Accepted implementation plan exists.

## 9. Design rationale

- **Required type attachment only** answers “what type is this Field?” without inventing a validation system.
- **Closed string vocabulary** is the smallest stable representation before tagged forms or named refs are needed.
- **JSON scalars without `null`** align informatively with RFC-002 while keeping nullability deferred.
- **Partial supersession of RFC-007 §3.2** avoids duplicating collection semantics and makes the breaking widen unmistakable.
- **Named `FieldType`** gives a stable term for vocabulary, equality, and future amendments without prescribing module layout.
- **Exact membership + dedicated Invalid field type** preserves reject-don’t-repair discipline and keeps shape errors separable from vocabulary errors.
- **Equality includes `type`** so a type change is observable; uniqueness stays name-scoped so RFC-007’s collection model is not silently rewritten.

## 10. Relationship to other RFCs and milestones

| RFC / milestone | Relationship |
| --- | --- |
| RFC-002 Metadata Model | Informative scalar alignment only; `FieldType` ≠ `JsonValue` |
| RFC-005 Resource Model | Relied upon; schema member slot unchanged |
| RFC-006 Annotations | Relied upon for projection boundary; unchanged |
| RFC-007 Resource Fields | **Partially superseded** (§3.2 Field shape / Field equality); collection semantics retained |
| RFC-008 Resource Relations | Unchanged |
| Later — nullability / constraints / defaults | Define additional Field semantics by explicit RFC |
| Later — enums / composites / named refs / more scalars | Define additional type forms or Field semantics by explicit RFC |
| Later — Field projection | Schema→metadata contribution |
| M3.6 Field Types implementation | Only after this RFC is Accepted and an Accepted implementation plan exists |

### Suggested sequence (non-normative)

```text
RFC-007  Resource Fields (collection + former name-only Field)
        │
RFC-008  Resource Relations
        │
RFC-009  Resource Field Types     ← this RFC (Accepted; amends Field shape)
        │
Later    Nullability / constraints / enums / composites / projection
```

## 11. Document acceptance criteria (M2 → M3 Design Review)

This RFC may move from Draft to Accepted when Design Review finds:

1. `FieldType` vocabulary and exact-membership rules are unambiguous and closed for this RFC.
2. Field shape is unambiguously exactly `{ name, type }` with no additional members; missing `type` and extras are invalid.
3. Supersession of RFC-007 §3.2 (and related Field equality / closed-member text) is explicit; collection ownership remains with RFC-007.
4. Field value equality (name **and** type) and uniqueness-by-name coexistence rules are unambiguous.
5. Conceptual failure causes distinguish Invalid field member vs Invalid field type vs name/duplicate causes; no silent repair; no required public validate API.
6. Breaking compatibility vs M3.4 / name-only Fields is explicit; no dual-shape period.
7. Projection, relations, operations, annotations, nullability, constraints, defaults, enums, composites, named refs, value validation, and vocabulary extension remain explicitly deferred or unchanged as stated.
8. No normative TypeScript API prescription beyond conceptual `FieldType` / Field contracts.

## 12. Explicit deferrals

- Nullability / optionality
- Constraints, defaults, descriptions, per-field annotations
- Enums, arrays, composites / object schemas
- Named / opaque type references
- Additional `FieldType` members (`integer`, `datetime`, `uuid`, …)
- `null` as a Field type
- Field value validation, coercion, serialization
- Field → metadata projection; cross-source collision / merge
- Concrete TypeScript representation and public APIs
- Dual-shape migration helpers or adapters

## 13. Decision record

| Decision | Choice | Why |
| --- | --- | --- |
| Scope | Required type attachment only | One question: what type is this Field? |
| Representation | Closed string vocabulary | Smallest stable attachment |
| Scalar set | `string` \| `number` \| `boolean` | JSON scalars without `null` |
| `null` | Not a Field type | Nullability deferred |
| Field shape | Exactly `{ name, type }` | Closed member; breaking widen |
| Compatibility | Breaking; no dual-shape | Honest migration |
| RFC-007 relationship | Partial supersession of §3.2 | Collection vs member ownership |
| Named type | `FieldType` | Stable vocabulary term |
| Type validation | Exact membership only | No silent repair |
| Invalid type | Dedicated conceptual cause | Separable from shape errors |
| Missing `type` | Invalid field member | Required member absent |
| Value validation | Deferred | Type identity ≠ value system |
| Projection | Unchanged | Out of scope |

## 14. Implementation gate (non-normative)

Coding that requires typed Fields or rejects name-only Fields under this contract begins only after:

1. this RFC is Accepted;
2. an Accepted implementation plan for the relevant M3 slice exists.

Prefer **one pull request per tracking issue** for that delivery slice (Accepted plan + implementation together). Do not merge a plan-only PR before code for the same slice except as recovery.

No production nullability, constraints, enums, composites, value validation, field→metadata projection, or vocabulary extension SHALL be introduced under this RFC alone.
