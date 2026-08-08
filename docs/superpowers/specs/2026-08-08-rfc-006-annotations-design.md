# RFC-006: Annotations

**Date:** 2026-08-08  
**Status:** Accepted  
**M3:** Accepted (2026-08-08) — Design Review; no design blockers; projection ordering resolved via RFC-002  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#8](https://github.com/rexescario-dev/resource-forge/issues/8)  
**Depends on:** RFC-001 (Resource Identity — via Resource), RFC-002 (Metadata Model), RFC-005 (Resource Model)  
**Followed by:** Annotation vocabulary RFC(s); later Resource Fields / Relations / Operations and richer projection/composition RFCs  
**Unblocks:** M3.3 annotations implementation planning (M4→M5) then M6 — not implementation by itself

## Primary question

> What is the annotation container on a Resource, what makes it valid, and how do valid annotations participate in `projectResourceMetadata`—without defining annotation vocabulary?

## Thesis

RFC-006 defines annotations as an **immutable snapshot of an unordered collection of unique RFC-002 `MetadataKey` → `JsonValue` mappings** that are authoritative Resource state. Empty means zero entries. Container validity is part of Resource validation. Valid annotations project by direct 1:1 into `ResourceMetadata` entries with exact key/value preservation and no interpretation. Annotations reuse RFC-002 identity and value contracts but are **not** the same aggregate as `ResourceMetadata`.

```text
Resource
├── identity
├── schema
└── annotations  ← authoritative
       │
       │ direct 1:1 projection
       ▼
ResourceMetadata
├── identity
└── entries      ← projected snapshot
```

## 1. Scope

### 1.1 Goals

1. Define annotation container semantics: unordered, unique keys, immutable snapshot, empty = zero entries.
2. Reuse RFC-002 `MetadataKey` for annotation identity and RFC-002 `JsonValue` for annotation values.
3. Place annotation-container validation inside Resource validity, with errors distinct from metadata validation.
4. Define equality as order-insensitive, key-aware mapping equality.
5. Define direct annotation → metadata entry projection with exact preservation; empty annotations contribute zero entries.
6. Explicitly defer named vocabulary and cross-source collision / precedence / merge semantics.

### 1.2 Non-goals

This RFC does not define:

1. Named annotation vocabulary (`displayName`, `description`, documentation, UI, authorization, provider-specific annotations, reserved annotation catalogs, or annotation namespaces beyond inheriting RFC-002 `MetadataKey` rules)
2. Concrete TypeScript shapes, public APIs, modules, or package layout
3. Cross-source projection collisions, precedence, or merge/composition between annotation-derived entries and entries produced by other Resource projection sources
4. Schema field, relation, or operation member types or their projection into metadata
5. Serialization, wire formats, persistence, or NestJS / GraphQL / Prisma adapters
6. Reverse projection (`ResourceMetadata` → annotations), registry association of annotation state, discovery, or authoring catalogs / builders / editing workflows
7. Changes to RFC-001–005 normative semantics (this RFC fills the annotations slot deferred by RFC-005)

## 2. Terminology

| Term | Meaning |
| --- | --- |
| Annotations | Authoritative Resource state: an immutable snapshot of an unordered collection of unique RFC-002 `MetadataKey` → `JsonValue` mappings; not itself `ResourceMetadata` |
| Annotation entry | One mapping from a `MetadataKey` to a `JsonValue` within that snapshot |
| Empty annotations | The annotation snapshot with zero entries |
| Annotation projection | The contribution of valid annotations to `projectResourceMetadata` via direct 1:1 entry emission |

RFC-002 terms (`MetadataKey`, `JsonValue`, `ResourceMetadata`) and RFC-005 terms (`Resource`, `projectResourceMetadata`) keep their existing meanings.

M3.1 `EmptyAnnotations` is an **implementation placeholder**, not an RFC-006 term. After this RFC is Accepted, implementation may widen or replace that placeholder to represent the zero-or-more-entry snapshot contract.

## 3. Container model

### 3.1 Logical shape

Annotations are an abstract collection contract (not a prescribed array or map representation):

```text
Annotations {
  entries: unordered mapping from MetadataKey to JsonValue
}
```

`entries` may be empty. Concrete array / map / object representation is deferred.

### 3.2 Invariants

| Invariant | Rule |
| --- | --- |
| Snapshot | Annotations have **snapshot-by-value** semantics. Once part of a Resource snapshot, annotation entries and their nested `JsonValue` data cannot be mutated through external aliases. Any change yields a new annotations snapshot. Projection MUST NOT mutate the Resource. |
| Unordered | Mapping order has no semantic meaning and MUST NOT affect annotation equality |
| Unique keys | At most one mapping per `MetadataKey`; duplicates are invalid |
| Identity | Each key is an RFC-002 `MetadataKey`; its grammar, equality semantics, and namespace/reservation rules apply unless this RFC explicitly narrows them. **This RFC does not narrow them.** |
| Values | Each value satisfies the RFC-002 `JsonValue` validity contract; RFC-006 does not add vocabulary-specific constraints. Values are opaque here—no vocabulary interpretation |
| Empty | Zero mappings; valid |
| Not metadata | Annotations reuse key/value contracts but are not the `ResourceMetadata` aggregate |

Because annotation identity reuses RFC-002 `MetadataKey`, RFC-002 namespace and reservation rules—including the `rf` reserved namespace—apply unchanged. RFC-006 introduces no annotation-specific namespace reservation.

Implementations MUST NOT silently drop, merge, normalize, or reinterpret conflicting or invalid annotation entries.

### 3.3 Equality

Two annotations snapshots are equal if and only if they contain the same set of `MetadataKey` → `JsonValue` mappings (deep JSON equality under RFC-002).

- Mapping order is irrelevant.
- Absence of a key is not equal to a key mapped to `null`.
- Empty annotations snapshots are equal to each other.

### 3.4 Ownership boundaries

| Layer | Owns | Does not own |
| --- | --- | --- |
| Resource annotations | Authoritative annotation snapshot | Projected metadata, registry state |
| Projection | Resource → `ResourceMetadata` transformation, including annotation participation | Annotation authoring, reverse mapping |
| Registry | identity ↔ `ResourceMetadata` snapshots | Annotation state |
| Composition (RFC-004) | Metadata contribution composition | Annotation authoring or registry association |

Registry behavior is unchanged: registries associate Resource identity with projected `ResourceMetadata`; annotation state remains owned by the Resource and is not independently registered.

## 4. Validation

Annotation-container validity is part of Resource validity (RFC-005 validation / implementation `validateResource`).

A Resource’s annotations snapshot is valid only if all of the following hold:

1. Each key satisfies RFC-002 `MetadataKey` rules (grammar, equality, and namespace/reservation rules—including reserved `rf`—apply unchanged; none are narrowed by this RFC).
2. Keys are unique within the snapshot; duplicate `MetadataKey`s are invalid.
3. Each value satisfies the RFC-002 `JsonValue` validity contract; RFC-006 does not add vocabulary-specific constraints.
4. Empty (zero mappings) is valid.

Invalid annotations → invalid Resource.

### 4.1 Error ownership

- Annotation/container failures are Resource/annotation validation failures.
- They MUST remain distinct from RFC-002 metadata validation failures (`invalid_metadata` or equivalent).
- Concrete error codes and TypeScript shapes are deferred; conceptual separation is normative.

## 5. Projection participation

`projectResourceMetadata` MUST re-run the Resource validation gate before projection, as required by RFC-005 / M3.2, but does not perform a separate annotation-validation pathway.

For a valid Resource, annotation participation is:

1. **Direct entry projection** — each annotation mapping contributes one metadata entry with an equal `MetadataKey` and equal `JsonValue`, preserving the complete JSON value without interpretation or transformation.
2. **Exact preservation** — projection MUST NOT interpret, normalize, transform, envelope, or rename keys or values. “Equal `JsonValue`” means deep JSON equality under RFC-002, not object-reference identity in any programming language.
3. **Order-independent semantics** — Projection MUST preserve the semantic equality of the annotation mapping; annotation mapping order MUST NOT cause two equivalent annotation snapshots to produce semantically different projected metadata. RFC-002 already defines `ResourceMetadata` as an unordered mapping whose equality ignores entry order; this RFC therefore introduces **no** canonical ordering algorithm for projected annotation entries.
4. **Empty** — zero annotation mappings contribute zero metadata entries from annotations.
5. **Purity / one-way** — projection MUST NOT mutate the Resource; there is no reverse projection from `ResourceMetadata` to annotations.
6. **Within-annotation collisions** — impossible for a valid snapshot (unique keys).
7. **Cross-source collisions** — out of scope. This RFC does **not** define collision detection, precedence, or merge semantics between annotation-derived metadata entries and entries produced by other Resource projection sources. Those semantics belong to a future projection/composition contract.

### 5.1 Structural relationship only

Direct projection does **not** imply that every annotation key is a meaningful, reserved, or catalogued metadata vocabulary entry. Vocabulary meaning and coexistence rules remain later RFCs.

### 5.2 Worked example (conceptual)

```text
Resource {
  identity: (crm, Customer)
  schema: { fields: ∅, relations: ∅, operations: ∅ }
  annotations: {
    { namespace: docs, name: summary } → "A customer record"
  }
}

projectResourceMetadata(resource) → ResourceMetadata {
  identity: (crm, Customer)
  entries: {
    { namespace: docs, name: summary } → "A customer record"
  }
}
```

Empty annotations still project to identity plus empty entries (RFC-005 floor unchanged for the empty case).

## 6. Design rationale

- **Parallel metadata-shaped container** reuses RFC-002 `MetadataKey` / `JsonValue` without inventing a second identity/value model, while keeping annotations as authoritative Resource state (RFC-005), not as `ResourceMetadata` itself.
- **Unordered + unique keys + reject duplicates** keep annotation equality well-defined and make direct projection independent of authoring/storage order (semantic equality relies on RFC-002’s order-irrelevant `ResourceMetadata` equality; no array-serialization determinism is promised).
- **Empty = zero entries** yields one annotation concept; M3.1 `EmptyAnnotations` remains an implementation migration artifact.
- **Validate on Resource** matches authoritative-state ownership; projection revalidates the Resource (RFC-005 / M3.2) but is not a separate annotation-validation pathway.
- **Direct 1:1 projection with exact preservation** makes “participate through projection” testable without vocabulary or envelopes.
- **Defer cross-source collisions and vocabulary** prevents today’s annotation rule from becoming a global merge or catalog policy.

## 7. Relationship to other RFCs and milestones

| RFC / milestone | Relationship |
| --- | --- |
| RFC-001 Resource Identity | Relied upon via Resource identity; unchanged |
| RFC-002 Metadata Model | Extended by reuse: annotation identity/values and projected entries use `MetadataKey` / `JsonValue`; the metadata aggregate and metadata validation remain distinct |
| RFC-003 Registry Contracts | Unchanged consumer of projected `ResourceMetadata` |
| RFC-004 Extension Model | Conceptual alignment on purity; no new composition rules |
| RFC-005 Resource Model | Extends the deferred annotations slot with representation, validation, equality, and projection participation |
| Later — Annotation vocabulary | Defines named keys and meaning under this container |
| Later — Schema / richer projection | Schema members; cross-source collision, precedence, and merge |
| M3.3+ implementation | Only after this RFC is Accepted; may widen/replace `EmptyAnnotations` under an Accepted plan |

### Suggested sequence (non-normative)

```text
RFC-005  Resource
        │
RFC-006  Annotations          ← this RFC (Draft)
        │
Later    Annotation vocabulary
        │
RFC-007+ Resource Fields / Relations / Operations
        │
Later    Richer projection / composition (cross-source rules)
```

## 8. Document acceptance criteria (M2 → M3 Design Review)

This RFC may move from Draft to Accepted when Design Review finds:

1. Annotations are unambiguously authoritative Resource state and not the `ResourceMetadata` aggregate.
2. Container invariants are complete: immutable snapshot, unordered, unique `MetadataKey`, `JsonValue` values, empty = zero entries.
3. Validation ownership is clear: part of Resource validity; distinct from metadata validation; no silent drop, merge, or normalize.
4. Projection participation is clear: revalidate Resource; direct 1:1 exact preservation (equal key/value, not reference identity); order-independent semantic equality via RFC-002; empty → zero mappings; purity / one-way.
5. Cross-source collision / precedence / merge and named vocabulary remain explicitly deferred.
6. No normative TypeScript API, adapter, registry, or RFC-001–005 semantic changes are introduced.

## 9. Explicit deferrals

- Named annotation vocabulary and reserved annotation catalogs
- Concrete TypeScript representation and public APIs
- Cross-source projection collision detection, precedence, and merge/composition
- Schema field / relation / operation projection into metadata
- Serialization / wire formats; host adapters; reverse projection
- Annotation editing workflows, builders, and authoring catalogs

## 10. Implementation gate (non-normative)

Coding that implements non-empty annotations or RFC-006 annotation projection rules begins only after:

1. this RFC is Accepted;
2. an Accepted implementation plan for the relevant M3 slice exists.

After Accept, M3 may replace the M3.1 empty placeholder with a representation of the zero-or-more-entry snapshot contract and implement the RFC-006 annotation projection rules—without inventing vocabulary or cross-source merge rules unless a later Accepted RFC requires them.

No production annotation vocabulary or cross-source merge behavior SHALL be introduced under this RFC alone.
