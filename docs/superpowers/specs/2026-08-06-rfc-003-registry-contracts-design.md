# RFC-003: Registry Contracts

**Date:** 2026-08-06  
**Status:** Draft  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Depends on:** RFC-001 (Resource Identity), RFC-002 (Metadata Model)  
**Blocks:** RFC-004 (Extension Model), M2 implementation

## 1. Scope

**RFC-003 defines the semantic responsibilities of a Resource Registry:** maintaining the current association between a `ResourceIdentity` (RFC-001) and an immutable `ResourceMetadata` snapshot (RFC-002), and answering queries about that association. It does not prescribe APIs, storage, discovery protocols, indexing, providers, concurrency, networking, or implementation details.

A Resource Registry answers:

> What is the current immutable metadata snapshot associated with a resource type identity, if any?

This RFC does not define:

- historical metadata or versioning;
- multiple metadata profiles per identity;
- metadata search or indexing;
- metadata production or extension contribution (RFC-004);
- registry implementations or programming interfaces.

## Terminology

| Term | Meaning |
| --- | --- |
| Resource Registry | The authority for current identity → metadata associations |
| Registered identity | An identity that currently has an association in the registry |
| Current snapshot | The single immutable `ResourceMetadata` currently associated with a registered identity |
| Hit / Miss | The two possible outcomes of lookup: the associated metadata or the absence of a registered identity |

## 2. Ownership and association model

### 2.1 What the registry owns

- The current identity → metadata associations.
- For each registered identity, exactly one current immutable `ResourceMetadata` snapshot.
- Enforcement of the association invariants and mutation preconditions defined by this RFC.

### 2.2 What the registry does not own

- Identity grammar or equality (RFC-001).
- Metadata structure, key grammar, value model, or entry semantics (RFC-002).
- Metadata production, providers, or extension contribution (RFC-004).
- Persistence, serialization, networking, concurrency control, caching, storage implementations, or discovery protocols beyond local enumeration of registered identities.

### 2.3 Association model

```text
ResourceIdentity  →  current ResourceMetadata snapshot
```

- At most one current snapshot per identity.
- The registry is current-state only: replacing or unregistering a snapshot leaves no observable history.
- The registry never derives identity from metadata, never rewrites `metadata.identity`, and never merges or partially updates snapshots.
- For every registered association `(identity, metadata)`, `identity` SHALL equal `metadata.identity` under RFC-001 equality.

### 2.4 State model

The registry has two observable states for a given identity:

```text
Unregistered
      |
   register
      v
Registered(current snapshot)
      |
   replace
      |
      v
Registered(new current snapshot)
      |
 unregister
      |
      v
Unregistered
```

`replace` does not introduce a third state. It changes the current snapshot while remaining in the Registered state.

## 3. Operations and invariants

These operations describe the minimum semantic capabilities required of conforming implementations (including the future contracts defined by `@resource-forge/core`). They do not prescribe public APIs, function names, modules, exception types, or package structure.

### 3.1 Shared mutation preconditions

Before `register` or `replace` succeeds:

1. `identity` satisfies RFC-001 validity.
2. `metadata` satisfies RFC-002 validity.
3. `identity` equals `metadata.identity` under RFC-001 equality.

Ill-formed inputs and identity mismatch are errors. The registry MUST NOT repair, rewrite, derive, merge, or reinterpret inputs.

### 3.2 Operations

| Operation | Kind | Preconditions | Success effect |
| --- | --- | --- | --- |
| **register** `(identity, metadata)` | Mutation | Identity **not** registered; shared preconditions (§3.1) | Identity becomes registered with `metadata` as current snapshot |
| **replace** `(identity, metadata)` | Mutation | Identity **is** registered; shared preconditions (§3.1) | Current snapshot becomes `metadata`; no history retained |
| **unregister** `(identity)` | Mutation | Identity **is** registered | Association removed; identity unregistered; no history retained |
| **lookup** `(identity)` | Query | — | Hit(current snapshot) or Miss |
| **enumerate** | Query | — | The set of currently registered identities; no ordering, filtering, or metadata-based querying is implied |

### 3.3 Semantic outcomes

| Situation | Outcome |
| --- | --- |
| `register` when already registered | Duplicate registration |
| `replace` / `unregister` when not registered | Not registered |
| Invalid identity or metadata | Validation failure |
| `identity ≠ metadata.identity` | Identity mismatch |
| `lookup` when not registered | Miss |

`lookup` is a pure query. Absence is a successful observation (Miss), not a mutation failure.

### 3.4 Invariants

1. At most one current snapshot per registered identity.
2. Every registered association satisfies `identity == metadata.identity` under RFC-001 equality.
3. Snapshots are immutable; mutations replace or remove whole associations only.
4. Queries never manufacture metadata. Mutations SHALL fail when their preconditions are not satisfied.
5. Enumeration reflects only currently registered identities; order is non-normative; no stability across mutations is required.
6. The registry does not interpret the semantics of metadata entries beyond validating that `ResourceMetadata` satisfies RFC-002.

## 4. Non-goals

This RFC does not define:

1. Historical metadata, versioning, auditing, or soft-delete
2. Multiple metadata profiles or variants per identity
3. Metadata search, indexing, or value predicates
4. Metadata production, providers, or extension contribution (RFC-004)
5. Resource schemas (fields, relations, operations) — M3
6. Discovery protocols beyond local enumeration of registered identities
7. Persistence, serialization, storage implementations, networking, concurrency, or caching
8. Programming interfaces, exception types, modules, or package structure

## 5. Examples

Examples are illustrative of semantic transitions. They are not APIs.

```text
register((crm, Customer), metadata{ identity: (crm, Customer), entries: {} })
  → success

lookup((crm, Customer))
  → Hit(metadata)

enumerate()
  → set containing (crm, Customer)   # order non-normative

register((crm, Customer), metadata{ identity: (crm, Customer), entries: {} })
  → Duplicate registration

replace((crm, Customer), metadata'{ identity: (crm, Customer), entries: {...} })
  → success; prior snapshot not retained

lookup((crm, Customer))
  → Hit(metadata')

unregister((crm, Customer))
  → success

lookup((crm, Customer))
  → Miss

replace((crm, Customer), metadata'')
  → Not registered

unregister((crm, Customer))
  → Not registered

register((crm, Customer), metadata{ identity: (billing, Invoice), entries: {} })
  → Identity mismatch

register((crm, Customer), invalidMetadata)
  → Validation failure
```

## 6. Design rationale

The registry is intentionally small. It maintains current associations; it does not invent history, search, or production rules.

- **Current-state only** keeps the model deterministic and aligned with immutable metadata snapshots (RFC-002).
- **Distinct register / replace / unregister** make caller intent explicit; re-registration is not a silent overwrite or no-op.
- **Dual-argument identity match** catches wiring bugs without allowing the registry to rewrite metadata.
- **Lookup Hit/Miss** separates observation from mutation failures.
- **Enumeration without metadata search** satisfies resource discovery without introducing indexes or query languages.
- **RFC-001 defines identity validity, RFC-002 defines metadata validity, RFC-003 defines association validity, and RFC-004 defines metadata production.**

## 7. Relationship to subsequent RFCs

| RFC / milestone | Relationship |
| --- | --- |
| RFC-001 Resource Identity | Normative dependency: identity validity and equality |
| RFC-002 Metadata Model | Normative dependency: metadata validity and immutable snapshots |
| RFC-004 Extension Model | Defines who produces metadata and how extensions contribute it |
| M2 implementation | Implements registry contracts in `@resource-forge/core` only after RFC-001–004 are accepted |

During drafting of this RFC, RFC-002 is treated as frozen. Design gaps discovered here are recorded as review comments on RFC-002 rather than silent edits to that document.

## 8. Acceptance criteria

This RFC is accepted when:

1. Ownership and the association model are unambiguous.
2. Conceptual operations and semantic outcomes are fully specified without prescribing APIs or implementations.
3. Invariants guarantee identity/metadata agreement, whole-snapshot mutation, and current-state-only behavior.
4. Lookup distinguishes Hit from Miss without manufacturing metadata.
5. Historical metadata, multi-profile catalogs, metadata search, providers, storage, and programming interfaces remain clearly out of scope.
6. No normative requirements depend on implementation language, storage mechanism, or runtime.
