# RFC-024: Direction / Joins — Relationship Traversal Semantics

**Date:** 2026-08-09  
**Status:** Accepted  
**M3:** Accepted (2026-08-09) — Design Review after return revision; no design blockers. Locks flat closed Relation widen with required `direction` (`outbound`\|`inbound`), optional declared counterpart `inverse` (bare `RelationName` on `target`), optional `{ local, remote }` `join` (binding identity only). When inverse resolves: counterpart exists, counterpart `target` = owning Resource, opposite direction; reciprocal inverse and mirrored joins not required. Resource-local vs optional multi-Resource validation layered; RFC-010 single-Resource independence preserved. Self-target uniform. Runtime/query/load and empty-vs-absent deferred. M4 authorized.  


**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#86](https://github.com/rexescario-dev/resource-forge/issues/86)  
**Depends on:** RFC-001 (Resource Identity — via Relation `target`), RFC-005 (Resource Model), RFC-007 (Resource Fields — `FieldName` / ordered `fields`), RFC-008 (Resource Relations — collection semantics retained), RFC-010 (Relation Association Semantics — `target` retained), RFC-011 (Relation Multiplicity — retained), RFC-013 (Field/Relation Optionality — `optional` retained), RFC-015 (Relation Nullability — current closed Relation floor; partially superseded here)  
**Followed by:** M3.21 implementation planning/delivery ([#87](https://github.com/rexescario-dev/resource-forge/issues/87)); empty-vs-absent / null elements; cascade; loading/fetch; persistence/ORM mapping; runtime traversal / query execution; Relation→metadata projection  
**Unblocks:** M3.21 direction/joins implementation planning (M4→M5), then implementation (M6)  

**Amends / supersedes:** RFC-015 Relation member shape (and related Relation equality / closed-member text) only. See §3. Does **not** reopen RFC-013 `optional` semantics, RFC-011 multiplicity meanings, RFC-010 `target` declarative association meaning, RFC-015 association-reference `nullable` meaning, or Field floors. Relaxes RFC-010’s absolute “no cross-Resource validation” boundary **only** for an optional multi-Resource validation context defined here (§7.2); ordinary single-Resource validity remains free of registry/target loading.

## Primary question

> What declarative **direction**, **inverse counterpart identity**, and **join-field binding** does a Relation declare so consumers can understand relationship traversal identity—without defining runtime traversal, query/load behavior, or empty/absent/null value-state semantics?

## Thesis

RFC-024 widens the closed Relation member floor with a **declarative relationship traversal model**:

- **`direction`** — required `"outbound" | "inbound"`; answers which way this Relation points.
- **`inverse`** — optional bare `RelationName` identifying a specific Relation on the declared `target` Resource; reciprocal declaration is **not** required.
- **`join`** — optional closed `{ local: FieldName; remote: FieldName }` identifying the local and target Fields participating in the declared association identity; independent of `inverse`.
- **Resolved-inverse counterpart identity** — when an `inverse` resolves in a multi-Resource validation context, the counterpart MUST (a) have the opposite `direction` and (b) declare `target` equal to this Relation’s owning Resource identity.
- **No runtime** — this RFC defines what a Relation means structurally; it does **not** define how a runtime traverses, loads, plans, filters, or optimizes it.
- **No value-state** — empty-vs-absent / null-element semantics remain deferred.

```text
Invariant:
  RFC-024 defines what a Relation means structurally;
  it does not define how a runtime traverses it.

Relation (after Accept + implementation of this floor)
├── name: RelationName
├── target: ResourceIdentity
├── multiplicity: RelationMultiplicity
├── optional: boolean
├── nullable: boolean
├── direction: RelationDirection          ← required
├── inverse?: RelationName                ← optional; on target
└── join?: { local: FieldName; remote: FieldName }  ← optional; independent of inverse
```

## 1. Scope

### 1.1 Goals

1. Introduce closed `RelationDirection = "outbound" | "inbound"` and require `direction` on every Relation.
2. Define optional `inverse` as a **declared counterpart identity**: a bare `RelationName` resolved against `target` (minimally qualified via existing `target`).
3. Define optional `join` as a closed local/remote `FieldName` pair identifying Fields that participate in the declared association identity.
4. Keep `direction`, `inverse`, and `join` as separate concerns (inverse does not imply join; join does not imply inverse; direction is not derived from inverse).
5. When a declared `inverse` resolves, require opposite `direction` **and** counterpart `target` equal to the owning Resource identity; do **not** require reciprocal `inverse` or mirrored joins.
6. Redefine the closed Relation shape and Relation value equality to include `direction` and any present `inverse` / `join`.
7. Define validation in two layers: Resource-local structural validity (always) and optional multi-Resource resolve validity (when target schemas are supplied).
8. Apply identical rules to self-target Relations (no special case).
9. Explicitly defer runtime traversal/query/load/optimization and empty-vs-absent / null elements.
10. Document the intentional breaking widen relative to the RFC-015 five-member Relation floor; no dual-shape compatibility period.

### 1.2 Non-goals

This RFC does not define:

1. Runtime traversal, navigation APIs, graph walking, or execution engines
2. Query planners, join algorithms, join optimization, SQL/ORM generation, or fetch plans
3. Loading / eager / lazy strategy; filtering / pagination during traversal
4. Cascade, delete/update rules, or ownership transfer
5. Empty-collection vs absent Relation representation; null elements in `many`; empty≡null
6. Persistence ownership, foreign-key semantics, or execution behavior derived from `join`; persistence / DB mapping
7. Composite join keys; positional multi-field pairing; direction-dependent join ownership shapes
8. Soft / warn-level validation for missing counterparts or mismatched directions
9. Mandatory `inverse` or mandatory `join` on every Relation
10. Mutual-inverse invariant (`A.inverse = B` ⇒ `B.inverse = A`)
11. Mirrored-join invariant (`A.join` and `B.join` must be field-wise mirrors)
12. Field type compatibility / coerce rules between `join.local` and `join.remote`
13. Polymorphic targets; registry-backed target existence (RFC-010 target remains declarative)
14. Relation → `ResourceMetadata` projection or any change to RFC-006 / RFC-023 projection participation
15. Changes to Field member floors; reopening multiplicity / optional / nullable meanings
16. Concrete TypeScript API names, modules, or error-code enums beyond informative shapes needed for a later Accepted plan
17. Dual-shape transitional validity (five-member Relations still accepted)

## 2. Terminology

| Term | Meaning |
| --- | --- |
| `RelationDirection` | Closed direction identity: exactly `"outbound"` or `"inbound"`; exact string equality |
| Direction | The Relation member that declares which way this Relation points |
| Inverse counterpart | The Relation on `target` identified by optional `inverse: RelationName` |
| Join handle / join mapping | Optional closed `{ local, remote }` identifying Fields participating in the declared association identity |
| Traversal identity | Declarative understanding of which relationship connects to which target and through which Fields — not a runtime walk |
| Resource-local validity | Relation structural rules enforceable from the owning Resource schema alone |
| Multi-Resource validation context | An optional validation boundary that supplies one or more additional Resource schemas (at least the `target`) so counterpart/field resolve checks can run |
| Declared counterpart identity | What `inverse` asserts when present: the Relation on `target` representing the reverse side of this association (opposite direction; counterpart `target` = owning Resource); does **not** imply reciprocal `inverse` |

RFC-008 / RFC-010 / RFC-011 / RFC-013 / RFC-015 terms (`RelationName`, `target`, `multiplicity`, `optional`, `nullable`, `relations`) and RFC-007 `FieldName` keep their existing meanings except where this RFC supersedes Relation shape and Relation equality.

## 3. Supersession / amendment of RFC-015

Once this RFC is **Accepted** and the corresponding implementation floor is adopted:

| Concern | Authority |
| --- | --- |
| Relation member shape | **RFC-024** (supersedes RFC-015 closed `{ name, target, multiplicity, optional, nullable }`) |
| Required `direction` / `RelationDirection` | **RFC-024** |
| Optional `inverse` / counterpart identity | **RFC-024** |
| Optional `join` / local-remote Field binding | **RFC-024** |
| Relation value equality | **RFC-024** |
| Relation member validity (shape + direction/inverse/join rules) | **RFC-024**, composed with retained upstream name/target/multiplicity/optional/nullable rules |
| Multi-Resource resolve checks for inverse/remote | **RFC-024** §7.2 (optional context; does not reopen registry-required Resource validity) |
| `RelationName` / ordered `relations` / uniqueness-by-name | RFC-008 |
| Declarative `target` / RFC-001 `user` context | RFC-010 (unchanged meaning) |
| `multiplicity` meanings | RFC-011 (unchanged) |
| `optional` meanings | RFC-013 (unchanged) |
| Association-reference `nullable` | RFC-015 (unchanged meaning) |
| Relation projection non-participation | RFC-008 (unchanged) |

RFC-015’s five-member `{ name, target, multiplicity, optional, nullable }` Relation contract is **no longer normative** after this supersession. Implementers MUST NOT combine the old five-member shape with the new required-`direction` contract as simultaneously valid.

This RFC does **not** rewrite RFC-008–RFC-015 wholesale.

**RFC-010 boundary note:** RFC-010 forbids ordinary owning-Resource validity from depending on loading/validating the target Resource. This RFC preserves that for **Resource-local** validation (§7.1). Cross-resolve rules in §7.2 apply only when a caller explicitly supplies a multi-Resource validation context; they do not require a registry and do not make snapshotting a Resource alone depend on target presence.

## 4. Direction

### 4.1 Vocabulary

```text
RelationDirection ::= "outbound" | "inbound"
```

- Exact membership; case-sensitive; no trim, alias, coerce, normalize, or default.
- `"outbound"` and `"inbound"` are intrinsic properties of each Relation declaration.
- Direction is **not** derived from `inverse` or `join`.

### 4.2 Meaning (declarative only)

| Value | Declares |
| --- | --- |
| `"outbound"` | This Relation points from the owning Resource toward `target` |
| `"inbound"` | This Relation points from `target` toward the owning Resource (declared on the owning Resource as an inbound edge) |

These meanings are structural labels for traversal identity. They do **not** imply FK ownership, persistence placement, load direction, or query strategy.

### 4.3 Required

Every Relation MUST include `direction: RelationDirection`. Missing `direction` is invalid. No implicit default to `"outbound"`.

## 5. Inverse counterpart identity

### 5.1 Representation

When present:

```text
inverse: RelationName
```

- Bare `RelationName` (RFC-008 grammar / equality).
- Resolved against the Relation’s declared `target` Resource — **not** against the owning Resource’s `relations` sequence (except when `target` is self, in which the owning Resource *is* the target and the same rules apply with no special case).
- No qualified `{ resource, relation }` inverse identity: `target` already supplies Resource qualification.

### 5.2 Presence and independence

- `inverse` is optional. A Relation MAY omit it.
- Presence of `inverse` does **not** require presence of `join`.
- Presence of `inverse` does **not** require the counterpart to declare `inverse` back.
- Absence of `inverse` does **not** imply absence of a conceptual back-edge in a domain model; it only means no counterpart identity is declared on this Relation.

### 5.3 Resolve rule (multi-Resource context)

When a multi-Resource validation context supplies the schema for `target`:

1. The named Relation MUST exist on that target schema (`RelationName` uniqueness-by-name, RFC-008).
2. That counterpart Relation’s `target` MUST equal this Relation’s **owning Resource identity** (RFC-001 equality).
3. That counterpart Relation’s `direction` MUST be the **opposite** of this Relation’s `direction` (`outbound ↔ inbound`).
4. No further requirements: counterpart `inverse`, counterpart `join`, multiplicity agreement, optional/nullable agreement, and join mirroring are **not** required by this RFC.

```text
Valid (asymmetric):
  Resource A
    relation rA: target = B, direction = outbound, inverse = rB
  Resource B
    relation rB: target = A, direction = inbound
    # rB.inverse absent — valid

Invalid once rB resolves (wrong counterpart target):
  Resource A
    relation rA: target = B, direction = outbound, inverse = rB
  Resource B
    relation rB: target = C, direction = inbound   # not A

Invalid once rB resolves (same direction):
  Resource A
    relation rA: target = B, direction = outbound, inverse = rB
  Resource B
    relation rB: target = A, direction = outbound
```

### 5.4 Non-implication

`A.inverse = B` MUST NOT be interpreted as requiring `B.inverse = A`. Mutual pairing remains an explicitly deferred stronger invariant. The counterpart-target and opposite-direction rules establish reverse-edge **identity**, not a bidirectional declaration contract.

## 6. Join mapping

### 6.1 Representation

When present:

```text
join: {
  local: FieldName
  remote: FieldName
}
```

- Closed object: exactly `local` and `remote`; both required when `join` is present.
- `local` identifies a Field on **this Relation’s owning Resource**.
- `remote` identifies a Field on the declared **`target` Resource**.
- Shape is identical for `"outbound"` and `"inbound"` Relations (no direction-dependent ownership packaging).

### 6.2 Presence and independence

- `join` is optional. A Relation MAY be structurally valid without an explicit field-level binding.
- Presence of `join` does **not** require presence of `inverse`.
- `join` identifies the local and target Fields participating in the declared association identity; it does **not** establish persistence ownership, foreign-key semantics, or execution behavior.

### 6.3 Resolve rules

**Resource-local (always, when `join` present):**

- `local` MUST be a valid `FieldName` (RFC-007 grammar).
- `local` MUST resolve to an existing Field on the owning Resource’s `fields` sequence.

**Multi-Resource context (when target schema supplied and `join` present):**

- `remote` MUST be a valid `FieldName`.
- `remote` MUST resolve to an existing Field on the target Resource’s `fields` sequence.

**Not required by this RFC:**

- `FieldType` equality or compatibility between `local` and `remote`
- Mirrored joins on an inverse counterpart
- Persistence ownership, foreign-key semantics, or execution behavior derived from which side is `local`

## 7. Validation

`relations` validity remains part of Resource validity via the schema for Resource-local rules. Under this RFC (after Accept + implementation), every Relation member must satisfy §8 in addition to retained upstream rules.

**Validate-before-snapshot:** Invalid candidates MUST be rejected before they can become Resource snapshot state. Implementations MUST NOT repair by inventing defaults, stripping unknown properties, synthesizing `direction`, or inferring `inverse` / `join`.

### 7.1 Resource-local conceptual failure causes

The table below names **semantic failure categories** that implementations MUST distinguish. Concrete public error codes, TypeScript unions, and API shape are deferred to implementation planning; category labels here are not required public identifiers.

| Category | When |
| --- | --- |
| Invalid relation member | Closed structural model failed and the failure is not attributable to a more specific category below (including unknown extra members) |
| Missing relation direction | `direction` absent |
| Invalid relation direction | `direction` present but not exact `"outbound"` \| `"inbound"` |
| Invalid relation inverse | `inverse` present but not a valid `RelationName` |
| Invalid relation join | `join` present but not the closed `{ local, remote }` shape with both members present |
| Invalid join local field name | `join.local` fails `FieldName` grammar |
| Unknown join local field | `join.local` does not resolve on the owning Resource |
| Invalid join remote field name | `join.remote` fails `FieldName` grammar (structural; existence may await §7.2) |
| Retained upstream causes | name / target / multiplicity / optional / nullable causes from RFC-008 / RFC-010 / RFC-011 / RFC-013 / RFC-015 |

**Shape-classification discipline (normative intent):**

- **Missing relation direction** applies when own key `direction` is absent and the candidate’s order-independent own key set is exactly the legacy five-member set `{ name, target, multiplicity, optional, nullable }`.
- Allowed own-key sets after Accept + implementation:
  - `{ name, target, multiplicity, optional, nullable, direction }`
  - that set ∪ `{ inverse }`
  - that set ∪ `{ join }`
  - that set ∪ `{ inverse, join }`
- A structurally invalid candidate that is not the legacy five-member missing-direction case and fails those allowed key sets (or otherwise fails closed-member rules) is **Invalid relation member** (or a more specific inverse/join cause), not “missing direction.”
- Inherited / prototype-derived `direction` / `inverse` / `join` do **not** satisfy the closed Relation contract.

Ordinary single-Resource validity **MUST NOT** require the target Resource schema to be loaded (RFC-010 spirit retained for Resource-local validation). Therefore Resource-local validation **MUST NOT** fail solely because `inverse` or `join.remote` cannot yet be resolved against a missing target schema.

### 7.2 Multi-Resource resolve validation (optional context)

When a validation context supplies the Resource schema for a Relation’s `target`:

| Category | When |
| --- | --- |
| Unknown inverse relation | `inverse` present but no Relation with that name exists on the target schema |
| Inverse target mismatch | `inverse` resolves but counterpart `target` is not equal to this Relation’s owning Resource identity |
| Inverse direction mismatch | `inverse` resolves but counterpart `direction` is not the opposite of this Relation’s `direction` |
| Unknown join remote field | `join` present but `remote` does not resolve on the target schema |

Category labels are semantic failure distinctions only (same discipline as §7.1); concrete public error codes remain deferred.

Rules for this context:

1. Fail closed — no warn-only mode.
2. Do not require reciprocal `inverse`.
3. Do not require mirrored joins.
4. Do not require target schema presence for ordinary Resource snapshot validity.
5. Self-target Relations use the same rules with the owning schema as the target schema when that context is supplied (including the common case where the owning schema is itself the supplied target).

Informative: an Accepted implementation plan MAY expose this as an explicit multi-Resource validation entrypoint; this RFC only requires the semantic separation and the failure categories above.

## 8. Relation member model

**Illustrative TypeScript shape (non-prescriptive)** — not an API requirement. Normative after Accept + implementation of this floor:

```ts
type RelationDirection = "outbound" | "inbound";

interface RelationJoin {
  local: FieldName;
  remote: FieldName;
}

interface Relation {
  name: RelationName;
  target: ResourceIdentity;
  multiplicity: RelationMultiplicity;
  optional: boolean;
  nullable: boolean;
  direction: RelationDirection;
  inverse?: RelationName;
  join?: RelationJoin;
}
```

Normative member model (same timing):

```text
Relation {
  name: RelationName
  target: ResourceIdentity
  multiplicity: RelationMultiplicity
  optional: boolean
  nullable: boolean
  direction: RelationDirection
  inverse?: RelationName
  join?: {
    local: FieldName
    remote: FieldName
  }
}
```

- Required members: `name`, `target`, `multiplicity`, `optional`, `nullable`, `direction`.
- Optional members: `inverse`, `join` — exact presence is structural (no defaults; omitted means absent).
- No additional members are permitted.
- `direction` MUST be exact `"outbound"` or `"inbound"`.
- When `inverse` is present, it MUST be a valid `RelationName`.
- When `join` is present, it MUST be exactly `{ local, remote }` with both `FieldName` values.
- Members with additional properties are invalid (not ignored or stripped).

### 8.1 Relation value equality

Two Relation **values** are equal if and only if:

1. their `name`s are exactly equal; and
2. their `target`s are exactly equal (RFC-001); and
3. their `multiplicity` values are exactly equal; and
4. their `optional` values are exactly equal; and
5. their `nullable` values are exactly equal; and
6. their `direction` values are exactly equal; and
7. either both omit `inverse`, or both include `inverse` with exactly equal `RelationName`s; and
8. either both omit `join`, or both include `join` with exactly equal `local` and exactly equal `remote`.

Changing only `direction`, only `inverse` presence/value, or only `join` presence/value makes two Relations unequal. Collection uniqueness remains **by name only** (RFC-008).

### 8.2 Self-target Relations

A Relation’s `target` MAY equal the owning Resource’s identity (RFC-010). This RFC applies **exactly the same** direction / inverse / join rules with **no** special self-relation syntax, implicit self-inverse, automatic reciprocal `inverse`, or special equality behavior.

## 9. Orthogonality retained

| Dimension | Owner | Interaction with RFC-024 |
| --- | --- | --- |
| `target` | RFC-010 | Unchanged declarative association identity |
| `multiplicity` | RFC-011 | Unchanged; orthogonal to direction/inverse/join |
| `optional` | RFC-013 | Unchanged; orthogonal |
| `nullable` | RFC-015 | Unchanged association-reference nullability; orthogonal |
| Projection | RFC-008 / RFC-006 / RFC-023 | Relations still do not contribute projection entries |
| Empty/absent/null elements | Later | Deferred; not implied by direction/join |

## 10. Worked examples (informative)

### 10.1 Outbound with inverse and join

```text
Resource Order
  fields: [ { name: customerId, ... } ]
  relations:
    - name: customer
      target: (crm, Customer)
      multiplicity: "one"
      optional: false
      nullable: false
      direction: "outbound"
      inverse: orders
      join: { local: customerId, remote: id }

Resource Customer
  fields: [ { name: id, ... } ]
  relations:
    - name: orders
      target: (crm, Order)
      multiplicity: "many"
      optional: true
      nullable: false
      direction: "inbound"
      # inverse omitted — valid
      # join omitted — valid
```

Multi-Resource context: `Order.customer.inverse → Customer.orders` resolves; `Customer.orders.target = Order`; directions opposite → valid.

### 10.2 Same-direction inverse (invalid when resolved)

```text
Resource A
  relation rA: target = B, direction = "outbound", inverse = "rB"
Resource B
  relation rB: target = A, direction = "outbound"
```

Multi-Resource context → **Inverse direction mismatch**.

### 10.3 Inverse with wrong counterpart target (invalid when resolved)

```text
Resource A
  relation bs: target = B, direction = "outbound", inverse = "as"
Resource B
  relation as: target = C, direction = "inbound"   # not A
```

`A.bs.inverse → B.as` exists and directions are opposite, but `B.as.target ≠ A` → **Inverse target mismatch**.

### 10.4 Direction without join/inverse (valid)

```text
{ name: tags, target: (crm, Tag), multiplicity: "many",
  optional: true, nullable: false, direction: "outbound" }
```

Structurally valid Resource-locally. No field binding and no counterpart identity declared.

### 10.5 Self-target (no special case)

```text
Resource Node
  fields: [ { name: parentId, ... }, { name: id, ... } ]
  relations:
    - name: parent
      target: (app, Node)
      multiplicity: "one"
      optional: true
      nullable: true
      direction: "outbound"
      inverse: children
      join: { local: parentId, remote: id }
    - name: children
      target: (app, Node)
      multiplicity: "many"
      optional: true
      nullable: false
      direction: "inbound"
```

Same resolve rules (counterpart exists, counterpart `target` = owning Resource, opposite direction); no implicit `children.inverse = parent`.

## 11. Rationale

- **Required explicit `direction`** avoids silent defaults and keeps outbound/inbound as first-class declaration data.
- **Optional declared counterpart identity** records reverse-edge identity when known without forcing bidirectional contracts.
- **Counterpart targets owning Resource + opposite direction on resolve** are the minimum identity rules for “inverse” to mean the reverse side of the association—without escalating to mutual `inverse`.
- **Local+remote join pair** makes declared association-field identity complete without composite keys or execution semantics.
- **Optional `join`** preserves Relations that are directionally meaningful before field bindings are known.
- **Layered validation** keeps RFC-010’s single-Resource independence while enabling fail-closed counterpart checks when schemas are co-validated.
- **No self-target special case** prevents a second semantic model for the same declaration shape.
- **Breaking closed widen** matches M3 Relation floor discipline (no dual-shape).

## 12. Relationship to other RFCs and milestones

| RFC / milestone | Relationship |
| --- | --- |
| RFC-001 Resource Identity | Relied upon via `target` |
| RFC-005 Resource Model | Relied upon; schema validation ownership retained |
| RFC-007 Fields | Relied upon for `FieldName` / `fields` resolve of `join.local` / `join.remote` |
| RFC-008 Relations | Collection / uniqueness / projection non-participation retained |
| RFC-010 Association | `target` retained; absolute no-cross-validate boundary refined by optional §7.2 context only |
| RFC-011 Multiplicity | Retained; orthogonal |
| RFC-013 Optionality | Retained; orthogonal |
| RFC-015 Relation Nullability | **Superseded** for Relation member shape / equality only; `nullable` meaning retained |
| RFC-022 / RFC-023 | Orthogonal; no projection emitter authorization |
| Later — Empty-vs-absent / null elements | Explicitly deferred |
| Later — Runtime traversal / load / query | Explicitly deferred |
| Later — Mutual inverse / mirrored join invariants | Explicitly deferred stronger consistency options |

### Suggested sequence (non-normative)

```text
RFC-015            Relation floor { name, target, multiplicity, optional, nullable }
        │
RFC-024            Direction / joins (declarative traversal identity)  ← this RFC (Accepted)
        │
Later              Empty-vs-absent / null elements
        │
Later              Runtime traversal / load / persistence mapping
```

## 13. Document acceptance criteria (M2 → M3 Design Review)

This RFC may move from Draft to Accepted when Design Review finds:

1. Closed Relation shape is unambiguously the flat widen with required `direction` and optional `inverse` / `join` as specified in §8 (after Accept + implementation of this floor).
2. `inverse` is declared counterpart identity on `target` (bare `RelationName`); when resolved, counterpart `target` MUST equal the owning Resource identity and counterpart `direction` MUST be opposite; reciprocal `inverse` is not required.
3. `join` is optional closed `{ local, remote }`; independent of `inverse`; identical for both directions; binding-identity only (no composites / no persistence ownership / no execution semantics).
4. Validation layering is clear: Resource-local vs optional multi-Resource resolve context; no warn-only mode; no registry mandate for ordinary Resource validity.
5. Self-target has no special case.
6. Runtime traversal/query/load/optimization and empty-vs-absent / null elements remain deferred (§1.2).
7. Supersession is limited to the RFC-015 Relation member floor (and related equality / closed-member text); upstream meanings for target/multiplicity/optional/nullable are not reopened.
8. Breaking widen vs five-member Relations is explicit; no dual-shape period.

## 14. Deferred concerns ledger

Deferred concerns are listed in §1.2. This ledger restates that mutual-inverse invariants, mirrored-join invariants, join FieldType compatibility, runtime traversal/query/load/cascade/persistence, empty-vs-absent / null elements, Relation projection contribution, and concrete public TypeScript error unions remain out of scope unless a future RFC explicitly defines them.

## 15. Packaging note (non-normative)

Prefer **one pull request per tracking issue** for the M3.21 delivery slice (Accepted plan + implementation together) under [#87](https://github.com/rexescario-dev/resource-forge/issues/87). This RFC is **Accepted**; do not begin M6 until an Accepted implementation plan exists.
