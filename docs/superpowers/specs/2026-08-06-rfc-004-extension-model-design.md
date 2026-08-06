# RFC-004: Extension Model

**Date:** 2026-08-06  
**Status:** Draft  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Depends on:** RFC-001 (Resource Identity), RFC-002 (Metadata Model), RFC-003 (Registry Contracts)  
**Blocks:** M2 implementation

## 1. Scope

**RFC-004 defines metadata production and composition:** semantic producer roles, namespace ownership, contribution as namespace partitions, and pure composition of those contributions into one immutable `ResourceMetadata` (RFC-002) for a given `ResourceIdentity` (RFC-001). Composition produces metadata; the registry (RFC-003) associates completed metadata with resource identities.

A Metadata Extension Model answers:

> Who produces metadata for a resource type, and how are extension contributions composed into a single immutable snapshot?

### 1.1 Goals

1. Answer who may produce metadata and how extensions contribute it.
2. Define exclusive namespace ownership and conflict rules (no reconciliation or merge policy).
3. Define pure, order-independent composition over a provided producer collection.
4. Include the reserved `rf` namespace via a framework/core producer role without inventing a key catalog.
5. Keep contracts implementable in M2 without prescribing APIs, dependency injection, or adapters.

### 1.2 Non-goals

This RFC does not define:

1. Redefinitions of identity (RFC-001), metadata structure (RFC-002), or registry association semantics (RFC-003)
2. Producer discovery, loading, enablement, applicability filtering, ordering, injection, scanning, or lifecycle
3. Registry mutation, compose-and-publish helpers, historical metadata, or metadata search
4. Resource schemas (fields, relations, operations) — M3
5. Transports, persistence, or NestJS / GraphQL / Prisma adapters
6. TypeScript interfaces, modules, exception types, or package layout
7. Concrete `rf` key vocabulary
8. Value-level merge, precedence, or reconciliation across producer contributions
9. Authoring mechanisms (decorators, fluent builders, configuration objects, code generation)

## Terminology

| Term | Meaning |
| --- | --- |
| Metadata Producer | A semantic contributor of metadata for a given `ResourceIdentity` through zero or more namespace partitions |
| Framework / Core Producer | A producer kind that MAY own the reserved `rf` namespace |
| Extension Producer | A producer kind that owns only non-`rf` namespaces and MUST NOT contribute `rf` |
| Namespace Partition | The complete set of metadata entries for a single namespace owned by one producer |
| Contribution | The (possibly empty) set of namespace partitions contributed by one producer for one `ResourceIdentity` |
| Composition | A pure operation that combines a `ResourceIdentity` and a provided collection of producer contributions into either one immutable `ResourceMetadata` or a composition failure |
| Namespace Owner | The unique producer, if any, that contributes a given namespace within one composition |

## 2. Producer model

### 2.1 Producer kinds

Producer kinds are semantic roles, not runtime types or deployment units.

| Kind | May own `rf` | May own other namespaces |
| --- | --- | --- |
| Framework / Core Producer | Yes | Yes, subject to exclusive ownership |
| Extension Producer | No | Yes, subject to exclusive ownership |

There is a single composition algorithm for both kinds. The only additional constraint is that `rf` may be owned only by a framework/core producer.

### 2.2 Producer responsibilities

1. **Identity is input.** Producers contribute metadata *about* the composition’s `ResourceIdentity`. They do not emit, derive, or redefine identity.
2. **Contribute partitions.** A producer contributes zero or more namespace partitions for that identity.
3. **Own namespaces.** A producer owns every namespace it contributes. Within one composition, each namespace has at most one owner.
4. **Partitions are complete.** Owning a namespace means contributing the complete contents of that namespace for the composition. There is no partial namespace overlay and no cross-producer key merge.
5. **Respect `rf` reservation.** Only a framework/core producer may contribute `rf`. Extension producers MUST NOT contribute `rf`.
6. **Satisfy structural rules.** Contributions MUST satisfy RFC-002 rules for `MetadataKey` grammar, `JsonValue`, and unique keys within the eventual snapshot. Every contributed entry belongs to the namespace of its partition.
7. **Unordered collection.** Producers are evaluated as an unordered collection; producer evaluation order has no semantic meaning.

### 2.3 Out of scope for producers

Producers do not define:

- how they are discovered, loaded, enabled, filtered for applicability, ordered, injected, or scanned;
- registry mutation or association lifecycle;
- transport or persistence behavior;
- resource identity.

RFC-004 assumes an already provided collection of metadata producers. It defines the semantics of metadata production and composition only.

## 3. Namespace ownership

### 3.1 Exclusive ownership

Within the composition of a single `ResourceMetadata` snapshot for a given `ResourceIdentity`:

- each namespace is owned by **exactly zero or one** producer;
- a producer MAY own and contribute metadata for **multiple** namespaces;
- namespace ownership is evaluated independently for each namespace;
- duplicate namespace claims are invalid: if two producers claim the same namespace, composition fails with a conflict.

```text
Producer ─────▶ { Namespace* }

Namespace ───▶ Producer (0..1 owner within one composition)
```

### 3.2 Reserved namespace `rf`

- `rf` is reserved for framework-defined metadata (RFC-002).
- Only a framework/core producer may own or contribute `rf`.
- A composition in which a non-framework producer contributes `rf` is invalid.
- The presence of a framework/core producer is optional. Absence of `rf` entries is valid.

### 3.3 No reconciliation

RFC-004 does not define precedence, override, deep merge, or other reconciliation of conflicting contributions. Conflicts fail composition.

## 4. Composition

### 4.1 Inputs and purity

Composition is a pure operation.

**Inputs:**

1. a `ResourceIdentity` (RFC-001);
2. a provided collection of metadata producers.

**Outcomes:**

1. one immutable `ResourceMetadata` (RFC-002); or
2. a composition failure.

Composition has no observable side effects and does not mutate registry state. Given the same `ResourceIdentity` and equivalent producer contributions, composition produces an equivalent `ResourceMetadata` or a composition failure.

Metadata producers form an unordered collection. Composition is defined over the set of contributions, not the sequence in which they are evaluated. For any successful composition, the resulting `ResourceMetadata` snapshot is independent of producer evaluation order. Implementations MUST NOT assign semantic meaning to evaluation order. Diagnostic ordering and formatting are non-normative.

### 4.2 Contribution shape

Each producer contributes zero or more **namespace partitions**.

A namespace contribution (illustrative only):

```text
{
  graphql: {
    typeName: "Customer",
    queryable: true
  },
  federation: {
    key: ["id"]
  }
}
```

- A producer MAY contribute no namespaces for a given `ResourceIdentity`. An empty contribution is not an error and does not imply that the producer was incorrectly included.
- Identity never flows through producers. Identity is established by RFC-001 and is the subject of composition.

### 4.3 Composition steps

1. Validate the input `ResourceIdentity` under RFC-001.
2. Collect contributions from the provided producer collection.
3. Validate exclusive namespace ownership across all contributions.
4. Validate that any `rf` contribution comes from a framework/core producer.
5. Validate that every contributed entry belongs to the namespace of its partition and satisfies RFC-002.
6. On success, construct one immutable `ResourceMetadata` using the input `ResourceIdentity` and the disjoint union of all contributed namespace partitions.
7. On failure, produce **no** `ResourceMetadata`.

A composition in which every producer contributes no namespace partitions—or in which the provided producer collection is empty—is valid and produces a `ResourceMetadata` whose entry set is empty.

### 4.4 Failure classes

These are semantic outcomes. They do not prescribe APIs, exception types, or diagnostic formats.

| Outcome | Meaning |
| --- | --- |
| Duplicate namespace ownership | Two or more producers contribute the same namespace |
| Reserved namespace violation | A non-framework producer contributes `rf` |
| Contribution validation failure | A contribution violates RFC-002 or partition/entry consistency |
| Invalid composition input | The input `ResourceIdentity` fails RFC-001 validity |

Successful composition produces exactly one immutable RFC-002 `ResourceMetadata`; failed composition produces none. No partial snapshot is available for registry use.

### 4.5 Relationship to the registry

Composition stops at a completed snapshot. Callers MAY subsequently invoke registry `register` or `replace` (RFC-003). Those operations are outside the scope of this RFC.

```text
ResourceIdentity (RFC-001)
            │
            ▼
Metadata Producers (RFC-004)
            │
            ▼
Composition (RFC-004)
            │
            ▼
ResourceMetadata (RFC-002)
            │
            ▼
Registry register/replace (RFC-003)
```

## 5. Normative operations

These operations describe the minimum semantic capabilities required of conforming implementations (including future `@resource-forge/core` contracts). They do not prescribe public APIs, function names, modules, exception types, or package structure.

| Operation | Responsibility |
| --- | --- |
| **contribute** | For a given `ResourceIdentity`, obtain a producer’s contribution: zero or more namespace partitions |
| **compose** | Combine a `ResourceIdentity` and a provided producer collection into one immutable `ResourceMetadata` or a composition failure, under the rules of this RFC |

## 6. Examples

Examples are illustrative of semantic outcomes. They are not APIs.

### 6.1 Successful composition

```text
compose(
  identity: (crm, Customer),
  provided producers: {
    framework → { rf: { description → "CRM customer" } },
    graphql   → { graphql: { typeName → "Customer" } },
    admin     → {}
  }
)
→ ResourceMetadata {
    identity: (crm, Customer),
    entries: {
      (rf, description) → "CRM customer",
      (graphql, typeName) → "Customer"
    }
  }
```

The empty `admin` contribution has no effect.

### 6.2 Empty composition

```text
compose(
  identity: (crm, Customer),
  provided producers: {}
)
→ ResourceMetadata {
    identity: (crm, Customer),
    entries: {}
  }
```

### 6.3 Duplicate namespace ownership

```text
compose(
  identity: (crm, Customer),
  provided producers: {
    graphqlA → { graphql: { typeName → "Customer" } },
    graphqlB → { graphql: { typeName → "CrmCustomer" } }
  }
)
→ Duplicate namespace ownership
  (no ResourceMetadata)
```

### 6.4 Reserved namespace violation

```text
compose(
  identity: (crm, Customer),
  provided producers: {
    thirdParty → { rf: { description → "not allowed" } }
  }
)
→ Reserved namespace violation
  (no ResourceMetadata)
```

## 7. Non-goals (summary)

See §1.2. In particular, this RFC does not define discovery mechanisms, registry mutation, transport or persistence adapters, authoring syntax, concrete `rf` keys, or programming interfaces.

## 8. Design rationale

The extension model is intentionally a small algebra over metadata production:

- **Elements** — namespace partitions
- **Identity element** — empty contribution
- **Operation** — disjoint union of partitions
- **Invariant** — exclusive namespace ownership
- **Output** — one immutable `ResourceMetadata`, or failure

Exclusive ownership avoids inventing value-level merge policy before M2. Unordered producers and pure composition keep the model referentially transparent and leave evaluation strategy (sequential, parallel, cached) to implementations. Distinguishing framework/core producers from extension producers preserves RFC-002’s `rf` reservation without a separate metadata-injection path. Stopping before registry mutation keeps RFC-003 as the sole owner of association lifecycle.

## 9. Relationship to other RFCs

| RFC / milestone | Relationship |
| --- | --- |
| RFC-001 Resource Identity | Normative dependency: composition input identity; validity and equality unchanged |
| RFC-002 Metadata Model | Normative dependency: composition constructs one immutable `ResourceMetadata`; entry, key, and value rules unchanged |
| RFC-003 Registry Contracts | The registry associates completed `ResourceMetadata` snapshots with resource identities. It neither constructs nor composes metadata. Callers MAY invoke `register`/`replace` after successful composition; those operations are outside the scope of RFC-004 |
| M2 implementation | Implements producer/composition contracts in `@resource-forge/core` only after RFC-001–004 are accepted |

During drafting of this RFC, RFC-002 and RFC-003 are treated as frozen. Design gaps discovered here are recorded as review comments on those documents rather than silent edits.

## 10. Acceptance criteria

This RFC is accepted when:

1. Producer kinds, contributions, and namespace partitions are unambiguous.
2. Exclusive ownership, the `rf` restriction, and unordered/pure composition are fully specified.
3. Successful composition produces exactly one immutable RFC-002 `ResourceMetadata`; failed composition produces none.
4. Discovery, registry mutation, transports/persistence, authoring mechanisms, TypeScript APIs, and merge/reconciliation remain clearly out of scope.
5. No normative requirements depend on implementation language, storage mechanism, or runtime.
