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

**Status:** Partially accepted (cross-cutting locks). Concrete symbols deferred per slice.

Define the public contract surface intentionally before coding. Review scope follows approach **C**: lock categories, package/module ownership intent, and error/outcome philosophy globally; defer TypeScript names and per-slice export lists to each slice’s task breakdown.

### 5.1 Public contract categories — Accepted

`@resource-forge/core` may expose only these semantic categories:

- identity
- metadata
- registry
- extension / composition

Must **not** export:

- adapters
- runtime loaders
- discovery
- persistence
- framework integrations (`nest` / `graphql` / `prisma` / `cli`)
- internal helpers not needed by consumers

### 5.2 Module ownership intent — Accepted (layout is not a public contract)

Internal organization direction:

```text
packages/core/src/
  identity/
  metadata/
  registry/
  extension/
  index.ts   # public re-exports only
```

Co-located Vitest tests under each area. Exact file names inside those directories remain an implementation detail.

An in-memory registry is allowed **only** as a conforming implementation of RFC-003 semantics for tests and local use. It must not add persistence, networking, discovery, caching layers, synchronization, or indexing.

### 5.3 Error / outcome modeling — Accepted (philosophy only)

Use **explicit result types** for semantic operations where failure is an expected contract outcome. Reserve thrown exceptions for programmer misuse or broken invariants (not for RFC-defined outcomes).

RFCs describe outcomes such as:

```text
register → success | duplicate registration | validation failure | identity mismatch | …
lookup   → Hit | Miss
compose  → ResourceMetadata | composition failure
```

These are part of the contract, not exceptional control flow. Result-oriented modeling keeps those outcomes visible.

Exact TypeScript names (`Result`, `Success`/`Failure`, etc.) are **not** frozen here. Semantic failure classes from the RFCs must remain distinguishable regardless of naming.

### 5.4 Deferred to per-slice review

| Slice | Decide with task breakdown |
| --- | --- |
| M2.1 Identity | construct+validate+equal locked; concrete symbols in [M2.1 task plan](2026-08-06-m2-1-identity-primitives.md) |
| M2.2 Metadata | create/validate/equal + entry pairs + key kind; see [M2.2 task plan](2026-08-06-m2-2-metadata-model.md) |
| M2.3 Registry | registry contract shape, lookup/mutation outcome representation |
| M2.4 Composition | contribution representation, composition entry point, failure variants |

No full-package public symbol list is frozen before M2.1.

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
| Error modeling | explicit results for semantic outcomes; throws for misuse only | **Accepted** (§5.3) — names deferred |
| Registry reference impl | in-memory Map keyed by identity | Likely yes for tests; not a persistence layer |
| Public parse/format for identity | construct+validate public; parse/format deferred | **Accepted** — see M2.1 task plan |
| Composition public shape | function(s) vs small facade | Open — decide in M2.4 task breakdown |
| Module file names | under §5.2 directories | Open — not a public contract |
| Branding / opaque types | nominal vs structural TypeScript types | Open — must not change RFC equality |
| Placeholder exports | keep `PACKAGE_NAME` / `PACKAGE_VERSION` | Keep for continuity unless export review removes them |

Build tooling (Vitest, tsc, turbo) already exists from M1 — no change required for M2 unless gaps appear.

---

## 9. Completion criteria

### 9.1 This plan (planning gate)

- [x] this plan is reviewed and Accepted;

Cross-cutting export locks (§5.1–§5.3):

- [x] public categories accepted;
- [x] module ownership intent accepted;
- [x] error/outcome philosophy accepted;

M2 coding begins only after:

- [ ] M2.1 export decisions (§5.4) accepted with the M2.1 task breakdown;
- [ ] contract inventory (§4) treated as the semantic checklist;
- [ ] implementation tasks for **M2.1** are written (bite-sized TDD) and accepted.

### 9.2 M2 milestone (implementation gate)

M2 is complete when:

- [x] M2.1–M2.4 invariants in §7 have green tests in `@resource-forge/core`;
- [x] public exports match the accepted §5 contract surface;
- [x] no NestJS / GraphQL / Prisma / decorator / discovery code landed in core;
- [x] placeholder packages outside core remain feature-free;
- [x] docs status: roadmap M2 updated to Done (or equivalent) only after the above.

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

Export boundary:
  categories / module intent / result philosophy ✅
  per-slice symbols ✅ (M2.1–M2.4 locked in task plans)

M2.1:
  code ✅ complete

M2.2:
  export decisions ✅
  task breakdown ✅ `2026-08-06-m2-2-metadata-model.md`
  code ✅ complete

M2.3:
  export decisions ✅
  task breakdown ✅ `2026-08-06-m2-3-registry-contracts.md`
  code ✅ complete

M2.4:
  export decisions ✅
  task breakdown ✅ `2026-08-07-m2-4-extension-composition.md`
  code ✅ complete (M2 milestone contract layer)
```
