# RFC review & acceptance checklist (M2 gate)

Use this checklist to accept RFC-002–004 before any M2 implementation. Do not write core contracts, scaffolding for contracts, or adapter code until the gate is closed.

**Current status**

| RFC | Topic | Status |
| --- | --- | --- |
| [RFC-001](superpowers/specs/2026-08-06-rfc-001-resource-identity-design.md) | Resource identity | Accepted |
| [RFC-002](superpowers/specs/2026-08-06-rfc-002-metadata-model-design.md) | Metadata model | Accepted |
| [RFC-003](superpowers/specs/2026-08-06-rfc-003-registry-contracts-design.md) | Registry contracts | Accepted |
| [RFC-004](superpowers/specs/2026-08-06-rfc-004-extension-model-design.md) | Extension model | Accepted |

Review in order: **002 → 003 → 004**. Treat earlier accepted RFCs as frozen; record cross-RFC gaps as review comments rather than silent edits.

On acceptance of each RFC: set **Status: Accepted** in the spec, update [specs index](superpowers/specs/README.md) and [roadmap](roadmap.md).

---

## 1. RFC-002 — Metadata model

**Goal:** lock the metadata foundation.

- [x] Is `ResourceMetadata` the correct immutable boundary?
- [x] Are entry / `MetadataKey` / `JsonValue` rules complete enough to implement validate/equal?
- [x] Is ownership clear (`rf` framework-owned vs non-`rf` producer-owned)?
- [x] Are equality and validity consistent with RFC-001 identity (identity explicit, not derived from entries)?
- [x] Are there any hidden extension, registry, transport, or persistence assumptions leaking into the model?

**Accept when:** boundaries are crisp and no further design questions block M2 metadata contracts.

---

## 2. RFC-003 — Registry contracts

**Goal:** lock registry responsibility.

- [x] Does the registry only associate identity → completed immutable metadata snapshots?
- [x] Are register / replace / unregister / lookup / enumerate semantics clear (including Hit/Miss)?
- [x] Is snapshot replacement current-state-only (no retained history)?
- [x] Is the registry explicitly prevented from constructing, merging, or interpreting extension metadata?
- [x] Does it remain free of discovery protocols, search indexes, and programming-interface prescriptions?

**Accept when:** association ownership is unambiguous and production stays outside the registry (RFC-004).

---

## 3. RFC-004 — Extension model

**Goal:** lock extension and composition boundaries.

- [x] Are producers responsible for contributing metadata (namespace partitions)?
- [x] Is composition a semantic capability only (no prescribed public API / operation names)?
- [x] Can multiple producers contribute without the registry becoming an orchestrator?
- [x] Are exclusive namespace ownership, empty contribution, unordered producers, and pure composition unambiguous?
- [x] Is the composition boundary sufficient for future authoring styles and adapters without redesigning 001–003?

**Accept when:** production/composition is fully specified and discovery, DI, transports, and persistence remain out of scope.

---

## 4. After RFC-002–004 acceptance — freeze M2 contract surface

Do **not** start coding until the plan is Accepted.

Plan: [`docs/superpowers/plans/2026-08-06-m2-implementation-plan.md`](superpowers/plans/2026-08-06-m2-implementation-plan.md) (Accepted).

Next before code: accept §5 export boundary, then write the M2.1 task breakdown. Suggested slices:

1. **M2.1** Identity primitives (RFC-001)
2. **M2.2** Metadata model (RFC-002)
3. **M2.3** Registry (RFC-003)
4. **M2.4** Extension composition (RFC-004)

---

## Coherence check (all four)

Before opening M2, confirm the pipeline has no overlaps:

```text
ResourceIdentity (RFC-001)
        ↓
Metadata Producers + Composition (RFC-004)
        ↓
ResourceMetadata (RFC-002)
        ↓
Registry register/replace (RFC-003)
```

- [x] No RFC redefines another’s responsibility
- [x] NestJS, GraphQL, Prisma, decorators, and persistence are not first-class in any gate RFC
- [x] M2 remains vocabulary/contracts only (no runtime scanning or adapters)
