# RFC-016: Constraints

**Date:** 2026-08-08  
**Status:** Draft  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#56](https://github.com/rexescario-dev/resource-forge/issues/56)  
**Depends on:** RFC-001 (Resource Identity — via Resource), RFC-005 (Resource Model — schema aggregate; amended here), RFC-006 (Annotations — projection boundary), RFC-007 (Resource Fields — parallel collection packaging; unchanged), RFC-008 (Resource Relations — parallel collection packaging; unchanged), RFC-012 (Resource Operations — parallel collection packaging; unchanged), RFC-013 / RFC-014 / RFC-015 (Field/Relation optionality and nullability floors — relied upon unchanged)  
**Followed by:** Concrete constraint kind vocabulary and semantics (bounds, uniqueness, defaults, cross-member rules, etc.); constraint payloads / `spec` bags; per-member Field/Relation constraint attachment; runtime enforcement; wire / serialization; persistence / ORM mapping; Operation kind / signature / execution; annotation vocabulary; field→metadata projection; direction / joins  
**Unblocks:** M3.x Constraints framework implementation planning (M4→M5), then implementation (M6), after this RFC is Accepted — not implementation by itself  
**Amends:** RFC-005 `ResourceSchema` by adding a required `constraints` collection alongside `fields` / `relations` / `operations`, and by defining Constraint member / sequence semantics. Does **not** amend Field, Relation, or Operation member floors (RFC-007 / RFC-008 / RFC-009 / RFC-010 / RFC-011 / RFC-012 / RFC-013 / RFC-014 / RFC-015).

## Primary question

> What is the Resource constraint *framework*—attachment surface and closed member contract—without defining concrete constraint kinds, payloads, or enforcement semantics?

## Thesis

RFC-016 defines a **generic constraint framework** on `ResourceSchema`:

- `constraints` is a **required ordered sequence** of Constraint members.
- Each Constraint is a **closed** `{ name: ConstraintName; kind: string }` declaration.
- `name` uses the existing schema-member identifier grammar, is unique within `constraints`, and lives in a **dedicated namespace**.
- `kind` is a **required open non-empty string** (exact equality; no reserved vocabulary; no kind semantics here).
- Empty `constraints` is valid; omit / non-sequence is invalid; no dual-shape.
- Validity is part of Resource validity via the schema; validate-before-snapshot; no silent repair.
- Constraints do **not** contribute to `projectResourceMetadata`.
- Concrete constraint kinds, payloads, bounds/defaults/uniqueness/cross-member rules, runtime enforcement, wire/persistence, and Field/Relation-attached constraints are deferred.

```text
ResourceSchema
├── fields:      ordered sequence of Field      ← RFC-007 / RFC-009 / RFC-013 / RFC-014 (unchanged)
├── relations:   ordered sequence of Relation   ← RFC-008 / RFC-010 / RFC-011 / RFC-013 / RFC-015 (unchanged)
├── operations:  ordered sequence of Operation  ← RFC-012 (unchanged)
└── constraints: ordered sequence of Constraint { name, kind }  ← this RFC
```

The logical contract is an ordered sequence. Separately, once that sequence is part of a Resource snapshot, the exposed Resource state MUST NOT permit mutation of it (§4.2). This RFC does not prescribe a particular collection implementation or TypeScript API.

**RFC-005 owns the Resource aggregate and schema slot names; this RFC owns Constraint identity, closed member shape, `kind` openness rules, and `constraints` sequence semantics.**

The `constraints` floor is normative only **after this RFC is Accepted and the corresponding implementation floor is adopted**. Until that implementation floor is adopted, the live M3.12 `ResourceSchema` shape (`{ fields, relations, operations }`) remains authoritative.

## 1. Scope

### 1.1 Goals

1. Define `ConstraintName` (grammar, exact equality, uniqueness within `constraints`, dedicated identity domain, no RFC-016 name reservations).
2. Define closed `Constraint = { name: ConstraintName; kind: string }` with exactly two declared semantic properties.
3. Define `kind` as a required **open non-empty string**: must be a string; must be non-empty; exact string equality; no normalization; `null` / omit / non-string / `""` invalid; **no reserved kinds** and **no kind vocabulary** in this RFC.
4. Define `constraints` as a **required ordered sequence** on `ResourceSchema` with unique names within the sequence; empty valid; omit / non-sequence invalid; no dual-shape.
5. Define order-sensitive sequence equality and Constraint value equality (`name` **and** `kind`); uniqueness remains **by name only** (same `kind` on different names allowed).
6. State **independent namespaces** relative to `fields` / `relations` / `operations`: uniqueness is per collection; a Field, Relation, Operation, and Constraint MAY share the same name string on one Resource.
7. Place validation inside Resource validity via schema, with distinct conceptual error causes; validate-before-snapshot; no silent repair; no public `validateConstraints` pathway and no `validateResourceSchema` introduced merely for this slice.
8. State that RFC-016 introduces **no Constraint contribution** to `projectResourceMetadata`.
9. Introduce a **breaking contract change once Accepted and implemented** relative to the M3.12 `ResourceSchema` shape; schemas omitting `constraints` become invalid; empty `constraints` remains the zero-member valid case.
10. Explicitly defer concrete kinds, payloads, enforcement, and Field/Relation attachment (see §1.2); leave Field / Relation / Operation floors authoritative and unchanged.

### 1.2 Non-goals

This RFC does not define:

1. Concrete constraint **kind vocabulary** or kind semantics (bounds, ranges, patterns, enums, uniqueness, referential integrity, defaults, cross-member rules, etc.)
2. Constraint payloads / `spec` / `body` bags, parameters, or kind-specific member extensions
3. Per-member Field or Relation constraint attachment slots
4. Runtime presence / value / constraint enforcement against instances or payloads
5. Wire / serialization representation of constraints or constraint evaluation results
6. Persistence / database constraints / ORM mapping
7. A unified Resource schema namespace across `fields` / `relations` / `operations` / `constraints`
8. Field, Relation, or Operation member-shape changes (RFC-007–RFC-015 floors remain as Accepted)
9. Field / Relation / Operation / Constraint → `ResourceMetadata` contribution (none is introduced for constraints; upstream non-participation rules unchanged)
10. Cross-source projection collision / precedence / merge
11. Annotation vocabulary expansion
12. Operation kind / signature / input-output / execution (RFC-012 unchanged; Operation `kind` remains deferred there)
13. Identifier grammar for `kind` (deliberately open beyond non-empty string)
14. Dual-shape transitional validity (omit-`constraints` still accepted)
15. Concrete TypeScript APIs, modules, package layout, or error code enums (conceptual separation only; extra members may be diagnosed as Invalid constraint member **or equivalent structural cause**)
16. Resource-wide equality, builders, mutation APIs, serialization, host adapters, or reverse projection

## 2. Terminology

| Term | Meaning |
| --- | --- |
| `ConstraintName` | Name identifying a Constraint within a Resource's `constraints` sequence: an ASCII string satisfying the normative grammar `^[a-z][a-zA-Z0-9]*$`, with exact string equality and a dedicated identity domain — not a `FieldName`, not a `RelationName`, not an `OperationName`, and not a `MetadataKey` |
| `kind` | Required open non-empty string discriminator on a Constraint; classifies the constraint declaration without defining kind semantics in this RFC |
| Constraint | Closed schema member `{ name: ConstraintName; kind: string }` |
| `constraints` | **Ordered sequence** of Constraint members on `ResourceSchema` |
| Empty `constraints` | The sequence with zero members; valid |
| Constraint framework floor | What this RFC specifies: attachment surface + closed identity/classification contract — not concrete constraint evaluation |

RFC-001 / RFC-005 / RFC-006 / RFC-007 / RFC-008 / RFC-012 / RFC-013 / RFC-014 / RFC-015 terms (`Resource`, `ResourceSchema`, `Field`, `Relation`, `Operation`, `Annotations`, `projectResourceMetadata`, `ResourceMetadata`) keep their existing meanings except where this RFC amends `ResourceSchema` to include `constraints`.

## 3. Amendment to RFC-005 ResourceSchema

Once this RFC is **Accepted** and the corresponding implementation floor is adopted:

| Concern | Authority |
| --- | --- |
| Resource aggregate (`identity`, `schema`, `annotations`) | RFC-005 (unchanged) |
| Schema collections present | **RFC-016** amends RFC-005: `fields`, `relations`, `operations`, **and** `constraints` |
| Empty schema validity | Amended: empty `fields` / `relations` / `operations` / `constraints` remains valid |
| Constraint member / sequence / `kind` openness | **RFC-016** |
| Field / Relation / Operation member floors | Unchanged (their Accepted RFCs) |

Until Accept + implementation of this floor, RFC-005 as amended by RFC-007–RFC-015 (live M3.12 schema without `constraints`) remains authoritative for schema shape.

## 4. Constraint identity and member model

### 4.1 ConstraintName

```text
ConstraintName ::= ^[a-z][a-zA-Z0-9]*$
```

- **Identity:** exact `ConstraintName` string.
- **Scope:** unique within a Resource’s `constraints` sequence.
- **Namespace:** none shared with `fields`, `relations`, `operations`, or metadata; uniqueness is scoped to the Resource's `constraints` sequence.
- **Grammar:** The regex above is the **sole normative** `ConstraintName` constraint. The label “camelCase” is descriptive only and MUST NOT be read as an additional rule beyond `^[a-z][a-zA-Z0-9]*$`. The pattern matches the RFC-007 / RFC-008 / RFC-012 name grammar for surface consistency but **does not** reuse those types/domains and **does not** reuse `MetadataKey`.
- **Equality:** exact string equality; case-sensitive; MUST NOT perform case folding, normalization, or aliasing.
- **Reservations:** none in this RFC. Every grammar-valid `ConstraintName` is allowed. Future RFCs may reserve names only by explicit statement.

### 4.2 `kind`

- **Required** on every Constraint.
- **Type:** string only.
- **Non-empty:** `""` is invalid.
- **Equality:** exact string equality; case-sensitive; MUST NOT trim, case-fold, normalize, or alias.
- **Open vocabulary:** this RFC defines **no** reserved kinds and **no** closed kind enumeration.
- **Invalid forms:** omitted `kind`, `null`, non-string, and `""` are invalid (distinct conceptual causes where useful: missing vs invalid).
- **No semantics:** accepting a `kind` string does **not** imply that any evaluation, payload, or enforcement rule exists for that kind.

### 4.3 Constraint

```text
Constraint {
  name: ConstraintName
  kind: string   # required, non-empty, open vocabulary
}
```

- A Constraint has exactly two declared semantic properties, `name` and `kind`.
- A Constraint is valid only when `name` is a valid `ConstraintName`, `kind` is a non-empty string, and the candidate conforms to the closed RFC-016 shape.
- A Constraint candidate containing additional semantic properties is **invalid** (not ignored or stripped).
- No payload/`spec`, bounds, defaults, or other deferred semantics are part of this floor.
- Later RFCs may extend the Constraint model explicitly (including kind vocabulary and payloads). Unknown semantic properties MUST NOT silently become part of Constraint semantics.
- Two Constraint **values** are equal iff their `ConstraintName` strings are exactly equal **and** their `kind` strings are exactly equal.

### 4.4 Independent namespaces

| Rule | Statement |
| --- | --- |
| Field uniqueness | `FieldName`s MUST be unique within `fields` (RFC-007) |
| Relation uniqueness | `RelationName`s MUST be unique within `relations` (RFC-008) |
| Operation uniqueness | `OperationName`s MUST be unique within `operations` (RFC-012) |
| Constraint uniqueness | `ConstraintName`s MUST be unique within `constraints` (this RFC) |
| Cross-collection | A Field, Relation, Operation, and Constraint MAY have the same name string on the same Resource |
| Unified schema namespace | **Not** introduced by RFC-016 |
| Kind uniqueness | **Not** required; multiple Constraints MAY share the same `kind` string if their names differ |

Example (valid):

```text
fields:      [ { name: total, type: number, optional: false, nullable: false } ]
relations:   [ { name: customer, target: (crm, Customer), multiplicity: "one", optional: false, nullable: false } ]
operations:  [ { name: create } ]
constraints: [ { name: create, kind: "placeholder" } ]   # name coexistence with Operation allowed
```

Cross-collection naming semantics beyond coexistence remain outside this RFC.

## 5. `constraints` ordered sequence

### 5.1 Logical shape

```text
constraints: ordered sequence of Constraint
```

`constraints` is a **required** `ResourceSchema` member. It may be empty. Concrete array / list representation is deferred; the semantic contract is an ordered sequence.

### 5.2 Invariants

| Invariant | Rule |
| --- | --- |
| Required member | `constraints` MUST be present on every `ResourceSchema`; omission is invalid. |
| Sequence | The value MUST be a sequence of Constraint members; non-sequence values are invalid. |
| Snapshot | Once a `constraints` sequence is part of a Resource snapshot, the exposed Resource state MUST NOT permit mutation of that sequence or its Constraint members. Any change MUST produce a new Resource/snapshot state. |
| Ordered | Declaration order is preserved and participates in `constraints` sequence equality. |
| Unique names | At most one Constraint per `ConstraintName` within the sequence; duplicates are invalid. |
| Empty | Zero members; valid. |
| Closed member | Every member MUST be a closed Constraint `{ name, kind }` as defined in §4; candidates with additional semantic properties are invalid. |
| Not metadata | Constraint identity is not `MetadataKey`; constraints are not annotation entries. |
| Not Field/Relation/Operation name | `ConstraintName` is a dedicated domain; coexistence with an equal name string in another collection does not merge identities. |

Implementations MUST NOT silently drop, merge, normalize, reorder for semantic equality, strip additional semantic properties, default omitted `constraints` to empty, coerce `kind`, deduplicate, or reinterpret conflicting or invalid constraint members.

### 5.3 Equality

Two `constraints` sequences are equal if and only if they have the same length and, for every index `i`, Constraint value equality holds between `constraints_a[i]` and `constraints_b[i]` (exact `name` **and** exact `kind`).

- Equality is **order-sensitive**.
- Same Constraints in a different order are **not** equal.
- Empty `constraints` sequences are equal to each other.

Resource-wide equality remains out of scope for this RFC unless defined elsewhere.

### 5.4 Ownership boundaries

| Layer | Owns | Does not own |
| --- | --- | --- |
| Resource schema `constraints` | Authoritative ordered Constraint sequence | Projected metadata, registry state, constraint evaluation / enforcement |
| Projection | Resource → `ResourceMetadata` (unchanged participation rules for annotations) | Constraint contribution (none in this RFC); field→metadata contribution (still deferred) |
| Registry | identity ↔ `ResourceMetadata` snapshots | Schema constraint state |
| Composition (RFC-004) | Metadata contribution composition | Constraint authoring or schema membership |

Fields, Relations, and Operations remain as defined by their Accepted RFCs. This RFC does not widen or reinterpret those collections’ member floors.

## 6. Validation

`constraints` validity is part of Resource validity via the schema (RFC-005 validation / implementation `validateResource`).

A Resource’s `constraints` sequence is valid only if all of the following hold:

1. `constraints` is present and is a sequence.
2. Every member is a closed Constraint with exactly the declared semantic properties `name` and `kind`.
3. Each `name` satisfies the `ConstraintName` grammar.
4. Each `kind` is a non-empty string.
5. `ConstraintName`s are unique within the sequence; duplicates are invalid.
6. Empty (zero members) is valid.

Invalid `constraints` → invalid Resource. A Resource remains valid only if the rest of its schema (and identity / annotations) is also valid.

**Validate-before-snapshot:** Invalid candidates MUST be rejected before they can become Resource snapshot state. Implementations MUST NOT transform an invalid candidate into a valid Constraint or valid schema by discarding information (including stripping additional semantic properties, defaulting omitted `constraints` to `[]`, or coercing `kind`) before validation.

### 6.1 Error ownership

Conceptual failure causes (concrete codes and TypeScript shapes are deferred; separation is normative):

| Cause | When |
| --- | --- |
| Missing constraints | `constraints` omitted from the schema candidate |
| Invalid constraints collection | present but not a sequence |
| Invalid constraint name | `name` fails `ConstraintName` grammar |
| Duplicate constraint name | repeated `ConstraintName` in the sequence |
| Missing constraint kind | `kind` omitted |
| Invalid constraint kind | `kind` present but not a non-empty string |
| Invalid constraint member | member is not a closed Constraint `{ name, kind }` (including extra semantic properties) |

- Constraint/collection failures are Resource/schema validation failures.
- They MUST remain distinct from metadata, annotation, field, relation, and operation validation failures.
- No silent dropping, normalization, defaulting, or coercion.
- A separate public `validateConstraints` API is **not** required by this RFC.
- `validateResourceSchema` MUST NOT be introduced merely to solve this slice; schema-level checks remain an internal/structural concern behind Resource validation.

**Invariant:** A Resource is valid only if its complete schema, including its `constraints` sequence, is valid.

## 7. Projection non-participation

`projectResourceMetadata` MUST continue to re-run the Resource validation gate before projection, as required by RFC-005 / M3.2 / RFC-006 / RFC-007 / RFC-008 / RFC-012.

Therefore, a Resource with invalid `constraints` cannot successfully participate in projection merely because Constraints contribute no metadata. **“No projection contribution” does not mean “Constraints bypass validation.”**

For a valid Resource under this RFC:

1. **No Constraint contribution** — `constraints` do **not** contribute metadata entries; projection MUST NOT invent constraint-derived keys from `ConstraintName`s or `kind`s.
2. **Upstream projection rules unchanged** — RFC-006 annotation participation and existing Field/Relation/Operation non-participation remain as specified.
3. **Purity / one-way** — projection MUST NOT mutate the Resource; there is no reverse projection from `ResourceMetadata` to constraints.
4. **Cross-source collisions** involving schema members — out of scope.

### 7.1 Worked examples (conceptual)

```text
Resource {
  identity: (crm, Order)
  schema: {
    fields:      [ { name: total, type: number, optional: false, nullable: false } ]
    relations:   [ { name: customer, target: (crm, Customer), multiplicity: "one", optional: false, nullable: false } ]
    operations:  [ { name: create } ]
    constraints: [ { name: nonNegativeTotal, kind: "placeholder" }, { name: hasCustomer, kind: "placeholder" } ]
  }
  annotations: ∅
}

# Valid Resource (constraint names unique, grammar ok; kinds non-empty open strings)
# Field/Relation/Operation/Constraint namespaces remain independent
# projectResourceMetadata → identity + annotation-derived metadata only
#   (no Constraint contribution; no field/relation/operation→metadata contribution)

# [ { name: b, kind: "x" }, { name: a, kind: "x" } ]  ≠  [ { name: a, kind: "x" }, { name: b, kind: "x" } ]
# [ { name: a, kind: "x" }, { name: a, kind: "y" } ]  → invalid (Duplicate constraint name)
# [ { name: a, kind: "x" }, { name: b, kind: "x" } ]  → valid (duplicate kinds allowed)
# [ { name: A } ]                                    → invalid (Invalid constraint name; also missing kind)
# [ { name: a, kind: "" } ]                          → invalid (Invalid constraint kind)
# [ { name: a, kind: "x", spec: {} } ]               → invalid (Invalid constraint member)
# constraints omitted                                → invalid (Missing constraints)
# constraints: ∅                                     → valid (empty floor)
```

## 8. Design rationale

- **Framework-first** locks attachment surface and classification boundary before inventing bounds/uniqueness/defaults semantics that would force premature Field/Relation coupling.
- **Schema-level ordered sequence** matches Fields / Relations / Operations packaging and keeps constraints first-class declarations.
- **Closed `{ name, kind }`** reserves identity and classification without an opaque payload bag that would smuggle unconstrained semantics.
- **Open non-empty `kind`** avoids imposing identifier grammar or a fake closed vocabulary before real kind RFCs exist.
- **Dedicated `ConstraintName`** keeps schema collection identity domains separable and preserves independent namespaces.
- **Required member + empty valid** matches the honest post-RFC-012 schema packaging; omit-as-empty would hide a breaking shape change.
- **Resource-owned validation** matches RFC-006 / RFC-007 / RFC-008 / RFC-012; no second public validate pathway.
- **Validate-before-snapshot** preserves the closed-member lesson: members must not be “repaired” into validity.
- **Explicit projection non-participation** prevents accidental metadata catalogs via constraint names/kinds while keeping the validation gate mandatory.
- **Field / Relation / Operation floors left alone** prevents coupling a constraint framework to settled member contracts (including RFC-014 / RFC-015 nullability).

## 9. Relationship to other RFCs and milestones

| RFC / milestone | Relationship |
| --- | --- |
| RFC-001 Resource Identity | Relied upon via Resource identity; unchanged |
| RFC-002 Metadata Model | Relied upon only for projection/metadata boundary; `ConstraintName` does **not** reuse `MetadataKey` |
| RFC-003 Registry Contracts | Unchanged consumer of projected `ResourceMetadata` |
| RFC-004 Extension Model | Conceptual alignment on purity; no new composition rules |
| RFC-005 Resource Model | **Amended:** `ResourceSchema` gains required `constraints`; empty `constraints` valid |
| RFC-006 Annotations | Projection boundary relied upon; annotation projection unchanged; constraints do not contribute |
| RFC-007 Resource Fields | Structural parallel; independent namespaces; Field floor unchanged |
| RFC-008 Resource Relations | Structural parallel; independent namespaces; Relation collection rules unchanged |
| RFC-009–RFC-011 | Field types / Relation association / multiplicity relied upon unchanged |
| RFC-012 Resource Operations | Structural parallel; independent namespaces; Operation floor unchanged |
| RFC-013–RFC-015 | Optionality / nullability floors relied upon unchanged; not reopened |
| Later — concrete constraint kinds / payloads / enforcement | Extends the Constraint model beyond `{ name, kind }` |
| Later — Field/Relation-attached constraints | Orthogonal attachment models; not implied here |
| Later — Operation kind / signature / execution | Orthogonal (RFC-012 follow-on) |
| Later — Annotation vocabulary / richer projection | Orthogonal |
| M3.x Constraints implementation | Only after this RFC is Accepted and an Accepted implementation plan exists |

### Suggested sequence (non-normative)

```text
RFC-005 … RFC-015   Resource model through Relation nullability
        │
RFC-016  Constraints framework     ← this RFC (Draft)
        │
Later    Concrete constraint kinds / payloads / enforcement
Later    Operation kind / signature / execution
Later    Direction / joins; empty-vs-absent; annotation vocabulary
```

## 10. Document acceptance criteria (M2 → M3 Design Review)

This RFC may move from Draft to Accepted when Design Review finds:

1. `ConstraintName` / Constraint / ordered `constraints` sequence invariants are unambiguous.
2. Required membership, empty validity, omit/non-sequence invalidity, snapshot immutability (observable behavior), order-sensitive sequence equality, and Constraint value equality (`name` + `kind`) are unambiguous; Resource-wide equality remains out of scope.
3. `kind` openness rules are unambiguous: required non-empty string; exact equality; no reserved vocabulary; no kind semantics.
4. Independent Field/Relation/Operation/Constraint namespaces are explicit (shared name strings allowed); kind uniqueness is not required.
5. Validation ownership is clear: Resource via schema; distinct conceptual causes; validate-before-snapshot; no silent coercion/defaulting; no required public `validateConstraints`.
6. Projection non-participation is clear, including that invalid `constraints` still fail the projection validation gate.
7. Concrete kinds, payloads, enforcement, Field/Relation attachment, and Operation/`nullable` reopenings remain explicitly deferred (§1.2); RFC-007–RFC-015 member floors are not reopened.
8. Compatibility impact is clear: breaking once implemented (omit-`constraints` invalid); no dual-shape; empty `constraints` is the valid zero case.

## 11. Explicit deferrals

Deferred concerns are listed in §1.2. This ledger does not add scope; it records that reserved `ConstraintName` catalogs, builders, serialization / wire formats, host adapters, reverse projection, and any evaluation engine for constraint kinds also remain out of scope unless a future RFC says otherwise.

## 12. Compatibility / impact

| Concern | Impact |
| --- | --- |
| Existing M3.12 Resources / schemas | **Breaking once implemented:** schemas without `constraints` become invalid; callers must supply `constraints` (empty allowed) |
| Empty `constraints` | Valid zero-member case |
| Dual-shape / omit-as-empty | **Not** provided |
| RFC-007 / RFC-009 / RFC-013 / RFC-014 `fields` | Unchanged |
| RFC-008 / RFC-010 / RFC-011 / RFC-013 / RFC-015 `relations` | Unchanged |
| RFC-012 `operations` | Unchanged |
| Projection | Still annotation-only contribution; constraints never emit metadata keys; validation gate still applies |
| Public validate helpers | No `validateConstraints` / `validateResourceSchema` required by this RFC |

## 13. Open questions for Design Review (M3)

None from M2 dialogue — design locks above are complete for Draft. M3 may still return the document for revision if boundaries are insufficiently crisp.
