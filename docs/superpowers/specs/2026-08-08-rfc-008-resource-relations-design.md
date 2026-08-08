# RFC-008: Resource Relations

**Date:** 2026-08-08  
**Status:** Accepted  
**M3:** Accepted (2026-08-08) — Design Review; no design blockers; Relations-only structural floor confirmed; independent Field/Relation namespaces; no Relation projection contribution; Operations remains empty-only  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#17](https://github.com/rexescario-dev/resource-forge/issues/17)  
**Depends on:** RFC-001 (Resource Identity — via Resource), RFC-005 (Resource Model), RFC-006 (Annotations — projection boundary), RFC-007 (Resource Fields — parallel floor; independent namespaces)  
**Followed by:** Resource Operations; Field type / constraints RFCs; association / target / cardinality / direction RFCs; field→metadata projection and richer cross-source composition; annotation vocabulary (separate); optional later cross-collection schema namespace  
**Unblocks:** M3.5+ relations implementation planning (M4→M5) then M6 — not implementation by itself

## Primary question

> What is a Relation member, what makes the Resource `relations` collection valid, and how does that collection behave for equality—without defining association semantics or projection contribution?

## Thesis

RFC-008 defines `relations` as an **immutable ordered sequence of name-only Relation members with unique dedicated `RelationName`s**. Empty (`relations` with zero members) is valid. Validity is part of Resource validity via the schema. Collection equality is order-sensitive. No RelationName values are reserved by this RFC. Association semantics (target identity, cardinality, direction, local field handles) and any Relation contribution to `projectResourceMetadata` are deferred. This RFC does not alter the empty-only `operations` constraint from RFC-005 / prior slices. `fields` remains as defined by RFC-007.

```text
ResourceSchema
├── fields: ordered sequence of Field { name: FieldName }           ← RFC-007
├── relations: ordered sequence of Relation { name: RelationName }  ← this RFC
└── operations: ∅ (still deferred / empty-only)
```

Observable snapshot immutability is required; this RFC does not prescribe a particular TypeScript container or API for achieving it.

## 1. Scope

### 1.1 Goals

1. Define `RelationName` (grammar, exact equality, Resource-local uniqueness within `relations`, dedicated identity domain, no RFC-008 reservations).
2. Define closed name-only `Relation = { name: RelationName }`.
3. Define `relations` as an immutable **ordered sequence** with unique names within the sequence; empty valid.
4. Define order-sensitive sequence equality and Relation value equality-by-name (not Resource-wide equality).
5. State **independent namespaces** relative to `fields`: uniqueness is per collection; a Field and a Relation MAY share the same name string on one Resource.
6. Place validation inside Resource validity via schema, with distinct conceptual error causes; validate-before-snapshot (invalid candidates are rejected before they can become Resource snapshot state); no silent drop, normalize, coerce, strip, dedupe, or reorder-to-repair; no public `validateRelations` pathway and no `validateResourceSchema` introduced merely for this slice.
7. State that RFC-008 introduces **no Relation contribution** to the existing `projectResourceMetadata` projection.
8. Explicitly defer association semantics, Operations non-empty collections, field→metadata projection, cross-collection schema namespace, cross-source merge, and annotation vocabulary.

### 1.2 Non-goals

This RFC does not define:

1. Target identity, cardinality, direction, local field handles, or other association / connection semantics
2. A unified Resource schema namespace across `fields` / `relations` / `operations`
3. Field type vocabulary, constraints, defaults, or per-field annotations
4. Field → `ResourceMetadata` projection or any change to RFC-006 annotation projection
5. Relation → `ResourceMetadata` contribution (none is introduced here)
6. Cross-source projection collision / precedence / merge
7. Annotation vocabulary
8. Operations member types / non-empty collections (empty-only constraint unchanged)
9. Concrete TypeScript APIs, modules, package layout, or error code enums (conceptual separation only)
10. Resource-wide equality, builders, mutation APIs, serialization, adapters, or reverse projection
11. Changes to RFC-001–007 normative semantics beyond filling the deferred `relations` member slot from RFC-005

## 2. Terminology

| Term | Meaning |
| --- | --- |
| `RelationName` | Resource-local relation identity: an ASCII string satisfying the normative grammar `^[a-z][a-zA-Z0-9]*$`, with exact string equality and a dedicated identity domain — not a `FieldName` and not a `MetadataKey` |
| Relation | Name-only schema member `{ name: RelationName }` |
| `relations` | Immutable **ordered sequence** of Relation members on `ResourceSchema` |
| Empty `relations` | The sequence with zero members; valid |

RFC-001 / RFC-005 / RFC-006 / RFC-007 terms (`Resource`, `ResourceSchema`, `Field`, `FieldName`, `fields`, `Annotations`, `projectResourceMetadata`, `ResourceMetadata`) keep their existing meanings.

## 3. Relation identity and member model

### 3.1 RelationName

```text
RelationName ::= ^[a-z][a-zA-Z0-9]*$
```

- **Identity:** exact `RelationName` string.
- **Scope:** unique within a Resource’s `relations` sequence.
- **Namespace:** none shared with `fields` or metadata; relations are Resource-local and collection-scoped.
- **Grammar:** The regex above is the **sole normative** `RelationName` constraint. The label “camelCase” is descriptive only and MUST NOT be read as an additional rule beyond `^[a-z][a-zA-Z0-9]*$` (e.g. `userID` is grammar-valid). The pattern matches the RFC-007 `FieldName` grammar for surface consistency but **does not** reuse the `FieldName` type/domain and **does not** reuse `MetadataKey`.
- **Equality:** exact string equality; case-sensitive; MUST NOT perform case folding, normalization, or aliasing (`authorId` and `authorID` are distinct).
- **Reservations:** none in this RFC. Every grammar-valid `RelationName` is allowed. No `rf` prefix, framework-reserved relation catalog, or special names. Future RFCs may reserve names only by explicit statement. RFC-008 introduces no reservation semantics.

### 3.2 Relation

```text
Relation {
  name: RelationName
}
```

- `name` is the **only** Relation member property.
- A Relation is valid only when it is a closed Relation value containing exactly one `name` member whose value is a valid `RelationName`.
- Every member MUST conform exactly to the RFC-008 `Relation` shape: `{ name: RelationName }`. Members containing additional properties are **invalid** (not ignored or stripped).
- No target identity, cardinality, direction, local field handle, type, nullability, constraints, defaults, descriptions, annotations, or arbitrary payload.
- Later RFCs may extend the Relation model explicitly. Unknown properties MUST NOT silently become part of Relation semantics.
- Two Relation **values** are equal iff their `RelationName` strings are exactly equal.

### 3.3 Independent namespaces (Fields vs Relations)

| Rule | Statement |
| --- | --- |
| Field uniqueness | `FieldName`s MUST be unique within `fields` (RFC-007) |
| Relation uniqueness | `RelationName`s MUST be unique within `relations` (this RFC) |
| Cross-collection | A Field and a Relation MAY have the same name string on the same Resource |
| Unified schema namespace | **Not** introduced by RFC-008 |

Example (valid):

```text
fields:    [ { name: author } ]
relations: [ { name: author } ]
```

Cross-collection naming semantics remain outside this RFC and may be addressed when Operations or a later schema-level vocabulary requires them.

## 4. `relations` ordered sequence

### 4.1 Logical shape

```text
relations: ordered sequence of Relation
```

`relations` may be empty. Concrete array / list representation is deferred; the semantic contract is an ordered sequence.

### 4.2 Invariants

| Invariant | Rule |
| --- | --- |
| Snapshot | Once a `relations` sequence is included in a Resource snapshot, callers MUST NOT be able to mutate the snapshot's relation sequence or its members through the exposed Resource state. Any modification produces a new sequence/snapshot. |
| Ordered | Declaration order is preserved and participates in `relations` sequence equality. |
| Unique names | At most one Relation per `RelationName` within the sequence; duplicates are invalid. |
| Empty | Zero members; valid. |
| Closed member | Every member MUST be a closed Relation value with exactly one `name` whose value is a valid `RelationName`; members with additional properties are invalid. |
| Not metadata | Relation identity is not `MetadataKey`; relations are not annotation entries. |
| Not FieldName | `RelationName` is a dedicated domain; coexistence with an equal `FieldName` string does not merge identities. |

Implementations MUST NOT silently drop, merge, normalize, reorder for semantic equality, strip unknown properties, deduplicate, or reinterpret conflicting or invalid relation members.

### 4.3 Equality

Two `relations` sequences are equal if and only if they have the same length and, for every index `i`, Relation value equality holds between `relations_a[i]` and `relations_b[i]` (exact `RelationName` equality).

- Equality is **order-sensitive**.
- Same Relations in a different order are **not** equal.
- Empty `relations` sequences are equal to each other.

Resource-wide equality remains out of scope for this RFC unless defined elsewhere.

### 4.4 Ownership boundaries

| Layer | Owns | Does not own |
| --- | --- | --- |
| Resource schema `relations` | Authoritative ordered Relation sequence | Projected metadata, registry state, association semantics |
| Projection | Resource → `ResourceMetadata` (unchanged participation rules for annotations) | Relation contribution (none in this RFC); field→metadata contribution (still deferred) |
| Registry | identity ↔ `ResourceMetadata` snapshots | Schema relation state |
| Composition (RFC-004) | Metadata contribution composition | Relation authoring or schema membership |

`operations` remains empty-only until its respective RFC. This RFC does not widen that collection or reinterpret the empty-only constraint.

## 5. Validation

`relations` validity is part of Resource validity via the schema (RFC-005 validation / implementation `validateResource`).

A Resource’s `relations` sequence is valid only if all of the following hold:

1. Every member is a closed Relation value containing exactly one `name` member whose value is a valid `RelationName` (shape validation and name validation are separate checks).
2. Each `name` satisfies the `RelationName` grammar.
3. `RelationName`s are unique within the sequence; duplicates are invalid.
4. Empty (zero members) is valid.

Invalid `relations` → invalid Resource.

**Validate-before-snapshot:** Invalid candidates MUST be rejected before they can become Resource snapshot state. Implementations MUST NOT transform an invalid candidate into a valid Relation by discarding information (including stripping unknown properties) before validation.

### 5.1 Error ownership

Conceptual failure causes (concrete codes and TypeScript shapes are deferred; separation is normative):

| Cause | When |
| --- | --- |
| Invalid relation name | `name` fails `RelationName` grammar |
| Duplicate relation name | repeated `RelationName` in the sequence |
| Invalid relation member | member is not a closed Relation with exactly one `name` member |

- Relation/collection failures are Resource/schema validation failures.
- They MUST remain distinct from RFC-002 metadata validation failures, RFC-006 annotation validation failures, and RFC-007 field validation failures.
- No silent dropping, normalization, or coercion.
- A separate public `validateRelations` API is **not** required by this RFC.
- `validateResourceSchema` MUST NOT be introduced merely to solve this slice; schema-level checks remain an internal/structural concern behind Resource validation.

**Invariant:** A Resource is valid only if its complete schema, including its `relations` sequence, is valid.

## 6. Projection non-participation

`projectResourceMetadata` MUST continue to re-run the Resource validation gate before projection, as required by RFC-005 / M3.2 / RFC-006 / RFC-007.

Therefore, a Resource with invalid `relations` cannot successfully participate in projection merely because Relations contribute no metadata. **“No projection contribution” does not mean “Relations bypass validation.”**

For a valid Resource under this RFC:

1. **No Relation contribution** — RFC-008 introduces no Relation contribution to the existing projection; `relations` do **not** contribute metadata entries.
2. **No invented vocabulary** — projection MUST NOT invent relation-derived keys, envelopes, or reserved metadata from `RelationName`s.
3. **Annotations unchanged** — RFC-006 annotation participation remains as specified; this RFC does not alter it.
4. **Fields unchanged** — RFC-007 field projection rules remain unchanged.
5. **Cross-source collisions** involving schema members — out of scope.
6. **Purity / one-way** — projection MUST NOT mutate the Resource; there is no reverse projection from `ResourceMetadata` to relations.

### 6.1 Worked examples (conceptual)

```text
Resource {
  identity: (crm, Order)
  schema: {
    fields:    [ { name: author }, { name: total } ]     # RFC-007
    relations: [ { name: author }, { name: lineItems } ] # order matters; "author" ok vs Field
    operations: ∅
  }
  annotations: ∅
}

# Valid Resource (relation names unique, grammar ok, fields ok, operations empty)
# Field "author" and Relation "author" coexist (independent namespaces)
# projectResourceMetadata → identity + annotation-derived metadata only
#   (no Relation contribution; no field→metadata contribution; empty annotations ⇒ no annotation entries)

# [ { name: lineItems }, { name: author } ]  ≠  [ { name: author }, { name: lineItems } ]
# [ { name: author }, { name: author } ]     → invalid Resource (Duplicate relation name)
# [ { name: Author } ]                       → invalid Resource (Invalid relation name)
# [ { name: author, target: "User" } ]       → invalid Resource (Invalid relation member)
```

## 7. Design rationale

- **RFC-007-parallel contract** establishes the stable `relations` aggregate first (identity + ordered sequence + validation + equality), then adds association semantics in later RFCs.
- **Ordered sequence** locks deterministic declaration order for later serialization, generated interfaces, and documentation without retrofitting; order participates in sequence equality, not association behavior.
- **Closed name-only Relation** avoids half-open association placeholders (e.g. premature `target`) that invite forward-compatible semantics before an association RFC exists.
- **Dedicated `RelationName` (not `FieldName`, not `MetadataKey`)** keeps schema collection identity domains separable and preserves independent namespaces.
- **Independent Field/Relation namespaces** avoid inventing a unified schema namespace before Operations exists.
- **Resource-owned validation** matches RFC-006 / RFC-007; no second public validate pathway.
- **Validate-before-snapshot** preserves the Fields M5 lesson: closed members must not be “repaired” into validity.
- **Explicit projection non-participation** prevents accidental metadata catalogs via relation names while keeping the validation gate mandatory.
- **No reserved names** keeps this RFC about identity and collection shape, not framework catalogs.
- **Operations left alone** prevents coupling a Relations floor to an Operations floor.

## 8. Relationship to other RFCs and milestones

| RFC / milestone | Relationship |
| --- | --- |
| RFC-001 Resource Identity | Relied upon via Resource identity; unchanged |
| RFC-002 Metadata Model | Relied upon only for projection/metadata boundary; `RelationName` does **not** reuse `MetadataKey` |
| RFC-003 Registry Contracts | Unchanged consumer of projected `ResourceMetadata` |
| RFC-004 Extension Model | Conceptual alignment on purity; no new composition rules |
| RFC-005 Resource Model | Extends the deferred `relations` member slot with member/sequence semantics; empty `relations` remains valid; `operations` still empty-only |
| RFC-006 Annotations | Projection boundary relied upon; annotation projection unchanged; relations do not contribute |
| RFC-007 Resource Fields | Structural parallel; independent namespaces; fields contract unchanged |
| Later — Resource Operations | Member types and non-empty collections for the `operations` slot |
| Later — Association / target / cardinality / direction | Extends the Relation model beyond `{ name }` |
| Later — Field types / constraints | Orthogonal Field model extension |
| Later — Field projection / cross-source | Schema→metadata contribution and collision rules |
| Later — Annotation vocabulary | Named annotation keys (orthogonal) |
| Later — Cross-collection schema namespace | Optional; not implied by this RFC |
| M3.5+ implementation | Only after this RFC is Accepted and an Accepted implementation plan exists |

### Suggested sequence (non-normative)

```text
RFC-005  Resource
        │
RFC-006  Annotations
        │
RFC-007  Resource Fields
        │
RFC-008  Resource Relations     ← this RFC (Accepted)
        │
Later    Resource Operations
        │
Later    Association semantics / Field types / Field projection / vocabulary
```

## 9. Document acceptance criteria (M2 → M3 Design Review)

This RFC may move from Draft to Accepted when Design Review finds:

1. `RelationName` / Relation / ordered `relations` sequence invariants are unambiguous.
2. Uniqueness within `relations`, empty validity, snapshot immutability (observable behavior), order-sensitive sequence equality, and Relation value equality are unambiguous; Resource-wide equality remains out of scope.
3. Independent Field/Relation namespaces are explicit (shared name strings allowed).
4. Validation ownership is clear: Resource via schema; distinct conceptual causes; validate-before-snapshot; no silent coercion; no required public `validateRelations`.
5. Projection non-participation is clear, including that invalid `relations` still fail the projection validation gate.
6. Association semantics, Operations non-empty collections, field→metadata projection, cross-collection schema namespace, cross-source merge, and annotation vocabulary remain explicitly deferred.
7. No normative TypeScript API or RFC-001–007 semantic breakage beyond filling the `relations` slot.

## 10. Explicit deferrals

- Target identity, cardinality, direction, local field handles, association / connection semantics
- Unified cross-collection schema namespace
- Field type vocabulary, nullability, constraints, defaults, descriptions, per-field annotations
- Concrete TypeScript representation and public APIs
- Operations member semantics / non-empty collections
- Field → metadata projection; Relation → metadata contribution beyond “none”; cross-source collision, precedence, and merge
- Annotation vocabulary
- Reserved `RelationName` catalogs (only via a future explicit RFC)
- Resource builders, editing workflows, serialization / wire formats, host adapters, reverse projection

## 11. Compatibility / impact

| Concern | Impact |
| --- | --- |
| Existing empty `relations` Resources | Remain valid; empty sequence is still valid |
| RFC-007 `fields` | Unchanged; coexistence with equal name strings newly allowed once non-empty `relations` exist |
| RFC-006 projection | Unchanged participation rules; Relations add no contribution |
| `operations` empty-only | Unchanged by this RFC |
| Existing empty-only / deferred `relations` slot | Existing implementations that currently treat `relations` as an empty-only/deferred slot require the RFC-008 implementation to widen that slot only after Acceptance and an Accepted implementation plan |

## 12. Decision record

| Decision | Choice | Why |
| --- | --- | --- |
| Member shape | Name-only `{ name }` | Structural floor without association semantics |
| Collection | Ordered sequence | Parallel to Fields; order participates in equality |
| Name domain | Dedicated `RelationName`, same grammar as `FieldName` | Symmetry without shared type/uniqueness |
| Namespaces | Independent of Fields | Avoid unified schema namespace before Operations |
| Projection | No Relation contribution; validation gate retained | Prevent metadata catalogs; no validation bypass |
| Operations | Out of scope / still empty-only | Separate RFC |
| Validate-before-snapshot | Required | Preserve Fields M5 lesson for closed members |

## 13. Implementation gate (non-normative)

Coding that implements non-empty `relations` or RFC-008 relation validation rules begins only after:

1. this RFC is Accepted;
2. an Accepted implementation plan for the relevant M3 slice exists.

Prefer **one pull request per tracking issue** for that delivery slice (Accepted plan + implementation together). Do not merge a plan-only PR before code for the same slice except as recovery.

No production association semantics, Operations widening, field→metadata projection, annotation vocabulary, or unified schema namespace SHALL be introduced under this RFC alone.
