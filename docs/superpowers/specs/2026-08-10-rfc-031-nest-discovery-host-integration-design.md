# RFC-031: Nest Discovery-First Host Integration

**Date:** 2026-08-10  
**Status:** Accepted  
**M3:** Accepted (2026-08-10) — Design Review; no design blockers after locking init-registry isolation (private until full success; fresh/isolated registry; no transactional core registry API) and exactly-one resolution wording (no abstract determinism). Discovery-first Nest host: Nest module + discoverability marker + hosting lifecycle discover→resolve→validate→project→register into core `ResourceRegistry`; fail-closed DI exposure; Nest→core dependency only; no decorator DSL; GraphQL/Prisma/emitters/query APIs/M3 reopen fenced. M4 (implementation planning) authorized for `#106`.  
**Package:** `@resource-forge/nest` (Nest host integration; consumes `@resource-forge/core`)  
**Tracking:** [#106](https://github.com/rexescario-dev/resource-forge/issues/106)  
**Depends on:** RFC-001 (Resource Identity), RFC-002 (Metadata Model), RFC-003 (Registry Contracts — `ResourceRegistry` association semantics), RFC-005 (Resource Model — `Resource`, `validateResource`, `projectResourceMetadata`), RFC-006 (Annotations — currently authorized concrete projection source), RFC-023 (Projection Composition — no silent emitters), RFC-030 (Relation→metadata non-contribution closure)  
**Followed by:** M4.1 implementation planning/delivery for `#106` after Accept; M4.2 GraphQL; M4.3 Prisma; richer Nest authoring/decorator RFCs only if separately Accepted  
**Unblocks:** A Nest application hosting boundary that registers discovered resources into the existing core registry without Nest concerns entering `@resource-forge/core`

**Amends / specializes:** Opens M4 Integrations for Nest only. Does **not** reopen or extend M3, RFC-005–RFC-030, deferred metadata-emitter work, RFC-028 persistence correspondence realization, or GraphQL/Prisma adapter design.

## Primary question

> How does a Nest application expose resource declarations to the existing core registry without making Nest-specific concerns part of `@resource-forge/core`?

## Thesis

RFC-031 locks M4.1 as a **discovery-first Nest host** for Resource Forge:

- **`@resource-forge/nest` is the Nest integration package.** It depends on `@resource-forge/core`. Core MUST NOT depend on Nest.
- **The populated registry is the existing core `ResourceRegistry` abstraction** (RFC-003). Nest owns hosting/lifecycle and DI exposure, not a parallel registry model.
- **Discovery identifies Nest providers that resolve successfully to exactly one already-constructed core `Resource`.** A minimal discoverability marker is authorized only for that purpose.
- **Registration lifecycle is normative and ordered:** discover → resolve `Resource` → validate → project metadata → register.
- **Initialization is fail-closed and isolated.** The registry used during initialization is private to the hosting lifecycle; Nest DI exposes it only after all discovered declarations complete registration successfully. Failed discovery, resolution, validation, projection, or registration prevents the integration from becoming ready.
- **Duplicate identity handling is delegated to core** (`duplicate_registration`). Nest defines no alternate conflict policy.
- **Authoring depth stops at discoverability.** This RFC is not a decorator DSL for Fields, Relations, Operations, or metadata emitters.

```text
Invariant:
  Nest hosts core; core does not know Nest.
  Init registry is private until hosting succeeds.

Nest application
  └── ResourceForgeModule (entry)
        ├── private init registry (isolated until success)
        ├── discover marked declaration providers
        ├── resolve → exactly one core Resource each
        ├── validateResource          } core rules only
        ├── projectResourceMetadata   }
        └── ResourceRegistry.register } core registry
        └── on full success → DI exposes that registry
```

## 1. Scope

### 1.1 Goals

1. Define the Nest ↔ core hosting boundary for M4.1.
2. Establish `ResourceForgeModule` as the Nest integration entry point (`forRoot` / `forRootAsync`).
3. Define a discovery mechanism for Nest-side resource declaration providers.
4. Lock the registration lifecycle: **discover → resolve Resource → validate → project metadata → register**.
5. Require Nest-owned DI tokens/providers that expose the populated **core** `ResourceRegistry` to the Nest application.
6. Specify fail-closed, initialization-isolated readiness semantics, including invalid and duplicate declarations.
7. Preserve dependency direction: Nest → core only.
8. Keep the authoring surface minimal: discoverability only.
9. Explicitly fence GraphQL, Prisma/ORM realization, new core semantics, decorator DSL, metadata emitters, and query/navigation APIs out of this RFC.
10. Avoid inventing a transactional `ResourceRegistry` API in core; isolation is a Nest hosting concern.

### 1.2 Non-goals

This RFC does not define:

1. GraphQL schema or resolver generation (M4.2)
2. Prisma / SQL / ORM adapters or persistence engine realization (M4.3); RFC-028 correspondence is consumed only as an existing M3 floor and is **not** expanded here
3. New `@resource-forge/core` resource semantics, declaration members, projection sources, or registry behaviors (including any transactional / snapshot `ResourceRegistry` API)
4. A comprehensive Nest decorator authoring language (constructor/property/method decorator semantics beyond discoverability)
5. Field → metadata, Operation → metadata, or Relation-metadata **emitter** RFCs / implementations
6. Query / navigation / traversal host APIs unless strictly required to host existing core contracts — **not required by this RFC**
7. New resource-loading / fetch semantics introduced through `forRootAsync` (RFC-027 load/fetch floors remain untouched)
8. Wire / serialization formats
9. Reopening M3, RFC-005–RFC-030, or the deferred metadata-emitter question
10. Concrete Nest version pinning, packaging tooling, or CI layout (implementation-plan concerns)

### 1.3 Informative only

- Exact TypeScript export names may be refined during Accepted implementation planning so long as the semantic contracts in this RFC are preserved.
- Illustrative Nest APIs below are normative in *role*, not in every identifier spelling.

## 2. Terminology

| Term | Meaning |
| --- | --- |
| Nest host integration | `@resource-forge/nest` behaviors that host core contracts inside a Nest application |
| ResourceForgeModule | Nest dynamic module that is the integration entry point |
| Discoverable resource marker | Nest-local metadata/marker whose only job is to identify a declaration provider for discovery |
| Resource declaration provider | A Nest-discovered provider that resolves successfully to **exactly one** already-constructed core `Resource` |
| Resolve | Obtain that single core `Resource` from a discovered provider |
| Init registry | The core `ResourceRegistry` instance used privately during the hosting lifecycle before readiness |
| Hosting lifecycle | Nest-side discover → resolve → validate → project → register sequence during module initialization |
| Integration ready | The Nest integration has completed the hosting lifecycle successfully for **all** discovered declarations and may expose the init registry via DI |
| Core registry | An implementation of the existing `@resource-forge/core` `ResourceRegistry` contract (RFC-003) |

RFC-001 / RFC-002 / RFC-003 / RFC-005 terms (`ResourceIdentity`, `ResourceMetadata`, `ResourceRegistry`, `Resource`, `validateResource`, `projectResourceMetadata`) keep their Accepted meanings.

## 3. Package and dependency boundary

1. M4.1 product surface lives in **`@resource-forge/nest`**.
2. `@resource-forge/nest` MAY depend on `@resource-forge/core` and on Nest as a peer/host framework dependency.
3. `@resource-forge/core` MUST NOT depend on Nest, `@resource-forge/nest`, GraphQL packages, or Prisma packages.
4. `@resource-forge/nest` MUST NOT depend on `@resource-forge/graphql` or `@resource-forge/prisma`.
5. Nest integration MUST consume existing core contracts; it MUST NOT fork or reimplement registry association semantics, validation rules, or projection composition rules.

## 4. Registry ownership

1. The registry populated by Nest hosting is a **core `ResourceRegistry`** (RFC-003).
2. `@resource-forge/nest` owns:
   - module entry and configuration;
   - discovery and hosting lifecycle;
   - Nest DI tokens/providers that expose the registry (and related Nest-only options).
3. `@resource-forge/nest` MUST NOT introduce a Nest-specific parallel registry model that replaces or redefines RFC-003 association semantics.
4. **Initialization isolation (normative):** The registry used during initialization is **private to the hosting lifecycle**. The Nest DI provider for the successfully populated registry becomes available **only after** all discovered declarations have completed registration successfully.
5. After successful initialization, DI consumers receive the **same** registry instance that the hosting lifecycle populated.
6. **M4.1 MUST own a fresh init registry** for the initialization transaction (for example via core’s in-memory factory), **or** otherwise require a registry implementation/configuration that guarantees isolation from other observers until successful completion.
7. Nest MUST NOT mutate a registry instance that is already visible elsewhere (including one supplied through `forRootAsync`) in a way that would weaken fail-closed atomicity if a later declaration fails.
8. This RFC does **not** invent a transactional / snapshot `ResourceRegistry` API in `@resource-forge/core`. Isolation is a Nest hosting obligation.

## 5. Module entry

1. `ResourceForgeModule` is the Nest integration entry point.
2. It MUST support synchronous configuration (`forRoot`) and asynchronous Nest configuration (`forRootAsync`) for Nest-side options/providers.
3. `forRootAsync` MAY resolve Nest configuration (options, imports, Nest-only factories) asynchronously.
4. `forRootAsync` MUST NOT silently introduce new resource-loading or fetch semantics. RFC-027 load/fetch meaning remains outside Nest configuration sugar; this RFC does not redefine not-loaded / eager / lazy behavior.
5. `forRootAsync` MUST NOT be used to inject a shared, already-visible registry that hosting then mutates before readiness; registry isolation rules in §4 still apply.
6. Module initialization performs the hosting lifecycle (§7) against the private init registry before the integration is considered ready.

## 6. Discovery contract

### 6.1 What discovery finds

1. Discovery finds Nest providers marked with a **discoverable resource marker**.
2. Each discovered provider MUST resolve successfully to **exactly one** core `Resource`.
3. The `Resource` MUST be constructed by application/code using `@resource-forge/core` APIs (or values already conforming to the core `Resource` contract). Nest discovery does not author Field/Relation/Operation structure.

### 6.2 Marker limits

1. The marker’s normative role is **discoverability only**.
2. This RFC does **not** define constructor-, property-, or method-decorator semantics for Fields, Relations, Operations, annotations, constraints, cascade, fetch, or persistence.
3. Richer decorator authoring, if desired later, requires a separate Accepted RFC.

### 6.3 Resolution

1. **Resolve** means obtaining exactly one core `Resource` from the discovered provider.
2. Resolution is a **hosting failure** (§8) when any of the following occurs:
   - resolution throws or otherwise fails;
   - the resolved value is not a valid core `Resource` (fails subsequent validate, or is not a `Resource`-shaped value the host can subject to core validation);
   - the provider resolves to zero resources;
   - the provider resolves to multiple resources.
3. This RFC does **not** impose an abstract determinism / purity requirement on Nest providers beyond successful exactly-one resolution for hosting.

## 7. Registration lifecycle (normative)

Hosting uses the private init registry (§4). For each discovered declaration provider, Nest MUST perform this sequence in order:

1. **Discover** the marked provider.
2. **Resolve** exactly one core `Resource`.
3. **Validate** using core `validateResource` (or an equivalent core export that is the Accepted validation gate for `Resource`).
4. **Project metadata** using core `projectResourceMetadata`.
5. **Register** via core `ResourceRegistry.register(identity, metadata)` on the **init registry**, using the resource identity and projected metadata.

Normative constraints:

1. Nest MUST NOT skip validate or project, and MUST NOT replace them with Nest-specific validation or projection rules.
2. Nest MUST NOT invent alternate metadata composition for registration.
3. Nest MUST NOT register unvalidated resources.
4. Re-entrancy of validation inside `projectResourceMetadata` (core may validate again) does not authorize Nest to omit the explicit validate step in this lifecycle, nor to add Nest duplicate rules.
5. Projection remains bound by Accepted M3 floors (including RFC-006 annotations as the currently authorized concrete source and RFC-030 Relation non-contribution). Nest MUST NOT emit Relation/Field/Operation metadata as part of hosting.
6. Per-provider registration into the init registry is allowed during the lifecycle; **exposure** of that registry via Nest DI waits until the full lifecycle succeeds (§8).

## 8. Failure atomicity and readiness

1. Hosting initialization is **fail-closed**.
2. The init registry remains private to the hosting lifecycle until readiness.
3. If discovery, resolution, validation, projection, or registration fails for any discovered declaration, the integration MUST NOT become ready.
4. The Nest DI provider for the successfully populated registry becomes available **only after** all discovered declarations have completed registration successfully.
5. A partially populated init registry MUST NOT be presented through DI as a successful/ready integration outcome.
6. Dependents that require the registry MUST NOT observe a “ready” Nest module state while hosting failed.
7. Concrete Nest exception types / error wrappers are implementation details; the readiness and isolation rules are normative.
8. No transactional `ResourceRegistry` API is required or authorized in core to satisfy these rules.

## 9. Duplicate identity

1. Duplicate `ResourceIdentity` registration is governed by core `ResourceRegistry.register` semantics.
2. On core `duplicate_registration`, Nest MUST treat the hosting lifecycle as failed (§8).
3. Nest MUST NOT define a Nest-specific conflict policy (e.g. last-wins, replace-on-duplicate, silent skip).
4. Optional future support for intentional `replace` is **out of scope** for M4.1 unless a later RFC Accepts it.

## 10. Nest DI surface

1. Nest MUST provide DI access to the populated core `ResourceRegistry` **only after** successful hosting (§8).
2. DI tokens/providers are Nest-owned and live in `@resource-forge/nest`.
3. Application code injects those Nest tokens; it MUST NOT need Nest types exported from `@resource-forge/core`.
4. Additional Nest-only helpers are allowed only if they do not invent new core semantics (e.g. thin token aliases / options objects).

## 11. Worked example (informative)

```text
AppModule
  imports: [ ResourceForgeModule.forRoot() ]
  providers: [ CustomerResourceProvider ]  // marked discoverable

CustomerResourceProvider
  → yields core Resource R (identity crm/Customer, constructed via core)

Hosting lifecycle (private init registry):
  discover CustomerResourceProvider
  resolve R                         // exactly one Resource
  validateResource(R)               // core
  projectResourceMetadata(R)        // core (annotations contribution only today)
  initRegistry.register(R.identity, metadata)

Ready (only after all providers succeed):
  DI exposes initRegistry
  inject(RESOURCE_REGISTRY_TOKEN) → same registry, lookup(crm/Customer) = hit
```

Failure example:

```text
Two providers both resolve Resources with identity crm/Customer
  → second register returns duplicate_registration
  → integration not ready
  → init registry never exposed via DI as successful init
```

## 12. Rationale

1. **Discovery-first** matches the roadmap Nest goals (host / discovery / DI / module registration) without freezing a decorator DSL.
2. **Reuse core registry** prevents a second source of truth and keeps RFC-003 authoritative.
3. **Explicit lifecycle** prevents Nest from “helpfully” skipping validation/projection or inventing host-side metadata.
4. **Fail-closed readiness with private init registry** makes per-provider registration compatible with atomic exposure—without inventing a transactional core registry API.
5. **Exactly-one resolution** states the hosting contract without imposing Nest provider purity/determinism philosophy.
6. **Delegate duplicates to core** avoids Nest policy drift from RFC-003.
7. **Fence GraphQL/Prisma/emitters** preserves M4 sequencing and M3 closeout boundaries.

## 13. Relationships / traceability

| Dependency | Relationship |
| --- | --- |
| RFC-001 Identity | Consumed — registry keys and resource identity remain core |
| RFC-002 Metadata | Consumed — projected `ResourceMetadata` registered unchanged in meaning |
| RFC-003 Registry | Consumed — Nest hosts `ResourceRegistry`; no parallel model |
| RFC-005 Resource model | Consumed — `Resource`, `validateResource`, `projectResourceMetadata` |
| RFC-006 Annotations | Consumed indirectly via current projection source inventory |
| RFC-023 Composition | Consumed — Nest must not silently add emitters |
| RFC-027 Loading / Fetch | **Not extended** — `forRootAsync` must not invent fetch/load semantics |
| RFC-028 Persistence correspondence | **Not realized** — Prisma/ORM deferred to M4.3 |
| RFC-030 Relation→metadata | **Preserved** — Nest hosting must not contribute Relation metadata |
| M3 milestone | **Closed** — RFC-031 does not reopen M3 or RFC-005–030 |

## 14. Acceptance criteria (for this specification)

This RFC may move from Draft to Accepted when Design Review finds:

1. The Nest ↔ core hosting boundary is clear: Nest depends on core; core has no Nest concerns.
2. Registry ownership is the existing core `ResourceRegistry`, not a parallel Nest registry model.
3. Init-registry isolation is locked: private during hosting; DI exposure only after all registrations succeed; fresh/isolated registry required; no transactional core registry API.
4. Each discovered provider must resolve successfully to exactly one core `Resource`; failure cases (throw/fail, not a Resource, zero, multiple) are specified; no abstract determinism requirement.
5. Marker semantics stop at discoverability.
6. The lifecycle **discover → resolve → validate → project → register** is normative and uses core validation/projection.
7. Fail-closed readiness is specified for discovery/validation/registration failure, including non-exposure of a partial init registry.
8. Duplicate identity handling defers to core `duplicate_registration` with no Nest conflict policy.
9. `forRootAsync` cannot silently introduce resource-loading/fetch semantics or bypass registry isolation.
10. Non-goals explicitly exclude GraphQL, Prisma/ORM realization, new core semantics, decorator DSL, metadata emitters, and query/navigation APIs.
11. RFC-031 does not reopen M3 / RFC-005–030 / deferred metadata emitters.

## 15. Explicit deferrals / follow-ons

| Topic | Disposition |
| --- | --- |
| Rich Nest decorator DSL | Future RFC |
| GraphQL integration | M4.2 |
| Prisma / ORM realization | M4.3 (consume RFC-028; do not expand it here) |
| Metadata emitters (Field/Operation/Relation) | Future RFC candidates; do not reopen M3 |
| Query / navigation host APIs | Future RFC / later M4 work as needed |
| Intentional `replace` on re-init | Future RFC if required |

## 16. Document status

**Status: Accepted.** Authoritative for M4.1 Nest host semantics. Do not begin M6 implementation until an Accepted implementation plan exists for `#106`. Prefer one pull request per tracking issue for the eventual delivery slice.
