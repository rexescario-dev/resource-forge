# RFC-026: Cascade Semantics

**Date:** 2026-08-09  
**Status:** Accepted  
**M3:** Accepted (2026-08-09) — Design Review; no design blockers. Locks required paired `onDelete` / `onUpdate` (`CascadePolicy = none|cascade|restrict|setNull`) as declaration + semantics unit. Presence-symmetric `restrict` (same RFC-025 presence matrix for delete and update; present non-null blocks; absent / association-null / empty do not). `setNull` ⇒ `nullable: true` as sole declaration gate; post-`setNull` is present association-null (validity from `nullable`, not `optional`); `many + setNull` → association-level null never `[]` / element removal / element null. Inbound Relations participate exactly like outbound; `direction` / `inverse` / `join` orthogonal (no mirrored-policy requirement). §6 declared-update-event boundary Accepted (no dirty-tracking). Persistence/ORM, load/fetch, traversal/query, Relation→metadata projection, wire deferred. RFC-024 / RFC-025 closed. M4 authorized.  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#92](https://github.com/rexescario-dev/resource-forge/issues/92)  
**Depends on:** RFC-005 (Resource Model), RFC-008 (Resource Relations), RFC-010 (Relation Association Semantics — `target` retained), RFC-011 (Relation Multiplicity — `"one"` \| `"many"` retained), RFC-013 (Field/Relation Optionality — `optional` retained), RFC-015 (Relation Nullability — association-reference `nullable` retained), RFC-024 (Direction / Joins — `direction` / `inverse` / `join` retained; structurally orthogonal), RFC-025 (Value-State Semantics — absent / empty / association null / element null retained)  
**Followed by:** M3.x implementation planning/delivery after Accept ([#92](https://github.com/rexescario-dev/resource-forge/issues/92) or successor delivery issue); loading/fetch; persistence/ORM mapping; runtime traversal / query execution; Relation→metadata projection; wire/serialization (unless a future RFC proves a hard contract boundary)  
**Unblocks:** M3.23 cascade implementation planning (M4→M5), then implementation (M6)  

**Amends / specializes:** Widens the closed Relation member floor with required paired cascade policies. Fills the deferred **cascade** gap left by RFC-010 / RFC-011 / RFC-013 / RFC-015 / RFC-024 / RFC-025. Does **not** reopen or reinterpret RFC-024 direction/inverse/join, RFC-025 value-state taxonomy, RFC-013 `optional`, RFC-015 association-reference `nullable`, or RFC-011 multiplicity meanings.

## Primary question

> What **Relation-level cascade declaration** and **contract-level propagation semantics** does Resource Forge need so delete/update events can propagate along declared Relations—without defining persistence engines, load/fetch, runtime traversal, wire formats, or a general lifecycle system?

## Thesis

RFC-026 locks cascade as a **declaration + semantics unit** on every Relation:

- **`onDelete` / `onUpdate`** — required, independent, closed `CascadePolicy` members on the Relation floor.
- **`CascadePolicy`** — `"none" | "cascade" | "restrict" | "setNull"`.
- **Cascade means propagation along a declared Relation** when an owning Resource event occurs — not how a store implements foreign keys, not arbitrary lifecycle orchestration.
- **`setNull`** means **association-level null** only; it requires `nullable: true` as the sole declaration gate; it never means empty collection, remove-one-element, or element null. Post-`setNull` is **present association-null**; whether that state is contract-valid is governed by `nullable`, not by `optional`.
- **`restrict` is presence-symmetric** — the same RFC-025 presence matrix applies to delete and update; “update” remains the declared Resource update event (§6), not field-level dirty detection.
- **Inbound participates like outbound** — cascade policies apply regardless of `direction`; `inverse` does not require mirrored policies.
- **RFC-024 is orthogonal** — `direction` / `inverse` / `join` describe structural connection; cascade does not derive from them and does not reinterpret them.
- **RFC-025 is relied upon** — absent / empty / association-null / present non-null classify whether associated values exist for propagation; those states are not reopened.

```text
Invariant:
  Cascade is Relation-scoped event propagation at the Resource contract level.
  It MUST NOT become a persistence API, fetch plan, or general lifecycle engine.

Relation (after Accept + implementation of this floor)
├── name / target / multiplicity / optional / nullable
├── direction / inverse? / join?          ← RFC-024 (unchanged meanings)
├── onDelete: CascadePolicy               ← required
└── onUpdate: CascadePolicy               ← required

CascadePolicy = "none" | "cascade" | "restrict" | "setNull"
```

## 1. Scope

### 1.1 Goals

1. Introduce closed `CascadePolicy = "none" | "cascade" | "restrict" | "setNull"`.
2. Require every Relation to declare independent `onDelete` and `onUpdate` members of that type.
3. Define normative **contract-level** meaning for each policy mode.
4. Define delete and update propagation as **per-Relation** semantics driven by those declarations.
5. Lock `setNull` validity and meaning against RFC-015 / RFC-025 (association-level null only).
6. State how cascade interacts with RFC-025 value states (absent / empty / association-null / present non-null) without reopening that RFC.
7. Affirm orthogonality to RFC-024 `direction` / `inverse` / `join`.
8. Bound `onUpdate` so “update” means the owning Resource’s **declared update event**, not field-level dirty tracking or arbitrary target mutation.
9. Explicitly defer persistence/ORM implementation, load/fetch, runtime traversal/query, Relation→metadata projection, and wire/serialization.
10. Document the intentional breaking widen relative to the post–RFC-024 Relation floor; no dual-shape compatibility period.

### 1.2 Non-goals

This RFC does not define:

1. How any persistence engine, ORM, or database implements cascade (FK actions, flush order, transaction boundaries)
2. Loading / eager / lazy fetch semantics
3. Runtime traversal, navigation APIs, query planners, or join execution
4. Relation → `ResourceMetadata` projection or changes to RFC-006 / RFC-023
5. Wire / serialization formats for cascade policies or propagated events
6. Ownership-transfer / re-parenting semantics beyond what a declared mode already requires
7. Soft-delete, archival, or domain-specific lifecycle workflows
8. Recursive multi-hop cascade graphs, cycle detection algorithms, or execution scheduling
9. Field-level dirty tracking, partial updates, or patch semantics for `onUpdate`
10. Element-level cascade inside `many` collections (remove-one-element, per-element nulling)
11. Reinterpretation of RFC-024 direction/inverse/join or RFC-025 value states
12. Changes to Field floors; Operation kind/signature redesign
13. Concrete TypeScript API names, modules, check entrypoints, or error-code enums beyond informative shapes needed for a later Accepted plan
14. Dual-shape transitional validity (Relations without `onDelete` / `onUpdate` still accepted)

## 2. Terminology

| Term | Meaning |
| --- | --- |
| `CascadePolicy` | Closed policy identity: exactly `"none"`, `"cascade"`, `"restrict"`, or `"setNull"` |
| `onDelete` | Required Relation member declaring the cascade policy for the owning Resource’s **delete** event along this Relation |
| `onUpdate` | Required Relation member declaring the cascade policy for the owning Resource’s **update** event along this Relation |
| Owning Resource event | A contract-level delete or update event on the Resource that declares the Relation |
| Associated target value | The Relation’s instance/payload value as classified by RFC-025 (absent / present null / present non-null; for `many`, empty vs non-empty refinements of present non-null) |
| Propagation | Applying the declared policy’s contract-level consequence along this Relation for the owning event |
| Association-level null | RFC-015 / RFC-025 meaning: present Relation value that is the null association reference |

RFC-008 / RFC-010 / RFC-011 / RFC-013 / RFC-015 / RFC-024 / RFC-025 terms keep their existing meanings. This RFC **does not** change declaration-time definitions of `optional`, `nullable`, `multiplicity`, `direction`, `inverse`, or `join`.

## 3. Declaration floor

### 3.1 Required paired policies

Every Relation MUST declare:

- `onDelete: CascadePolicy`
- `onUpdate: CascadePolicy`

Both members are **required**. There is no omitted-block defaulting: `"none"` is the explicit non-cascading policy.

`onDelete` and `onUpdate` are **independent axes**. A Relation MAY cascade deletes without cascading updates, or the reverse, or mix any closed policy pair except where §5 forbids a combination.

### 3.2 Closed policy vocabulary

```text
CascadePolicy =
  "none"
  | "cascade"
  | "restrict"
  | "setNull"
```

Exact string equality. No aliases, no host-specific synonyms at the contract layer.

### 3.3 Relation shape (after this RFC)

Informative post-Accept floor (member order not normative):

```text
Relation
├── name: RelationName
├── target: ResourceIdentity
├── multiplicity: "one" | "many"
├── optional: boolean
├── nullable: boolean
├── direction: "outbound" | "inbound"
├── inverse?: RelationName
├── join?: { local: FieldName; remote: FieldName }
├── onDelete: CascadePolicy
└── onUpdate: CascadePolicy
```

Relation value equality (when defined by implementation plans) MUST include `onDelete` and `onUpdate`.

## 4. Normative mode meanings

All meanings are **contract-level**. They do **not** prescribe SQL `ON DELETE`/`ON UPDATE` clauses, ORM cascade flags, or flush behavior.

### 4.1 `none`

No propagation for that event along this Relation. The owning event proceeds without cascade consequences from this Relation under this RFC.

### 4.2 `cascade`

Propagate the owning Resource’s declared event (delete or update, matching the member) to the associated target instance(s) identified by this Relation’s present non-null association value.

- For `multiplicity: "one"`, at most one associated target instance.
- For `multiplicity: "many"`, zero or more associated target instances from the present collection (empty ⇒ no targets).

`cascade` does **not** define recursive traversal beyond this Relation hop, persistence ordering, or how hosts materialize target instances.

### 4.3 `restrict` (presence-symmetric)

**`restrict` prevents the owning event from proceeding when this Relation has an associated target value that the declared policy does not permit the event to invalidate.**

The same presence matrix applies to **both** `onDelete: "restrict"` and `onUpdate: "restrict"` (presence-symmetric). It does **not** mean “block if some particular field changed.”

Normative presence reading (uses RFC-025):

| Relation value state | `restrict` effect on owning delete **or** update |
| --- | --- |
| Absent | Does not block (no associated target value present) |
| Present association-level null | Does not block (no associated non-null target) |
| Present non-null (`one`) | Blocks |
| Present empty collection (`many`) | Does not block (no associated target instances) |
| Present non-empty collection (`many`) | Blocks |

Uniform policy × event reading:

| Policy | Delete | Update |
| --- | --- | --- |
| `none` | no propagation/consequence | no propagation/consequence |
| `cascade` | propagate delete | propagate update (declared event; §6) |
| `restrict` | block if associated target exists | block if associated target exists |
| `setNull` | clear association (association-level null) | clear association (association-level null) |

`restrict` is not a database constraint name; the matrix above is the contract meaning.

### 4.4 `setNull`

Clear the association by setting the Relation value to **association-level null**, instead of propagating the owning event through target instance(s).

Locked rules:

1. **`setNull` is valid only when `nullable: true`.** A Relation with `nullable: false` MUST NOT declare `onDelete: "setNull"` or `onUpdate: "setNull"`. This is the **sole** declaration gate authorizing the post-policy null state.
2. **`setNull` means association-level null** (RFC-015 / RFC-025 `present(null)`). After `setNull` applies, the association is **present association-null**.
3. **Validity of that present-null state is governed by `nullable`, not by `optional`.** `optional: false` only forbids **absence**; it does **not** make association-level null automatically valid, and it does **not** interact with `setNull` beyond the `nullable` gate in (1).
4. **`setNull` NEVER means** emptying a `many` collection (`[]`).
5. **`setNull` NEVER means** removing one affected element from a `many` collection.
6. **`setNull` NEVER means** placing element-level `null` inside a `many` collection.
7. For both `"one"` and `"many"`, the post-policy association value is association-level `null` when `setNull` applies — not an empty collection and not a partially mutated collection.

## 5. Cross-declaration validity

### 5.1 Locked rules

| Rule | Normative statement |
| --- | --- |
| `setNull` ⇒ `nullable: true` | If `onDelete` or `onUpdate` is `"setNull"`, then `Relation.nullable` MUST be `true` (sole gate) |
| Post-`setNull` vs `optional` | Post-`setNull` is present association-null; `optional` does not authorize or forbid that null |
| No empty-as-setNull | Implementations MUST NOT treat `setNull` as producing `[]` for `many` |
| No element cascade | Implementations MUST NOT interpret cascade policies as per-element mutation APIs |
| Presence-symmetric `restrict` | §4.3 matrix applies identically to delete and update |
| Inbound = outbound | Cascade policies apply for `direction: "inbound"` exactly as for `"outbound"` |
| No mirrored inverse policies | Counterpart `inverse` Relations are **not** required to declare related cascade policies |

### 5.2 Explicitly deferred (not Design Review open questions)

1. **Multi-hop / cycles** — remain deferred as execution concerns; this RFC defines one-Relation-hop contract meaning only.
2. Persistence/ORM implementation, load/fetch, runtime traversal/query, Relation→metadata projection, and wire/serialization — see §1.2 / §14.

## 6. Update event boundary

**Normative (Accepted):**

> `onUpdate: "cascade"` propagates the owning Resource’s **declared update event** to associated target instance(s) along this Relation. It does **not** define field-level dirty tracking, partial-field patch semantics, recursive multi-Relation traversal, persistence ordering, or arbitrary target mutation beyond that declared event propagation.

Companion readings:

- `onUpdate: "none"` — no update propagation along this Relation.
- `onUpdate: "restrict"` — apply §4.3 against the update event (presence-symmetric; not field-change detection).
- `onUpdate: "setNull"` — apply §4.4 against the update event (association-level null only).

“Update” MUST NOT silently become “any mutation causes arbitrary propagation.”

## 7. Value-state interactions (RFC-025)

Cascade evaluation uses RFC-025 Relation taxonomy; it does not amend it.

| Value state | `none` | `cascade` | `restrict` | `setNull` |
| --- | --- | --- | --- | --- |
| Absent | no-op | no targets | does not block | no association to clear (no-op at value layer) |
| Present association-level null | no-op | no targets | does not block | already null (no-op) |
| Present non-null `one` | no-op | propagate to that target | blocks | set association to null |
| Present empty `many` | no-op | no targets | does not block | set association to null (not `[]`) |
| Present non-empty `many` | no-op | propagate to each element target | blocks | set association to null (not per-element removal) |

Notes:

- Empty ≠ absent remains intact: empty does not block `restrict`; absent does not block `restrict`.
- Empty ≢ association null remains intact: `setNull` produces association null, never empty.
- Element null remains forbidden under RFC-025; cascade MUST NOT introduce it.

## 8. Orthogonality to RFC-024

1. **`direction`** does not imply cascade policy and is not derived from cascade policy. Inbound Relations **participate in cascade exactly like outbound** Relations; `direction` neither disables nor specializes cascade.
2. **`inverse`** does not imply mirrored cascade policies (reciprocal cascade declarations are not required).
3. **`join`** identifies association binding Fields; it does not define cascade execution or FK actions.
4. Cascade MUST NOT silently reinterpret traversal identity as ownership, parent/child lifecycle, or persistence mapping.

RFC-024 describes how the Relation is structurally connected; RFC-026 describes what happens when a declared owning event propagates through that Relation’s association value.

## 9. Invariants

1. **Contract ≠ engine:** Cascade semantics MUST NOT be defined as ORM/SQL behavior.
2. **Required paired policies:** Every Relation MUST have `onDelete` and `onUpdate`.
3. **Closed vocabulary:** Policies ∈ {`none`, `cascade`, `restrict`, `setNull`} only.
4. **Independent axes:** Delete and update policies MUST NOT be collapsed into a single forced pair.
5. **`setNull` ⇒ nullable:** `setNull` requires `nullable: true` as the sole declaration gate; `optional` does not authorize present-null.
6. **`setNull` = association null:** Never empty, never element removal, never element null; post-state is present association-null.
7. **Presence-symmetric `restrict`:** Delete and update use the same §4.3 presence matrix.
8. **RFC-025 relied upon:** Absent / empty / association-null distinctions MUST be respected.
9. **RFC-024 orthogonal:** Direction / inverse / join MUST NOT be reinterpreted as cascade; inbound participates like outbound.
10. **Not a lifecycle engine:** Cascade is Relation-scoped propagation only.
11. **Update bounded:** `onUpdate` propagates a declared update event; it MUST NOT imply dirty-tracking or persistence mechanics.
12. **No dual shape:** After Accept + delivery, Relations lacking cascade members are invalid.

## 10. Rationale

### 10.1 Why declaration + semantics together

A semantics-only RFC would leave Resource Forge unable to declare cascade; a declaration-only RFC would leave modes meaningless. One unit gives M3.23 a complete contract.

### 10.2 Why paired `onDelete` / `onUpdate`

Delete and update are independent event axes. Flat required members match existing Relation style (`direction`, `optional`, `nullable`) and avoid omitted-block ambiguity.

### 10.3 Why `setNull` is association-level only (including `many`)

RFC-025 already forbids collapsing empty↔null and forbids element nulls under current floors. Interpreting `setNull` on `many` as “remove element” or “empty collection” would invent element-level cascade and reopen value-state. Association-level null is the only meaning consistent with RFC-015 / RFC-025.

### 10.4 Why restrict is presence-symmetric

A single presence matrix for delete and update keeps the four policies uniformly interpretable across event axes without inventing field-level dirty tracking. “Associated target exists” is a contract-level condition already classified by RFC-025.

### 10.5 Why update is narrowly bounded

Unbounded “update cascade” becomes a mutation engine. Bounding it to the owning Resource’s declared update event keeps load/persistence/dirty-tracking deferred while still giving `onUpdate` a complete contract meaning.

## 11. Worked examples (informative)

### 11.1 Cascade delete on one

```text
Relation customer: multiplicity = "one", nullable = false
  onDelete = "cascade"
  onUpdate = "none"

Owning delete + present non-null customer → propagate delete to that target
Owning delete + absent customer (if optional) → no target
```

### 11.2 Restrict delete when children present

```text
Relation items: multiplicity = "many", nullable = false
  onDelete = "restrict"
  onUpdate = "none"

Present []     → owning delete proceeds (no associated targets)
Present [a, b] → owning delete blocked
Absent         → owning delete proceeds
```

### 11.3 setNull on many (association null, not empty)

```text
Relation tags: multiplicity = "many", nullable = true
  onDelete = "setNull"
  onUpdate = "none"

Present ["a","b"] + owning delete → Relation value becomes association-level null
                                 → NOT []
                                 → NOT remove-one-element
```

### 11.4 Invalid setNull without nullable

```text
Relation owner: multiplicity = "one", nullable = false
  onDelete = "setNull"   # INVALID — violates setNull ⇒ nullable: true
```

## 12. Relationships to Accepted RFCs

| RFC | Relationship |
| --- | --- |
| RFC-008 / RFC-010 | Relied upon for Relation container and declarative `target` |
| RFC-011 | Relied upon for `"one"` / `"many"`; collection refinement only when present non-null `many` |
| RFC-013 | Relied upon; `optional` unchanged; does **not** authorize post-`setNull` present-null |
| RFC-015 | Relied upon; `nullable` unchanged; **constrains** `setNull` (sole gate) |
| RFC-024 | Orthogonal; direction/inverse/join unchanged and not cascade inputs; inbound participates like outbound |
| RFC-025 | Relied upon for value-state taxonomy; **not amended** |
| RFC-005 | Resource aggregate relied upon |

## 13. Acceptance criteria (for this specification)

Satisfied at Accept:

1. `onDelete` / `onUpdate` are required closed `CascadePolicy` members with independent axes.
2. Mode meanings are contract-level and not persistence-engine definitions.
3. `setNull` requires `nullable: true` and means association-level null only (never empty / element removal / element null), including for `many`; post-state validity is from `nullable`, not `optional`.
4. `restrict` uses an explicit RFC-025 presence matrix, presence-symmetric across delete and update.
5. RFC-024 orthogonality is normative; inbound cascade equals outbound; no mirrored inverse policies.
6. The §6 update-event boundary is Accepted.
7. Load/fetch, persistence/ORM implementation, runtime traversal/query, Relation→metadata projection, and wire formats remain explicitly deferred.
8. RFC-024 / RFC-025 / RFC-015 declaration and value-state meanings are not reinterpreted.

## 14. Deferred concerns ledger

Deferred concerns are listed in §1.2. This ledger restates that persistence/ORM implementation mechanics, load/fetch, runtime traversal/query execution, Relation→metadata projection, wire/serialization, multi-hop execution/cycle handling, ownership-transfer beyond declared modes, field-level dirty tracking, and concrete public TypeScript check APIs remain out of scope unless a future RFC explicitly defines them.

## 15. Packaging note (informative)

Prefer **one pull request per tracking issue** for the eventual delivery slice after Accept (Accepted plan + implementation together). This RFC is **Accepted**; do not begin M6 until an Accepted implementation plan exists. RFC-024 / M3.21 and RFC-025 / M3.22 remain closed and MUST NOT be reopened by this work.
