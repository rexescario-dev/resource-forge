# M3 Implementation Plan

> **For agentic workers:** Plan Status is **Accepted**. Do **not** implement Resource production code until the §5 export boundary for the active slice is accepted and that slice’s bite-sized TDD task plan exists. Then REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. This plan intentionally omits TypeScript signatures so the public surface is agreed before code freezes it.

**Status:** Accepted  
**Depends on:** RFC-005 (Accepted); RFC-001–004 (Accepted, unchanged)  
**Package:** `@resource-forge/core`  
**Scope:** Resource authoritative contracts + RFC-005 projection floor only (not annotations vocabulary, not schema members, not adapters)

**Goal:** Translate accepted RFC-005 semantics into implementation boundaries and a sequenced delivery plan for `@resource-forge/core`, without introducing new architecture or reopening M2.

**Architecture:** RFC-005 remains the source of truth. M3 adds a Resource aggregate (`identity`, `schema`, `annotations`) above M2. Schema owns the model; `ResourceMetadata` is a one-way projection. Registry stays association-only; composition stays pure. Annotation representation and Field / Relation / Operation member types wait for later RFCs.

**Tech Stack:** Existing monorepo — TypeScript (strict), Vitest, pnpm workspaces, Turborepo. No new runtime dependencies for NestJS, GraphQL, or Prisma.

**Specs:**

- `docs/superpowers/specs/2026-08-07-rfc-005-resource-model-design.md`
- `docs/superpowers/specs/2026-08-06-rfc-001-resource-identity-design.md`
- `docs/superpowers/specs/2026-08-06-rfc-002-metadata-model-design.md`
- `docs/superpowers/specs/2026-08-06-rfc-003-registry-contracts-design.md`
- `docs/superpowers/specs/2026-08-06-rfc-004-extension-model-design.md`

---

## 1. Purpose

Translate accepted RFC-005 semantics into implementation boundaries.

This plan does **not** introduce new semantics. Where this plan and an RFC disagree, the RFC wins and this plan must be revised.

M3 (this gate) implements only what RFC-005 authorizes:

- Resource / ResourceSchema structural contracts;
- construction and validation of the minimal Resource;
- `projectResourceMetadata` satisfying the RFC-005 floor.

It is not annotation authoring, schema vocabulary, a host runtime, or an integration toolkit.

---

## 2. Implementation constraints

### 2.1 M3 SHALL

- implement accepted RFC-005 contracts only;
- preserve M2 ownership boundaries (identity, metadata, registry, composition unchanged);
- keep Resource authoritative: no `metadata` property on Resource;
- keep projection one-way and pure (no Resource mutation; no reverse mapping);
- keep the registry association-only (consumes projected `ResourceMetadata` only);
- keep composition pure and free of Resource authoring or registry side effects;
- expose a minimal public surface;
- avoid runtime discovery, adapters, persistence, and framework coupling.

### 2.2 M3 SHALL NOT

- define annotation representation, vocabulary, or non-empty annotation validation (RFC-006+);
- define Field / Relation / Operation member types or collection ordering/uniqueness;
- invent reserved metadata keys or schema vocabulary for projection;
- require projection to call `composeResourceMetadata` (may or may not; not locked here);
- add compose-and-register helpers as the primary semantic path;
- register Resource objects in the registry;
- introduce decorators or authoring DSLs;
- integrate GraphQL / NestJS / Prisma;
- expand `@resource-forge/nest|graphql|prisma|cli` beyond existing placeholders;
- implement equality, hashing, cloning, builders, or mutators unless a later accepted RFC/plan requires them.

---

## 3. Package ownership

### `@resource-forge/core`

**Owns (additive in M3):**

- Resource / ResourceSchema contracts (RFC-005)
- Resource construction and validation (RFC-005 floor)
- `projectResourceMetadata` (RFC-005 floor)
- tests proving the above invariants

**Continues to own (M2, unchanged):**

- identity, metadata, registry, extension/composition contracts

**Does not own:**

- application resources
- integrations
- persistence
- transports
- runtime discovery
- CLI or code generation
- annotation vocabulary or schema member catalogs

Other packages (`nest`, `graphql`, `prisma`, `cli`) remain placeholders and must not gain M3 features.

---

## 4. Contract inventory

| RFC | Concept | Planned artifact (semantic) | Notes |
| --- | --- | --- | --- |
| RFC-005 | Resource | authoritative aggregate type | `identity` + `schema` + `annotations`; no `metadata` property |
| RFC-005 | ResourceSchema | schema container | conceptually contains `fields`, `relations`, `operations`; empty is valid |
| RFC-005 | Annotations slot | opaque empty-capable slot | representation deferred; empty permitted |
| RFC-005 | Construction | construct minimal Resource | valid identity + empty schema collections + empty annotations |
| RFC-005 | Validation | validate Resource | identity + schema presence/collections + empty annotations permitted |
| RFC-005 | Projection | `projectResourceMetadata` | identity-preserving; RFC-002-valid; minimal Resource succeeds |

Exact TypeScript names and module paths are **open until §5 export boundary is accepted** per slice. Do not treat the “Planned artifact” column as a frozen public API list.

---

## 5. Export boundary

**Status:** Cross-cutting locks Accepted (§5.1–§5.3). Concrete symbols deferred per slice.

Define the public contract surface intentionally before coding. Same approach as M2: lock categories, module ownership intent, and error/outcome philosophy globally; defer TypeScript names and per-slice export lists to each slice’s task breakdown.

### 5.1 Public contract categories — Accepted

`@resource-forge/core` may expose M2 categories plus:

- resource (Resource / ResourceSchema / construction / validation / projection)

Must **not** newly export:

- annotation vocabulary or builders
- field / relation / operation member APIs
- adapters, discovery, persistence
- framework integrations
- compose-and-register convenience as the primary path
- internal helpers not needed by consumers

Existing M2 exports remain unless a later accepted decision revises them.

### 5.2 Module ownership intent — Accepted (layout is not a public contract)

Internal organization direction (additive):

```text
packages/core/src/
  identity/      # M2 — unchanged ownership
  metadata/      # M2
  registry/      # M2
  extension/     # M2
  resource/      # M3 — Resource, schema, validate, project
  index.ts       # public re-exports only
```

Co-located Vitest tests under `resource/`. Exact file names inside that directory remain an implementation detail.

### 5.3 Error / outcome modeling — Accepted (inherit M2)

Use **explicit result types** for semantic operations where failure is an expected contract outcome. Reserve thrown exceptions for programmer misuse or broken invariants.

RFC-005 outcomes include:

```text
Construction and validation produce either a valid Resource or a validation failure.
Projection produces either RFC-002-valid ResourceMetadata or a failure outcome when projection cannot proceed.
```

Exact TypeScript error discriminant names are **not** frozen here. Reuse the existing `Result` helpers from M2 unless a slice export review justifies otherwise.

### 5.4 Deferred to per-slice review

| Slice | Decide with task breakdown |
| --- | --- |
| M3.1 Resource contracts | public types/factories for Resource / ResourceSchema; validation error shape; how empty annotations are represented without locking RFC-006 |
| M3.2 Projection | `projectResourceMetadata` symbol; success/failure shape; what empty projected `entries` look like under the RFC-005 floor (no vocabulary) |

No full-package public symbol list is frozen before M3.1.

---

## 6. RFC → implementation mapping

Implement in order. Each slice must be testable alone. Do not start a later slice until the previous slice’s tests pass and are committed.

### M3.1 Resource contracts

**Source:** RFC-005 §§2, 4.1–4.2  

**Responsibilities:**

- represent Resource (`identity`, `schema`, `annotations`);
- represent ResourceSchema with conceptual `fields`, `relations`, `operations` collections;
- construct a minimal valid Resource;
- validate Resource (RFC-001 identity + schema presence/collections + empty annotations permitted);
- keep annotations opaque enough that RFC-006 can define representation later (empty must be expressible).

**Depends on:** M2.1 identity.  

**Must not:** implement `projectResourceMetadata` or any projection behavior beyond what is necessary to represent the Resource contract; define annotation contents; define field/relation/operation members; touch registry or composition.

### M3.2 Projection (RFC-005 floor)

**Source:** RFC-005 §§3, 4.3  

**Responsibilities:**

- provide `projectResourceMetadata`;
- preserve identity (RFC-001 equality);
- produce RFC-002-valid `ResourceMetadata`;
- succeed for minimal Resource (empty schema collections + empty annotations);
- remain pure (no Resource mutation; no registry calls).

**Depends on:** M3.1; M2.2 metadata.  

**Must not:** invent schema/annotation vocabulary; require `composeResourceMetadata`; reverse-project; register snapshots.

### M3.3+ Deferred

**Blocked on:** RFC-006 (Annotations) and later Resource Fields / Relations / Operations RFCs.

Do not schedule production implementation for non-empty annotations or schema members under this plan.

---

## 7. Test obligations

Tests prove RFC-005 invariants. Prefer pure unit tests in `packages/core`. No Nest/GraphQL/Prisma test harnesses.

### Resource contracts (M3.1)

- minimal Resource construction succeeds with valid identity
- invalid identity fails validation / construction per accepted export decisions
- every Resource has a schema with three named conceptual collections
- empty `fields` / `relations` / `operations` is valid
- empty annotations are valid
- Resource has no authoritative `metadata` property in the public contract
- validation does not require non-empty schema members or annotation vocabulary

### Projection (M3.2)

- minimal Resource projects successfully
- projected metadata identity equals Resource identity (RFC-001)
- projected snapshot is RFC-002-valid
- projection does not mutate the Resource
- projection does not call register/replace
- invalid Resource is not required to project successfully (failure outcome distinguishable)

### Explicit non-coverage under this plan

- non-empty annotations
- field / relation / operation member semantics
- reserved projection keys / schema vocabulary
- Resource equality
- builders / mutators
- registry integration helpers beyond caller-driven register of projected snapshots

---

## 8. Open implementation decisions

Only decisions not covered by RFCs belong here. No semantic decisions.

| Decision | Options / note | Status |
| --- | --- | --- |
| Error modeling | inherit M2 `Result` philosophy | **Accepted** — names deferred to slice plans |
| Empty annotations representation | sentinel empty value vs empty structural placeholder vs branded void | Open — M3.1 export review; must not freeze RFC-006 vocabulary |
| Empty schema collections representation | opaque empty arrays vs branded empty collections | Open — M3.1; must not imply ordering/uniqueness rules |
| Projection floor entries | No metadata vocabulary is introduced in this slice. If an empty `entries` representation satisfies RFC-002, it is the simplest implementation, but the export review remains authoritative. | Open — M3.2 |
| Projection vs compose | may call `composeResourceMetadata` internally or not | Open — M3.2; not required by RFC-005 |
| Module file names | under `resource/` | Open — not a public contract |
| Branding / opaque types | nominal vs structural | Open — must not change RFC equality / validation semantics |
| Placeholder package exports | keep `PACKAGE_NAME` / `PACKAGE_VERSION` | Keep |

Build tooling already exists from M1/M2 — no change required for M3 unless gaps appear.

---

## 9. Completion criteria

### 9.1 This plan (planning gate)

- [x] this plan is reviewed and Accepted;

Cross-cutting export locks (§5.1–§5.3):

- [x] public categories accepted;
- [x] module ownership intent accepted;
- [x] error/outcome philosophy accepted (inherit M2);

M3 coding begins only after:

- [x] M3.1 export decisions (§5.4) accepted with the M3.1 task breakdown;
- [x] contract inventory (§4) treated as the semantic checklist;
- [x] implementation tasks for **M3.1** are written (bite-sized TDD) and accepted.

### 9.2 M3.1–M3.2 slice gate (RFC-005 floor)

RFC-005 floor implementation is complete when:

- [ ] M3.1–M3.2 invariants in §7 have green tests in `@resource-forge/core`;
- [ ] public exports match the accepted §5 contract surface for those slices;
- [ ] projection remains one-way; no reverse projection introduced;
- [ ] no NestJS / GraphQL / Prisma / decorator / discovery code landed in core;
- [ ] placeholder packages outside core remain feature-free;
- [ ] no annotation vocabulary or schema member types beyond empty collections;
- [ ] docs status: roadmap M3 updated to reflect RFC-005 floor done (or equivalent) only after the above.

### 9.3 First code slice after acceptance

Intentionally small:

```text
M3.1 → Resource contracts
```

RFC-005 structural contracts first. Do not start M3.2 until M3.1 tests pass.

---

## 10. Risk to avoid

Do **not** expand M3 into “full resource framework” before annotations and schema RFCs exist.

Keep this gate as:

```text
Resource aggregate + validation + projection floor
```

Not:

```text
annotation DSL + field catalog + GraphQL mapping + registry of Resources + builders
```

Do not treat projected `ResourceMetadata` as persistent Resource state.

Those belong to RFC-006+, later M3 slices, M4, or later plans.

---

## 11. Checkpoint

```text
RFCs:
  001–004 ✅ Accepted (unchanged)
  005 ✅ Accepted
  006+ ⏳ Planned

Plan:
  M3 implementation plan ✅ Accepted

Export boundary:
  categories / module intent / result philosophy ✅ §5.1–§5.3
  per-slice symbols ⛔ after slice task plans Accepted

M3.1:
  export decisions ✅ Accepted task plan `2026-08-07-m3-1-resource-contracts.md`
  task breakdown ✅ same
  code ✅ M3.1 complete (projection still M3.2)

M3.2:
  export decisions ⛔
  task breakdown ⛔
  code ⛔

M3.3+:
  blocked on RFC-006 / schema RFCs
```

---

## 12. Immediate next steps (after this plan is Accepted)

1. Accept §5.1–§5.3 cross-cutting export locks (or revise explicitly).
2. Write **M3.1** bite-sized TDD task plan with concrete public exports.
3. Accept M3.1 task plan.
4. Implement M3.1 via TDD.
5. Write and accept **M3.2** task plan + exports; implement projection floor.
6. Stop. Do not invent RFC-006/schema work under this plan.
