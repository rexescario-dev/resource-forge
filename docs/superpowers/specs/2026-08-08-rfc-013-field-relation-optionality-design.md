# RFC-013: Field/Relation Optionality

**Date:** 2026-08-08  
**Status:** Draft  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#40](https://github.com/rexescario-dev/resource-forge/issues/40)  
**Depends on:** RFC-001 (Resource Identity — Relation targets via RFC-010), RFC-005 (Resource Model), RFC-006 (Annotations — projection boundary), RFC-007 (Resource Fields — collection semantics retained), RFC-008 (Resource Relations — collection semantics retained), RFC-009 (Resource Field Types — `type` retained; Field shape partially superseded), RFC-010 (Relation Association Semantics — `target` retained), RFC-011 (Relation Multiplicity — `multiplicity` retained; Relation shape partially superseded), RFC-012 (Resource Operations — unchanged)  
**Followed by:** Nullability (`nullable`); runtime presence enforcement; empty-collection vs absent; bounds/constraints/defaults; direction / joins / cascade / loading / persistence; Operation optionality / kind / signature / execution; annotation vocabulary; field→metadata projection  
**Unblocks:** M3.10 Field/Relation Optionality implementation planning (M4→M5), then implementation (M6), after this RFC is Accepted — not implementation by itself  
**Amends / supersedes:** RFC-009 Field member shape (and related closed-member / Field equality text); RFC-011 Relation member shape (and related closed-member / Relation equality text). See §3. Does **not** reopen RFC-009 `FieldType` vocabulary, RFC-010 association semantics, RFC-011 `"one"|"many"` meanings, or RFC-012 `{ name }` Operations.

## Primary question

> May a Field or Relation declaration be absent—without deciding nullability, runtime presence, bounds, or persistence?

## Thesis

RFC-013 amends Field and Relation so every member is a **closed** declaration that includes a required `optional: boolean` (exact `true` / `false` only; omit invalid; no dual-shape; no defaults). Semantics are presence-only:

- `optional: true` → declaration **may be absent**
- `optional: false` → declaration **must be present**

This RFC does **not** define value nullability, empty-collection vs absent for `"many"` Relations, or enforcement against live data. `optional` is **fully orthogonal** to RFC-011 `multiplicity`: `optional` MUST NOT affect or reinterpret `multiplicity`.

```text
Field                                      Relation
├── name: FieldName                        ├── name: RelationName
├── type: FieldType                        ├── target: ResourceIdentity
└── optional: boolean                      ├── multiplicity: RelationMultiplicity
                                           └── optional: boolean
```

**RFC-007 / RFC-008 own collections; RFC-009 owns `type`; RFC-010 / RFC-001 own `target`; RFC-011 owns `multiplicity`; this RFC owns `optional` and the widened closed member floors.**

## 1. Scope

### 1.1 Goals

1. Add required `optional: boolean` to every Field and every Relation.
2. Redefine closed shapes: Field exactly `{ name: FieldName; type: FieldType; optional: boolean }`; Relation exactly `{ name: RelationName; target: ResourceIdentity; multiplicity: RelationMultiplicity; optional: boolean }`.
3. Require exact boolean membership: only `true` / `false`; no coerce, normalize, string/number stand-ins, or omit-as-default.
4. Lock presence semantics: `optional: true` → declaration may be absent; `optional: false` → declaration must be present. Presence only—not value semantics.
5. Keep `optional` fully orthogonal to RFC-011 `multiplicity` (all four combinations valid); leave empty collection vs absent undefined.
6. Redefine equality to include `optional` (Field: name + type + optional; Relation: name + target + multiplicity + optional). Collection uniqueness remains **by name only** (RFC-007 / RFC-008).
7. Place optionality/shape validity in Resource validity via schema (`checkFields` / `checkRelations`); validate-before-snapshot; no silent repair; **Missing `optional`** and **present-but-invalid `optional`** are distinct conceptual validation causes; neither is repaired or defaulted.
8. Introduce a **breaking contract change** relative to the M3.6 / M3.8 declaration shapes; no dual-shape compatibility period.
9. Leave RFC-007 / RFC-008 collection rules, RFC-009 `type`, RFC-010 / RFC-001 `target`, RFC-011 `multiplicity` meanings, RFC-012 Operations, and Field/Relation projection non-participation unchanged; only the Field/Relation member floors and related equality/closed-member text are superseded as specified in §3.

### 1.2 Non-goals

This RFC does not define:

1. `nullable` / value nullability (explicitly deferred)
2. Runtime presence enforcement against instances or payloads
3. Persistence / database nullability or ORM mapping
4. Bounds, constraints, defaults, descriptions, or per-member annotations
5. Cascade, loading / fetch, direction / inverse, joins / local-field handles
6. Empty-collection vs absent-relation representation for `multiplicity: "many"`
7. Operation optionality, kind, signature, input/output, or execution (RFC-012 unchanged)
8. Annotation vocabulary expansion
9. Field → `ResourceMetadata` projection or any change to RFC-006 / RFC-007 / RFC-008 projection participation rules
10. Reopening RFC-009 `FieldType` vocabulary, RFC-010 association floor, RFC-011 multiplicity meanings, or RFC-012 `{ name }` Operations floor
11. Dual-shape transitional validity (omit-`optional` still accepted)
12. Concrete TypeScript APIs, modules, package layout, or error code enums (conceptual separation only)
13. Resource-wide equality, builders, mutation APIs, serialization, adapters, or reverse projection

## 2. Terminology

| Term | Meaning |
| --- | --- |
| `optional` | Required boolean declaration-presence flag on Field and Relation |
| Declaration may be absent | What `optional: true` asserts; does **not** imply value null, empty collection, or runtime behavior |
| Declaration must be present | What `optional: false` asserts; does **not** imply non-null values or instance-count validation |
| Declared presence | What `optional` asserts; orthogonal to `FieldType`, `target`, and `multiplicity` |

RFC-007 / RFC-009 terms (`FieldName`, `FieldType`, `fields`) and RFC-008 / RFC-010 / RFC-011 terms (`RelationName`, `target`, `RelationMultiplicity`, `relations`) keep their existing meanings except where this RFC supersedes Field/Relation member shape and equality.

## 3. Supersession / amendment

Once this RFC is **Accepted** and the corresponding implementation floor is adopted:

### 3.1 Field (partial supersession of RFC-009)

| Concern | Authority |
| --- | --- |
| Field member shape | **RFC-013** (supersedes RFC-009 closed `{ name, type }`) |
| Required `optional` / boolean exactness | **RFC-013** |
| Field value equality | **RFC-013** |
| Field member validity (shape + optional) | **RFC-013** (composed with RFC-007 name rules and RFC-009 type rules) |
| `FieldType` vocabulary / `type` semantics | RFC-009 (unchanged) |
| `FieldName` grammar / equality | RFC-007 |
| Ordered `fields` sequence; empty valid; uniqueness-by-name | RFC-007 |
| Field projection non-participation | RFC-007 (unchanged) |

RFC-009’s two-member `{ name, type }` Field contract is **no longer normative** after this supersession. Implementers MUST NOT combine the old two-member shape with the new required-`optional` contract as simultaneously valid.

### 3.2 Relation (partial supersession of RFC-011)

| Concern | Authority |
| --- | --- |
| Relation member shape | **RFC-013** (supersedes RFC-011 closed `{ name, target, multiplicity }`) |
| Required `optional` / boolean exactness | **RFC-013** |
| Relation value equality | **RFC-013** |
| Relation member validity (shape + optional) | **RFC-013** (composed with RFC-008 name rules, RFC-010 target rules, RFC-011 multiplicity rules) |
| Declarative `target` / RFC-001 `user` context | RFC-010 (unchanged) |
| `RelationMultiplicity` / `"one"|"many"` meanings | RFC-011 (unchanged; orthogonal) |
| `RelationName` grammar / equality; ordered `relations`; uniqueness-by-name | RFC-008 |
| Relation projection non-participation | RFC-008 (unchanged) |

RFC-011’s three-member `{ name, target, multiplicity }` Relation contract is **no longer normative** after this supersession. Implementers MUST NOT combine the old three-member shape with the new required-`optional` contract as simultaneously valid.

This RFC does **not** rewrite RFC-007, RFC-008, RFC-009 type vocabulary, RFC-010, RFC-011 multiplicity meanings, or RFC-012 wholesale.

## 4. `optional` boolean

```text
optional ::= true | false
```

| Value | Meaning (this RFC only) |
| --- | --- |
| `true` | Declaration **may be absent** |
| `false` | Declaration **must be present** |

- **Identity:** exact boolean membership in the set above.
- **No coercion:** `"true"`, `"false"`, `1`, `0`, `null`, or other stand-ins are invalid.
- **No normalization or defaults:** omitting `optional` is invalid; implementations MUST NOT invent `false` or `true`.
- **Not nullability:** `optional` does not mean the value may be `null`.
- **Not multiplicity:** `optional` MUST NOT affect or reinterpret `multiplicity`.

In this RFC, “present” and “absent” refer only to the **Field/Relation declaration within the Resource schema**; they do not refer to instance, payload, or persisted data.

### 4.1 Explicit non-meanings

`optional` MUST NOT be interpreted as any of the following under this RFC:

| Non-meaning | Why deferred |
| --- | --- |
| Nullable / non-null value | Separate `nullable` dimension |
| Empty collection vs absent relation | Runtime / representation RFC |
| Persistence / DB NULL | Persistence mapping RFC |
| Bounds / min-max / constraints | Constraint RFCs |
| Cascade / loading / joins / direction | Association-dimension RFCs |
| Operation presence | Operations remain RFC-012; Operation optionality deferred |
| Live presence validation | Runtime enforcement RFC |

**Boundary:** declaration of presence ≠ runtime / external constraint enforcement.

## 5. Field member model

Informative closed shape (conceptual; not a prescribed module export):

```ts
interface Field {
  name: FieldName;
  type: FieldType;
  optional: boolean;
}
```

Normative member model:

```text
Field {
  name: FieldName
  type: FieldType
  optional: boolean
}
```

- A Field MUST contain **exactly** the members `name`, `type`, and `optional`. No additional members are permitted.
- `name` MUST be a valid `FieldName` (RFC-007).
- `type` MUST be a valid `FieldType` (RFC-009).
- `optional` MUST be an exact boolean `true` or `false` (this RFC).
- Missing `optional` is invalid (**Missing field optional**).
- Present-but-invalid `optional` is invalid (**Invalid field optional**).
- Members with additional properties (including premature `nullable`, defaults, constraints, etc.) are invalid (not ignored or stripped).
- Later RFCs may extend or amend the Field model explicitly; unknown properties MUST NOT silently become part of Field semantics.

### 5.1 Field value equality

Two Field **values** are equal if and only if:

1. their `name`s are exactly equal; and
2. their `type`s are exactly equal; and
3. their `optional` values are exactly equal.

Changing only `optional` makes two Fields unequal. Equality and uniqueness remain distinct: unequal Field values with the same `FieldName` still cannot coexist in one `fields` sequence (RFC-007 uniqueness-by-name).

## 6. Relation member model

Informative closed shape (conceptual; not a prescribed module export):

```ts
interface Relation {
  name: RelationName;
  target: ResourceIdentity;
  multiplicity: RelationMultiplicity;
  optional: boolean;
}
```

Normative member model:

```text
Relation {
  name: RelationName
  target: ResourceIdentity
  multiplicity: RelationMultiplicity
  optional: boolean
}
```

- A Relation MUST contain **exactly** the members `name`, `target`, `multiplicity`, and `optional`. No additional members are permitted.
- `name` MUST be a valid `RelationName` (RFC-008).
- `target` MUST be a valid declarative `ResourceIdentity` under RFC-010 (RFC-001 rules under the **`user`** validation context).
- `multiplicity` MUST be a valid `RelationMultiplicity` (RFC-011).
- `optional` MUST be an exact boolean `true` or `false` (this RFC).
- Missing `optional` is invalid (**Missing relation optional**).
- Present-but-invalid `optional` is invalid (**Invalid relation optional**).
- Members with additional properties (including premature `nullable`, bounds, direction, joins, etc.) are invalid (not ignored or stripped).
- Later RFCs may extend or amend the Relation model explicitly; unknown properties MUST NOT silently become part of Relation semantics.

### 6.1 Orthogonality to multiplicity

| Relation dimension | Rule |
| --- | --- |
| `multiplicity` | Required, per RFC-011 |
| `optional` | Required, per this RFC |
| Interaction | **None** |
| `"one"` + `optional: true` | Valid |
| `"one"` + `optional: false` | Valid |
| `"many"` + `optional: true` | Valid |
| `"many"` + `optional: false` | Valid |
| Empty collection vs absent relation | **Undefined / deferred** |

**Invariant:** `optional` MUST NOT affect or reinterpret `multiplicity`.  
**Invariant:** `multiplicity` describes cardinality (singular vs collection relationship shape); `optional` describes declaration presence.

### 6.2 Relation value equality

Two Relation **values** are equal if and only if:

1. their `name`s are exactly equal; and
2. their `target`s are equal under RFC-001 `ResourceIdentity` equality; and
3. their `multiplicity` values are exactly equal; and
4. their `optional` values are exactly equal.

Changing only `optional` makes two Relations unequal. Uniqueness within `relations` remains by name only (RFC-008).

## 7. Validation

`fields` / `relations` validity remains part of Resource validity via the schema. Under this RFC, every Field/Relation member must satisfy §5 / §6 in addition to retained upstream rules.

**Validate-before-snapshot:** Invalid candidates MUST be rejected before they can become Resource snapshot state. Implementations MUST NOT transform an invalid candidate into a valid Field/Relation by discarding information (including stripping unknown properties or inventing a default `optional`) before validation.

Validity stays Resource-owned via schema (`checkFields` / `checkRelations`); validate-before-snapshot; no silent repair; omission and invalid `optional` are distinct conceptual validation causes.

### 7.1 Conceptual failure causes (Field)

Concrete codes and TypeScript shapes are deferred; separation is normative:

| Cause | When |
| --- | --- |
| Invalid field member | Field is not structurally an object, or is malformed in a way not attributable to a name / type / optional-specific cause |
| Invalid field name | `name` fails `FieldName` grammar (RFC-007) |
| Duplicate field name | repeated `FieldName` in the sequence (RFC-007) |
| Missing field type / Invalid field type | per RFC-009 |
| Missing field optional | `optional` is absent |
| Invalid field optional | `optional` is present but is not exact boolean `true` / `false` |

### 7.2 Conceptual failure causes (Relation)

| Cause | When |
| --- | --- |
| Invalid relation member | Relation is not structurally an object, or is malformed in a way not attributable to a name / target / multiplicity / optional-specific cause |
| Invalid relation name | `name` fails `RelationName` grammar (RFC-008) |
| Duplicate relation name | repeated `RelationName` in the sequence (RFC-008) |
| Invalid relation target | per RFC-010 / RFC-001 `user` context |
| Missing / Invalid relation multiplicity | per RFC-011 |
| Missing relation optional | `optional` is absent |
| Invalid relation optional | `optional` is present but is not exact boolean `true` / `false` |

```text
missing optional              → Missing field/relation optional
optional exists but wrong type → Invalid field/relation optional
other structural failure      → Invalid field/relation member
```

**Missing `optional`** and **present-but-invalid `optional`** are distinct conceptual validation causes; neither is repaired or defaulted.

- These remain Resource/schema validation failures, distinct from metadata, annotation, and operation validation failures.
- No silent dropping, normalization, coercion, or defaulting of `optional`.
- A separate public `validateFields` / `validateRelations` / `validateOptional` API is **not** required by this RFC.
- This validates **declared presence only**. It does **not** validate live absence/presence against data.

**Invariant:** A Resource is valid only if its complete schema, including every Field’s and Relation’s `optional`, is valid under the composed RFC-007 / RFC-009 / RFC-008 / RFC-010 / RFC-011 / this RFC rules (and Operations per RFC-012).

## 8. Projection and adjacent contracts

1. **Fields / Relations / projection** — RFC-007 / RFC-008 projection non-participation remains unchanged. This RFC introduces no Field/Relation→metadata contribution.
2. **Validation gate** — `projectResourceMetadata` continues to re-run Resource validation; Fields/Relations that fail §7 still fail projection.
3. **Annotations (RFC-006)** — unchanged.
4. **Operations (RFC-012)** — unchanged; name-only `{ name }` floor retained; Operation optionality not introduced here.
5. **Association target (RFC-010)** — declarative `target` rules unchanged; RFC-001 remains identity authority for Relation targets.
6. **Multiplicity (RFC-011)** — `"one"|"many"` meanings unchanged and orthogonal.

## 9. Worked examples (informative)

```text
# Valid Fields
{ name: email, type: string, optional: false }     # declaration must be present
{ name: nickname, type: string, optional: true }   # declaration may be absent

# Valid Relations (multiplicity × optional all valid)
{ name: customer, target: (crm, Customer), multiplicity: "one",  optional: false }
{ name: manager,  target: (crm, User),     multiplicity: "one",  optional: true }
{ name: items,    target: (crm, LineItem), multiplicity: "many", optional: false }
{ name: tags,     target: (crm, Tag),      multiplicity: "many", optional: true }
# empty collection vs absent for "many" + optional:true remains undefined

# Invalid
{ name: email, type: string }                      # Missing field optional
{ name: email, type: string, optional: "true" }    # Invalid field optional
{ name: email, type: string, optional: 1 }         # Invalid field optional
{ name: email, type: string, optional: false, nullable: true }  # Invalid field member (extra)
```

## 10. Compatibility / impact

| Concern | Impact |
| --- | --- |
| M3.6 `{ name, type }` Fields | **Breaking.** After Accept + implementation of this floor, missing `optional` is invalid |
| M3.8 `{ name, target, multiplicity }` Relations | **Breaking.** After Accept + implementation of this floor, missing `optional` is invalid |
| Dual-shape period | **None.** No transitional acceptance of omit-`optional` members |
| Existing empty `fields` / `relations` | Remain valid |
| RFC-007 / RFC-008 collection rules | Unchanged (order, uniqueness-by-name, snapshot, independent namespaces) |
| RFC-009 `FieldType` / RFC-011 multiplicity meanings | Unchanged |
| RFC-012 Operations | Unchanged |
| Projection | Unchanged non-participation |

Implementations that currently treat Fields as `{ name, type }` or Relations as `{ name, target, multiplicity }` MUST widen the member contracts only after this RFC is Accepted and an Accepted **M3.10 Field/Relation Optionality** implementation plan exists.

## 11. Design rationale

- **Presence before nullability** keeps declaration absence separate from value null—avoiding accidental runtime/persistence null semantics.
- **Required boolean member** matches RFC-009 / RFC-011 evolution: explicit closed shapes, no silent defaults, validate-before-snapshot stays honest.
- **One RFC for Field and Relation** keeps a single declaration-presence concern under one Accept gate without splitting a coherent floor.
- **Orthogonality to multiplicity** preserves RFC-011 and leaves empty-vs-absent for later representation RFCs.
- **Equality includes `optional`** so a presence-flag change is observable; uniqueness stays name-scoped so collection models are not rewritten.
- **Missing vs invalid `optional`** separates structural absence from type violation without prescribing error enums.
- **Partial supersession of RFC-009 / RFC-011 member floors only** makes the breaking widen unmistakable while retaining type, target, and multiplicity ownership.
- **Operations left alone** prevents coupling Field/Relation presence to the RFC-012 name-only Operations floor.

### Suggested progression (non-normative)

```text
RFC-007 / RFC-009   Field { name, type }
RFC-008 / RFC-010 / RFC-011   Relation { name, target, multiplicity }
RFC-012             Operation { name }
        │
RFC-013             optional: boolean on Field and Relation   ← this RFC (Draft)
        │
Later               nullable / runtime presence / bounds / …
Later               Operation kind / signature / execution / optionality
Later               Annotation vocabulary / richer projection
```

## 12. Relationship to other RFCs and milestones

| RFC / milestone | Relationship |
| --- | --- |
| RFC-001 Resource Identity | Relied upon via RFC-010 for Relation `target`; unchanged. RFC-001 remains identity authority. |
| RFC-005 Resource Model | Relied upon; schema member slots unchanged |
| RFC-006 Annotations | Relied upon for projection boundary; unchanged |
| RFC-007 Resource Fields | Collection semantics retained; Field shape widened by this RFC |
| RFC-008 Resource Relations | Collection semantics retained; Relation shape widened by this RFC |
| RFC-009 Resource Field Types | **Partially superseded** (Field shape / equality); `FieldType` retained |
| RFC-010 Relation Association | Target semantics retained; unchanged |
| RFC-011 Relation Multiplicity | **Partially superseded** (Relation shape / equality); `"one"|"many"` meanings retained and orthogonal |
| RFC-012 Resource Operations | Unchanged; `{ name }` floor retained |
| Later — `nullable` / runtime presence / empty vs absent | Explicit follow-on RFCs |
| Later — bounds / direction / join / cascade / load / persistence | Explicit constraint / association RFCs |
| Later — Operation optionality / kind / signature / execution | Explicit Operations RFCs |
| Later — Annotation vocabulary / field→metadata projection | Orthogonal |
| M3.10 Field/Relation Optionality | Only after this RFC is Accepted and the **M3.10** implementation plan is Accepted |

## 13. Document acceptance criteria (M2 → M3 Design Review)

This RFC may move from Draft to Accepted when Design Review finds:

1. Closed Field shape is unambiguously exactly `{ name, type, optional }` with required `optional: boolean`; closed Relation shape is unambiguously exactly `{ name, target, multiplicity, optional }`.
2. `optional: true` means declaration may be absent; `optional: false` means declaration must be present; omit invalid; exact boolean only; no defaults; no dual-shape.
3. `optional` is fully orthogonal to RFC-011 `multiplicity` (all four combinations valid); empty collection vs absent deferred; `optional` MUST NOT affect or reinterpret `multiplicity`.
4. `nullable`, runtime enforcement, persistence/DB null, bounds, cascade/loading, Operations changes, and annotation vocabulary remain explicitly deferred (§1.2).
5. Supersession is limited to RFC-009 / RFC-011 **member floors** (and related equality/closed-member text); type vocabulary, association target, multiplicity meanings, and RFC-012 Operations are not reopened.
6. Validation ownership is clear: Resource via schema (`checkFields` / `checkRelations`); Missing vs Invalid `optional` distinct; validate-before-snapshot; no silent coercion/defaulting.
7. Equality includes `optional`; collection uniqueness remains name-only; projection non-participation unchanged.
8. No normative TypeScript API or error-code enum prescription beyond conceptual cause separation.

## 14. Explicit deferrals

Deferred concerns are listed in §1.2. This ledger does not add scope; it records that builders, serialization / wire formats, host adapters, reverse projection, and Operation optionality also remain out of scope unless a future RFC says otherwise.

## 15. Decision record

| Decision | Choice | Why |
| --- | --- | --- |
| Dimension | `optional` only | Presence before nullability |
| Member | Required boolean | Explicit; no silent defaults; matches RFC-009/011 |
| Packaging | One RFC for Field + Relation | Single declaration-presence concern |
| Multiplicity | Fully orthogonal | Preserve RFC-011; defer empty vs absent |
| Equality | Includes `optional` | Presence flag is part of declaration identity |
| Uniqueness | Still name-only | Do not rewrite RFC-007 / RFC-008 collections |
| Projection | Unchanged non-participation | No metadata contribution from schema members |
| Operations | Unchanged | Do not reopen RFC-012 |
| `nullable` / runtime / persistence | Out of scope | Separate RFCs when requirements exist |
| Validate-before-snapshot | Required | Preserve Fields/Relations lesson for closed members |
| Dual-shape | None | Single closed shape after Accept + implementation |

## 16. Implementation gate (non-normative)

Coding that implements required `optional` on Fields/Relations or RFC-013 optionality validation rules begins only after:

1. this RFC is Accepted;
2. an Accepted implementation plan for the relevant M3 slice (M3.10) exists.

Prefer **one pull request per tracking issue** for that delivery slice (Accepted plan + implementation together). Do not merge a plan-only PR before code for the same slice except as recovery.

No production nullability, runtime presence, persistence, bounds, cascade/loading, or Operations semantics SHALL be introduced under this RFC alone.
