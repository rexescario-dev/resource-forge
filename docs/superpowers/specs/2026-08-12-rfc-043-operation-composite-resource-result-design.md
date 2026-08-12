# RFC-043: Composite (Resource-Typed) Operation Results

**Date:** 2026-08-12
**Status:** Draft
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)
**Tracking:** Pending — a paired GitHub issue is opened after this Draft is reviewed (see §Document status)
**Depends on:** RFC-001 (Resource Identity — `ResourceIdentity` reused as the composite result reference), RFC-005 (Resource Model — Resource as structural authority), RFC-010 / RFC-011 (Relation Association Semantics / Multiplicity — precedent for referencing a target Resource by identity without requiring that target to resolve at single-Resource validation time), RFC-012 (Resource Operations — Operation identity / packaging), RFC-021 (Operation Kind, Signature, and Execution — **amended by this RFC**)
**Followed by:** A future GraphQL-layer RFC translating composite Operation results into selectable GraphQL object types (unblocks the RFC-032 §13 deferral "Richer Operation IO (nested/composite) — Blocked on future core Operation IO RFCs"); a future RFC for `many`/list composite results, if evidence justifies it; a future RFC for nullable/optional Operation results, if evidence justifies it
**Unblocks:** Consumers whose Operations need to return an existing Resource's shape instead of a single scalar or a hand-serialized string, without core inventing a Resource-instance validation framework
**Amends / specializes:** Amends RFC-021's closed Operation member by adding one new `result` variant. Does **not** reopen RFC-021's `kind`, `params`, scalar `result` behavior, or invocation-order invariants beyond the result-validation step. Does **not** reopen RFC-012 packaging, RFC-009 scalar vocabulary, RFC-010/011 Relation floors, or RFC-032 GraphQL translation (GraphQL mapping of this new result kind is explicitly future work).

## Primary question

> How does an Operation declare a result that is an existing Resource's shape rather than only a scalar or `void`, without core inventing an anonymous composite-type system or a Resource-instance structural-validation framework?

## Thesis

RFC-043 extends RFC-021's closed `result` union with exactly one new variant: a reference to an existing Resource by `ResourceIdentity`. It does not introduce a second, unregistered composite-type concept, does not support lists of Resources, does not touch RFC-021's non-nullable result floor, and does not require core to validate the returned value's fields against the target Resource's schema.

```text
Operation.result:
    "string" | "number" | "boolean" | "void"     # unchanged (RFC-021)
  | { resource: ResourceIdentity }                # new (this RFC)
```

A composite result names a target Resource; the target Resource's own declared `fields` and `relations` are the composite result's shape. There is no second shape language. This mirrors how a Relation's `target` already references another Resource by identity (RFC-010/011) without requiring that target to be resolvable at single-Resource validation time — resolution is a concern for whichever consuming layer needs it (for Relations, translation-unit closure per RFC-032 §5.4; for Operation composite results, an analogous future consuming-layer rule, not defined here).

At invocation, core's obligation for a composite result is **presence, not structure**: invocation succeeds when the handler produces a present, non-null result value. Core does not inspect or validate that value's runtime structure; interpretation of it as an instance of the target Resource is host-owned. The host-provided Resource instance surface remains host-owned, exactly as RFC-032 §6.4 already establishes for Field/Relation resolution — RFC-043 extends that same division of labor to Operation results instead of inventing a new one.

## 1. Scope

### 1.1 Goals

1. Add exactly one new `Operation.result` variant: `{ resource: ResourceIdentity }`, denoting a single existing Resource.
2. Define validity for the composite variant: exactly one declared property, `resource`, whose value is a well-formed `ResourceIdentity` (RFC-001 grammar). No additional properties.
3. State that `kind` rules from RFC-021 (`query` MUST NOT be `void`) are unaffected: a composite result is permitted for both `query` and `command`; only `void` remains kind-restricted.
4. Extend the RFC-021 invocation contract's result-validation step (§5.3) to cover the composite case: success = the handler produces a present, non-null result value. No field/relation-level check is performed by core.
5. Extend RFC-021 Operation value equality (§3.5) to cover the composite case: two composite results are equal iff their target `ResourceIdentity`s are equal; a scalar/void result is never equal to a composite result.
6. Preserve every other RFC-021 invariant unchanged: non-nullable result floor, invoke ordering, argument rules, handler resolution, missing-handler classification, handler-application-failure non-reclassification.
7. Explicitly state that whether the referenced `ResourceIdentity` resolves to a Resource in the relevant translation/registry context is **not** checked by this RFC's declaration validation — the same deferral already used for Relation targets (RFC-010/011; resolved at a consuming-layer level such as RFC-032 §5.4 for GraphQL, not at single-Resource validation).

### 1.2 Non-goals

This RFC does not define:

1. Anonymous or inline composite result shapes not represented by an existing `ResourceIdentity`
2. List / `many` composite results (a target Resource result is always exactly one instance)
3. Nullable or optional Operation results of any kind (RFC-021's non-nullable result floor is unchanged and unextended)
4. A field-selection or partial-selection mechanism in core — any such mechanism is future work for a consuming translation layer (e.g. GraphQL selection sets), not a core Operation concept
5. Resource-instance structural validation: core does not verify that a composite result's runtime value actually has the target Resource's declared fields/relations, does not check field types, and does not check nullability/optionality of the target's members
6. Whether/how a composite result's target `ResourceIdentity` resolves to a Resource in any particular context (deferred to a future consuming-layer rule, analogous to but not defined by RFC-032 §5.4)
7. Any GraphQL, Nest, or Prisma mapping of the new result variant (`@resource-forge/core` remains integration-agnostic per RFC-032 §3)
8. Changes to RFC-021 `kind`, `params`, scalar `result` behavior, or invoke ordering beyond the result-validation step
9. Changes to RFC-012 packaging, RFC-009 scalar vocabulary, or RFC-010/011 Relation member floors
10. Concrete TypeScript API names, error-code enums, or module layout beyond what is necessary to state the contract (implementation-plan concern)

## 2. Terminology

| Term | Meaning |
| --- | --- |
| Composite result | An `Operation.result` value of the form `{ resource: ResourceIdentity }`, denoting exactly one instance of the named target Resource |
| Scalar result | An `Operation.result` value of `"string" \| "number" \| "boolean"` (unchanged, RFC-021) |
| Target Resource | The Resource identified by a composite result's `resource` property |
| Presence-only validation | Core's invocation-time obligation for a composite result: confirm a present, non-null value was produced; do not inspect that value's field/relation structure |
| Host-provided Resource instance surface | Host-owned runtime representation of a Resource instance (RFC-032 §6.4 term, reused here without redefinition) |

RFC-001 / RFC-005 / RFC-009 / RFC-010 / RFC-011 / RFC-012 / RFC-021 terms (`ResourceIdentity`, `Resource`, `FieldType`, target, multiplicity, `OperationName`, `OperationKind`, `OperationParam`, `params`, `result`, invocation contract) keep their existing meanings except where this RFC amends `result` and its associated validation/equality/invocation rules.

## 3. Closed Operation member amendment

### 3.1 Amended shape

```text
Operation {
  name: OperationName                                    # RFC-012, unchanged
  kind: "command" | "query"                               # RFC-021, unchanged
  params: ordered sequence of OperationParam               # RFC-021, unchanged
  result:
      "string" | "number" | "boolean" | "void"              # RFC-021, unchanged
    | { resource: ResourceIdentity }                         # RFC-043, new
}
```

- An Operation continues to have exactly the semantic properties `name`, `kind`, `params`, `result`. This RFC widens the type of `result` only.
- A composite `result` value has exactly one declared property, `resource`. A candidate with additional properties on the composite value is invalid (not ignored or stripped), consistent with RFC-021's closed-member discipline.
- `resource` MUST be a well-formed `ResourceIdentity` under RFC-001 grammar.
- The RFC-021 scalar/`void` `result` shape remains valid unchanged; there is no dual-shape ambiguity because the composite variant is structurally distinguishable (an object with a `resource` property vs. one of four string literals).

### 3.2 Kind interaction (unchanged rule, widened applicability)

| Kind | Composite result permitted? |
| --- | --- |
| `command` | Yes |
| `query` | Yes |

RFC-021's only kind/result rule — `query` MUST NOT declare `result: "void"` — is unaffected. A composite result is not `"void"`, so it is never blocked by that rule for either kind.

## 4. Declaration validation (extension of RFC-021 §4)

A Resource's `operations` sequence remains valid under this RFC only if, in addition to all RFC-021 §4 rules, every Operation's `result` satisfies:

1. `result` is exactly one of `"string" | "number" | "boolean" | "void"` (RFC-021, unchanged), **or**
2. `result` is exactly `{ resource: ResourceIdentity }`, where:
   - the value has exactly the declared property `resource` (no additional properties), and
   - `resource` is a well-formed `ResourceIdentity` per RFC-001 grammar.
3. If `kind === "query"`, `result !== "void"` (RFC-021, unchanged; a composite result is never `"void"` so this rule is satisfied trivially by any composite `query` result).

**Not checked by this validation:** whether the referenced `ResourceIdentity` resolves to a Resource in the relevant translation/registry context. Declaration validation under this RFC is local to the Operation's own shape, exactly as RFC-021's scalar `result` validation is local (a scalar `result` type is checked for grammar, not for whether any handler will ever produce a matching value).

### 4.1 Declaration failure categories (conceptual, extends RFC-021 §4.1)

| Category | When (examples) |
| --- | --- |
| Invalid operation member (result) | `result` is neither a valid scalar/void literal nor a well-formed `{ resource: ResourceIdentity }` |
| Invalid composite result reference | `resource` property present but fails `ResourceIdentity` grammar |
| Invalid composite result shape | composite `result` value has missing or additional properties beyond `resource` |

These remain Resource/schema validation failures, distinct from Field, Relation, Constraint, Annotation, and Metadata validation failures, per RFC-021 §4.1.

## 5. Invocation contract (extension of RFC-021 §5)

The RFC-021 invocation steps (declaration validity → Operation lookup → argument validation → handler resolution → invoke → result validation) are unchanged in order and in every step except result validation (§5.3), which gains one new row:

| Declared `result` | Success condition |
| --- | --- |
| `"void"` | Unchanged (RFC-021): invocation completes without a semantic result payload. |
| `"string"` \| `"number"` \| `"boolean"` | Unchanged (RFC-021): invocation completes with a present, non-null value matching the declared scalar type. |
| `{ resource: ResourceIdentity }` | Invocation succeeds when the handler produces a present, non-null result value. |

**Presence-only obligation.** For a composite result, invocation succeeds when the handler produces a present, non-null result value. Core does not inspect or validate the value's runtime structure; interpretation of that value as an instance of the declared target Resource is host-owned. Core MUST NOT walk the returned value's fields or relations against the target Resource's declared schema, MUST NOT require the value to expose any particular runtime shape beyond "present and non-null," and MUST NOT reject a composite result value on the grounds that a field is missing, mistyped, or that a related Resource cannot be resolved. Field/relation-level correctness, if and when it needs to be established, is the responsibility of whichever consuming/integration layer later reads those fields (for example, a future GraphQL resolver contract analogous to RFC-032 §6.1–§6.2) — not this invocation contract.

A present semantic result payload that is `null`/`undefined`, or an absent result, when `result` is a composite type → **result contract failure**, using the same failure classification RFC-021 §5.5 already defines for scalar result mismatches.

### 5.1 What "presence-only" does not mean

To avoid the presence-only rule being read back into an implicit validation obligation:

- Core does not define a runtime representation for Resource instances. That remains host-owned (RFC-032 §6.4), unchanged by this RFC. Any present, non-null value produced by the host satisfies the core-level result-presence contract; interpretation of that value as an instance of the target Resource belongs to the host/consuming layer.
- This RFC does not introduce a `validateResourceInstance` function, type guard, or equivalent. None is required by this contract, and none is authorized by this RFC.

## 6. Equality (extension of RFC-021 §3.5)

Two Operation `result` values are equal iff:

- both are the same scalar/void literal (RFC-021, unchanged), or
- both are composite results and their target `ResourceIdentity`s are equal (RFC-001 identity equality).

A scalar or `void` result is never equal to a composite result, regardless of any string overlap between a scalar literal and a `ResourceIdentity`'s printed form.

Operation value equality overall (`name`, `kind`, `params`, `result`) remains as RFC-021 §3.5 defines it, using this widened `result` equality rule.

## 7. Worked examples (conceptual)

```text
# Valid query with composite result
Operation {
  name: byId
  kind: "query"
  params: [ { name: id, type: "string", optional: false, nullable: false } ]
  result: { resource: (fs, FlashSale) }
}

# Valid command with composite result (e.g. returning the created instance)
Operation {
  name: create
  kind: "command"
  params: [ { name: name, type: "string", optional: false, nullable: false } ]
  result: { resource: (fs, FlashSale) }
}

# Invalid: composite result with an extra property
Operation {
  name: byId
  kind: "query"
  params: []
  result: { resource: (fs, FlashSale), inline: true }   # invalid composite result shape
}

# Invalid: composite result with a malformed identity
Operation {
  name: byId
  kind: "query"
  params: []
  result: { resource: "FlashSale" }   # not a well-formed ResourceIdentity
}

# Invocation (Resource + OperationName scoped)
invoke(SomeResource, "byId", { id: "abc" }, handlers)
  → validate args → resolve handlers[SomeResource, "byId"] → invoke
  → success when the handler produces a present, non-null value
    (core does not inspect that value's fields/relations)

# handler returns null when result is a composite type → result contract failure
# handler returns undefined when result is a composite type → result contract failure
# handler throws FlashSaleNotFoundError → host/application failure (not reclassified here, per RFC-021 §5.4)

# Equality
{ resource: (fs, FlashSale) } == { resource: (fs, FlashSale) }   # true (same identity)
{ resource: (fs, FlashSale) } == { resource: (fs, Coupon) }      # false (different identity)
{ resource: (fs, FlashSale) } == "string"                        # false (different result kinds)
```

## 8. Design rationale

- **Reuse `ResourceIdentity`, not a new type system.** A target Resource already has an authoritative shape (its own `fields`/`relations`). Inventing an anonymous composite-shape language would duplicate that authority and require its own validation/equality/naming rules for no benefit the motivating case needs.
- **Mirrors Relation targets, not Field values.** Relations already reference other Resources by identity without requiring resolution at single-Resource validation time (RFC-010/011). Composite Operation results follow the same precedent rather than inventing a new resolution model.
- **Presence-only validation keeps core's surface area flat.** Deep structural validation would require core to define a generic "validate an arbitrary runtime value against a Resource schema" capability that does not exist today, edges toward RFC-028 persistence-correspondence territory, and is not required to close the motivating gap (a caller needs a typed, selectable result — not an invocation-time proof of conformance).
- **Single-Resource only, no `many`.** The motivating evidence (#176, row 9a) is a single-Resource lookup. `many` opens ordering, pagination, and empty-vs-null-list questions that have no evidence requirement yet; deferring keeps this RFC small, the same discipline RFC-021 used when it deferred nullable/optional results.
- **No new nullability.** The motivating spike handles "not found" as a handler-thrown application error (RFC-021 §5.4), not a null result. Extending RFC-021's non-nullable result floor is therefore not required by the evidence and is left to a future RFC if a real need appears.
- **Field selection stays out of core.** Once a result is Resource-typed, a consuming layer such as GraphQL can let callers select individual fields via its own selection mechanism, exactly as it already does for Field/Relation object fields (RFC-032 §5.5/§5.4). Core does not need to invent a selection language to get that benefit.
- **Explicit "does not mean" section (§5.1).** Presence-only rules are easy to read back into an implicit validation obligation over time; stating the boundary explicitly prevents that drift in later implementation planning.

## 9. Relationship to other RFCs

| RFC | Relationship |
| --- | --- |
| RFC-001 Resource Identity | Consumed — `ResourceIdentity` is reused unchanged as the composite result reference; no new identity concept |
| RFC-005 Resource Model | Relied upon — Resource remains structural authority; unchanged |
| RFC-009 Field Types | Unrelated to this amendment beyond continuing to govern the unchanged scalar `result` variants |
| RFC-010 / RFC-011 Relation Association / Multiplicity | Relied upon as precedent only — target-by-identity without requiring resolution at declaration time; Relation floors themselves are unchanged and not reopened |
| RFC-012 Resource Operations | Relied upon — Operation identity, packaging, `operations` sequence semantics unchanged |
| RFC-021 Operation Kind, Signature, Execution | **Amended** — `result` union widened by one variant; result-validation step (§5.3) and equality (§3.5) extended; all other RFC-021 invariants unchanged |
| RFC-023 Projection Composition | Unrelated — Operations still contribute no projection entries; unchanged |
| RFC-028 Persistence / ORM Mapping | Not reopened — this RFC explicitly avoids requiring instance-structural validation, which is the boundary that would otherwise pull RFC-028 concerns into core |
| RFC-032 GraphQL Schema & Resolver Generation | **Not amended by this RFC** (core stays GraphQL-agnostic, RFC-032 §3) — this RFC unblocks RFC-032 §13's parked deferral ("Richer Operation IO (nested/composite)") for a future, separately Accepted GraphQL-layer RFC |
| Later — GraphQL composite-result mapping RFC | Required before `@resource-forge/graphql` may translate a composite `result` into a selectable GraphQL type; not defined here |
| Later — `many`/list composite results | Deferred; would need its own RFC (ordering, empty-vs-null-list, pagination) |
| Later — nullable/optional Operation results (any kind) | Deferred; RFC-021's non-nullable floor is unchanged by this RFC |

## 10. Invariants

1. `Operation.result` is `"string" | "number" | "boolean" | "void" | { resource: ResourceIdentity }` — exactly one new variant added to RFC-021's closed union.
2. A composite `result` value has exactly the declared property `resource`, a well-formed `ResourceIdentity`; additional properties are invalid.
3. `kind` rules are unchanged: only `"void"` is kind-restricted (`query` MUST NOT use it); composite results are permitted for both `query` and `command`.
4. Declaration validation of a composite `result` is local to the Operation's own shape; it does not require the referenced `ResourceIdentity` to resolve to a Resource in any particular context.
5. Invocation-time result validation for a composite result checks presence and non-nullness only; it does not inspect the value's fields or relations.
6. Two composite results are equal iff their target `ResourceIdentity`s are equal; a scalar/void result is never equal to a composite result.
7. No `many`/list composite results, no nullable/optional results, no anonymous/inline result shapes, and no field-selection mechanism are introduced by this RFC.
8. All RFC-021 invariants not explicitly extended above (invoke ordering, argument rules, handler resolution/missing-handler classification, handler-application-failure non-reclassification, non-nullable result floor for the scalar/void variants) remain unchanged.

## 11. Acceptance criteria (for this specification)

This RFC may move from Draft to Accepted when Design Review finds:

1. The amendment is minimal and unambiguous: exactly one new `result` variant, reusing `ResourceIdentity`, single-target only.
2. The presence-only invocation contract is unambiguous, including the explicit "does not mean" boundary (§5.1) preventing an implicit structural-validation reading.
3. Declaration validation is clearly local (does not require target-Resource resolution), consistent with the Relation-target precedent (RFC-010/011) without reopening those RFCs.
4. Equality and kind-interaction extensions are unambiguous and consistent with RFC-021 §3.5 / §3.2.
5. Non-goals are strong enough to keep `many`, nullable results, anonymous shapes, field selection, and GraphQL/Nest/Prisma mapping out of this RFC.
6. Traceability to RFC-021 (amended), RFC-010/011 (precedent only), RFC-032 (unblocked, not amended) is explicit.
7. No implementation plan, task breakdown, or production code is required for Accept of this document.

## 12. Explicit deferrals

Deferred concerns are listed in §1.2. This ledger records that anonymous/inline composite shapes, `many`/list composite results, nullable/optional Operation results of any kind, a field-selection mechanism in core, target-Resource resolution/registration requirements, Resource-instance structural validation, and any GraphQL/Nest/Prisma mapping of the new result variant remain out of scope unless a future RFC says otherwise.

## Document status

**Status: Draft.** Written from the evidence and required follow-up recorded in the Flash Sale System's `#176` Final decision record (`docs/superpowers/decisions/2026-08-12-issue-176-resource-forge-go-no-go.md` in `rexescario-dev/flash-sale-system`, row 9a and the "Required before next consumer migration" follow-up), which identified the missing composite/Resource-typed Operation-result capability as the primary driver of that evaluation's Gate C failure.

Per this repository's M2 Specification gate (`docs/workflows/prompts/specification.md`), this document stops at Draft and is handed to Design Review (M3); it does not self-Accept.

A paired GitHub tracking issue (`RFC-043: <title>`) is opened after this Draft has been reviewed, per the Resource Forge RFC process (`docs/rfc-process.md`): Draft → Review → Accept → Implement. This document will be updated with the issue link once that issue exists.
