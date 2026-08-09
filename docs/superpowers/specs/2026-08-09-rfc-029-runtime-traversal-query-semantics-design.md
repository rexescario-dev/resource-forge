# RFC-029: Runtime Traversal / Query Semantics

**Date:** 2026-08-09  
**Status:** Accepted  
**M3:** Accepted (2026-08-09) — Design Review; no design blockers. Locks runtime traversal/query as a **semantic floor** (approach A): meaning of step / path / set-valued related set / query intent; not-loaded = unclassifiable traversal state (≠ empty related set); path set-union with instance-identity deduplication; invalid vs unclassifiable vs classifiable outcomes; `"one"` cardinality not weakened by set semantics; instance Relation-state traversal ≠ independent host retrieval. Consumes RFC-024–028 without redefining them; cascade orthogonal; no AST/API/ORM/wire/projection surface; `validateResource` / `evaluateCascadeEvent` / `checkRelationLoadStates` unchanged and unwired. Relation→metadata projection and host query APIs deferred. RFC-024–028 / M3.21–M3.25 closed. M4 authorized (planning may be docs-only if no host-independent core surface is required).  
**Package:** `@resource-forge/core` (contracts / semantics; no implementation in this RFC)  
**Tracking:** [#100](https://github.com/rexescario-dev/resource-forge/issues/100)  
**Depends on:** RFC-001 (Resource Identity — type identity retained), RFC-005 (Resource Model), RFC-008 (Resource Relations — ordered `relations` / `RelationName`), RFC-010 (Relation Association Semantics — `target` retained), RFC-011 (Relation Multiplicity — `"one"` \| `"many"` retained), RFC-013 (Field/Relation Optionality — `optional` retained), RFC-015 (Relation Nullability — association-reference `nullable` retained), RFC-024 (Direction / Joins — `direction` / `inverse` / `join` retained as traversal-structure inputs), RFC-025 (Value-State Semantics — absent / empty / association null / present retained as association-payload inputs), RFC-026 (Cascade Semantics — `onDelete` / `onUpdate` retained; structurally orthogonal to read traversal unless an explicit interaction is proven), RFC-027 (Loading / Fetch Semantics — `fetch` / load-state retained as traversal preconditions; `checkRelationLoadStates` unchanged and unwired by this RFC), RFC-028 (Persistence / ORM Mapping — Resource-authoritative correspondence ledger retained as the identity/storage floor for *what* is traversed; no new core surface retained)  
**Followed by:** Optional M3.26 planning/delivery after Accept ([#100](https://github.com/rexescario-dev/resource-forge/issues/100) or successor) only if a host-independent core representation is required; Relation→metadata projection (recommended follow-on RFC); wire/serialization; host navigation/query APIs; M4 Integrations execution of traversal/query against persistence correspondence  
**Unblocks:** A stable semantic floor for runtime Relation access so a later Relation→metadata projection RFC and host runtimes can project/implement against meaning rather than inventing it  

**Amends / specializes:** Fills the deferred **runtime traversal / query** gap left by RFC-024 / RFC-025 / RFC-026 / RFC-027 / RFC-028 as a **semantic contract** over existing Relation floors. Does **not** widen Resource / Field / Relation declaration members. Does **not** reopen or reinterpret RFC-024 direction/inverse/join, RFC-025 value-state taxonomy, RFC-026 cascade policies / `evaluateCascadeEvent`, RFC-027 fetch / load-state / `checkRelationLoadStates`, RFC-028 persistence correspondence, RFC-013 `optional`, RFC-015 `nullable`, or RFC-011 multiplicity meanings.

## Primary question

> What does it mean, **semantically**, to traverse a Resource Relation or express a query over related Resources—independent of how a host runtime expresses, executes, or exposes those operations?

## Thesis

RFC-029 locks runtime traversal/query as a **semantic floor**:

- **Meaning, not representation** — this RFC defines what traversal steps, paths, and related-set queries *mean*; it does **not** define a query AST, syntax, public navigation API, or host execution strategy.
- **Consume, don’t reopen** — RFC-024 / RFC-025 / RFC-026 / RFC-027 / RFC-028 supply structure, value-state, cascade (orthogonal), load-state, and persistence-correspondence identity; this RFC does not redefine them.
- **Single step → path → related set** — a traversal step follows one declared Relation from an owning Resource instance; a path chains steps; a related-set/query denotes the semantic set of related Resource instances implied by those meanings.
- **Precondition honesty** — load-state and value-state determine whether a step’s related set is classifiable; not-loaded is an **unclassifiable traversal state** and MUST NOT be collapsed into RFC-025 states or into an empty related set; missing/null/empty meanings remain RFC-025.
- **Set-valued results** — a related set is mathematically set-valued (instance-identity deduplicated); collection representation/order is not inherited.
- **No invented convenience** — if existing floors do not determine a behavior, this RFC **names the gap** rather than silently establishing a new convention for a future query API.
- **Contract ≠ engine** — semantic query intent ≠ ORM/SQL/plan/batch/cache/transaction realization.
- **No new core surface required by this RFC** — no new declaration members; no normative query language; no required public `@resource-forge/core` navigation API; `validateResource`, `evaluateCascadeEvent`, and `checkRelationLoadStates` remain **unchanged and unwired by RFC-029**.

```text
Invariant:
  RFC-029 defines the meaning of traversal and querying,
  but does not define how a host expresses, executes, or exposes those operations.

Owning Resource instance
  └── traversal step along Relation R
        ├── structure: direction / inverse? / join?     ← RFC-024 (consumed)
        ├── load-state: not-loaded | loaded             ← RFC-027 (consumed)
        ├── when loaded → value-state                   ← RFC-025 (consumed)
        ├── cardinality shape: one | many               ← RFC-011 (consumed)
        └── related set (semantic result)               ← this RFC

Persistence correspondence (RFC-028) identifies what is being traversed;
cascade (RFC-026) does not redefine read-traversal results.
```

## 1. Scope

### 1.1 Goals

1. Define normative **semantic meaning** of a single Relation traversal step.
2. Define normative **semantic meaning** of a multi-step traversal path.
3. Define normative **related-set / query semantics** as the set of related Resource instances implied by step/path meaning—without a query language.
4. Distinguish **invalid traversal identity**, **unclassifiable traversal state**, and **classifiable related-set** outcomes.
5. State **cardinality implications** for `one` vs `many` related-set shape using RFC-011.
6. Consume RFC-027 load-state so not-loaded Relations are not silently traversable as value-bearing associations.
7. Consume RFC-025 for missing / null / empty / present association semantics once loaded.
8. Consume RFC-024 for direction / inverse / join interpretation during traversal identity.
9. Consume RFC-028 as the identity/storage floor for *what* is traversed (type + association correspondence), without reopening mapping.
10. State cascade interaction honestly: RFC-026 remains **orthogonal** to read-traversal meaning unless a hard dependency is proven (none is claimed here).
11. Address **cycles** at the semantic level without inventing cycle-breaking host algorithms.
12. Explicitly forbid query AST / syntax, public core navigation API, ORM execution, planning/batching/caching/transactions, wire, and Relation→metadata projection in this RFC.
13. Keep `validateResource`, `evaluateCascadeEvent`, and `checkRelationLoadStates` **unchanged and unwired by RFC-029**.

### 1.2 Non-goals

This RFC does not define:

1. A query AST, query language, or host-facing syntax for paths/filters
2. A public `@resource-forge/core` navigation / query API, modules, or error-code enums
3. How any persistence engine, ORM, or database executes traversal or query (SQL joins, Prisma `include`, proxies, hydration)
4. Query planning, join algorithms, batching, N+1 mitigation, caching, or transactions
5. Runtime loading *implementation* (how a host establishes loaded vs not-loaded; subsequent-load mechanisms)
6. Relation → `ResourceMetadata` projection or changes to RFC-006 / RFC-023
7. Wire / serialization formats for paths, related sets, or not-loaded holes
8. Predicate / filter / sort / pagination / projection-selector languages over related sets
9. Depth hints, include graphs, or partial-Resource load plans as declaration or API surfaces
10. New Resource / Field / Relation declaration members
11. Changes to `validateResource`, `evaluateCascadeEvent`, or `checkRelationLoadStates` (they remain unchanged and unwired by this RFC)
12. Reopening RFC-024 / RFC-025 / RFC-026 / RFC-027 / RFC-028 (or M3.21–M3.25)
13. Invented semantics solely because they would be useful for a future query API—when floors do not determine a behavior, the gap is named (§10)

## 2. Terminology

| Term | Meaning |
| --- | --- |
| Traversal step | Semantic follow of exactly one declared Relation from an owning Resource **instance** toward that Relation’s associated target instance(s) |
| Traversal path | Ordered sequence of one or more traversal steps, where each subsequent step’s owning instance(s) are drawn from the previous step’s related set |
| Related set | A **mathematically set-valued** semantic result: the set of target Resource instances denoted by a step (or path) under established load/value-state rules. Repeated encounters of the same Resource instance denote **one** member. Ordering and host representation are unspecified |
| Query (semantic) | An expression of intent to obtain a related set (and/or to navigate a path); **not** a syntax, AST, or execution plan |
| Traversal identity | Structural understanding of which Relation connects which types (RFC-024); used here as the structural axis of a step |
| Owning instance | A Resource instance from which a step is taken |
| Target instance | A Resource instance of the Relation’s declared `target` type that is associated via that Relation |
| Classifiable association | A Relation that is **loaded** (RFC-027) and therefore subject to RFC-025 value-state classification |
| Invalid traversal identity | The requested step Relation does **not** exist on the Resource type from which the step is taken |
| Unclassifiable traversal state | The Relation exists, but current runtime load/value preconditions prevent deriving a related set (notably **not-loaded**). This is **not** a public error/API contract |
| Gap | A behavior not determined by Accepted floors; named here, not filled by convention |

RFC-008 / RFC-010 / RFC-011 / RFC-013 / RFC-015 / RFC-024 / RFC-025 / RFC-026 / RFC-027 / RFC-028 terms keep their existing meanings. This RFC **does not** change declaration-time definitions of `optional`, `nullable`, `multiplicity`, `direction`, `inverse`, `join`, `onDelete`, `onUpdate`, or `fetch`.

## 3. Governing boundary

> **RFC-029 defines the meaning of traversal and querying, but does not define how a host expresses, executes, or exposes those operations.**

Corollaries:

1. Hosts MAY expose any API/syntax that preserves these meanings.
2. Hosts MAY realize related-set retrieval by any strategy consistent with RFC-027 load contracts and RFC-028 correspondence.
3. Absence of a core navigation API is **not** a defect of this RFC.
4. Semantic query intent MUST NOT be read as prescribing SQL/ORM/`include`/proxy behavior.

## 4. Single Relation traversal step

### 4.1 Structural axis (RFC-024 consumed)

A traversal step is identified by:

1. An owning Resource type and instance
2. A declared Relation `R` on that owning type (`RelationName` uniqueness, RFC-008)
3. `R.target` as the associated Resource type (RFC-010)
4. `R.direction` / optional `inverse` / optional `join` as **traversal-structure inputs** (RFC-024)

Normative consumption:

| Input | Meaning for a step |
| --- | --- |
| `direction: "outbound"` | Step follows the Relation from owning instance toward `target` |
| `direction: "inbound"` | Step follows the Relation as an inbound edge declared on the owning type; inbound participates in step identity **exactly like outbound** for read-traversal meaning (no mirrored-step requirement) |
| `inverse` (when present) | Identifies the declared reverse-edge Relation on `target`; does **not** by itself perform a second step and does **not** require reciprocal traversal |
| `join` (when present) | Identifies `{ local, remote }` Fields participating in association identity; does **not** prescribe join algorithm or FK ownership |

Absence of `inverse` or `join` does **not** make a step structurally invalid. It only means those optional identity handles are not declared (RFC-024).

### 4.2 Load-state precondition (RFC-027 consumed)

Relative to a claimed owning Resource load outcome for the owning instance:

1. If `R` is **not-loaded**, the step is in an **unclassifiable traversal state**. The step does **not** yield a related set under this RFC—including not an empty related set.
2. Not-loaded MUST NEVER be interpreted as absent, empty, association-null, or present (RFC-027). **Not-loaded ≠ empty related set.**
3. If `R` is **loaded**, RFC-025 classification applies (§4.3).
4. This RFC does **not** define auto-load-on-traverse, subsequent-load APIs, or host mechanisms that turn not-loaded into loaded.

**Unclassifiable traversal state — not-loaded step:** treating a not-loaded Relation as yielding associated instances (including as contributing ∅) is forbidden under this semantic floor. Whether a host surfaces that as an error, unknown/hole, or other API outcome is **out of scope**; concrete public error codes remain deferred.

### 4.3 Value-state → related set (RFC-025 consumed)

When `R` is **loaded**, exactly one RFC-025 Relation value-state branch applies. Related-set meaning:

| Loaded value state | Related set (semantic) |
| --- | --- |
| `absent` | No associated instances; related set is **empty** as a result of absence (not an empty `many` collection value) |
| `present` + association-null | No associated instances; related set is **empty** as a result of association-null (distinct from absent and from empty collection) |
| `present` + non-null + `multiplicity: "one"` | Related set has **cardinality exactly 1** (the associated target instance) |
| `present` + non-null + `multiplicity: "many"` + empty | Related set has **cardinality 0** (present empty collection ≠ absent; ≠ association-null) |
| `present` + non-null + `multiplicity: "many"` + non-empty | Related set membership is exactly the associated target instances; as a **set**, duplicate instance identities collapse to one member |

Notes:

1. `empty ≠ absent` and `empty ≢ association-null` remain RFC-025; this RFC does not collapse them for traversal convenience.
2. Whether `absent` / association-null are *allowed* remains RFC-013 / RFC-015; this RFC consumes those permissions and does not amend them.
3. Null elements in `many` remain **forbidden** under current floors (RFC-025); this RFC does not introduce element-null traversal rules.
4. A loaded `many` association may be represented as a collection at the value-state layer (RFC-025), but **collection representation and order are not inherited into the semantic related set**. The related set is set-valued membership only; hosts MUST NOT treat source-collection order as a normative semantic property of the related set.
5. **Gap (named, not filled):** any normative *ordering* over related-set members (beyond set membership) is **not** determined by Accepted floors. Hosts MUST NOT treat this RFC as inventing a normative order.

### 4.4 Cardinality implications (RFC-011 consumed)

1. `multiplicity: "one"` means the non-null association shape is singleton; the related set of a successful present non-null step has exactly one instance.
2. For `multiplicity: "one"`, the singleton association denotes exactly one target Resource instance; set-valued semantics do **not** weaken that cardinality constraint.
3. `multiplicity: "many"` means the non-null association shape is a collection; the related set may contain zero or more instances (with instance-identity deduplication in the semantic result).
4. Cardinality of the related set after absent / association-null / empty is zero (§4.3); that does **not** reinterpret multiplicity declaration meaning.

### 4.5 Persistence floor (RFC-028 consumed)

1. Traversal denotes navigation among Resource instances whose types and associations participate in RFC-028 persistence correspondence.
2. Type identity remains `ResourceIdentity`; instance identity / PK remains distinct (RFC-028 §3).
3. This RFC does **not** define how hosts resolve instance identity, nor any PK declaration surface.
4. Honor ≠ implement remains: realizing a related set via store queries is host/M4 concern.

### 4.6 Cascade (RFC-026 consumed as orthogonal)

1. `onDelete` / `onUpdate` are cascade intents for owning-Resource **delete/update events**.
2. They do **not** redefine what a read-traversal step means or which related set a loaded association denotes.
3. `evaluateCascadeEvent` remains **unchanged and unwired by RFC-029**.
4. **Gap (named, not filled):** this RFC does not invent traversal rules that depend on cascade policy (e.g. “restrict means not traversable”). No such dependency is established by RFC-026.

## 5. Multi-step traversal paths

### 5.1 Path meaning

A traversal path `R1 / R2 / … / Rn` means:

1. Start from an owning instance `I0`.
2. Step `R1` from `I0` yields related set `S1` when classifiable (§4); if that step is unclassifiable, the path result is unclassifiable (§5.1.1).
3. For each subsequent step `Rk`, when every instance in `S(k-1)` has a **classifiable** step `Rk`, the step is applied to each such owning instance and the path’s related set `Sk` is the **set-union** of those per-instance related sets (mathematical union: repeated Resource instance identities appear once).

#### 5.1.1 Not-loaded intermediates (normative)

If evaluation of a required path step encounters a **not-loaded** Relation for an owning instance, that branch is **unclassifiable**.

1. Unclassifiable MUST NOT be treated as an empty related-set contribution from that branch (**not-loaded ≠ empty**).
2. RFC-029 does **not** define whether a host may return partial results from other classifiable branches, fail the whole path, expose a hole/unknown branch, or auto-load. Those choices are host/API/execution concerns (§10).
3. This rule is about semantic evaluation of Relation state, not a prescribed execution walk or optimizer schedule.
4. The path does not invent auto-load-on-traverse.

#### 5.1.2 Empty intermediates (classifiable)

When an intermediate step is **loaded** and yields an empty related set under §4.3 (absent / association-null / empty `many`), the path continues with that empty set and the path result is an **empty related set** (classifiable). Empty (classifiable) ≠ unclassifiable (not-loaded).

#### 5.1.3 Structural validity along paths

Each step MUST refer to a Relation declared on the Resource type of the instances from which it is taken. Otherwise the path has an **invalid traversal identity**.

### 5.2 Direction / inverse along paths

1. Each step consumes its own `direction` / `inverse` / `join` independently (RFC-024).
2. Presence of `inverse` on `Rk` does **not** require the path to include the counterpart Relation.
3. Paths MAY mix outbound and inbound steps; inbound is not a second-class traversal axis.

### 5.3 Cycles

1. **Type-level cycles** (schema allows returning to a previously seen Resource type) are ordinary and **not** invalid.
2. **Instance-level cycles** (a walk revisits the same Resource instance) are possible when associations form a cycle.
3. Encountering an instance-level cycle does **not**, by itself, invalidate path meaning.
4. Set-valued related-set membership already collapses repeated instance identities in a **result** (§2 / §5.1). That is distinct from *execution* policies that detect, terminate, or error when a walk revisits an instance.
5. **Gap (named, not filled):** whether hosts must detect, terminate, or error on instance cycles during *execution* is not determined by Accepted floors and is **not** prescribed here. This RFC only states that cycles are semantically possible and not inherently schema-invalid.

## 6. Related-set / query semantics

### 6.1 Query as semantic intent

A **query** in this RFC means intent to obtain the related set denoted by a step or path (§4–§5). It is **not**:

- a language or AST
- a filter/sort/page algebra
- an execution plan

### 6.2 Classification of outcomes (semantic)

```text
Relation doesn't exist on current type
    → invalid traversal identity

Relation exists but isn't loaded
    → unclassifiable traversal state
      (MUST NOT treat as empty related set)

Relation exists and is loaded
    → derive related set (set-valued) per §4.3
```

| Situation | Classification |
| --- | --- |
| Step Relation not declared on owning type | **Invalid traversal identity** |
| Step Relation declared; not-loaded | **Unclassifiable traversal state** (§4.2) — not an empty related set |
| Step Relation loaded; value-state classified | **Classifiable** — related set per §4.3 (set-valued) |
| Path step not declared on intermediate type | **Invalid traversal identity** |
| Path branch with not-loaded intermediate | **Unclassifiable** for that branch (§5.1.1); partial-result policy is a gap |
| Path with classifiable empty intermediate related set | **Classifiable** with empty related-set result (§5.1.2) |
| Filter/predicate over Fields of related instances | **Gap** — not defined by this RFC (§10) |
| Ordering / pagination of related sets | **Gap** — not defined by this RFC (§10) |

### 6.3 Distinction: semantic intent vs host realization

| Semantic (this RFC) | Host realization (deferred) |
| --- | --- |
| Related set of `Customer.orders` (set-valued) | SQL join / Prisma `include` / two queries / cache hit |
| Path `orders / lines` when all steps classifiable | Nested include / batched follow-up / graph walk |
| Not-loaded step/branch → unclassifiable | Lazy proxy touch / explicit load API / error / hole — host choice |

Hosts MUST preserve semantic distinctions (especially **not-loaded ≠ empty related set** and not-loaded ≠ absent/empty/null value states) even when realization strategies differ.

A host MAY have an **independent retrieval operation** whose execution obtains related Resources without traversing the current loaded value of an owning instance’s Relation; such an operation is **outside RFC-029** unless and until a future query API defines its semantics. RFC-029’s not-loaded rule applies specifically to **semantic traversal of the owning instance’s Relation state**. Traversal of an instance’s current Relation state ≠ a host query that independently retrieves associated Resources.

## 7. Invariants

1. **Meaning ≠ expression/execution/exposure** — §3 boundary is normative.
2. **Consume, don’t reopen** — RFC-024–028 remain authoritative for their members/policies/surfaces.
3. **Not-loaded ≠ value state** — RFC-027 collapses remain forbidden under traversal.
4. **Not-loaded ≠ empty related set** — unclassifiable traversal state MUST NOT be treated as contributing ∅.
5. **Loaded ⇒ RFC-025** — related-set membership is derived only after load-state is loaded.
6. **Related sets are set-valued** — repeated Resource instance identities denote one member; collection order/representation is not inherited.
7. **No auto-load-by-semantics** — this RFC does not turn traversal meaning into a load operation.
8. **Cardinality from RFC-011** — related-set shape follows multiplicity; empty *classifiable* results do not rewrite multiplicity.
9. **Inbound = outbound for read traversal** — direction labels structure; inbound is not excluded from steps/paths.
10. **Cascade orthogonal to read traversal** — RFC-026 does not redefine related sets.
11. **Persistence correspondence is the what, not the how** — RFC-028 identifies corresponding associations/entities; hosts realize retrieval.
12. **No invented convenience semantics** — gaps are named (§10), not filled (including path partial-result policy).
13. **No new core surface required** — no declaration widen; no normative AST/API; existing checkers unchanged and unwired by this RFC.
14. **Cycles possible, not inherently invalid** — execution terminate/error policy is a named gap (distinct from set-valued result membership).

## 8. Rationale

### 8.1 Why semantics-only (approach A)

RFC-024 already defined structural traversal *identity* without runtime. RFC-027 defined load contracts without navigation APIs. Jumping to a query AST or core navigation API would freeze representation before Relation→metadata projection and M4 hosts prove what must be shared. A semantic floor gives those follow-ons a stable meaning to project/implement.

### 8.2 Why not-loaded blocks related-set classification

Collapsing not-loaded into empty/absent would destroy RFC-027’s central invariant and poison every later projection/API. The same collapse must not reappear as “path branch contributes nothing.” Unclassifiable ≠ empty; partial-path policy is deferred so M2 does not invent fail-whole / partial / hole / auto-load.

### 8.2a Why related sets are mathematically set-valued

Path composition naturally encounters the same instance via multiple branches (`orders / customer` → `C1` twice). Locking set membership keeps “related set” honest without prescribing bag/list representation or walk order. Representation and ordering remain deferred.

### 8.3 Why cascade stays orthogonal

Cascade answers delete/update propagation, not “what instances are associated for read.” Coupling them here would reopen RFC-026 without evidence.

### 8.4 Why gaps are first-class

Prior RFCs repeatedly forbade silent defaults. Inventing order, filters, or cycle-break rules “for the query API” would smuggle M4/API design into M2. Naming gaps keeps Draft reviewable and prevents premature convention.

## 9. Worked examples (informative)

### 9.1 Loaded outbound `many`

```text
Customer C1 loaded
Relation orders: fetch=eager, multiplicity=many, direction=outbound
value-state: present non-null non-empty → [O1, O2]

Step Customer --orders--> 
  related set = {O1, O2}
```

### 9.2 Not-loaded lazy Relation

```text
Customer C1 loaded
Relation orders: fetch=lazy → not-loaded

Step Customer --orders-->
  related set = not classifiable
  MUST NOT treat as absent / [] / null
```

### 9.3 Present empty vs absent

```text
orders loaded + present empty many  → related set cardinality 0 (empty collection)
orders loaded + absent              → related set cardinality 0 (absence)
These remain distinct semantic histories (RFC-025), even if both yield no instances.
```

### 9.4 Path with classifiable empty intermediate

```text
Path: orders / lines
orders loaded + present empty many → related set = {}
⇒ path related set = {}
(classifiable empty result; not unclassifiable; not an invalid path)
```

### 9.4a Path with not-loaded intermediate branch

```text
Path: orders / lines
orders loaded → {O1, O2}
O1.lines loaded → {L1}
O2.lines not-loaded

⇒ branch via O2 is unclassifiable
⇒ MUST NOT treat as lines(O1) ∪ {}
⇒ RFC-029 does not choose fail-whole / partial / hole / auto-load
```

### 9.4b Set-valued path union

```text
Path: orders / customer
orders → {O1, O2}
O1.customer → {C1}
O2.customer → {C1}

⇒ related set = {C1}   (set-union; not [C1, C1])
ordering / bag representation remain unspecified
```

### 9.5 Inbound step

```text
Order O1
Relation customer: direction=inbound (declared on Order), loaded, present → C1

Step Order --customer--> related set = {C1}
(inbound participates like outbound for read-traversal meaning)
```

### 9.6 Forbidden invention

```text
Host assumes related-set order = source collection / DB order
  → NOT authorized by this RFC (order not inherited into set)

Host assumes traverse(not-loaded) contributes ∅ or auto-loads
  → NOT authorized by this RFC
```

## 10. Named gaps (explicit non-invention)

The following are **not** determined by Accepted floors and are **not** silently filled here:

1. Normative ordering of related-set members (set membership is locked; order is not)
2. Predicate / filter / sort / pagination algebra over related sets
3. Host policy when a path has mixed classifiable and unclassifiable branches (fail-whole / partial / hole / auto-load)
4. Host cycle detection / termination / error policy during *execution* (distinct from set-valued result membership)
5. Public error-code taxonomy for invalid vs unclassifiable vs empty results
6. Subsequent-load operation that flips not-loaded → loaded (mechanism and API)
7. Whether path expressions are first-class declaration/metadata members
8. Relation→metadata projection of traversal/query meaning
9. Wire representation of paths / related sets / not-loaded holes

A future RFC or Accepted plan MAY fill a gap deliberately; until then hosts MUST NOT claim those behaviors are required by RFC-029.

## 11. Relationships to Accepted RFCs

| RFC | Relationship |
| --- | --- |
| RFC-001 | Relied upon for type identity of owning/target instances; **not amended** |
| RFC-005 | Resource aggregate relied upon |
| RFC-008 / RFC-010 | Relation membership / `target` relied upon for step identity |
| RFC-011 / RFC-013 / RFC-015 | Multiplicity / optional / nullable retained as inputs; **not amended** |
| RFC-024 | Consumed as traversal-structure inputs; **not amended** |
| RFC-025 | Consumed for loaded association → related-set derivation; **not amended** |
| RFC-026 | Orthogonal to read traversal; `evaluateCascadeEvent` unchanged and unwired; **not amended** |
| RFC-027 | Consumed for load-state preconditions; `checkRelationLoadStates` unchanged and unwired; **not amended** |
| RFC-028 | Consumed as identity/storage correspondence floor for what is traversed; **not amended** |
| RFC-006 / RFC-023 | Projection composition not amended; Relation→metadata projection deferred |

## 12. Acceptance criteria (for this specification)

Satisfied at Accept:

1. Traversal/query is defined as a **semantic floor** (meaning of step / path / related set / query intent) without AST, syntax, or required public core navigation API.
2. The governing boundary is normative: meaning ≠ how a host expresses, executes, or exposes operations.
3. Single-step meaning consumes RFC-024 structure, RFC-027 load-state, RFC-025 value-state, RFC-011 cardinality, and RFC-028 correspondence without redefining them.
4. Not-loaded yields **unclassifiable traversal state**, not an empty related set; not-loaded collapses remain forbidden.
5. Related sets are mathematically **set-valued** (instance-identity deduplicated); collection order/representation is not inherited.
6. Multi-step paths use set-union when classifiable; a not-loaded intermediate makes that branch **unclassifiable**; partial-result policy is a named gap.
7. **Invalid traversal identity** vs **unclassifiable traversal state** vs classifiable related set are sharply distinguished.
8. Cascade remains orthogonal to read-traversal meaning; no invented cascade→traversal coupling.
9. Cycles are acknowledged as possible and not inherently invalid; execution cycle policy is a named gap.
10. Named gaps (§10) explicitly refuse invented convenience semantics.
11. No new declaration members; `validateResource` / `evaluateCascadeEvent` / `checkRelationLoadStates` unchanged and unwired by this RFC.
12. Instance Relation-state traversal is distinct from independent host retrieval of associated Resources (§6.3).
13. Query AST/syntax, ORM/SQL execution, planning/batching/caching/transactions, wire, and Relation→metadata projection remain explicitly deferred.
14. RFC-024 / RFC-025 / RFC-026 / RFC-027 / RFC-028 / M3.21–M3.25 remain closed.

## 13. Deferred concerns ledger

Deferred concerns are listed in §1.2 and §10. This ledger restates that query AST/syntax, public core navigation APIs, ORM/SQL/Prisma execution, planning/batching/caching/transactions, runtime load mechanisms, path mixed-branch host policy, Relation→metadata projection, wire/serialization, filter/sort/page algebras, normative related-set ordering, and concrete public TypeScript traversal APIs remain out of scope unless a future RFC or Accepted plan explicitly defines them.

## 14. Packaging note (informative)

Prefer **one pull request per tracking issue** for the eventual delivery slice after Accept. This RFC is **Accepted**. Do not begin M6 until an Accepted implementation plan exists **if** delivery requires host-independent core artifacts; otherwise Accept primarily authorizes semantic consumption by follow-on projection RFCs and M4 Integrations. RFC-024 / M3.21, RFC-025 / M3.22, RFC-026 / M3.23, RFC-027 / M3.24, and RFC-028 / M3.25 remain closed and MUST NOT be reopened by this work.
