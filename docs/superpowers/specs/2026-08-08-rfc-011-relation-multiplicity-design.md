# RFC-011: Relation Cardinality / Multiplicity

**Date:** 2026-08-08  
**Status:** Draft  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#31](https://github.com/rexescario-dev/resource-forge/issues/31)  
**Depends on:** RFC-001 (Resource Identity — target representation unchanged), RFC-005 (Resource Model), RFC-006 (Annotations — projection boundary), RFC-008 (Resource Relations — collection semantics retained), RFC-010 (Relation Association Semantics — association floor; Relation shape partially superseded), RFC-007 / RFC-009 (Fields — unchanged)  
**Followed by:** Nullability / optionality / requiredness on Relations or Fields; min/max bounds; direction / inverse; local-field handles / join mapping; cascade; loading/fetch; persistence/ORM mapping; polymorphic targets; registry-backed resolution; association→metadata projection; Resource Operations  
**Unblocks:** M3.8 Relation multiplicity implementation planning (M4→M5), then implementation (M6), after this RFC is Accepted — not implementation by itself  
**Amends / supersedes:** RFC-010 §5 Relation member shape (and related closed-member / Relation equality text). See §3.

## Primary question

> How many related instances does a Relation declare—without deciding optionality, nullability, bounds, direction, joins, or runtime behavior?

## Thesis

RFC-011 amends the Relation member contract so every Relation is a **closed** `{ name: RelationName; target: ResourceIdentity; multiplicity: RelationMultiplicity }` with **exactly those three members**. `RelationMultiplicity` is the closed binary vocabulary `"one" | "many"` by exact membership. `multiplicity` answers **singular vs collection relationship shape only**. It does **not** encode optional/required, nullability, min/max bounds, direction, join, loading, persistence, or query semantics.

RFC-011 introduces a **breaking contract change** relative to M3.7 / RFC-010: Relations that omit `multiplicity` (exactly `{ name, target }`) are no longer valid once this floor is Accepted and implemented. No dual-shape compatibility period.

```text
Relation
├── name: RelationName                 ← RFC-008
├── target: ResourceIdentity           ← RFC-010 (RFC-001 pair)
└── multiplicity: RelationMultiplicity ← this RFC
              ├── "one"
              └── "many"
```

**RFC-008 owns the Relations collection; RFC-010 owns association target; RFC-011 owns multiplicity (relationship shape).**

This RFC answers **how many** related instances a Relation declares at the shape level (`one` = singular, `many` = collection). It does not answer whether a related value may be absent, nullable, bounded, navigated, loaded, or persisted.

## 1. Scope

### 1.1 Goals

1. Introduce named contract-level `RelationMultiplicity` for the closed vocabulary `"one" | "many"`.
2. Redefine Relation as exactly `{ name: RelationName; target: ResourceIdentity; multiplicity: RelationMultiplicity }` (no additional members).
3. Require `multiplicity` on every Relation; exact vocabulary membership; case-sensitive; no trim, alias, coerce, or normalize.
4. Define `"one"` as singular relationship shape and `"many"` as collection relationship shape — and **nothing else**.
5. Redefine Relation value equality as exact `name` **and** RFC-001 `target` equality **and** exact `multiplicity` equality.
6. Place multiplicity/shape validity in Resource validity via schema with distinct conceptual causes; validate-before-snapshot retained; no silent repair.
7. Explicitly supersede RFC-010 §5 Relation shape (closed two-member floor) and document the M3.7 compatibility break; no dual-shape period.
8. Leave RFC-008 authoritative for `RelationName`, ordered `relations` sequence, uniqueness-by-name, snapshot/ownership, independent Field/Relation namespaces, and Relation projection non-participation.
9. Leave RFC-010 authoritative for declarative `target` semantics (RFC-001 `user` context; no registry/existence/resolution).
10. Explicitly defer optional/required, nullability, min/max, direction/inverse, local-field/join, cascade, loading/fetch, persistence/ORM, polymorphic targets, registry resolution, association→metadata projection, and Operations.

### 1.2 Non-goals

This RFC does not define:

1. Optional vs required relationship presence
2. Nullability of related values or Relation slots
3. `min` / `max` bounds, UML multiplicity ranges, or open cardinality expressions
4. Additional multiplicity values or aliases (`"0..1"`, `"1..*"`, `"toOne"`, `"toMany"`, `"singular"`, `"collection"`, …)
5. Direction, inverse relations, or bidirectional pairing
6. Local-field handles, foreign keys, or join mapping
7. Cascade behavior
8. Loading / fetch / lazy-eager / query semantics
9. Persistence / ORM mapping
10. Polymorphic targets or union target types
11. Registry lookup, existence checks, cross-Resource validation, or registration-order dependencies
12. Runtime resolution of `target` or enforcement of instance counts against live data
13. Relation → `ResourceMetadata` contribution or any change to RFC-006 / RFC-007 / RFC-008 / RFC-009 / RFC-010 projection rules
14. Changes to Fields or Operations member contracts (`operations` remains empty-only)
15. Dual-shape transitional validity (`{ name, target }` still accepted)
16. Concrete TypeScript APIs, modules, package layout, or error code enums (conceptual separation only; informative shape below)
17. Resource-wide equality, builders, mutation APIs, serialization, adapters, or reverse projection

## 2. Terminology

| Term | Meaning |
| --- | --- |
| `RelationMultiplicity` | Closed relationship-shape identity: exactly one of `"one"`, `"many"`; exact string equality; not a Field type, not a constraint, not a runtime count |
| Multiplicity | The Relation member that declares singular vs collection relationship shape |
| Singular relationship | What `"one"` asserts: the Relation’s shape is to-one |
| Collection relationship | What `"many"` asserts: the Relation’s shape is to-many |
| Declared relationship shape | What `Relation.multiplicity` asserts; does **not** imply optionality, nullability, bounds, load behavior, or instance-count validation against data |

RFC-008 terms (`RelationName`, `relations` ordered sequence, uniqueness within `relations`) and RFC-010 terms (`target`, declarative association identity) keep their existing meanings except where this RFC supersedes Relation shape and Relation equality.

## 3. Supersession / amendment of RFC-010

Once this RFC is **Accepted** and the corresponding implementation floor is adopted:

| Concern | Authority |
| --- | --- |
| Relation member shape | **RFC-011** (supersedes RFC-010 §5 closed `{ name, target }`) |
| Required `multiplicity` / `RelationMultiplicity` vocabulary | **RFC-011** |
| Relation value equality | **RFC-011** |
| Relation member validity (shape + multiplicity) | **RFC-011** (with RFC-008 name rules and RFC-010 / RFC-001 target rules) |
| Declarative `target` semantics / RFC-001 `user` context | RFC-010 (unchanged) |
| `RelationName` grammar / equality | RFC-008 |
| Ordered `relations` sequence; empty valid | RFC-008 |
| Uniqueness of `RelationName` within `relations` | RFC-008 (by name only — not by `(name, target, multiplicity)`) |
| Independent Field/Relation namespaces | RFC-008 |
| Snapshot / ownership of `relations` | RFC-008 |
| Relation projection non-participation | RFC-008 (unchanged by this RFC) |

RFC-010’s two-member `{ name, target }` Relation contract is **no longer normative** after this supersession. Implementers MUST NOT combine the old two-member shape with the new required-multiplicity contract as simultaneously valid.

This RFC does **not** rewrite RFC-008 or RFC-010 wholesale. Association-target rules in RFC-010 remain normative unless explicitly amended here (they are not).

## 4. RelationMultiplicity

```text
RelationMultiplicity ::= "one" | "many"
```

| Value | Meaning (this RFC only) |
| --- | --- |
| `"one"` | Singular relationship shape |
| `"many"` | Collection relationship shape |

- **Identity:** exact string membership in the set above.
- **Case-sensitive:** `"One"` is not `"one"`; `"MANY"` is not `"many"`.
- **No trimming:** `" one "` is invalid.
- **No aliases:** `"toOne"`, `"toMany"`, `"singular"`, `"collection"`, `"1"`, `"*"` are not valid.
- **No coercion or normalization.**
- The vocabulary is **closed for this RFC**; adding new `RelationMultiplicity` members requires a future explicit RFC.

### 4.1 Explicit non-meanings

`multiplicity` MUST NOT be interpreted as any of the following under this RFC:

| Non-meaning | Why deferred |
| --- | --- |
| Optional / required | Presence constraints are a separate dimension |
| Nullable / non-null | Value nullability is a separate dimension |
| `min` / `max` / ranges | Bounds are a separate, more expressive model |
| Direction / inverse | Navigation topology is separate |
| Join / FK / local fields | Persistence/mapping is separate |
| Load / fetch / query | Runtime access strategy is separate |
| Instance-count validation | Declared shape ≠ runtime data validity |

**Boundary (parallel to RFC-009 / RFC-010):** declaration of relationship shape ≠ runtime / external constraint enforcement.

## 5. Relation member model

Informative closed shape (conceptual; not a prescribed module export):

```ts
type RelationMultiplicity = 'one' | 'many';

interface Relation {
  name: string; // RelationName (RFC-008)
  target: ResourceIdentity; // RFC-010 / RFC-001
  multiplicity: RelationMultiplicity;
}
```

Normative member model:

```text
Relation {
  name: RelationName
  target: ResourceIdentity
  multiplicity: RelationMultiplicity
}
```

- A Relation MUST contain **exactly** the members `name`, `target`, and `multiplicity`. No additional members are permitted.
- `name` MUST be a valid `RelationName` (RFC-008).
- `target` MUST be a valid declarative `ResourceIdentity` under RFC-010 (RFC-001 rules under the **`user`** validation context).
- `multiplicity` MUST be a valid `RelationMultiplicity` (this RFC).
- Missing `multiplicity` is invalid.
- Members with additional properties (including premature `optional`, `nullable`, `min`, `max`, `direction`, local-field handles, etc.) are invalid (not ignored or stripped).
- Later RFCs may extend or amend the Relation model explicitly; such extensions do not become valid under this RFC merely because future evolution is anticipated. Unknown properties MUST NOT silently become part of Relation semantics.

### 5.1 Relation value equality

Two Relation **values** are equal if and only if:

1. their `name`s are exactly equal; and
2. their `target`s are equal under RFC-001 `ResourceIdentity` equality; and
3. their `multiplicity` values are exactly equal.

Changing only `multiplicity` makes two Relations unequal.

### 5.2 Interaction with the `relations` sequence (RFC-008)

| Rule | Statement |
| --- | --- |
| Order | Declaration order preserved; sequence equality remains order-sensitive (RFC-008), using RFC-011 Relation value equality at each index |
| Uniqueness | At most one Relation per `RelationName` (RFC-008) |
| Consequence | Two Relations with the same name and different multiplicity/targets cannot coexist in one collection, even though they are unequal as standalone Relation values |
| Same target, different names | Allowed |
| Same multiplicity across Relations | Allowed (multiplicity is per Relation, not globally unique) |
| Empty | Zero members still valid (RFC-008) |

## 6. Validation

`relations` validity remains part of Resource validity via the schema. Under this RFC, every member must satisfy the Relation contract in §5 in addition to RFC-008 sequence rules and RFC-010 target rules.

**Validate-before-snapshot:** Invalid candidates MUST be rejected before they can become Resource snapshot state. Implementations MUST NOT transform an invalid candidate into a valid Relation by discarding information (including stripping unknown properties or inventing a default `multiplicity`) before validation.

### 6.1 Conceptual failure causes

Concrete codes and TypeScript shapes are deferred; separation is normative:

| Cause | When |
| --- | --- |
| Invalid relation member | Non-object, missing required member (including missing `multiplicity`), extra member, or malformed member structure not attributable to a `RelationName`, `target` identity, or multiplicity vocabulary violation |
| Invalid relation name | `name` fails `RelationName` grammar (RFC-008) |
| Duplicate relation name | repeated `RelationName` in the sequence (RFC-008) |
| Invalid relation target | `target` is present but fails RFC-001 identity validation under the **`user`** validation context (RFC-010) |
| Invalid relation multiplicity | `multiplicity` is present but fails exact `RelationMultiplicity` membership (wrong type, unknown value, alias, trimmed/cased variant, etc.) |

- These remain Resource/schema validation failures, distinct from metadata, annotation, and field validation failures.
- No silent dropping, normalization, coercion, or defaulting of `multiplicity`.
- A separate public `validateRelations` / `validateRelationMultiplicity` API is **not** required by this RFC.
- This validates **declared relationship shape only**. It does **not** validate live related-instance counts.

**Invariant:** A Resource is valid only if its complete schema, including every Relation’s `name`, `target`, and `multiplicity`, is valid under RFC-008 + RFC-010 + this RFC.

## 7. Projection and adjacent contracts

1. **Relations / projection** — RFC-008 Relation projection non-participation remains unchanged. This RFC introduces no Relation→metadata contribution.
2. **Validation gate** — `projectResourceMetadata` continues to re-run Resource validation; Relations that fail §6 still fail projection.
3. **Annotations (RFC-006)** — unchanged.
4. **Fields (RFC-007 / RFC-009)** — unchanged; independent namespaces unchanged.
5. **Association target (RFC-010)** — declarative `target` rules unchanged; still RFC-001 `user` context.
6. **Operations** — remain empty-only until their RFC; unchanged by this RFC.

## 8. Compatibility / impact

| Concern | Impact |
| --- | --- |
| M3.7 `{ name, target }` Relations | **Breaking.** After Accept + implementation of this floor, missing `multiplicity` is invalid |
| Dual-shape period | **None.** No transitional acceptance of two-member Relations |
| Existing empty `relations` | Remains valid |
| RFC-008 collection rules | Unchanged (order, uniqueness-by-name, snapshot, independent namespaces) |
| RFC-010 target rules | Unchanged |
| Projection | Unchanged non-participation |
| Fields / operations / annotations | Unchanged |

Implementations that currently treat Relations as `{ name, target }` MUST widen the member contract only after this RFC is Accepted and an Accepted implementation plan exists.

## 9. Design rationale

- **Multiplicity after association** continues the RFC-008 → RFC-010 progression: identity → target → shape count dimension, without leaping to Operations or runtime behavior.
- **Closed binary `one` \| `many`** is the smallest contract that distinguishes singular vs collection relationship shape; bounds and optionality are deliberately not smuggled in.
- **Required third member** keeps the Relation closed and explicit; inventing a default multiplicity would be silent repair.
- **No optional/required / nullability** prevents coupling relationship shape to value constraints — those remain independent future RFCs.
- **No aliases / no min-max** keeps Design Review focused and avoids accidental enum sprawl.
- **Partial supersession of RFC-010 §5** makes the breaking widen unmistakable while retaining target and collection ownership.
- **Equality includes `multiplicity`** so a shape change is observable; uniqueness stays name-scoped so RFC-008’s collection model is not silently rewritten.
- **Dedicated Invalid relation multiplicity** preserves reject-don’t-repair discipline and keeps vocabulary errors separable from shape/target/name errors.

### Suggested progression (non-normative)

```text
RFC-008  Relation identity          { name }
        │
RFC-010  Association target         { name, target }
        │
RFC-011  Multiplicity (this RFC)    { name, target, multiplicity: one|many }
        │
Later    Optionality / nullability / bounds / direction / join / …
        │
Later    Resource Operations        (independent RFC)
```

## 10. Relationship to other RFCs and milestones

| RFC / milestone | Relationship |
| --- | --- |
| RFC-001 Resource Identity | Relied upon via RFC-010 for `target`; unchanged |
| RFC-005 Resource Model | Relied upon; schema member slot unchanged |
| RFC-006 Annotations | Relied upon for projection boundary; unchanged |
| RFC-007 / RFC-009 Fields | Unchanged; independent namespaces unchanged |
| RFC-008 Resource Relations | Collection semantics retained |
| RFC-010 Relation Association | **Partially superseded** (§5 Relation shape / Relation equality); target semantics retained |
| Later — optionality / nullability / min-max | Explicit constraint RFCs; MUST NOT be inferred from `"one"` / `"many"` |
| Later — direction / join / cascade / load / persistence / polymorphism | Explicit association-dimension RFCs |
| Later — Resource Operations | Empty-only until its RFC; independent of multiplicity |
| M3.8+ multiplicity implementation | Only after this RFC is Accepted and an Accepted implementation plan exists |

## 11. Document acceptance criteria (M2 → M3 Design Review)

This RFC may move from Draft to Accepted when Design Review finds:

1. The closed Relation shape is unambiguously exactly `{ name, target, multiplicity }` with `multiplicity: RelationMultiplicity`; missing `multiplicity` and extras are invalid.
2. `RelationMultiplicity` is unambiguously the closed set `"one" | "many"` by exact membership (case-sensitive; no trim/alias/coerce/normalize).
3. `"one"` means singular relationship shape and `"many"` means collection relationship shape — with optional/required, nullability, min/max, direction, joins, loading, persistence, and query semantics explicitly **not** implied.
4. Supersession of RFC-010 §5 (and related Relation equality / closed-member text) is explicit; RFC-010 target semantics and RFC-008 collection ownership remain.
5. Relation value equality (`name` **and** `target` **and** `multiplicity`) and uniqueness-by-name coexistence rules are unambiguous.
6. Conceptual failure causes distinguish Invalid relation multiplicity from Invalid relation member / target / name / duplicate causes; no silent repair or default `multiplicity`; no required public validate API.
7. Breaking compatibility vs M3.7 / two-member Relations is explicit; no dual-shape period.
8. Fields, Operations, projection, and association-target rules remain explicitly deferred or unchanged as stated.
9. No normative TypeScript API prescription beyond the conceptual Relation / `RelationMultiplicity` contracts.

## 12. Explicit deferrals

- Optional / required relationship presence
- Nullability
- `min` / `max` / UML ranges / open cardinality expressions
- Additional multiplicity values or aliases
- Direction, inverse relations, bidirectional pairing
- Local-field handles, foreign keys, join mapping
- Cascade behavior
- Loading / fetch / query semantics
- Persistence / ORM mapping
- Polymorphic targets / union targets
- Registry-backed resolution or existence checks
- Runtime instance-count validation against data
- Association → metadata projection
- Concrete TypeScript representation and public APIs
- Dual-shape migration helpers or adapters
- Resource Operations

## 13. Decision record

| Decision | Choice | Why |
| --- | --- | --- |
| Primary question | Relationship shape (singular vs collection) | Smallest delta after RFC-010 |
| Vocabulary | Closed `"one" \| "many"` | Binary; no alias sprawl |
| Member name | `multiplicity` | Names the dimension without implying ORM cardinality suites |
| Required? | Yes — required third member | Closed explicit contract; no defaulting |
| `"one"` meaning | Singular relationship shape only | No optionality/nullability smuggled |
| `"many"` meaning | Collection relationship shape only | Same |
| Bounds / optional / null | Deferred | Separate dimensions |
| Direction / join / load / persist | Deferred | Not relationship-shape |
| Relation shape | Exactly `{ name, target, multiplicity }` | Closed member; breaking widen |
| Compatibility | Breaking; no dual-shape | Honest migration |
| RFC-010 relationship | Partial supersession of §5 | Target retained; shape widened |
| Equality | `name` + `target` + `multiplicity` | Shape change observable |
| Uniqueness | By `RelationName` only | Preserve RFC-008 collection model |
| Invalid multiplicity | Dedicated conceptual cause | Separable from shape/target errors |
| Missing `multiplicity` | Invalid relation member | Required member absent |
| Projection | Unchanged | Out of scope |
| Operations | Unchanged / empty-only | Separate independent RFC |

## 14. Worked examples (conceptual)

```text
Resource {
  identity: { namespace: crm, name: Order }
  schema: {
    fields: [
      { name: total, type: number }          # RFC-009
    ]
    relations: [
      {
        name: customer
        target: { namespace: crm, name: Customer }
        multiplicity: one
      }
      {
        name: lineItems
        target: { namespace: crm, name: LineItem }
        multiplicity: many
      }
    ]
    operations: ∅
  }
  annotations: ∅
}

# Valid: unique RelationNames; targets declarative; multiplicity exact one|many
# projectResourceMetadata → no Relation contribution (unchanged)

# [ { name: customer, target: { namespace: crm, name: Customer } } ]
#   → invalid (missing multiplicity; Invalid relation member)
# [ { name: customer, target: { namespace: crm, name: Customer }, multiplicity: "one", optional: true } ]
#   → invalid (extra member; Invalid relation member)
# [ { name: customer, target: { namespace: crm, name: Customer }, multiplicity: "toOne" } ]
#   → invalid (Invalid relation multiplicity; alias)
# [ { name: customer, target: { namespace: crm, name: Customer }, multiplicity: "One" } ]
#   → invalid (Invalid relation multiplicity; case)
# [ { name: lineItems, target: { namespace: crm, name: LineItem }, multiplicity: "0..*" } ]
#   → invalid (Invalid relation multiplicity; bounds expression)
# [
#   { name: a, target: { namespace: crm, name: A }, multiplicity: one },
#   { name: a, target: { namespace: crm, name: A }, multiplicity: many }
# ]
#   → invalid (Duplicate relation name)
```

## 15. Implementation gate (non-normative)

Coding that requires Relation `multiplicity` or rejects two-member `{ name, target }` Relations under this contract begins only after:

1. this RFC is Accepted;
2. an Accepted implementation plan for the relevant M3 slice exists.

Prefer **one pull request per tracking issue** for that delivery slice (Accepted plan + implementation together). Do not merge a plan-only PR before code for the same slice except as recovery.

No production optional/required, nullability, min/max, direction/inverse, local-field/join, cascade, loading/fetch, persistence/ORM, polymorphic targets, registry resolution, association→metadata projection, or Operations widening SHALL be introduced under this RFC alone.
