# Roadmap

Resource Forge grows by design before implementation. After the repository foundation (M1), core vocabulary is specified as RFCs, then implemented as contracts, then modeled, then integrated.

| Milestone | Focus | Status |
| --- | --- | --- |
| M1 | Repository & workspace foundation | Done |
| — | Core architecture RFCs (gate before M2) | Done |
| M2 | Core contracts (vocabulary, not behavior) | Done |
| M3 | Resource model | In progress — M3.1–M3.5 ✅; RFC-009 Accepted; M3.6 Field Types Draft plan on [#23](https://github.com/rexescario-dev/resource-forge/issues/23) (still blocked on Operations / association / vocabulary RFCs for other slices) |
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
| RFC-006 | Annotations | Accepted — [#8](https://github.com/rexescario-dev/resource-forge/issues/8) |
| RFC-007 | Resource Fields (member + ordered `fields` sequence) | Accepted — [#13](https://github.com/rexescario-dev/resource-forge/issues/13) |
| RFC-008 | Resource Relations (member + ordered `relations` sequence) | Accepted — [#17](https://github.com/rexescario-dev/resource-forge/issues/17) |
| RFC-009 | Resource Field Types (required `{ name, type }`; closed `FieldType`) | Accepted — [#21](https://github.com/rexescario-dev/resource-forge/issues/21) |
| RFC-010+ | Nullability / constraints; Operations; association semantics; annotation vocabulary; richer projection | Planned |

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

**Status:** In progress — [M3 implementation plan](superpowers/plans/2026-08-07-m3-implementation-plan.md) Accepted; [M3.1](superpowers/plans/2026-08-07-m3-1-resource-contracts.md) ✅; [M3.2](superpowers/plans/2026-08-08-m3-2-projection.md) ✅; [RFC-006](superpowers/specs/2026-08-08-rfc-006-annotations-design.md) Accepted; [M3.3 annotations](superpowers/plans/2026-08-08-m3-3-annotations.md) ✅ ([#10](https://github.com/rexescario-dev/resource-forge/issues/10)); [RFC-007](superpowers/specs/2026-08-08-rfc-007-resource-fields-design.md) Accepted; [M3.4 fields](superpowers/plans/2026-08-08-m3-4-fields.md) ✅ ([#15](https://github.com/rexescario-dev/resource-forge/issues/15)); [RFC-008](superpowers/specs/2026-08-08-rfc-008-resource-relations-design.md) Accepted ([#17](https://github.com/rexescario-dev/resource-forge/issues/17)); [M3.5 relations](superpowers/plans/2026-08-08-m3-5-relations.md) ✅ ([#19](https://github.com/rexescario-dev/resource-forge/issues/19)); [RFC-009](superpowers/specs/2026-08-08-rfc-009-resource-field-types-design.md) Accepted ([#21](https://github.com/rexescario-dev/resource-forge/issues/21)); [M3.6 Field Types plan](superpowers/plans/2026-08-08-m3-6-field-types.md) Draft ([#23](https://github.com/rexescario-dev/resource-forge/issues/23)). Other slices still blocked on Operations / association / vocabulary RFCs as needed.

RFC-005 defines the authoritative Resource aggregate (`identity`, `schema`, `annotations`) and one-way projection to `ResourceMetadata`. RFC-006 defines the annotation container, validation, and direct projection participation. RFC-007 defines the ordered `fields` sequence and `FieldName` (Field shape amended by RFC-009). RFC-008 defines name-only Relation members and the ordered `relations` sequence. RFC-009 requires closed typed Fields `{ name, type }` with `FieldType` ∈ {string, number, boolean}. Named annotation vocabulary, association semantics, nullability/constraints, and operations remain later RFCs.

Suggested implementation slices (see M3 implementation plan):

- **M3.1** — Resource / ResourceSchema contracts, minimal construction, validation ✅
- **M3.2** — `projectResourceMetadata` (RFC-005 floor only) ✅
- **M3.3** — Annotations per RFC-006 (container + validation + direct projection) ✅
- **M3.4** — Fields per RFC-007 (member + ordered sequence + validation) ✅ — [#15](https://github.com/rexescario-dev/resource-forge/issues/15)
- **M3.5** — Relations per RFC-008 (member + ordered sequence + validation) ✅ — [#19](https://github.com/rexescario-dev/resource-forge/issues/19)
- **M3.6** — Field Types per RFC-009 (required `{ name, type }` + closed `FieldType`) — [#23](https://github.com/rexescario-dev/resource-forge/issues/23) (M4 Draft plan; M5→M6 on same PR; breaking vs M3.4 name-only Fields)
- **M3.7+** — deferred until Operations / association / nullability-constraints / vocabulary RFCs as needed

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
