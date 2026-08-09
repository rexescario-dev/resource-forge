# RFC-025: Value-State Semantics (Empty-vs-Absent / Null Elements)

**Date:** 2026-08-09  
**Status:** Accepted  
**M3:** Accepted (2026-08-09) — Design Review; no design blockers. Locks value-state layer orthogonal to declaration permission: `empty ≠ absent`; `empty ≢ association-level null`; association-level null owned solely by RFC-015 `Relation.nullable`; `many` element null distinct, not inherited from target `Field.nullable`, and forbidden under current floors (no `elementNullable` here). Relation taxonomy confirmed as top-level `{absent | present(null) | present(non-null)}` with collection empty/non-empty as a refinement of present(non-null) when `multiplicity = "many"` only — not “many is always a collection with null as a peer top-level encoding.” Aligns with RFC-011 shape-only multiplicity and RFC-015 association-reference nullability orthogonal to multiplicity. RFC-018 Field absent-vs-null affirmed not amended; RFC-024 orthogonal/closed; wire/runtime/persistence/cascade/load/traversal deferred. M4 authorized.  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#89](https://github.com/rexescario-dev/resource-forge/issues/89)  
**Depends on:** RFC-005 (Resource Model), RFC-007 (Resource Fields — `FieldName` / ordered `fields`), RFC-008 (Resource Relations — `RelationName` / ordered `relations`), RFC-011 (Relation Multiplicity — `"one"` \| `"many"`), RFC-013 (Field/Relation Optionality — declaration presence), RFC-014 (Field Nullability — Field value-nullability declaration), RFC-015 (Relation Nullability — association-reference nullability declaration), RFC-018 (Runtime Constraint Enforcement — Field-value map absent-vs-null distinction relied upon, not amended)  
**Followed by:** M3.x implementation planning/delivery after Accept; cascade; loading/fetch; persistence/ORM mapping; runtime traversal / query execution; Relation→metadata projection; any future explicit declaration gate for `many` element nulls  
**Unblocks:** Coherent value-state foundation for later Relation runtime / wire / persistence RFCs; clarifies that empty/absent/null/element-null are not implied by RFC-024 direction/join  

**Amends / specializes:** Fills the deferred **empty-vs-absent / null elements** gap left by RFC-013 / RFC-014 / RFC-015 / RFC-018 / RFC-024. Relies on those RFCs’ declaration floors and on RFC-018’s Field absent-vs-null map distinction. Does **not** reopen or reinterpret RFC-013 `optional`, RFC-014 Field `nullable`, RFC-015 association-reference `nullable`, RFC-011 multiplicity meanings, or RFC-024 direction/inverse/join.

## Primary question

> What **instance/payload value states** may a Field or Relation occupy—especially distinguishing **absent**, **empty**, **association-level null**, and **element-level null** for `many`—without changing declaration floors or defining wire, persistence, or traversal behavior?

## Thesis

RFC-025 locks a **value-state semantic layer** orthogonal to declaration-level permission:

- **`optional` / `nullable`** (RFC-013 / RFC-014 / RFC-015) remain **declaration-level permission** only.
- **Value states** describe whether a member’s instance/payload value is **absent**, **present**, **empty** (collections), **null** (explicit null), or contains **null elements** (`many` only).
- **`empty ≠ absent`** — a present empty collection is not an omitted member.
- **`empty ≢ null`** — a present empty collection is not an association-reference null.
- **Association-level null** for Relations remains governed solely by RFC-015 `Relation.nullable`.
- **`many` element null** is a **separate** value state: it is **not** implied by `Relation.nullable`, **not** inherited from target `Field.nullable`, and is **not permitted** under current declaration floors (no new declaration gate in this RFC).
- RFC-024 direction / inverse / join remain untouched; they do not imply value-state rules.

```text
Invariant:
  Declaration permission (optional / nullable) ≠ instance value state.
  Do not reinterpret an existing declaration floor to solve a new value-state dimension.

Value states (conceptual):
  Field:     absent | present(non-null scalar) | present(null)
  Relation:  (see §5.1 taxonomy — collection is a refinement, not a peer of null)

Distinctions locked:
  empty ≠ absent
  empty ≢ association null
  association null ≠ element null
  Relation.nullable governs association null only
```

## 1. Scope

### 1.1 Goals

1. Define a closed **value-state vocabulary**: absent, present, empty, null (association-level), and null element (`many`).
2. Lock **empty-vs-absent** semantics for `multiplicity: "many"` Relations: empty is a present collection with zero elements; absent means the member value is not present.
3. Lock that **empty and association-level null are semantically distinct** (`empty ≢ null`).
4. Define **null elements in `many`** as a distinct value state from association-level null.
5. Lock that **`Relation.nullable` governs association-reference null only** (RFC-015 unchanged) and **does not** permit or forbid element nulls.
6. Lock that **element-null permission is not inherited** from target `Field.nullable`.
7. Lock the **default element-null rule**: null elements in `many` are **not permitted** under current declaration floors; a future RFC MAY introduce an explicit declaration gate deliberately.
8. Restate how Field absent / present / null value states relate to RFC-013 / RFC-014 declaration permissions and align with RFC-018’s Field-value map absent-vs-null distinction **without amending** RFC-018.
9. State invariants that make these states unambiguous for later wire / runtime / persistence RFCs.
10. Explicitly defer wire format, persistence/ORM, cascade, loading/fetch, runtime traversal/query, Relation→metadata projection, and broad declaration-model changes.

### 1.2 Non-goals

This RFC does not define:

1. Wire / serialization formats for absent, empty, null, or null elements
2. Persistence / DB null / ORM mapping
3. Cascade, delete/update rules, or ownership transfer
4. Loading / eager / lazy fetch semantics
5. Runtime traversal, navigation APIs, query planners, or join execution
6. Relation → `ResourceMetadata` projection or any change to RFC-006 / RFC-023
7. Reinterpretation of RFC-013 `optional`, RFC-014 Field `nullable`, or RFC-015 association-reference `nullable`
8. Broad declaration-model changes to Field / Relation closed floors (including adding `elementNullable` or similar in this RFC)
9. Changes to RFC-024 direction / inverse / join
10. A full Resource aggregate instance model beyond the value-state vocabulary and permission rules here
11. Concrete TypeScript API names, modules, check entrypoints, or error-code enums beyond informative shapes needed for a later Accepted plan
12. Defaults, normalization, or silent repair that collapse empty↔absent or empty↔null

## 2. Terminology

| Term | Meaning |
| --- | --- |
| Value state | The instance/payload occupancy of a Field or Relation member value — not a schema declaration flag |
| Absent | The member value is **not present** (no value occupies the member) |
| Present | The member value **is present** (some value occupies the member), including empty collections and null |
| Empty | A **present** collection value with **zero** elements; applies only where a collection association is present for `multiplicity: "many"` |
| Association-level null | A **present** Relation value that is the null association reference (RFC-015 meaning) |
| Element null / null element | A `null` occupying one position inside a present `many` collection; distinct from association-level null |
| Declaration permission | What `optional` / `nullable` assert on the schema (RFC-013 / RFC-014 / RFC-015) |
| Value-state permission | Which value states are allowed for a member given its declaration permissions and the rules of this RFC |

RFC-007 / RFC-008 / RFC-011 / RFC-013 / RFC-014 / RFC-015 / RFC-018 terms keep their existing meanings. This RFC **does not** change declaration-time definitions of `optional` or `nullable`.

## 3. Layering: declaration vs value state

| Layer | Owner | Asserts |
| --- | --- | --- |
| Declaration presence | RFC-013 `optional` | Whether the member **may be absent** as a value |
| Field value nullability | RFC-014 `nullable` | Whether a **present Field value** may be `null` |
| Association-reference nullability | RFC-015 `nullable` | Whether a **present Relation value** may be association-level null |
| Multiplicity | RFC-011 | Whether a non-null Relation association is one vs many shaped |
| Value-state distinctions | **RFC-025** | How absent / empty / null / element-null are classified and which are allowed |

**Invariant — no reinterpretation:** Implementations MUST NOT treat `Relation.nullable: true` as permission for null elements in `many`, and MUST NOT treat target `Field.nullable` as that permission.

## 4. Field value states

A Field value is exactly one of:

1. **Absent** — no Field value is present.
2. **Present non-null** — a scalar `string` / `number` / `boolean` value is present (RFC-009).
3. **Present null** — the Field value is present and is `null`.

**Empty does not apply to Fields** under the current FieldType floor (no collection FieldType).

### 4.1 Permission (Fields)

Given declared `optional` and `nullable` (RFC-013 / RFC-014):

| Value state | `optional: false`, `nullable: false` | `optional: false`, `nullable: true` | `optional: true`, `nullable: false` | `optional: true`, `nullable: true` |
| --- | --- | --- | --- | --- |
| Absent | forbidden | forbidden | allowed | allowed |
| Present non-null | allowed | allowed | allowed | allowed |
| Present null | forbidden | allowed | forbidden | allowed |

These permissions match the declaration matrix already implied by RFC-013 / RFC-014 and the absent-vs-null distinction used by RFC-018’s field-value map. This RFC **restates** that alignment; it does **not** amend RFC-018’s constraint-evaluation gates.

### 4.2 Alignment with RFC-018 (informative)

RFC-018 already treats Field-value map **missing key** as absent and **present `null`** as null. RFC-025 affirms that distinction as part of the Field value-state model. Constraint skip/fail behavior remains owned by RFC-018.

## 5. Relation value states

### 5.1 Common states (all multiplicities)

A Relation value is classified by the following **top-level taxonomy** (exactly one branch):

```text
Relation value
├── absent
├── present(null)                    ← association-level null (RFC-015)
└── present(non-null association)
    └── when multiplicity = "many":  ← RFC-011 collection shape applies here only
        ├── empty
        └── non-empty
            └── elements: non-null only (under this RFC)
```

Normative reading of the branches:

1. **Absent** — no Relation value is present.
2. **Present association-level null** (`present(null)`) — the Relation value is present and is the null association reference.
3. **Present non-null association** — the Relation value is present and is a non-null association.

RFC-015 `Relation.nullable` governs whether (2) is allowed. RFC-013 `optional` governs whether (1) is allowed. Multiplicity does **not** change those declaration meanings and does **not** make association-level null a collection encoding: `"many"` is the RFC-011 **collection relationship shape of a non-null association**, not a claim that every `many` Relation value is inherently a collection (including when the association reference is null).

### 5.2 Additional states for `multiplicity: "many"`

When a Relation has `multiplicity: "many"` and the value is a **present non-null association**, that association is a **collection**, and exactly one of:

1. **Empty** — the collection is present with zero elements.
2. **Non-empty** — the collection is present with one or more elements.

Additionally, for a present collection (empty or non-empty):

- Each element position is either a **non-null association element** or a **null element**.
- An empty collection has zero element positions (and therefore contains no null elements).

**`multiplicity: "one"`** has no empty-collection state: a present non-null association is a single association value (not a zero-length collection).

### 5.3 Locked distinctions

1. **`empty ≠ absent`** — omitting the Relation value is not the same as supplying an empty collection.
2. **`empty ≢ association-level null`** — an empty collection is not a null association reference; null association reference is not an empty collection.
3. **Association-level null ≠ element null** — nullifying the whole association is not the same as placing `null` in an element position.
4. **Presence of an empty collection is still present** — `optional: false` is satisfied by an empty collection; it is **not** satisfied by absence.

### 5.4 Permission (Relations) — association level

| Value state | `optional: false`, `nullable: false` | `optional: false`, `nullable: true` | `optional: true`, `nullable: false` | `optional: true`, `nullable: true` |
| --- | --- | --- | --- | --- |
| Absent | forbidden | forbidden | allowed | allowed |
| Present association-level null | forbidden | allowed | forbidden | allowed |
| Present non-null association | allowed | allowed | allowed | allowed |
| Empty collection (`many` only) | allowed (as present non-null) | allowed (as present non-null) | allowed (as present non-null) | allowed (as present non-null) |

Empty is a refinement of **present non-null association** for `many`. It is never a form of absence or association-level null.

### 5.5 Permission (Relations) — element null in `many`

| Rule | Normative statement |
| --- | --- |
| Not governed by `Relation.nullable` | `nullable: true` on a `many` Relation permits association-level null only; it does **not** permit null elements |
| Not inherited from target Fields | Target Resource `Field.nullable` does **not** authorize null elements in the association collection |
| Default under current floors | **Null elements are not permitted** in a `many` collection |
| Declaration gate | This RFC does **not** add a declaration member for element-null permission; a future RFC MAY introduce one **explicitly** |

A present `many` collection is value-state-valid only when every element position is a non-null association element (and zero positions for empty).

## 6. Invariants

1. **Layer separation:** Declaration flags MUST NOT be redefined to mean value states beyond their Accepted RFCs.
2. **Closed Field states:** Field ∈ {absent, present non-null, present null}.
3. **Closed Relation top-level states:** Relation ∈ {absent, present association-level null, present non-null association}.
4. **Many refinement:** For `many` + present non-null association, collection ∈ {empty, non-empty}; elements are non-null under this RFC.
5. **`empty ≠ absent`:** Implementations MUST NOT treat empty collections as absent, or absent as empty.
6. **`empty ≢ null`:** Implementations MUST NOT treat empty collections as association-level null, or association-level null as empty.
7. **Association vs element null:** Implementations MUST NOT treat element null as association-level null, or the reverse.
8. **No silent collapse:** No defaults or repairs that merge these states.
9. **RFC-024 orthogonality:** Direction / inverse / join neither imply nor are implied by these value states.
10. **RFC-018 non-amendment:** Field constraint evaluation remains RFC-018; this RFC does not invent Relation constraint evaluation.

## 7. Rationale

### 7.1 Why both empty-vs-absent and null elements together

Prior RFCs deferred “empty-collection vs absent” and “null elements in `many`” as a single Later topic. Locking only one half would leave an immediate value-state hole for cascade/load/persistence follow-ons. Cut **both as one unit** completes the semantic foundation while staying out of wire/runtime design.

### 7.2 Why `empty ≢ null`

Equating empty with association-level null would collapse two states that `optional` and `nullable` already treat differently (absence vs present-null vs present-non-null). Keeping them distinct preserves the declaration matrix and avoids forcing hosts to invent a collapse policy.

### 7.3 Why association-reference-only for `Relation.nullable`

RFC-015 already defines `nullable` as association-reference nullability and explicitly deferred element nulls. Overloading that flag would silently change Accepted semantics for every `many + nullable: true` Relation. Element nulls therefore stay a separate dimension; without a new gate, they are forbidden.

### 7.4 Why no new declaration gate in this RFC

Introducing `elementNullable` (or similar) would be a declaration-floor widen. The user’s M2 boundary excludes broad declaration-model changes. Forbidding null elements under current floors is a complete rule; a future RFC can add an explicit gate if product need appears.

### 7.5 Why Fields are included

RFC-018 already distinguishes Field absent vs null. Including Fields in the vocabulary prevents Relation-only wording from inventing a second, conflicting Field story, and keeps the declaration-vs-value-state layering uniform.

## 8. Worked examples (informative)

### 8.1 Optional many Relation — empty vs absent

```text
Relation tags: multiplicity = "many", optional = true, nullable = false

Absent:                         # allowed (optional)
Present association null:       # forbidden (nullable: false)
Present empty collection []:    # allowed — present non-null, empty
Present ["a", "b"]:             # allowed
Present ["a", null]:            # forbidden — null element
```

### 8.2 Required many Relation — empty satisfies presence

```text
Relation items: multiplicity = "many", optional = false, nullable = false

Absent:                         # forbidden
Present empty collection []:    # allowed — present; optional satisfied
Present association null:       # forbidden
```

### 8.3 Nullable many — association null ≠ empty ≠ element null

```text
Relation links: multiplicity = "many", optional = true, nullable = true

Absent:                         # allowed
Present association null:       # allowed (association-level)
Present empty collection []:    # allowed (distinct from null)
Present [null]:                 # forbidden — element null not authorized by nullable: true
```

### 8.4 Field absent vs null (unchanged declaration matrix)

```text
Field nickname: optional = true, nullable = false

Absent:                         # allowed
Present null:                   # forbidden
Present "ada":                  # allowed
```

## 9. Relationships to Accepted RFCs

| RFC | Relationship |
| --- | --- |
| RFC-011 | Relied upon for `"one"` / `"many"`; empty-collection states apply only to `"many"` |
| RFC-013 | Relied upon; `optional` unchanged; governs whether **absent** is allowed |
| RFC-014 | Relied upon; Field `nullable` unchanged; governs whether Field **present null** is allowed |
| RFC-015 | Relied upon; Relation `nullable` unchanged; governs **association-level null** only |
| RFC-018 | Relied upon for Field absent-vs-null map distinction; **not amended** |
| RFC-024 | Orthogonal; direction/inverse/join unchanged; empty-vs-absent no longer “Later” once this RFC is Accepted |
| RFC-005 / RFC-007 / RFC-008 | Resource / Field / Relation containers relied upon |

## 10. Acceptance criteria (for this specification)

This RFC may move from Draft to Accepted when Design Review finds:

1. Value-state vocabulary is closed and unambiguous (absent / present / empty / association null / element null).
2. `empty ≠ absent` and `empty ≢ null` are normative.
3. `Relation.nullable` remains association-reference-only; element null is separate and not inherited from target Field `nullable`.
4. Default rule forbids null elements in `many` without adding a new declaration member.
5. RFC-013 / RFC-014 / RFC-015 / RFC-024 are not reinterpreted.
6. Wire / persistence / cascade / load / traversal / Relation projection remain explicitly deferred.
7. Field value states align with RFC-018’s absent-vs-null distinction without amending RFC-018.

## 11. Deferred concerns ledger

Deferred concerns are listed in §1.2. This ledger restates that wire/serialization, persistence/ORM, cascade, loading/fetch, runtime traversal/query, Relation→metadata projection, a full aggregate instance model, concrete public TypeScript check APIs, and any future explicit declaration gate for element nulls remain out of scope unless a future RFC explicitly defines them.

## 12. Packaging note (informative)

Prefer **one pull request per tracking issue** for the eventual delivery slice after Accept (Accepted plan + implementation together) under [#90](https://github.com/rexescario-dev/resource-forge/issues/90). This RFC is **Accepted**; do not begin M6 until an Accepted implementation plan exists. RFC-024 / M3.21 remain closed and MUST NOT be reopened by this work.
