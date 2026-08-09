# RFC-021: Operation Kind, Signature, and Execution

**Date:** 2026-08-09  
**Status:** Accepted  
**M3:** Accepted (2026-08-09) — Design Review; no design blockers. Locks C + `command`|`query` + S1 + E1 + K2 + flat member A retained. Void clarified as absence of **semantic result payload** (host completion representation deferred; no portable unit/TS/wire token). M4 need not invent a hidden unit type: for `"void"`, success is established when the invocation reports absence of a semantic result payload; host-adapter mapping from handler completion to that report is an implementation concern. Declaration/runtime boundaries, Resource-scoped handlers, and non-goals (no dispatcher/middleware/CRUD/transport/tx) verified.  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#77](https://github.com/rexescario-dev/resource-forge/issues/77)  
**Depends on:** RFC-001 (Resource Identity — via Resource), RFC-005 (Resource Model — `operations` slot), RFC-009 (Resource Field Types — closed `FieldType` ∈ {string, number, boolean}), RFC-012 (Resource Operations — name-only floor amended here), RFC-013 / RFC-014 (`optional` / `nullable` *concepts* reused for Operation parameters only; Field/Relation floors unchanged)  
**Followed by:** M3.x implementation planning for Operation kind/signature/execution after Accept; annotation vocabulary; richer projection; direction / joins; empty-vs-absent / null elements; nullable/optional Operation results; nested / composite IO; business-error taxonomy  
**Unblocks:** M3.x Operation kind/signature/execution implementation planning (M4→M5), then implementation (M6), after this RFC is Accepted — not implementation by itself  
**Amends / specializes:** RFC-012 closed Operation member shape, Operation value equality, and `operations` closed-member validation. Retains RFC-012 packaging (ordered `operations` sequence, `OperationName` grammar and identity domain, independent namespaces, empty valid, projection non-participation, validate-before-snapshot). Does **not** reopen Field / Relation member floors, RFC-020 population uniqueness, or projection rules.

## Primary question

> How does an Operation declare **kind**, **scalar signature / IO** (`params` as an ordered list; `result` as a single scalar or `void`), and a **thin host invocation contract**—extending RFC-012’s name-only floor—without turning `core` into a dispatcher, CRUD engine, or transport layer?

## Thesis

RFC-021 extends Operation semantics as one coherent unit:

- **Kind** — closed semantic roles: `"command" | "query"` (**intended** effect vs information retrieval; not runtime-enforced purity).
- **Signature / IO** — ordered, operation-owned scalar parameters and a single scalar or `void` result, reusing RFC-009’s closed scalar vocabulary and RFC-013/014 presence/nullability *concepts* on parameters only.
- **Execution contract** — `core` owns declaration validity, argument validation, handler resolution obligation, conceptual invoke, and result validation; the host supplies the handler and owns effects.

```text
Operation {
  name: OperationName
  kind: "command" | "query"
  params: ordered [
    {
      name: OperationParamName
      type: "string" | "number" | "boolean"
      optional: boolean
      nullable: boolean
    }
  ]
  result: "string" | "number" | "boolean" | "void"
}
```

**Runtime surface (conceptual):** validate the Resource declaration, including the Operation declaration → validate invocation arguments against the operation's `params` → resolve the host handler for that operation (`Resource` + `OperationName`) → invoke it → establish that the invocation produced a semantic outcome matching `result` (no semantic result payload for `"void"`, or a present non-null declared scalar). A missing handler is a host-contract / invalid-invocation failure; handler effects remain host-owned and are not subject to purity enforcement by `core`.

**Cut recorded on [#77](https://github.com/rexescario-dev/resource-forge/issues/77):**

| Lock | Decision |
| --- | --- |
| Scope | **C** — kind + signature + thin execution contract |
| Kind | Closed semantic roles `"command" \| "query"` (no `custom` / `action`) |
| Signature | **S1** — ordered scalar params + scalar/`void` result |
| Execution | **E1** — validate → resolve handler → invoke → validate result |
| Kind force | **K2** — declaration-level IO rules; no runtime purity enforcement |
| Packaging | **A** — flat closed Operation member |

## 1. Scope

### 1.1 Goals

1. Amend the closed Operation member beyond RFC-012 name-only to include `kind`, `params`, and `result`.
2. Define closed `OperationKind = "command" | "query"` with declaration-level consequences (K2).
3. Define ordered `params` of closed scalar `OperationParam` members with required `optional` / `nullable` booleans; empty `params` valid.
4. Define `result` as exactly one of `"string" | "number" | "boolean" | "void"`; `"void"` is result-only; `query` MUST NOT use `"void"`; `command` MAY.
5. Define the thin invocation contract (E1): argument map validation, Resource-scoped handler resolution, conceptual invoke, result validation.
6. Define semantic failure **categories** (declaration vs argument vs missing handler vs result contract) without prescribing a concrete error-type hierarchy beyond existing `core` conventions at implementation time.
7. Preserve RFC-012 packaging: ordered unique `operations`, independent namespaces, empty sequence valid, no projection contribution, validate-before-snapshot, no silent repair.
8. Explicitly keep dispatcher / middleware / registry APIs, CRUD engines, persistence, transactions, and HTTP/RPC mapping out of `core`.

### 1.2 Non-goals

This RFC does not define:

1. Additional kinds (`custom`, `action`, CRUD verbs as kinds, HTTP methods)
2. Nested objects, arrays, unions, or ad-hoc structural schemas for Operation IO
3. Coupling parameters to `FieldName` / Resource field definitions (beyond reusing closed scalar type and optional/nullable *concepts*)
4. Nullable or optional **results** (result is non-nullable scalar or `void` only)
5. Dispatcher architecture, middleware chains, handler registry APIs, or retry semantics
6. Persistence, ORM mapping, transactions, authz, or HTTP/RPC / transport mapping
7. Business / application error taxonomy for handler-thrown or handler-rejected failures
8. Runtime purity enforcement or attestation that `query` has no side effects
9. Changes to Field / Relation member floors (RFC-007–RFC-015 remain as Accepted for those members)
10. Operation contribution to `projectResourceMetadata`
11. Annotation vocabulary; richer projection; direction / joins; empty-vs-absent / null elements
12. Concrete TypeScript API names, modules, or error-code enums beyond what is necessary for M6 to express this contract (informative names may appear)
13. Dual-shape transitional validity that would still accept RFC-012 name-only Operations alongside the RFC-021 closed member

## 2. Terminology

| Term | Meaning |
| --- | --- |
| `OperationKind` | Closed semantic role `"command"` or `"query"` |
| `command` | Operation **intended** to cause a state-changing effect |
| `query` | Operation **intended** to obtain information without a state-changing effect (semantic role; not runtime-enforced purity) |
| `OperationParamName` | Name identifying a parameter within one Operation’s `params`: same grammar as `OperationName` (`^[a-z][a-zA-Z0-9]*$`), dedicated identity domain (not `FieldName`, not `OperationName` domain merge) |
| `OperationParam` | Closed parameter member `{ name, type, optional, nullable }` |
| `params` | **Ordered sequence** of `OperationParam` on an Operation; empty valid |
| `result` | Declared return: RFC-009 scalar (`string` \| `number` \| `boolean`) or `"void"` |
| `"void"` | Result sentinel meaning **no semantic result payload**; not a `FieldType` and not a parameter type. Distinct from any host-level handler completion representation |
| Semantic result payload | The value (if any) that the invocation contract treats as the Operation’s result; `"void"` means there is none |
| Handler | Host-provided implementation for a specific Resource-scoped Operation identity |
| Argument map | Semantic map from `OperationParamName` → argument value (or absence) for one invocation |
| Invocation contract | Normative boundary: declaration validity, argument validation, handler presence, conceptual invoke, result validation |

RFC-001 / RFC-005 / RFC-009 / RFC-012 / RFC-013 / RFC-014 terms (`Resource`, `ResourceSchema`, `operations`, `OperationName`, `FieldType`, `optional`, `nullable`, `projectResourceMetadata`) keep their existing meanings except where this RFC amends the Operation member and related validation / equality.

## 3. Closed Operation member

### 3.1 Shape

```text
Operation {
  name: OperationName
  kind: OperationKind
  params: ordered sequence of OperationParam
  result: "string" | "number" | "boolean" | "void"
}
```

- An Operation has exactly those declared semantic properties.
- Additional semantic properties are **invalid** (not ignored or stripped).
- The RFC-012 name-only shape is no longer valid once RFC-021 is adopted; there is no dual-shape compatibility mode.
- `OperationName` grammar, exact string equality, uniqueness within `operations`, dedicated identity domain, and lack of reserved names remain as in RFC-012.

### 3.2 OperationKind (K2)

| Kind | Meaning | Declaration rule |
| --- | --- | --- |
| `command` | Intended to cause a state-changing effect | `result` MAY be `"string"` \| `"number"` \| `"boolean"` \| `"void"` |
| `query` | Intended to obtain information without a state-changing effect | `result` MUST be `"string"` \| `"number"` \| `"boolean"` (not `"void"`) |

- Kind determines **declaration requirements** only.
- `core` MUST validate those declaration/signature constraints.
- The host remains responsible for honoring semantic intent.
- `core` MUST NOT inspect or attest to handler side effects.

### 3.3 OperationParam

```text
OperationParam {
  name: OperationParamName
  type: "string" | "number" | "boolean"    # RFC-009 FieldType vocabulary
  optional: boolean
  nullable: boolean
}
```

| Rule | Statement |
| --- | --- |
| Ownership | Parameters are operation-owned; names need not match any `FieldName` |
| Grammar | `OperationParamName` uses `^[a-z][a-zA-Z0-9]*$` |
| Uniqueness | Unique within that Operation’s `params` |
| Order | Sequence participates in Operation value equality |
| Empty `params` | Valid for both `command` and `query` |
| `type` | Closed RFC-009 scalars only; `"void"` MUST NOT appear as a parameter type |
| `optional` | `true` → argument may be absent; `false` → argument must be present (presence only) |
| `nullable` | `true` → present argument may be null; `false` → present argument must be non-null (value nullability only) |
| Exact booleans | `optional` and `nullable` are declaration booleans; omission is invalid and no default is inferred |
| Orthogonality | All four `optional` × `nullable` combinations are valid; neither implies the other |

Parameter order affects Operation value equality, but invocation arguments are keyed by `OperationParamName`.

### 3.4 Result

- `result` is exactly one of `"string" | "number" | "boolean" | "void"`.
- `"void"` means the Operation has **no semantic result payload**. Hosts may still use some host-level completion representation when a void Operation finishes successfully; that representation is outside this RFC (including whether an implementation uses `undefined`, a unit value, or another local convention). This RFC does **not** standardize a portable wire or TypeScript token for void.
- Result is **non-nullable** in this RFC: there is no `nullable` / `optional` flag on `result`.
- Scalar result types use RFC-009 `FieldType` vocabulary and value semantics.

### 3.5 Equality

- Two Operation **values** are equal iff `name`, `kind`, `params` (order-sensitive sequence of param value equality), and `result` are equal.
- Two OperationParam **values** are equal iff `name`, `type`, `optional`, and `nullable` are equal.
- Collection uniqueness within `operations` remains **by `OperationName` only** (RFC-012).

### 3.6 Retained packaging (RFC-012)

| Rule | Retained |
| --- | --- |
| Ordered `operations` | Yes |
| Empty `operations` | Valid |
| Independent namespaces vs `fields` / `relations` | Yes |
| Snapshot immutability of exposed sequences | Yes |
| No Operation → `projectResourceMetadata` contribution | Yes |
| Validate-before-snapshot; no silent repair | Yes |

## 4. Declaration validation

`operations` validity remains part of Resource validity via the schema.

A Resource’s `operations` sequence is valid under this RFC only if all of the following hold:

1. Every member is a closed Operation with exactly the semantic properties `name`, `kind`, `params`, and `result`.
2. Each `name` is a valid `OperationName`; names are unique within the sequence.
3. Each `kind` is exactly `"command"` or `"query"`.
4. Each `params` sequence has unique valid `OperationParamName`s; every param is a closed `{ name, type, optional, nullable }` with `type ∈ {string, number, boolean}` and exact boolean `optional` / `nullable`.
5. Each `result` is exactly `"string" | "number" | "boolean" | "void"`.
6. If `kind === "query"`, then `result !== "void"`.
7. Empty `operations` and empty `params` remain valid.

Invalid `operations` → invalid Resource.

### 4.1 Declaration failure categories (conceptual)

Concrete codes/shapes are deferred to implementation conventions. Separation is normative:

| Category | When (examples) |
| --- | --- |
| Invalid operation name | `name` fails grammar |
| Duplicate operation name | repeated `OperationName` |
| Invalid operation member | wrong/extra/missing semantic properties; invalid `kind` / `result` |
| Invalid parameter member | param shape / type / boolean / name grammar failures |
| Duplicate parameter name | repeated `OperationParamName` within one Operation |
| Kind/result rule violation | `query` with `"void"` result |

These remain distinct from Field, Relation, Constraint, Annotation, and Metadata validation failures.

## 5. Invocation contract (E1)

### 5.1 Conceptual surface

Informative name only: `invokeOperation` (or equivalent). Normative steps, in order:

1. **Declaration validity** — the Resource (including its Operations) MUST already be valid; invoke MUST NOT accept an undeclared or invalid Operation.
2. **Operation lookup** — resolve the target Operation by `OperationName` **within that Resource’s `operations` sequence**.
3. **Argument validation** — validate the semantic argument map against that Operation’s `params`.
4. **Handler resolution** — resolve the host-provided handler for that same **Resource + `OperationName`** identity (not a global registry contract).
5. **Missing handler** — if no handler exists, fail as **host-contract / invalid invocation** (do not invent a no-op).
6. **Invoke** — call the handler with the validated argument map. The handler completes under the host’s execution model; that completion is not itself the semantic result.
7. **Result validation** — establish that the invocation produced a semantic outcome matching `result` (§5.3): either **no semantic result payload** (`"void"`) or a present non-null scalar of the declared type.

**Invariant:** The handler MUST NOT be invoked before argument validation succeeds and handler resolution succeeds.

### 5.2 Argument map rules

- Arguments are a semantic map keyed by `OperationParamName`.
- Map entry order is irrelevant for binding.
- Unknown argument key → argument contract failure.
- Duplicate parameter binding, if representable by a host input mechanism → argument contract failure.
- Every declared parameter with `optional: false` MUST have a corresponding argument key.
- If a parameter is absent and `optional: true` → OK; skip value checks for that parameter.
- If a parameter is present and `nullable: false` → argument must be non-null.
- If a parameter is present and non-null → value must match declared scalar `type`.
- Scalar validation is **type validation, not coercion**; e.g. a numeric-looking string does not satisfy `number`. Scalar matching uses existing RFC-009 value semantics (including number equality spirit consistent with constraint runtime: no cross-type coercion).

### 5.3 Result rules

| Declared `result` | Success condition |
| --- | --- |
| `"void"` | Invocation completes **without a semantic result payload**. The concrete host-level representation of successful void completion is outside this RFC. |
| `"string"` \| `"number"` \| `"boolean"` | Invocation completes with a **present, non-null** value matching the declared scalar type. |

For `"void"`, `core` establishes success when the invocation reports **absence of a semantic result payload**. How a host adapter maps handler completion to that report is an implementation concern; this RFC does **not** require a portable unit value type (or other hidden result abstraction) in `core`.

A present semantic result payload when `result` is `"void"`, absence of a required scalar payload, or wrong scalar type → **result contract failure**. Host-level completion tokens MUST NOT be interpreted as portable semantic results unless they convey a declared scalar payload under RFC-009 value semantics.

### 5.4 Handler and host boundary

- Handler resolution is **per Resource + OperationName**.
- How hosts store or locate handlers is outside this RFC; only the obligation to supply a handler for the invoked Operation is normative.
- Handler effects remain host-owned.
- A handler-thrown/rejected application error is propagated/classified according to the host's execution model and is **not** reclassified by RFC-021 as an argument, handler-presence, or result-contract failure.

### 5.5 Invocation failure categories (conceptual)

| Category | When |
| --- | --- |
| Invalid invocation — unknown operation | `OperationName` not on that Resource |
| Argument contract failure | unknown key; missing required param; nullability/type failures; duplicate binding if representable |
| Host-contract / invalid invocation — missing handler | no handler for Resource + OperationName |
| Result contract failure | semantic result outcome mismatches declared `result` |
| Handler application failure | out of scope for reclassification by this RFC |

## 6. Projection non-participation

Unchanged from RFC-012:

1. Operations do **not** contribute metadata entries.
2. Invalid `operations` still fail Resource validation and therefore cannot successfully project.
3. “No projection contribution” does **not** mean Operations bypass validation.

## 7. Worked examples (conceptual)

```text
# Valid command with void result
Operation {
  name: cancel
  kind: "command"
  params: [ { name: reason, type: "string", optional: true, nullable: false } ]
  result: "void"
}

# Valid query (non-void required)
Operation {
  name: totalDue
  kind: "query"
  params: []
  result: "number"
}

# Invalid: query + void
Operation {
  name: ping
  kind: "query"
  params: []
  result: "void"
}

# Invocation (Resource + OperationName scoped)
invoke(OrderResource, "cancel", { reason: "duplicate" }, handlers)
  → validate args → resolve handlers[OrderResource, "cancel"] → invoke
  → success when there is no semantic result payload (host completion representation deferred)

# Missing handler → host-contract / invalid invocation
# args { reason: 1 } → argument contract failure (type)
# handler yields semantic payload "ok" when result is "void" → result contract failure
# handler throws InsufficientFunds → host/application failure (not reclassified here)
```

## 8. Design rationale

- **One coherent unit (C)** finishes what RFC-012 deferred together; splitting kind from signature/execution would leave operation semantics half-defined.
- **Semantic roles over CRUD** keep `core` above transport and persistence while still giving normative taxonomy.
- **No escape hatch** preserves contract strength; new roles require a future RFC.
- **S1 scalar IO** gives a real signature without inventing a second document schema language.
- **Flat member (A)** matches Field/Relation simplicity; K2 lives in validation, not a second shape family.
- **E1 thin invoke** mirrors RFC-020’s occupancy boundary pattern: `core` owns the contract edge; hosts own effects.
- **K2 not K3** avoids false purity claims `core` cannot observe.
- **Named argument binding** separates declaration order (equality/docs) from invoke ergonomics.
- **Non-nullable result floor** keeps this RFC minimal; optional/nullable results can be a later amendment if evidence appears.
- **Explicit non-goals** stop dispatcher/middleware/CRUD/transport creep at M3–M6.

## 9. Relationship to other RFCs

| RFC | Relationship |
| --- | --- |
| RFC-005 Resource Model | Relied upon for `operations` slot; unchanged aggregate model |
| RFC-009 Field Types | Relied upon for closed scalar vocabulary / value semantics on params and non-void results |
| RFC-012 Resource Operations | **Amended** — Operation member, equality, closed-member validation; packaging retained |
| RFC-013 / RFC-014 | Concepts of `optional` / `nullable` reused on **OperationParam** only; Field/Relation floors not reopened |
| RFC-006 / projection | Relied upon; Operation non-participation retained |
| RFC-016–RFC-020 Constraints | Unchanged; Operations remain a separate schema collection |
| Later roadmap items | Annotation vocabulary, richer projection, direction/joins, empty-vs-absent remain deferred |

## 10. Invariants

1. Operation is the closed flat member `{ name, kind, params, result }` — no dual-shape with RFC-012 name-only.
2. `kind ∈ { command, query }` only; no escape hatch.
3. `params` is an ordered list of closed `{ name, type, optional, nullable }`; empty valid; names unique within the Operation; `type ∈ { string, number, boolean }`.
4. `optional` / `nullable` are exact booleans; omission invalid; no defaults / silent repair.
5. `result ∈ { string, number, boolean, void }`; `"void"` is result-only; `query` ⇒ non-void; `command` MAY be void; result is non-nullable in this RFC.
6. Param order affects Operation equality; invocation binds by `OperationParamName`.
7. Invoke ordering is fixed: declaration validity → Operation lookup (`Resource` + `OperationName`) → argument validation → handler resolution → invoke → result validation. The handler MUST NOT be invoked before argument validation succeeds and handler resolution succeeds.
8. Missing handler = host-contract / invalid invocation; not a result-contract failure.
9. Scalar checks are type checks, not coercion.
10. Handler application failures are not reclassified as argument / missing-handler / result-contract failures.
11. No Operation contribution to `projectResourceMetadata`; Field/Relation floors unchanged; independent namespaces retained.
12. `core` MUST NOT define dispatcher, middleware, registry API, CRUD engine, persistence, transactions, or HTTP/RPC mapping.

## 11. Acceptance criteria (for this specification)

This RFC may move from Draft to Accepted when Design Review finds:

1. Primary question and thesis lock kind + S1 IO + E1 invoke as one unit.
2. Closed member, K2 rules, invoke order, and error **categories** are unambiguous.
3. Non-goals are strong enough to stop dispatcher/CRUD/transport/tx scope creep in M4–M6.
4. Traceability to RFC-012 / RFC-009 / RFC-013–014 concepts is explicit without silently reinterpreting Field/Relation floors or RFC-020.
5. Deferred concerns in §1.2 remain deferred.
6. No implementation plan, task breakdown, or production code is required for Accept of this document.

## 12. Explicit deferrals ledger

Deferred concerns are listed in §1.2. This ledger records that annotation vocabulary, richer projection, direction/joins, empty-vs-absent, nullable/optional results, nested/composite IO, business-error taxonomy, authz, retries, wire formats, concrete public TypeScript API shapes, and additional Operation kinds remain out of scope unless a future RFC says otherwise.

## Design Review

```text
Decision: Accepted
Subject: docs/superpowers/specs/2026-08-09-rfc-021-operation-kind-signature-execution-design.md
Document kind: architecture RFC
Primary question: How does an Operation declare kind, scalar signature/IO, and a thin host invocation contract—extending RFC-012—without turning core into a dispatcher, CRUD engine, or transport layer?
Tracking: https://github.com/rexescario-dev/resource-forge/issues/77

Review summary: Design answers the primary question as one coherent unit (C). Closed command|query (K2 declaration force only), S1 scalar IO, flat member A, and E1 Resource-scoped invoke order are consistent and minimal. Void/host-completion boundary is implementable without inventing a normative unit type: void success = reported absence of semantic result payload; adapter mapping deferred. Non-goals prevent dispatcher/middleware/CRUD/transport/tx creep. No dual-shape with RFC-012; Field/Relation/RFC-020 unreopened.

Findings: None (no design blockers)

Dependencies verified:
- RFC-012 — amends (Operation member / equality / closed-member validation); packaging retained
- RFC-009 — relies (FieldType vocabulary / scalar value semantics)
- RFC-013 / RFC-014 — relies (optional/nullable concepts on OperationParam only)
- RFC-005 / RFC-001 — relies (operations slot / Resource identity)
- RFC-006 — relies (projection non-participation retained)
- RFC-016–RFC-020 — relies (unchanged; separate collection)

Gate: Proceed to M4.
```
