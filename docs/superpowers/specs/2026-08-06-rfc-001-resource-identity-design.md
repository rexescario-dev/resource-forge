# RFC-001: Resource Identity

**Date:** 2026-08-06  
**Status:** Accepted  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Depends on:** —  
**Blocks:** RFC-002 (Metadata Model), RFC-003 (Registry Contracts), RFC-004 (Extension Model), M2 implementation

## Terminology

| Term | Meaning |
| --- | --- |
| Resource | A resource **type** defined within Resource Forge |
| Resource Identity | The ordered pair `(namespace, name)` |
| Canonical representation | The required textual form `namespace/name` |

## 1. Scope

**RFC-001 defines the identity of a resource type.** It does not define resource instances, URI schemes, registries, metadata, resolution, persistence, or surrogate identifiers.

A Resource Identity answers:

> How do we uniquely identify a resource type within Resource Forge?

## 2. Identity model

### 2.1 Semantic identity

The semantic identity of a resource type is a structured pair:

```text
ResourceIdentity {
    namespace
    name
}
```

The ordered pair `(namespace, name)` is the semantic identity. Textual representations are encodings of that identity and do not replace it.

### 2.2 Equality

Two `ResourceIdentity` values are equal if and only if both `namespace` and `name` are exactly equal as strings. Comparisons are case-sensitive and MUST NOT perform case folding or normalization.

Equality is an equivalence relation over `ResourceIdentity`.

### 2.3 Canonical representation

The canonical textual representation of a `ResourceIdentity` is:

```text
namespace/name
```

The canonical representation contains exactly one `/` separator. Consequently, a valid canonical representation contains exactly one `/`.

## 3. Grammar

```text
ResourceIdentity ::= Namespace "/" Name

Namespace ::= ^[a-z][a-z0-9-]*$
Name      ::= ^[A-Z][A-Za-z0-9]*$
```

- **Namespace:** lowercase ASCII; digits and hyphens allowed after the first character; single identifier.
- **Name:** PascalCase ASCII; no separators; digits allowed after the first character (e.g. `OAuth2Client`).

The namespace is a single identifier. Hierarchical namespaces are out of scope for this RFC and may be proposed by a future RFC if supported by concrete use cases.

The grammar is ASCII-only. Exact string equality (see §2.2) is sufficient; Unicode normalization is not defined.

## 4. Reserved namespace

The namespace `rf` is reserved for framework-defined resources. User-defined resources MUST NOT use the `rf` namespace.

No other namespaces are reserved by this RFC. Future RFCs may define additional conventions or reserved namespaces if necessary.

## 5. Normative operations

These are semantic contracts for future implementations (including `@resource-forge/core`). This RFC does not define concrete APIs, function names, or modules.

| Operation | Responsibility |
| --- | --- |
| **validate** | Determine whether a value satisfies the Resource Identity grammar and applicable reserved-namespace rules. |
| **parse** | Convert the canonical textual representation into a `ResourceIdentity`. |
| **format** | Produce the canonical textual representation from a valid `ResourceIdentity`. |

Validation MAY depend on the context in which an identity is being created (for example, framework-defined versus user-defined resources).

Invalid inputs are errors. Implementations MUST NOT silently normalize, repair, or reinterpret invalid identities.

## 6. Identity invariants

A valid Resource Identity:

- uniquely identifies a resource type;
- has exactly one semantic interpretation `(namespace, name)`;
- has exactly one canonical textual representation;
- is immutable once published (renaming creates a new identity and requires migration).

## 7. Consumer contracts

These statements constrain future RFCs and packages. They do not define registry or adapter behavior in this RFC.

- Registries key resources by `ResourceIdentity` using the equality defined by this RFC.
- Adapters and transports refer to resource types by `ResourceIdentity`. They MUST NOT define alternate architectural identity systems.
- Future implementations MAY introduce opaque or surrogate identifiers for storage or optimization. Such identifiers MUST NOT replace or redefine the architectural identity specified by this RFC.

## 8. Examples

### 8.1 Valid

```text
crm/Customer
auth/User
billing/Invoice
github/PullRequest
shared/EmailAddress
machine-learning/ModelCard
billing/OAuth2Client
rf/Resource                 # framework-defined only
```

### 8.2 Invalid

```text
Auth/User              # namespace not lowercase
crm/customer           # name not PascalCase
crm/Customer/Info      # multiple separators
crm//Customer          # empty namespace segment
crm/                   # missing name
/Customer              # missing namespace
crm/customer-record    # separators not allowed in name
CRM/Customer           # namespace not lowercase
rf/CustomResource      # reserved namespace (user-defined)
```

## 9. Non-goals

This RFC does not define:

- Metadata model
- Registry behavior or APIs
- Resource resolution
- Resource instance identifiers
- URI schemes
- Decorator syntax
- Framework-specific mappings (GraphQL, Prisma, NestJS, etc.)
- Hierarchical namespaces

## 9.1 Non-normative serializations

The following are **illustrative only**. They carry no semantic meaning in RFC-001 and MUST NOT be treated as alternate identities:

```text
resource://crm/Customer
crm.Customer
crm:Customer
```

A future RFC may standardize alternate serializations without changing the semantic identity `(namespace, name)`.

## 10. Design rationale

Resource Identity is intentionally minimal. It defines a stable, human-readable, implementation-independent identifier for resource types. All concerns related to storage, discovery, resolution, transport, and runtime behavior are deferred to future RFCs to preserve a clear separation of responsibilities.

Namespaced identity avoids collisions across domains (`auth/User` vs `crm/User`) without opaque IDs that hinder human and AI reasoning. Strict casing and a single reserved namespace (`rf`) keep the format deterministic while leaving almost all of the namespace space open to users.

## 11. Relationship to subsequent RFCs

| RFC | Relationship |
| --- | --- |
| RFC-002 Metadata Model | Attaches metadata *to* a Resource Identity; does not redefine identity |
| RFC-003 Registry Contracts | Registers and looks up resources *by* Resource Identity |
| RFC-004 Extension Model | Extensions refer to resource types *via* Resource Identity |
| M2 implementation | Implements validate/parse/format and types in `@resource-forge/core` only after RFC-001–004 are accepted |

## 12. Acceptance criteria

This RFC is accepted when:

1. Semantic identity, equality, and canonical form are unambiguous.
2. Grammar and reserved-namespace rules are complete enough to implement validate/parse/format without further design questions.
3. Instance identity, URIs, registry, and metadata remain clearly out of scope.
4. Consumer contracts do not prescribe registry or adapter implementations.
5. No normative requirements depend on implementation language, storage mechanism, or runtime.
