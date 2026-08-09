# M4.2 GraphQL Schema & Resolver Generation — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD. Implement **only** Accepted RFC-032 GraphQL translation semantics in `@resource-forge/graphql`. Do **not** change `@resource-forge/core` product semantics. Do **not** depend on `@resource-forge/nest` or `@resource-forge/prisma`. Do **not** invent metadata→GraphQL mappings, synthetic Resource fields, Query placeholders, emitters, Nest glue, Prisma realization, or a universal GraphQL host-instance protocol. Do **not** reopen RFC-005–RFC-031 / M3. Preserve: Resource schema structural authority; fail-closed translation; Query-root closure; naming non-injectivity + post-map collision detection; paired schema + `ResolverBindings`; Operation invoke via core `invokeOperation` only; `validateSchema` on every success.

**Status:** Accepted  
**M5:** Accepted (2026-08-10) — Plan Review; no plan blockers after closures: (1) Field/Relation/Operation `ResolverBindings` inventory; (2) Operation binding locked to core `invokeOperation` (no GraphQL-local RFC-021 reimplementation); (3) GraphQL.js `validateSchema` on every successful translation; (4) host-surface convention — binding `valueSource` is semantic source only, not a universal instance protocol. Core untouched; Nest/Prisma/emitters/Query placeholders fenced. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#109](https://github.com/rexescario-dev/resource-forge/issues/109)  
**Source RFC:** [RFC-032 GraphQL Schema & Resolver Generation](../specs/2026-08-10-rfc-032-graphql-schema-resolver-generation-design.md) (**Accepted**)  
**Depends on:** RFC-001 / RFC-002 / RFC-003 / RFC-005 / RFC-006 / RFC-007 / RFC-008 / RFC-009 / RFC-011 / RFC-012 / RFC-014 / RFC-015 / RFC-021 / RFC-023 / RFC-025 / RFC-029 / RFC-030 / RFC-031 (**Accepted**; RFC-031 closed/independent); RFC-032 (**Accepted**); M3 Resource model Done; M4.1 Nest Slice complete (independent)  
**Package:** `@resource-forge/graphql` (consumes `@resource-forge/core`; GraphQL JS as library dependency)  
**Slice:** M4.2 only — GraphQL schema + resolver-contract generation from core Resources  
**Goal:** Deliver `@resource-forge/graphql` so a host can translate a validated Resource translation unit into a GraphQL schema and resolver-binding contracts under RFC-032 fail-closed rules—without putting GraphQL concerns into core and without requiring Nest or Prisma.

**Architecture:**

```text
RFC-032 (Accepted)
└── GraphQL translates core Resources (no Nest/Prisma)

@resource-forge/graphql
├── naming (deterministic type/root; identity-preserving members)
├── schema generation (types, fields, Query/Mutation roots, RfVoid)
├── resolver-binding contracts (Field/Relation/Operation → host surfaces)
└── translateResources (atomic success | fail-closed)

packages/core — consumed only; no product-surface change in this slice
packages/nest, packages/prisma — untouched; no dependency
```

**Tech Stack:** TypeScript strict, Vitest, `graphql` (GraphQL.js) for schema types + `validateSchema`, existing `@resource-forge/core` APIs (`createResource` / identity helpers, `validateResource`, Field/Relation/Operation members, **`invokeOperation`**, `OperationHandlerProvider`, `SemanticResultReport`)

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-032 Accepted (#109)
       ↓
M4.2 plan Draft → M5 Plan Review → Accepted (#109)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M10 as applicable + Slice Completion Report
       ↓
one delivery PR for tracking #109 containing Accepted plan + implementation + SCR
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M4.2 delivery slice. Do **not** open a separate plan-only merge PR as a required gate. M6 treats Accepted RFC-032 text as authoritative for semantics.

**Task checkboxes:** Completed during **M6 execution** only. Leave unchecked while Status is Draft / until M6 runs.

---

## Locked decisions (planning aids — not new product semantics)

| Decision | Lock |
| --- | --- |
| Product semantics owner | RFC-032 Accepted text only |
| Package | `@resource-forge/graphql` only |
| Core product changes | **Forbidden** in this delivery diff |
| Nest / Prisma package deps | **Forbidden** |
| Metadata → GraphQL mappings | **None** — `projectResourceMetadata` unused for structure; calling it must not be required |
| GraphQL library | Dependency on `graphql` (GraphQL.js) for `GraphQLSchema` / type construction (planning pin `^16.0.0`; adjust only if install proves incompatible—do not invent product semantics) |
| Public translate entry | Planning name `translateResources(resources: readonly Resource[]): Result<GraphqlTranslation, GraphqlTranslationError>` — success MUST include both `schema: GraphQLSchema` and `resolverBindings` (see Resolver contract inventory). Exact export spelling non-normative; roles per RFC-032 §4–§8 |
| ResourceIdentity → type name | Deterministic: `capitalizeFirst(namespace) + name` (e.g. `crm`/`Customer` → `CrmCustomer`). Then legality + collision checks (RFC-032 §5.1) |
| Root field name | Deterministic: `decapitalizeFirst(typeName) + '_' + operationName` (e.g. `crmCustomer_getById`). Then lexical/`__*` + collision checks |
| Member / param names | Identity-preserving; fail closed if illegal |
| Naming injectivity | **Not assumed**; detect collisions after mapping and fail closed |
| `number` scalar | GraphQL `Float` (RFC-032 §5.5) |
| Relation `many` SDL | `[Target!]!` iff `nullable=false`; `[Target!]` iff `nullable=true` |
| `void` result | `RfVoid!` with `{ ok: true }` on success |
| Query-root closure | ≥1 mappable `query` Operation required or fail |
| Empty unit / zero-field Resource | Fail closed |
| Mutation root | Emit `Mutation` only when ≥1 `command` Operation maps; omit Mutation type when no commands |
| Operation invocation | **Consume core `invokeOperation(resource, operationName, args, handlerProvider)`** exported from `@resource-forge/core`. GraphQL MUST NOT reimplement lookup → arg validate → handler resolve → invoke → result validate |
| Operation handler supply | Host supplies `OperationHandlerProvider` at resolve time (or via GraphQL context); translation produces the OperationBinding that names which Resource + OperationName to invoke |
| Resolver contracts | Concrete `ResolverBindings` shape below; Field/Relation MAY use GraphQL default resolution when parent already carries values **if** the binding’s semantic outcomes still hold |
| Host instance / handlers | Host-owned Resource instance surface + `OperationHandlerProvider`; package documents required runtime inputs per binding |
| Schema validity | Every successful translation MUST pass GraphQL.js `validateSchema(schema)` with zero errors (additional layer beyond RFC-032 fail-closed checks) |

---

## Goal / non-goals of this plan

### In scope

1. Package wiring: add `graphql` dependency; keep `@resource-forge/core`; forbid nest/prisma deps.
2. Naming helpers with legality, reserved/built-in/`RfVoid` rejection, and post-map collision detection.
3. Schema generation for Fields, Relations, Operations, `RfVoid`, Query-root closure, empty-unit / zero-field failures.
4. Resolver-binding contracts for Fields, Relations, and Operations (RFC-021 invoke for Operations).
5. Atomic `translateResources` success/failure API.
6. Vitest coverage for RFC-032 success and fail-closed modes.
7. Package README + Slice Completion Report; roadmap/index consistency for M4.2 delivery.

### Out of scope (plan non-goals)

1. Any `@resource-forge/core` semantic/API change.
2. Nest or Prisma package work / dependencies.
3. Nest↔GraphQL server composition.
4. Metadata emitters or annotation→GraphQL vocabulary.
5. Relay / federation / subscriptions / pagination frameworks.
6. Synthetic Resource object fields or placeholder Query fields.
7. Expanding RFC-028 into ORM realization.

---

## Constraints (SHALL / SHALL NOT)

Derived only from Accepted RFC-032:

1. SHALL place product surface in `@resource-forge/graphql` (RFC-032 §3).
2. SHALL depend on `@resource-forge/core`; core MUST NOT depend on GraphQL (RFC-032 §3).
3. SHALL NOT depend on `@resource-forge/nest` or `@resource-forge/prisma` (RFC-032 §3).
4. SHALL use Resource `identity` + `schema` as structural authority (RFC-032 §4.1).
5. SHALL treat projected metadata as inert for M4.2 contracts (RFC-032 §4.2).
6. SHALL `validateResource` every Resource before translation (RFC-032 §4.3).
7. SHALL fail closed on zero Resources and on zero mappable `query` Operations (RFC-032 §4.4 / §5.6 / §8).
8. SHALL use identity-preserving Field/Relation/param names; deterministic type/root naming with legality + reserved/built-in/`RfVoid` rejection (RFC-032 §5.1).
9. SHALL detect naming collisions without assuming injectivity (RFC-032 §5.1.4).
10. SHALL fail closed on zero-field Resource object types; MUST NOT invent synthetic fields (RFC-032 §5.2).
11. SHALL implement `optional`×`nullable` SDL/runtime mapping including Relation `many` `[Target!]!` / `[Target!]` (RFC-032 §5.3).
12. SHALL require Relation targets in-unit; allow cycles (RFC-032 §5.4).
13. SHALL map `query`→Query and `command`→Mutation; non-void results `Base!`; `void`→`RfVoid!` (RFC-032 §5.6–§5.7).
14. SHALL fail closed on Field/Relation same-name collision (RFC-032 §5.8).
15. SHALL produce paired schema + resolver contracts or failure—no partial success (RFC-032 §7–§8).
16. SHALL bind Operations by calling core **`invokeOperation`** with host-supplied `OperationHandlerProvider` (RFC-032 §6.3; RFC-021). SHALL NOT reimplement RFC-021 invocation steps in `@resource-forge/graphql`.
17. SHALL include concrete Field/Relation/Operation bindings in every successful translation output (RFC-032 §6–§7).
18. SHALL run GraphQL.js `validateSchema` on every successful schema (planning verification lock implementing GraphQL validity obligations implied by RFC-032 Query-root / object-type / type uniqueness rules).
19. SHALL NOT reopen M3 / RFC-005–031 / emitters / Nest hosting (RFC-032 §1.2 / §13).

---

## Ownership boundaries

| Area | Role |
| --- | --- |
| `docs/superpowers/specs/2026-08-10-rfc-032-graphql-schema-resolver-generation-design.md` | Authoritative Accepted semantics — do not redesign |
| `packages/graphql/**` | Implementation ownership |
| `packages/graphql/package.json` | `graphql` + `core` deps; no nest/prisma |
| `packages/core/**` | **Must remain untouched** in this delivery diff |
| `packages/nest/**`, `packages/prisma/**` | Untouched |
| `docs/roadmap.md`, specs index, this plan + SCR | Docs/process closeout for the slice |

---

## Contract inventory (planning surface names)

Exact export spellings are planning aids; roles are normative per RFC-032.

| Surface | Role | RFC-032 |
| --- | --- | --- |
| `translateResources` | Atomic translation entry: unit → `{ schema, resolverBindings }` \| error | §4–§8 |
| Naming helpers (internal or exported) | Type/root deterministic names; member identity-preserving | §5.1 |
| Schema builder | Object types, Field/Relation fields, Query/Mutation roots, `RfVoid` | §5.2–§5.7 |
| `ResolverBindings` | Concrete Field/Relation/Operation bindings (see inventory below) | §6 |
| `RfVoid` type | GraphQL-owned integration type | §5.7 |
| Core `invokeOperation` | Sole Operation invocation implementation consumed by Operation bindings | §6.3 / RFC-021 |

**Deferred / not authorized:** Nest glue; Prisma; emitters; Relay/federation; synthetic fields; placeholder Query; GraphQL-local Operation invoke engines.

---

## Resolver contract inventory (minimum semantic contents)

Exact TypeScript property names are planning aids. Every successful `translateResources` result MUST include a `resolverBindings` value with **at least** the following semantic contents. An empty object, opaque stub, or docs-only description does **not** satisfy RFC-032 §6.

**Host-surface convention:** M4.2 does not define or require a universal Resource-instance object shape or reader protocol; `valueSource` describes the binding's required semantic source, while concrete host adaptation remains outside this slice. Do not invent a GraphQL-specific runtime instance protocol as a product contract.

```text
ResolverBindings
├── fields: map ResourceIdentity → map FieldName → FieldBinding
├── relations: map ResourceIdentity → map RelationName → RelationBinding
└── operations: map rootFieldName → OperationBinding
```

### FieldBinding (RFC-032 §6.1 / §5.3.2)

Minimum contents:

| Content | Meaning |
| --- | --- |
| `resourceIdentity` | Owning Resource identity |
| `fieldName` | Identity-preserving GraphQL / core Field name |
| `graphqlTypeName` | Generated object type name for that Resource |
| `valueSource` | How to obtain the runtime value from the **host-provided Resource instance surface** (planning convention: parent object exposes field values keyed by `fieldName`, or an explicit reader function attached by the host adapter) |
| `optional` | Core Field `optional` |
| `nullable` | Core Field `nullable` |
| `absentBehavior` | Per §5.3.2: `optional=false` → resolver contract failure; `optional=true` ∧ `nullable=true` → GraphQL `null`; `optional=true` ∧ `nullable=false` → resolver contract failure |
| `failureBehavior` | How contract failures surface at resolve time (GraphQL field error / thrown error — mechanism planning aid; must not weaken presence/null rules) |

Default GraphQL field resolution MAY satisfy a FieldBinding when the parent already carries the field value **and** absentBehavior is enforced.

### RelationBinding (RFC-032 §6.2 / §5.3 / §5.4)

Minimum contents:

| Content | Meaning |
| --- | --- |
| `resourceIdentity` | Owning Resource identity |
| `relationName` | Identity-preserving Relation name |
| `graphqlTypeName` | Owning object type name |
| `targetIdentity` | Relation target `ResourceIdentity` (must be in-unit) |
| `targetGraphqlTypeName` | Target object type name |
| `multiplicity` | `"one"` \| `"many"` |
| `optional` / `nullable` | Core Relation flags; SDL/runtime per §5.3 |
| `valueSource` | How the host supplies the association / related instance(s) on the instance surface |
| `loadClassification` | Binding must allow host/runtime to honor RFC-029 not-loaded vs classifiable related-set outcomes (do not redefine RFC-029) |
| `absentBehavior` / `failureBehavior` | Same presence/nullability obligations as §5.3.2 applied to the association |

### OperationBinding (RFC-032 §6.3 / §5.6–§5.7)

Minimum contents:

| Content | Meaning |
| --- | --- |
| `rootFieldName` | Deterministic Query/Mutation field name |
| `rootKind` | `"query"` \| `"mutation"` (from Operation `kind`) |
| `resourceIdentity` | Resource that owns the Operation |
| `operationName` | Core `OperationName` |
| `resource` | The validated core `Resource` snapshot used for invoke (or a stable handle that yields it) |
| `invoke` | **Must call** `@resource-forge/core` **`invokeOperation(resource, operationName, args, handlerProvider)`** — no GraphQL-local reimplementation |
| `handlerProviderSource` | How the host supplies `OperationHandlerProvider` at resolve time (e.g. GraphQL context key) |
| `argCapture` | How GraphQL args become `ReadonlyMap<string, OperationRuntimeValue>`, including §5.3.3 omit-vs-null reinforcement before invoke |
| `resultMapping` | Non-void: map `SemanticResultReport` value → GraphQL scalar; `void`: map successful void report → `{ ok: true }` (`RfVoid`) |
| `missingHandlerBehavior` | Core `missing_operation_handler` (or equivalent Result err) → **resolve-time** failure, not translation failure |

**Forbidden:** Implementing lookup / argument validation / handler resolution / result validation inside `@resource-forge/graphql` except as thin adapters that call `invokeOperation` and map its `Result`.

---

## File structure (planning)

| Path | Responsibility |
| --- | --- |
| `packages/graphql/package.json` | Add `graphql` dependency; keep `core`; forbid nest/prisma |
| `packages/graphql/src/naming.ts` | Deterministic type/root naming + legality helpers |
| `packages/graphql/src/naming.test.ts` | Naming / reserved / collision unit tests |
| `packages/graphql/src/nullability.ts` | `optional`×`nullable` SDL helpers for outputs/args/lists |
| `packages/graphql/src/schema.ts` | Build `GraphQLSchema` from a validated, named unit |
| `packages/graphql/src/schema.test.ts` | Schema mapping + fail-closed cases |
| `packages/graphql/src/resolvers.ts` | Resolver-binding contracts / default-capable field resolvers |
| `packages/graphql/src/resolvers.test.ts` | Field/Relation/Operation binding behavior |
| `packages/graphql/src/translate.ts` | `translateResources` orchestration |
| `packages/graphql/src/translate.test.ts` | End-to-end success + §8 failure matrix |
| `packages/graphql/src/errors.ts` | Local translation error codes/shapes (planning aid) |
| `packages/graphql/src/index.ts` | Public exports |
| `packages/graphql/src/index.test.ts` | Public export smoke |
| `packages/graphql/README.md` | Usage aligned with RFC-032 |

---

## Slice sequence

```text
Slice A — Package wiring (`graphql` dep; boundary checks)
Slice B — Naming + legality + collision detection (unit TDD)
Slice C — Nullability helpers + Field/Relation object-type mapping + zero-field (unit TDD)
Slice D — Operations, RfVoid, Query-root closure, Mutation omission (unit TDD)
Slice E — translateResources orchestration + full fail-closed matrix (unit TDD)
Slice F — Resolver contracts (Field/Relation/Operation invoke) (unit TDD)
Slice G — README + docs/roadmap + SCR (M7–M10 as applicable)
```

Hard prerequisites: A before all; B before C/D/E; C and D before E; E before or with F; G last. Do **not** mark M4.2 ✅ until product tasks + SCR complete.

---

## TDD / verification strategy

**TDD:** Required for `@resource-forge/graphql` product code.

**Primary behaviors to prove:**

1. Success unit with ≥1 Resource having Fields + ≥1 `query` Operation → `GraphQLSchema` with object types, Query fields, resolver contracts; optional Mutation when commands exist.
2. Identity-preserving Field/Relation/param names; deterministic type/root names per locked algorithms.
3. Fail closed: zero Resources; zero `query` Operations (commands-only or none); zero-field Resource; Field∩Relation name collision; Relation target missing; type name `String`/`Query`/`RfVoid`; root-field / type collisions from non-injective mapping; illegal member names; invalid Resource.
4. Relation `many`: `nullable=false` → `[Target!]!`; `nullable=true` → `[Target!]`; cycles allowed when targets in-unit.
5. Output `optional`×`nullable` runtime contracts (absent + optional=false fails; optional+nullable absent → null).
6. Operation args: SDL under-approximation + runtime four-state reinforcement; non-void results non-null; `void` → `RfVoid` `{ ok: true }`.
7. Operation bindings call core **`invokeOperation`** (missing handler = resolve-time failure, not translation failure); void → `{ ok: true }`.
8. Successful `resolverBindings` include FieldBinding / RelationBinding / OperationBinding minimum contents (see inventory); not opaque stubs.
9. Every successful schema passes GraphQL.js `validateSchema(schema)` with **zero** errors.
10. Metadata inert: translation does not require `projectResourceMetadata`; success path does not depend on annotations.
11. Dependency boundary: graphql `package.json` has no nest/prisma; `git diff` shows **no** `packages/core` product changes.
12. Paired outputs: success returns both schema and resolverBindings; failures return neither as success.

**Commands (M6):**

```bash
pnpm --filter @resource-forge/graphql test
pnpm --filter @resource-forge/graphql typecheck
pnpm --filter @resource-forge/graphql lint
git diff --name-status <base>...HEAD -- packages/core   # expect empty
```

---

## Task breakdown

### Task 1: GraphQL package wiring (Slice A)

**Files:**
- Modify: `packages/graphql/package.json`
- Possibly root lockfile via `pnpm` from repo root

- [ ] **Step 1:** Add dependency `graphql` (`^16.0.0` planning pin)
- [ ] **Step 2:** Confirm dependencies include `@resource-forge/core` and do **not** include `@resource-forge/nest` or `@resource-forge/prisma`
- [ ] **Step 3:** Run `pnpm install` at repo root; `pnpm --filter @resource-forge/graphql typecheck` still passes (placeholder OK)

### Task 2: Naming + legality + collisions (Slice B)

**Files:**
- Create: `packages/graphql/src/naming.ts`
- Create: `packages/graphql/src/naming.test.ts`

- [ ] **Step 1: Write failing tests** for:
  1. `crm`/`Customer` → type `CrmCustomer`; root `(crm/Customer, getById)` → `crmCustomer_getById`
  2. Illegal/reserved **type** names fail: `Query`, `Mutation`, `Subscription`, `String`, `Int`, `Float`, `Boolean`, `ID`, `RfVoid`, `__Type`
  3. Illegal member/param/root-field lexical / `__*` failures
  4. Two distinct identities mapping to same type name → collision detected (construct inputs or force via test of collision helper)
  5. Two distinct `(identity, op)` pairs mapping to same root field → collision detected
  6. Document/assert: functions are not assumed injective; collision detection is required
- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Implement** naming helpers per locked algorithms + `isLegalGraphqlName` / reserved-type checks + collision detectors
- [ ] **Step 4: Tests PASS**

### Task 3: Nullability helpers + object types (Slice C)

**Files:**
- Create: `packages/graphql/src/nullability.ts`
- Create: `packages/graphql/src/schema.ts` (partial OK)
- Create: `packages/graphql/src/schema.test.ts`
- Create: `packages/graphql/src/errors.ts` (as needed)

- [ ] **Step 1: Write failing tests** for:
  1. Field scalars `string`/`number`/`boolean` → `String`/`Float`/`Boolean` with output nullability from `nullable`
  2. Relation `one` to in-unit target; `many` → `[Target!]!` vs `[Target!]`
  3. Cycle `A↔B` succeeds when both in unit
  4. Missing Relation target → fail
  5. Field∩Relation same name → fail
  6. Resource with empty fields+relations → fail (zero-field)
  7. Output runtime contract cases for `optional`×`nullable` may be covered in Task 6 resolver tests if cleaner (SDL nullability helpers remain in scope here)
- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Implement** object-type builder + nullability helpers as an **internal intermediate** consumed later by `translateResources`. Prefer building object types in isolation first; do not invent Query fields in product code.
- [ ] **Step 4: Tests PASS** for object-type / relation / zero-field / collision cases that do not yet require full Query-root closure (or combine with Task 4 if isolation is awkward)

**Planning note:** Object-type construction is an internal intermediate; it MUST NOT constitute translation success independently of the complete §4–§8 validation and paired-output pipeline. Keep Query-root closure assertions in Tasks 4–5 so product code never synthesizes Query fields.

### Task 4: Operations, RfVoid, Query-root closure (Slice D)

**Files:**
- Modify: `packages/graphql/src/schema.ts`
- Modify: `packages/graphql/src/schema.test.ts`

- [ ] **Step 1: Write failing tests** for:
  1. `query` Operation → Query field with identity-preserving arg names; non-void result `Base!`
  2. `command` → Mutation field; `void` → `RfVoid!` and schema includes `RfVoid { ok: Boolean! }`
  3. No commands → schema has no Mutation type (or equivalent absence)
  4. Unit with Resources + fields but zero `query` Operations → fail (Query-root closure)
  5. Zero Resources → fail
  6. Arg optional×nullable runtime reinforcement cases (capture presence vs null)
- [ ] **Step 2: Implement** Query/Mutation field generation + `RfVoid` + unit-level Query-root closure checks
- [ ] **Step 3: Tests PASS**

### Task 5: `translateResources` orchestration (Slice E)

**Files:**
- Create: `packages/graphql/src/translate.ts`
- Create: `packages/graphql/src/translate.test.ts`
- Modify: `packages/graphql/src/index.ts`

- [ ] **Step 1: Write failing tests** for end-to-end:
  1. Happy path (Customer+Order cycle + query+command+void) → success with `schema` + `resolverBindings` (Field/Relation/Operation maps populated per inventory)
  2. Invalid Resource → fail
  3. Full §8 matrix sample: reserved type name via crafted identity if representable; Field/Relation collision; missing target; empty unit; no query ops; zero-field; naming collision
  4. Annotations present or absent do not change structural success (metadata inert)
  5. Failure returns no successful schema/resolverBindings pair
  6. **GraphQL.js schema validity:** every successful translation’s `schema` satisfies `validateSchema(schema)` with **zero** errors (Query root present with ≥1 field; Mutation absent when no commands; object types fieldful; cycles via thunks; `RfVoid` registered when used; no duplicate types/fields)
- [ ] **Step 2: Implement** `translateResources`: validate → name/check collisions → build schema → build `resolverBindings` → `validateSchema` → Result
- [ ] **Step 3: Export** public translate API (+ error types as needed)
- [ ] **Step 4: Tests PASS**

### Task 6: Resolver contracts (Slice F)

**Files:**
- Create: `packages/graphql/src/resolvers.ts`
- Create: `packages/graphql/src/resolvers.test.ts`
- Modify: `packages/graphql/src/translate.ts` as needed to wire contracts

- [ ] **Step 1: Write failing tests** for:
  1. FieldBinding contents + resolve path from host instance surface; optional×nullable absentBehavior
  2. RelationBinding contents + host-supplied association; RFC-029 not-loaded classification via host double where exercised
  3. OperationBinding calls **`invokeOperation`** from `@resource-forge/core` with host `OperationHandlerProvider`; spy/assert that GraphQL does not reimplement arg/result rules; missing handler → resolve-time failure; void → `{ ok: true }`
  4. Default field resolution MAY satisfy FieldBinding when parent already carries values—assert semantic outcomes, not mandatory custom resolver function
  5. Assert successful translation’s `resolverBindings` is not an empty stub (maps contain expected bindings for the happy-path unit)
- [ ] **Step 2: Implement** `ResolverBindings` builders + thin GraphQL resolve adapters that call `invokeOperation` for Operations and enforce Field/Relation absentBehavior
- [ ] **Step 3: Document** host instance-surface / `OperationHandlerProvider` conventions in README (Task 7) matching the inventory
- [ ] **Step 4: Tests PASS**

### Task 7: Docs + boundary verification (Slice G)

**Files:**
- Modify: `packages/graphql/README.md`
- Modify: `docs/roadmap.md` (M4.2 delivery status when shipping)
- Verify: `docs/superpowers/specs/README.md` lists RFC-032 Accepted
- Modify: this plan SCR section during M6–M10
- Modify: `packages/graphql/src/index.test.ts` for public exports

- [ ] **Step 1:** Rewrite graphql README for translate usage, fail-closed summary, Nest/Prisma independence; remove “placeholder only” wording
- [ ] **Step 2:** Confirm `git diff --name-status <base>...HEAD -- packages/core` is empty
- [ ] **Step 3:** Confirm graphql package.json has no nest/prisma dependencies
- [ ] **Step 4:** Run full graphql test + typecheck + lint green
- [ ] **Step 5:** Fill Slice Completion Report; mark M4.2 ✅ on roadmap only after SCR complete
- [ ] **Step 6:** Update index tests to assert `translateResources` (and key exports) exist

---

## Traceability

| Task | RFC-032 sections |
| --- | --- |
| Task 1 package wiring | §3 |
| Task 2 naming | §5.1, §5.1.4, §8 |
| Task 3 object types / nullability / relations | §5.2–§5.5, §5.3, §5.8 |
| Task 4 operations / RfVoid / Query-root | §4.4, §5.6–§5.7, §8 |
| Task 5 translateResources + validateSchema | §4, §7, §8 (+ GraphQL schema validity) |
| Task 6 ResolverBindings + invokeOperation | §6 / RFC-021 |
| Task 7 docs/verification | §1.2 deferrals; packaging |

---

## Execution risks (operational — not redesign)

1. GraphQL.js ObjectType field thunks needed for Relation cycles—use thunk `fields: () => ({...})` pattern.
2. Operation invoke is locked to core **`invokeOperation`**—do not reimplement RFC-021; only adapt GraphQL args/context → `ReadonlyMap` + map `Result` / `SemanticResultReport` to GraphQL results.
3. Crafting ResourceIdentity values that collide with built-in type names after the locked naming algorithm may require carefully chosen `namespace`/`name` pairs in tests (or unit-testing the reservation check directly).
4. Do not “fix” Query-root closure by inventing placeholder Query fields.
5. `validateSchema` failures after a “semantic” success are product bugs—treat as translation failure or fix schema construction before claiming success.
6. Local vitest flakiness: prefer package-filter runs; CI as source of truth if needed.

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M4.2 GraphQL Schema & Resolver Generation |
| Tracking | [#109](https://github.com/rexescario-dev/resource-forge/issues/109) |
| M4 | Implementation Plan: **Accepted** |
| M5 | Review **Accepted** |
| M6 | — |
| M7 | — |
| M8 | — |
| M9 | — |
| Branch | — |
| PR | — |
| Status | **Not started** |

### Shipped

—

### Validation

| Check | Result |
| --- | --- |
| Tests | — |
| Typecheck | — |
| Lint | — |
| Build | — |
| Package validation | — |

### Next Gate

**M6 Implementation** on `#109` — plan Accepted; M6 authorized. Prefer one PR per tracking issue (Accepted plan + implementation + SCR).

---

## Document status

**Status: Accepted.** Authoritative for M4.2 sequencing/execution. RFC-032 remains authoritative for product semantics. M6 may begin. Prefer one pull request per tracking issue for the delivery slice.
