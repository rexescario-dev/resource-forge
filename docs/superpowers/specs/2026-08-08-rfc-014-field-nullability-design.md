# RFC-014: Field Nullability

**Date:** 2026-08-08  
**Status:** Accepted  
**M3:** Accepted (2026-08-08) — Design Review; no design blockers; required `nullable: boolean` on Field only; closed `{ name, type, optional, nullable }`; exact boolean / no default / no dual-shape; value-nullability declaration constraints only; orthogonal to RFC-013 `optional`; Relation nullability deferred by name; `"null"` not a FieldType; runtime/wire/persistence deferred; partial supersession of RFC-013 Field floor only  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#46](https://github.com/rexescario-dev/resource-forge/issues/46)  
**Depends on:** RFC-005 (Resource Model), RFC-006 (Annotations — projection boundary), RFC-007 (Resource Fields — collection semantics retained), RFC-009 (Resource Field Types — `FieldType` retained unchanged), RFC-013 (Field/Relation Optionality — `optional` retained; Field shape partially superseded)  
**Followed by:** Relation nullability (deferred by name); runtime presence / value enforcement; empty-collection vs absent; wire / serialization of absence vs null; persistence / DB null / ORM mapping; bounds / constraints / defaults; direction / joins / cascade / loading; Operation optionality / kind / signature / execution; annotation vocabulary; field→metadata projection  
**Unblocks:** M3.x Field Nullability implementation planning (M4→M5), then implementation (M6), after this RFC is Accepted — not implementation by itself  
**Amends / supersedes:** RFC-013 Field member shape (and related Field equality / closed-member text) only. See §3. Does **not** reopen RFC-009 `FieldType` vocabulary, RFC-013 `optional` semantics, or the Relation member floor.

## Primary question

> May a Field’s declared value be null—without deciding declaration presence, runtime enforcement, wire representation, or persistence?

## Thesis

RFC-014 amends the Field member contract so every Field is a **closed** declaration that includes a required `nullable: boolean` (exact `true` / `false` only; omit invalid; no dual-shape; no defaults). Semantics are **value nullability only**:

- `nullable: true` → declared value **may be null**
- `nullable: false` → declared value **must be non-null**

“Must be non-null” / “may be null” are **schema-declaration constraints**, not assertions that runtime values are checked by this RFC.

This RFC does **not** define runtime enforcement, wire / serialization representation of absence vs null, or persistence / DB null mapping. `nullable` is **fully orthogonal** to RFC-013 `optional` (declaration presence): all four `optional` × `nullable` combinations are valid schema declarations. `nullable` MUST NOT affect or reinterpret `optional`. `"null"` is **not** introduced as a `FieldType`.

```text
Field                                      Relation (unchanged)
├── name: FieldName                        ├── name: RelationName
├── type: FieldType                        ├── target: ResourceIdentity
├── optional: boolean                      ├── multiplicity: RelationMultiplicity
└── nullable: boolean                      └── optional: boolean
```

**RFC-007 owns the `fields` collection; RFC-009 owns `type`; RFC-013 owns `optional` (and Relation optionality); this RFC owns `nullable` and the widened Field closed floor.** Relations remain `{ name, target, multiplicity, optional }`. Relation nullability is deferred **by name**.

The widened Field floor is normative only **after this RFC is Accepted and the corresponding implementation floor is adopted**. Until that implementation floor is adopted, the live M3.10 Field shape (`{ name, type, optional }`) remains authoritative.

## 1. Scope

### 1.1 Goals

1. Add required `nullable: boolean` to every Field.
2. Redefine the closed Field shape as exactly `{ name: FieldName; type: FieldType; optional: boolean; nullable: boolean }` **after Accept + implementation of this floor**.
3. Require exact boolean membership for `nullable`: only `true` / `false`; no coerce, normalize, string/number/`null` stand-ins, or omit-as-default.
4. Lock value-nullability semantics as declaration constraints only: `nullable: true` → declared value may be null; `nullable: false` → declared value must be non-null.
5. Keep `nullable` fully orthogonal to RFC-013 `optional` (all four combinations valid); neither implies the other.
6. Redefine Field value equality to include `nullable` (name + type + optional + nullable). Collection uniqueness remains **by name only** (RFC-007).
7. Place nullability/shape validity in Resource validity via schema (`checkFields`); validate-before-snapshot; no silent repair; **Missing `nullable`** and **present-but-invalid `nullable`** are distinct conceptual validation causes; neither is repaired or defaulted.
8. Introduce a **breaking contract change once Accepted and implemented** relative to the M3.10 Field declaration shape; no dual-shape compatibility period.
9. Leave Relations unchanged; defer Relation nullability **by name**; leave RFC-009 `FieldType`, RFC-013 `optional` semantics, RFC-012 Operations, and Field/Relation projection non-participation unchanged; supersede only the RFC-013 Field member floor and related Field equality / closed-member text as specified in §3.

### 1.2 Non-goals

This RFC does not define:

1. **Relation nullability** — Relations remain `{ name, target, multiplicity, optional }`; deferred **by name** to a later RFC (omission here is not a decision that Relations are non-nullable)
2. Runtime presence or value enforcement against instances or payloads
3. Wire / serialization representation of absence vs null
4. Persistence / database nullability or ORM mapping
5. Empty-collection vs absent-relation representation (related to, but distinct from, Relation nullability; kept separately deferred)
6. Bounds, constraints, defaults, descriptions, or per-member annotations
7. `"null"` as a `FieldType`, type unions, enums, composites, or additional scalars
8. Reopening RFC-009 `FieldType` vocabulary or RFC-013 `optional` (declaration presence) semantics
9. Changes to the Relation member floor (adding `nullable` to a Relation violates the current closed Relation shape)
10. Operation optionality, kind, signature, input/output, or execution (RFC-012 unchanged)
11. Annotation vocabulary expansion
12. Field → `ResourceMetadata` projection or any change to RFC-006 / RFC-007 / RFC-008 projection participation rules
13. Dual-shape transitional validity (omit-`nullable` still accepted)
14. Concrete TypeScript APIs, modules, package layout, or error code enums (conceptual separation only; extra members may be diagnosed as Invalid field member **or equivalent structural cause**)
15. Resource-wide equality, builders, mutation APIs, serialization, adapters, or reverse projection

## 2. Terminology

| Term | Meaning |
| --- | --- |
| `nullable` | Required boolean Field value-nullability flag |
| Declared value may be null | What `nullable: true` asserts as a **declaration constraint**; does **not** imply runtime checking, wire form, or persistence mapping |
| Declared value must be non-null | What `nullable: false` asserts as a **declaration constraint**; does **not** imply that runtime values are currently checked |
| Declared value nullability | What `nullable` asserts; orthogonal to declaration presence (`optional`), `FieldType`, and Relation concerns |
| `optional` | RFC-013 required boolean declaration-presence flag; unchanged by this RFC |

RFC-007 / RFC-009 / RFC-013 terms (`FieldName`, `FieldType`, `fields`, `optional`) keep their existing meanings except where this RFC supersedes Field shape and Field equality.

## 3. Supersession / amendment

Once this RFC is **Accepted** and the corresponding implementation floor is adopted:

### 3.1 Field (partial supersession of RFC-013 Field floor)

| Concern | Authority |
| --- | --- |
| Field member shape | **RFC-014** (supersedes RFC-013 closed `{ name, type, optional }`) |
| Required `nullable` / boolean exactness | **RFC-014** |
| Field value equality | **RFC-014** |
| Field member validity (shape + nullable) | **RFC-014** (composed with RFC-007 name rules, RFC-009 type rules, and RFC-013 `optional` rules) |
| `optional` presence semantics | RFC-013 (unchanged) |
| `FieldType` vocabulary / `type` semantics | RFC-009 (unchanged) |
| `FieldName` grammar / equality | RFC-007 |
| Ordered `fields` sequence; empty valid; uniqueness-by-name | RFC-007 |
| Field projection non-participation | RFC-007 (unchanged) |

RFC-013’s three-member `{ name, type, optional }` Field contract is **no longer normative** after this supersession. Implementers MUST NOT combine the old three-member shape with the new required-`nullable` contract as simultaneously valid.

### 3.2 Relation (unchanged)

| Concern | Authority |
| --- | --- |
| Relation member shape | RFC-013 (unchanged): `{ name, target, multiplicity, optional }` |
| Relation nullability | **Deferred by name** — not decided by this RFC |

Adding `nullable` (or any other extra member) to a Relation remains invalid under the closed Relation shape. This RFC does **not** rewrite RFC-008, RFC-010, RFC-011, RFC-012, or RFC-013 Relation / `optional` text wholesale.

## 4. `nullable` boolean

```text
nullable ::= true | false
```

| Value | Meaning (this RFC only) |
| --- | --- |
| `true` | Declared value **may be null** |
| `false` | Declared value **must be non-null** |

- **Identity:** exact boolean membership in the set above.
- **No coercion:** `"true"`, `"false"`, `1`, `0`, `null`, or other stand-ins are invalid.
- **No normalization or defaults:** omitting `nullable` is invalid; implementations MUST NOT invent `false` or `true`.
- **Not presence:** `nullable` does not mean the Field declaration may be absent (`optional` owns that).
- **Not a FieldType:** `"null"` is not added to RFC-009’s vocabulary; nullability is a separate dimension.

### 4.1 Orthogonality to `optional`

| `optional` | `nullable` | Meaning (declaration only) |
| --- | --- | --- |
| `false` | `false` | Must be present; value must be non-null |
| `false` | `true` | Must be present; value may be null |
| `true` | `false` | May be absent; if present, value must be non-null |
| `true` | `true` | May be absent; if present, value may be null |

All four combinations are valid. `optional` MUST NOT imply `nullable`; `nullable` MUST NOT imply `optional`.

### 4.2 Explicit non-meanings

`nullable` MUST NOT be interpreted as any of the following under this RFC:

| Non-meaning | Why deferred |
| --- | --- |
| Declaration may / must be absent | RFC-013 `optional` |
| Runtime value validation | Runtime enforcement RFC |
| Wire / serialization form of null vs absence | Representation RFC |
| Persistence / DB NULL | Persistence mapping RFC |
| Relation association nullability | Relation nullability RFC (by name) |
| Empty collection vs absent relation | Separate deferral (distinct from Relation nullability) |
| `"null"` FieldType / type unions | Type-system RFCs; RFC-009 unchanged |
| Bounds / defaults / constraints | Constraint RFCs |
| Live presence validation | Runtime enforcement RFC |

**Boundary:** declaration of value nullability ≠ runtime / external constraint enforcement.

## 5. Field member model

**Illustrative TypeScript shape (non-prescriptive)** — not an API requirement. The normative member model below applies **after Accept + implementation of this floor**:

```ts
interface Field {
  name: FieldName;
  type: FieldType;
  optional: boolean;
  nullable: boolean;
}
```

Normative member model (same timing):

```text
Field {
  name: FieldName
  type: FieldType
  optional: boolean
  nullable: boolean
}
```

- A Field MUST contain **exactly** the members `name`, `type`, `optional`, and `nullable`. No additional members are permitted.
- `name` MUST be a valid `FieldName` (RFC-007).
- `type` MUST be a valid `FieldType` (RFC-009).
- `optional` MUST be an exact boolean `true` or `false` (RFC-013).
- `nullable` MUST be an exact boolean `true` or `false` (this RFC).
- Missing `nullable` is invalid (**Missing field nullable**).
- Present-but-invalid `nullable` is invalid (**Invalid field nullable**).
- Members with additional properties (including premature defaults, constraints, Relation-only keys, etc.) are invalid (not ignored or stripped) — **Invalid field member** or equivalent structural cause.
- Later RFCs may extend or amend the Field model explicitly; unknown properties MUST NOT silently become part of Field semantics.

### 5.1 Field value equality

Two Field **values** are equal if and only if:

1. their `name`s are exactly equal; and
2. their `type`s are exactly equal; and
3. their `optional` values are exactly equal; and
4. their `nullable` values are exactly equal.

Changing only `nullable` makes two Fields unequal. Equality and uniqueness remain distinct: unequal Field values with the same `FieldName` still cannot coexist in one `fields` sequence (RFC-007 uniqueness-by-name).

## 6. Relation member model

Unchanged by this RFC. Normative closed shape remains RFC-013:

```text
Relation {
  name: RelationName
  target: ResourceIdentity
  multiplicity: RelationMultiplicity
  optional: boolean
}
```

- A Relation MUST contain **exactly** those four members. No additional members are permitted.
- Adding `nullable` to a Relation is invalid under the closed Relation shape (extra member), not an accepted Relation-nullability semantics.
- **Relation nullability** is deferred **by name** to a later RFC.

## 7. Validation

`fields` validity remains part of Resource validity via the schema. Under this RFC (after Accept + implementation), every Field member must satisfy §5 in addition to retained upstream rules (RFC-007 / RFC-009 / RFC-013).

**Validate-before-snapshot:** Invalid candidates MUST be rejected before they can become Resource snapshot state. Implementations MUST NOT transform an invalid candidate into a valid Field by discarding information (including stripping unknown properties or inventing a default `nullable`) before validation.

Validity stays Resource-owned via schema (`checkFields`); validate-before-snapshot; no silent repair; omission and invalid `nullable` are distinct conceptual validation causes.

### 7.1 Conceptual failure causes (Field)

Concrete codes and TypeScript shapes are deferred; separation is normative:

| Cause | When |
| --- | --- |
| Invalid field member | Field does not satisfy the closed structural member model, and the failure is not attributable to a name / type / optional / nullable-specific cause (including extra members — or equivalent structural cause) |
| Invalid field name | `name` fails `FieldName` grammar (RFC-007) |
| Duplicate field name | repeated `FieldName` in the sequence (RFC-007) |
| Missing field type / Invalid field type | per RFC-009 |
| Missing field optional / Invalid field optional | per RFC-013 |
| Missing field nullable | `nullable` is absent |
| Invalid field nullable | `nullable` is present but is not exact boolean `true` / `false` |

```text
missing nullable              → Missing field nullable
nullable exists but wrong type → Invalid field nullable
other structural failure      → Invalid field member (or equivalent structural cause)
```

**Missing `nullable`** and **present-but-invalid `nullable`** are distinct conceptual validation causes; neither is repaired or defaulted.

- These remain Resource/schema validation failures, distinct from metadata, annotation, relation, and operation validation failures.
- No silent dropping, normalization, coercion, or defaulting of `nullable`.
- A separate public `validateFields` / `validateNullable` API is **not** required by this RFC.
- This validates **declared value nullability only**. It does **not** validate live values against nullability.

**Invariant:** A Resource is valid only if its complete schema, including every Field’s `nullable`, is valid under the composed RFC-007 / RFC-009 / RFC-013 / this RFC rules (and Relations / Operations per their Accepted floors).

### 7.2 Relation validation

No new Relation validation causes. Relation closed-shape rules remain RFC-013. Extra members such as `nullable` on a Relation remain invalid relation member (or equivalent structural cause) under the existing floor.

## 8. Projection and adjacent contracts

1. **Fields / Relations / projection** — RFC-007 / RFC-008 projection non-participation remains unchanged. This RFC introduces no Field→metadata contribution.
2. **Validation gate** — `projectResourceMetadata` continues to re-run Resource validation; Fields that fail §7 still fail projection.
3. **Annotations (RFC-006)** — unchanged.
4. **Operations (RFC-012)** — unchanged; name-only `{ name }` floor retained.
5. **`optional` (RFC-013)** — presence semantics unchanged and orthogonal.
6. **`FieldType` (RFC-009)** — vocabulary unchanged; `"null"` not introduced.
7. **Relations (RFC-013 floor)** — unchanged; Relation nullability deferred by name.

## 9. Worked examples (informative)

```text
# Valid Fields (optional × nullable — all four combinations)
{ name: email,    type: string,  optional: false, nullable: false }  # present; non-null
{ name: nickname, type: string,  optional: true,  nullable: false }  # may be absent; if present, non-null
{ name: bio,      type: string,  optional: false, nullable: true }   # present; may be null
{ name: middle,   type: string,  optional: true,  nullable: true }   # may be absent; if present, may be null

# Valid Relation (unchanged — no nullable)
{ name: customer, target: (crm, Customer), multiplicity: "one", optional: false }

# Invalid Fields
{ name: email, type: string, optional: false }                      # Missing field nullable
{ name: email, type: string, optional: false, nullable: "true" }    # Invalid field nullable
{ name: email, type: string, optional: false, nullable: 1 }         # Invalid field nullable
{ name: email, type: string, optional: false, nullable: null }      # Invalid field nullable
{ name: email, type: string, optional: false, nullable: false, default: "" }  # Invalid field member (extra)

# Invalid Relation (extra member — not Relation nullability semantics)
{ name: customer, target: (crm, Customer), multiplicity: "one", optional: false, nullable: true }
```

## 10. Compatibility / impact

| Concern | Impact |
| --- | --- |
| M3.10 `{ name, type, optional }` Fields | **Breaking** after Accept + implementation of this floor: missing `nullable` is invalid |
| Dual-shape period | **None.** No transitional acceptance of omit-`nullable` Fields |
| Existing empty `fields` / `relations` | Remain valid |
| Relations | **Unchanged** |
| RFC-007 collection rules | Unchanged (order, uniqueness-by-name, snapshot, independent namespaces) |
| RFC-009 `FieldType` | Unchanged |
| RFC-013 `optional` semantics | Unchanged; orthogonal |
| RFC-012 Operations | Unchanged |
| Projection | Unchanged non-participation |
| Live contract while this RFC is Draft | **Unchanged** — M3.10 Field floor remains authoritative until Accept + implementation |

Implementations that currently treat Fields as `{ name, type, optional }` MUST widen the Field member contract only after this RFC is Accepted and an Accepted **M3.x Field Nullability** implementation plan exists.

## 11. Design rationale

- **Value nullability after declaration presence** keeps RFC-013’s `optional` honest and avoids smuggling null into presence or `FieldType`.
- **Fields-only packaging with Relation nullability deferred by name** prevents absent-vs-null-vs-empty from being decided by omission.
- **Required boolean member** matches RFC-009 / RFC-011 / RFC-013 evolution: explicit closed shapes, no silent defaults, validate-before-snapshot stays honest.
- **Full orthogonality to `optional`** preserves independent declaration dimensions without representation assumptions.
- **Equality includes `nullable`** so a nullability-flag change is observable; uniqueness stays name-scoped so collection models are not rewritten.
- **Missing vs invalid `nullable`** separates structural absence from type violation without prescribing error enums.
- **Partial supersession of the RFC-013 Field floor only** makes the breaking widen unmistakable while retaining `optional`, `FieldType`, and Relation ownership.
- **Empty-collection vs absent kept separately deferred** from Relation nullability so those design questions are not accidentally coupled.

### Suggested progression (non-normative)

```text
RFC-013             optional: boolean on Field and Relation
        │
RFC-014             nullable: boolean on Field only   ← this RFC (Draft)
        │
Later               Relation nullability (by name)
Later               runtime presence / value enforcement
Later               wire / serialization of absence vs null
Later               empty-collection vs absent
Later               persistence / DB null
Later               bounds / constraints / defaults
Later               Operation kind / signature / execution / optionality
Later               Annotation vocabulary / richer projection
```

## 12. Relationship to other RFCs and milestones

| RFC / milestone | Relationship |
| --- | --- |
| RFC-005 Resource Model | Relied upon; schema member slots unchanged |
| RFC-006 Annotations | Relied upon for projection boundary; unchanged |
| RFC-007 Resource Fields | Collection semantics retained; Field shape widened by this RFC |
| RFC-008 Resource Relations | Unchanged |
| RFC-009 Resource Field Types | Relied upon; `FieldType` retained unchanged; `"null"` not introduced |
| RFC-010 / RFC-011 Relations | Unchanged |
| RFC-012 Resource Operations | Unchanged |
| RFC-013 Field/Relation Optionality | **Partially superseded** (Field shape / Field equality); `optional` semantics retained and orthogonal; Relation floor retained |
| Later — Relation nullability | Explicit follow-on RFC (deferred by name) |
| Later — runtime / wire / persistence / empty vs absent | Explicit follow-on RFCs (empty vs absent kept separate from Relation nullability) |
| Later — bounds / direction / join / cascade / load | Explicit constraint / association RFCs |
| Later — Operation optionality / kind / signature / execution | Explicit Operations RFCs |
| Later — Annotation vocabulary / field→metadata projection | Orthogonal |
| M3.10 Field/Relation Optionality | Shipped; live floor until this RFC is Accepted and implemented |
| M3.x Field Nullability | Only after this RFC is Accepted and the corresponding implementation plan is Accepted |

## 13. Document acceptance criteria (M2 → M3 Design Review)

This RFC may move from Draft to Accepted when Design Review finds:

1. Closed Field shape is unambiguously exactly `{ name, type, optional, nullable }` with required `nullable: boolean`, **after Accept + implementation of this floor** (Draft does not change the live M3.10 contract).
2. `nullable: true` means declared value may be null; `nullable: false` means declared value must be non-null — **declaration constraints only**; omit invalid; exact boolean only; no defaults; no dual-shape.
3. `nullable` is fully orthogonal to RFC-013 `optional` (all four combinations valid); neither implies the other.
4. Relations remain `{ name, target, multiplicity, optional }`; Relation nullability is explicitly deferred by name; `nullable` on a Relation violates the closed Relation shape.
5. RFC-009 `FieldType` is unchanged; `"null"` is not introduced as a type; runtime enforcement, wire/serialization of absence/null, persistence/DB null, empty-collection vs absent, bounds/defaults, Operations changes, and projection contribution remain deferred (§1.2).
6. Supersession is limited to the **RFC-013 Field member floor** (and related Field equality / closed-member text); `optional` semantics, Relation floor, and `FieldType` are not reopened.
7. Validation ownership is clear: Resource via schema (`checkFields`); Missing vs Invalid `nullable` distinct; validate-before-snapshot; no silent coercion/defaulting; no required public `validateNullable` API; no live value checking.
8. Field equality includes `nullable`; collection uniqueness remains name-only (RFC-007); projection non-participation unchanged.
9. No normative TypeScript API or error-code enum prescription beyond conceptual cause separation (extra members may use “or equivalent structural cause”).

## 14. Explicit deferrals

Deferred concerns are listed in §1.2. This ledger does not add scope; it restates **already-deferred** concerns from §1.2 (including Relation nullability by name, runtime enforcement, wire / serialization of absence vs null, empty-collection vs absent, persistence mapping, builders, host adapters, reverse projection, and Operation optionality) that remain out of scope for RFC-014 unless a future RFC explicitly defines them.

## 15. Decision record

| Decision | Choice | Why |
| --- | --- | --- |
| Surface | Fields only | Value nullability maps cleanly to typed Fields |
| Relation nullability | Deferred by name | Avoid absent-vs-null-vs-empty by omission |
| Encoding | Required boolean dimension | Mirror RFC-013; keep orthogonal to `FieldType` |
| `"null"` FieldType | Rejected | Preserve RFC-009 type model |
| `optional` × `nullable` | Fully orthogonal | Presence ≠ value nullability |
| Equality | Includes `nullable` | Nullability flag is part of declaration identity |
| Uniqueness | Still name-only | Do not rewrite RFC-007 collections |
| Projection | Unchanged non-participation | No metadata contribution from schema members |
| Runtime / wire / persistence | Out of scope | Separate layers / RFCs |
| Empty vs absent | Separately deferred | Related to but distinct from Relation nullability |
| Validate-before-snapshot | Required | Preserve closed-member discipline |
| Dual-shape | None | Single closed Field shape after Accept + implementation |

## 16. Implementation gate (non-normative)

Coding that implements required `nullable` on Fields or RFC-014 nullability validation rules begins only after:

1. this RFC is Accepted;
2. an Accepted implementation plan for the relevant M3 slice exists.

Prefer **one pull request per tracking issue** for that delivery slice (Accepted plan + implementation together). Do not merge a plan-only PR before code for the same slice except as recovery.

This RFC alone does not authorize implementation.
