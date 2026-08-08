# Roadmap

Resource Forge grows by design before implementation. After the repository foundation (M1), core vocabulary is specified as RFCs, then implemented as contracts, then modeled, then integrated.

| Milestone | Focus | Status |
| --- | --- | --- |
| M1 | Repository & workspace foundation | Done |
| — | Core architecture RFCs (gate before M2) | Done |
| M2 | Core contracts (vocabulary, not behavior) | Done |
| M3 | Resource model | In progress — M3.1 ✅; M3.2 Draft plan pending M5 |
| M4 | Integrations (Nest → GraphQL → Prisma) | Planned |
| M5 | CLI & end-to-end examples | Planned |

## Process: RFCs before contracts

Before implementing M2, architecture decisions are written as small RFCs under [`docs/superpowers/specs/`](superpowers/specs/). Implementation must not outrun design.

Planned RFCs for the M2 gate:

| RFC | Topic | Status |
| --- | --- | --- |
| RFC-001 | Resource identity | Accepted |
| RFC-002 | Metadata model | Accepted |
| RFC-003 | Registry contracts | Accepted |
| RFC-004 | Extension model | Accepted |

M3 gate RFCs:

| RFC | Topic | Status |
| --- | --- | --- |
| RFC-005 | Resource model | Accepted |
| RFC-006+ | Annotations; Resource Fields / Relations / Operations | Planned |

See [RFC process](rfc-process.md) and [RFC review checklist](rfc-review-checklist.md).

---

## M1 — Repository & workspace foundation

**Status:** Done

Monorepo layout, tooling, CI, placeholder packages, and documentation. No framework features.

---

## M2 — Core contracts

**Status:** Done

Establish the framework's **vocabulary**, not behavior. Deliverables live in `@resource-forge/core` as contracts and types — no runtime scanning or adapters.

### Deliverables

**Resource identity**

- What uniquely identifies a resource?
- Naming conventions
- Stable identifiers

**Metadata model**

- Immutable metadata objects
- Shared metadata primitives
- Extensible metadata without framework assumptions

**Registry contracts**

- Register resources
- Discover resources
- Query metadata
- Lifecycle kept intentionally minimal

**Extension points**

- Interfaces for transports
- Interfaces for persistence adapters
- Interfaces for metadata providers
- No implementations

### Non-goals

- Decorators
- Reflection
- Runtime scanning
- GraphQL
- Prisma
- NestJS

M2 defines the language of Resource Forge. It is gated by RFC-001–RFC-004.

---

## M3 — Resource model

**Status:** In progress — [M3 implementation plan](superpowers/plans/2026-08-07-m3-implementation-plan.md) Accepted; [M3.1 task plan](superpowers/plans/2026-08-07-m3-1-resource-contracts.md) Accepted (shipped). [M3.2 projection task plan](superpowers/plans/2026-08-08-m3-2-projection.md) **Draft** — next gate **M5 Plan Review**.

RFC-005 defines the authoritative Resource aggregate (`identity`, `schema`, `annotations`) and one-way projection to `ResourceMetadata`. Annotation representation and schema member vocabulary remain later RFCs.

Suggested implementation slices (see M3 implementation plan):

- **M3.1** — Resource / ResourceSchema contracts, minimal construction, validation
- **M3.2** — `projectResourceMetadata` (RFC-005 floor only)
- **M3.3+** — deferred until RFC-006 and Resource Fields / Relations / Operations RFCs

Still transport-agnostic; no Nest / GraphQL / Prisma work in M3.

---

## M4 — Integrations

Only after the core model is stable. Each adapter depends only on `@resource-forge/core`. Suggested order:

1. **Nest** — host the framework; discovery; DI; module registration
2. **GraphQL** — translate resource model into GraphQL; schema and resolver generation
3. **Prisma** — read Prisma metadata; map models to resources; persistence

Integrations remain independent of each other.

---

## M5 — CLI & examples

Developer experience after the ecosystem exists.

Potential commands (not committed APIs):

```text
rf init
rf generate resource
rf generate from-prisma
rf doctor
rf validate
```

Examples demonstrate the framework end to end. They are not the source of truth for architecture.
