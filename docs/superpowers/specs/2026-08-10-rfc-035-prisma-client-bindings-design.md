# RFC-035: Prisma Client Persistence Bindings

**Date:** 2026-08-10  
**Status:** Accepted  
**M3:** Accepted (2026-08-10) — Design Review; no design blockers after targeted pre-M3 clarifications: `Result<T, PrismaBindingError>` categories (`binding_invalid` / `payload_invalid` / `identity_invalid` / `delegate_failed`); compile-time structural delegate vs runtime callability-only checks; `prismaExtra` identity collision fail-closed; Resource-authoritative required scalars (no Prisma nullability/`@default` inference); missing mapped-field projection → `binding_invalid`; single-field identity per RFC-034; emit/verify installable without `@prisma/client`; RFC-028/033/034 consumed not redefined. Scope remains thin CRUD only; Nest/transactions/includes/cascade/fetch/`findMany`/relation writes/raw Prisma args/Client registry fenced. M4 (implementation planning) authorized for `#118`.  
**Package:** `@resource-forge/prisma` (thin Resource-shaped persistence bindings over an injected structural model delegate; consumes `@resource-forge/core`; extends the M4.3.1/M4.3.2 package without changing core)  
**Tracking:** [#118](https://github.com/rexescario-dev/resource-forge/issues/118)  
**Depends on:** RFC-001 (Resource Identity), RFC-005 (Resource Model), RFC-007 / RFC-009 / RFC-014 (Fields — structure, types, Field nullability), RFC-013 (Field/Relation Optionality — `optional` retained; not binding-encoded beyond scalar payload membership), RFC-008 / RFC-010 / RFC-011 / RFC-015 (Relations — **fenced from binding payloads**), RFC-024 (Direction / Joins — `join.local` participates in scalar payloads **only** when it is already a declared Resource Field), RFC-026 (Cascade Semantics — **fence only**; not realized as Prisma referential actions), RFC-027 (Loading / Fetch — **fence only**), RFC-028 (Persistence / ORM Mapping — **consumed as** Resource-authoritative correspondence floor; this RFC does **not** redefine RFC-028), RFC-031 / RFC-032 (**closed**; dependency independence only), RFC-033 (Prisma Correspondence Verification — **Accepted**; independently composable; **not** a binding precondition; this RFC does **not** redefine RFC-033), RFC-034 (Prisma Schema Realization — **Accepted**; `PrismaRealizationMapping` / instance identity / name mapping **reused as the sole realization source**; this RFC does **not** redefine RFC-034 emit semantics)  
**Followed by:** M4.3.3 implementation planning/delivery for `#118` after Accept; relation-aware writes / join-FK mutation (candidate); `findMany` / filter DSL (candidate); transactions (candidate); CascadePolicy → Prisma referential actions (candidate); `fetch` / include realization (candidate); Nest↔Prisma composition (candidate); uniqueness/1:1 unlocks (candidate); Prisma→Resource generation only if separately Accepted  
**Unblocks:** A minimal host-injectable persistence adapter so Resources can perform scalar CRUD through Prisma without making Prisma authoritative and without expanding into a query/transaction/fetch runtime

**Amends / specializes:** Opens M4 Integrations for **Prisma Client persistence bindings** (M4.3.3) in `@resource-forge/prisma`. **Consumes** RFC-028 as the correspondence floor, RFC-033 as the optional verification contract, and RFC-034 as the authoritative realization-mapping contract for identity and names. Does **not** reopen, extend, or silently reinterpret those contracts. Does **not** reopen or extend M3, RFC-005–RFC-030 product locks, RFC-031 Nest hosting, RFC-032 GraphQL translation, reverse Prisma→Resource generation, or cascade/fetch engine realization.

## Primary question

> How should `@resource-forge/prisma` expose a minimal Resource-shaped CRUD binding over an injected Prisma-compatible model delegate—reusing RFC-034 realization mapping—without requiring Prisma Client/engine as a package runtime dependency, without mandating correspondence verification, and without expanding into query/transaction/relation orchestration?

## Thesis

RFC-035 locks M4.3.3 as a **thin per-Resource persistence binding**:

- **`@resource-forge/prisma` remains the Prisma integration package.** It depends on `@resource-forge/core`. Core MUST NOT depend on Prisma. Nest/GraphQL MUST NOT become dependencies.
- **Direction is Resource → Prisma persistence calls.** Public values are Resource-shaped scalars; Prisma remains an implementation detail.
- **Primary product is `createPrismaResourceBinding`.** One Resource + `PrismaRealizationMapping` + one structural model delegate → `{ create, findUnique, update, delete }`.
- **Realization mapping is the sole realization source** for model/field names and instance identity. No second mapping/configuration layer. No raw Prisma args escape hatch.
- **Correspondence verification is independently composable** and MUST NOT be required for binding construction or CRUD success.
- **Verify and emit remain Client-free.** A consumer that uses only emit/verify MUST NOT need `@prisma/client` installed. Binding MAY optionally declare `@prisma/client` as a peerDependency for hosts that use real Clients; package runtime MUST NOT import or rely on `@prisma/client` or the Prisma engine. Tests use structural fakes.
- **No new core surfaces.** No Resource PK invention; no automatic exposure of Prisma-only join FKs; no Nest module.

```text
Invariant:
  Resource + realization are authoritative at the binding boundary.
  Prisma delegate calls are derived; never a public value language.
  Verification reports/dmmf are not binding inputs.

Resource
+ PrismaRealizationMapping
+ injected structural model delegate
        │
        ▼
createPrismaResourceBinding(...)
        │
        ├── resolve internal binding map once (fail closed)
        └── { create, findUnique, update, delete }
                │
                ├── Resource-shaped scalars in
                ├── realization-based mapping
                └── Resource-shaped scalars out (findUnique: record | null)

packages/core — consumed only; no product-surface change
packages/nest, packages/graphql — independent; no dependency
emit / verify — unchanged Client-free contracts
```

## 1. Scope

### 1.1 Goals

1. Define the M4.3.3 Prisma Client persistence-binding boundary in `@resource-forge/prisma`.
2. Lock a per-Resource factory over an injected structural model delegate.
3. Lock the minimal operation set: `create`, `findUnique` (by instance identity), `update`, `delete`.
4. Lock Resource-shaped scalar in/out value language using RFC-034 realization mapping only.
5. Lock structural-port + optional peer packaging so emit/verify stay installable without Prisma Client.
6. Lock a deterministic `Result<T, PrismaBindingError>` taxonomy, including `delegate_failed` as an operation-failure category (not Resource/mapping/correspondence validation).
7. Explicitly fence Nest, transactions, includes, cascade/fetch realization, `findMany`, relation writes, raw Prisma args, reverse generation, and uniqueness/1:1 unlocks.

### 1.2 Non-goals

This RFC does not define:

1. `findMany`, filter/query DSL, ordering, pagination, or aggregation
2. Relation members in CRUD payloads; nested writes; connect/disconnect helpers; automatic Prisma-side join-FK exposure
3. Transactions, interactive transactions, or multi-Resource orchestration
4. Mapping Resource `CascadePolicy` to Prisma referential actions
5. Realizing Relation `fetch` / include / load execution
6. Nest modules, DI providers, or Nest↔Prisma composition
7. GraphQL↔Prisma composition
8. Prisma → Resource generation or bijection modes
9. Requiring `verifyPrismaCorrespondence` success, retaining verification proofs, or requiring `dmmf` as a binding input
10. A Client registry, unit binder, or ORM façade over a whole `PrismaClient` object graph
11. Prisma-shaped public CRUD payloads or raw Prisma args as an adapter escape hatch
12. A second host mapping/configuration layer beyond `PrismaRealizationMapping`
13. Hard runtime dependency on / import of `@prisma/client`, Prisma CLI, or the Prisma engine inside `@resource-forge/prisma`
14. New `@resource-forge/core` declaration members (including Resource PK)
15. Changes to `validateResource`, `emitPrismaSchema`, or `verifyPrismaCorrespondence` product semantics
16. FK-realized 1:1 / uniqueness (`@unique`) unlocks; implicit m-n modes; custom `@relation(name: ...)` synthesis
17. Composite identity, alternate unique lookups, or multi-field `where` beyond RFC-034’s single instance-identity contract
18. Runtime validation that delegate argument shapes are Prisma-compatible (compile-time structural typing only; runtime checks callability)

### 1.3 Informative only

- Exact TypeScript export names and error-code enum spellings may be refined during Accepted implementation planning so long as the semantic contracts and **error categories** in this RFC are preserved.
- Illustrative API spellings below are normative in *role*, not in every identifier.
- Declaring `@prisma/client` in `peerDependencies` is an optional packaging choice for binding hosts; it MUST NOT be interpreted as requiring Prisma Client for emit/verify-only consumers.

## 2. Terminology

| Term | Meaning |
| --- | --- |
| Persistence binding | Package surface that maps Resource-shaped scalar CRUD to Prisma-compatible delegate calls |
| Structural model delegate | Host-injected object typed to expose Prisma-compatible `create` / `findUnique` / `update` / `delete` methods; package-owned structural type; not an imported `PrismaClient` type requirement |
| Binding map | Package-internal resolution of model name, Field→Prisma field names, instance-identity rule, and bindable scalar Field set for one Resource |
| Bindable scalar Field | A declared Resource Field that participates in binding payloads (see §5.2); never a Relation; never a synthesized Prisma-only FK |
| Resource-shaped scalar record | Map keyed by Resource Field names whose values are scalar payloads for bindable Fields |
| Host-supplied identity | For `prismaExtra` instance identity: an explicit operation input carrying the Prisma `@id` value; not a Resource Field and not a reserved key inside Resource `data`/`patch` |
| `PrismaBindingError` | Error type carried by the binding `Result` error channel; categorized (see §8). Not `EmitError` / `CorrespondenceError` |
| `delegate_failed` | `PrismaBindingError` category/code for injected-delegate throw/reject (or equivalent failure). Retains original cause. Not a Resource validation, correspondence, or mapping/configuration error |

RFC-001 / RFC-005 / RFC-007–RFC-015 / RFC-024 / RFC-028 / RFC-033 / RFC-034 terms keep their existing meanings. This RFC does **not** change declaration-time definitions of `optional`, `nullable`, `multiplicity`, `direction`, `inverse`, `join`, `onDelete`, `onUpdate`, or `fetch`.

## 3. Package and public surface

### 3.1 Package boundary

1. Product surface lives in `@resource-forge/prisma`.
2. The package MAY depend on `@resource-forge/core`.
3. Core MUST NOT depend on Prisma or on `@resource-forge/prisma`.
4. `@resource-forge/prisma` MUST NOT depend on `@resource-forge/nest` or `@resource-forge/graphql`.
5. Emit and verify MUST remain free of Prisma Client / CLI / engine runtime requirements (RFC-033 / RFC-034 unchanged).
6. **Normative:** the package MUST NOT import or rely on `@prisma/client` (or the Prisma engine) at runtime for any public surface, including binding.
7. **Optional packaging:** `@prisma/client` MAY be declared as a `peerDependency` to document host expectations for real Prisma Client users.
8. **Install invariant:** a consumer that uses only emit/verify MUST NOT need `@prisma/client` installed.
9. **Compile-time:** structural delegate types remain package-owned.
10. Package tests MUST be able to use lightweight fake delegates without a live Prisma engine.

### 3.2 Public entry (role-normative)

```text
createPrismaResourceBinding({ resource, realization, delegate })
  → Result<PrismaResourceBinding, PrismaBindingError>

PrismaResourceBinding = {
  create,
  findUnique,
  update,
  delete,
}
```

alongside existing entries:

```text
emitPrismaSchema(...)
verifyPrismaCorrespondence(...)
```

### 3.3 Structural delegate port

1. The delegate port MUST require only the four operations used by this RFC: `create`, `findUnique`, `update`, `delete`.
2. The port MUST NOT require `PrismaClient`, DMMF, transaction clients, or Prisma-imported types as normative package types.
3. **Compile-time:** a package-owned `StructuralModelDelegate` (name planning-refinable) expresses the structural type contract.
4. **Runtime factory check:** the factory MUST verify that each of `create`, `findUnique`, `update`, and `delete` is present and callable (`typeof … === "function"`). Missing or non-callable required delegate operation → `PrismaBindingError` with category `binding_invalid`.
5. Runtime MUST NOT claim to validate Prisma argument-shape compatibility beyond callability. Prisma-compatible argument semantics are a host/compile-time responsibility.

### 3.4 Preconditions

1. Binding construction requires a Resource, a `PrismaRealizationMapping` that supplies the instance-identity rule for that Resource (and any name overlays the host relies on), and a structural delegate.
2. Binding construction MUST NOT require a prior `verifyPrismaCorrespondence` success.
3. Binding MUST NOT retain, require, or inspect a verification report/proof.
4. Binding MUST NOT require `dmmf` as an input.
5. There is no factory-level “verified first” state machine.

## 4. Architecture

```text
Resource
+ PrismaRealizationMapping
+ injected structural model delegate
        │
        ▼
createPrismaResourceBinding(...)
        │
        ├── validate/resolve required maps once
        │   └── fail closed if binding invariants are invalid
        │
        └── { create, findUnique, update, delete }
                │
                ├── Resource-shaped scalar values
                ├── realization-based mapping
                └── Prisma delegate calls
```

1. The host owns Prisma Client lifecycle and delegate resolution (e.g. selecting `client.customer`).
2. The package owns Resource↔Prisma scalar/identity mapping using realization only.
3. One binding instance corresponds to exactly one Resource and one delegate. No cross-Resource registry or unit binder in this RFC.

## 5. Binding map

### 5.1 Resolution source

1. The binding map is **internal**.
2. It MUST derive mappings from the Resource plus the existing `PrismaRealizationMapping` only.
3. It MUST NOT introduce another mapping/configuration source.
4. Identity-preserving defaults follow RFC-034 name defaults when overlays are absent: Resource type name → Prisma model name; Field name → Prisma field name.
5. Relation name overlays in realization are irrelevant to this slice’s scalar payloads and MUST NOT create bindable members.

### 5.2 Bindable scalar Fields

A declared Resource Field is **bindable** for this RFC when all of the following hold:

1. It is a Field (not a Relation).
2. It is present on the Resource’s declared `fields` list.
3. It is treated as a scalar persistence participant under RFC-028 / RFC-034 Field emission rules (Resource Field types `string` | `number` | `boolean`, including Fields that realization maps to Prisma scalars such as `String`/`Int`/`Float`/`Decimal`/`Boolean`).

Explicit inclusions:

1. Instance-identity Fields under `resourceField` identity are bindable scalars when they are declared Fields.
2. A `join.local` FK is bindable **only if** it is already a declared Resource Field that satisfies the rules above. Binding MUST NOT synthesize Prisma-only join FK members.

Explicit exclusions:

1. Relation members are never bindable.
2. Prisma-side join FKs that are not declared Resource Fields are never bindable.
3. `prismaExtra` `@id` MUST NOT invent a Resource Field and therefore is **not** a bindable Resource Field.

### 5.3 Empty bindable scalar set

1. An empty bindable scalar Field set is **not** by itself a `PrismaBindingError`.
2. Empty bindable sets are allowed under `prismaExtra`. The binding MUST NOT synthesize Resource Fields merely to make CRUD useful.
3. Empty bindable set + `resourceField` identity cannot occur: RFC-034 `resourceField` identity requires a declared identity Field, which is bindable. Impossible/invalid identity configurations fail at factory identity validation (§7.1).
4. Operational consequences (empty `data`/`patch`, identity-only reads/deletes) are specified under §6.3 / §9.

## 6. Operation semantics

### 6.1 Shared payload rules

1. Public `data` / `patch` objects are Resource-shaped: keys MUST be bindable Field names.
2. Unknown Field keys → fail closed (`payload_invalid`).
3. Relation names (or any non-bindable keys) in `data` / `patch` → fail closed (`payload_invalid`).
4. Nested relation writes are forbidden.
5. **Required scalar values (Resource-authoritative):** the binding requires supplied Resource values only for Fields whose **declared Resource semantics** require a supplied value for that operation. It MUST NOT infer requiredness from Prisma nullability, Prisma `@default`, or other Prisma schema attributes. Prisma MUST NOT become authoritative for Resource payload completeness.
6. **Returned-record projection:** for every successful non-null Resource-shaped result, the binding MUST map each bindable Field from the corresponding Prisma column (after name mapping). If a successful delegate result omits a mapped Prisma field needed to construct that Resource-shaped result, the binding MUST fail closed with category `binding_invalid` (mapping/projection failure). This applies to `create`, `findUnique` (when a row is present), `update`, and `delete`. Silent omission of bindable Fields from the returned record is forbidden.
7. Under `prismaExtra`, the Prisma `@id` column is **not** projected as a Resource Field.

### 6.2 Identity rules

The binding consumes **exactly** the instance-identity rule supplied by `PrismaRealizationMapping` for the Resource. Identity is **single-field** as defined by RFC-034 (`resourceField` or `prismaExtra`). Composite identity and alternate unique lookup are outside this RFC unless already represented by RFC-034’s Accepted identity contract.

#### 6.2.1 `resourceField`

1. Instance identity is the declared Resource Field named by realization.
2. `findUnique(identity)` / `update(identity, patch)` / `delete(identity)` take the Resource Field’s scalar value as `identity`.
3. `create(data)` requires the identity Field key to be present in `data` with a usable scalar value. Absence → `identity_invalid`. This RFC does **not** invent or apply Prisma `@default` on behalf of the Resource; database-side defaults MUST NOT substitute for a missing Resource identity Field in `data`.

#### 6.2.2 `prismaExtra`

1. Identity is host-supplied as a **separate narrow operation input**, never as a reserved key inside Resource `data`/`patch`.
2. `create(data, identity)` — adapter places `identity` into Prisma create `data` under the realized `@id` field name.
3. `findUnique(identity)` / `update(identity, patch)` / `delete(identity)` use that value in Prisma `where` on the realized `@id` only.
4. If a required Prisma `@id` value cannot be formed from the locked rules + host-supplied identity, fail closed (`identity_invalid`).
5. **Identity collision invariant:** for `prismaExtra`, the realized Prisma identity field is package-controlled within generated Prisma `data`/`where`. No Resource payload key may map onto that identity field unless that key is an independently declared Resource Field that realization maps to the same Prisma field name—and such a collision MUST fail closed (`binding_invalid`) at factory or operation mapping time. The host-supplied identity MUST NOT be overridden by Resource field mapping.

### 6.3 Operations

```text
create(data[, identity])
  → Result<ResourceRecord, PrismaBindingError>

findUnique(identity)
  → Result<ResourceRecord | null, PrismaBindingError>

update(identity, patch)
  → Result<ResourceRecord, PrismaBindingError>

delete(identity)
  → Result<ResourceRecord, PrismaBindingError>
```

1. **`create`:** map Resource scalars → Prisma `data`; for `prismaExtra`, merge host identity into Prisma `data` under the collision rules in §6.2.2; call `delegate.create`; project row → Resource record (§6.1). With empty bindable set under `prismaExtra`, `data` MAY be `{}`.
2. **`findUnique`:** map identity → single-field Prisma `@id` `where`; call `delegate.findUnique`; if delegate returns null/absent row → `ok(null)`; else project row → Resource record (§6.1).
3. **`update`:** map identity → `where`; map patch → Prisma `data`; call `delegate.update`; project row → Resource record (§6.1). Empty `patch` (`{}`) is allowed and still performs an identity-targeted update round-trip.
4. **`delete`:** map identity → `where`; call `delegate.delete`; project deleted row → Resource record (§6.1).

### 6.4 Identity immutability on update

1. The identity argument alone determines Prisma `where`.
2. If the identity Field (`resourceField`) appears in `patch`, fail closed (`identity_invalid`; do not silently ignore).
3. For `prismaExtra`, patch keys remain Resource Field names only; there is no Resource identity Field to patch.

## 7. Fail-closed catalog

Categories refer to §8. Exact code spellings within a category are planning-refinable.

### 7.1 Factory-time (`createPrismaResourceBinding` fails; no adapter returned)

| Condition | Category |
| --- | --- |
| Missing realization identity entry for the Resource | `binding_invalid` |
| `resourceField` identity names a Field not declared on the Resource | `binding_invalid` |
| `resourceField` identity Field fails RFC-034 identity scalar/`nullable` constraints as applicable to binding reuse | `binding_invalid` |
| `prismaExtra` identity configuration invalid per RFC-034 reuse rules (e.g. unsupported `@id` scalar) | `binding_invalid` |
| Realization name overlays reference unknown Fields | `binding_invalid` |
| `prismaExtra` identity-field collision with a Resource Field mapping (§6.2.2) | `binding_invalid` |
| Missing or non-callable required delegate operation | `binding_invalid` |
| Resource fails binding’s structural checks needed to resolve the map (e.g. unreadable Field list) | `binding_invalid` |

Empty bindable scalar set alone is **not** a factory error (§5.3).

### 7.2 Operation-time mapping / payload / identity errors

| Condition | Category |
| --- | --- |
| Unknown key in `data` / `patch` | `payload_invalid` |
| Relation / non-bindable key in `data` / `patch` | `payload_invalid` |
| Missing Resource-required scalar value for `create` (§6.1) | `payload_invalid` |
| Identity Field present in `update` patch (`resourceField`) | `identity_invalid` |
| Missing/invalid host-supplied identity for `prismaExtra` ops | `identity_invalid` |
| Missing identity Field value for `resourceField` `create` / identity ops | `identity_invalid` |
| Successful delegate row missing a mapped Prisma field needed for Resource projection (§6.1) | `binding_invalid` |

### 7.3 Not-found and delegate failures

| Condition | Outcome |
| --- | --- |
| `findUnique` finds no row | `ok(null)` — **not** a `PrismaBindingError` |
| Delegate throws / rejects | `Result` error with category **`delegate_failed`**, retaining the original cause |
| Delegate update/delete not-found (throws/rejects or otherwise fails to return a row) | `delegate_failed`, retaining cause when available. MUST NOT invent a Resource-level not-found Result parallel to `findUnique`’s `null` |

Delegate failures MUST be represented through the binding `Result` error channel using the `delegate_failed` code/category and MUST retain the original cause. They MUST NOT be classified as Resource validation, correspondence, or mapping/configuration errors.

Arbitrary Prisma/engine validation errors MUST NOT be reinterpreted as Resource declaration/validation failures.

## 8. Errors API (role-normative)

1. Public binding APIs use `Result`-style outcomes: `Result<T, PrismaBindingError>`.
2. `PrismaBindingError` MUST be distinct from emit (`EmitError`) and verify (`CorrespondenceError`).
3. `PrismaBindingError` MUST expose distinct categories/codes including at least:

```text
binding_invalid
payload_invalid
identity_invalid
delegate_failed
```

4. `delegate_failed` is an **operation failure category** on the binding Result channel. It is not semantically a mapping/configuration failure, even though it shares the `PrismaBindingError` type.
5. Exact enum/identifier spellings are planning-refinable (§1.3) so long as these four categories remain distinguishable.

## 9. Testing requirements

1. Package tests for bindings MUST use structural fake delegates only.
2. Tests MUST NOT require Prisma Client, Prisma CLI, or a live engine.
3. Existing emit/verify tests MUST remain Client-free and MUST NOT regress their contracts.
4. Emit/verify-only package consumption MUST remain possible without installing `@prisma/client` (assert via dependency posture / docs as planning defines).
5. Minimum coverage themes: happy-path CRUD; name overlays; `resourceField` vs `prismaExtra`; unknown/Relation keys; identity-in-patch; missing/non-callable delegate ops; `findUnique` → `null`; delegate throw → `delegate_failed`; empty bindable set under `prismaExtra` (`create({}, identity)`, `update(id, {})`, identity-only find/delete); missing mapped field on returned row → `binding_invalid`; `prismaExtra` identity collision → fail closed.

## 10. Rationale

1. **Per-Resource + injected delegate** is the smallest composable unit that preserves host lifecycle ownership and fakeability.
2. **Resource-shaped scalars** keep Resource authoritative and reuse RFC-034 realization without a second mapping language.
3. **Realization-only precondition** preserves the emit/verify composition boundary: verification reports correspondence; realization drives execution.
4. **Structural port + optional peer packaging** keeps emit/verify installable without Prisma Client while still supporting real Prisma hosts.
5. **Separate `prismaExtra` identity input** avoids inventing Resource Fields or reserved payload slots that would create a second value language.
6. **Distinct `delegate_failed` category** keeps persistence runtime failures distinguishable from mapping/payload/identity contract failures without inventing a second Result channel.
7. **Narrow CRUD** deliberately defers query/relation/transaction complexity to later RFCs.
8. This RFC **consumes** RFC-028 / RFC-033 / RFC-034 contracts; it does not redefine them.

## 11. Acceptance criteria (for this specification)

This RFC may move from Draft to Accepted when Design Review finds:

1. Scope and non-goals clearly fence query/relation/transaction/Nest/cascade/fetch/reverse concerns.
2. Public factory + four operations are role-normative and Resource-shaped.
3. Structural delegate port distinguishes compile-time typing from runtime callability checks; Client-/engine-free package posture and emit/verify-without-Client install invariant are explicit.
4. Realization-only precondition (no verify/dmmf requirement) is explicit.
5. Bindable scalar rules and empty-set allowance under `prismaExtra` are normative.
6. `prismaExtra` vs `resourceField` identity handling is unambiguous; collision invariant and no reserved Resource payload identity slot are locked; identity is single-field per RFC-034.
7. Resource-authoritative required-scalar semantics (no Prisma-inferred requiredness) and missing mapped-field projection failure are locked.
8. Update identity immutability and `findUnique` → `null` are locked.
9. `Result<T, PrismaBindingError>` taxonomy distinguishes `binding_invalid` / `payload_invalid` / `identity_invalid` / `delegate_failed` without conflating delegate failures with mapping errors.
10. Explicit deferrals list remaining M4.3 follow-ons; dependency language consumes (does not redefine) RFC-028 / RFC-033 / RFC-034.

## 12. Explicit deferrals / follow-ons

| Topic | Disposition |
| --- | --- |
| `findMany` / filters / pagination | Future RFC / later slice |
| Relation writes / connect-disconnect / nested writes | Future RFC / later slice |
| Automatic Prisma-only join FK exposure | Forbidden here; future only if declared Resource Field rules change |
| Transactions / multi-Resource orchestration | Future RFC |
| CascadePolicy → Prisma referential actions | Future realization RFC |
| `fetch` / include realization | Future RFC |
| Nest↔Prisma / GraphQL↔Prisma composition | Future RFC if required |
| Client registry / unit binder | Out of scope unless separately Accepted |
| Raw Prisma args escape hatch | Forbidden in M4.3.3 |
| Prisma → Resource generation / bijection | Separate capability RFC if required |
| Uniqueness / FK-realized 1:1 unlocks | Future constraint/index realization RFC |
| Hard `@prisma/client` runtime import/dependency | Forbidden; structural port + optional peer packaging only |
| Changes to emit/verify / RFC-028 semantics | Forbidden; those RFCs remain authoritative; this RFC consumes them |
| Composite / alternate unique identity lookups | Outside RFC unless already in RFC-034 identity contract |

## 13. Document status

**Status: Accepted.** Authoritative for M4.3.3 Prisma Client persistence binding semantics. Do not begin M6 implementation until an Accepted implementation plan exists for `#118`. Prefer one pull request per tracking issue for the eventual delivery slice after Accept.
