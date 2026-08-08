# RFC-015: Relation Nullability

**Date:** 2026-08-08  
**Status:** Draft  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#51](https://github.com/rexescario-dev/resource-forge/issues/51)  
**Depends on:** RFC-005 (Resource Model), RFC-006 (Annotations — projection boundary), RFC-008 (Resource Relations — collection semantics retained), RFC-010 (Relation Association Semantics — `target` retained), RFC-011 (Relation Multiplicity — `multiplicity` retained and orthogonal), RFC-012 (Resource Operations — unchanged), RFC-013 (Field/Relation Optionality — `optional` retained; Relation shape partially superseded), RFC-014 (Field Nullability — Field floor retained unchanged)  
**Followed by:** Constraints; runtime presence / value enforcement of association-reference nullability; empty-collection vs absent; null elements in `many`; wire / serialization of association-reference null vs absence; persistence / DB null / ORM mapping; direction / joins / cascade / loading / traversal / execution; Operation optionality / kind / signature / execution; annotation vocabulary; field→metadata projection  
**Unblocks:** M3.x Relation Nullability implementation planning (M4→M5), then implementation (M6), after this RFC is Accepted — not implementation by itself  
**Amends / supersedes:** RFC-013 Relation member shape (and related Relation equality / closed-member text) only. See §3. Does **not** reopen RFC-013 `optional` semantics, RFC-011 multiplicity meanings, RFC-010 `target` semantics, or the RFC-014 Field floor.

## Primary question

> May a Relation’s association reference be null—without deciding declaration presence, multiplicity interpretation, collection elements, runtime enforcement, wire representation, persistence, or direction/joins?

## Thesis

RFC-015 amends the Relation member contract so every Relation is a **closed** declaration that includes a required `nullable: boolean` (exact `true` / `false` only; omit invalid; no dual-shape; no defaults). Semantics are **association-reference nullability only**:

- `nullable: true` → the association reference **may be null**
- `nullable: false` → the association reference **must be non-null**

“Must be non-null” / “may be null” are **schema-declaration constraints** about the association reference, not assertions that runtime associations, wire forms, or collection contents are checked by this RFC.

This RFC does **not** define null elements inside a `many` association, empty-collection ≡ null, runtime enforcement, wire / serialization representation of association-reference null vs absence, or persistence / DB null mapping. `nullable` is **fully orthogonal** to RFC-013 `optional` (declaration presence) and RFC-011 `multiplicity` (`"one"` \| `"many"`): all `optional` × `multiplicity` × `nullable` declaration combinations are valid schema declarations. `nullable` MUST NOT affect or reinterpret `optional` or `multiplicity`. Fields remain at the RFC-014 floor.

```text
Field (unchanged — RFC-014)               Relation
├── name: FieldName                        ├── name: RelationName
├── type: FieldType                        ├── target: ResourceIdentity
├── optional: boolean                      ├── multiplicity: RelationMultiplicity
└── nullable: boolean                      ├── optional: boolean
                                           └── nullable: boolean
```

**RFC-008 owns the `relations` collection; RFC-010 / RFC-001 own `target`; RFC-011 owns `multiplicity`; RFC-013 owns `optional` (and Field optionality); RFC-014 owns Field `nullable`; this RFC owns Relation `nullable` (association-reference nullability) and the widened Relation closed floor.**

The widened Relation floor is normative only **after this RFC is Accepted and the corresponding implementation floor is adopted**. Until that implementation floor is adopted, the live M3.11 Relation shape (`{ name, target, multiplicity, optional }`) remains authoritative.

## 1. Scope

### 1.1 Goals

1. Add required `nullable: boolean` to every Relation, meaning **association-reference nullability** only.
2. Redefine the closed Relation shape as exactly `{ name: RelationName; target: ResourceIdentity; multiplicity: RelationMultiplicity; optional: boolean; nullable: boolean }` **after Accept + implementation of this floor**.
3. Require exact boolean membership for `nullable`: only `true` / `false`; no coerce, normalize, string/number/`null` stand-ins, or omit-as-default.
4. Lock association-reference nullability semantics as declaration constraints only: `nullable: true` → association reference may be null; `nullable: false` → association reference must be non-null.
5. Keep `nullable` fully orthogonal to RFC-013 `optional` and RFC-011 `multiplicity` (all `optional` × `multiplicity` × `nullable` combinations valid); none implies another. Accept `many + nullable` as a valid declaration **without** defining its runtime/wire representation or null-element semantics.
6. Redefine Relation value equality to include `nullable` (name + target + multiplicity + optional + nullable). Collection uniqueness remains **by name only** (RFC-008).
7. Place nullability/shape validity in Resource validity via schema (`checkRelations`); validate-before-snapshot; no silent repair; **Missing `nullable`** and **present-but-invalid `nullable`** are distinct conceptual validation causes; neither is repaired or defaulted.
8. Introduce a **breaking contract change once Accepted and implemented** relative to the M3.11 Relation declaration shape; no dual-shape compatibility period.
9. Leave Fields unchanged at RFC-014; leave RFC-013 `optional` semantics, RFC-011 multiplicity meanings, RFC-010 `target`, RFC-012 Operations, and Field/Relation projection non-participation unchanged; supersede only the RFC-013 Relation member floor and related Relation equality / closed-member text as specified in §3.

### 1.2 Non-goals

This RFC does not define:

1. **Null elements** inside a `many` association (association-reference nullability ≠ element nullability)
2. Empty-collection ≡ null / empty-collection vs absent-relation representation (related to, but distinct from, association-reference nullability; kept separately deferred)
3. Runtime presence or value enforcement of association-reference nullability against instances or payloads
4. Wire / serialization representation of association-reference null vs absence
5. Persistence / database nullability or ORM mapping
6. Direction, inverse, joins / local-field handles, cascade, loading / fetch, traversal, or execution semantics
7. Bounds, constraints, defaults, descriptions, or per-member annotations
8. Reopening RFC-014 Field floor, RFC-013 `optional` semantics, RFC-011 multiplicity meanings, or RFC-010 association/`target` semantics
9. Changes to the Field member floor (Field `nullable` remains RFC-014 value-nullability)
10. Operation optionality, kind, signature, input/output, or execution (RFC-012 unchanged)
11. Annotation vocabulary expansion
12. Field / Relation → `ResourceMetadata` projection or any change to RFC-006 / RFC-007 / RFC-008 projection participation rules
13. Dual-shape transitional validity (omit-`nullable` still accepted)
14. Concrete TypeScript APIs, modules, package layout, or error code enums (conceptual separation only; extra members may be diagnosed as Invalid relation member **or equivalent structural cause**)
15. Resource-wide equality, builders, mutation APIs, serialization, adapters, or reverse projection

## 2. Terminology

| Term | Meaning |
| --- | --- |
| `nullable` (on Relation) | Required boolean **association-reference nullability** flag |
| Association-reference nullability | What Relation `nullable` asserts; whether the association reference may/must be null as a **declaration constraint** |
| Association reference may be null | What `nullable: true` asserts as a **declaration constraint**; does **not** imply runtime checking, wire form, persistence mapping, null elements, or empty≡null |
| Association reference must be non-null | What `nullable: false` asserts as a **declaration constraint**; does **not** imply that runtime associations are currently checked |
| `optional` | RFC-013 required boolean declaration-presence flag; unchanged by this RFC |
| `multiplicity` | RFC-011 `"one"` \| `"many"`; unchanged in meaning; orthogonal to association-reference nullability |

RFC-008 / RFC-010 / RFC-011 / RFC-013 / RFC-014 terms (`RelationName`, `target`, `RelationMultiplicity`, `relations`, `optional`, Field `nullable`) keep their existing meanings except where this RFC supersedes Relation shape and Relation equality.

**Normative naming:** This RFC uses **association-reference nullability** throughout so Relation `nullable` cannot later be interpreted as element nullability or as a wire-level `null` encoding.

## 3. Supersession / amendment

Once this RFC is **Accepted** and the corresponding implementation floor is adopted:

### 3.1 Relation (partial supersession of RFC-013 Relation floor)

| Concern | Authority |
| --- | --- |
| Relation member shape | **RFC-015** (supersedes RFC-013 closed `{ name, target, multiplicity, optional }`) |
| Required Relation `nullable` / boolean exactness | **RFC-015** |
| Association-reference nullability semantics | **RFC-015** |
| Relation value equality | **RFC-015** |
| Relation member validity (shape + nullable) | **RFC-015** (composed with RFC-008 name rules, RFC-010 / RFC-001 target rules, RFC-011 multiplicity rules, and RFC-013 `optional` rules) |
| `optional` presence semantics | RFC-013 (unchanged) |
| `multiplicity` meanings | RFC-011 (unchanged) |
| `target` / association semantics | RFC-010 / RFC-001 (unchanged) |
| `RelationName` grammar / equality | RFC-008 |
| Ordered `relations` sequence; empty valid; uniqueness-by-name | RFC-008 |
| Relation projection non-participation | RFC-008 (unchanged) |

RFC-013’s four-member `{ name, target, multiplicity, optional }` Relation contract is **no longer normative** after this supersession. Implementers MUST NOT combine the old four-member shape with the new required-`nullable` contract as simultaneously valid.

### 3.2 Field (unchanged — RFC-014)

| Concern | Authority |
| --- | --- |
| Field member shape | RFC-014 (unchanged): `{ name, type, optional, nullable }` |
| Field value nullability | RFC-014 (unchanged) |

Field `nullable` and Relation `nullable` are **independent** surfaces. This RFC does **not** reopen or amend RFC-014.

## 4. `nullable` boolean (association-reference nullability)

```text
nullable ::= true | false
```

| Value | Meaning (this RFC only) |
| --- | --- |
| `true` | Association reference **may be null** |
| `false` | Association reference **must be non-null** |

- **Identity:** exact boolean membership in the set above.
- **No coercion:** `"true"`, `"false"`, `1`, `0`, `null`, or other stand-ins are invalid.
- **No normalization or defaults:** omitting `nullable` is invalid; implementations MUST NOT invent `false` or `true`.
- **Not presence:** `nullable` does not mean the Relation declaration may be absent (`optional` owns that).
- **Not multiplicity:** `nullable` does not reinterpret `"one"` / `"many"`.
- **Not element nullability:** `nullable` does not declare whether elements inside a `many` association may be null.
- **Not empty≡null:** `nullable` does not equate a null association reference with an empty collection.

### 4.1 Orthogonality to `optional`

| `optional` | `nullable` | Meaning (declaration only) |
| --- | --- | --- |
| `false` | `false` | Must be present; association reference must be non-null |
| `false` | `true` | Must be present; association reference may be null |
| `true` | `false` | May be absent; if present, association reference must be non-null |
| `true` | `true` | May be absent; if present, association reference may be null |

All four combinations are valid. `optional` MUST NOT imply `nullable`; `nullable` MUST NOT imply `optional`.

### 4.2 Orthogonality to `multiplicity`

| `multiplicity` | `nullable` | Declaration validity |
| --- | --- | --- |
| `"one"` | `false` | Valid |
| `"one"` | `true` | Valid |
| `"many"` | `false` | Valid |
| `"many"` | `true` | Valid |

All four combinations are valid **as schema declarations**. This RFC does **not** define how association-reference nullability appears for `"many"` at runtime or on the wire, and does **not** define null elements. `multiplicity` MUST NOT imply `nullable`; `nullable` MUST NOT imply or reinterpret `multiplicity`.

### 4.3 Explicit non-meanings

Relation `nullable` MUST NOT be interpreted as any of the following under this RFC:

| Non-meaning | Why deferred |
| --- | --- |
| Declaration may / must be absent | RFC-013 `optional` |
| Null elements in a `many` association | Collection / element-nullability RFC |
| Empty collection ≡ null association reference | Empty-vs-absent RFC (kept separate) |
| Runtime association validation | Runtime enforcement RFC |
| Wire / serialization form of association-reference null vs absence | Representation RFC |
| Persistence / DB NULL / ORM mapping | Persistence mapping RFC |
| Direction / inverse / joins / cascade / loading / traversal / execution | Association / execution RFCs |
| Field value nullability | RFC-014 (independent) |
| Bounds / defaults / constraints | Constraint RFCs |

**Boundary:** declaration of association-reference nullability ≠ runtime / external constraint enforcement, element nullability, or empty≡null.

## 5. Relation member model

**Illustrative TypeScript shape (non-prescriptive)** — not an API requirement. The normative member model below applies **after Accept + implementation of this floor**:

```ts
interface Relation {
  name: RelationName;
  target: ResourceIdentity;
  multiplicity: RelationMultiplicity;
  optional: boolean;
  nullable: boolean;
}
```

Normative member model (same timing):

```text
Relation {
  name: RelationName
  target: ResourceIdentity
  multiplicity: RelationMultiplicity
  optional: boolean
  nullable: boolean
}
```

- A Relation MUST contain **exactly** the members `name`, `target`, `multiplicity`, `optional`, and `nullable`. No additional members are permitted.
- `name` MUST be a valid `RelationName` (RFC-008).
- `target` MUST be a valid `ResourceIdentity` association target (RFC-010 / RFC-001).
- `multiplicity` MUST be an exact `"one"` or `"many"` (RFC-011).
- `optional` MUST be an exact boolean `true` or `false` (RFC-013).
- `nullable` MUST be an exact boolean `true` or `false` (this RFC) — **association-reference nullability** only.
- Missing `nullable` is invalid (**Missing relation nullable**).
- Present-but-invalid `nullable` is invalid (**Invalid relation nullable**).
- Members with additional properties (including premature defaults, constraints, direction/join keys, etc.) are invalid (not ignored or stripped) — **Invalid relation member** or equivalent structural cause.
- Later RFCs may extend or amend the Relation model explicitly; unknown properties MUST NOT silently become part of Relation semantics.

### 5.1 Relation value equality

Two Relation **values** are equal if and only if:

1. their `name`s are exactly equal; and
2. their `target`s are exactly equal; and
3. their `multiplicity` values are exactly equal; and
4. their `optional` values are exactly equal; and
5. their `nullable` values are exactly equal.

Changing only `nullable` makes two Relations unequal. Equality and uniqueness remain distinct: unequal Relation values with the same `RelationName` still cannot coexist in one `relations` sequence (RFC-008 uniqueness-by-name).

## 6. Field member model

Unchanged by this RFC. Normative closed shape remains RFC-014:

```text
Field {
  name: FieldName
  type: FieldType
  optional: boolean
  nullable: boolean
}
```

- A Field MUST contain **exactly** those four members under RFC-014.
- Field `nullable` continues to mean **value nullability** (RFC-014), independent of Relation **association-reference nullability** (this RFC).

## 7. Validation

`relations` validity remains part of Resource validity via the schema. Under this RFC (after Accept + implementation), every Relation member must satisfy §5 in addition to retained upstream rules (RFC-008 / RFC-010 / RFC-011 / RFC-013).

**Validate-before-snapshot:** Invalid candidates MUST be rejected before they can become Resource snapshot state. Implementations MUST NOT transform an invalid candidate into a valid Relation by discarding information (including stripping unknown properties or inventing a default `nullable`) before validation.

Validity stays Resource-owned via schema (`checkRelations`); validate-before-snapshot; no silent repair; omission and invalid `nullable` are distinct conceptual validation causes.

### 7.1 Conceptual failure causes (Relation)

Concrete codes and TypeScript shapes are deferred; separation is normative:

| Cause | When |
| --- | --- |
| Invalid relation member | Relation does not satisfy the closed structural member model, and the failure is not attributable to a name / target / multiplicity / optional / nullable-specific cause (including extra members — or equivalent structural cause) |
| Invalid relation name | `name` fails `RelationName` grammar (RFC-008) |
| Duplicate relation name | repeated `RelationName` in the sequence (RFC-008) |
| Invalid relation target | per RFC-010 / RFC-001 |
| Missing / invalid relation multiplicity | per RFC-011 |
| Missing relation optional / Invalid relation optional | per RFC-013 |
| Missing relation nullable | `nullable` is absent |
| Invalid relation nullable | `nullable` is present but is not exact boolean `true` / `false` |

**Shape-classification discipline (normative intent):**

- **Missing relation nullable** applies when own key `nullable` is absent and the candidate’s **order-independent own key set** is exactly `{ name, target, multiplicity, optional }` (the legacy four-member shape).
- A structurally invalid candidate that contains some other fifth member (or otherwise fails the closed five-member key set after special cases) is **Invalid relation member**, not “missing nullable.”
- Inherited / prototype-derived `nullable` does **not** satisfy the closed Relation contract (treat as missing-nullable when the own-key set matches the special case).
- Key-set comparisons are order-independent.

```text
missing nullable              → Missing relation nullable
nullable exists but wrong type → Invalid relation nullable
other structural failure      → Invalid relation member (or equivalent structural cause)
```

**Missing `nullable`** and **present-but-invalid `nullable`** are distinct conceptual validation causes; neither is repaired or defaulted.

- These remain Resource/schema validation failures, distinct from metadata, annotation, field, and operation validation failures.
- No silent dropping, normalization, coercion, or defaulting of `nullable`.
- A separate public `validateRelations` / `validateNullable` API is **not** required by this RFC.
- This validates **declared association-reference nullability only**. It does **not** validate live associations, wire forms, collection contents, or null elements.

**Invariant:** A Resource is valid only if its complete schema, including every Relation’s `nullable`, is valid under the composed RFC-008 / RFC-010 / RFC-011 / RFC-013 / this RFC rules (and Fields / Operations per their Accepted floors).

### 7.2 Field validation

No new Field validation causes. Field closed-shape rules remain RFC-014. Field and Relation nullability validation remain independent.

## 8. Projection and adjacent contracts

1. **Fields / Relations / projection** — RFC-007 / RFC-008 projection non-participation remains unchanged. This RFC introduces no Relation→metadata contribution.
2. **Validation gate** — `projectResourceMetadata` continues to re-run Resource validation; Relations that fail §7 still fail projection.
3. **Annotations (RFC-006)** — unchanged.
4. **Operations (RFC-012)** — unchanged; name-only `{ name }` floor retained.
5. **`optional` (RFC-013)** — presence semantics unchanged and orthogonal.
6. **`multiplicity` (RFC-011)** — meanings unchanged and orthogonal.
7. **Fields (RFC-014 floor)** — unchanged; Field value nullability independent of Relation association-reference nullability.

## 9. Worked examples (informative)

```text
# Valid Relations (illustrative — optional × multiplicity × nullable combinations are all valid)
{ name: customer, target: (crm, Customer), multiplicity: "one",  optional: false, nullable: false }
{ name: sponsor,  target: (crm, Customer), multiplicity: "one",  optional: false, nullable: true }
{ name: tags,     target: (crm, Tag),      multiplicity: "many", optional: true,  nullable: false }
{ name: aliases,  target: (crm, Alias),    multiplicity: "many", optional: true,  nullable: true }
# Note: many + nullable is a valid declaration; this RFC does not define null elements or empty≡null.

# Valid Field (unchanged — RFC-014)
{ name: email, type: string, optional: false, nullable: false }

# Invalid Relations
{ name: customer, target: (crm, Customer), multiplicity: "one", optional: false }
# → Missing relation nullable (exact four-member own-key set)

{ name: customer, target: (crm, Customer), multiplicity: "one", optional: false, nullable: "true" }
# → Invalid relation nullable

{ name: customer, target: (crm, Customer), multiplicity: "one", optional: false, nullable: false, default: "" }
# → Invalid relation member (extra — not missing nullable)

{ name: customer, target: (crm, Customer), multiplicity: "one", nullable: true }
# → Invalid relation member (not missing-optional / not missing-nullable special case)
```

## 10. Compatibility / impact

| Concern | Impact |
| --- | --- |
| M3.11 `{ name, target, multiplicity, optional }` Relations | **Breaking** after Accept + implementation of this floor: missing `nullable` is invalid |
| Dual-shape period | **None.** No transitional acceptance of omit-`nullable` Relations |
| Existing empty `fields` / `relations` | Remain valid |
| Fields | **Unchanged** (RFC-014) |
| RFC-008 collection rules | Unchanged (order, uniqueness-by-name, snapshot, independent namespaces) |
| RFC-011 `multiplicity` meanings | Unchanged; orthogonal |
| RFC-013 `optional` semantics | Unchanged; orthogonal |
| RFC-012 Operations | Unchanged |
| Projection | Unchanged non-participation |
| Live contract while this RFC is Draft | **Unchanged** — M3.11 Relation floor remains authoritative until Accept + implementation |

Implementations that currently treat Relations as `{ name, target, multiplicity, optional }` MUST widen the Relation member contract only after this RFC is Accepted and an Accepted **M3.x Relation Nullability** implementation plan exists.

## 11. Design rationale

- **Association-reference nullability after declaration presence** keeps RFC-013’s `optional` honest and avoids smuggling null into presence, multiplicity, or collection-element semantics.
- **Relations-only packaging with Fields retained at RFC-014** completes the nullability pair deferred by name from RFC-014 without reopening Field value nullability.
- **Required boolean member** matches RFC-011 / RFC-013 / RFC-014 evolution: explicit closed shapes, no silent defaults, validate-before-snapshot stays honest.
- **Full orthogonality to `optional` and `multiplicity`** preserves independent declaration dimensions; accepting `many + nullable` without defining representation prevents accidental collection design.
- **Equality includes `nullable`** so an association-reference nullability flag change is observable; uniqueness stays name-scoped so collection models are not rewritten.
- **Missing vs invalid `nullable`** separates structural absence from type violation without prescribing error enums; missing applies only to the exact legacy four-member own-key set.
- **Partial supersession of the RFC-013 Relation floor only** makes the breaking widen unmistakable while retaining `optional`, multiplicity meanings, `target`, and the RFC-014 Field floor.
- **Empty-collection vs absent and null elements kept separately deferred** so those design questions are not accidentally coupled to association-reference nullability.

### Suggested progression (non-normative)

```text
RFC-013             optional: boolean on Field and Relation
        │
RFC-014             nullable: boolean on Field (value nullability)
        │
RFC-015             nullable: boolean on Relation   ← this RFC (Draft)
                    (association-reference nullability)
        │
Later               constraints
Later               runtime presence / value enforcement
Later               wire / serialization of association-reference null vs absence
Later               empty-collection vs absent; null elements in many
Later               persistence / DB null
Later               Operation kind / signature / execution / optionality
Later               Annotation vocabulary / richer projection
Later               direction / joins / cascade / loading / traversal
```

## 12. Relationship to other RFCs and milestones

| RFC / milestone | Relationship |
| --- | --- |
| RFC-005 Resource Model | Relied upon; schema member slots unchanged |
| RFC-006 Annotations | Relied upon for projection boundary; unchanged |
| RFC-007 Resource Fields | Unchanged (Field floor is RFC-014) |
| RFC-008 Resource Relations | Collection semantics retained; Relation shape widened by this RFC |
| RFC-009 Resource Field Types | Unchanged |
| RFC-010 Relation Association | `target` retained unchanged |
| RFC-011 Relation Multiplicity | `multiplicity` retained and orthogonal |
| RFC-012 Resource Operations | Unchanged |
| RFC-013 Field/Relation Optionality | **Partially superseded** (Relation shape / Relation equality); `optional` semantics retained and orthogonal; Field floor already superseded by RFC-014 |
| RFC-014 Field Nullability | Relied upon; Field floor retained unchanged; Field and Relation nullability independent |
| Later — constraints | Explicit follow-on RFC |
| Later — runtime / wire / persistence / empty vs absent / null elements | Explicit follow-on RFCs |
| Later — direction / join / cascade / load / traversal / execution | Explicit association / execution RFCs |
| Later — Operation optionality / kind / signature / execution | Explicit Operations RFCs |
| Later — Annotation vocabulary / field→metadata projection | Orthogonal |
| M3.11 Field Nullability | Shipped; live Relation floor until this RFC is Accepted and implemented |
| M3.x Relation Nullability | Only after this RFC is Accepted and the corresponding implementation plan is Accepted |

## 13. Document acceptance criteria (M2 → M3 Design Review)

This RFC may move from Draft to Accepted when Design Review finds:

1. Closed Relation shape is unambiguously exactly `{ name, target, multiplicity, optional, nullable }` with required `nullable: boolean`, **after Accept + implementation of this floor** (Draft does not change the live M3.11 Relation contract).
2. Normative term is **association-reference nullability**: `nullable: true` means the association reference may be null; `nullable: false` means the association reference must be non-null — **declaration constraints only**; omit invalid; exact boolean only; no defaults; no dual-shape.
3. `nullable` is fully orthogonal to RFC-013 `optional` and RFC-011 `multiplicity` (all `optional` × `multiplicity` × `nullable` declaration combinations valid); none implies another. `many + nullable` is a valid declaration without defining null elements or empty≡null.
4. Fields remain exactly RFC-014 `{ name, type, optional, nullable }`; Field value nullability and Relation association-reference nullability are independent.
5. Runtime enforcement, wire/serialization of association-reference null vs absence, empty-collection vs absent, null elements in `many`, persistence/ORM, direction/joins/cascade/loading/traversal/execution, bounds/defaults, Operations changes, and projection contribution remain deferred (§1.2).
6. Supersession is limited to the **RFC-013 Relation member floor** (and related Relation equality / closed-member text); `optional` semantics, multiplicity meanings, `target`, and the RFC-014 Field floor are not reopened.
7. Validation ownership is clear: Resource via schema (`checkRelations`); Missing vs Invalid `nullable` distinct; missing only for exact four-member own-key set; validate-before-snapshot; no silent coercion/defaulting; no required public `validateNullable` API; no live association checking.
8. Relation equality includes `nullable`; collection uniqueness remains name-only (RFC-008); projection non-participation unchanged.
9. No normative TypeScript API or error-code enum prescription beyond conceptual cause separation (extra members may use “or equivalent structural cause”).

## 14. Explicit deferrals

Deferred concerns are listed in §1.2. This ledger does not add scope; it restates **already-deferred** concerns from §1.2 (including null elements in `many`, empty-collection vs absent / empty≡null, runtime enforcement, wire / serialization of association-reference null vs absence, persistence mapping, direction/joins/cascade/loading/traversal/execution, builders, host adapters, reverse projection, and Operation optionality) that remain out of scope for RFC-015 unless a future RFC explicitly defines them.

## 15. Decision record

| Decision | Choice | Why |
| --- | --- | --- |
| Surface | Relations only | Completes nullability pair deferred by RFC-014 |
| Semantics | Association-reference nullability | Parallel to Field value nullability without inventing collections |
| Null elements / empty≡null | Deferred | Preserve orthogonality without premature collection design |
| Encoding | Required boolean dimension | Mirror RFC-014 / RFC-013 |
| `optional` × `nullable` | Fully orthogonal | Presence ≠ association-reference nullability |
| `multiplicity` × `nullable` | Fully orthogonal | Shape ≠ association-reference nullability |
| Equality | Includes `nullable` | Nullability flag is part of declaration identity |
| Uniqueness | Still name-only | Do not rewrite RFC-008 collections |
| Fields | Unchanged (RFC-014) | Independent nullability surfaces |
| Projection | Unchanged non-participation | No metadata contribution from schema members |
| Runtime / wire / persistence / direction | Out of scope | Separate layers / RFCs |
| Validate-before-snapshot | Required | Preserve closed-member discipline |
| Dual-shape | None | Single closed Relation shape after Accept + implementation |

## 16. Implementation gate (non-normative)

Coding that implements required `nullable` on Relations or RFC-015 association-reference nullability validation rules begins only after:

1. this RFC is Accepted;
2. an Accepted implementation plan for the relevant M3 slice exists.

Prefer **one pull request per tracking issue** for that delivery slice (Accepted plan + implementation together). Do not merge a plan-only PR before code for the same slice except as recovery.

This RFC alone does not authorize implementation.
