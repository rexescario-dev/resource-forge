# RFC-007: Resource Fields

**Date:** 2026-08-08  
**Status:** Draft  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#13](https://github.com/rexescario-dev/resource-forge/issues/13)  
**Depends on:** RFC-001 (Resource Identity — via Resource), RFC-005 (Resource Model), RFC-006 (Annotations — structural parallel; projection boundary)  
**Followed by:** Field type / constraints RFCs; Resource Relations; Resource Operations; field→metadata projection and richer cross-source composition; annotation vocabulary (separate)  
**Unblocks:** M3.4+ fields implementation planning (M4→M5) then M6 — not implementation by itself

## Primary question

> What is a Field member, what makes the Resource `fields` collection valid, and how does that collection behave for equality—without defining field types or projection?

## Thesis

RFC-007 defines `fields` as an **immutable ordered sequence of name-only Field members with unique dedicated `FieldName`s**. Empty is valid. Validity is part of Resource validity via the schema. Equality is order-sensitive. No names are reserved. Field types, constraints, and field→metadata projection are deferred. Relations and operations remain deferred and empty-only until their respective RFCs.

```text
ResourceSchema
├── fields: ordered sequence of Field { name: FieldName }  ← this RFC
├── relations: ∅ (still deferred)
└── operations: ∅ (still deferred)
```

## 1. Scope

### 1.1 Goals

1. Define `FieldName` (grammar, exact equality, Resource-local, no namespace, no reservations).
2. Define closed name-only `Field = { name: FieldName }`.
3. Define `fields` as an immutable **ordered sequence** with unique names; empty valid.
4. Define order-sensitive sequence equality and Field equality-by-name.
5. Place validation inside Resource validity via schema, with distinct conceptual error causes; no silent drop, normalize, or coerce; no public `validateFields` pathway and no `validateResourceSchema` introduced merely for this slice.
6. Explicitly defer types, constraints, defaults, relations, operations, field→metadata projection, cross-source merge, and annotation vocabulary.

### 1.2 Non-goals

This RFC does not define:

1. Field type vocabulary (scalars, named/opaque types, nullability, enums, composites)
2. Constraints, defaults, descriptions, or per-field annotations
3. Relations or operations member types / non-empty collections
4. Field → `ResourceMetadata` projection or any change to RFC-006 annotation projection
5. Cross-source projection collision / precedence / merge
6. Annotation vocabulary
7. Concrete TypeScript APIs, modules, package layout, or error code enums (conceptual separation only)
8. Resource-wide equality, builders, mutation APIs, serialization, adapters, or reverse projection
9. Changes to RFC-001–006 normative semantics beyond filling the deferred `fields` member slot from RFC-005

## 2. Terminology

| Term | Meaning |
| --- | --- |
| `FieldName` | Resource-local field identity: a camelCase ASCII string with exact equality; not a `MetadataKey` |
| Field | Name-only schema member `{ name: FieldName }` |
| `fields` | Immutable **ordered sequence** of Field members on `ResourceSchema` |
| Empty `fields` | The sequence with zero members; valid |

RFC-001 / RFC-005 / RFC-006 terms (`Resource`, `ResourceSchema`, `Annotations`, `projectResourceMetadata`, `ResourceMetadata`) keep their existing meanings.

## 3. Field identity and member model

### 3.1 FieldName

```text
FieldName ::= ^[a-z][a-zA-Z0-9]*$
```

- **Identity:** exact `FieldName` string.
- **Scope:** unique within a Resource’s `fields` sequence.
- **Namespace:** none; fields are Resource-local.
- **Grammar:** camelCase ASCII, aligned with the RFC-002 metadata *name* component regex where appropriate, but **not** reusing `MetadataKey`. Metadata and schema fields are different identity domains.
- **Equality:** exact string equality; case-sensitive; MUST NOT perform case folding, normalization, or aliasing (`userId` and `userID` are distinct).
- **Reservations:** none in this RFC. Every grammar-valid `FieldName` is allowed. No `rf` prefix, framework-reserved field catalog, or special names (`id`, `type`, `createdAt`, etc.). Future RFCs may reserve names only by explicit statement; existing valid Resources MUST NOT become invalid merely because of an implied reservation in this RFC.

### 3.2 Field

```text
Field {
  name: FieldName
}
```

- `name` is the **only** Field member property.
- A Field is valid iff its `name` is a valid `FieldName`.
- Every member MUST conform exactly to the RFC-007 `Field` shape: `{ name: FieldName }`. Members containing additional properties are invalid.
- No type, nullability, constraints, defaults, descriptions, annotations, or arbitrary payload.
- Later RFCs may extend the Field model explicitly. Unknown properties MUST NOT silently become part of Field semantics.
- Two Fields are equal iff their `name`s are exactly equal.

## 4. `fields` ordered sequence

### 4.1 Logical shape

```text
fields: ordered sequence of Field
```

`fields` may be empty. Concrete array / list representation is deferred; the semantic contract is an ordered sequence.

### 4.2 Invariants

| Invariant | Rule |
| --- | --- |
| Snapshot | Once a `fields` sequence is included in a Resource snapshot, callers MUST NOT be able to mutate the sequence or its members through aliases. Any modification produces a new sequence/snapshot. |
| Ordered | Declaration order is semantically meaningful and MUST be preserved in the snapshot. |
| Unique names | At most one Field per `FieldName`; duplicates are invalid. |
| Empty | Zero members; valid. |
| Closed member | Every member MUST conform exactly to `{ name: FieldName }`; members with additional properties are invalid. |
| Not metadata | Field identity is not `MetadataKey`; fields are not annotation entries. |

Implementations MUST NOT silently drop, merge, normalize, reorder for semantic equality, or reinterpret conflicting or invalid field members.

### 4.3 Equality

Two `fields` sequences are equal if and only if they have the same length and, for every index `i`, `fields_a[i]` equals `fields_b[i]` (Field equality = exact `FieldName` equality).

- Equality is **order-sensitive**.
- Same Fields in a different order are **not** equal.
- Empty `fields` sequences are equal to each other.

Resource-wide equality remains out of scope for this RFC unless defined elsewhere.

### 4.4 Ownership boundaries

| Layer | Owns | Does not own |
| --- | --- | --- |
| Resource schema `fields` | Authoritative ordered Field sequence | Projected metadata, registry state, field types |
| Projection | Resource → `ResourceMetadata` (unchanged participation rules for annotations) | Field→metadata contribution (deferred) |
| Registry | identity ↔ `ResourceMetadata` snapshots | Schema field state |
| Composition (RFC-004) | Metadata contribution composition | Field authoring or schema membership |

`relations` and `operations` remain empty-only until their respective RFCs. This RFC does not widen those collections.

## 5. Validation

`fields` validity is part of Resource validity via the schema (RFC-005 validation / implementation `validateResource`).

A Resource’s `fields` sequence is valid only if all of the following hold:

1. Every member conforms exactly to `{ name: FieldName }` (no additional properties).
2. Each `name` satisfies the `FieldName` grammar.
3. `FieldName`s are unique within the sequence; duplicates are invalid.
4. Empty (zero members) is valid.

Invalid `fields` → invalid Resource.

### 5.1 Error ownership

Conceptual failure causes (concrete codes and TypeScript shapes are deferred; separation is normative):

| Cause | When |
| --- | --- |
| `invalid_field_name` | `name` fails `FieldName` grammar |
| `duplicate_field_name` | repeated `FieldName` in the sequence |
| `invalid_field_member` | member is not exactly `{ name: FieldName }` |

- Field/collection failures are Resource/schema validation failures.
- They MUST remain distinct from RFC-002 metadata validation failures and from RFC-006 annotation validation failures.
- No silent dropping, normalization, or coercion.
- A separate public `validateFields` API is **not** required by this RFC.
- `validateResourceSchema` MUST NOT be introduced merely to solve this slice; schema-level checks remain an internal/structural concern behind Resource validation.

**Invariant:** A Resource is valid only if its complete schema, including its `fields` sequence, is valid.

## 6. Projection non-participation

`projectResourceMetadata` MUST continue to re-run the Resource validation gate before projection, as required by RFC-005 / M3.2 / RFC-006.

For a valid Resource under this RFC:

1. **No field contribution** — `fields` do **not** contribute metadata entries.
2. **No invented vocabulary** — projection MUST NOT invent field-derived keys, envelopes, or reserved metadata from `FieldName`s.
3. **Annotations unchanged** — RFC-006 annotation participation remains as specified; this RFC does not alter it.
4. **Cross-source collisions** involving schema members — out of scope.
5. **Purity / one-way** — projection MUST NOT mutate the Resource; there is no reverse projection from `ResourceMetadata` to fields.

### 6.1 Worked examples (conceptual)

```text
Resource {
  identity: (crm, Customer)
  schema: {
    fields: [ { name: id }, { name: email } ]   # order matters
    relations: ∅
    operations: ∅
  }
  annotations: ∅
}

# Valid Resource (names unique, grammar ok, relations/operations empty)
# projectResourceMetadata → identity + annotation-derived metadata only
#   (no field→metadata contribution in RFC-007; empty annotations ⇒ no annotation entries)

# [ { name: email }, { name: id } ]  ≠  [ { name: id }, { name: email } ]
# [ { name: id }, { name: id } ]     → invalid Resource (duplicate_field_name)
# [ { name: Id } ]                   → invalid Resource (invalid_field_name)
# [ { name: id, type: "string" } ]   → invalid Resource (invalid_field_member)
```

## 7. Design rationale

- **RFC-006-parallel contract** establishes the stable aggregate first (identity + ordered sequence + validation + equality), then adds vocabulary and composition in later RFCs.
- **Ordered sequence** locks deterministic declaration order for later serialization, generated interfaces, and documentation without retrofitting.
- **Closed name-only Field** avoids half-open type placeholders that invite premature vocabulary.
- **Dedicated `FieldName` (not `MetadataKey`)** keeps schema and metadata identity domains separate and prevents `FieldName` from accidentally becoming metadata vocabulary.
- **Resource-owned validation** matches RFC-006; no second public validate pathway.
- **Explicit projection non-participation** prevents accidental metadata catalogs via field names.
- **No reserved names** keeps this RFC about identity and collection shape, not framework catalogs.

## 8. Relationship to other RFCs and milestones

| RFC / milestone | Relationship |
| --- | --- |
| RFC-001 Resource Identity | Relied upon via Resource identity; unchanged |
| RFC-002 Metadata Model | Relied upon only for projection/metadata boundary; `FieldName` does **not** reuse `MetadataKey` (grammar alignment of the *name* component is informative consistency only) |
| RFC-003 Registry Contracts | Unchanged consumer of projected `ResourceMetadata` |
| RFC-004 Extension Model | Conceptual alignment on purity; no new composition rules |
| RFC-005 Resource Model | Extends the deferred `fields` member slot with member/sequence semantics; empty `fields` remains valid; relations/operations still deferred |
| RFC-006 Annotations | Structural parallel (container contract before vocabulary); annotation projection unchanged; fields do not participate in projection here |
| Later — Field types / constraints | Extends the Field model beyond `{ name }` |
| Later — Relations / Operations | Member types and non-empty collections for those slots |
| Later — Field projection / cross-source | Schema→metadata contribution and collision rules |
| Later — Annotation vocabulary | Named annotation keys (orthogonal) |
| M3.4+ implementation | Only after this RFC is Accepted and an Accepted implementation plan exists |

### Suggested sequence (non-normative)

```text
RFC-005  Resource
        │
RFC-006  Annotations
        │
RFC-007  Resource Fields          ← this RFC (Draft)
        │
Later    Field types / constraints
        │
Later    Relations / Operations
        │
Later    Field projection / richer composition
```

## 9. Document acceptance criteria (M2 → M3 Design Review)

This RFC may move from Draft to Accepted when Design Review finds:

1. `FieldName` / Field / ordered `fields` sequence invariants are unambiguous.
2. Uniqueness, empty validity, snapshot immutability (observable behavior), and order-sensitive equality are unambiguous.
3. Validation ownership is clear: Resource via schema; distinct conceptual causes; no silent coercion; no required public `validateFields`.
4. Type vocabulary, constraints, relations, operations, field projection, cross-source merge, and annotation vocabulary remain explicitly deferred.
5. No normative TypeScript API or RFC-001–006 semantic breakage beyond filling the `fields` slot.

## 10. Explicit deferrals

- Field type vocabulary, nullability, constraints, defaults, descriptions, per-field annotations
- Concrete TypeScript representation and public APIs
- Relations and operations member semantics / non-empty collections
- Field → metadata projection; cross-source collision, precedence, and merge
- Annotation vocabulary
- Reserved `FieldName` catalogs (only via a future explicit RFC)
- Resource builders, editing workflows, serialization / wire formats, host adapters, reverse projection

## 11. Implementation gate (non-normative)

Coding that implements non-empty `fields` or RFC-007 field validation rules begins only after:

1. this RFC is Accepted;
2. an Accepted implementation plan for the relevant M3 slice exists.

Prefer **one pull request per tracking issue** for that delivery slice (Accepted plan + implementation together). Do not merge a plan-only PR before code for the same slice except as recovery.

No production field type vocabulary, field→metadata projection, relations/operations widening, or annotation vocabulary SHALL be introduced under this RFC alone.
