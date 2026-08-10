# M4.3.1 Prisma Correspondence Verification — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD. Implement **only** Accepted RFC-033 Prisma correspondence verification in `@resource-forge/prisma`. Do **not** change `@resource-forge/core` product semantics. Do **not** depend on `@resource-forge/nest` or `@resource-forge/graphql`. Do **not** emit Prisma schema, use Prisma Client, access a database, generate Resources from DMMF, realize cascade/fetch, or invent bijection/strict modes. Do **not** reopen RFC-005–RFC-032 / M3. Preserve: Resource-authoritative one-way correspondence; DMMF-in public API; host mapping + identity-preserving defaults; injective Field∪Relation post-resolution mapping; Resource-covered only; fixed scalar allow-lists; nullable-only (optional not schema-encoded); Relation in-unit closure; multiplicity singular/list + owner-side ordered join evidence when `join` present; structured CorrespondenceReport; fail-closed atomic verification order per RFC-033 §6.1.

**Status:** Accepted  
**M5:** Accepted (2026-08-10) — Plan Review re-entry; no plan blockers after prior return closures (orchestration §6.1 + normalize after 1–3; relation vs scalar nullCapable; owner-side ordered join from/to; direction same topology / no Prisma axis; Field∪Relation collisions; public DMMF vs internal graph) and two polish locks: (1) behavioral reject of `ConsumedModelGraph`-shaped public input as `unusable_dmmf`; (2) direction tests assert same Prisma evidence for outbound/inbound, not “ignored.” Core untouched; Nest/GraphQL/Client/schema-emit/reverse/cascade/fetch fenced. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#112](https://github.com/rexescario-dev/resource-forge/issues/112)  
**Source RFC:** [RFC-033 Prisma Correspondence Verification](../specs/2026-08-10-rfc-033-prisma-correspondence-verification-design.md) (**Accepted**)  
**Depends on:** RFC-001 / RFC-005 / RFC-007 / RFC-008 / RFC-009 / RFC-010 / RFC-011 / RFC-013 / RFC-014 / RFC-015 / RFC-024 / RFC-028 (**Accepted**); RFC-031 / RFC-032 (**Accepted**; closed/independent); RFC-033 (**Accepted**); M3 Resource model Done; M4.1 Nest and M4.2 GraphQL Slice complete (independent)  
**Package:** `@resource-forge/prisma` (consumes `@resource-forge/core`; package-local consumed model-graph view; **no** Prisma Client; **no** required `@prisma/internals` public runtime contract)  
**Slice:** M4.3.1 only — Resource → existing Prisma DMMF correspondence verification  
**Goal:** Deliver `@resource-forge/prisma` so a host can verify that a validated Resource unit is realizable by an existing Prisma DMMF/model graph under RFC-033 fail-closed rules—without putting Prisma concerns into core and without schema emission or Client runtime.

**Architecture:**

```text
RFC-033 (Accepted)
└── Resource-authoritative Prisma correspondence verification (no Nest/GraphQL)

@resource-forge/prisma
├── normalizeDmmf (internal) → ConsumedModelGraph
├── host mapping resolve (defaults + injectivity; Field∪Relation name collision)
├── field / relation topology verifiers
└── verifyPrismaCorrespondence(resources, dmmf, mapping?)  ← public DMMF only

packages/core — consumed only; no product-surface change in this slice
packages/nest, packages/graphql — untouched; no dependency
```

**Tech Stack:** TypeScript strict, Vitest, existing `@resource-forge/core` APIs (`createResourceIdentity`, `validateResource`, `emptyAnnotations`, Field/Relation members, `Result` / `ok` / `err`). Hand-built **DMMF-shaped** fixtures for public API tests; unit tests for `normalizeDmmf` may feed the same fixtures.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-033 Accepted (#112)
       ↓
M4.3.1 plan Draft → M5 Plan Review → **Accepted** (#112)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M10 as applicable + Slice Completion Report
       ↓
one delivery PR for tracking #112 containing Accepted RFC (if not already on main) + Accepted plan + implementation + SCR
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M4.3.1 delivery slice. Do **not** open a separate plan-only merge PR as a required gate. M6 treats Accepted RFC-033 text as authoritative for semantics.

**Task checkboxes:** Completed during **M6 execution** only. Leave unchecked until M6 runs.

---

## Locked decisions (planning aids — not new product semantics)

| Decision | Lock |
| --- | --- |
| Product semantics owner | RFC-033 Accepted text only |
| Package | `@resource-forge/prisma` only |
| Core product changes | **Forbidden** in this delivery diff |
| Nest / GraphQL package deps | **Forbidden** |
| Prisma Client / DB I/O | **Forbidden** |
| Schema emission / Prisma→Resource generation | **Forbidden** |
| Cascade / fetch verification | **Out of scope** (RFC-033 §1.2 / §12) |
| **Public** Prisma input | Host-supplied **DMMF / DMMF-shaped document** only (RFC-033 §4.4 / §6). `verifyPrismaCorrespondence`’s second parameter is **not** `ConsumedModelGraph` |
| **Internal** representation | Package-local `ConsumedModelGraph` produced only by internal `normalizeDmmf`; not a public substitute input |
| `@prisma/internals` | **Not** a required runtime dependency; do not elevate into public contract |
| Public entry | Planning name `verifyPrismaCorrespondence(resources, dmmf, mapping?) → Result<CorrespondenceReport, CorrespondenceError>` — roles per RFC-033 §6 |
| Mapping defaults | `ResourceIdentity.name` → model; `Field.name` / `Relation.name` → field/relation (schema-level) |
| Mapping injectivity | Post-resolution injective for Resource→model **and** for **all Resource members** (Fields ∪ Relations) → Prisma field/relation **names** on that model. Two members resolving to the same Prisma name collide **even if** one is Field and one is Relation |
| Field types | `string`→`String`; `boolean`→`Boolean`; `number`→`Int`\|`Float`\|`Decimal` only |
| Scalar `nullCapable` | `!isRequired` on the scalar field; missing/ambiguous requiredness → `unusable_dmmf` |
| Relation `nullCapable` | See §“Relation nullability evidence” below — **not** silently identical to scalar without stating relation-field requiredness |
| Nullability check | Resource `nullable` ↔ null-capable/non-null only; `optional` never checked from DMMF requiredness |
| Relation targets | In-unit closure; cycles allowed |
| Multiplicity | `"one"` ⇒ singular; `"many"` ⇒ list |
| Join absent | Shape + target/nullability/direction/inverse only; implicit m-n OK for `"many"` |
| Join present | See §“Join / FK comparison rule” below (owner-side ordered from/to) |
| Direction | See §“Direction realization” below — no extra DMMF direction attribute |
| Inverse | Target Resource Relation → mapped Prisma relation field on target model; absence fails closed |
| Report | Must list every successful Resource-covered resource/field/relation correspondence; no bare boolean |
| Verification order | **Exactly** RFC-033 §6.1 (quoted below); DMMF normalize is a planning sub-step **after** stages 1–3 and **before** stage 4 |
| Empty unit | Fail closed |

### Verification order (RFC-033 §6.1 — authoritative)

Quote from Accepted RFC-033:

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

**Planning placement of `normalizeDmmf` (non-normative file/layout; order is normative):**

```text
1–3 as above
       ↓
normalizeDmmf(dmmf) → ConsumedModelGraph | unusable_dmmf   ← after Resource validation + mapping
       ↓
4–8 as above (consume internal graph only)
```

MUST NOT normalize before stage 2. Invalid Resources fail closed even when DMMF is also malformed. MUST NOT accept `ConsumedModelGraph` as the public second argument.

### Relation nullability evidence (planning lock implementing RFC-033 §5.4.3)

| Field kind | How `nullCapable` is established | Failure |
| --- | --- | --- |
| Scalar | DMMF/model-graph scalar field exposes requiredness; `nullCapable = !isRequired` | Missing/ambiguous requiredness → `unusable_dmmf` |
| Relation | DMMF/model-graph **relation field** exposes requiredness of the **relation value itself** (whether the association slot can be null — e.g. Prisma `Customer?` vs `Customer`, or `Order[]?` vs `Order[]`). `nullCapable = !isRequired` on that relation field. Element nullability inside lists is **out of scope** | Missing/ambiguous relation requiredness → `unusable_dmmf` |

Resource `nullable` then compares only against that `nullCapable` bit. Resource `optional` is never derived from `isRequired`.

### Join / FK comparison rule (planning lock implementing RFC-033 §5.4.5)

RFC-024: `join.local` is a Field on the **owning** Resource; `join.remote` is a Field on the **target** Resource; shape is not direction-dependent.

When Resource `join` is present on owner Relation R:

1. Resolve mapped Prisma schema names: `L = map(join.local)`, `Rem = map(join.remote)`.
2. Locate the owning Resource’s mapped Prisma **relation** field `Rel` on the owner model.
3. Require **owner-side FK placement** on `Rel`:
   - `Rel.relationFromFields` MUST be an ordered sequence of length **1** equal to `[L]`;
   - `Rel.relationToFields` MUST be an ordered sequence of length **1** equal to `[Rem]`.
4. Ordering matters (exact sequence equality). Unordered set equality is **forbidden**. Swapping from/to is **forbidden**.
5. If `relationFromFields` / `relationToFields` are missing, empty, length ≠ 1, or values differ → `join_unrealized`.
6. Do **not** search the opposite model to “fix” FK placement when owner-side from/to are empty (implicit m-n / opposite-side FK cannot satisfy a declared `join` under this slice).
7. `@map` / `@@map` DB names are irrelevant; compare schema-level field names only.

### Direction realization (planning lock implementing RFC-033 §5.4.4)

RFC-024 `direction` (`outbound` \| `inbound`) is **consumed** (present on every Relation) but does **not** require additional Prisma/DMMF evidence beyond the owner/target topology already verified:

- mapped Prisma relation field exists on the **owning** Resource’s model;
- that relation’s target model is the mapped model of Relation.`target`.

Both `outbound` and `inbound` use **the same** Prisma evidence. There is no Prisma direction attribute. Direction is **not ignored** — it has **no additional Prisma-side realization consequence** beyond that shared topology check. Inverse counterpart presence remains separate (§5.4.4 inverse → mapped Prisma relation field on target model).

### Public DMMF boundary (behavioral)

```text
verifyPrismaCorrespondence(resources, dmmf, mapping?)
        ↓
normalizeDmmf(dmmf)   // requires DMMF-shaped datamodel.models[] (or equivalent)
        ↓
ConsumedModelGraph (internal only)
```

- MUST NOT expose an overload `verifyPrismaCorrespondence(resources, ConsumedModelGraph)`.
- A `ConsumedModelGraph`-shaped object passed as the public `dmmf` argument MUST fail as `unusable_dmmf` (missing DMMF-shaped `datamodel.models[]` / equivalent), not succeed by treating the internal graph as already normalized.
- Tests MUST assert that behavioral rejection (Task 6).

---

## Goal / non-goals of this plan

### In scope

1. Package wiring: keep `@resource-forge/core`; forbid nest/graphql/prisma-client deps; update README from placeholder.
2. Consumed model-graph types + DMMF normalize adapter preserving §4.4 evidence.
3. Host mapping resolution with identity-preserving defaults and injectivity/collision failures.
4. Field verification (scalar existence, allow-list, nullable-only).
5. Relation verification (in-unit target, multiplicity, nullable-only, direction/inverse, join evidence when present).
6. Atomic `verifyPrismaCorrespondence` per §6.1 order with structured `CorrespondenceReport`.
7. Vitest coverage for success + fail-closed matrix.
8. Package README + Slice Completion Report; roadmap/index consistency for M4.3.1 delivery (correct stale “Prisma→Resource” wording).

### Out of scope (plan non-goals)

1. Any `@resource-forge/core` semantic/API change.
2. Nest or GraphQL package work / dependencies.
3. Prisma schema generation (M4.3.2).
4. Prisma Client persistence bindings (M4.3.3).
5. Prisma→Resource generation.
6. Cascade / fetch honor checks.
7. Bijection / no-extras modes; host-configurable type allow-lists.
8. Parsing `schema.prisma` as a public API.

---

## Constraints (SHALL / SHALL NOT)

Derived only from Accepted RFC-033:

1. SHALL place product surface in `@resource-forge/prisma` (RFC-033 §3).
2. SHALL depend on `@resource-forge/core`; core MUST NOT depend on Prisma (RFC-033 §3).
3. SHALL NOT depend on `@resource-forge/nest` or `@resource-forge/graphql` (RFC-033 §3).
4. SHALL NOT require Prisma Client or database access (RFC-033 §3 / §4.4).
5. SHALL use Resource `identity` + `schema.fields` + `schema.relations` as structural authority; Operations and metadata inert (RFC-033 §4.1).
6. SHALL `validateResource` every Resource before correspondence checks (RFC-033 §4.2 / §6.1).
7. SHALL fail closed on empty units (RFC-033 §4.3).
8. SHALL consume DMMF with normative §4.4 evidence; missing evidence fails closed (RFC-033 §4.4).
9. SHALL apply host mapping with identity-preserving defaults; injective post-resolution; `@map`/`@@map` not correspondence names (RFC-033 §4.5).
10. SHALL verify Resource-covered only; Prisma extras allowed (RFC-033 §5.1).
11. SHALL enforce Field scalar allow-lists and nullable-only rules; MUST NOT encode `optional` (RFC-033 §5.3).
12. SHALL enforce Relation in-unit closure, singular/list multiplicity, nullable-only, direction/inverse, and join evidence when `join` present (RFC-033 §5.4).
13. SHALL emit structured `CorrespondenceReport` on success; atomic fail-closed otherwise (RFC-033 §6–§7).
14. SHALL follow normative verification order (RFC-033 §6.1).
15. SHALL NOT reopen M3 / RFC-005–032 / cascade / fetch / schema emit / reverse generation (RFC-033 §1.2 / §12).

---

## Ownership boundaries

| Area | Role |
| --- | --- |
| `docs/superpowers/specs/2026-08-10-rfc-033-prisma-correspondence-verification-design.md` | Authoritative Accepted semantics — do not redesign |
| `packages/prisma/**` | Implementation ownership |
| `packages/prisma/package.json` | `core` only; no nest/graphql/prisma-client |
| `packages/core/**` | **Must remain untouched** in this delivery diff |
| `packages/nest/**`, `packages/graphql/**` | Untouched |
| `docs/roadmap.md`, specs index, this plan + SCR, `packages/prisma/README.md` | Docs/process closeout for the slice |

---

## Contract inventory (planning surface names)

Exact export spellings are planning aids; roles are normative per RFC-033.

| Surface | Role | RFC-033 |
| --- | --- | --- |
| `verifyPrismaCorrespondence` | Atomic verification entry; **public args: resources + DMMF (+ optional mapping)** | §6–§7 |
| `ConsumedModelGraph` | **Internal** §4.4 evidence view only | §4.4 |
| `normalizeDmmf` / `fromPrismaDmmf` (planning name) | **Internal** DMMF → consumed graph; fail if evidence missing | §4.4 |
| `PrismaResourceMapping` (optional input) | Host overrides for model/field/relation schema names | §4.5 |
| `resolveCorrespondenceMapping` (internal) | Defaults + injectivity (Field∪Relation name space) | §4.5 |
| `CorrespondenceReport` | resources[] / fields[] / relations[] evidence | §6 |
| `CorrespondenceError` | Fail-closed cause | §6–§7 |

**Forbidden public surface:** exporting `verifyPrismaCorrespondence(resources, ConsumedModelGraph)` as the primary API, or accepting the internal graph as a substitute for DMMF without going through normalize.

**Deferred / not authorized:** schema emit; Client; Nest/GraphQL glue; cascade/fetch; Prisma→Resource; bijection mode.

---

## Correspondence report inventory (minimum)

```text
CorrespondenceReport
├── resources: Array<{ resourceIdentity, prismaModelName }>
├── fields: Array<{ resourceIdentity, fieldName, prismaFieldName, prismaScalarType }>
└── relations: Array<{ resourceIdentity, relationName, prismaRelationName, targetIdentity, prismaTargetModelName, multiplicity }>
```

Exact TypeScript property names are planning aids. Every successful Resource-covered member MUST appear.

---

## Consumed model-graph inventory (internal planning)

```text
ConsumedModelGraph
└── models: Map<modelName, ConsumedModel>

ConsumedModel
├── name
└── fields: Map<fieldName, ConsumedField>

ConsumedField (discriminated)
├── kind: 'scalar'
│     type: 'String' | 'Int' | 'Float' | 'Decimal' | 'Boolean' | 'DateTime' | 'Json' | 'Bytes' | 'BigInt' | 'Enum' | 'Unsupported' | …
│     nullCapable: boolean    // !isRequired; missing isRequired → normalize fail
└── kind: 'relation'
      list: boolean
      nullCapable: boolean    // !isRequired on the relation field itself; missing → normalize fail
      targetModelName: string
      relationFromFields: readonly string[]   // ordered; owner-side association scalars
      relationToFields: readonly string[]     // ordered; target-side association scalars
```

Normalize from DMMF-shaped objects using Prisma’s usual `datamodel.models[].fields[]` shapes (`isList`, `isRequired`, kind/type, `relationFromFields`, `relationToFields`). Apply the scalar vs relation `nullCapable` rules in the Locked decisions section. Never map `isRequired` to Resource `optional`.

---

## File structure (planning)

| Path | Responsibility |
| --- | --- |
| `packages/prisma/package.json` | Keep `core`; forbid nest/graphql/client deps |
| `packages/prisma/src/model-graph.ts` | `ConsumedModelGraph` types + `normalizeDmmf` |
| `packages/prisma/src/model-graph.test.ts` | Normalize / missing-evidence failures |
| `packages/prisma/src/mapping.ts` | Defaults + injectivity resolution |
| `packages/prisma/src/mapping.test.ts` | Defaults, overrides, collisions, namespace clash |
| `packages/prisma/src/fields.ts` | Field scalar/nullable verification |
| `packages/prisma/src/fields.test.ts` | Allow-list + nullable matrix |
| `packages/prisma/src/relations.ts` | Target closure, multiplicity, nullable, direction/inverse, join |
| `packages/prisma/src/relations.test.ts` | Topology + join evidence matrix |
| `packages/prisma/src/verify.ts` | `verifyPrismaCorrespondence` orchestration (§6.1) |
| `packages/prisma/src/verify.test.ts` | End-to-end success + §7 failure matrix |
| `packages/prisma/src/errors.ts` | Local error codes/shapes (planning aid) |
| `packages/prisma/src/report.ts` | `CorrespondenceReport` types/builders |
| `packages/prisma/src/test-fixtures.ts` | Resource + DMMF/model-graph fixtures (exclude from emit if needed) |
| `packages/prisma/src/index.ts` | Public exports |
| `packages/prisma/src/index.test.ts` | Public export smoke |
| `packages/prisma/README.md` | Usage aligned with RFC-033 (replace placeholder) |
| `packages/prisma/tsconfig.json` | Exclude test fixtures from emit if mirrored from graphql |

---

## Slice sequence

```text
Slice A — Package boundary + errors/report types + fixtures scaffolding
Slice B — Consumed model-graph + DMMF normalize (unit TDD)
Slice C — Host mapping resolve + injectivity (unit TDD)
Slice D — Field verification (unit TDD)
Slice E — Relation topology + join evidence (unit TDD)
Slice F — verifyPrismaCorrespondence orchestration (§6.1) (integration TDD)
Slice G — README + roadmap/SCR + public exports closeout
```

Hard prerequisites: B before D/E/F; C before F; D+E before F complete success path; A first.

---

## TDD / verification strategy

| Slice | Failing tests first | Observable behavior |
| --- | --- | --- |
| B | Normalize missing models/fields/relation refs | Fail closed vs usable `ConsumedModelGraph` |
| C | Two namespaces → same model name under defaults | Mapping collision error |
| D | `number`→`DateTime`; `nullable=false`→null-capable scalar | Field fail codes |
| E | Missing target in unit; `"one"`→list; join refs mismatch | Relation fail codes |
| F | Empty unit; invalid Resource; success with Prisma extras; full report membership | Atomic Result + report inventory |
| G | README/export smoke | Docs + exports |

Commands (M6):

```bash
pnpm --filter @resource-forge/prisma test
pnpm --filter @resource-forge/prisma typecheck
pnpm --filter @resource-forge/prisma lint
```

Assert delivery diff does not touch `packages/core/**`. Assert `package.json` has no nest/graphql/`@prisma/client` dependencies.

---

## Task breakdown

### Task 1: Package scaffolding + error/report types (Slice A)

**Files:**
- Modify: `packages/prisma/src/errors.ts` (create), `packages/prisma/src/report.ts` (create), `packages/prisma/src/test-fixtures.ts` (create), `packages/prisma/tsconfig.json` (exclude fixtures if needed)
- Modify: `packages/prisma/src/index.ts` (export stubs as they land)
- Test: `packages/prisma/src/index.test.ts` (keep smoke)

- [ ] **Step 1:** Add `CorrespondenceError` / `correspondenceError(code, message, cause?)` with planning codes covering RFC-033 §7 classes (`empty_verification_unit`, `invalid_resource`, `mapping_collision`, `missing_model`, `missing_scalar_field`, `incompatible_scalar_type`, `incompatible_nullability`, `missing_relation_target`, `missing_relation_field`, `multiplicity_mismatch`, `inverse_unrealized`, `join_unrealized`, `unusable_dmmf`, …).
- [ ] **Step 2:** Add `CorrespondenceReport` types matching report inventory.
- [ ] **Step 3:** Add `test-fixtures.ts` mirroring graphql helper style (`requireIdentity`, `field`, `relation`, `requireResource`) plus builders for minimal DMMF-like JSON / `ConsumedModelGraph`.
- [ ] **Step 4:** Exclude `test-fixtures.ts` from `tsconfig` emit if required (follow graphql package pattern).
- [ ] **Step 5:** Confirm `package.json` deps remain `@resource-forge/core` only; run existing smoke tests.

**Trace:** RFC-033 §6–§7.

---

### Task 2: Consumed model-graph + normalize (Slice B)

**Files:**
- Create: `packages/prisma/src/model-graph.ts`, `packages/prisma/src/model-graph.test.ts`

- [ ] **Step 1:** Write failing tests: valid minimal DMMF-shaped fixture → graph with scalar + relation fields and distinct scalar/relation `nullCapable`; missing models array → `unusable_dmmf`; relation field without target model name → `unusable_dmmf`; scalar/relation missing `isRequired` → `unusable_dmmf`.
- [ ] **Step 2:** Implement **internal** `ConsumedModelGraph` types + `normalizeDmmf(input: unknown): Result<ConsumedModelGraph, CorrespondenceError>` extracting §4.4 evidence. Apply scalar vs relation `nullCapable` rules from Locked decisions.
- [ ] **Step 3:** Run tests green. Do **not** export `normalizeDmmf` as the public verification entry (may export type-only helpers only if needed; public verify still takes DMMF).
- [ ] **Step 4:** Commit planning-aid message when M6 runs (e.g. `feat(prisma): add consumed model-graph normalize`).

**Trace:** RFC-033 §4.4.

---

### Task 3: Host mapping resolution (Slice C)

**Files:**
- Create: `packages/prisma/src/mapping.ts`, `packages/prisma/src/mapping.test.ts`

- [ ] **Step 1:** Write failing tests:
  - defaults: `crm/Customer` → model `Customer`; field `name` → `name`;
  - override model/field/relation names succeed;
  - `foo/Customer` + `bar/Customer` defaults → collision;
  - two Fields mapping to same Prisma field → collision;
  - Field `foo` + Relation `foo` on same Resource (defaults) → **collision** (unified member name injectivity);
  - empty/ambiguous mapping entry → fail.
- [ ] **Step 2:** Implement `resolveCorrespondenceMapping(resources, mapping?): Result<ResolvedMapping, CorrespondenceError>` with injectivity over Resource→model and over **Fields ∪ Relations → Prisma names** per Resource (RFC-033 §4.5 + M5 lock).
- [ ] **Step 3:** Run tests green.

**Trace:** RFC-033 §4.5.

---

### Task 4: Field verification (Slice D)

**Files:**
- Create: `packages/prisma/src/fields.ts`, `packages/prisma/src/fields.test.ts`

- [ ] **Step 1:** Write failing tests for allow-list (`string`/`boolean`/`number` successes; `DateTime`/`Json`/`enum` failures); missing scalar; Field mapped to relation field fails; `nullable=false` vs null-capable fails; `nullable=true` requires null-capable; `optional=true,nullable=false` with non-null Prisma scalar **succeeds** (optional ignored).
- [ ] **Step 2:** Implement `verifyFields(...)` producing field report entries or error.
- [ ] **Step 3:** Run tests green.

**Trace:** RFC-033 §5.3.

---

### Task 5: Relation topology + join (Slice E)

**Files:**
- Create: `packages/prisma/src/relations.ts`, `packages/prisma/src/relations.test.ts`

- [ ] **Step 1:** Write failing tests:
  - missing target Resource in unit → fail;
  - cycle Customer↔Order in-unit → success path for targets;
  - `"one"` vs list / `"many"` vs singular → fail;
  - `inverse` present but mapped counterpart Prisma relation missing on target model → fail;
  - both `direction: outbound` and `direction: inbound` succeed when the **same** Prisma evidence holds (owner mapped relation field exists and targets the mapped target model); no additional Prisma direction evidence is required or checked (direction is consumed, not ignored);
  - `join` absent + `"many"` + empty from/to (implicit m-n) → may succeed on shape;
  - `join` present with `relationFromFields=[mappedLocal]` and `relationToFields=[mappedRemote]` (ordered length 1) → success;
  - `join` present with swapped from/to → `join_unrealized`;
  - `join` present with empty from/to → `join_unrealized`;
  - `join` present with length > 1 from/to → `join_unrealized`;
  - relation nullable-only matrix using **relation-field** `nullCapable` (optional ignored).
- [ ] **Step 2:** Implement `verifyRelations(...)` using Locked decisions: Direction realization, Join / FK comparison rule, Relation nullability evidence, inverse → mapped target-model Prisma relation field.
- [ ] **Step 3:** Run tests green.

**Trace:** RFC-033 §5.4.

---

### Task 6: `verifyPrismaCorrespondence` orchestration (Slice F)

**Files:**
- Create: `packages/prisma/src/verify.ts`, `packages/prisma/src/verify.test.ts`
- Modify: `packages/prisma/src/index.ts` (export public API)

- [ ] **Step 1:** Write failing end-to-end tests for RFC-033 §6.1 order and §7 matrix:
  - empty unit;
  - invalid Resource fails **before** DMMF normalize matters (fixture: invalid Resource + malformed DMMF → `invalid_resource`, not only `unusable_dmmf`);
  - success with Prisma extras (`createdAt`, `AuditLog`) ignored;
  - success report contains every Resource/Field/Relation;
  - namespace collision under defaults;
  - Field+Relation same default name collision;
  - number→DateTime;
  - optional≠nullability collapse case from RFC §8.3;
  - missing target in unit even if Prisma model exists;
  - public `dmmf` argument that is a bare `ConsumedModelGraph`-shaped object (no DMMF-shaped `datamodel.models[]`) → `unusable_dmmf` (behavioral public/internal boundary; no ConsumedModelGraph overload).
- [ ] **Step 2:** Implement `verifyPrismaCorrespondence(resources, dmmf, mapping?)` with **exact** RFC-033 §6.1 stages; insert `normalizeDmmf` only after stages 1–3 succeed and before stage 4. `normalizeDmmf` MUST require DMMF-shaped `datamodel.models[]` (or equivalent) and MUST NOT accept an already-built internal graph as a shortcut. Short-circuit on first failure; never return partial success report.
- [ ] **Step 3:** Export from `index.ts` **only** the public verify entry (+ error/report types as needed). Do not make `ConsumedModelGraph` the public input type for verify. Update `index.test.ts` for export smoke of `verifyPrismaCorrespondence`.
- [ ] **Step 4:** Run full package test/typecheck/lint green.

**Trace:** RFC-033 §4–§8.

---

### Task 7: Docs + SCR closeout (Slice G)

**Files:**
- Modify: `packages/prisma/README.md`, `docs/roadmap.md`, this plan’s SCR section
- Modify: specs README already Accepted for RFC-033 — ensure consistent

- [ ] **Step 1:** Rewrite prisma README for verify usage, fail-closed summary, Resource→Prisma direction, Nest/GraphQL independence; remove “bridge Prisma models into Resource” placeholder wording.
- [ ] **Step 2:** Update roadmap M4 section: M4.3.1 correspondence verification ✅ language (and correct stale “map models to resources” bullet to Resource→Prisma verification).
- [ ] **Step 3:** Fill Slice Completion Report below during M6–M10; link delivery PR.
- [ ] **Step 4:** Confirm `packages/core` delivery diff empty; no nest/graphql/client deps.

**Trace:** RFC-033 §12 (docs closeout); process SCR.

---

## Traceability matrix

| RFC-033 section | Tasks |
| --- | --- |
| §3 Package boundary | 1, 6, 7 |
| §4.1–4.3 Authority / validation / unit | 6 |
| §4.4 Consumed evidence / DMMF | 2, 6 |
| §4.5 Host mapping | 3, 6 |
| §5.1–5.2 Coverage / models | 3, 6 |
| §5.3 Fields | 4, 6 |
| §5.4 Relations | 5, 6 |
| §6–§7 API / order / fail-closed | 1, 6 |
| §8 Examples | 6 tests |
| §12 Deferrals | 7 (docs only; no unauthorized work) |

---

## Execution / dependency risks (operational)

1. DMMF fixture shape drift across Prisma versions — mitigate by depending on **semantic** consumed graph + documenting the fixture subset; do not take `@prisma/internals` as public contract.
2. Join evidence requires owner-side ordered from/to length-1 match — Relations with `join` but FK only on the opposite Prisma model fail closed in M4.3.1 (no opposite-side inference).
3. Vitest/tinypool under sandbox — prefer `pnpm --filter @resource-forge/prisma test` with adequate permissions; CI is source of truth.
4. Stale README/roadmap “Prisma→Resource” wording — must be corrected in Task 7 so docs do not contradict Accepted RFC-033.

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M4.3.1 Prisma Correspondence Verification |
| Tracking | [#112](https://github.com/rexescario-dev/resource-forge/issues/112) |
| M4 | Implementation Plan: **Accepted** |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | **Approved** |
| M8 | **N/A** (no broad refactor pass required) |
| M9 | **Complete** (package README + roadmap indexing) |
| Branch | `feat/m4-3-prisma-correspondence` |
| PR | [#113](https://github.com/rexescario-dev/resource-forge/pull/113) |
| Status | **Ready for merge** |

### Shipped

- `@resource-forge/prisma` `verifyPrismaCorrespondence` → structured `CorrespondenceReport` or fail-closed error
- DMMF-in normalize → internal `ConsumedModelGraph`; bare graph input rejected as `unusable_dmmf`
- Host mapping + identity-preserving defaults; Field∪Relation injectivity
- Field allow-lists + nullable-only; Relation in-unit closure, multiplicity, join owner-side ordered from/to
- Vitest coverage (33 tests)
- Docs: prisma README + roadmap M4.3.1 ✅; RFC-033 Accepted indexed

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (`pnpm --filter @resource-forge/prisma test` — 33) |
| Typecheck | **Passed** (`pnpm --filter @resource-forge/prisma typecheck`) |
| Lint | **Passed** (`pnpm --filter @resource-forge/prisma lint`) |
| Build | **Skipped** (typecheck covers compile of src) |
| Package validation | **Passed** (`packages/core` delivery diff empty; no nest/graphql/client deps) |

### Next Gate

**None — slice complete pending merge.** M4.3.2/M4.3.3 only when explicitly started.

### M7 Code Review (record)

```text
Decision: Approved for merge
Subject: feat/m4-3-prisma-correspondence / tracking #112
Accepted specification: docs/superpowers/specs/2026-08-10-rfc-033-prisma-correspondence-verification-design.md
Accepted plan: docs/superpowers/plans/2026-08-10-m4-3-prisma-correspondence-verification.md
Plan tasks: 1–7 covered
Verification: prisma test 33 / typecheck / lint green; packages/core diff empty; no nest/graphql/client deps
Rationale: Implements RFC-033 fail-closed DMMF correspondence verification within @resource-forge/prisma; no invented core/Nest/GraphQL/Client/schema-emit semantics; no merge blockers.
```

### M8 / M9 / M10

- **M8:** N/A — no worthwhile behavior-preserving refactor beyond M6 structure.
- **M9:** Complete — package README + roadmap M4.3.1 indexing; RFC-033 already Accepted in specs index.
- **M10:** Accepted for this slice’s process path (gates reachable; SCR emitted; one PR per tracking issue). Workflow prompt library assets were not modified; no library revalidation required.

---

## Document status

**Status: Accepted.** Authoritative for M4.3.1 sequencing/execution history. RFC-033 remains authoritative for product semantics. Delivery via tracking [#112](https://github.com/rexescario-dev/resource-forge/issues/112).
