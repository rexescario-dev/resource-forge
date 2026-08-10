# RFC-034: Prisma Schema Realization

**Date:** 2026-08-10  
**Status:** Accepted  
**M3:** Accepted (2026-08-10) — Design Review fifth-pass re-entry; no design blockers after closures: `inverse` absent ⇒ non-pairable (no inferred counterpart); `resourceField` / `prismaExtra` identity scalars `String|Int` only; provider-independent schema validation with provider-specific checks host-owned; FK-realized 1:1 and m:n fail-closed; remote join target = instance `@id` only; Emission Correspondence Invariant + §4.7 verification-input identity; package-defined DMMF-shaped `dmmf`; no invented FK Fields / `@unique` / `@relation(name: ...)`; cascade/fetch/Client/Nest/GraphQL/core PK fenced. M4 (implementation planning) authorized for `#115`.  
**Package:** `@resource-forge/prisma` (Prisma schema realization; consumes `@resource-forge/core`; extends the M4.3.1 verifier package without changing core)  
**Tracking:** [#115](https://github.com/rexescario-dev/resource-forge/issues/115)  
**Depends on:** RFC-001 (Resource Identity), RFC-005 (Resource Model — `Resource`, `validateResource`), RFC-007 / RFC-009 / RFC-014 (Fields — structure, types, Field nullability), RFC-013 (Field/Relation Optionality — `optional` retained; not schema-encoded), RFC-008 / RFC-010 / RFC-011 / RFC-015 (Relations — association, multiplicity, Relation nullability including valid `many + nullable` declarations), RFC-024 (Direction / Joins — `direction` / `inverse` / `join` as topology mapping inputs), RFC-026 (Cascade Semantics — **consumed as fence only**; not realized as Prisma referential actions), RFC-027 (Loading / Fetch — **consumed as fence only**), RFC-028 (Persistence / ORM Mapping — Resource-authoritative, one-way, total correspondence ledger; no new core surface; no Resource PK declaration), RFC-031 (Nest host — **closed**; dependency independence only), RFC-032 (GraphQL translation — **closed**; dependency independence only), RFC-033 (Prisma Correspondence Verification — **Accepted**; emit composes with `verifyPrismaCorrespondence`)  
**Followed by:** M4.3.2 implementation planning/delivery for `#115` after Accept; M4.3.3 Prisma Client / persistence bindings (candidate); CascadePolicy → Prisma referential-action realization (candidate); uniqueness/index realization (candidate, unlocks 1:1); Prisma→Resource generation only if separately Accepted  
**Unblocks:** A Prisma integration boundary that deterministically realizes validated Resources as Prisma model schema while preserving Resource authority and remaining composable with RFC-033 verification

**Amends / specializes:** Opens M4 Integrations for **Prisma schema realization** (M4.3.2) in `@resource-forge/prisma`. Consumes RFC-028 as the correspondence floor and RFC-033 as the verification contract. Does **not** reopen or extend M3, RFC-005–RFC-030 product locks, RFC-031 Nest hosting, RFC-032 GraphQL translation, RFC-033 verification semantics, Prisma Client bindings, reverse Prisma→Resource generation, or cascade/fetch engine realization.

## Primary question

> How should `@resource-forge/prisma` deterministically realize a Resource unit as Prisma schema, while exposing enough derived structure for `verifyPrismaCorrespondence` to validate the emitted result—without inventing Resource PK/join/cascade surfaces or coupling Nest/GraphQL?

## Thesis

RFC-034 locks M4.3.2 as a **Resource-authoritative Prisma schema emitter** with a single internal semantic source:

- **`@resource-forge/prisma` remains the Prisma integration package.** It depends on `@resource-forge/core`. Core MUST NOT depend on Prisma. Nest/GraphQL MUST NOT become dependencies.
- **Direction is Resource → Prisma.** Emission realizes Resource declarations; Prisma is not a source of Resource declarations.
- **Primary product is the Resource-derived Prisma model artifact (`models`).** A host MAY compose it into `schema.prisma`. Environment configuration (`datasource` / `generator`) is host-owned.
- **Companion product is a DMMF-shaped view** derived from the **same Emit Model semantics**, solely to support the Emission Correspondence Invariant and composition with `verifyPrismaCorrespondence`. It is **not** an independent generation contract and MUST NOT become a second public schema-authoring format.
- **One internal Emit Model** is the semantic source for both `models` and `dmmf`. Public `buildPrismaEmitModel` is **not** part of this RFC’s product surface.
- **Prisma-specific realization details the Resource intentionally does not own** are supplied by an explicit emit-side realization mapping (instance identity, optional numeric scalar overlays, join overlays when Resource `join` is absent, optional name mapping, optional preamble).
- **Emission Correspondence Invariant:** successful emission MUST produce a derived `dmmf` that is a representation of the **same emitted model semantics** and that satisfies `verifyPrismaCorrespondence` against the source Resource unit and the verification-facing mapping in §4.7. This is a contractual property of the Emit Model; implementations MUST NOT be required to call `verifyPrismaCorrespondence` inside `emitPrismaSchema`.
- **No new core surfaces.** In particular, this RFC does not introduce a Resource PK declaration, does not require Resource `join` where RFC-024 permits absence, and does not equate Resource `CascadePolicy` with Prisma referential actions.

```text
Invariant:
  Resources are authoritative; Prisma schema is realized.
  models is normative; dmmf is derived from the same Emit Model semantics.
  Emission success ⇒ Emission Correspondence Invariant holds (fail-closed otherwise).

Validated Resource unit
  + Prisma realization mapping
  + optional preamble options
        │
        ▼
@resource-forge/prisma
  emitPrismaSchema(...)
        │
        ├── { models, preamble?, dmmf }  (success)
        └── EmitError                     (fail closed)

                    Emit Model (internal)
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
          models                    dmmf
             │                       │
             ▼                       ▼
      host composition     verifyPrismaCorrespondence
      → schema.prisma      (composable; not required inside emit)

packages/core — consumed only; no product-surface change
packages/nest, packages/graphql — independent; no dependency
```

## 1. Scope

### 1.1 Goals

1. Define the Prisma schema-realization boundary for M4.3.2 in `@resource-forge/prisma`.
2. Lock `models` as the normative emission product and `dmmf` as a derived companion from the same Emit Model semantics.
3. Define public `emitPrismaSchema` beside existing `verifyPrismaCorrespondence` without coupling their call graphs.
4. Lock emit-side realization mappings for Prisma instance identity, numeric scalar precision, and join realization when Resource `join` is absent.
5. Lock Field and Relation emission rules aligned with RFC-033 scalar allow-lists and nullable-only schema encoding.
6. Lock unilateral Relation emission when `inverse` is absent, with fail-closed behavior when Prisma cannot express the shape without inventing an inverse.
7. Lock the Emission Correspondence Invariant as a normative semantic contract.
8. Require fail-closed emission, including empty units and mapping collisions.
9. Preserve dependency direction: Prisma package → core only; no Nest/GraphQL coupling; no Prisma Client/runtime DB required for emit.
10. Explicitly fence Client bindings, cascade/fetch realization, reverse generation, implicit m-n shortcuts, and new core surfaces.

### 1.2 Non-goals

This RFC does not define:

1. Prisma Client runtime persistence bindings, queries, includes, transactions, or DB I/O (M4.3.3 candidate)
2. Mapping Resource `CascadePolicy` (`onDelete` / `onUpdate`) to Prisma referential actions
3. Realizing Relation `fetch` / include behavior
4. Prisma → Resource generation, DMMF→Resource synthesis, bijection / strict no-extras modes, or bidirectional sync
5. Implicit many-to-many realization as a special-case emission mode
6. Public exposure of the internal Emit Model (`buildPrismaEmitModel` or equivalent)
7. Nest↔Prisma or GraphQL↔Prisma composition as a required dependency
8. New `@resource-forge/core` declaration members (including Resource PK), mapping descriptors, adapter ports, or public checkers
9. Changes to `validateResource`, `evaluateCascadeEvent`, `checkRelationLoadStates`, or RFC-033 verification semantics
10. Inventing default `datasource` / `generator` / provider / URL configuration
11. Treating Prisma `@map` / `@@map` database physical names as Resource correspondence identities
12. Requiring Prisma CLI/engine parsing as a runtime dependency of emission
13. Name-based scalar inference (e.g. `price` → `Decimal`) or global mutable emitter knobs beyond locked per-member overlays
14. Emitting unrequested conveniences (timestamps, soft-delete columns, indexes, etc.)
15. Reopening M3, RFC-005–RFC-030, RFC-031, RFC-032, or RFC-033 product locks

### 1.3 Informative only

- Exact TypeScript export names and error-code enums may be refined during Accepted implementation planning so long as the semantic contracts in this RFC are preserved.
- Illustrative API spellings below are normative in *role*, not in every identifier.
- **The normative contract for `models` is the realized Prisma model semantics.** The concrete serialization representation of `models` (SDL string vs structured AST that hosts serialize) is an implementation-planning detail and is **not** locked by this RFC, so long as hosts can produce Prisma schema model text and the derived `dmmf` preserves the same emitted model semantics.

## 2. Terminology

| Term | Meaning |
| --- | --- |
| Prisma schema realization | `@resource-forge/prisma` behaviors that emit Prisma model artifacts from Resources under this RFC |
| Emission unit | One or more already-constructed core `Resource` values presented together for a single emission attempt |
| Emit Model | Package-internal semantic representation of the realized Prisma models for one emission; single source for `models` and `dmmf` |
| `models` | Normative representation of the realized Prisma model **semantics** returned by a successful emission; its concrete serialization form is implementation-defined within §1.3 |
| `dmmf` | Package-defined **DMMF-shaped** representation of the **same emitted model semantics** as `models`, sufficient for RFC-033 correspondence verification. It is **not** required to be byte-for-byte, structurally identical, or version-identical to Prisma’s internal/generated DMMF |
| `preamble` | Optional host-supplied Prisma environment configuration (`datasource` / `generator` or equivalent) for composition only |
| Prisma realization mapping | Emit-side host input supplying Prisma-specific realization decisions (instance identity, scalar overlays, join overlays, optional name mapping) |
| Prisma instance-identity mapping | Required per-Resource mapping establishing the Prisma `@id` realization without introducing a Resource PK surface |
| Host join overlay | Emit-time join realization supplied when Resource `join` is absent; not a new RFC-024 declaration |
| Emission Correspondence Invariant | Contractual requirement that successful emission’s derived `dmmf` represents the same emitted model semantics as `models` and satisfies `verifyPrismaCorrespondence` for the source Resource unit and the verification-facing mapping defined in §4.7 |
| Same emitted model semantics | Agreement between representations on: emitted model identities; scalar members and scalar types/nullability; identity roles/defaults; relation field identities/multiplicity/nullability; FK ownership; `fields`/`references`; and every realization decision that participates in correspondence (§4.7) |
| FK-realized Relation | A Relation whose Prisma realization requires Prisma `fields`/`references` on the FK-owning relation end. Join ownership (§4.3.1) and join participant rules (§4.3.2) apply to FK-realized Relations. Not every Resource Relation is necessarily FK-realized |
| Identity-preserving default | When no explicit name mapping is supplied: `ResourceIdentity.name` → Prisma model name; `Field.name` / `Relation.name` → Prisma **relation/field member names** (schema-level member identifiers — not `@relation(name: ...)` disambiguators) |
| Prisma relation field name | The Prisma model member name for a relation end (what hosts typically write as `orders Order[]`) |
| Prisma relation disambiguator | Optional Prisma `@relation(name: ...)` identifier used to disambiguate multiple relations between the same models — **out of scope / forbidden to invent in M4.3.2** unless a future Accepted realization mapping defines it |
| Supported identity default | Closed structured default vocabulary for `@id` fields in §4.1.3 |

RFC-001 / RFC-005 / RFC-007–RFC-015 / RFC-024 / RFC-028 / RFC-033 terms keep their existing meanings. This RFC does **not** change declaration-time definitions of `optional`, `nullable`, `multiplicity`, `direction`, `inverse`, `join`, `onDelete`, `onUpdate`, or `fetch`.

## 3. Package and public surface

### 3.1 Package boundary

1. Product surface lives in `@resource-forge/prisma`.
2. The package MAY depend on `@resource-forge/core`.
3. Core MUST NOT depend on Prisma or on `@resource-forge/prisma`.
4. `@resource-forge/prisma` MUST NOT depend on `@resource-forge/nest` or `@resource-forge/graphql`.
5. Emission MUST NOT require Prisma Client, database access, or Prisma CLI/engine as a runtime dependency of the public emit API.

### 3.2 Public entry (role-normative)

```text
emitPrismaSchema(resources, realization, options?)
  → Result<{ models, preamble?, dmmf }, EmitError>
```

alongside the existing RFC-033 entry:

```text
verifyPrismaCorrespondence(resources, dmmf, mapping?)
  → Result<CorrespondenceReport, CorrespondenceError>
```

1. `emitPrismaSchema` is the public M4.3.2 product entry.
2. The internal Emit Model MAY exist as an implementation seam; it MUST NOT be required public API in this RFC.
3. Reuse of M4.3.1 naming/mapping types is permitted where concepts are identical. Emit-only realization concepts MUST remain emit-side unless verification actually needs their semantics.

### 3.3 Success output shape

A successful emission returns:

| Field | Status | Role |
| --- | --- | --- |
| `models` | **Required** | Normative representation of realized Prisma model semantics (serialization form per §1.3) |
| `preamble` | Optional | Host environment configuration for composition only |
| `dmmf` | **Required** | Package-defined DMMF-shaped representation of the same emitted model semantics (not Prisma-internal DMMF) |

1. Successful emission always contains at least one realized model.
2. Empty Resource units are invalid emission inputs and fail closed.
3. Absent preamble is not a failure.
4. Hosts remain responsible for composing `preamble?` + `models` into a complete `schema.prisma` when desired.
5. Preamble MUST NOT affect Resource↔Prisma correspondence semantics.

## 4. Realization mapping

Emit-side realization mapping supplies Prisma details Resource intentionally does not own. It is **not** a core declaration surface.

### 4.1 Prisma instance-identity mapping (required)

Every emitted Resource MUST have an explicit Prisma instance-identity mapping. Missing or invalid mapping fails closed.

The mapping is discriminated:

#### 4.1.1 `resourceField`

1. References a **Resource Field identity** (not an arbitrary Prisma field name).
2. That Field is emitted normally and participates in correspondence as Resource-owned.
3. Its Prisma realization receives `@id`.
4. Optional identity default MAY be supplied per §4.1.3.
5. Semantic chain: **Resource Field → Prisma realization → `@id`**.
6. A `resourceField` identity target MUST be realizable as a Prisma `@id` field. In particular, it MUST have `nullable: false`, and its resolved Prisma scalar and default MUST satisfy the identity rules in §4.1.3. Otherwise emission fails closed.
7. After scalar resolution (§4.2 overlays included), a `resourceField` identity MUST resolve to Prisma **`String` or `Int`**. A Resource Field resolving to `Float`, `Decimal`, `Boolean`, or any other non-identity scalar is invalid as an instance-identity field and **fails closed**. (Ordinary non-identity Fields may still emit `Float`/`Decimal` under §4.2.)

#### 4.1.2 `prismaExtra`

1. Emits exactly one Prisma-only scalar member carrying `@id` (and its mapped default, if supported per §4.1.3).
2. It is **not** a Resource Field.
3. It is **not** a Relation/join participant.
4. Correspondence treats it as the sole allowed M4.3.2 host-owned Prisma extra for instance identity.
5. No silent `id` Field convention and no package-invented surrogate without this explicit mapping.
6. **`prismaExtra.scalar` MUST be exactly one of:** `String` | `Int`.
7. `Float`, `Decimal`, `BigInt`, `DateTime`, `Bytes`, `Boolean`, `Json`, enums, and any other Prisma scalar are invalid for `prismaExtra` and **fail closed**. (`Float` / `Decimal` remain valid for ordinary Resource Field emission under §4.2; they are forbidden specifically for the `@id` role.)
8. Expanding this allow-list requires a future Accepted realization change; it is not an accidental capability.
9. The emitted `prismaExtra` scalar is non-null (Prisma `@id` fields are not null-capable).

#### 4.1.3 Identity `@default` (optional; structured vocabulary)

1. Instance-identity mappings (`resourceField` or `prismaExtra`) MAY supply an optional identity default.
2. Defaults MUST use an explicitly supported **structured** Prisma default representation. Arbitrary Prisma expression text is **out of scope and invalid**.
3. M4.3.2 supported default kinds are exactly:
   - `cuid`
   - `uuid`
   - `autoincrement`
4. Compatibility constraints (fail closed when violated):
   - `cuid` / `uuid` require scalar `String` (for `prismaExtra`) or a Resource Field whose emitted Prisma scalar is `String`.
   - `autoincrement` requires scalar `Int` (for `prismaExtra`) or a Resource Field whose emitted Prisma scalar is `Int`.
5. Unsupported kinds, raw expression strings, or incompatible scalar/default pairs fail closed.
6. This structured vocabulary does **not** require Prisma CLI/engine parsing at emit time.

### 4.2 Numeric scalar overlay (optional)

For Field `type: "number"`:

1. Default emission is **`Float`** (normative and deterministic).
2. Optional per-Field overlay MAY choose only `Int` | `Float` | `Decimal`.
3. Any other override fails closed.
4. Overlay is per Field, not a global emitter option.
5. No inference from Field names (e.g. `price`, `amount`, `count`).
6. No automatic promotion to `Decimal` from presumed financial semantics.
7. Chosen scalar MUST appear consistently in `models` and derived `dmmf`.

Fixed defaults for other Field types:

| Resource `FieldType` | Prisma scalar |
| --- | --- |
| `string` | `String` |
| `boolean` | `Boolean` |
| `number` | `Float` unless overridden per §4.2 |

### 4.3 Join realization

A Relation is **FK-realized** when its Prisma realization requires `fields`/`references` (§2). Join ownership and participant rules in this section apply to FK-realized Relations. They do not imply that every Resource Relation has a physical FK.

For FK-realized Relations, emission needs enough information to produce Prisma `fields: [...]` / `references: [...]` deterministically.

1. When Resource `join` is **present**, use it (subject to §4.3.1–§4.3.2).
2. When Resource `join` is **absent**, require a host join overlay with the same local/remote **Resource Field** participant shape, and with the FK-owning Relation identified per §4.3.1.
3. Missing or invalid join realization fails closed.
4. The host overlay is emit-time realization only; it is not a new RFC-024 / core declaration.
5. **Local join participants MUST be existing Resource Fields on the FK-owning Resource. Emission MUST NOT introduce new FK scalar Fields. Missing local participant Fields fail closed.** Remote participants follow §4.3.2 (Resource Field that is the target’s `resourceField` identity, or an explicit overlay reference to the target’s instance-identity `@id` when that identity is `prismaExtra`).
6. Join / overlay participants MUST resolve to identities **before** Prisma names are assigned:

```text
local/remote participant identity
        ↓
realization / name resolution
        ↓
Prisma scalar field name (+ type from Field / overlays / identity)
        ↓
relation fields: [...] / references: [...]
```

7. When join/overlay requires a local scalar that is already a Resource Field, emit/reuse that Field’s Prisma scalar. Type/`@id` role incompatibilities fail closed under §4.3.2.
8. Overlay MUST NOT bypass correspondence with arbitrary Prisma-only FK names on the **local** side. On the **remote** side, the only non-Resource-Field exception is the target’s declared `prismaExtra` instance-identity field (§4.3.2).
9. Implicit many-to-many without explicit join/overlay is **out of scope** for this RFC.

#### 4.3.1 FK-owning relation rule

1. For an explicit FK-realized relation pair, the Resource Relation that carries `join` is the sole **Prisma FK-owning relation end** and MUST provide the local `fields` and remote `references` realization on that Prisma relation field.
2. If Resource `join` is absent, the host join overlay MUST identify the FK-owning Resource Relation and its local/remote participants.
3. The inverse Relation MUST NOT independently introduce a second FK mapping for the same relation pair.
4. A `join` (or join overlay) supplied on both inverse ends is invalid unless both declarations resolve to the **same** FK realization (same owning Relation end and same local/remote participants after resolution); otherwise emission fails closed.
5. A relation pair for which Prisma FK ownership cannot be determined from the Resource `join` or host join overlay fails closed.
6. Emitting `fields`/`references` on a Prisma collection-side relation end when the owning end is the singular side (or otherwise mismatched with the locked ownership determination) fails closed.
7. **`direction` does not independently determine Prisma FK ownership.** RFC-024 `direction` is consumed only insofar as it has already been validated as part of the Resource relation topology. FK ownership is determined solely by §4.3.1 (Resource `join` / host join overlay), not by `direction`.

#### 4.3.2 Join participant compatibility

Join / overlay participants MUST satisfy all of the following; any failure fails closed:

1. **Local** participant is a scalar Field on the **FK-owning** Relation’s owning Resource.
2. **Remote** participant is either:
   - a scalar Field on the Relation’s **target** Resource that is that target’s `resourceField` instance-identity Field, or
   - when Resource `join` is absent and the target’s instance identity is `prismaExtra`, an explicit host-overlay reference to that target instance-identity `@id` field.
3. Both local and remote resolve to Prisma **scalar** fields (not relation fields).
4. Resolved Prisma scalar types are compatible for the emitted FK association (same Prisma scalar after overlays / identity scalar choice; incompatible pairs fail closed).
5. Local FK scalar nullability is compatible with the FK-owning Relation’s nullability (as in §5.3 for singular Relations).
6. **Remote reference target:** under M4.3.2’s locked surface (no invented `@unique` / indexes / constraint projection), a join’s remote participant MUST resolve to the target model’s Prisma **instance-identity `@id` field** established by §4.1. If the remote participant cannot be guaranteed as a valid Prisma `references` target under that locked identity surface, emission fails closed. This RFC does **not** invent additional uniqueness constraints to make arbitrary Fields referenceable.
7. **The declared `prismaExtra` instance-identity field is the sole Prisma-only scalar permitted to serve as a join’s remote reference target.** No other Prisma-only scalar may participate in `fields` or `references`. Local `fields` participants remain Resource Fields only.

RFC-033 verifies join evidence against an **existing** DMMF; it does not authorize M4.3.2 to invent uniqueness. Emission therefore narrows remote targets to the already-required instance-identity `@id`.

Resource `join` (RFC-024) names Resource Fields; therefore a Resource-authored `join.remote` can only succeed when the target uses `resourceField` identity and that Field is the remote participant. Targets that use `prismaExtra` identity require a host join overlay (Resource `join` absent or unrealizable against the extra) to name the remote identity explicitly.

#### 4.3.3 Relation-pair topology matrix (normative)

For a paired inverse association (both ends in-unit), multiplicity of the two ends determines Prisma relationship class:

| End A | End B | Prisma class | M4.3.2 disposition |
| --- | --- | --- | --- |
| `one` | `many` | 1:n | Allowed when FK-realized under §4.3.1–§4.3.2 |
| `many` | `one` | n:1 | Allowed when FK-realized under §4.3.1–§4.3.2 |
| `one` | `one` | 1:1 | **Fail closed** — Prisma requires uniqueness on the FK scalar for 1:1; M4.3.2 has no accepted uniqueness / `@unique` realization surface and MUST NOT invent one |
| `many` | `many` | m:n | **Fail closed** — implicit m-n is out of scope; no explicit join-model mechanism in this RFC |

Notes:

1. A FK-realized Relation pair with `multiplicity: "one"` on **both** ends MUST fail closed for the uniqueness reason above. Future constraint/index realization MAY unlock 1:1.
2. A FK-realized `many ↔ many` Relation pair is invalid for M4.3.2.
3. Unpaired / unilateral cases remain governed by §5.3.9: `inverse` absent ⇒ non-pairable; no invented or inferred counterpart.

#### 4.3.4 Same-model association disambiguation

Two distinct Resource relation associations between the same Prisma model pair that cannot be represented without a Prisma `@relation(name: ...)` disambiguator MUST fail closed. M4.3.2 MUST NOT synthesize, infer, or derive such a disambiguator from Resource Relation names (§4.4 / §5.3.12). Self-relations that require disambiguation under this rule likewise fail closed.

### 4.4 Name mapping (optional)

1. Optional host name mapping follows the RFC-033 spirit: identity-preserving Prisma schema-level defaults when absent.
2. Mapped Relation names resolve to **Prisma relation field names** (model member identifiers), not to Prisma `@relation(name: ...)` disambiguators.
3. M4.3.2 MUST NOT synthesize, infer, or otherwise derive a Prisma relation disambiguator from Resource relation names (including using a Resource Relation name as `@relation(name: ...)`). If Prisma validity requires a disambiguator that is not explicitly supplied by an Accepted realization rule, emission fails closed. Custom relation disambiguators remain deferred unless a future Accepted realization mapping defines them.
4. Post-resolution mapping MUST be injective under the collision matrix in §4.5.
5. `@map` / `@@map` physical DB names are not Resource correspondence identities.

### 4.5 Collision matrix (fail closed)

Post-resolution injectivity on each emitted model (and across the unit for models):

1. Two Fields → same Prisma field name
2. Two Relations → same Prisma relation field name
3. Field ∪ Relation → same Prisma member name
4. `prismaExtra` identity name → any already-emitted Field/Relation/FK scalar name on that model
5. Any join-required scalar realization whose resolved Prisma field name conflicts with an existing member, **or** whose required scalar type / identity role is incompatible with that member
6. Two Resources → same Prisma model name

### 4.6 Preamble (optional)

1. Host MAY supply preamble configuration via emit options.
2. Preamble is composition/packaging only and is not an M4.3.2 schema-realization semantic output.
3. The package MUST NOT invent datasource URLs, providers, generators, or other environment defaults as a condition of success.
4. **Provider neutrality:** M4.3.2 does not select or validate a Prisma datasource provider. Emission validates **provider-independent Prisma schema-level model semantics** defined by this RFC (including identity scalar/`@id` constraints and relation topology rules). It does **not** reject an otherwise valid M4.3.2 model solely because a particular provider does not support a realization. Provider-specific compatibility (for example MongoDB ID rules, or whether a given provider supports `Decimal` / `autoincrement()`) is the responsibility of the host composition boundary / Prisma validation time unless a future realization mapping introduces provider constraints.

### 4.7 Verify-facing realization inputs

Correspondence-relevant realization decisions MUST be representable as verification inputs. The verification-facing mapping used with `verifyPrismaCorrespondence` against the derived `dmmf` is **semantically identical** to the emission realization mapping for every correspondence-relevant decision.

| Realization decision | Affects `models` | Affects `dmmf` | Verification input |
| --- | ---: | ---: | --- |
| Instance identity (`resourceField` \| `prismaExtra`, including structured defaults) | yes | yes | **Required** — must be reflected so verify observes the same `@id` / extras semantics |
| Numeric scalar overlay (`Int` \| `Float` \| `Decimal`) | yes | yes | **Required** when present — same Field→Prisma scalar choices |
| Join overlay / Resource `join` (FK ownership + local/remote participants) | yes | yes | **Required** for FK-realized Relations — same ownership and participants |
| Name mapping (model / field / relation field names) | yes | yes | **Required** when present — same post-resolution names |
| Preamble (`datasource` / `generator`) | no | no | **Excluded** — composition only; must not affect correspondence |

Normative consequences:

1. An implementation MUST NOT apply a realization decision during emission that cannot be represented in the verification input for correspondence-relevant rows above.
2. Hosts composing `verifyPrismaCorrespondence(resources, dmmf, mapping?)` after emit MUST supply a mapping that carries the same correspondence-relevant semantics used for emission (identity, numeric overlays, join/ownership, names). Exact TypeScript shape reuse vs emit-side types remains a planning detail; semantic identity is normative.
3. Preamble MUST NOT be smuggled into verification or into Emit Model correspondence semantics.
4. Exact TypeScript parameter shapes for packing emit `realization` into verify `mapping` may be refined in Accepted implementation planning so long as §4.7 semantic identity is preserved.

## 5. Field and Relation emission rules

### 5.1 Preconditions / order

Emission MUST fail closed if any earlier stage fails. Normative stages:

1. Reject empty unit
2. `validateResource` for every Resource in the unit
3. Resolve and validate realization mapping (including collisions)
4. Build Emit Model (Fields, Relations, identity extras)
5. Render `models` and derive `dmmf` from that Emit Model
6. Ensure Emission Correspondence Invariant holds as a property of the Emit Model
7. Return success output (or fail closed)

### 5.2 Fields

1. Emit every Resource Field under resolved names and scalar rules (§4.2).
2. `nullable: false` ⇒ non-null Prisma scalar; `nullable: true` ⇒ null-capable Prisma scalar.
3. Resource `optional` MUST NOT be encoded as Prisma schema optionality.
4. `resourceField` identity applies `@id` (and optional structured default per §4.1.3) to the selected Field’s Prisma realization.
5. `prismaExtra` identity emits exactly one Prisma-only `@id` scalar as defined in §4.1.2–§4.1.3.

### 5.3 Relations

1. Relation targets MUST be in-unit; missing targets fail closed.
2. Emit the declared relation field on the owner model under the resolved Prisma relation **field** name (§4.4).
3. `multiplicity: "one"` ⇒ singular Prisma relation field; `multiplicity: "many"` ⇒ list.
4. Relation `optional` is not schema-encoded.
5. **Relation nullability emission:**
   - For `multiplicity: "one"`: `nullable: false` ⇒ non-null singular relation; `nullable: true` ⇒ null-capable singular relation (`Target?`).
   - For `multiplicity: "many"`: Prisma list relation fields are not optional (`Target[]?` is not valid Prisma). RFC-015 permits `many + nullable: true` as a Resource declaration; **M4.3.2 MUST fail closed** on `multiplicity: "many"` with `nullable: true` rather than normalize, invent collection-null semantics, or emit invalid Prisma.
   - `many + nullable: false` emits a non-null list relation field (`Target[]`).
6. For FK-realized Relations with `multiplicity: "one"` and `nullable: true`, required FK scalar nullability MUST be realized consistently with the relation’s nullable semantics; incompatible mappings fail closed.
7. Do **not** emit Prisma `onDelete` / `onUpdate` from Resource `CascadePolicy`.
8. Do **not** realize `fetch`.
9. **Unilateral Resource Relations vs Prisma topology:** When `inverse` is **absent**, the Resource Relation MUST NOT participate in a paired Prisma relation association. If Prisma requires a counterpart relation field for the association, emission MUST fail closed. An existing in-unit Relation MUST NOT be inferred, guessed, or matched as the counterpart merely because it targets the same Resource/model; counterpart correspondence is established **only** through an explicit Resource `inverse` declaration (or an Accepted future pairing rule — none in M4.3.2). The emitter MUST NOT invent a Resource Relation to supply the missing Prisma relation field. This RFC does **not** require a Prisma parser/CLI/engine to make that determination; the requirement is semantic: successful `models` MUST be representable as valid Prisma relation topology using only explicitly paired in-unit Resource Relations as relation-field provenance. Resource topology may be unilateral; Prisma realization MUST NOT invent or infer Resource topology to satisfy Prisma’s two-ended relation representation.
10. When `inverse` is **present**: the inverse MUST resolve to the corresponding in-unit Resource Relation; its Prisma counterpart is emitted from that Relation’s resolved realization. Inverse MUST NOT manufacture a target-side Resource member.
11. No implicit m-n special-case in this slice.
12. M4.3.2 MUST NOT synthesize, infer, or otherwise derive `@relation(name: ...)` disambiguators from Resource names (§4.4). If a unit would require disambiguators to be valid Prisma and this RFC provides none, emission fails closed.

### 5.4 Coverage

1. Emit Resource-covered models/members only, plus the allowed `prismaExtra` instance-identity field when selected.
2. **Unrequested Prisma extras are not emitted.** The sole M4.3.2 exception is the explicitly declared `prismaExtra` instance-identity field, which may also serve as a join’s remote reference target under §4.3.2 item 7 and otherwise remains a host-owned Prisma extra for correspondence.
3. M4.3.2 realizes the Resource; it does not “improve” the database schema with conveniences the Resource did not declare.

## 6. Emission Correspondence Invariant

### 6.1 Normative statement

> **Emission Correspondence Invariant:** For every successful M4.3.2 emission, the emitter MUST produce a derived `dmmf` that is a representation of the **same emitted model semantics** as `models` (per §2) and that MUST satisfy `verifyPrismaCorrespondence` against the source Resource unit and the verification-facing mapping required by §4.7.

“Same emitted model semantics” means agreement on emitted model identities; scalar members and scalar types/nullability; identity roles/defaults; relation field identities/multiplicity/nullability; FK ownership; `fields`/`references`; and every realization decision that participates in correspondence (§4.7).

### 6.2 Implications

1. The invariant is a semantic contract of the Emit Model, not a required public call sequence.
2. Implementations MAY call `verifyPrismaCorrespondence` internally, but MUST NOT be required to do so.
3. `preamble` is excluded from the invariant.
4. If the emitter cannot produce artifacts satisfying the invariant, emission is unsuccessful (fail closed).
5. A DMMF-shaped object that verifies while diverging from `models` semantics does **not** satisfy this RFC.

## 7. Fail-closed boundaries

Emission MUST fail closed (no success output) when any of the following hold:

1. Empty Resource unit
2. Any Resource fails core `validateResource`
3. Missing or invalid Prisma instance-identity mapping for any emitted Resource (including `resourceField` with `nullable: true`, `resourceField` resolving to a non-`String`/`Int` Prisma scalar, or unresolved/invalid identity defaults)
4. `prismaExtra.scalar` outside `String` | `Int` (including `Float` / `Decimal` as `@id`)
5. Invalid or unsupported identity default (§4.1.3), including arbitrary Prisma expression text or incompatible scalar/default pairs
6. Invalid number scalar overlay (outside `Int` | `Float` | `Decimal`)
7. Missing or invalid join realization when Resource `join` absent; undetermined/conflicting FK ownership (§4.3.1); join participant incompatibility (§4.3.2); missing local Resource Fields; attempted creation of new local FK scalar Fields; remote not the target instance-identity `@id`
8. Mapping / member / model collisions under §4.5 (including name collision or incompatible join/identity realization)
9. Missing in-unit Relation target
10. `multiplicity: "many"` with `nullable: true` (Prisma list relations cannot be optional). This is an **emission** failure only; RFC-015 still permits the Resource declaration.
11. Unilateral Resource Relation with `inverse` absent that would require a paired Prisma relation association (§5.3.9) — including cases where an unrelated in-unit Relation happens to target the same Resource and MUST NOT be inferred as the counterpart
12. `inverse` present but does not resolve to an in-unit Resource Relation
13. Relation/FK nullability inconsistency for FK-realized singular Relations
14. FK-realized `one ↔ one` (1:1) relation pair (§4.3.3) — uniqueness realization not in M4.3.2 surface
15. FK-realized `many ↔ many` relation pair (§4.3.3) — implicit m-n out of scope
16. Two distinct associations between the same Prisma model pair that require `@relation(name: ...)` disambiguation (§4.3.4), including self-relations that require disambiguation
17. Unit requires Prisma `@relation(name: ...)` disambiguators; M4.3.2 MUST NOT synthesize them from Resource names
18. Any other case where an Emit Model cannot be built such that the Emission Correspondence Invariant would hold, or such that successful `models` would not be representable as valid Prisma relation topology under §5.3.9
19. Partial emission presented as success
20. Emission applies a correspondence-relevant realization decision that cannot be represented in the verification-facing mapping (§4.7)

### 7.1 Explicit non-failures for M4.3.2

The following are **not** emission failures merely by themselves:

1. Absent preamble
2. Resource `CascadePolicy` / `fetch` not reflected as Prisma attributes
3. Host desire for unrequested conveniences that this RFC refuses to emit

## 8. Worked examples (informative)

### 8.1 Success: resourceField identity + declared join + paired inverse

```text
Unit:
  crm/Customer
    fields: [id:string, name:string]
    relations:
      orders → crm/Order many
      nullable: false
      inverse: customer

  crm/Order
    fields: [id:string, customerId:string]
    relations:
      customer → crm/Customer one
      nullable: false
      inverse: orders
      join: { local: customerId, remote: id }

Realization:
  Customer identity: resourceField(id)
  Order identity: resourceField(id)
  number overlays: none
  join overlays: none (Resource join present)

Result: success
  Order.customer is the FK-owning relation end because its Resource relation carries the join
  models include both Prisma relation ends (Customer.orders / Order.customer)
  Order.customer uses fields/references from join participants (local customerId → remote Customer id @id)
  dmmf derived from same Emit Model; verifyPrismaCorrespondence succeeds
```

### 8.2 Success: prismaExtra identity

```text
Unit:
  crm/Customer { fields: [email:string] }

Realization:
  Customer identity: prismaExtra { name: "rfId", scalar: String, default: cuid }

Result: success
  models include rfId String @id @default(cuid()) plus email
  dmmf includes rfId; verify ignores it as allowed host extra for Resource-covered correspondence
```

### 8.3 Failure: missing join overlay

```text
Relation orders: many, join absent, no host join overlay
→ fail closed (cannot invent FK names)
```

### 8.4 Failure: join overlay names a non-existent Field

```text
join overlay local: customerId, but Order has no Field customerId
→ fail closed (join MUST NOT create new FK Fields)
```

### 8.5 Failure: number override outside allow-list

```text
Field amount: number with overlay DateTime
→ fail closed
```

### 8.6 Failure: prismaExtra unsupported `@id` scalar

```text
prismaExtra { name: "rfId", scalar: Float }
→ fail closed (prismaExtra @id only String|Int; Float/Decimal invalid as @id)

prismaExtra { name: "rfId", scalar: Decimal }
→ fail closed

prismaExtra { name: "rfId", scalar: BigInt }
→ fail closed
```

### 8.7 Failure: many + nullable:true

```text
Relation tags: many, nullable: true
→ fail closed (Prisma list relations are not optional; RFC-015 declaration remains valid Resource)
```

### 8.8 Failure: unilateral Resource Relation (`inverse` absent)

```text
Relation customer: one, inverse absent
Prisma requires a paired counterpart relation field
→ fail closed (§5.3.9; non-pairable without inverse; no invented inverse)
```

### 8.8b Failure: unilateral + coincidental target-side Relation (no inference)

```text
A.b → B one, inverse absent
B.aLike → A one, inverse absent   // unrelated; does not declare inverse: b
→ fail closed
  emitter MUST NOT infer B.aLike as A.b's Prisma counterpart
  counterpart correspondence requires explicit Resource inverse
```

### 8.9 Failure: FK-realized 1:1 (no uniqueness surface)

```text
User.profile → Profile one
Profile.user → User one
join present / overlay present
→ fail closed (§4.3.3; Prisma 1:1 requires @unique; M4.3.2 does not invent uniqueness)
```

### 8.10 Failure: many ↔ many

```text
A.bs → B many; B.as → A many
→ fail closed (§4.3.3; no implicit m-n)
```

## 9. Rationale

1. **`models` primary / `dmmf` derived** preserves a single semantic source and avoids dual SDL/DMMF generation contracts that would need yet another correspondence specification. `dmmf` is package-defined DMMF-shaped evidence for RFC-033, not Prisma-internal DMMF.
2. **Emit beside verify** keeps capabilities independently useful while locking composability via the Emission Correspondence Invariant.
3. **Explicit instance-identity mapping** realizes Prisma `@id` without violating RFC-028’s denial of a Resource PK surface.
4. **Discriminated `resourceField` | `prismaExtra`** covers common schemas without silent conventions or package-invented surrogates.
5. **`prismaExtra` `@id` scalars limited to `String|Int`** match Prisma single-field `@id` constraints; `Float`/`Decimal` remain available for ordinary Fields via §4.2, not as identity.
6. **Structured identity defaults** avoid arbitrary Prisma expression text while remaining emit-time checkable without Prisma CLI/engine parsing.
7. **`number` → `Float` with narrow overlay** keeps emission deterministic while staying inside RFC-033’s verify allow-list.
8. **Host join overlay when `join` absent**, **FK-owning ownership (§4.3.1)**, and **participant/reference compatibility (§4.3.2)** keep FK realization deterministic without inventing Fields, uniqueness, or second FK mappings.
9. **Topology matrix (§4.3.3)** makes 1:n/n:1 allowed and 1:1 / m:n fail-closed under the locked uniqueness/m-n surface.
10. **No cascade→referential-action mapping** preserves Honor≠implement (RFC-026 / RFC-028).
11. **Unilateral Resource topology vs Prisma two-ended relations** treats `inverse` absent as **non-pairable**: fail closed rather than invent or infer a counterpart from unrelated in-unit Relations; successful paired output must remain valid Prisma topology.
12. **`many + nullable:true` fail-closed** preserves RFC-015 Resource validity while refusing invalid Prisma list optionality (`Target[]?`).
13. **`resourceField` identity requires `nullable: false` and resolved Prisma `String|Int`** so `@id` cannot contradict Field nullability or emit invalid `@id` scalars (e.g. default `number`→`Float`).
14. **Provider-neutral emission** validates provider-independent schema-level semantics and leaves provider-specific rejection to host composition / Prisma validation.
15. **Split artifact with optional preamble** separates schema realization from host environment configuration.
16. **Forbidding synthesized `@relation(name: ...)`** (including deriving it from Resource Relation names) prevents a second, under-specified naming axis; same-model associations requiring disambiguation fail closed (§4.3.4).
17. **Fail closed + empty-unit rejection** keeps “successful emission” meaningful under the invariant.

## 10. Relationships / traceability

| Dependency | Relationship |
| --- | --- |
| RFC-001 Identity | Consumed — type identity → Prisma model identity |
| RFC-005 Resource model | Consumed — `Resource`, `validateResource` |
| RFC-007 Resource Fields | Consumed — Field structure / ordered fields |
| RFC-009 Resource Field Types | Consumed — `string` / `number` / `boolean` |
| RFC-014 Field Nullability | Consumed — Field `nullable` → Prisma scalar nullability |
| RFC-013 Optionality | Relied on — Field/Relation `optional` **not** encoded in Prisma schema emission |
| RFC-008 Resource Relations | Consumed — Relation collection / association members |
| RFC-010 Relation Association | Consumed — `target` |
| RFC-011 Relation Multiplicity | Consumed — `"one"` \| `"many"` shape |
| RFC-015 Relation Nullability | Consumed — association-reference `nullable`; `many + nullable` remains a valid Resource declaration and is unrealizable under this RFC’s Prisma emission rules (§5.3.5 and §7 item 10) |
| RFC-024 Direction / Joins | Consumed — `inverse` / `join` as emission inputs; `direction` validated as Resource topology only and does **not** independently determine Prisma FK ownership (§4.3.1 item 7); join overlay does not amend RFC-024 |
| RFC-026 Cascade | **Fenced** — policies exist; not realized as Prisma `onDelete`/`onUpdate` |
| RFC-027 Fetch | **Fenced** — not realized |
| RFC-028 Persistence correspondence | **Consumed** — Resource-authoritative, one-way, total for declared members; no Resource PK surface added |
| RFC-031 Nest host | **Closed / independent** |
| RFC-032 GraphQL translation | **Closed / independent** |
| RFC-033 Prisma correspondence verification | **Consumed / composed** — Emission Correspondence Invariant targets `verifyPrismaCorrespondence` without changing its semantics |
| M3 milestone | **Closed** — RFC-034 does not reopen M3 or RFC-005–030 |

## 11. Acceptance criteria (for this specification)

This RFC may move from Draft to Accepted when Design Review finds:

1. The package boundary is clear: `@resource-forge/prisma` depends on core only; core has no Prisma concerns; Nest/GraphQL are independent.
2. `models` is the normative product (**semantics** locked; serialization form not locked); `dmmf` is derived from the **same Emit Model semantics** solely for the Emission Correspondence Invariant and composition with `verifyPrismaCorrespondence`; `preamble` is optional host composition only and does not affect correspondence.
3. Realization mappings lock required Prisma instance identity (`resourceField` with `nullable: false` and resolved Prisma scalar ∈ `{String,Int}` | `prismaExtra` with `prismaExtra.scalar ∈ {String,Int}`), structured identity defaults (`cuid`/`uuid`/`autoincrement`), `number` → `Float` with per-Field `Int|Float|Decimal` overlay, FK-owning join ownership (§4.3.1), join participant/reference compatibility (§4.3.2) **without creating new local FK Fields** and with remote limited to target instance-identity `@id`, and the relation-pair topology matrix (§4.3.3) including **1:1 and m:n fail-closed**.
4. Field/Relation emission rules lock scalar defaults/allow-lists, nullable-only Field encoding, `many + nullable:true` fail-closed, join identity-before-name ordering, unilateral Resource topology vs Prisma two-ended representation (**`inverse` absent ⇒ non-pairable; no invented or inferred counterpart**; successful paired output valid Prisma topology), no cascade/`fetch` emit, no implicit m-n, no synthesizing `@relation(name: ...)` from Resource names (including same-model disambiguation failures per §4.3.4), and no unrequested extras (sole exception: declared `prismaExtra` identity).
5. Emission Correspondence Invariant is normative (same emitted model semantics per §2 + verify success for §4.7 verification-facing mapping; not a required internal verify call). Package-defined DMMF-shaped `dmmf` is sufficient; Prisma-internal DMMF identity is not required.
6. Fail-closed catalog and empty-unit rule are normative; absent preamble is not a failure; §4.7 correspondence-relevant decisions cannot be emit-only; provider-specific validity is host-owned (§4.6).
7. Explicit deferrals fence M4.3.3, cascade realization, reverse generation, Nest/GraphQL composition, public Emit Model API, implicit m-n, 1:1 uniqueness realization, custom relation disambiguators, and expanded identity scalar/default vocabularies.
8. This specification does not prescribe implementation task lists, milestones, or execution sequencing (those belong to M4 after Accept).
9. FK-realized terminology, `prismaExtra`-only remote join exception, and deterministic unilateral non-pairing (§5.3.9) are normative.
10. Design Review confirms the following Prisma-validity cases are locked by the specification (implementation planning MUST cover them with tests):
    1. `resourceField` identity (`String`/`Int`) → valid Prisma `@id`
    2. `prismaExtra String` identity → valid Prisma `@id`
    3. `prismaExtra Int` identity → valid Prisma `@id`
    4. `prismaExtra Float` → fail
    5. `prismaExtra Decimal` → fail
    6. `resourceField` on `number` without `Int` overlay (defaults to `Float`) → fail as identity
    7. 1:n FK relation → success (when join/ownership rules satisfied)
    8. optional/nullable 1:n FK (`one` + `nullable: true`) → success when FK nullability consistent
    9. 1:1 FK relation → fail (no uniqueness surface)
    10. m:n → fail
    11. unilateral relation with `inverse` absent → fail whenever Prisma relation topology would require a second relation field; no existing in-unit Relation may be inferred as the counterpart
    12. unilateral `A.b → B` plus unrelated `B.aLike → A` (both `inverse` absent) → fail; emitter MUST NOT infer `B.aLike` as `A.b`'s counterpart
    13. two same-model relations requiring `@relation(name: ...)` → fail
    14. self-relation requiring disambiguation → fail
    15. Resource join against non-ID remote Field → fail
    16. `prismaExtra` remote overlay → success
    17. absent join + absent overlay → fail

## 12. Explicit deferrals / follow-ons

| Topic | Disposition |
| --- | --- |
| M4.3.3 Prisma Client / persistence runtime | Future RFC / later M4.3 slice |
| CascadePolicy → Prisma referential actions | Future realization RFC |
| `fetch` / include realization | Future RFC |
| Implicit many-to-many realization mode | Separate Accepted design if required |
| FK-realized 1:1 / uniqueness (`@unique`) realization | Future constraint/index realization RFC; **fail closed in M4.3.2** |
| Prisma → Resource generation / bijection | Separate capability RFC if required |
| Public `buildPrismaEmitModel` | Only if later evidence justifies |
| Nest↔Prisma / GraphQL↔Prisma composition | Future RFC if required |
| `@map` / `@@map` as correspondence identities | Remains forbidden |
| Custom Prisma `@relation(name: ...)` disambiguators | Future realization mapping if required |
| Expanded `prismaExtra` `@id` scalars beyond `String` \| `Int` | Future Accepted realization change |
| Provider-constrained emission (e.g. MongoDB vs Decimal) | Future realization mapping if required; host-owned in M4.3.2 |
| Arbitrary / raw Prisma `@default` expression text | Out of scope; forbidden in M4.3.2 |
| Metadata / Operations / constraint→index emit | Future RFCs; do not reopen M3 |
| Host-configurable global emitter defaults beyond locked overlays | Forbidden in M4.3.2 |
| Concrete `models` serialization form (SDL string vs AST) | Implementation planning after Accept |
| Exact Prisma-internal DMMF isomorphism | Not required; package-defined DMMF-shaped evidence only |

## 13. Document status

**Status: Accepted.** Authoritative for M4.3.2 Prisma schema realization semantics. Do not begin M6 implementation until an Accepted implementation plan exists for `#115`. Prefer one pull request per tracking issue for the eventual delivery slice after Accept.
