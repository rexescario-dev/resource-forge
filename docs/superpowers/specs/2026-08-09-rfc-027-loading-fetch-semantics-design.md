# RFC-027: Loading / Fetch Semantics

**Date:** 2026-08-09  
**Status:** Accepted  
**M3:** Accepted (2026-08-09) — Design Review; no design blockers. Locks required `Relation.fetch` (`FetchPolicy = eager|lazy`) with no omitted default. `eager` ⇒ MUST be loaded after a completed owning Resource load; `lazy` ⇒ MAY be not-loaded or loaded (asymmetric by design — not SHOULD/must-defer). **Not-loaded** is a loading state only — MUST NEVER be interpreted as absent / empty / association-null / present; when loaded, RFC-025 + `optional` / `nullable` / multiplicity apply unchanged. “Completed owning Resource load” retained as a **contract boundary** (the claim that an owning load outcome exists), not a mechanism — query completion, hydration, ORM lifecycle, and traversal semantics remain out of scope and MUST NOT be introduced here. RFC-024 orthogonal (inbound = outbound; no mirrored inverse fetch). RFC-026 separate and unwired. Persistence/ORM, runtime traversal/query, Relation→metadata projection, wire deferred. M4 authorized.  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#95](https://github.com/rexescario-dev/resource-forge/issues/95)  
**Depends on:** RFC-005 (Resource Model), RFC-008 (Resource Relations), RFC-010 (Relation Association Semantics — `target` retained), RFC-011 (Relation Multiplicity — `"one"` \| `"many"` retained), RFC-013 (Field/Relation Optionality — `optional` retained), RFC-015 (Relation Nullability — association-reference `nullable` retained), RFC-024 (Direction / Joins — `direction` / `inverse` / `join` retained; structurally orthogonal), RFC-025 (Value-State Semantics — absent / empty / association null / present retained), RFC-026 (Cascade Semantics — `onDelete` / `onUpdate` retained; structurally separate and unwired)  
**Followed by:** M3.x implementation planning/delivery after Accept ([#95](https://github.com/rexescario-dev/resource-forge/issues/95) or successor delivery issue); persistence/ORM mapping; runtime traversal / query execution; Relation→metadata projection; wire/serialization (unless a future RFC proves a hard contract boundary)  
**Unblocks:** M3.24 (or successor) loading/fetch implementation planning (M4→M5), then implementation (M6)  

**Amends / specializes:** Widens the closed Relation member floor with a required `fetch` policy. Fills the deferred **loading/fetch** gap left by RFC-024 / RFC-025 / RFC-026. Does **not** reopen or reinterpret RFC-024 direction/inverse/join, RFC-025 value-state taxonomy, RFC-013 `optional`, RFC-015 association-reference `nullable`, RFC-011 multiplicity meanings, or RFC-026 cascade policies / `evaluateCascadeEvent`.

## Primary question

> What **Relation-level fetch declaration** and **load-state semantics** does Resource Forge need so association payloads can be part of—or deferred from—an owning Resource’s load contract—without defining persistence engines, runtime traversal/query, wire formats, or collapsing **not-loaded** into RFC-025 value states?

## Thesis

RFC-027 locks load/fetch as a **declaration + semantics unit** on every Relation:

- **`fetch`** — required closed member on the Relation floor: `"eager" | "lazy"`.
- **`eager`** — the association payload is part of the owning Resource’s **load contract**.
- **`lazy`** — the association payload **may remain not-loaded** when the owning Resource is loaded.
- **Not-loaded is a loading state**, not a Resource value state. It MUST NEVER be interpreted as absent, empty, association-null, or present (RFC-025).
- **Contract intent only** — `eager` / `lazy` do not prescribe SQL/ORM behavior, query shape/count, proxies, batching, caching, runtime traversal mechanisms, or persistence implementation.
- **RFC-025 is consumed, not reopened** — once a Relation is loaded, value-state classification and permission remain RFC-025.
- **RFC-024 is orthogonal** — `direction` / `inverse` / `join` describe structural connection; fetch does not derive from them and does not reinterpret them.
- **RFC-026 remains separate and unwired** — cascade declaration and `evaluateCascadeEvent` are unchanged; this RFC does not wire cascade into load/fetch.

```text
Invariant:
  Not-loaded is a loading state, not a Resource value state.
  It MUST NEVER be interpreted as absent, empty, association-null, or present.

Relation (after Accept + implementation of this floor)
├── name / target / multiplicity / optional / nullable
├── direction / inverse? / join?          ← RFC-024 (unchanged meanings)
├── onDelete / onUpdate                   ← RFC-026 (unchanged; unwired)
└── fetch: FetchPolicy                    ← required

FetchPolicy = "eager" | "lazy"

Load / value layering:
  loading state  ∈ { not-loaded, loaded }
  when loaded    → RFC-025 value-state taxonomy applies
  when not-loaded → no RFC-025 value-state classification
```

## 1. Scope

### 1.1 Goals

1. Introduce closed `FetchPolicy = "eager" | "lazy"`.
2. Require every Relation to declare `fetch: FetchPolicy` (no omitted default).
3. Define normative **contract-level** meaning for `eager` and `lazy`.
4. Introduce normative **not-loaded** as a loading state distinct from all RFC-025 value states.
5. Lock that not-loaded MUST NEVER be interpreted as absent, empty, association-null, or present.
6. State how load-state interacts with RFC-025 once a Relation is loaded—without amending RFC-025.
7. Affirm orthogonality to RFC-024 `direction` / `inverse` / `join`.
8. Affirm separation from RFC-026 cascade (`evaluateCascadeEvent` remains exported but unwired).
9. Explicitly defer persistence/ORM implementation, runtime traversal/query, Relation→metadata projection, and wire/serialization.
10. Document the intentional breaking widen relative to the post–RFC-026 Relation floor; no dual-shape compatibility period.

### 1.2 Non-goals

This RFC does not define:

1. How any persistence engine, ORM, or database implements fetch (joins, selects, lazy proxies, hydration)
2. Number, shape, or ordering of queries; batching; N+1 mitigation; caching
3. Runtime traversal, navigation APIs, query planners, or join execution
4. Relation → `ResourceMetadata` projection or changes to RFC-006 / RFC-023
5. Wire / serialization formats for `fetch`, not-loaded, or association payloads
6. Field-level fetch / load policies (Fields travel with the owning Resource under current floors)
7. Depth hints, include graphs, projection selectors, or partial-Resource load plans
8. A third policy such as `"none"` / `"manual"` / `"select"`
9. Soft-delete, archival, or domain-specific lifecycle workflows
10. Reinterpretation of RFC-024 direction/inverse/join or RFC-025 value states
11. Changes to RFC-026 cascade policies, mode meanings, or wiring of `evaluateCascadeEvent`
12. Changes to Field floors; Operation kind/signature redesign
13. Concrete TypeScript API names, modules, check entrypoints, or error-code enums beyond informative shapes needed for a later Accepted plan
14. Dual-shape transitional validity (Relations without `fetch` still accepted)

## 2. Terminology

| Term | Meaning |
| --- | --- |
| `FetchPolicy` | Closed fetch policy identity: exactly `"eager"` or `"lazy"` |
| `fetch` | Required Relation member declaring the fetch/load policy for this Relation relative to the owning Resource’s load contract |
| Owning Resource load | A contract-level load of the Resource that declares the Relation (not a persistence/query algorithm) |
| Completed owning Resource load | The **contract claim** that an owning Resource load has finished and produced a load outcome for fetch/load-state rules; it does **not** define query completion, hydration, ORM lifecycle, proxies, or traversal mechanisms |
| Association payload | The Relation’s associated instance/payload content once loaded (then classified by RFC-025) |
| Loading state | Whether a Relation association is **not-loaded** or **loaded** for a given owning Resource load outcome |
| Not-loaded | Loading state: association payload has not been supplied as part of (or subsequent to) load; **not** a value state |
| Loaded | Loading state: association payload has been supplied and is therefore subject to RFC-025 value-state classification |
| Value state | RFC-025 instance/payload occupancy: absent / empty / association-null / present (and many refinements) |

RFC-008 / RFC-010 / RFC-011 / RFC-013 / RFC-015 / RFC-024 / RFC-025 / RFC-026 terms keep their existing meanings. This RFC **does not** change declaration-time definitions of `optional`, `nullable`, `multiplicity`, `direction`, `inverse`, `join`, `onDelete`, or `onUpdate`.

## 3. Declaration floor

### 3.1 Required `fetch`

Every Relation MUST declare:

- `fetch: FetchPolicy`

The member is **required**. There is no omitted-block defaulting: hosts MUST NOT infer `"eager"` or `"lazy"` from absence of `fetch`.

### 3.2 Closed policy vocabulary

```text
FetchPolicy =
  "eager"
  | "lazy"
```

Exact string equality. No aliases, no host-specific synonyms at the contract layer. No third state (`none`, `manual`, depth hints, etc.).

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
├── onUpdate: CascadePolicy
└── fetch: FetchPolicy
```

Relation value equality (when defined by implementation plans) MUST include `fetch`.

## 4. Normative policy meanings

All meanings are **contract-level**. They do **not** prescribe SQL joins, ORM `include` flags, proxy objects, or hydration engines.

### 4.1 `eager`

The association payload is part of the owning Resource’s **load contract**.

After a completed owning Resource load:

1. The Relation MUST be in loading state **loaded**.
2. The Relation MUST NOT be **not-loaded**.
3. The loaded association is then classified and permissioned by **RFC-025** (and declaration floors RFC-013 / RFC-015 / RFC-011).

`eager` does **not** require a particular loading mechanism, query plan, or persistence strategy. It asserts only that a completed owning Resource load yields a loaded Relation value-state, not a deferred not-loaded hole. “Completed” is that contract claim (§2); defining *how* a host establishes completion (queries, hydration, ORM lifecycle, traversal) is **out of scope** and MUST NOT be imported into this RFC.

### 4.2 `lazy`

The association payload **may remain not-loaded** when the owning Resource is loaded.

After a completed owning Resource load:

1. The Relation MAY be **not-loaded**, or
2. The Relation MAY be **loaded** (host chose to supply the association payload anyway).

When **loaded**, RFC-025 applies exactly as for any loaded Relation.  
When **not-loaded**, RFC-025 value-state classification MUST NOT be applied.

`lazy` does **not** mean absent, empty, association-null, or present. It **permits** the distinct not-loaded loading state defined by this RFC.

## 5. Load-state semantics

### 5.1 Closed loading states

For a Relation association relative to an owning Resource load outcome, loading state is exactly one of:

```text
loading state =
  not-loaded
  | loaded
```

### 5.2 Key invariant (normative)

> **Not-loaded is a loading state, not a Resource value state. It MUST NEVER be interpreted as absent, empty, association-null, or present.**

Consequences:

| Forbidden collapse | Normative statement |
| --- | --- |
| not-loaded ≠ absent | Implementations MUST NOT treat not-loaded as RFC-025 absent |
| not-loaded ≠ empty | Implementations MUST NOT treat not-loaded as an empty `many` collection |
| not-loaded ≠ association-null | Implementations MUST NOT treat not-loaded as RFC-015/RFC-025 association-level null |
| not-loaded ≠ present | Implementations MUST NOT treat not-loaded as a present association payload |

### 5.3 Layering with RFC-025

| Loading state | Value-state layer |
| --- | --- |
| `not-loaded` | No RFC-025 classification; declaration permissions for absent/null do not apply yet |
| `loaded` | Exactly one RFC-025 Relation value-state branch applies; `optional` / `nullable` / multiplicity rules apply unchanged |

**Invariant — no reinterpretation:** Implementations MUST NOT use `fetch: "lazy"` as a synonym for `optional: true`, and MUST NOT use not-loaded to satisfy or violate `optional` / `nullable`. Those flags govern **value states after load**, not loading state.

### 5.4 Policy × loading-state matrix (after owning Resource load)

| `fetch` | Allowed loading states after owning Resource load |
| --- | --- |
| `"eager"` | `loaded` only |
| `"lazy"` | `not-loaded` or `loaded` |

An `eager` Relation that remains not-loaded after a claimed completed owning Resource load is a **load-contract violation** (semantic failure category; concrete public error codes deferred to an Accepted plan).

### 5.5 Subsequent load of a lazy Relation (informative boundary)

A host MAY later supply a previously not-loaded `lazy` Relation’s association payload. Upon that supply, loading state becomes `loaded` and RFC-025 applies. This RFC does **not** define the runtime API, query, or traversal mechanism for that subsequent supply (deferred to runtime traversal / persistence RFCs as appropriate).

## 6. Cross-declaration validity

### 6.1 Locked rules

| Rule | Normative statement |
| --- | --- |
| Required `fetch` | Every Relation MUST declare `fetch ∈ {"eager","lazy"}` |
| No omitted default | Absence of `fetch` is invalid after Accept + delivery |
| Closed vocabulary | Only `"eager"` and `"lazy"`; no third policy |
| Eager ⇒ loaded | After owning Resource load, `eager` MUST be loaded |
| Lazy permits not-loaded | After owning Resource load, `lazy` MAY be not-loaded |
| Not-loaded ≠ value state | §5.2 collapses are forbidden |
| Inbound = outbound | `fetch` applies for `direction: "inbound"` exactly as for `"outbound"` |
| No mirrored inverse fetch | Counterpart `inverse` Relations are **not** required to declare related `fetch` policies |
| Cascade orthogonal | `onDelete` / `onUpdate` neither imply nor are implied by `fetch`; cascade remains unwired |

### 6.2 Explicitly deferred (not Design Review open questions)

1. Persistence/ORM implementation, runtime traversal/query, Relation→metadata projection, and wire/serialization — see §1.2 / §14.
2. Concrete public TypeScript load/check APIs and error-code enums — deferred to an Accepted implementation plan.
3. Whether / how hosts expose a subsequent-load operation for `lazy` Relations — deferred with runtime traversal / persistence as appropriate.

## 7. Orthogonality to RFC-024

1. **`direction`** does not imply fetch policy and is not derived from fetch policy. Inbound Relations **participate in fetch exactly like outbound** Relations.
2. **`inverse`** does not imply mirrored fetch policies.
3. **`join`** identifies association binding Fields; it does not define fetch execution or SQL join plans.
4. Fetch MUST NOT silently reinterpret traversal identity as eager-join graphs or persistence mapping.

RFC-024 describes how the Relation is structurally connected; RFC-027 describes whether the association payload is part of the owning Resource’s load contract or may remain not-loaded.

## 8. Separation from RFC-026 (cascade)

1. Cascade policies (`onDelete` / `onUpdate`) and fetch policy (`fetch`) are **independent axes**.
2. This RFC does **not** wire `evaluateCascadeEvent` into load/fetch.
3. Cascade evaluation continues to consume **RFC-025 value states** of associated values when those values are present for evaluation; this RFC does not redefine that surface.
4. Hosts MUST NOT treat `fetch: "lazy"` as altering cascade policy meanings.
5. RFC-026 / M3.23 remain closed.

## 9. Invariants

1. **Contract ≠ engine:** Fetch semantics MUST NOT be defined as ORM/SQL/proxy behavior.
2. **Required `fetch`:** Every Relation MUST have `fetch`.
3. **Closed vocabulary:** Policies ∈ {`eager`, `lazy`} only.
4. **Not-loaded ≠ value state:** Not-loaded MUST NEVER be collapsed into absent / empty / association-null / present.
5. **Eager load contract:** `eager` forbids not-loaded after completed owning Resource load.
6. **Lazy permission:** `lazy` permits not-loaded after owning Resource load.
7. **RFC-025 relied upon when loaded:** Loaded Relations use RFC-025 taxonomy and permissions unchanged.
8. **RFC-024 orthogonal:** Direction / inverse / join MUST NOT be reinterpreted as fetch; inbound participates like outbound.
9. **RFC-026 separate:** Cascade remains closed and unwired.
10. **No dual shape:** After Accept + delivery, Relations lacking `fetch` are invalid.
11. **Fields out of scope:** No Field-level fetch member in this RFC.

## 10. Rationale

### 10.1 Why declaration + semantics together

A semantics-only “not-loaded” RFC would leave Resources unable to declare fetch intent; a declaration-only `eager|lazy` flag without not-loaded rules would collapse into ORM folklore or silently overload RFC-025 absent. One unit gives a complete contract.

### 10.2 Why required with no omitted default

Omitted `fetch` is ambiguous (“what does the Relation actually mean?”). Matching RFC-026’s required paired cascade members keeps the Relation floor mechanically inspectable.

### 10.3 Why only `eager` | `lazy`

A two-value closed set expresses the single contract axis this RFC needs: association payload in the owning load contract vs permitted deferral. Third states (`none`, `manual`, depth) are strategy/API design and belong to later persistence/traversal work if ever needed.

### 10.4 Why not-loaded is not a value state

RFC-025 already closed absent / empty / association-null / present. Overloading any of those for “not yet fetched” would silently change Accepted permission matrices and break cascade/value-state consumers. A separate loading-state layer preserves those floors.

### 10.5 Why `lazy` is not `optional`

`optional` governs whether a **loaded** Relation may be absent. `lazy` governs whether the association may remain **not-loaded**. Collapsing them would forbid “required association that is fetched later” and reopen RFC-013.

## 11. Worked examples (informative)

### 11.1 Eager one — must be loaded with owner

```text
Relation customer: multiplicity = "one", optional = false, nullable = false
  fetch = "eager"

Owning Resource load completes
  → customer MUST be loaded
  → then RFC-025: present non-null (absent/null forbidden by optional/nullable)
```

### 11.2 Lazy many — may remain not-loaded

```text
Relation items: multiplicity = "many", optional = false, nullable = false
  fetch = "lazy"

Owning Resource load completes
  → items MAY be not-loaded
     (this is NOT absent; optional:false is not violated by not-loaded)
  → OR items MAY be loaded as present [] / present [a,b] per RFC-025
```

### 11.3 Eager load-contract violation

```text
Relation owner: multiplicity = "one", fetch = "eager"

Claimed completed owning Resource load + owner still not-loaded
  → INVALID (eager forbids not-loaded after load)
```

### 11.4 Forbidden collapses

```text
fetch = "lazy", loading state = not-loaded

MUST NOT treat as:
  - absent
  - []
  - association-level null
  - present non-null association
```

## 12. Relationships to Accepted RFCs

| RFC | Relationship |
| --- | --- |
| RFC-008 / RFC-010 | Relied upon for Relation container and declarative `target` |
| RFC-011 | Relied upon for `"one"` / `"many"` when loaded |
| RFC-013 | Relied upon; `optional` unchanged; does **not** mean not-loaded |
| RFC-015 | Relied upon; `nullable` unchanged; does **not** mean not-loaded |
| RFC-024 | Orthogonal; direction/inverse/join unchanged and not fetch inputs; inbound participates like outbound |
| RFC-025 | Relied upon for value-state taxonomy **when loaded**; **not amended**; not-loaded is outside that taxonomy |
| RFC-026 | Separate; cascade declaration retained; `evaluateCascadeEvent` remains unwired; **not amended** |
| RFC-005 | Resource aggregate / owning Resource load contract relied upon |

## 13. Acceptance criteria (for this specification)

Satisfied at Accept:

1. `fetch` is a required closed `FetchPolicy` member with vocabulary exactly `"eager" | "lazy"`.
2. Policy meanings are contract-level and not persistence-engine definitions.
3. Not-loaded is defined as a loading state and MUST NEVER be interpreted as absent, empty, association-null, or present.
4. After owning Resource load: `eager` ⇒ loaded only; `lazy` ⇒ not-loaded or loaded.
5. When loaded, RFC-025 applies unchanged; `optional` / `nullable` are not reinterpreted as load flags.
6. RFC-024 orthogonality is normative; inbound fetch equals outbound; no mirrored inverse fetch requirement.
7. RFC-026 remains closed and unwired.
8. Persistence/ORM implementation, runtime traversal/query, Relation→metadata projection, and wire formats remain explicitly deferred.
9. RFC-024 / RFC-025 / RFC-013 / RFC-015 declaration and value-state meanings are not reinterpreted.

## 14. Deferred concerns ledger

Deferred concerns are listed in §1.2. This ledger restates that persistence/ORM implementation mechanics, runtime traversal/query execution, Relation→metadata projection, wire/serialization, query/batching/caching/proxy strategies, Field-level fetch, depth/include graphs, subsequent-load APIs for `lazy` Relations, and concrete public TypeScript check APIs remain out of scope unless a future RFC or Accepted plan explicitly defines them.

## 15. Packaging note (informative)

Prefer **one pull request per tracking issue** for the eventual delivery slice after Accept (Accepted plan + implementation together). This RFC is **Accepted**; do not begin M6 until an Accepted implementation plan exists. RFC-024 / M3.21, RFC-025 / M3.22, and RFC-026 / M3.23 remain closed and MUST NOT be reopened by this work.
