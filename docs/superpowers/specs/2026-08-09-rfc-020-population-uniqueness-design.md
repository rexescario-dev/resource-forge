# RFC-020: Population Uniqueness

**Date:** 2026-08-09  
**Status:** Accepted  
**M3:** Accepted (2026-08-09) — Design Review; no remaining design blockers after clarifications. Approach A retained. Occupancy provider scoped per `unique` Constraint (independent key spaces). Existing-key collection is conceptual membership under §7.5 (not ECMAScript `Set` identity). Missing occupancy classified as **invalid invocation / host-contract precondition failure**, not a uniqueness constraint violation. Composite `unique` allows **heterogeneous** `FieldType` (per-element equality; not an RFC-019 homogeneity carry-over). Intra-instance skip of `unique` strengthened. Terminology standardized on **occupancy surface**. Closed-shape wording clarified. Occupancy forms are conceptual answers to “is occupied?”, not a mandated dual-adapter core API.  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#74](https://github.com/rexescario-dev/resource-forge/issues/74)  
**Depends on:** RFC-001 (Resource Identity — via Resource), RFC-005 (Resource Model — aggregate / schema), RFC-007 (Resource Fields — `FieldName` / ordered `fields`), RFC-009 (Resource Field Types — `FieldType` ∈ {string, number, boolean}), RFC-013 / RFC-014 (Field optionality / nullability — relied upon for runtime gates), RFC-016 (Constraints framework — packaging retained), RFC-017 (Concrete Constraint Kinds — specialized here for population uniqueness), RFC-018 (Runtime Constraint Enforcement — field-value map / order / fail-fast / gates retained for intra-instance kinds), RFC-019 (Intra-Instance Cross-Member Constraints — `field` / `fields` targeting pattern and equality relation retained; population uniqueness was deferred here)  
**Followed by:** Persistence / ORM / SQL `UNIQUE` mapping (host concern); Relation-targeted constraints; Field-local constraint slots; additional population operators (partial unique, filtered unique, deferrable unique, etc.) only if a future RFC justifies them; wire / serialization; Operation kind / signature / execution; annotation vocabulary; richer projection; direction / joins; empty-vs-absent / null elements for Relations  
**Unblocks:** M3.x population-uniqueness implementation planning (M4→M5), then implementation (M6), after this RFC is Accepted — not implementation by itself  
**Amends / specializes:** RFC-017 / RFC-019 closed `ConstraintKind` vocabulary by adding `unique`. Amends RFC-018 / RFC-019 evaluation coverage so intra-instance `checkConstraintValues` **does not** evaluate `unique`, and a **separate** population check surface evaluates `unique` against a host **occupancy provider** scoped by Constraint. Does **not** reopen RFC-016 packaging, member-local `range` / `pattern` / `enum` shapes, or cross-member `distinct` / `equal` contracts (including RFC-019’s homogeneous-target rule for `distinct` / `equal`). Does **not** prescribe store engines.

## Primary question

> How is **population uniqueness** declared on a Resource and checked against a host **occupancy surface**—reusing the single `constraints` vocabulary—without folding population state into `checkConstraintValues` or inventing persistence / query semantics in `core`?

## Thesis

RFC-020 extends the constraint stack with **population uniqueness** only:

- Packaging remains the single RFC-016 `ResourceSchema.constraints` sequence.
- `ConstraintKind` gains one closed kind: **`unique`**.
- Targeting reuses the established split:
  - **Single-field** uniqueness: required `field: FieldName` (member-local targeting shape).
  - **Composite** uniqueness: required `fields: FieldName[]` with `length >= 2` (cross-member targeting shape).
- Declaration validates shape and resolve. Composite targets require unique names within `fields`; target `FieldType`s **MAY be heterogeneous** (unlike RFC-019 `distinct` / `equal`).
- **Evaluation surfaces split** at the instance-vs-population boundary:
  - Intra-instance surface (`checkConstraintValues`) evaluates `range` / `pattern` / `enum` / `distinct` / `equal` only; when it encounters `unique`, it **skips** that Constraint. Presence of `unique` MUST NOT cause this surface to fail solely because population state was not supplied.
  - Population surface (informative name: `checkPopulationUniqueness`) evaluates **only** `unique` Constraints against a candidate field-value map **plus** a host **occupancy provider** that yields an **occupancy surface** for each evaluated Constraint.
- Occupancy answers the question “is this uniqueness key taken?” for that Constraint’s declared target. Hosts MAY realize an occupancy surface via a conceptual **existing-key collection** or an **occupancy probe**; both are answers to the same question, not a required dual public API in `core`.
- Key identity uses the same scalar equality relation as RFC-018 `enum` / RFC-019 `distinct` / `equal` (`===` for numbers, including `-0`/`0`), applied **per tuple element according to that element’s FieldType**. No coercion across types or positions.
- Persistence engines (SQL `UNIQUE`, registries, indexes, ORMs) are **host implementations** behind occupancy — not part of this RFC’s contract.

```text
ResourceSchema.constraints  (RFC-016 packaging retained)
└── Constraint
    ├── member-local (RFC-017 retained)
    │   ├── { name, kind: "range",   field, … }
    │   ├── { name, kind: "pattern", field, … }
    │   └── { name, kind: "enum",    field, … }
    ├── cross-member (RFC-019 retained)
    │   ├── { name, kind: "distinct", fields }
    │   └── { name, kind: "equal",    fields }
    └── population (this RFC)
        ├── { name, kind: "unique", field }            # single-field
        └── { name, kind: "unique", fields }           # composite (≥2; types MAY differ)

Runtime surfaces (split):
  checkConstraintValues
      — Resource + candidate map only; skips unique
  checkPopulationUniqueness
      — Resource + candidate map + occupancy provider (Constraint → occupancy surface)
      — unique only

candidate map
     │
     ▼
key extraction  →  uniqueness key
     │
     ▼
occupancy surface (for that Constraint)
     │
     ▼
occupied / not occupied
```

**Cut recorded on [#74](https://github.com/rexescario-dev/resource-forge/issues/74):** Approach **A** — closed `unique` in the existing `constraints` sequence; declaration unified; evaluation surfaces split at the instance-vs-population boundary.

## 1. Scope

### 1.1 Goals

1. Define **population uniqueness** as “the uniqueness key extracted for this `unique` Constraint MUST NOT already be occupied under that Constraint’s host occupancy surface.”
2. Extend closed `ConstraintKind` to `"range" | "pattern" | "enum" | "distinct" | "equal" | "unique"`.
3. Define closed declaration shapes for `unique` with either `field` (single) or `fields` (composite, `length >= 2`) — never both.
4. Require resolve against the Resource’s `fields` sequence; for composite targets, unique names within `fields`. Heterogeneous target `FieldType`s are allowed.
5. Lock the architectural split: **declaration stays unified; evaluation surfaces split** (§3, §7).
6. Define the population runtime surface: candidate field-value map + **occupancy provider** scoped by Constraint (§7).
7. Define key extraction / gates for single-field and composite `unique` (reuse RFC-018 / RFC-019 gate spirit) (§7.3–§7.4).
8. Define deterministic conceptual failure causes, distinguishing **constraint-enforcement** failures from **invalid-invocation / host-contract** failures (§6, §7.2, §8).
9. Preserve projection non-participation and Field / Relation / Operation declaration floors.
10. Explicitly keep persistence / SQL / ORM / registry engines out of scope as host concerns (§1.2).

### 1.2 Non-goals

This RFC does not define:

1. SQL `UNIQUE` indexes, query planners, ORM mapping, database dialects, or store-specific uniqueness engines
2. Folding population state, key collections, or probes into `checkConstraintValues`
3. A full Resource instance / aggregate value model, instance identity lifecycle, or upsert semantics beyond host responsibility for occupancy
4. Automatic “exclude self on update” rules inside `core` — hosts MUST supply occupancy answers that already reflect whether the candidate’s own prior key counts as occupied
5. Partial / filtered / deferred / conditional uniqueness; uniqueness over Relations; uniqueness across Resource types
6. A generic operator / `spec` / payload bag
7. Changes to RFC-016 packaging (`constraints` sequence, `ConstraintName`, namespaces, projection non-participation)
8. Changes to member-local `range` / `pattern` / `enum` or cross-member `distinct` / `equal` declaration / evaluation contracts beyond coexistence with `unique` (RFC-019 homogeneous targets for `distinct` / `equal` remain unchanged)
9. Reopening inclusive `range`, ECMAScript `pattern`, or `enum` / `distinct` / `equal` equality rules
10. Wire / serialization of Constraints, keys, or enforcement results
11. Concrete TypeScript API names, modules, or error-code enums (conceptual separation only; informative names may appear)
12. A requirement that `core` expose both collection-membership and probe adapters as first-class public APIs — only the occupancy question is normative
13. Runtime enforcement of Relations, Operations, or Annotations
14. Operation kind / signature / execution; annotation vocabulary; richer projection; direction / joins; empty-vs-absent / null elements

## 2. Terminology

| Term | Meaning |
| --- | --- |
| Population uniqueness | Rule that a uniqueness key extracted from a candidate field-value map MUST NOT already be occupied under the host occupancy surface for that `unique` Constraint |
| Occupancy surface | Host-supplied answer to “is this uniqueness key taken?” for **one** evaluated `unique` Constraint |
| Occupancy provider | Host-supplied mapping from each evaluated `unique` Constraint to that Constraint’s occupancy surface |
| Existing-key collection | A **conceptual** collection of uniqueness keys already occupied for one `unique` Constraint; membership MUST use §7.5 equality (not ECMAScript `Set` / reference identity) |
| Occupancy probe | A host function `(key) → occupied: boolean` answering occupancy for one `unique` Constraint |
| Uniqueness key | The scalar (single-field) or ordered tuple of scalars (composite) extracted from the candidate map after gates — the key-domain value checked for occupancy |
| Intra-instance surface | RFC-018 / RFC-019 `checkConstraintValues` — one candidate field-value map; no population input |
| Population surface | This RFC’s population check — candidate map + occupancy provider; evaluates `unique` only |
| Constraint-enforcement failure | Fail-fast failure from gates or “key occupied” while evaluating under a valid host contract |
| Invalid invocation / host-contract failure | Population check called without a usable occupancy surface for a Constraint that reached occupancy evaluation — **not** a uniqueness constraint violation |
| Skip | Constraint is not kind-evaluated / not occupancy-checked; does not produce a failure by itself |
| Fail-fast | Stop at the first deterministic constraint-enforcement violation in `constraints` order (within the active surface) |

RFC-016 / RFC-017 / RFC-018 / RFC-019 terms keep their existing meanings except where this RFC amends `ConstraintKind` and evaluation-surface coverage for `unique`.

## 3. Relationship to existing floors

| Concern | Authority |
| --- | --- |
| `constraints` packaging / names / order / projection | RFC-016 (unchanged) |
| Member-local kinds + `field` targeting | RFC-017 (unchanged shapes) |
| Cross-member `distinct` / `equal` + `fields` targeting + homogeneous targets | RFC-019 (unchanged) |
| Intra-instance runtime map / gates / fail-fast | RFC-018 / RFC-019 (retained; **does not evaluate `unique`**) |
| Closed `ConstraintKind` vocabulary | **Extended** by this RFC (`unique`) |
| Population uniqueness declaration + population runtime surface | **This RFC** |
| Persistence / SQL / ORM uniqueness engines | Host / later mapping RFCs (not this RFC) |

**Architectural lock:** Declaration stays unified in `constraints`. Evaluation surfaces split at the instance-vs-population boundary. Population state MUST NOT be smuggled into the intra-instance surface.

**Invariant:** Population enforcement **reuses** declared `unique` Constraints; it MUST NOT invent kinds, rewrite shapes, or accept declaration-invalid Resources as a substitute for declaration validation.

**Invariant (occupancy scoping):** Each evaluated `unique` Constraint has an **independently scoped** occupancy surface whose key space corresponds **exactly** to that Constraint’s declared target (`field` or `fields` in declaration order). Occupancy MUST NOT be an undifferentiated Resource-wide or shape-alike key bag shared across distinct `unique` Constraints.

## 4. Closed ConstraintKind vocabulary (amended)

```text
ConstraintKind ::= "range" | "pattern" | "enum" | "distinct" | "equal" | "unique"
```

| Rule | Statement |
| --- | --- |
| Closed | Only the six literals above are valid `kind` values |
| Exclusive | Any other `kind` is invalid |
| Exact equality | Case-sensitive exact string equality; MUST NOT trim, case-fold, normalize, or alias |
| No escape hatch | Unknown kinds are not accepted |
| No registry | Vocabulary is defined by Accepted RFCs; no external registration pathway |
| No operator bag | `unique` is an explicit kind — not a parameter of a generic uniqueness / operator kind |

**Breaking change (prominent):** Once Accepted and implemented, schemas valid under the RFC-019 five-kind floor remain valid. Schemas that relied on inventing open strings for population uniqueness remain invalid (they already were). New valid schemas MAY use `unique`. Implementations that hard-code the five-kind union MUST widen to six kinds.

## 5. Kind-discriminated Constraint members

### 5.1 Targeting rule (amends RFC-019 §5.1)

| Kind class | Targeting property | Forbidden |
| --- | --- | --- |
| Member-local: `range`, `pattern`, `enum` | Required `field: FieldName` | Declaring `fields` |
| Cross-member: `distinct`, `equal` | Required `fields: FieldName[]` (`length >= 2`) | Declaring `field` |
| Population: `unique` | Exactly one of: `field: FieldName` **or** `fields: FieldName[]` (`length >= 2`) | Declaring both; declaring neither; `fields` with length 0 or 1 |

Common properties for every Constraint:

| Property | Rule |
| --- | --- |
| `name` | Valid `ConstraintName`; unique within `constraints` (RFC-016) |
| `kind` | Exact `ConstraintKind` literal for that arm |

Multiple Constraints MAY target overlapping Fields. Collection uniqueness remains by `ConstraintName` only.

### 5.2 Retained kinds

RFC-017 member-local arms and RFC-019 `distinct` / `equal` arms remain authoritative. This RFC does not amend those arms except by coexistence in the widened `ConstraintKind` union. In particular, RFC-019’s **homogeneous** `FieldType` requirement for `distinct` / `equal` is **not** carried over to `unique`.

### 5.3 `unique` — single-field

```text
UniqueFieldConstraint {
  name: ConstraintName
  kind: "unique"
  field: FieldName
}
```

Declaration rules:

1. `field` MUST be present and MUST be a valid `FieldName` string.
2. `field` MUST resolve to an existing Field in the same Resource’s `fields` sequence.
3. `fields` MUST NOT be present.
4. No additional Constraint properties are part of this RFC’s declaration shape.

**Runtime intent (normative in §7):** after gates, the candidate’s scalar for `field` MUST NOT be occupied under the occupancy surface for this Constraint.

### 5.4 `unique` — composite

```text
UniqueFieldsConstraint {
  name: ConstraintName
  kind: "unique"
  fields: ordered sequence of FieldName   # length >= 2
}
```

Declaration rules:

1. `fields` MUST be present and MUST be a sequence.
2. `fields.length` MUST be `>= 2`.
3. Every element MUST be a valid `FieldName` string.
4. Names within `fields` MUST be unique (exact string equality); duplicates are invalid.
5. Every name MUST resolve to an existing Field in the same Resource’s `fields` sequence.
6. Resolved target Fields **MAY** have different `FieldType` values (heterogeneous composites allowed).
7. `field` MUST NOT be present.
8. No additional Constraint properties are part of this RFC’s declaration shape.

**Runtime intent (normative in §7):** after gates, the ordered tuple of scalars for `fields` MUST NOT be occupied under the occupancy surface for this Constraint.

### 5.5 Informative TypeScript shape

```ts
type ConstraintKind =
  | "range" | "pattern" | "enum" | "distinct" | "equal" | "unique";

type Constraint =
  | { name: ConstraintName; kind: "range"; field: FieldName; min?: number; max?: number }
  | { name: ConstraintName; kind: "pattern"; field: FieldName; pattern: string }
  | { name: ConstraintName; kind: "enum"; field: FieldName; values: ReadonlyArray<string | number | boolean> }
  | { name: ConstraintName; kind: "distinct"; fields: readonly FieldName[] }
  | { name: ConstraintName; kind: "equal"; fields: readonly FieldName[] }
  | { name: ConstraintName; kind: "unique"; field: FieldName }
  | { name: ConstraintName; kind: "unique"; fields: readonly FieldName[] };
```

## 6. Declaration-time validation

Population-uniqueness validity is part of Resource validity via the schema (same ownership as RFC-016 / RFC-017 / RFC-019).

A Resource’s `constraints` sequence is valid only if all RFC-016 / RFC-017 / RFC-019 rules still hold for packaging and retained arms, **and**:

1. Every `kind` is one of the six `ConstraintKind` literals.
2. Every `unique` member satisfies §5.3 or §5.4.
3. No Constraint declares both `field` and `fields`.
4. Targeting shape rules in §5.1 hold for all kinds.

Invalid `constraints` → invalid Resource. **Validate-before-snapshot.** No silent repair (no promoting `fields: [x]` to `field`, no inventing missing names, no coercing types).

### 6.1 Additional / specialized conceptual causes

| Cause | When |
| --- | --- |
| Unknown constraint kind | `kind` not in the six-literal vocabulary |
| Missing constraint field | Single-field `unique` (or member-local kind) omits `field` |
| Missing constraint fields | Composite `unique` (or cross-member kind) omits `fields` |
| Invalid constraint fields | `fields` present but not a sequence, empty, length 1 (for kinds that require `>= 2`), or contains non-`FieldName` elements |
| Duplicate constraint field target | Duplicate `FieldName` within one Constraint’s `fields` |
| Unresolved constraint field | A name in `field` / `fields` does not resolve |
| Invalid constraint targeting shape | Both `field` and `fields` present; or the wrong targeting property for the kind |

Note: **Heterogeneous constraint field types** remains a declaration cause for RFC-019 `distinct` / `equal` only. It is **not** a declaration failure for composite `unique`.

Concrete codes / TypeScript unions remain deferred to implementation planning; **separation** of these causes is normative.

## 7. Runtime evaluation

### 7.1 Surface split (normative)

| Surface | Informative name | Inputs | Kinds evaluated | `unique` |
| --- | --- | --- | --- | --- |
| Intra-instance | `checkConstraintValues` | Declaration-valid Resource + field-value map | `range`, `pattern`, `enum`, `distinct`, `equal` | **Skip** when encountered |
| Population | `checkPopulationUniqueness` | Declaration-valid Resource + field-value map + **occupancy provider** (`unique` Constraint → occupancy surface) | `unique` only | Evaluated |

Rules:

1. The intra-instance surface MUST NOT accept occupancy providers, collections, probes, stores, or other population state.
2. **Presence of a `unique` Constraint MUST NOT cause `checkConstraintValues` to fail solely because population state was not supplied.** Encountering `unique` is a **skip**, not a missing-occupancy failure.
3. The population surface MUST NOT re-evaluate intra-instance kinds (`range` / `pattern` / `enum` / `distinct` / `equal`); when it encounters those kinds while walking `constraints`, it **skips** them.
4. Both surfaces walk `constraints` in declaration order. The population surface is **fail-fast** for constraint-enforcement failures it evaluates.
5. Empty `constraints`, or a sequence with no kinds relevant to the active surface, succeeds for that surface.
6. Hosts that need both classes of rules MUST call **both** surfaces (order between the two calls is a host policy; this RFC does not mandate a combined API).

### 7.2 Occupancy provider and occupancy surface

**Population evaluation input** =

1. declaration-valid Resource, and  
2. candidate field-value map, and  
3. occupancy provider scoped by Constraint.

**Invariant (restated):** For each evaluated `unique` Constraint `C`, the provider yields an independently scoped occupancy surface `O_C` whose key space corresponds exactly to `C`’s declared target. Example: `unique(field: "email")` and `unique(field: "username")` MUST NOT share an undifferentiated key bag. Likewise `unique(fields: ["tenant", "email"])` and `unique(fields: ["tenant", "username"])` are distinct key spaces.

An occupancy surface answers a single question for key `k`: **occupied?** Hosts MAY realize that answer using either of these **conceptual** forms (informative; not a mandated dual core API):

| Conceptual form | Membership / answer rule |
| --- | --- |
| Existing-key collection | Conceptual collection of uniqueness keys already occupied for `C`. Candidate `k` is occupied iff some collection element equals `k` under §7.5. This is **not** an ECMAScript `Set` identity contract; structural / value equality is required for composite tuples. |
| Occupancy probe | Function `isOccupied(k) → boolean`. Candidate `k` is occupied iff the probe returns `true`. |

Normative requirements:

1. Exactly one occupancy answer is required per evaluated `unique` Constraint that reaches §7.6.
2. The host is responsible for population scope (which instances count) and for update/upsert self-exclusion. `core` does not track instance identity.
3. This RFC does **not** require a global multi-Constraint key store; occupancy is **per Constraint**.
4. Persistence engines MAY back `O_C`; their mechanism is out of scope.
5. Concrete public API shape (single `isOccupied` callback, provider map, helpers that adapt collections, etc.) is deferred to M4 — only the Constraint-scoped occupancy question is locked here.

#### 7.2.1 Missing occupancy — invalid invocation (not a constraint violation)

If the host fails to provide a usable occupancy surface for a `unique` Constraint that reaches occupancy evaluation (gates continued → §7.6), the population check ends as an **invalid invocation / host-contract precondition failure** with cause **Missing occupancy surface**.

Classification lock:

| Class | Includes | Must NOT be confused with |
| --- | --- | --- |
| Constraint-enforcement failure | Gate failures; **Unique constraint violated** (key occupied) | Missing occupancy |
| Invalid invocation / host-contract failure | **Missing occupancy surface** | “Key occupied” uniqueness violation |

Implementations MUST keep these distinguishable in the result contract (separate result arm, error class, or equivalent). Missing occupancy MUST NOT be reported as **Unique constraint violated**.

### 7.3 Key extraction — single-field `unique`

For Constraint `C` with `kind === "unique"` and `field: F`:

1. Apply RFC-018 §5.1–§5.2 presence / null / type gates to Field `F` and the map entry for `F.name`.
2. If gate result is **fail** → constraint-enforcement failure with that gate’s cause (diagnostics identify `F.name` and Constraint identity).
3. If gate result is **skip** → **skip** Constraint `C` (no occupancy check).
4. If gate result is **continue** → uniqueness key `k` is the present non-null scalar (**no coercion**). Proceed to §7.6.

### 7.4 Key extraction — composite `unique`

For Constraint `C` with `kind === "unique"` and `fields: [F1, …, Fn]` (`n >= 2`):

Apply the RFC-019 §7.2 multi-field gate procedure (gate-order; fail-fast on gate fail; skip terminates immediately; continue collects without coercion).

- On gate **fail** → constraint-enforcement failure with that gate’s cause.
- On gate **skip** → **skip** Constraint `C`.
- On all **continue** → uniqueness key `k` is the ordered tuple `(v1, …, vn)` where each `vi` retains its Field’s scalar type (**no coercion** across positions). Proceed to §7.6.

### 7.5 Key equality

Scalar equality is the RFC-019 §7.3 / RFC-018 `enum` relation, applied using the **declared `FieldType` of that target Field**:

| `FieldType` | Equal iff |
| --- | --- |
| `string` | Case-sensitive exact string equality |
| `number` | ECMAScript `===` (`-0` / `0` equal). Non-finite numbers never reach key extraction (type gate). |
| `boolean` | Exact boolean equality |

Tuple equality (composite keys): tuples `a` and `b` are equal iff they have the same length and, for every index `i`, `a[i]` equals `b[i]` under the scalar equality for **that position’s FieldType**.

**No coercion / no cross-type equality:** Values of different `FieldType`s are never equal. In particular, after successful gates, `("42", 7)` MUST NOT equal `(42, 7)` — position 0 is string vs number. Implementations MUST NOT stringify, number-cast, trim, case-fold, or otherwise normalize elements to force equality.

Implementations MUST NOT use `Object.is` for numeric comparison under this RFC. This RFC does **not** mandate a wire encoding (JSON, SQL tuple, etc.) for keys — only the equality relation above.

### 7.6 Occupancy evaluation

Applies when key extraction continued with key `k` for Constraint `C`.

1. Resolve `O_C` from the occupancy provider (§7.2). If unusable → **invalid invocation** (§7.2.1); stop.
2. If occupied → **constraint-enforcement failure** with cause **Unique constraint violated**.
3. If not occupied → **pass** this Constraint; continue to the next Constraint in sequence (population surface).

Diagnostics for unique violations MUST identify Constraint identity and:

- single-field: `field`
- composite: `fields` (full sequence); implementations MAY also surface `fields[0]` as a primary diagnostic field for symmetry with RFC-019 kind-violation planning locks, but the normative identity of a composite violation is the Constraint + full `fields` key — not a single “guilty” Field among equals.

### 7.7 Ordering integration

Population surface:

1. Walk `constraints` in declaration order.
2. Non-`unique` → skip.
3. `unique` → §7.3 or §7.4 then §7.6.
4. Skip continues; constraint-enforcement fail stops; success continues. No collect-all mode. No regrouping by Field.
5. Invalid invocation (§7.2.1) stops the check without being classified as **Unique constraint violated**.

Intra-instance surface (amendment to RFC-018 / RFC-019 coverage):

1. Walk as today for retained kinds.
2. `unique` → **skip** (do not fail; do not require occupancy; see §7.1 rule 2).

## 8. Constraint value equality (amends RFC-019 §8)

Two Constraint **values** are equal iff:

1. Their `name` strings are exactly equal, and
2. Their `kind` strings are exactly equal, and
3. Targeting properties are equal:
   - Single-target (`field`): `field` strings exactly equal
   - Multi-target (`fields`): `fields` sequences have the same length and exact `FieldName` equality at every index (**order-sensitive**)
4. Kind-specific properties are equal for member-local kinds as in RFC-017 §6; `distinct` / `equal` / `unique` have no additional Constraint properties in this RFC’s declaration shape beyond targeting.

Collection uniqueness remains **by name only**.

## 9. Worked examples (informative)

### 9.1 Single-field email uniqueness

Fields: `email` (string, required, non-null). Constraint: `unique` on `field: "email"`.

Host existing-key collection for that Constraint (conceptual membership): `{ "a@x" }`.

| Candidate map | Occupancy | Result |
| --- | --- | --- |
| `{ email: "b@x" }` | not occupied | pass |
| `{ email: "a@x" }` | occupied | constraint-enforcement failure — Unique constraint violated |
| `email` absent | — | constraint-enforcement failure — missing required (gate), before occupancy |
| `checkConstraintValues` only | — | **skips** the `unique` Constraint (no population check; MUST NOT fail for missing occupancy) |

### 9.2 Independent occupancy scopes

Constraints: `unique(field: "email")`, `unique(field: "username")`.

The occupancy provider MUST supply distinct surfaces `O_email` and `O_username`. A candidate `{ email: "a@x", username: "neo" }` checks email occupancy only against `O_email` and username occupancy only against `O_username`.

### 9.3 Heterogeneous composite uniqueness

Fields: `tenantId` (string), `sequence` (number); both required non-null. Constraint: `unique` on `fields: ["tenantId", "sequence"]`.

| Candidate map | Notes | Result (probe occupied for `("acme", 42)` only) |
| --- | --- | --- |
| `{ tenantId: "acme", sequence: 7 }` | | pass |
| `{ tenantId: "acme", sequence: 42 }` | | Unique constraint violated |
| Comparing keys `("42", 7)` vs `(42, 7)` | different types at index 0 | never equal under §7.5 |

### 9.4 Optional skip

Field: `nickname` optional string; Constraint: `unique` on `field: "nickname"`.

| Candidate map | Result |
| --- | --- |
| nickname absent | **skip** Constraint (optional absent) — not a uniqueness failure |
| nickname `"neo"` and probe occupied | Unique constraint violated |

### 9.5 Missing occupancy vs occupied

Constraint: `unique(field: "email")`; candidate `{ email: "foo" }`; gates continue.

| Provider | Result class | Cause |
| --- | --- | --- |
| No surface for this Constraint | **Invalid invocation** | Missing occupancy surface |
| Surface says occupied | **Constraint-enforcement failure** | Unique constraint violated |

### 9.6 Host update / self-exclusion (informative)

Updating an instance that already owns `email: "a@x"` to keep the same email: the host MUST supply an occupancy surface that does **not** treat that instance’s current key as occupied (e.g. collection excluding self, or probe that ignores self). `core` does not define instance identity or upsert hooks.

## 10. Rationale

- **Approach A (unified declaration)** — continues RFC-016/017/019’s single `constraints` sequence and closed kinds; avoids a parallel `uniqueKeys` collection and avoids open-ended extension bags.
- **Evaluation surface split** — population uniqueness needs information beyond one candidate map; extending `checkConstraintValues` would hide host/population state inside an intra-instance API.
- **`field` / `fields` reuse** — single vs composite uniqueness mirrors the established targeting split; composite gate-order aligns with RFC-019 without importing RFC-019 homogeneity.
- **Heterogeneous composites allowed** — uniqueness key equality is already defined per element by that element’s `FieldType`; requiring identical types would reject coherent keys such as `(tenantId: string, sequence: number)` without a semantic need. Homogeneity remains correct for RFC-019 `distinct` / `equal`, where all gathered values participate in one pairwise/all-equal comparison among peers.
- **Constraint-scoped occupancy** — distinct `unique` Constraints define distinct key spaces even when Field sets overlap partially.
- **Conceptual existing-key collection** — avoids implying ECMAScript `Set` reference identity for composite tuples while still allowing hosts to materialize membership however they choose (including behind a probe).
- **Missing occupancy ≠ unique violated** — keeps host-contract errors separable from domain uniqueness failures.
- **Skip `unique` on intra-instance surface** — preserves existing call sites; uniqueness is opt-in via the population surface rather than forcing every map check to supply population state.
- **No automatic self-exclusion** — instance identity is a host/lifecycle concern; inventing it here would smuggle a partial instance model into M3.
- **Host owns persistence** — SQL `UNIQUE`, registries, and indexes answer occupancy; they are not vocabulary in `core`.

## 11. Document acceptance criteria (M2 → M3 Design Review)

This RFC may move from Draft to Accepted when Design Review finds:

1. Approach A is unambiguous: closed `unique` in the single `constraints` sequence; no parallel collection; no operator bag.
2. The instance-vs-population evaluation split is unambiguous; `checkConstraintValues` MUST NOT accept population state and MUST skip `unique` without failing for absent population state.
3. Population surface inputs are unambiguous: Resource + candidate map + **occupancy provider** (`Constraint → occupancy surface`).
4. Occupancy scoping per `unique` Constraint (independent key spaces tied to declared targets) is an explicit invariant.
5. Existing-key collection is conceptual membership under §7.5 (not native `Set` identity).
6. Missing occupancy is classified as invalid invocation / host-contract failure, distinct from **Unique constraint violated**.
7. Single-field vs composite targeting (`field` XOR `fields`, composite `length >= 2`, resolve) is unambiguous; composite `unique` MAY be heterogeneous.
8. Key extraction gates align with RFC-018 / RFC-019 skip/fail/continue spirit (including composite gate-order).
9. Key equality aligns with RFC-018 / RFC-019 per element; no coercion / no cross-type equality for composite positions.
10. Host responsibility for population scope and update self-exclusion is explicit; `core` does not invent instance identity.
11. Persistence / SQL / ORM engines remain deferred as host concerns; dual collection/probe adapters are not mandated as a public `core` API.
12. Deferred concerns in §1.2 remain deferred (including operation kind/signature/execution).
13. Worked examples match the normative rules.

## 12. Explicit deferrals

Deferred concerns are listed in §1.2. This ledger records that persistence/query/index engines, Relation-targeted uniqueness, filtered/partial uniqueness, wire formats, a full instance model, concrete public TypeScript occupancy API shapes, and operation kind/signature/execution remain out of scope unless a future RFC says otherwise.

## 13. Compatibility / impact

| Concern | Impact |
| --- | --- |
| RFC-016 packaging | **Unchanged** |
| RFC-017 member-local shapes | **Unchanged** |
| RFC-019 `distinct` / `equal` | **Unchanged** (including homogeneous targets) |
| RFC-018 / RFC-019 `checkConstraintValues` | **Amended coverage:** skips `unique`; still MUST NOT take population inputs; MUST NOT fail solely for missing population state |
| `ConstraintKind` | **Widened** to six literals |
| Projection | Constraints still do not project (RFC-016 retained) |
| Persistence adapters | Unaffected until a later mapping RFC; may implement occupancy behind this contract |

## 14. Design Review record

```text
Decision: Accepted
Subject: docs/superpowers/specs/2026-08-09-rfc-020-population-uniqueness-design.md
Document kind: architecture RFC
Primary question: How is population uniqueness declared and checked against a host occupancy surface—reusing constraints—without folding population state into checkConstraintValues or inventing persistence semantics in core?

Review summary: Approach A retained. M3 resolved occupancy scoping, conceptual key-collection equality, missing-occupancy classification, and heterogeneous composite unique keys; tightened closed-shape wording, population inputs, skip invariant, terminology, no-coercion tuple equality, and adapter-boundary non-prescription.

Findings: None (no design blockers remaining after clarifications above)

Dependencies verified:
- RFC-016 packaging — relies (unchanged)
- RFC-017 member-local kinds — relies (unchanged shapes); extends ConstraintKind
- RFC-018 intra-instance runtime — constrains coverage (skip unique; no population inputs)
- RFC-019 field/fields + equality + gate-order — relies; does not import homogeneity into unique
- RFC-007/009/013/014 Field floors — relies for resolve/gates/types

Gate: Proceed to M4.
```

## 15. Implementation notes (informative; not M4)

- Widen `ConstraintKind` / `Constraint` union; declaration validation for `unique` (no homogeneity check on composite `unique`)
- Keep `checkConstraintValues` free of occupancy parameters; skip `unique` in its walk
- Add a separate population check with an occupancy-provider parameter; distinguish invalid-invocation from unique-violated in the result contract
- Roadmap / docs discoverability for RFC-020
- Do **not** implement SQL/ORM uniqueness inside `@resource-forge/core`
- Do **not** require both collection and probe as separate mandated public adapters unless M4 chooses a concrete shape
