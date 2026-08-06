# M2 Implementation Plan

> **For agentic workers:** Plan Status is Accepted. Do **not** implement code until the §5 export boundary is accepted and M2.1 bite-sized TDD tasks exist. Then REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. This plan intentionally omits TypeScript signatures so the public surface is agreed before code freezes it.

**Status:** Accepted  
**Depends on:** RFC-001–004 (Accepted)  
**Package:** `@resource-forge/core`  
**Scope:** Contract implementation only (vocabulary + invariants; not behavior of adapters or hosts)

**Goal:** Translate accepted RFC semantics into implementation boundaries and a sequenced delivery plan for `@resource-forge/core`, without introducing new architecture.

**Architecture:** RFCs remain the source of truth. M2 implements identity, immutable metadata, registry association, and producer/composition contracts inside `packages/core` only. Composition produces snapshots; the registry associates them; no discovery, adapters, or framework coupling.

**Tech Stack:** Existing monorepo — TypeScript (strict), Vitest, pnpm workspaces, Turborepo. No new runtime dependencies for NestJS, GraphQL, or Prisma.

**Specs:**

- `docs/superpowers/specs/2026-08-06-rfc-001-resource-identity-design.md`
- `docs/superpowers/specs/2026-08-06-rfc-002-metadata-model-design.md`
- `docs/superpowers/specs/2026-08-06-rfc-003-registry-contracts-design.md`
- `docs/superpowers/specs/2026-08-06-rfc-004-extension-model-design.md`

---

## 1. Purpose

Translate accepted RFC semantics into implementation boundaries.

This plan does **not** introduce new semantics. RFCs remain the source of truth. Where this plan and an RFC disagree, the RFC wins and this plan must be revised.

M2 is the contract layer: types, pure functions / minimal objects that enforce RFC invariants, and tests that prove those invariants. It is not a framework host, plugin system, or integration toolkit.

---

## 2. Implementation constraints

### 2.1 M2 SHALL

- implement accepted contracts only;
- preserve RFC ownership boundaries (001 identity, 002 metadata, 003 registry, 004 production/composition);
- expose a minimal public surface;
- keep composition pure (no registry side effects);
- keep the registry association-only (no metadata construction or merge);
- avoid runtime discovery;
- avoid adapters;
- avoid persistence;
- avoid framework coupling (NestJS, GraphQL, Prisma, decorators, reflection, module scanning).

### 2.2 M2 SHALL NOT

- define resource schemas (fields, relations, operations) — M3;
- introduce decorators or authoring DSLs;
- scan modules or load plugins;
- integrate GraphQL / NestJS / Prisma;
- create storage abstractions;
- create provider loading / DI systems;
- invent merge/reconciliation across producers;
- add compose-and-register helpers as the primary semantic path;
- expand `@resource-forge/nest|graphql|prisma|cli` beyond existing placeholders.

---

## 3. Package ownership

### `@resource-forge/core`

**Owns:**

- identity contracts (RFC-001)
- metadata contracts (RFC-002)
- registry contracts (RFC-003)
- producer / composition contracts (RFC-004)
- tests proving the above invariants

**Does not own:**

- application resources
- integrations
- persistence
- transports
- runtime discovery
- CLI or code generation

**Existing placeholder:** `packages/core` already exists (M1) with `PACKAGE_NAME` / `PACKAGE_VERSION` smoke exports. M2 replaces the TODO surface with contracts; keep package name and workspace wiring.

Other packages (`nest`, `graphql`, `prisma`, `cli`) remain placeholders and must not gain M2 features.

---

## 4. Contract inventory

| RFC | Concept | Planned artifact (semantic) | Notes |
| --- | --- | --- | --- |
| RFC-001 | `ResourceIdentity` | identity type + equality | Structured `(namespace, name)` |
| RFC-001 | validate / parse / format | identity operations | Grammar + reserved `rf` namespace for resource types |
| RFC-002 | `MetadataKey` | key type + equality | Independent of resource-name grammar |
| RFC-002 | `JsonValue` | value constraint / type | JSON-compatible only |
| RFC-002 | `ResourceMetadata` | immutable snapshot type | Explicit `identity` + unordered entries |
| RFC-002 | validate / equal | metadata operations | No required `rf` keys |
| RFC-003 | Resource Registry | registry contract | Current-state association only |
| RFC-003 | register / replace / unregister / lookup / enumerate | registry operations | Semantic outcomes, Hit/Miss |
| RFC-004 | Metadata Producer (framework vs extension) | producer contract | Semantic roles, not DI |
| RFC-004 | Namespace partition / contribution | contribution model | Exclusive ownership |
| RFC-004 | Composition capability | composition API (names TBD at export review) | Pure; no registry mutation |

Exact TypeScript names and module paths are **open until §5 export boundary is accepted**. Do not treat the “Planned artifact” column as a frozen public API list.

---

## 5. Export boundary

Define the public contract surface intentionally before coding.

### 5.1 Intended public surface (categories)

Initial exports should expose only:

- identity concepts
- metadata concepts
- registry concepts
- extension / composition concepts

### 5.2 Must not export (initially)

- internal helpers
- validation internals not needed by consumers
- adapters
- runtime implementations (plugin loaders, scanners)
- anything from `nest` / `graphql` / `prisma` / `cli`

### 5.3 Proposed module layout (for review; not frozen)

| Path | Responsibility |
| --- | --- |
| `packages/core/src/identity/` | RFC-001 types and operations |
| `packages/core/src/metadata/` | RFC-002 types and operations |
| `packages/core/src/registry/` | RFC-003 registry contract + in-memory reference impl if needed for tests |
| `packages/core/src/extension/` | RFC-004 producer + composition |
| `packages/core/src/index.ts` | Public re-exports only |
| `packages/core/src/**/*.test.ts` | Co-located Vitest tests proving RFC invariants |

An in-memory registry is allowed **only** as a conforming implementation of RFC-003 semantics for tests and local use. It must not add persistence, networking, or discovery.

### 5.4 Export review gate

Before Task M2.1 code lands, agree:

1. public export list (symbols);
2. error / result modeling style (throw vs result types) — implementation decision, must not change RFC outcomes;
3. whether parse/format for identity are public in v0;
4. whether composition entry points are functions, a small facade, or both — names only, semantics from RFC-004.

---

## 6. RFC → implementation mapping

Implement in order. Each slice must be testable alone. Do not start a later slice until the previous slice’s tests pass and are committed.

### M2.1 Identity primitives

**Source:** RFC-001  

**Responsibilities:**

- represent identity;
- validate identity (grammar + reserved `rf` for user-defined resources as specified);
- compare identity equality (exact, case-sensitive);
- parse / format canonical `namespace/name` if exposed per §5.4.

**Depends on:** nothing inside core.  

**Must not:** touch metadata, registry, or producers.

### M2.2 Metadata model

**Source:** RFC-002  

**Responsibilities:**

- immutable metadata snapshot;
- entries, keys, JSON values;
- validation and equality;
- preserve unknown namespaces;
- keep identity explicit and non-derived.

**Depends on:** M2.1 identity.  

**Must not:** registry mutation, producers, merge of snapshots.

### M2.3 Registry

**Source:** RFC-003  

**Responsibilities:**

- register, replace, unregister;
- lookup (Hit/Miss);
- enumerate registered identities;
- enforce identity ↔ `metadata.identity` agreement;
- reject duplicate register / missing replace-unregister / invalid inputs.

**Depends on:** M2.1, M2.2.  

**Must not:** compose metadata, interpret entry semantics, retain history, search by metadata values.

### M2.4 Extension composition

**Source:** RFC-004  

**Responsibilities:**

- producer contribution model (namespace partitions);
- exclusive namespace ownership;
- framework/core vs extension producer role for `rf`;
- pure composition → one `ResourceMetadata` or failure;
- empty contribution and empty producer set success paths;
- order independence.

**Depends on:** M2.1, M2.2.  

**Must not:** mutate the registry; discover/load producers; define authoring syntax.

---

## 7. Test obligations

Tests prove RFC invariants. Prefer pure unit tests in `packages/core`. No Nest/GraphQL/Prisma test harnesses.

### Identity (RFC-001)

- valid identity acceptance
- invalid identity rejection (casing, separators, empty segments, reserved `rf` for user-defined cases)
- equality semantics (case-sensitive; no normalization)
- parse/format round-trip for valid canonical forms (if those ops are public)

### Metadata (RFC-002)

- immutable snapshot behavior (changes produce new values)
- key equality and grammar
- JSON value validation (accept legal / reject runtime-specific types if validation rejects them)
- identity remains explicit (not derived from entries)
- unordered entry semantics / equality independent of insertion order
- empty entries allowed
- duplicate keys rejected
- unknown namespaces preserved under documented consumer rules (where exercised)

### Registry (RFC-003)

- register success
- duplicate registration failure
- replace behavior (no history)
- unregister behavior
- lookup hit / miss
- identity mismatch rejection
- invalid identity or metadata rejection
- enumeration reflects current registered identities only

### Composition (RFC-004)

- empty composition → empty entries snapshot
- multiple namespace contributions compose
- duplicate namespace failure (no snapshot)
- `rf` restriction (extension producer cannot contribute `rf`)
- empty producer contribution is a no-op
- producer order independence (same contributions → equal metadata)
- failed composition creates no snapshot
- composition does not call register/replace

---

## 8. Open implementation decisions

Only decisions not covered by RFCs belong here. No semantic decisions.

| Decision | Options / note | Status |
| --- | --- | --- |
| Error modeling | thrown errors vs discriminated results | Open — pick at export review; outcomes must match RFC failure classes |
| Registry reference impl | in-memory Map keyed by identity | Likely yes for tests; not a persistence layer |
| Public parse/format for identity | expose in v0 vs validate+construct only | Open |
| Composition public shape | function(s) vs small facade | Open — semantics fixed by RFC-004 §5 |
| Module file names | as in §5.3 or flatter `src/*.ts` | Open — keep public surface stable either way |
| Branding / opaque types | nominal vs structural TypeScript types | Open — must not change RFC equality |
| Placeholder exports | keep `PACKAGE_NAME` / `PACKAGE_VERSION` | Keep for continuity unless export review removes them |

Build tooling (Vitest, tsc, turbo) already exists from M1 — no change required for M2 unless gaps appear.

---

## 9. Completion criteria

### 9.1 This plan (planning gate)

- [x] this plan is reviewed and Accepted;

M2 coding begins only after:

- [ ] export boundary (§5) is accepted;
- [ ] contract inventory (§4) is accepted as the semantic checklist;
- [ ] open decisions in §8 that affect public surface are resolved;
- [ ] implementation tasks for **M2.1** are written (bite-sized TDD) or explicitly authorized to be derived in-session from §6–§7.

### 9.2 M2 milestone (implementation gate)

M2 is complete when:

- [ ] M2.1–M2.4 invariants in §7 have green tests in `@resource-forge/core`;
- [ ] public exports match the accepted §5 contract surface;
- [ ] no NestJS / GraphQL / Prisma / decorator / discovery code landed in core;
- [ ] placeholder packages outside core remain feature-free;
- [ ] docs status: roadmap M2 updated to Done (or equivalent) only after the above.

### 9.3 First code slice after acceptance

Intentionally small:

```text
M2.1 → identity primitives
```

RFC-001 is frozen and is the narrowest surface. Do not start M2.2 until M2.1 tests pass.

---

## 10. Risk to avoid

Do **not** expand M2 into a “framework foundation” before the contract layer exists.

Keep M2 as:

```text
vocabulary + invariant implementation
```

Not:

```text
host runtime + plugin system + adapters + schema model
```

Those belong to M3+ and later RFCs.

---

## 11. Checkpoint

```text
RFCs:
  001 ✅ Accepted
  002 ✅ Accepted
  003 ✅ Accepted
  004 ✅ Accepted

Plan:
  M2 implementation plan ✅ Accepted

Next:
  Export boundary review ⏳
  M2.1 task breakdown ⏳

Code:
  @resource-forge/core 🔒 locked until export boundary + M2.1 tasks are accepted
```
