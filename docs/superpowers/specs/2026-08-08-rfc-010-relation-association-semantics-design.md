# RFC-010: Relation Association Semantics

**Date:** 2026-08-08  
**Status:** Draft  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#26](https://github.com/rexescario-dev/resource-forge/issues/26)  
**Depends on:** RFC-001 (Resource Identity — target representation), RFC-005 (Resource Model), RFC-006 (Annotations — projection boundary), RFC-008 (Resource Relations — collection semantics; Relation shape partially superseded), RFC-007 / RFC-009 (Fields — unchanged)  
**Followed by:** Cardinality / multiplicity; direction / inverse; local-field handles / join mapping; cascade; loading/fetch; persistence/ORM mapping; polymorphic targets; registry-backed resolution; association→metadata projection; Resource Operations  
**Unblocks:** M3.7+ Relation association implementation planning (M4→M5), then implementation (M6), after this RFC is Accepted — not implementation by itself  
**Amends / supersedes:** RFC-008 §3.2 Relation member shape (and related closed-member / Relation equality text). See §3.

## Primary question

> What is the smallest closed, explicit association shape for a Resource Relation, and what does each member mean?

## Thesis

RFC-010 amends the Relation member contract so every Relation is a **closed** `{ name: RelationName; target: ResourceIdentity }` with **exactly those two members**. `target` is a **declarative** RFC-001 `ResourceIdentity` — structured `{ namespace, name }` — that answers **which Resource** the Relation associates to. It does **not** require registry presence, resolvability, cross-Resource validation, or registration order. RFC-010 introduces a **breaking contract change** relative to M3.5 / RFC-008: name-only Relations are no longer valid once this floor is Accepted and implemented. No dual-shape compatibility period.

```text
Relation
├── name: RelationName           ← RFC-008
└── target: ResourceIdentity     ← this RFC (RFC-001 pair)
              ├── namespace
              └── name
```

**RFC-008 owns the Relations collection; RFC-010 owns what a Relation is (association shape).**

This RFC answers **what Resource a Relation associates to**, not how many related instances are permitted. Cardinality and other association dimensions are explicitly deferred.

## 1. Scope

### 1.1 Goals

1. Establish the minimum closed association shape as exactly `{ name: RelationName; target: ResourceIdentity }`.
2. Define `target` as a declarative RFC-001 `ResourceIdentity` (structured pair); reuse RFC-001 grammar and equality; no `"namespace/name"` parsing inside Relation; no separate opaque reference grammar.
3. Require `target` on every Relation; reject missing `target` and extra members; no silent strip/repair.
4. Redefine Relation value equality as exact `name` **and** RFC-001 `target` equality.
5. Place association/shape validity in Resource validity via schema with distinct conceptual causes; validate-before-snapshot retained.
6. Explicitly supersede RFC-008 §3.2 Relation shape and document the M3.5 compatibility break; no dual-shape period.
7. Leave RFC-008 authoritative for `RelationName`, ordered `relations` sequence, uniqueness-by-name, snapshot/ownership, independent Field/Relation namespaces, and Relation projection non-participation.
8. Explicitly defer cardinality, direction/inverse, local-field/join, cascade, loading/fetch, persistence/ORM, polymorphic targets, registry resolution, and association→metadata projection.

### 1.2 Non-goals

This RFC does not define:

1. Cardinality / multiplicity
2. Direction, inverse relations, or bidirectional pairing
3. Local-field handles, foreign keys, or join mapping
4. Cascade behavior
5. Loading / fetch / lazy-eager semantics
6. Persistence / ORM mapping
7. Polymorphic targets or union target types
8. Registry lookup, existence checks, cross-Resource validation, or registration-order dependencies
9. Runtime resolution of `target` to a Resource snapshot
10. Relation → `ResourceMetadata` contribution or any change to RFC-006 / RFC-007 / RFC-008 / RFC-009 projection rules
11. Changes to Fields or Operations member contracts (`operations` remains empty-only)
12. Dual-shape transitional validity (`{ name }` still accepted)
13. Concrete TypeScript APIs, modules, package layout, or error code enums (conceptual separation only)
14. Resource-wide equality, builders, mutation APIs, serialization, adapters, or reverse projection

## 2. Terminology

| Term | Meaning |
| --- | --- |
| Association shape | The closed Relation member contract that declares how a Relation associates — in this RFC, `{ name, target }` |
| `target` | Declarative `ResourceIdentity` naming the Resource type this Relation associates to; not a resolved Resource, registry key lookup result, or runtime load |
| Declared association identity | What `Relation.target` asserts; does **not** imply the target Resource exists, is registered, or can be resolved |

RFC-001 terms (`ResourceIdentity`, identity grammar, identity equality) and RFC-008 terms (`RelationName`, `relations` ordered sequence, uniqueness within `relations`) keep their existing meanings except where this RFC supersedes Relation shape and Relation equality.

## 3. Supersession / amendment of RFC-008

Once this RFC is **Accepted** and the corresponding implementation floor is adopted:

| Concern | Authority |
| --- | --- |
| Relation member shape | **RFC-010** (supersedes RFC-008 §3.2) |
| Required `target` / association meaning | **RFC-010** |
| Relation value equality | **RFC-010** |
| Relation member validity (shape + target) | **RFC-010** (with RFC-008 name rules and RFC-001 identity rules) |
| `RelationName` grammar / equality | RFC-008 |
| Ordered `relations` sequence; empty valid | RFC-008 |
| Uniqueness of `RelationName` within `relations` | RFC-008 (by name only — not by `(name, target)`) |
| Independent Field/Relation namespaces | RFC-008 |
| Snapshot / ownership of `relations` | RFC-008 |
| Relation projection non-participation | RFC-008 (unchanged by this RFC) |

RFC-008’s name-only `{ name }` Relation contract is **no longer normative** after this supersession. Implementers MUST NOT combine the old name-only shape with the new required-target contract as simultaneously valid.

This RFC does **not** rewrite RFC-008 wholesale.

## 4. Association target

### 4.1 Representation

```text
target: ResourceIdentity {
  namespace
  name
}
```

- `target` MUST be a structured RFC-001 `ResourceIdentity` pair.
- Implementations MUST NOT require or perform `"namespace/name"` string parsing as part of Relation membership validation.
- This RFC does **not** introduce a separate opaque relation-reference grammar.
- Informative canonical textual form `namespace/name` remains an RFC-001 encoding concern, not a Relation member type.

### 4.2 Declaration vs resolution

| Rule | Statement |
| --- | --- |
| Declarative only | A valid `target` declares which Resource type the Relation associates to |
| No registry lookup | Validation MUST NOT consult a registry |
| No existence requirement | The target Resource need not exist or be registered |
| No cross-Resource validation | Owning Resource validity MUST NOT depend on validating or loading the target Resource |
| No registration order | Validity MUST NOT depend on definition/registration order relative to the target |
| No runtime load | `target` does not imply fetch, hydrate, or adapter resolution semantics |

**Boundary (parallel to RFC-009):** declaration validity ≠ runtime / external resolution validity. Registry-backed resolution, if desired later, MUST be a separate contract/layer and MUST NOT quietly make Resource validation depend on the registry.

### 4.3 Identity rules reuse (RFC-001)

Target validation reuses RFC-001’s existing identity grammar and equality semantics. This RFC MUST NOT redefine namespace/name grammars, identity equality, or reserved-namespace policy.

**Design Review decision — RFC-001 validation context for Relation targets:**  
RFC-001 states that identity validation MAY depend on the context in which an identity is being created (for example, framework-defined versus user-defined resources), including reserved-`rf` handling. **Design Review MUST select one of the validation contexts already defined by RFC-001 for Relation `target` validation. RFC-010 MUST NOT introduce a new validation context** and MUST NOT invent a Relation-local reservation policy. Until Design Review records that selection in the Accepted RFC, implementers have no normative answer for which RFC-001 context applies to `target`; that selection is an M3 decision for this document, not an open implementation choice.

### 4.4 Self-target

A Relation’s `target` MAY equal the owning Resource’s `ResourceIdentity` (self-association). This floor performs no graph / cycle analysis. Design Review may reverse this default if a normative prohibition is justified; until then, self-target is allowed.

## 5. Relation member model

```text
Relation {
  name: RelationName
  target: ResourceIdentity
}
```

- A Relation MUST contain **exactly** the members `name` and `target`. No additional members are permitted.
- `name` MUST be a valid `RelationName` (RFC-008).
- `target` MUST be a valid declarative `ResourceIdentity` under §4 (RFC-001 rules + Design Review–chosen validation context).
- Missing `target` is invalid.
- Members with additional properties (including premature `cardinality`, `direction`, local-field handles, etc.) are invalid (not ignored or stripped).
- Later RFCs may extend or amend the Relation model explicitly; such extensions do not become valid under this RFC merely because future evolution is anticipated. Unknown properties MUST NOT silently become part of Relation semantics.

### 5.1 Relation value equality

Two Relation **values** are equal if and only if:

1. their `name`s are exactly equal; and
2. their `target`s are equal under RFC-001 `ResourceIdentity` equality.

Changing only `target` makes two Relations unequal.

### 5.2 Interaction with the `relations` sequence (RFC-008)

| Rule | Statement |
| --- | --- |
| Order | Declaration order preserved; sequence equality remains order-sensitive (RFC-008), using RFC-010 Relation value equality at each index |
| Uniqueness | At most one Relation per `RelationName` (RFC-008) |
| Consequence | Two Relations with the same name and different targets cannot coexist in one collection, even though they are unequal as standalone Relation values |
| Same target, different names | Allowed (distinct RelationNames may declare the same target) |
| Empty | Zero members still valid (RFC-008) |

## 6. Validation

`relations` validity remains part of Resource validity via the schema. Under this RFC, every member must satisfy the Relation contract in §5 in addition to RFC-008 sequence rules.

**Validate-before-snapshot:** Invalid candidates MUST be rejected before they can become Resource snapshot state. Implementations MUST NOT transform an invalid candidate into a valid Relation by discarding information (including stripping unknown properties or inventing a default `target`) before validation.

### 6.1 Conceptual failure causes

Concrete codes and TypeScript shapes are deferred; separation is normative:

| Cause | When |
| --- | --- |
| Invalid relation member | Non-object, missing required member, extra member, or malformed member structure not attributable to a `RelationName` or `target` identity violation |
| Invalid relation name | `name` fails `RelationName` grammar (RFC-008) |
| Duplicate relation name | repeated `RelationName` in the sequence (RFC-008) |
| Invalid relation target | `target` is present but fails RFC-001 identity validation under the Design Review–chosen existing validation context |

- These remain Resource/schema validation failures, distinct from metadata, annotation, and field validation failures.
- No silent dropping, normalization, or coercion.
- A separate public `validateRelations` / `validateRelationTarget` API is **not** required by this RFC.
- This validates **declared association identity only**. It does **not** resolve or load the target Resource.

**Invariant:** A Resource is valid only if its complete schema, including every Relation’s `name` and `target`, is valid under RFC-008 + this RFC.

## 7. Projection and adjacent contracts

1. **Relations / projection** — RFC-008 Relation projection non-participation remains unchanged. This RFC introduces no Relation→metadata contribution.
2. **Validation gate** — `projectResourceMetadata` continues to re-run Resource validation; Relations that fail §6 still fail projection.
3. **Annotations (RFC-006)** — unchanged.
4. **Fields (RFC-007 / RFC-009)** — unchanged; independent namespaces unchanged.
5. **Operations** — remain empty-only until their RFC; unchanged by this RFC.

## 8. Compatibility / impact

| Concern | Impact |
| --- | --- |
| M3.5 name-only Relations | **Breaking.** After Accept + implementation of this floor, `{ name }` without `target` is invalid |
| Dual-shape period | **None.** No transitional acceptance of name-only Relations |
| Existing empty `relations` | Remains valid |
| RFC-008 collection rules | Unchanged (order, uniqueness-by-name, snapshot, independent namespaces) |
| Projection | Unchanged non-participation |
| Fields / operations / annotations | Unchanged |

Implementations that currently treat Relations as name-only MUST widen the member contract only after this RFC is Accepted and an Accepted implementation plan exists.

## 9. Design rationale

- **One coherent association contract** answers “what is the association shape?” without independently bolting on cardinality, direction, or join features.
- **`{ name, target }` as the minimum floor** elevates Relation from a named slot to an association that can identify what it relates to; a Relation without a target remains only a named slot (RFC-008 floor).
- **Target before cardinality** separates *which Resource* from *how many instances* — distinct semantic dimensions; coupling them would broaden Design Review into a full relation-model exercise.
- **Structured `ResourceIdentity`** reuses RFC-001 equality/grammar and avoids string-parse ambiguity inside Relation.
- **Declared-only target** matches RFC-009’s declaration≠resolution boundary and keeps `validateResource` free of registry dependence.
- **Partial supersession of RFC-008 §3.2** avoids duplicating collection semantics and makes the breaking widen unmistakable.
- **Equality includes `target`** so a target change is observable; uniqueness stays name-scoped so RFC-008’s collection model is not silently rewritten.
- **Closed member + dedicated Invalid relation target** preserves reject-don’t-repair discipline and keeps shape errors separable from identity errors.

### Suggested progression (non-normative)

```text
RFC-008  Relation identity          { name }
        │
RFC-010  Association target         { name, target: ResourceIdentity }  ← this RFC
        │
Later    Multiplicity / cardinality { ..., cardinality }
        │
Later    Direction / join / …       (explicit RFCs)
```

## 10. Relationship to other RFCs and milestones

| RFC / milestone | Relationship |
| --- | --- |
| RFC-001 Resource Identity | **Relied upon** for `target` representation, grammar, equality, and validation-context mechanism |
| RFC-005 Resource Model | Relied upon; schema member slot unchanged |
| RFC-006 Annotations | Relied upon for projection boundary; unchanged |
| RFC-007 / RFC-009 Fields | Unchanged; independent namespaces unchanged |
| RFC-008 Resource Relations | **Partially superseded** (§3.2 Relation shape / Relation equality); collection semantics retained |
| Later — cardinality / direction / join / cascade / load / persistence / polymorphism | Explicit association-dimension RFCs |
| Later — registry-backed resolution | Separate layer; MUST NOT fold into Resource validation quietly |
| Later — association projection | Relation→metadata contribution |
| Later — Resource Operations | Empty-only until its RFC |
| M3.7+ association implementation | Only after this RFC is Accepted and an Accepted implementation plan exists |

## 11. Document acceptance criteria (M2 → M3 Design Review)

This RFC may move from Draft to Accepted when Design Review finds:

1. The closed Relation shape is unambiguously exactly `{ name, target }` with `target: ResourceIdentity`; missing `target` and extras are invalid.
2. `target` is unambiguously declarative-only (no registry/existence/cross-Resource/registration-order/runtime load requirements).
3. Target representation is structured RFC-001 identity (no string parse; no opaque ref grammar); RFC-001 rules are reused, not redefined.
4. Design Review has selected one RFC-001-defined validation context for Relation `target`s; RFC-010 introduces no new validation context and no Relation-local reservation policy; the chosen context is recorded in the Accepted document.
5. Supersession of RFC-008 §3.2 (and related Relation equality / closed-member text) is explicit; collection ownership remains with RFC-008.
6. Relation value equality (`name` **and** `target`) and uniqueness-by-name coexistence rules are unambiguous.
7. Conceptual failure causes distinguish Invalid relation member vs Invalid relation target vs name/duplicate causes; no silent repair; no required public validate API.
8. Breaking compatibility vs M3.5 / name-only Relations is explicit; no dual-shape period.
9. Self-target default (allowed) is accepted or explicitly overturned with rationale.
10. Cardinality, direction/inverse, local-field/join, cascade, loading/fetch, persistence/ORM, polymorphic targets, registry resolution, association projection, Fields, and Operations remain explicitly deferred or unchanged as stated.
11. No normative TypeScript API prescription beyond conceptual Relation / `target` contracts.

## 12. Explicit deferrals

- Cardinality / multiplicity
- Direction, inverse relations, bidirectional pairing
- Local-field handles, foreign keys, join mapping
- Cascade behavior
- Loading / fetch semantics
- Persistence / ORM mapping
- Polymorphic targets / union targets
- Registry-backed resolution or existence checks
- Association → metadata projection; cross-source collision / merge
- Concrete TypeScript representation and public APIs
- Dual-shape migration helpers or adapters

## 13. Decision record

| Decision | Choice | Why |
| --- | --- | --- |
| Primary question | Association shape (minimum closed member) | One coherent contract, not feature accretion |
| Minimum shape | `{ name, target }` | Answers which Resource; elevates named slot to association |
| Cardinality in this floor | Deferred | Distinct dimension (*how many*); keep M3 focused |
| Target representation | Structured `ResourceIdentity` | Reuse RFC-001; no parse/opaque grammar |
| Target semantics | Declarative only | Declaration ≠ resolution; no registry in validateResource |
| `rf` / validation context | M3 selects one RFC-001-defined context | No new context; no Relation-local reservation policy |
| Self-target | Allowed (default) | No graph analysis in this floor |
| Relation shape | Exactly `{ name, target }` | Closed member; breaking widen |
| Compatibility | Breaking; no dual-shape | Honest migration |
| RFC-008 relationship | Partial supersession of §3.2 | Collection vs member ownership |
| Equality | `name` + `target` | Target change observable |
| Uniqueness | By `RelationName` only | Preserve RFC-008 collection model |
| Invalid target | Dedicated conceptual cause | Separable from shape errors |
| Missing `target` | Invalid relation member | Required member absent |
| Projection | Unchanged | Out of scope |
| Operations | Unchanged / empty-only | Separate RFC |

## 14. Worked examples (conceptual)

Conceptual `ResourceIdentity` values use the structured pair form `{ namespace, name }` (RFC-001). The informative canonical text `namespace/name` is not a Relation `target` representation.

```text
Resource {
  identity: { namespace: crm, name: Order }
  schema: {
    fields: [
      { name: total, type: number }          # RFC-009
    ]
    relations: [
      { name: customer, target: { namespace: crm, name: Customer } }
      { name: lineItems, target: { namespace: crm, name: LineItem } }
    ]
    operations: ∅
  }
  annotations: ∅
}

# Valid: unique RelationNames; targets are declarative identities
# Same Field/Relation name strings still allowed (independent namespaces)
# projectResourceMetadata → no Relation contribution (unchanged)

# Self-target allowed by default:
#   { name: parent, target: { namespace: crm, name: Order } }
#   on Resource identity { namespace: crm, name: Order }

# Same target, different names — valid:
#   [
#     { name: author, target: { namespace: crm, name: User } },
#     { name: editor, target: { namespace: crm, name: User } }
#   ]

# [ { name: customer } ]
#   → invalid (missing target; Invalid relation member)
# [ { name: customer, target: { namespace: crm, name: Customer }, cardinality: "many" } ]
#   → invalid (extra member; Invalid relation member)
# [ { name: customer, target: "crm/Customer" } ]
#   → invalid (not structured ResourceIdentity)
# [ { name: customer, target: { namespace: CRM, name: Customer } } ]
#   → invalid (Invalid relation target; namespace grammar)
# [ { name: Customer, target: { namespace: crm, name: Customer } } ]
#   → invalid (Invalid relation name)
# [
#   { name: a, target: { namespace: crm, name: A } },
#   { name: a, target: { namespace: crm, name: B } }
# ]
#   → invalid (Duplicate relation name)
```

## 15. Implementation gate (non-normative)

Coding that requires associated Relations or rejects name-only Relations under this contract begins only after:

1. this RFC is Accepted;
2. an Accepted implementation plan for the relevant M3 slice exists.

Prefer **one pull request per tracking issue** for that delivery slice (Accepted plan + implementation together). Do not merge a plan-only PR before code for the same slice except as recovery.

No production cardinality, direction/inverse, local-field/join, cascade, loading/fetch, persistence/ORM, polymorphic targets, registry resolution, association→metadata projection, or Operations widening SHALL be introduced under this RFC alone.
