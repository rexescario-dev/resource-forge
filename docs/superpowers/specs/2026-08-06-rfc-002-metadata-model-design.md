# RFC-002: Metadata Model

**Date:** 2026-08-06  
**Status:** Draft  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Depends on:** RFC-001 (Resource Identity)  
**Blocks:** RFC-003 (Registry Contracts), RFC-004 (Extension Model), M2 implementation

## Terminology

| Term | Meaning |
| --- | --- |
| Resource Identity | The immutable identity of a resource type as defined by RFC-001. |
| Metadata Key | An immutable structured identifier `(namespace, name)` for a metadata entry. |
| Metadata Entry | An association between a `MetadataKey` and a `JsonValue`. |
| Resource Metadata | An immutable value object consisting of a `ResourceIdentity` and an unordered mapping from `MetadataKey` to `JsonValue`. |
| JsonValue | A JSON-compatible value: `null`, `boolean`, `number`, `string`, array, or object. |

## 1. Scope

**RFC-002 defines the metadata contract attached to a `ResourceIdentity` (RFC-001).** It specifies the structure, semantics, and value model of resource metadata. It does **not** redefine resource identity, nor does it define resource schemas (fields, relations, operations), registry APIs, extension provider interfaces, persistence, serialization, or transport formats.

A Resource Metadata value answers:

> What descriptive data is associated with a resource type, without changing how that type is identified?

## 2. Attachment and immutability

### 2.1 Binding

A `ResourceMetadata` value is associated with **exactly one** `ResourceIdentity`.

The associated `ResourceIdentity` is an explicit component of the `ResourceMetadata` value (`identity`) and is **not derived** from metadata entries.

Metadata never contributes to resource-type identity or identity equality. RFC-001 remains the sole authority for identifying a resource type.

### 2.2 Immutability

`ResourceMetadata` is an immutable value object.

Any change to the metadata entries—including adding, removing, or replacing an entry—produces a **new** `ResourceMetadata` value.

The associated `ResourceIdentity` remains unchanged across such replacements.

RFC-002 does **not** define update workflows, change propagation, version negotiation, registry replacement semantics, persistence, serialization, or who may produce a new snapshot.

### 2.3 Equality

Two `ResourceMetadata` values are equal if and only if:

1. their `identity` values are equal under RFC-001; and
2. they contain the same entries: the same set of `MetadataKey`s (exact equality on both components) mapped to equal `JsonValue`s (deep JSON equality).

Entry order is irrelevant. Absence of an entry is not equal to an entry whose value is `null`.

Equality is an equivalence relation over `ResourceMetadata`.

## 3. Metadata model

### 3.1 Logical shape

```text
ResourceMetadata {
  identity: ResourceIdentity
  entries:  unordered mapping from MetadataKey to JsonValue
}
```

- `identity` is required.
- `entries` may be empty.
- No metadata entry is required for a valid `ResourceMetadata`.
- Because keys are unique, each `MetadataKey` maps to at most one `JsonValue`.

### 3.2 MetadataKey

```text
MetadataKey {
  namespace
  name
}
```

The ordered pair `(namespace, name)` is the semantic key. Textual representations are encodings of that key and do not replace it.

#### Equality

Two `MetadataKey` values are equal if and only if both `namespace` and `name` are exactly equal as strings. Comparisons are case-sensitive and MUST NOT perform case folding or normalization.

#### Grammar

```text
MetadataKey ::= (Namespace, Name)

Namespace ::= ^[a-z][a-z0-9-]*$
Name      ::= ^[a-z][a-zA-Z0-9]*$
```

- **Namespace:** lowercase ASCII; digits and hyphens allowed after the first character; single identifier.
- **Name:** camelCase ASCII; no separators; digits allowed after the first character (e.g. `typeName`, `operationId`).

This grammar is **independent of RFC-001's resource-name grammar**. Resource type names remain PascalCase; metadata entry names are camelCase so that type identity and attribute identity remain visually and semantically distinct.

The grammar is ASCII-only. Exact string equality is sufficient; Unicode normalization is not defined.

This RFC does **not** define a canonical textual representation for `MetadataKey`. Encodings such as `namespace.name` are illustrative only (see §6.3). Serialization and wire formats are out of scope.

### 3.3 Reserved namespace

The namespace `rf` is reserved for framework-defined metadata keys. User-defined and third-party metadata MUST NOT use the `rf` namespace.

RFC-002 defines **no** concrete `rf` metadata keys (required or optional). Future RFCs may introduce standardized keys under `rf` without revisiting the structural model defined here.

No other namespaces are reserved by this RFC.

### 3.4 JsonValue

Metadata values are JSON-compatible only:

```text
JsonValue ::= null
            | boolean
            | number
            | string
            | array of JsonValue
            | object whose property values are JsonValue
```

Nested object property names inside a `JsonValue` are opaque string keys of that value. They are not `MetadataKey`s and are not subject to metadata-key grammar or namespace reservation rules.

Core does not introduce runtime-specific value types (for example framework classes, GraphQL AST nodes, or ORM model instances).

### 3.5 Entry collection invariants

1. **Unordered** — Ordering has no semantic meaning and MUST NOT affect equality.
2. **Unique keys** — Duplicate `MetadataKey`s are not permitted within a single `ResourceMetadata` value.
3. **Unknown namespaces preserved** — Consumers that do not understand a namespace MUST preserve those entries without modification or reinterpretation. Consumers MAY ignore namespaces they do not understand, but MUST preserve them when producing a derived `ResourceMetadata` value.
4. **Ownership of interpretation** — Core assigns semantics only to metadata defined by the reserved `rf` namespace. Entries in all other namespaces are owned by their defining extension or producer. Core MUST NOT interpret extension-owned metadata beyond the structural rules of this RFC.

Invalid inputs are errors. Implementations MUST NOT silently drop, merge, normalize, or reinterpret conflicting or invalid metadata entries.

## 4. Normative operations

These operations describe the minimum semantic capabilities required of conforming implementations (including future `@resource-forge/core` contracts). They do not prescribe public APIs, function names, modules, or package structure.

| Operation | Responsibility |
| --- | --- |
| **validate** | Determine whether a `ResourceMetadata` value satisfies attachment rules, key grammar, reserved-namespace rules, unique-key rules, and the `JsonValue` model. |
| **equal** | Determine equality of two `ResourceMetadata` values under §2.3. |

Construction of a new snapshot from a previous one (add/remove/replace entry) is a natural consequence of immutability but is not a distinct normative API in this RFC.

## 5. Consumer contracts

These statements constrain future RFCs and packages. They do not define registry or adapter behavior in this RFC.

- Future registries associate metadata with resources by `ResourceIdentity` (RFC-001). They MUST treat `ResourceMetadata` as immutable snapshots.
- Adapters and transports MAY read metadata entries. They MUST NOT redefine identity from metadata, and MUST NOT strip unknown namespaces.
- Future RFCs MAY define concrete `rf` keys. Such keys MUST use the reserved `rf` namespace and MUST NOT change identity semantics.
- Opaque or surrogate storage identifiers MAY exist for optimization. They MUST NOT replace `ResourceIdentity` or redefine `MetadataKey`.

## 6. Examples

### 6.1 Valid

```text
ResourceMetadata {
  identity: {
    namespace: http
    name: Route
  }
  entries: {
    { namespace: rf, name: description } → "An HTTP route resource"
    { namespace: graphql, name: typeName } → "HttpRoute"
    { namespace: openapi, name: operationId } → "getHttpRoute"
  }
}

ResourceMetadata {
  identity: {
    namespace: crm
    name: Customer
  }
  entries: {}
}
```

The second example is valid: empty entries are allowed.

### 6.2 Invalid

```text
# Duplicate MetadataKey within one ResourceMetadata
entries: {
  { namespace: graphql, name: typeName } → "HttpRoute"
  { namespace: graphql, name: typeName } → "Route"
}

# User-defined or third-party use of reserved namespace
{ namespace: rf, name: customHint }   # reserved for framework-defined keys only

# Metadata must not redefine identity
# (identity derived from entries is invalid; identity must be explicit)
```

### 6.3 Non-normative serializations

The following are **illustrative only**. They carry no semantic meaning in RFC-002 and MUST NOT be treated as alternate metadata keys:

```text
rf.description
graphql.typeName
rf:description
```

A future RFC may standardize textual encodings without changing the semantic key `(namespace, name)`.

## 7. Non-goals

This RFC does not define:

- Resource schemas (fields, relations, operations)
- Registry register, discover, query, or merge APIs
- Extension or metadata-provider interfaces
- Persistence, serialization, wire formats, textual encodings, or canonical key strings
- Concrete `rf` keys (for example label, description, icon, tags)
- Update or lifecycle workflows, change propagation, or version negotiation
- Transport mappings (GraphQL, REST, OpenAPI, gRPC, and others)
- Framework-specific mappings (NestJS, Prisma, and others)
- Decorators, reflection, or runtime scanning

## 8. Design rationale

Resource Metadata is intentionally structural. It defines how descriptive data attaches to a resource type without deciding which attributes exist or how they are stored, queried, or transported.

- **Immutable snapshots** keep value semantics clear and leave lifecycle and registry replacement to RFC-003 and later work.
- **Structured keys** make ownership and equality explicit without coupling the model to a wire format.
- **JSON-compatible values** provide enough expressive power for nested metadata while remaining language-agnostic and free of runtime-specific types.
- **No required `rf` keys** keep RFC-002 about structure rather than vocabulary; well-known keys can arrive in a later RFC.
- **camelCase entry names** distinguish metadata attributes from PascalCase resource type names defined by RFC-001.

## 9. Relationship to subsequent RFCs

| RFC / milestone | Relationship |
| --- | --- |
| RFC-001 Resource Identity | Supplies `ResourceIdentity`; identity equality is unchanged by metadata |
| RFC-003 Registry Contracts | Defines registry behavior for associating, publishing, and replacing metadata snapshots |
| RFC-004 Extension Model | Extensions own non-`rf` namespaces; provider interfaces are out of this RFC |
| M2 implementation | Implements metadata contracts in `@resource-forge/core` only after RFC-001–004 are accepted |

## 10. Acceptance criteria

This RFC is accepted when:

1. Attachment, immutability, and separation from identity are unambiguous.
2. Equality semantics are fully specified and independent of entry ordering.
3. `MetadataKey` grammar, reserved-namespace rules, and unique-key rules are complete enough to implement validate/equal without further design questions.
4. The `JsonValue` model is complete and free of runtime-specific types.
5. Registry APIs, resource schemas, serialization, and concrete `rf` keys remain clearly out of scope.
6. No normative requirements depend on implementation language, storage mechanism, or runtime.
