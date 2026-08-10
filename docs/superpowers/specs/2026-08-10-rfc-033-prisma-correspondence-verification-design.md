# RFC-033: Prisma Correspondence Verification

**Date:** 2026-08-10  
**Status:** Accepted  
**M3:** Accepted (2026-08-10) — Design Review; no design blockers after clarifications: normative consumed model-graph evidence inventory (§4.4); nullable-only null-capable/non-null checks with `optional` excluded from DMMF requiredness; join evidence chain (local/remote scalars ↔ relation refs; no `@map` as correspondence names); `direction` without a Prisma direction attribute; `inverse` mapped to target-model Prisma relation field; injective post-resolution host mapping; structured CorrespondenceReport minimum evidence; normative verification order (§6.1). Resource-authoritative DMMF-in verification only; Resource-covered extras allowed; fixed scalar allow-lists; in-unit Relation closure; multiplicity singular/list + join ownership when declared; cascade/fetch/Client/schema emit/Nest/GraphQL/reverse generation fenced; no new core surface. M4 (implementation planning) authorized for `#112`.  
**Package:** `@resource-forge/prisma` (Prisma correspondence verification; consumes `@resource-forge/core`)  
**Tracking:** [#112](https://github.com/rexescario-dev/resource-forge/issues/112)  
**Depends on:** RFC-001 (Resource Identity), RFC-005 (Resource Model — `Resource`, `validateResource`), RFC-007 / RFC-009 / RFC-013 / RFC-014 (Fields), RFC-008 / RFC-010 / RFC-011 / RFC-013 / RFC-015 (Relations), RFC-024 (Direction / Joins — `direction` / `inverse` / `join` as topology mapping inputs), RFC-028 (Persistence / ORM Mapping — Resource-authoritative, one-way, total correspondence ledger; no new core surface), RFC-031 (Nest host — **closed**; dependency independence only), RFC-032 (GraphQL translation — **closed**; dependency independence only)  
**Followed by:** M4.3.1 implementation planning/delivery for `#112` after Accept; M4.3.2 Prisma schema realization (candidate); M4.3.3 Prisma persistence/runtime bindings (candidate); Prisma→Resource generation only if separately Accepted  
**Unblocks:** A Prisma integration boundary that verifies Resource→Prisma persistence correspondence against an existing Prisma model graph without making Prisma authoritative and without schema emission or Prisma Client runtime

**Amends / specializes:** Opens M4 Integrations for **Prisma correspondence verification only** (M4.3.1). Consumes RFC-028 as the normative correspondence floor. Does **not** reopen or extend M3, RFC-005–RFC-030, RFC-031 Nest hosting, RFC-032 GraphQL translation, cascade/fetch realization, Prisma schema generation, Prisma Client bindings, or reverse Prisma→Resource generation.

## Primary question

> How does `@resource-forge/prisma` verify that already-validated core Resources can be realized by an existing Prisma model graph under RFC-028—without emitting Prisma schema, invoking Prisma Client, making Prisma authoritative, or inventing new core persistence semantics?

## Thesis

RFC-033 locks M4.3.1 as a **Resource-authoritative Prisma correspondence verifier**:

- **`@resource-forge/prisma` is the Prisma integration package** for this slice. It depends on `@resource-forge/core`. Core MUST NOT depend on Prisma.
- **Direction is Resource → Prisma.** Prisma schema/DMMF is an inspected realization target, not a source of Resource declarations.
- **Primary product surface is correspondence verification only.** Success yields a structured correspondence report; failure is fail-closed. No schema emission, no Prisma Client, no database access.
- **Verification depth is structural + topology:** identity, Field scalar correspondence (type + `nullable`), Relation target/multiplicity/`nullable`, and when declared `direction` / `inverse` / `join` realizability. Cascade (`onDelete` / `onUpdate`) and `fetch` are **out of scope**.
- **Naming uses host mapping with identity-preserving Prisma schema-name defaults.** Mappings identify Prisma **schema-level** model/field/relation names (not DB `@map` / `@@map` physical names as Resource correspondence names).
- **Coverage is Resource-covered only.** Every Resource identity/Field/Relation in the unit MUST resolve; additional Prisma models/fields/relations are permitted and ignored.
- **Relation targets require in-unit closure.** Target Resources MUST appear in the same verification unit and themselves correspond to Prisma models.
- **Public Prisma input is DMMF.** An adapter MAY normalize into a package-local consumed model-graph view, but the **semantic evidence inventory** in §4.4 is normative. Parsing `schema.prisma` is host/tooling, not this RFC’s product surface.

```text
Invariant:
  Resources are authoritative; Prisma is observed.
  Verification success ≡ every Resource-covered member is realizable (fail-closed).

Validated Resource unit
  + Prisma DMMF (inspected model graph)
  + optional host mapping
        │
        ▼
@resource-forge/prisma
  verifyPrismaCorrespondence(...)
        │
        ├── CorrespondenceReport (success)
        └── CorrespondenceError (fail closed)

packages/core — consumed only; no product-surface change
packages/nest, packages/graphql — independent; no dependency
```

## 1. Scope

### 1.1 Goals

1. Define the Prisma ↔ core correspondence-verification boundary for M4.3.1.
2. Establish `@resource-forge/prisma` as the package that owns Prisma correspondence verification contracts.
3. Consume RFC-028 as the normative Resource→persistence correspondence floor without expanding core.
4. Lock Resource-authoritative, one-way verification against an existing Prisma DMMF/model graph.
5. Define host mapping with identity-preserving Prisma schema-name defaults, including fail-closed mapping collisions.
6. Lock structural Field scalar compatibility allow-lists and `nullable`-only Prisma schema nullability correspondence.
7. Lock Relation topology verification: target in-unit closure, multiplicity singular/list shape, and FK/join ownership checks when Resource `join` is present.
8. Verify declared `direction` / `inverse` within topology rules without inventing Prisma-only relation-class vocabularies.
9. Require fail-closed outcomes and a structured success report (not a bare boolean).
10. Preserve dependency direction: Prisma package → core only; no Nest/GraphQL coupling; no Prisma Client/runtime DB.
11. Explicitly fence schema generation, Client bindings, reverse generation, cascade/fetch realization, and new core surfaces.

### 1.2 Non-goals

This RFC does not define:

1. Prisma schema / model-graph **emission** or migration generation (M4.3.2 candidate)
2. Prisma Client runtime persistence bindings, queries, includes, transactions, or DB I/O (M4.3.3 candidate)
3. Prisma → Resource generation, DMMF→Resource synthesis, or bidirectional sync protocols
4. Nest↔Prisma or GraphQL↔Prisma composition as a required dependency
5. New `@resource-forge/core` declaration members, mapping descriptors, adapter ports, or public checkers
6. Changes to `validateResource`, `evaluateCascadeEvent`, or `checkRelationLoadStates`
7. Cascade (`onDelete` / `onUpdate`) or load (`fetch`) honor realization against Prisma referential actions / include behavior
8. Operations persistence semantics; annotation/metadata→Prisma mappings; constraint/index projection
9. Treating Prisma `@map` / `@@map` database physical names as Resource correspondence identities
10. Parsing `schema.prisma` text as a required public package API
11. Making `@prisma/internals` (or equivalent internal tooling) part of Resource Forge’s public runtime contract merely to obtain types
12. Bijection / strict “no Prisma extras” modes
13. Reopening M3, RFC-005–RFC-030, RFC-031, or RFC-032

### 1.3 Informative only

- Exact TypeScript export names may be refined during Accepted implementation planning so long as the semantic contracts in this RFC are preserved.
- Illustrative API spellings below are normative in *role*, not in every identifier.
- Concrete TypeScript shapes for the consumed model-graph view may be refined in planning so long as the **semantic evidence requirements** in §4.4 remain satisfied.

## 2. Terminology

| Term | Meaning |
| --- | --- |
| Prisma correspondence verification | `@resource-forge/prisma` behaviors that verify Resource→Prisma realizability under RFC-028 |
| Verification unit | One or more already-constructed, successfully validated core `Resource` values presented together for a single verification attempt |
| Prisma DMMF | Prisma Data Model Meta Format document supplied by the host as the inspected Prisma model graph |
| Consumed Prisma model graph | The semantic evidence view required by §4.4; may be raw DMMF or an adapter-normalized view that preserves those semantics |
| Host mapping | Optional integration input mapping Resource identities/members to Prisma schema-level model/field/relation names |
| Identity-preserving default | When no explicit mapping is supplied: `ResourceIdentity.name` → Prisma model name; `Field.name` / `Relation.name` → Prisma field/relation names |
| Correspondence report | Structured success artifact enumerating every Resource-covered identity/Field/Relation correspondence that was verified |
| Correspondence error | Fail-closed failure describing why verification could not succeed |
| Resource-covered | The set of Resource identities, Fields, and Relations in the verification unit that MUST be realized |
| Prisma schema-level name | Prisma model/field/relation identifier in the schema/DMMF namespace (not database physical names via `@map` / `@@map`) |
| Null-capable / non-null Prisma representation | Whether the consumed model graph’s field/relation can represent `null` (null-capable) or cannot (non-null) |
| Realization / realizable | The inspected Prisma model graph can honor the declared Resource correspondence for a member under this RFC’s rules |

RFC-001 / RFC-005 / RFC-007–RFC-015 / RFC-024 / RFC-028 terms keep their Accepted meanings. This RFC does not redefine them.

## 3. Package and dependency boundary

1. M4.3.1 product surface lives in **`@resource-forge/prisma`**.
2. `@resource-forge/prisma` MAY depend on `@resource-forge/core` and on Prisma ecosystem libraries **only as needed** to consume DMMF semantics for verification.
3. `@resource-forge/core` MUST NOT depend on Prisma packages or `@resource-forge/prisma`.
4. `@resource-forge/prisma` MUST NOT depend on `@resource-forge/nest` or `@resource-forge/graphql`.
5. Verification MUST consume existing core contracts; it MUST NOT fork or reimplement Resource validation or invent a parallel Resource model.
6. Presence of Nest or GraphQL in an application MUST NOT be required for correspondence verification to succeed.
7. Prisma Client MUST NOT be required for verification success.
8. The package MUST NOT make Prisma internal tooling (for example `@prisma/internals`) part of Resource Forge’s **public** runtime contract merely to obtain DMMF types. Prefer a package-local DMMF subset view/adapter, or a supported Prisma DMMF type dependency if the repository’s Prisma version strategy already provides one. Implementation planning chooses the concrete dependency strategy without changing these semantics.

## 4. Inputs and authority

### 4.1 Structural authority

1. For each Resource in the verification unit, correspondence members are derived only from:
   - `Resource.identity`;
   - `Resource.schema.fields`;
   - `Resource.schema.relations`.
2. `Resource.schema.operations` are **out of scope** for M4.3.1 correspondence.
3. `ResourceMetadata` / annotations MUST NOT be treated as structural authority for correspondence and MUST NOT be required for verification outcomes.
4. Prisma DMMF MUST NOT become authoritative over Resource declarations. DMMF may only confirm or refute realizability of already-declared Resource members.

### 4.2 Validation gate

1. Every Resource in the verification unit MUST successfully pass core `validateResource` before correspondence checks proceed for that unit.
2. Prisma verification MUST NOT verify an invalid Resource.
3. Prisma verification MUST NOT invent Prisma-local validation that replaces or weakens core Resource validity.

### 4.3 Verification unit composition

1. A verification unit is an explicit set of Resources supplied to the Prisma integration.
2. This RFC does **not** require Prisma to own registry lifecycle; registry association remains RFC-003.
3. **Empty verification unit (zero Resources) is a verification failure.**
4. Nest hosting / GraphQL translation are neither required nor implied to obtain the verification unit.

### 4.4 Prisma input (consumed model-graph evidence)

1. The public Prisma input is a **DMMF document**. An adapter MAY normalize raw DMMF into a package-local consumed model-graph view, but normalization MUST preserve the semantics required by this section and §5.
2. Parsing `schema.prisma` text is **not** a required public product surface of M4.3.1. Hosts MAY produce DMMF externally.
3. Database access is forbidden as part of verification.
4. **Normative consumed evidence.** The consumed Prisma model graph MUST expose, at minimum, enough information to evaluate every rule in §5:
   - model names;
   - for each model field: field name; whether the field is scalar or relation; for scalars — scalar type and null-capable vs non-null representation; for relations — list vs singular, null-capable vs non-null representation, and relation target model;
   - relation-field metadata and scalar/relation reference information sufficient to verify declared Resource `join` (which Prisma scalar fields participate in the association identity between owner and target models).
5. Missing evidence required by §4.4.4 for a Resource-covered check is a verification failure (malformed / unusable model graph), not a license to skip the check.
6. Concrete TypeScript property names for this evidence view are planning concerns; the **semantic evidence inventory above is normative**.

### 4.5 Host mapping

1. Correspondence naming is established using optional host-supplied mapping input, with identity-preserving Prisma schema-name defaults when no explicit mapping is supplied.
2. Defaults:
   - `ResourceIdentity.name` → Prisma model name;
   - `Field.name` → Prisma scalar field name;
   - `Relation.name` → Prisma relation field name.
3. Host mapping MAY override those Prisma schema-level names for Resource identities, Fields, and Relations.
4. Mappings identify Prisma **schema-level** identifiers. Database physical names represented through Prisma `@map` / `@@map` are **not** independently treated as Resource correspondence names.
5. **Injective realization mapping.** After defaults and explicit overrides are applied, distinct Resource identities in the unit MUST NOT resolve to the same Prisma model, and distinct Resource members on the same Resource MUST NOT resolve to the same Prisma field/relation. Explicit mappings MUST NOT permit two distinct Resource members to intentionally share one Prisma model/member.
6. Mapping ambiguity or post-resolution collisions MUST fail closed, including:
   - two Resources resolving to the same Prisma model;
   - two Resource members on the same Resource resolving to the same Prisma field/relation;
   - unresolved / empty / otherwise ambiguous mapping entries.
7. Namespace is part of Resource identity for Resource equality and in-unit target resolution. Default model naming uses `ResourceIdentity.name` only; therefore distinct namespaces that share the same `name` collide under defaults unless host mapping disambiguates—and MUST fail closed when they resolve to the same Prisma model (for example `foo/Customer` and `bar/Customer` both defaulting to Prisma `Customer`).

## 5. Correspondence rules (normative)

### 5.1 Resource-covered coverage

1. Every Resource identity, Field, and Relation in the verification unit MUST resolve to a realizable Prisma model/member under §§5.2–5.4 and the configured/default mapping.
2. Additional Prisma models, fields, and relations are **permitted and ignored**.
3. M4.3.1 MUST NOT require Prisma↔Resource bijection.

### 5.2 Type identity ↔ Prisma model

1. Each Resource identity MUST map to exactly one Prisma model that exists in the DMMF.
2. Missing model, mapping collision, or ambiguous model resolution is a verification failure.

### 5.3 Field ↔ Prisma scalar

1. Each Field MUST map to a Prisma **scalar** field on the corresponding model (not a relation field).
2. **Scalar type allow-list (fixed):**

| Resource `Field.type` | Accepted Prisma scalar types |
| --- | --- |
| `string` | `String` |
| `boolean` | `Boolean` |
| `number` | `Int`, `Float`, `Decimal` |

3. Prisma `DateTime`, `Json`, `Bytes`, `BigInt`, enum types, unsupported types, or otherwise incompatible types MUST fail closed when used as the realization of a Resource Field.
4. This allow-list is a Prisma-side compatibility rule. It does **not** introduce or widen Resource/core Field types.
5. Host overrides of this type allow-list are **not** authorized in M4.3.1.
6. **Nullability (nullable-only):** only Resource `nullable` is verified against the consumed model graph’s null-capable vs non-null representation for the corresponding Prisma scalar.
   - `nullable=false` ⇒ Prisma scalar MUST be **non-null** (cannot represent `null`).
   - `nullable=true` ⇒ Prisma scalar MUST be **null-capable** (can represent `null`).
7. Resource `optional` is a value-presence/runtime semantic (RFC-013) and MUST NOT be encoded as Prisma schema optionality, inferred from Prisma requiredness flags, or otherwise checked in M4.3.1. M4.3.1 does not claim Prisma requiredness fully represents the Resource `optional` × `nullable` contract. Implementers MUST NOT treat DMMF/`isRequired`-style flags as encoding Resource `optional`.

### 5.4 Relation ↔ Prisma relation topology

#### 5.4.1 Target in-unit closure

1. Every Relation `target` MUST resolve to a Resource identity present in the same verification unit (self-target allowed).
2. That target Resource MUST itself have a verified Prisma model correspondence.
3. Cycles among Relations are allowed when all targets remain in-unit.
4. Missing target Resource in the unit is a verification failure. Prisma MUST NOT supply a substitute authoritative endpoint type for a missing Resource target.

#### 5.4.2 Multiplicity shape

1. `multiplicity: "one"` ⇒ corresponding Prisma relation field MUST be singular (not a list).
2. `multiplicity: "many"` ⇒ corresponding Prisma relation field MUST be a list.
3. This RFC does **not** introduce a product vocabulary such as `one_to_one` / `one_to_many` / `many_to_many`.

#### 5.4.3 Nullability

1. Relation `nullable` is verified **only** against the corresponding Prisma relation field’s null-capable vs non-null representation in the consumed model graph, under the same nullable-only rule as Fields (§5.3.6–5.3.7):
   - `nullable=false` ⇒ Prisma relation representation MUST be non-null (cannot represent `null`);
   - `nullable=true` ⇒ Prisma relation representation MUST be null-capable.
2. Relation `optional` is not encoded as Prisma schema optionality and MUST NOT be inferred from Prisma relation requiredness.
3. M4.3.1 MUST NOT implement RFC-013/RFC-014/RFC-015 runtime presence semantics in DMMF verification. Only the relation’s null-capable/required representation relevant to the Prisma model graph is checked.

#### 5.4.4 Direction and inverse

1. Declared `direction` and `inverse` are topology mapping inputs (RFC-024 / RFC-028). M4.3.1 verifies **realizability**, and MUST NOT redefine their Resource meanings.
2. **`direction`:** verified only insofar as the mapped Prisma association can realize the declared endpoint/orientation established by RFC-024 (owner Resource ↔ target Resource via the mapped relation field and target model). **No independent Prisma-side `direction` attribute is required.** Implementers MUST NOT search DMMF for a nonexistent direction concept.
3. **`inverse`:** when present, the counterpart Relation name MUST resolve to a Relation on the target Resource in-unit (RFC-024 counterpart rules already enforced by core validation in multi-Resource contexts remain authoritative for Resource-side validity). That target-side Resource Relation MUST then resolve through the configured/default mapping to a **Prisma relation field on the target model**. Absence of that mapped counterpart Prisma relation field fails closed. Reciprocal `inverse` declarations and mirrored joins are **not** required (RFC-024 preserved).
4. `inverse` is a **Resource topology assertion verified against Prisma**, not something Prisma may infer or invent.

#### 5.4.5 Join / FK ownership

1. When Resource `join` is **absent**: verify Relation shape (§5.4.2) and target/nullability/direction/inverse rules only. Prisma implicit many-to-many (or other engine-owned association detail) remains acceptable where the Prisma schema shape supports the declared `"many"` relation.
2. When Resource `join` is **present**, M4.3.1 MUST verify the following evidence chain (shape alone is insufficient):

```text
Resource owner.join.local
        ↕ (mapping / default)
owner Prisma scalar field

Resource target.join.remote
        ↕ (mapping / default)
target Prisma scalar field

Prisma relation metadata / references
        ↕
local scalar participates in association identity with remote scalar
for the mapped owner↔target relation field
```

3. `join.local` / `join.remote` identify Resource Field names; those Fields MUST exist on owner/target Resources (already required by core when `join` is present) and MUST correspond to Prisma **schema-level** scalar fields under the host/default mapping.
4. The verifier MUST confirm—from consumed model-graph relation/reference metadata—that those owner and target Prisma scalars participate in the association identity for the mapped Prisma relation field. Failure to establish that participation fails closed.
5. The verifier MUST NOT require Prisma database physical column names (`@map` / `@@map`) to equal Resource Field names.
6. Composite join keys beyond RFC-024’s single `{ local, remote }` pair remain out of scope.

## 6. Public verification contract (roles)

Planning-aid shape (names non-normative):

```ts
verifyPrismaCorrespondence(
  resources: readonly Resource[],
  dmmf: PrismaDmmf,
  mapping?: PrismaResourceMapping,
): Result<CorrespondenceReport, CorrespondenceError>
```

Normative roles:

1. **Inputs:** verification unit + Prisma DMMF (+ optional mapping).
2. **Success:** `CorrespondenceReport` MUST identify every Resource-covered correspondence that succeeded, at minimum:

```text
CorrespondenceReport
├── resources[]  — Resource identity → Prisma model correspondence
├── fields[]     — Resource Field → Prisma scalar correspondence
└── relations[]  — Resource Relation → Prisma relation/topology correspondence
```

   Exact TypeScript field names and incidental metadata are planning concerns. Omitting any successful Resource-covered member from the report is a contract defect. A bare boolean is forbidden.
3. **Failure:** `CorrespondenceError` (or equivalent) with enough information to identify the fail-closed cause class; partial reports MUST NOT be presented as success.
4. Verification is **atomic** for the unit: any fail-closed condition fails the entire attempt and MUST NOT yield a successful report.

### 6.1 Normative verification order

Verification MUST proceed in this order; failure at any stage ends the attempt with no successful report:

```text
1. Reject empty unit
2. validateResource for every Resource in the unit
3. Resolve and validate host mapping / defaults (injectivity + ambiguity)
4. Resolve Resource identities → Prisma models
5. Verify Fields (scalar existence, type allow-list, nullable)
6. Verify Relation target in-unit closure
7. Verify Relation topology (multiplicity, nullable, direction/inverse, join when present)
8. Emit CorrespondenceReport
```

Stages may short-circuit on first failure. Implementations MUST NOT reorder in a way that presents success despite an earlier-stage failure.

## 7. Fail-closed boundaries

Verification MUST fail closed (no successful report) when any of the following hold:

1. Empty verification unit
2. Any Resource fails core `validateResource`
3. Mapping ambiguity, non-injective post-resolution mapping, or other mapping collisions
4. Missing Prisma model for a Resource identity
5. Missing Prisma scalar field for a Field, or Field maps to a relation field
6. Field scalar type outside the fixed allow-list
7. Field/Relation `nullable` incompatible with the consumed model graph’s null-capable/non-null representation
8. Missing Relation target Resource in-unit
9. Missing Prisma relation field, or multiplicity singular/list mismatch
10. Declared `inverse` counterpart missing on target Resource or missing mapped Prisma relation field on the target model
11. Declared `join` evidence chain not established against Prisma relation/reference metadata
12. Malformed / unusable DMMF input missing §4.4 consumed evidence
13. Any other non-realizable Resource-covered correspondence under §§4–5

M4.3.1 MUST NOT present partial correspondence as success.

## 8. Worked examples (informative)

### 8.1 Success with Prisma extras

```text
Unit:
  crm/Customer { fields: [id:string, name:string]; relations: [orders → crm/Order many] }
  crm/Order    { fields: [id:string]; relations: [customer → crm/Customer one] }

Prisma DMMF:
  Customer { id String; name String; createdAt DateTime; orders Order[] }
  Order    { id String; updatedAt DateTime; customer Customer; customerId String }
  AuditLog { ... }   // ignored

Defaults map names identity-preservingly.
Result: success CorrespondenceReport
  - createdAt / updatedAt / AuditLog ignored (Resource-covered only)
  - orders list + customer singular satisfy multiplicity
```

### 8.2 Failure: number → DateTime

```text
Field amount: number maps to Prisma DateTime
  → scalar allow-list failure → fail closed
```

### 8.3 Failure: optional collapsed incorrectly (informative contrast)

```text
Field nickname: optional=true, nullable=false
Prisma: nickname String?
  → nullable=false requires non-null Prisma scalar → fail closed
  (optional does not authorize Prisma ?)
```

### 8.4 Failure: missing target in unit

```text
crm/Order.customer → crm/Customer, but Customer not in unit
  → in-unit closure failure → fail closed
  (even if Prisma Customer model exists)
```

### 8.5 Join present vs absent

```text
join absent, multiplicity many, Prisma implicit m-n list relation
  → shape check only; may succeed

join present { local: customerId, remote: id }
  → owner.customerId and target.id must map to Prisma scalars that
    Prisma relation/reference metadata ties into the mapped association
  → shape alone insufficient; DB @map column names are irrelevant
```

### 8.6 Namespace collision under defaults

```text
Unit: foo/Customer + bar/Customer; no host mapping
Defaults both → Prisma model Customer
  → mapping collision → fail closed
```

## 9. Rationale

1. **Verification-first** proves RFC-028 authority before schema generation or Client runtime widen the product surface.
2. **Resource→Prisma direction** preserves M4.1/M4.2 adapter orientation and RFC-028 one-way correspondence.
3. **DMMF-in with normative evidence inventory** keeps parsing/tooling outside the correspondence contract while preventing incompatible interpretations of scalar/relation/list/null/`join` evidence.
4. **Host mapping + defaults + injectivity** honors logical≠physical without making Prisma naming authoritative or allowing intentional member sharing.
5. **Resource-covered only** allows persistence-only Prisma details (PK mechanics, timestamps, indexes, audit models) without competing schema authority.
6. **Fixed type allow-lists** keep verification meaningful without widening RFC-009.
7. **Nullable-only schema checks** preserve RFC-013–015’s `optional` × `nullable` distinction where Prisma is under-expressive.
8. **In-unit Relation closure** keeps endpoint types Resource-authoritative.
9. **Shape + join evidence chain** verifies RFC-011/RFC-024 topology without inventing Prisma relation-class enums or requiring DB physical names.
10. **Direction without a Prisma direction attribute** avoids false DMMF concepts while still anchoring endpoint/orientation realizability.
11. **Defer cascade/fetch** prevents schema-verifier semantics from absorbing runtime/engine honor rules.

## 10. Relationships / traceability

| Dependency | Relationship |
| --- | --- |
| RFC-001 Identity | Consumed — type identity correspondence; namespace collision under defaults |
| RFC-005 Resource model | Consumed — `Resource`, `validateResource` |
| RFC-007 / RFC-009 / RFC-014 Fields | Consumed — Field structure, types, nullable |
| RFC-013 Optionality | Relied on — `optional` **not** encoded in Prisma schema correspondence |
| RFC-008 / RFC-010 / RFC-011 / RFC-015 Relations | Consumed — association members, multiplicity, nullable |
| RFC-024 Direction / Joins | Consumed — `direction` / `inverse` / `join` as topology inputs; meanings not redefined |
| RFC-026 / RFC-027 Cascade / Fetch | **Not realized** — deferred beyond M4.3.1 |
| RFC-028 Persistence correspondence | **Consumed / realized for verification** — Resource-authoritative, one-way, total for declared members; no new core surface |
| RFC-031 Nest host | **Closed / independent** — Prisma MUST NOT depend on Nest |
| RFC-032 GraphQL translation | **Closed / independent** — Prisma MUST NOT depend on GraphQL |
| M3 milestone | **Closed** — RFC-033 does not reopen M3 or RFC-005–030 |
| Roadmap / package README “Prisma→Resource” wording | **Stale documentation** — corrected by this RFC’s direction; docs update at closeout |

## 11. Acceptance criteria (for this specification)

This RFC may move from Draft to Accepted when Design Review finds:

1. The Prisma ↔ core boundary is clear: Prisma package depends on core; core has no Prisma concerns.
2. Direction is locked Resource → Prisma; Prisma is observed, not authoritative.
3. Product surface is correspondence verification only (no schema emit, Client, DB, or reverse generation).
4. Public Prisma input is DMMF; consumed model-graph evidence inventory in §4.4 is normative; `schema.prisma` parsing is not required public API.
5. Host mapping + identity-preserving Prisma schema-name defaults are normative; post-resolution mapping is injective; collisions fail closed; `@map`/`@@map` are not Resource correspondence names.
6. Coverage is Resource-covered only; Prisma extras allowed; no bijection requirement.
7. Field scalar allow-lists and nullable-only null-capable/non-null rules are normative; `optional` is not schema-encoded or inferred from Prisma requiredness.
8. Relation rules lock in-unit target closure, singular/list multiplicity, nullable-only relation representation checks, direction without a Prisma direction attribute, inverse mapped to a target-model Prisma relation field, and the join evidence chain when `join` is present.
9. Cascade/fetch/Operations/annotations/Nest/GraphQL composition are explicitly out of scope.
10. Fail-closed boundaries, normative verification order (§6.1), and structured success report with per-member Resource/Field/Relation evidence (non-boolean) are specified.
11. Dependency rules forbid Nest/GraphQL coupling and forbid elevating Prisma internals into the public runtime contract merely for types.
12. RFC-033 does not reopen M3 / RFC-005–030 / RFC-031 / RFC-032 or invent new core persistence surfaces.

## 12. Explicit deferrals / follow-ons

| Topic | Disposition |
| --- | --- |
| M4.3.2 Prisma schema realization (Resource → schema/model graph) | Future RFC / later M4.3 slice |
| M4.3.3 Prisma Client persistence bindings | Future RFC / later M4.3 slice |
| Prisma → Resource generation | Future separate capability RFC if required; non-authoritative |
| Nest↔Prisma / GraphQL↔Prisma composition | Future RFC if required |
| Cascade / fetch honor against Prisma actions / includes | Later slice with runtime/realization semantics |
| `schema.prisma` parse convenience API | Future RFC / planning convenience; not M4.3.1 |
| Strict bijection / no-extras mode | Future RFC if generation/round-trip requires it |
| Host-configurable type allow-lists | Forbidden in M4.3.1; future adapter RFC if needed |
| Roadmap / README wording correction | Documentation closeout after Accept/delivery |
| Metadata emitters / Operations persistence / constraint→index | Future RFCs; do not reopen M3 |

## 13. Document status

**Status: Accepted.** Authoritative for M4.3.1 Prisma correspondence verification semantics. Do not begin M6 implementation until an Accepted implementation plan exists for `#112`. Prefer one pull request per tracking issue for the eventual delivery slice after Accept.
