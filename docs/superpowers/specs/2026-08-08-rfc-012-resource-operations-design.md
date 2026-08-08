# RFC-012: Resource Operations

**Date:** 2026-08-08  
**Status:** Draft  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#36](https://github.com/rexescario-dev/resource-forge/issues/36)  
**Depends on:** RFC-001 (Resource Identity — via Resource), RFC-005 (Resource Model — `operations` slot), RFC-006 (Annotations — projection boundary), RFC-007 (Resource Fields — parallel floor; independent namespaces), RFC-008 (Resource Relations — parallel floor; independent namespaces), RFC-009 / RFC-010 / RFC-011 (Fields/Relations member contracts — relied upon unchanged)  
**Followed by:** Operation kind / signature / input-output; execution / handlers; optionality / nullability; annotation vocabulary; field→metadata projection; direction / joins / cascade / loading / persistence (orthogonal; not implied here)  
**Unblocks:** M3.9 Operations implementation planning (M4→M5), then implementation (M6), after this RFC is Accepted — not implementation by itself  
**Amends:** RFC-005's deferred `operations` member slot by supplying the Operation member and sequence semantics. It does not alter RFC-005's Resource aggregate model or any previously accepted Field/Relation semantics. Does **not** amend RFC-009 Field shape, RFC-010 association floor, or RFC-011 `{ name, target, multiplicity }` / `"one"|"many"`.

## Primary question

> What is an Operation member, what makes the Resource `operations` collection valid, and how does that collection behave for equality—without defining kind, signatures, execution, or projection contribution?

## Thesis

RFC-012 defines `operations` as an **ordered sequence of name-only Operation members with unique dedicated `OperationName`s**. Empty (`operations` with zero members) remains valid. Validity is part of Resource validity via the schema. Collection equality is order-sensitive. No OperationName values are reserved by this RFC. Kind, signature, input/output, execution/runtime behavior, and any Operation contribution to `projectResourceMetadata` are deferred. This RFC does **not** reopen or reinterpret Field or Relation member contracts (RFC-007 / RFC-009 / RFC-008 / RFC-010 / RFC-011).

```text
ResourceSchema
├── fields: ordered sequence of Field { name, type }                 ← RFC-007 / RFC-009 (unchanged)
├── relations: ordered sequence of Relation { name, target, multiplicity }  ← RFC-008 / RFC-010 / RFC-011 (unchanged)
└── operations: ordered sequence of Operation { name: OperationName }       ← this RFC
```

The logical contract is an ordered sequence. Separately, once that sequence is part of a Resource snapshot, the exposed Resource state MUST NOT permit mutation of it (§4.2). This RFC does not prescribe a particular collection implementation or TypeScript API.

**RFC-005 owns the schema slot names; RFC-012 owns Operation identity, closed member shape, and `operations` sequence semantics.**

## 1. Scope

### 1.1 Goals

1. Define `OperationName` (grammar, exact equality, uniqueness within `operations`, dedicated identity domain, no RFC-012 reservations).
2. Define closed name-only `Operation = { name: OperationName }` (exactly one declared semantic property: `name`).
3. Define `operations` as an **ordered sequence** with unique names within the sequence; empty valid (RFC-005 empty floor preserved as the zero-member case).
4. Define order-sensitive sequence equality and Operation value equality-by-name (not Resource-wide equality).
5. State **independent namespaces** relative to `fields` and `relations`: uniqueness is per collection; a Field, Relation, and Operation MAY share the same name string on one Resource.
6. Place validation inside Resource validity via schema, with distinct conceptual error causes; validate-before-snapshot; no silent repair; no public `validateOperations` pathway and no `validateResourceSchema` introduced merely for this slice.
7. State that RFC-012 introduces **no Operation contribution** to the existing `projectResourceMetadata` projection.
8. Once Accepted and implemented, replace the empty-only implementation floor for `operations` with the sequence contract defined here (validity expansion; existing empty-`operations` Resources remain valid).
9. Explicitly defer kind, signature, input/output, and execution (see §1.2); leave RFC-009 / RFC-010 / RFC-011 authoritative and unchanged.

### 1.2 Non-goals

This RFC does not define:

1. Operation `kind`, verb catalogs, CRUD taxonomies, or HTTP/RPC method mapping
2. Signatures, parameters, return types, input/output schemas, or error contracts
3. Execution, handlers, runtime dispatch, side effects, or transactional semantics
4. Persistence / ORM mapping, loading / fetch, joins, cascade, direction, or multiplicity/bounds on operations
5. Optional vs required operations; nullability of operation slots or results
6. A unified Resource schema namespace across `fields` / `relations` / `operations`
7. Field or Relation member-shape changes (RFC-009 / RFC-010 / RFC-011 remain as Accepted)
8. Field → `ResourceMetadata` projection or any change to RFC-006 annotation projection
9. Operation → `ResourceMetadata` contribution (none is introduced here)
10. Cross-source projection collision / precedence / merge
11. Annotation vocabulary
12. Concrete TypeScript APIs, modules, package layout, or error code enums (conceptual separation only)
13. Resource-wide equality, builders, mutation APIs, serialization, adapters, or reverse projection
14. Dual-shape transitional validity that would accept open/extra Operation members alongside the closed name-only floor

## 2. Terminology

| Term | Meaning |
| --- | --- |
| `OperationName` | Name identifying an Operation within a Resource's `operations` sequence: an ASCII string satisfying the normative grammar `^[a-z][a-zA-Z0-9]*$`, with exact string equality and a dedicated identity domain — not a `FieldName`, not a `RelationName`, and not a `MetadataKey` |
| Operation | Name-only schema member `{ name: OperationName }` |
| `operations` | **Ordered sequence** of Operation members on `ResourceSchema` |
| Empty `operations` | The sequence with zero members; valid (preserves the RFC-005 empty-collection floor as the zero case) |
| Declaration / contract floor | What this RFC specifies: named operation declarations on a Resource — not executable behavior |

RFC-001 / RFC-005 / RFC-006 / RFC-007 / RFC-008 / RFC-009 / RFC-010 / RFC-011 terms (`Resource`, `ResourceSchema`, `Field`, `FieldName`, `fields`, `Relation`, `RelationName`, `relations`, `Annotations`, `projectResourceMetadata`, `ResourceMetadata`) keep their existing meanings.

## 3. Operation identity and member model

### 3.1 OperationName

```text
OperationName ::= ^[a-z][a-zA-Z0-9]*$
```

- **Identity:** exact `OperationName` string.
- **Scope:** unique within a Resource’s `operations` sequence.
- **Namespace:** none shared with `fields`, `relations`, or metadata; uniqueness is scoped to the Resource's `operations` sequence.
- **Grammar:** The regex above is the **sole normative** `OperationName` constraint. The label “camelCase” is descriptive only and MUST NOT be read as an additional rule beyond `^[a-z][a-zA-Z0-9]*$` (e.g. `createID` is grammar-valid). The pattern matches the RFC-007 `FieldName` / RFC-008 `RelationName` grammar for surface consistency but **does not** reuse those types/domains and **does not** reuse `MetadataKey`.
- **Equality:** exact string equality; case-sensitive; MUST NOT perform case folding, normalization, or aliasing (`createOrder` and `createORDER` are distinct).
- **Reservations:** none in this RFC. Every grammar-valid `OperationName` is allowed. No `rf` prefix, framework-reserved operation catalog, or special names (`create`, `read`, `update`, `delete`, etc.). Future RFCs may reserve names or introduce kind vocabulary only by explicit statement. RFC-012 introduces no reservation or kind semantics.

### 3.2 Operation

```text
Operation {
  name: OperationName
}
```

- An Operation has exactly one declared semantic property, `name`. Additional semantic properties are invalid.
- An Operation is valid only when that `name` is a valid `OperationName` and the candidate conforms to the closed RFC-012 shape `{ name: OperationName }`.
- An Operation candidate containing additional semantic properties is **invalid** (not ignored or stripped).
- No `kind`, signature, input/output, execution, or other deferred semantics are part of this floor.
- Later RFCs may extend the Operation model explicitly. Unknown semantic properties MUST NOT silently become part of Operation semantics.
- Two Operation **values** are equal iff their `OperationName` strings are exactly equal.

### 3.3 Independent namespaces (Fields / Relations / Operations)

| Rule | Statement |
| --- | --- |
| Field uniqueness | `FieldName`s MUST be unique within `fields` (RFC-007) |
| Relation uniqueness | `RelationName`s MUST be unique within `relations` (RFC-008) |
| Operation uniqueness | `OperationName`s MUST be unique within `operations` (this RFC) |
| Cross-collection | A Field, a Relation, and an Operation MAY have the same name string on the same Resource |
| Unified schema namespace | **Not** introduced by RFC-012 |

Example (valid):

```text
fields:     [ { name: create, type: string } ]
relations:  [ { name: create, target: (crm, Order), multiplicity: "one" } ]
operations: [ { name: create } ]
```

Cross-collection naming semantics beyond coexistence remain outside this RFC and may be addressed when a later schema-level vocabulary requires them.

## 4. `operations` ordered sequence

### 4.1 Logical shape

```text
operations: ordered sequence of Operation
```

`operations` may be empty. Concrete array / list representation is deferred; the semantic contract is an ordered sequence.

### 4.2 Invariants

| Invariant | Rule |
| --- | --- |
| Snapshot | Once an `operations` sequence is part of a Resource snapshot, the exposed Resource state MUST NOT permit mutation of that sequence or its Operation members. Any change MUST produce a new Resource/snapshot state. |
| Ordered | Declaration order is preserved and participates in `operations` sequence equality. |
| Unique names | At most one Operation per `OperationName` within the sequence; duplicates are invalid. |
| Empty | Zero members; valid. |
| Closed member | Every member MUST be a closed Operation with exactly one declared semantic property, `name`, whose value is a valid `OperationName`; candidates with additional semantic properties are invalid. |
| Not metadata | Operation identity is not `MetadataKey`; operations are not annotation entries. |
| Not FieldName / RelationName | `OperationName` is a dedicated domain; coexistence with an equal `FieldName` or `RelationName` string does not merge identities. |

Implementations MUST NOT silently drop, merge, normalize, reorder for semantic equality, strip additional semantic properties, deduplicate, or reinterpret conflicting or invalid operation members.

### 4.3 Equality

Two `operations` sequences are equal if and only if they have the same length and, for every index `i`, Operation value equality holds between `operations_a[i]` and `operations_b[i]` (exact `OperationName` equality).

- Equality is **order-sensitive**.
- Same Operations in a different order are **not** equal.
- Empty `operations` sequences are equal to each other.

Resource-wide equality remains out of scope for this RFC unless defined elsewhere.

### 4.4 Ownership boundaries

| Layer | Owns | Does not own |
| --- | --- | --- |
| Resource schema `operations` | Authoritative ordered Operation sequence | Projected metadata, registry state, execution semantics |
| Projection | Resource → `ResourceMetadata` (unchanged participation rules for annotations) | Operation contribution (none in this RFC); field→metadata contribution (still deferred) |
| Registry | identity ↔ `ResourceMetadata` snapshots | Schema operation state |
| Composition (RFC-004) | Metadata contribution composition | Operation authoring or schema membership |

Fields and Relations remain as defined by their Accepted RFCs. This RFC does not widen or reinterpret those collections.

## 5. Validation

`operations` validity is part of Resource validity via the schema (RFC-005 validation / implementation `validateResource`).

A Resource’s `operations` sequence is valid only if all of the following hold:

1. Every member is a closed Operation with exactly one declared semantic property, `name`, whose value is a valid `OperationName` (shape validation and name validation are separate checks).
2. Each `name` satisfies the `OperationName` grammar.
3. `OperationName`s are unique within the sequence; duplicates are invalid.
4. Empty (zero members) is valid.

Invalid `operations` → invalid Resource. A Resource remains valid only if the rest of its schema (and identity / annotations) is also valid.

**Validate-before-snapshot:** Invalid candidates MUST be rejected before they can become Resource snapshot state. Implementations MUST NOT transform an invalid candidate into a valid Operation by discarding information (including stripping additional semantic properties) before validation.

### 5.1 Error ownership

Conceptual failure causes (concrete codes and TypeScript shapes are deferred; separation is normative):

| Cause | When |
| --- | --- |
| Invalid operation name | `name` fails `OperationName` grammar |
| Duplicate operation name | repeated `OperationName` in the sequence |
| Invalid operation member | member is not a closed Operation with exactly one declared semantic property, `name` |

- Operation/collection failures are Resource/schema validation failures.
- They MUST remain distinct from metadata, annotation, field, and relation validation failures.
- No silent dropping, normalization, or coercion.
- A separate public `validateOperations` API is **not** required by this RFC.
- `validateResourceSchema` MUST NOT be introduced merely to solve this slice; schema-level checks remain an internal/structural concern behind Resource validation.

**Invariant:** A Resource is valid only if its complete schema, including its `operations` sequence, is valid.

## 6. Projection non-participation

`projectResourceMetadata` MUST continue to re-run the Resource validation gate before projection, as required by RFC-005 / M3.2 / RFC-006 / RFC-007 / RFC-008.

Therefore, a Resource with invalid `operations` cannot successfully participate in projection merely because Operations contribute no metadata. **“No projection contribution” does not mean “Operations bypass validation.”**

For a valid Resource under this RFC:

1. **No Operation contribution** — `operations` do **not** contribute metadata entries; projection MUST NOT invent operation-derived keys from `OperationName`s.
2. **Upstream projection rules unchanged** — RFC-006 annotation participation and existing Field/Relation non-participation remain as specified.
3. **Purity / one-way** — projection MUST NOT mutate the Resource; there is no reverse projection from `ResourceMetadata` to operations.
4. **Cross-source collisions** involving schema members — out of scope.

### 6.1 Worked examples (conceptual)

```text
Resource {
  identity: (crm, Order)
  schema: {
    fields:     [ { name: total, type: number } ]
    relations:  [ { name: customer, target: (crm, Customer), multiplicity: "one" } ]
    operations: [ { name: create }, { name: cancel } ]   # order matters
  }
  annotations: ∅
}

# Valid Resource (operation names unique, grammar ok; fields/relations per their RFCs)
# Field/Relation/Operation namespaces remain independent
# projectResourceMetadata → identity + annotation-derived metadata only
#   (no Operation contribution; no field/relation→metadata contribution; empty annotations ⇒ no annotation entries)

# [ { name: cancel }, { name: create } ]  ≠  [ { name: create }, { name: cancel } ]
# [ { name: create }, { name: create } ]  → invalid Resource (Duplicate operation name)
# [ { name: Create } ]                    → invalid Resource (Invalid operation name)
# [ { name: create, kind: "command" } ]   → invalid Resource (Invalid operation member)
# operations: ∅                           → valid (empty floor preserved)
```

## 7. Design rationale

- **RFC-007 / RFC-008-parallel contract** establishes the stable `operations` aggregate first (identity + ordered sequence + validation + equality), then adds kind/signature/execution in later RFCs only when a real requirement exists.
- **Ordered sequence** locks deterministic declaration order for later serialization, generated interfaces, and documentation without retrofitting; order participates in sequence equality, not runtime dispatch.
- **Closed name-only Operation** avoids half-open placeholders (`kind`, IO shapes) that invite forward-compatible semantics before those RFCs exist.
- **Dedicated `OperationName`** keeps schema collection identity domains separable and preserves independent namespaces across all three schema collections.
- **Independent namespaces** avoid inventing a unified schema namespace prematurely.
- **Resource-owned validation** matches RFC-006 / RFC-007 / RFC-008; no second public validate pathway.
- **Validate-before-snapshot** preserves the Fields / Relations lesson: closed members must not be “repaired” into validity.
- **Explicit projection non-participation** prevents accidental metadata catalogs via operation names while keeping the validation gate mandatory.
- **No reserved names / no kind** keeps this RFC about identity and collection shape, not framework catalogs or CRUD taxonomies.
- **Fields / Relations left alone** prevents coupling an Operations floor to settled Field/Relation semantics (RFC-009 / RFC-010 / RFC-011).

## 8. Relationship to other RFCs and milestones

| RFC / milestone | Relationship |
| --- | --- |
| RFC-001 Resource Identity | Relied upon via Resource identity; unchanged. RFC-001 remains identity authority (including Relation targets under RFC-010); this RFC does not redefine identity. |
| RFC-002 Metadata Model | Relied upon only for projection/metadata boundary; `OperationName` does **not** reuse `MetadataKey` |
| RFC-003 Registry Contracts | Unchanged consumer of projected `ResourceMetadata` |
| RFC-004 Extension Model | Conceptual alignment on purity; no new composition rules |
| RFC-005 Resource Model | Extends the deferred `operations` member slot with member/sequence semantics; empty `operations` remains valid |
| RFC-006 Annotations | Projection boundary relied upon; annotation projection unchanged; operations do not contribute |
| RFC-007 Resource Fields | Structural parallel; independent namespaces; fields contract unchanged |
| RFC-008 Resource Relations | Structural parallel; independent namespaces; relations collection rules unchanged |
| RFC-009 Resource Field Types | Relied upon unchanged; Field remains `{ name, type }` |
| RFC-010 Relation Association Semantics | Relied upon unchanged for declarative `target` |
| RFC-011 Relation Multiplicity | Relied upon unchanged for `multiplicity: "one"\|"many"` |
| Later — Operation kind / signature / IO / execution | Extends the Operation model beyond `{ name }` |
| Later — Optionality / nullability / bounds | Orthogonal Field/Relation/Operation constraints |
| Later — Field projection / cross-source | Schema→metadata contribution and collision rules |
| Later — Annotation vocabulary | Named annotation keys (orthogonal) |
| Later — Cross-collection schema namespace | Optional; not implied by this RFC |
| M3.9+ implementation | Only after this RFC is Accepted and an Accepted implementation plan exists |

### Suggested sequence (non-normative)

```text
RFC-005  Resource
        │
RFC-006  Annotations
        │
RFC-007  Resource Fields
        │
RFC-008  Resource Relations
        │
RFC-009–011  Field types / Relation association / multiplicity
        │
RFC-012  Resource Operations     ← this RFC (Draft)
        │
Later    Operation kind / signature / execution / optionality / vocabulary
```

## 9. Document acceptance criteria (M2 → M3 Design Review)

This RFC may move from Draft to Accepted when Design Review finds:

1. `OperationName` / Operation / ordered `operations` sequence invariants are unambiguous.
2. Uniqueness within `operations`, empty validity, snapshot immutability (observable behavior), order-sensitive sequence equality, and Operation value equality are unambiguous; Resource-wide equality remains out of scope.
3. Independent Field/Relation/Operation namespaces are explicit (shared name strings allowed).
4. Validation ownership is clear: Resource via schema; distinct conceptual causes; validate-before-snapshot; no silent coercion; no required public `validateOperations`.
5. Projection non-participation is clear, including that invalid `operations` still fail the projection validation gate.
6. Kind, signature, input/output, and execution remain explicitly deferred (§1.2); RFC-009 / RFC-010 / RFC-011 are not reopened.
7. No normative TypeScript API or RFC-001–011 semantic breakage beyond filling the `operations` slot (empty floor preserved; conforming non-empty `operations` become permissible schema states).

## 10. Explicit deferrals

Deferred concerns are listed in §1.2. This ledger does not add scope; it records that reserved `OperationName` catalogs, builders, serialization / wire formats, host adapters, and reverse projection also remain out of scope unless a future RFC says otherwise.

## 11. Compatibility / impact

| Concern | Impact |
| --- | --- |
| Existing empty `operations` Resources | Remain valid; empty sequence is still valid (RFC-005 floor preserved) |
| Prior empty-only implementation floor | Once Accepted and implemented, conforming non-empty `operations` sequences become permissible Resource schema states; existing empty-`operations` Resources remain valid. The entire Resource remains valid only if the rest of its schema (and identity / annotations) is also valid. |
| RFC-007 / RFC-009 `fields` | Unchanged |
| RFC-008 / RFC-010 / RFC-011 `relations` | Unchanged |
| RFC-006 projection | Unchanged participation rules; Operations add no contribution |
| TypeScript empty-only typing (`EmptySchemaCollection` for `operations`) | Implementation after Acceptance MUST widen the typed slot; that surface change belongs to the M3.9 delivery slice, not this Draft |

## 12. Decision record

| Decision | Choice | Why |
| --- | --- | --- |
| Member shape | Name-only `{ name }` | Structural floor without kind/IO/execution |
| Collection | Ordered sequence | Parallel to Fields/Relations; order participates in equality |
| Name domain | Dedicated `OperationName`, sequence-scoped uniqueness | Symmetry without shared type/uniqueness across collections |
| Namespaces | Independent of Fields and Relations | Avoid unified schema namespace |
| Projection | No Operation contribution; validation gate retained | Prevent metadata catalogs; no validation bypass |
| Kind / signature / execution | Out of scope | Separate RFCs when requirements exist |
| Fields / Relations | Unchanged | Do not reopen RFC-009 / RFC-010 / RFC-011 |
| Validate-before-snapshot | Required | Preserve Fields/Relations lesson for closed members |
| Empty sequence | Remains valid | Preserve RFC-005 empty-collection floor |

## 13. Implementation gate (non-normative)

Coding that implements non-empty `operations` or RFC-012 operation validation rules begins only after:

1. this RFC is Accepted;
2. an Accepted implementation plan for the relevant M3 slice exists.

Prefer **one pull request per tracking issue** for that delivery slice (Accepted plan + implementation together). Do not merge a plan-only PR before code for the same slice except as recovery.

No production kind/signature/IO/execution semantics or Field/Relation reopen SHALL be introduced under this RFC alone.
