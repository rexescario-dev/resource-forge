# RFC-005: Resource Model

**Date:** 2026-08-07  
**Status:** Draft  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Depends on:** RFC-001 (Resource Identity), RFC-002 (Metadata Model), RFC-003 (Registry Contracts), RFC-004 (Extension Model — conceptual alignment only)  
**Blocks:** M3 implementation; RFC-006 (Annotations) and subsequent Resource Fields / Relations / Operations RFCs build on this model

## 1. Scope

**RFC-005 defines what a Resource is** in Resource Forge: the authoritative in-core aggregate that owns identity, typed schema, and non-schema descriptive annotations, and that projects one-way to M2 `ResourceMetadata`.

A Resource Model answers:

> What is a Resource, what is its authoritative state, and how does it relate to `ResourceMetadata`?

### 1.1 Goals

1. Define the authoritative parts of a Resource: identity, schema, and annotations.
2. Establish that schema owns the resource model and that `ResourceMetadata` is a derived projection, never authoritative Resource state.
3. Define `ResourceSchema` as a typed container with named `fields`, `relations`, and `operations` collections whose member types are deferred.
4. Define a minimal projection capability (`projectResourceMetadata`) with a testable floor for the empty Resource.
5. Define construction, validation, and projection as behavioral capabilities without prescribing programming-language APIs.
6. Leave RFC-001–004 unchanged: composition stays pure; registry association remains identity ↔ metadata only.

### 1.2 Non-goals

This RFC does not define:

1. Annotation representation, vocabulary, validation of annotation contents, or how annotations participate in projection
2. Projection algorithm, merge semantics, reserved metadata keys, or metadata vocabulary
3. Field, relation, or operation member types; collection implementation; ordering; uniqueness; or cross-collection validation
4. Equality, hashing, cloning, builders, mutation, schema editing, or annotation editing
5. Serialization, persistence, transports, or NestJS / GraphQL / Prisma adapters
6. Discovery, producer loading, compose-and-register helpers, or reverse projection (`ResourceMetadata` → Resource / schema)
7. Changes to RFC-001–004 semantics
8. TypeScript interfaces, modules, exception types, or package layout

## Terminology

| Term | Meaning |
| --- | --- |
| Resource | Authoritative aggregate for a resource type: identity, schema, and annotations |
| ResourceSchema | Typed schema container with named `fields`, `relations`, and `operations` collections |
| Annotations | Authoritative, non-schema descriptive information associated with a Resource; not themselves `ResourceMetadata` |
| Projection | One-way transformation from a Resource to a `ResourceMetadata` snapshot |
| `projectResourceMetadata` | The named projection capability defined by this RFC |

RFC-001’s informal use of “Resource” as a resource type is refined here: the Resource is the authoritative aggregate for that type. Identity remains as defined by RFC-001.

## 2. Authoritative model

### 2.1 Resource

A Resource is structured as:

```text
Resource
├── identity
├── schema
└── annotations
```

| Part | Role |
| --- | --- |
| `identity` | Who the resource is (`ResourceIdentity`, RFC-001) |
| `schema` | What the resource is (`ResourceSchema`) |
| `annotations` | Authoritative non-schema descriptive information |

**Annotations are authoritative state of the Resource, but are not themselves `ResourceMetadata`. They participate only through projection.**

`Resource` has no `metadata` property. `ResourceMetadata` is a derived projection and is never authoritative state.

### 2.2 ResourceSchema

Every `Resource` MUST contain a `ResourceSchema`. A `ResourceSchema` conceptually contains three named collections:

- `fields`
- `relations`
- `operations`

A `ResourceSchema` with empty `fields`, `relations`, and `operations` is valid.

Member types, collection implementation (arrays, maps, keyed sets, and so on), ordering, uniqueness, and validation of collection members are deferred to subsequent RFCs.

### 2.3 Annotations

Annotations are authoritative, non-schema descriptive information associated with a Resource. Their representation, validation, and projection into `ResourceMetadata` are defined by subsequent RFCs.

A Resource with empty annotations is valid for the purposes of this RFC.

### 2.4 Minimal valid Resource

The minimal valid Resource is well-defined:

```text
Resource
├── identity      (valid ResourceIdentity)
├── schema
│   ├── fields = ∅
│   ├── relations = ∅
│   └── operations = ∅
└── annotations = ∅
```

### 2.5 Ownership boundaries

| Layer | Owns | Does not own |
| --- | --- | --- |
| Resource | identity, schema, annotations | projected metadata, registry state |
| Projection | Resource → `ResourceMetadata` transformation | Resource authoring, reverse mapping |
| Registry | identity ↔ `ResourceMetadata` snapshots | `Resource`, schema, annotations |
| Composition | metadata composition | `Resource` authoring or registry association |

The registry contract defined by RFC-003 is unchanged: registries associate `ResourceIdentity` with `ResourceMetadata` snapshots only.

Composition remains as defined by RFC-004: pure contribution composition into snapshots; no Resource authoring and no registry association.

## 3. Projection

### 3.1 Boundary

```text
Resource
     │
     ▼
projectResourceMetadata
     │
     ▼
ResourceMetadata
     │
     ▼
Registry (RFC-003)
```

Projection is one-way. This RFC does not define mapping from `ResourceMetadata` back to Resource or schema.

A capability named `projectResourceMetadata` exists. This RFC defines the capability, not its programming-language API or signature.

Callers MAY subsequently invoke registry `register` or `replace` (RFC-003) with a projected snapshot. Those operations are outside the scope of projection.

### 3.2 Normative projection invariants

1. A Resource projects one-way to `ResourceMetadata`.
2. A capability named `projectResourceMetadata` exists.
3. The projected `ResourceMetadata` MUST represent the same `ResourceIdentity` as the source Resource, as defined by RFC-001.
4. The output MUST satisfy all RFC-002 `ResourceMetadata` invariants.
5. A Resource with empty schema collections and empty annotations MUST still project successfully to RFC-002-valid `ResourceMetadata`.
6. This RFC does **not** specify annotation representation, schema vocabulary, projection algorithm, merge semantics, reserved metadata keys, or how projection is implemented beyond requiring that the resulting `ResourceMetadata` satisfies RFC-002.

### 3.3 Purity

**Rationale (non-normative).** Treating `ResourceMetadata` as a derived representation preserves Resource as the sole authoritative state and aligns projection with the existing purity of metadata composition established by RFC-004. Projection does not mutate the Resource.

## 4. Normative capabilities

These capabilities describe the minimum semantic behaviors required of conforming implementations. They do not prescribe public APIs, function names beyond the conceptual projection name, modules, exception types, or package structure.

### 4.1 Construction

There is a way to construct a Resource. A minimal valid Resource (valid identity, empty schema collections, empty annotations) is constructible.

### 4.2 Validation

There is a way to validate a Resource. Validation MUST enforce:

- the RFC-001 identity contract;
- that a `ResourceSchema` exists;
- that the schema conceptually contains the three named collections `fields`, `relations`, and `operations`;
- that empty annotations are permitted.

Validation of non-empty annotation contents and of schema member types is deferred to subsequent RFCs.

### 4.3 Projection

`projectResourceMetadata` exists and MUST satisfy §3.2.

## 5. Worked examples (normative outcomes)

Examples illustrate semantic outcomes. They are not API prescriptions.

### 5.1 Minimal Resource projects

```text
Resource {
  identity: (crm, Customer),
  schema: { fields: ∅, relations: ∅, operations: ∅ },
  annotations: ∅
}

projectResourceMetadata(resource)
  → ResourceMetadata {
      identity: (crm, Customer),
      ... metadata contents beyond identity are intentionally unspecified by this RFC
    }

The snapshot MUST be RFC-002-valid.
```

### 5.2 Identity agreement

```text
Resource.identity = (billing, Invoice)

projectResourceMetadata(resource).identity
  → MUST equal (billing, Invoice) under RFC-001 equality
```

### 5.3 Invalid identity fails validation

```text
Resource with identity that fails RFC-001 validation
  → Validation failure
  → Projection is not required to succeed for an invalid Resource
```

## 6. Design rationale

The Resource model sits above M2 without reopening it. RFC-005 intentionally defines **Resource** before defining any schema vocabulary.

- **Hybrid typed schema + metadata projection** keeps a single source of truth for the operational model while reusing M2 snapshots for registry association, tooling, and descriptive consumption.
- **Split authoritative fields** (`identity`, `schema`, `annotations`) avoid implying that projected metadata is Resource state.
- **One-way projection** prevents synchronization problems between schema and metadata edits.
- **Named empty schema collections** lock the long-term pillars of the resource model without defining Field, Relation, or Operation semantics.
- **Deferred annotations** keep this RFC about architecture rather than authoring vocabulary or contribution shape.
- **Minimal projection floor** gives implementers one executable invariant without freezing algorithm or vocabulary.
- **Behavioral capabilities without API shapes** match the style of RFC-001–004.

**RFC-004 composition (conceptual alignment only).** RFC-005 does not require projection to be implemented by invoking `composeResourceMetadata`.

## 7. Relationship to other RFCs and milestones

| RFC / milestone | Relationship |
| --- | --- |
| RFC-001 Resource Identity | Normative dependency: identity validity and equality |
| RFC-002 Metadata Model | Normative dependency: projected snapshot validity |
| RFC-003 Registry Contracts | Unchanged consumer of projected `ResourceMetadata` |
| RFC-004 Extension Model | Conceptual alignment on purity; not a required implementation path for projection |
| RFC-006 Annotation Model (planned) | Representation, validation, and projection participation of annotations |
| Later — Resource Fields, Resource Relations, and Resource Operations | Member types and collection semantics for `ResourceSchema` |
| M3 implementation | Implements Resource contracts in `@resource-forge/core` only after this RFC is Accepted, then public export decisions and a bite-sized TDD plan |

### Suggested M3 RFC sequence (non-normative)

```text
RFC-001  Identity
        │
RFC-002  Metadata
        │
RFC-003  Registry
        │
RFC-004  Composition
        │
RFC-005  Resource          ← this RFC
        │
RFC-006  Annotations
        │
RFC-007+ Resource Fields / Relations / Operations
```

## 8. Acceptance criteria

This RFC is accepted when:

1. Authoritative Resource parts (`identity`, `schema`, `annotations`) are unambiguous.
2. The authoritative/projection boundary is unambiguous: `ResourceMetadata` is derived and never authoritative state.
3. Projection invariants include identity agreement, RFC-002 validity, and successful projection of the minimal Resource.
4. `ResourceSchema` conceptually contains named `fields`, `relations`, and `operations` collections; the empty schema is valid; member semantics remain clearly deferred.
5. Construction, validation, and projection capabilities are specified without prescribing programming-language APIs.
6. Annotation representation, projection algorithm, schema vocabulary, reverse projection, adapters, discovery, and compose-and-register helpers remain clearly out of scope.
7. No normative requirements change RFC-001–004 or depend on NestJS, GraphQL, Prisma, or other host frameworks.

## 9. Implementation gate (non-normative)

Coding for M3 Resource contracts begins only after:

1. this RFC is Accepted;
2. public export decisions for the first implementation slice are accepted;
3. a bite-sized TDD task breakdown for that slice is accepted.

No production Resource implementation SHALL be introduced until these gates are satisfied.
