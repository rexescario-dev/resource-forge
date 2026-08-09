# RFC-028: Persistence / ORM Mapping

**Date:** 2026-08-09  
**Status:** Draft  
**Package:** `@resource-forge/core` (contracts / semantics; no implementation in this RFC)  
**Tracking:** [#98](https://github.com/rexescario-dev/resource-forge/issues/98)  
**Depends on:** RFC-001 (Resource Identity — type identity retained; instance/surrogate storage ids remain non-architectural), RFC-005 (Resource Model), RFC-007 (Resource Fields — ordered `fields` / `FieldName`), RFC-008 (Resource Relations — ordered `relations` / `RelationName`), RFC-009 (Resource Field Types — `FieldType` retained), RFC-010 (Relation Association Semantics — `target` retained), RFC-011 (Relation Multiplicity — `"one"` \| `"many"` retained), RFC-013 (Field/Relation Optionality — `optional` retained), RFC-014 (Field Nullability — Field `nullable` retained), RFC-015 (Relation Nullability — association-reference `nullable` retained), RFC-024 (Direction / Joins — `direction` / `inverse` / `join` retained as mapping inputs), RFC-025 (Value-State Semantics — retained as persisted payload inputs), RFC-026 (Cascade Semantics — `onDelete` / `onUpdate` retained as mapping inputs; `evaluateCascadeEvent` unchanged and unwired by this RFC), RFC-027 (Loading / Fetch Semantics — `fetch` retained as mapping input; `checkRelationLoadStates` unchanged and unwired by this RFC)  
**Followed by:** Design Review (M3); after Accept, M4 Integrations (e.g. Prisma) realize the correspondence; optional M3.x planning/delivery only if an Accepted plan proves a host-independent core representation is required; runtime traversal / query execution; Relation→metadata projection; wire/serialization (unless a future RFC proves a hard contract boundary)  
**Unblocks:** A stable core persistence-correspondence contract for M4 Integrations to implement against  

**Amends / specializes:** Fills the deferred **persistence / ORM mapping** gap left by RFC-024 / RFC-025 / RFC-026 / RFC-027 as a **semantic correspondence ledger** over the existing Resource floors. Does **not** widen Resource / Field / Relation declaration members. Does **not** reopen or reinterpret RFC-001 type identity, RFC-024 direction/inverse/join, RFC-025 value-state taxonomy, RFC-026 cascade policies / `evaluateCascadeEvent`, RFC-027 fetch / load-state / `checkRelationLoadStates`, RFC-013 `optional`, RFC-014 / RFC-015 `nullable`, or RFC-011 multiplicity meanings.

## Primary question

> What **normative Resource → persistence correspondence** does Resource Forge need so Accepted Resource declarations have a stable persistence-mapping meaning—without adding mapping members, descriptors, core evaluation APIs, ORM vocabulary, reverse sync, or reopening RFC-024–027?

## Thesis

RFC-028 locks persistence mapping as a **Resource-authoritative, one-way, total semantic correspondence ledger**:

- **Resource declaration is authoritative** for persistence correspondence.
- **One-way** — Resource → persistence only; no store→Resource reverse engineering and no round-trip synchronization protocol.
- **Total** — every declared Field and Relation **participates in persistence correspondence**; Resource type identity always corresponds at the entity/type level.
- **Correspondence ≠ particular storage mechanism** — “persistence participation” means normative correspondence to a semantic target (persisted attribute / association / entity identity), not a requirement that every host use a particular physical storage technology.
- **RFC-024–027 are consumed as mapping inputs**, not redefined.
- **Honor ≠ implement** — a persistence realization MUST respect declared cascade intents and load-contract outcomes; this RFC does **not** define how the engine realizes them (flush order, transactions, query plans, includes, proxies, load execution timing).
- **Contract ≠ engine** — no Prisma/SQL/ORM APIs as normative semantics.
- **No new core surface** — no new declaration members, mapping descriptor, adapter port, or public checker; `validateResource`, `evaluateCascadeEvent`, and `checkRelationLoadStates` are **unchanged and unwired by RFC-028**.

```text
Invariant:
  If it is declared in the Resource schema, it participates in persistence correspondence.
  Physical realization remains host-defined (M4).

Resource (existing floors; unchanged shape)
├── identity: ResourceIdentity     → persistence entity/type identity (semantic target)
├── fields[]                       → participate in correspondence → persisted attribute (semantic target)
└── relations[]                    → participate in correspondence → persistence association (semantic target)
      ├── direction / inverse? / join?   ← RFC-024 mapping inputs
      ├── onDelete / onUpdate            ← RFC-026 mapping inputs
      └── fetch                          ← RFC-027 mapping input

Authority:
  Resource contract → persistence correspondence → host realization (M4)
```

## 1. Scope

### 1.1 Goals

1. Define normative **Resource → persistence correspondence** for type identity, every Field, and every Relation.
2. Lock mapping as **Resource-authoritative**, **one-way**, and **total** for declared members.
3. Consume RFC-024 / RFC-025 / RFC-026 / RFC-027 as **mapping inputs** without redefining their semantics.
4. Distinguish **type identity** (`ResourceIdentity`) from **persistence instance identity / primary key**.
5. Distinguish **logical** member names from **physical** host names.
6. Lock **Honor ≠ implement** so “MUST honor” cannot become normative SQL/ORM mechanics.
7. Explicitly forbid new declaration members, mapping descriptors, core checkers/ports, and reverse/sync protocols in this RFC.
8. Leave physical realization and engine-specific adapters to **M4 Integrations**.
9. Keep `validateResource`, `evaluateCascadeEvent`, and `checkRelationLoadStates` **unchanged and unwired by RFC-028**.

### 1.2 Non-goals

This RFC does not define:

1. New Resource / Field / Relation declaration members (or any persistence-specific floor widen)
2. A mapping descriptor / overlay / second mapping model
3. A public TypeScript checker, persistence-view/capability object, or adapter port
4. Changes to `validateResource`, `evaluateCascadeEvent`, or `checkRelationLoadStates` (they remain unchanged and unwired by this RFC)
5. Prisma schema/DMMF, Prisma APIs/types, Nest, or GraphQL integration
6. SQL/database-specific behavior; ORM implementation strategy; flush/transaction/query/`include`/proxy mechanics
7. Invented table/column/key/FK naming rules beyond logical names already on existing floors
8. Reverse mapping (persistence schema → Resource) or round-trip synchronization / equivalence protocols
9. Runtime traversal / query execution semantics
10. Relation → `ResourceMetadata` projection or wire/serialization formats
11. Constraint → index/uniqueness projection; Operations persistence semantics; Annotation persistence semantics
12. Reopening RFC-024 / RFC-025 / RFC-026 / RFC-027 (or M3.21–M3.24)
13. Concrete TypeScript API names, modules, or error-code enums for persistence mapping

## 2. Terminology

| Term | Meaning |
| --- | --- |
| Persistence correspondence | Normative semantic meaning of how a declared Resource member relates to persistence concepts; **not** a particular physical storage mechanism |
| Persistence entity/type identity | Semantic target of type-level identity correspondence: the persisted kind a host maps a Resource type to (table/model/collection/equivalent) |
| Persistence instance identity | Primary key **or equivalent** identifying a persisted instance; distinct from `ResourceIdentity` |
| Persisted attribute | Semantic target of Field correspondence: column/property/equivalent for a declared Field (physical representation is host-defined) |
| Persistence association | Semantic target of Relation correspondence: association between owning and target persistence entities (physical representation is host-defined) |
| Mapping input | An existing Accepted declaration/policy whose meaning a persistence realization must respect, without this RFC redefining that meaning |
| Host realization | Engine-specific physical naming, storage encoding, query/cascade/load mechanics deferred to M4 Integrations |
| Logical name | `Field.name` / `Relation.name` as contract member identity for correspondence |
| Physical name | Host-chosen table/column/FK/join-table/relation-field name |

RFC-001 / RFC-007–RFC-015 / RFC-024–RFC-027 terms keep their existing meanings. This RFC **does not** change declaration-time definitions of `optional`, `nullable`, `multiplicity`, `direction`, `inverse`, `join`, `onDelete`, `onUpdate`, or `fetch`.

## 3. Identity correspondence

### 3.1 Type-level (normative)

1. `Resource.identity` (`ResourceIdentity`) is the authoritative **type-level persistence entity identity** for that Resource.
2. A host MUST NOT replace that identity with a separate architectural type-identity system.
3. Physical realization—table/model/collection names—is **host-defined**.

### 3.2 Instance-level (normative boundary)

1. Persisting instances requires an **instance identity / primary key or equivalent**.
2. That instance key is **distinct from `ResourceIdentity`** and MUST NOT redefine architectural type identity (RFC-001 already allows opaque/surrogate storage identifiers).
3. RFC-028 adds **no PK declaration surface** and imposes no Field-selection or naming convention.
4. Whether the host uses declared Field(s), a surrogate key, or another persistence mechanism is **host realization**.

### 3.3 Governing distinction

> **`ResourceIdentity` identifies the Resource type; persistence instance identity identifies a persisted instance.**

“Correspondence” specifies **semantic meaning**, not a particular storage technology or physical schema.

## 4. Field correspondence

1. Every declared Field **participates in persistence correspondence**. The semantic target of that correspondence is a **persisted attribute** of the Resource’s persistence entity.
2. Correspondence is based on **Field membership** in the Resource schema (total): a host MUST NOT silently omit a declared Field from that correspondence.
3. `Field.name` is the **logical** member identity for correspondence; physical column/property naming is host realization.
4. `Field.type` (`string` | `number` | `boolean`) constrains what the persisted-attribute semantic target MUST be able to represent; coercion/storage encoding is host realization.
5. `optional` / `nullable` remain owned by RFC-013 / RFC-014 and are **mapping inputs** for whether absence / null are allowed in Field values under that correspondence; they are not redefined here.
6. RFC-025 Field value states (absent / present / null) are **consumed** when interpreting Field payloads under that correspondence; not amended.
7. No Field→metadata projection, persistence-specific Field members, defaults, or constraint/index semantics are introduced.

**Invariant:** Every declared Field participates in persistence correspondence, while its physical representation remains host-defined.

## 5. Relation correspondence

1. Every declared Relation **participates in persistence correspondence**. The semantic target of that correspondence is a **persistence association** between the owning Resource’s entity and the `target` Resource’s entity (self-target uniform).
2. Correspondence is based on **Relation membership** (total): a host MUST NOT silently omit a declared Relation from that correspondence.
3. `Relation.name` is the **logical** association identity; physical FK/join-table/relation-field representation is host-defined.
4. `target` establishes the associated Resource type using the RFC-001 `ResourceIdentity` boundary; association endpoint type identity follows §3.
5. `multiplicity` (`one` | `many`) is a mapping input for association cardinality shape; it does not prescribe collection storage mechanics.
6. `optional` / `nullable` remain owned by RFC-013 / RFC-015 and are mapping inputs for absence / association-null in association values under that correspondence; not redefined here.
7. RFC-025 Relation value states and RFC-027 load states are **consumed**, not redefined, when interpreting association payloads / load outcomes under that correspondence.
8. `direction` / `inverse` / `join`, `onDelete` / `onUpdate`, and `fetch` are **mapping inputs** whose meanings remain owned by RFC-024 / RFC-026 / RFC-027 (§6).

**Invariant:** Every declared Relation participates in persistence correspondence, while association topology and physical realization remain host-defined subject to the existing Relation policies.

## 6. Consumed mapping inputs (RFC-024–027)

RFC-028 determines **which** existing contract semantics a persistence realization must honor; it does **not** define how the persistence engine realizes them.

### 6.1 RFC-024 — association topology inputs

1. `direction`, `inverse`, and `join` are association-topology mapping inputs.
2. Inbound Relations participate in persistence correspondence like outbound; direction does not invent a persistence-only axis.
3. `inverse`, when present, is a mapping input for reverse-edge association identity; reciprocal declaration remains not required.
4. `join`, when present, identifies the `{ local, remote }` Field pair participating in association identity; hosts use that binding identity when realizing the association.
5. Absence of `join` does **not** invent implicit join semantics in this RFC.

### 6.2 RFC-025 — persisted payload value-state inputs

1. Existing value-state semantics govern persisted Field/Relation values when those values are present for classification.
2. RFC-028 adds no value-state vocabulary and does not amend RFC-025.

### 6.3 RFC-026 — cascade mapping inputs

1. `onDelete` / `onUpdate` are the authoritative cascade intents a persistence realization must respect along the association.
2. Policy meanings remain RFC-026 (`none` | `cascade` | `restrict` | `setNull`).
3. “MUST honor” means realized persistence behavior must respect the declared cascade intent; it does **not** define transaction ordering, flush behavior, FK clause syntax, or ORM cascade flags as normative text.
4. `evaluateCascadeEvent` remains **unchanged and unwired by RFC-028**.

### 6.4 RFC-027 — loading strategy mapping inputs

1. `fetch` is the authoritative loading intent for association payloads relative to the owning Resource’s **load-contract outcome**.
2. Normative scope is that contract outcome (`eager` ⇒ loaded; `lazy` ⇒ may be not-loaded)—not when/how a persistence host executes queries, includes, proxies, or hydration.
3. Not-loaded remains a loading state and MUST NEVER be collapsed into RFC-025 value states.
4. `checkRelationLoadStates` remains **unchanged and unwired by RFC-028** (not wired into `validateResource`).

## 7. Mapping invariants

1. **Resource-authoritative** — the Resource declaration is the authority for persistence correspondence.
2. **One-way** — Resource → persistence mapping only; no reverse engineering and no round-trip sync protocol.
3. **Total** — every declared Field and Relation **participates in persistence correspondence**; type identity always corresponds (§3). A host MUST NOT silently omit a declared member from that correspondence.
4. **Contract ≠ engine** — correspondence is semantic meaning, not a prescribed storage technology, schema DDL, or ORM API.
5. **Consume, don’t reopen** — RFC-024–027 remain authoritative for their members/policies; RFC-028 does not amend their vocabularies or evaluation surfaces.
6. **Honor ≠ implement** — a persistence realization MUST respect declared cascade intents and load-contract outcomes; RFC-028 does **not** define flush order, transactions, query plans, includes, proxies, or when/how the host executes loads.
7. **Type ≠ instance identity** — `ResourceIdentity` identifies the Resource type; persistence instance identity/PK identifies a persisted instance.
8. **Logical ≠ physical names** — `Field.name` / `Relation.name` are logical correspondence identities; physical names are host-defined.
9. **No new core surface** — no new declaration members, mapping descriptor, adapter port, or public checker; `validateResource`, `evaluateCascadeEvent`, and `checkRelationLoadStates` are unchanged and unwired by this RFC.
10. **Failures at host boundary** — correspondence/realization failures are host/integration concerns unless a future Accepted artifact defines otherwise.

## 8. Rationale

### 8.1 Why a correspondence ledger (not a second model)

A mapping descriptor or persistence-specific declaration widen would invent a parallel model before M4 has proven what hosts need. Pure semantic correspondence over the existing floors gives M4 a stable contract without premature binding surfaces.

### 8.2 Why Resource-authoritative and one-way

Prisma DMMF → Resource and store introspection are integration behaviors. Putting reverse/sync into core would turn RFC-028 into an equivalence protocol and blur M3 vs M4. Resource → persistence correspondence keeps authority crisp.

### 8.3 Why total without a partial-mapping escape hatch

Without a mapping descriptor or new members, omitting a declared Field/Relation from persistence correspondence has no honest declaration surface. Total correspondence keeps the contract deterministic: declared ⇒ participates in correspondence.

### 8.4 Why semantics-only (no core checker)

There is no host-independent store model in `@resource-forge/core` to check against. Manufacturing a persistence-view port solely to give this RFC an implementation artifact would violate YAGNI and the locked “no ports unless necessary” rule. Realization and validation belong to M4 unless a later Accepted plan proves otherwise.

### 8.5 Why Honor ≠ implement

Prior RFCs already forbade defining cascade/fetch as ORM/SQL behavior. RFC-028 must not smuggle those mechanics back in through “MUST honor” wording. Honor constrains outcomes/intents; implement remains host-defined.

## 9. Worked examples (informative)

### 9.1 Type identity vs instance key

```text
Resource identity = crm/Customer
  → persistence entity/type identity for Customer (host may name table "customers")

Persisted Customer row PK = "c_123" (surrogate) or Field "id"
  → persistence instance identity
  → MUST NOT replace or redefine ResourceIdentity crm/Customer
```

### 9.2 Total Field correspondence

```text
fields: [email: string, active: boolean]

Both email and active participate in persistence correspondence
  (semantic target: persisted attributes).
Host MAY name columns "email_address" / "is_active".
Host MUST NOT silently omit `active` from that correspondence.
```

### 9.3 Relation + consumed policy inputs

```text
Relation orders:
  target = crm/Order
  multiplicity = many
  direction = outbound
  join = { local: id, remote: customerId }   // binding identity when present
  onDelete = restrict
  fetch = lazy

Correspondence:
  → persistence association Customer→Order
  → join Fields identify association binding identity (no invented default join)
  → realized delete behavior must respect restrict intent (not “SQL ON DELETE RESTRICT” as RFC text)
  → load-contract outcome may leave orders not-loaded (not “ORM lazy proxy” as RFC text)
```

### 9.4 Forbidden silent non-persistence

```text
Declared Field accountCode present on Resource
Host omits it from persistence correspondence
  → INVALID under total correspondence
```

## 10. Relationships to Accepted RFCs

| RFC | Relationship |
| --- | --- |
| RFC-001 | Relied upon for type identity; instance/surrogate storage ids remain non-architectural; **not amended** |
| RFC-005 | Resource aggregate relied upon as mapping authority |
| RFC-007 / RFC-009 | Field membership / `FieldType` relied upon for Field correspondence |
| RFC-008 / RFC-010 | Relation container / `target` relied upon for association correspondence |
| RFC-011 / RFC-013 / RFC-014 / RFC-015 | Multiplicity / optional / nullable retained as mapping inputs; **not amended** |
| RFC-024 | Consumed as association-topology mapping inputs; **not amended** |
| RFC-025 | Consumed for persisted value-state interpretation; **not amended** |
| RFC-026 | Consumed as cascade mapping inputs; `evaluateCascadeEvent` unchanged and unwired; **not amended** |
| RFC-027 | Consumed as loading mapping inputs; `checkRelationLoadStates` unchanged and unwired; **not amended** |
| RFC-016–RFC-023 | Not in the persistence-correspondence ledger of this RFC; constraint/index, operations, annotations, projection composition deferred |

## 11. Acceptance criteria (for this specification)

Satisfied at Accept:

1. Persistence mapping is defined as a Resource-authoritative, one-way, total semantic correspondence ledger over existing floors.
2. Type-level `ResourceIdentity` correspondence and instance-level PK distinctness are normative; no PK declaration surface is introduced.
3. Every declared Field and Relation participates in normative persistence correspondence; a host MUST NOT silently omit a declared member from that correspondence.
4. Logical vs physical naming is explicit; no invented naming rules.
5. RFC-024–027 are consumed as mapping inputs; their vocabularies and evaluation surfaces are not redefined.
6. Honor ≠ implement is normative for cascade intents and load-contract outcomes.
7. No new declaration members, mapping descriptor, adapter port, or public checker is introduced.
8. `validateResource`, `evaluateCascadeEvent`, and `checkRelationLoadStates` are unchanged and unwired by this RFC.
9. Prisma/SQL/ORM implementation, reverse/sync, runtime traversal/query, Relation→metadata projection, wire, and constraint/index projection remain explicitly deferred.
10. RFC-024 / RFC-025 / RFC-026 / RFC-027 / M3.21–M3.24 remain closed.

## 12. Deferred concerns ledger

Deferred concerns are listed in §1.2. This ledger restates that Prisma/Nest/GraphQL adapters, SQL/ORM realization mechanics, reverse mapping/sync, runtime traversal/query execution, Relation→metadata projection, wire/serialization, constraint→index projection, Operations/Annotations persistence semantics, and any concrete public TypeScript persistence-mapping APIs remain out of scope unless a future RFC or Accepted plan explicitly defines them.

## 13. Packaging note (informative)

Prefer **one pull request per tracking issue** for the eventual delivery slice after Accept. This RFC is **Draft / ready for M3 Design Review**. Do not begin M6 until an Accepted implementation plan exists **if** delivery requires host-independent core artifacts; otherwise Accept may primarily authorize M4 Integrations against this correspondence contract. RFC-024 / M3.21, RFC-025 / M3.22, RFC-026 / M3.23, and RFC-027 / M3.24 remain closed and MUST NOT be reopened by this work.
