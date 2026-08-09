# RFC-023: Richer Projection — Composition Semantics

**Date:** 2026-08-09  
**Status:** Accepted  
**M3:** Accepted (2026-08-09) — Design Review; no design blockers. Locks projection composition as pure order-independent disjoint union of abstract projection sources; `MetadataKey` cross-source collision is a hard failure even when values are deeply equal; no precedence, deduplication, value merge, or silent drop; annotations remain the sole concrete source under RFC-006; does not authorize Field/Relation/Operation emitters; direction/joins and empty-vs-absent deferred; RFC-004 aligned in fail-closed spirit at different ownership grain (key vs namespace). M4 authorized.  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#83](https://github.com/rexescario-dev/resource-forge/issues/83)  
**Depends on:** RFC-001 (Resource Identity — via Resource / projected identity), RFC-002 (Metadata Model — `MetadataKey` / `JsonValue` / `ResourceMetadata`), RFC-005 (Resource Model — `projectResourceMetadata` capability), RFC-006 (Annotations — sole current concrete projection source; direct 1:1 contribution), RFC-022 (Annotation Vocabulary — closed annotation-scoped `rf` catalog that later emitters must explicitly adopt)  
**Followed by:** M3.x implementation planning for projection composition; later RFCs that authorize additional projection sources (e.g. Field / Relation / Operation → metadata) MUST obey this composition contract; direction / joins; empty-vs-absent / null elements  
**Unblocks:** M3.x projection-composition implementation planning (M4→M5), then implementation (M6), after this RFC is Accepted — not implementation by itself; stable composition contract for future emitter RFCs  
**Amends / specializes:** RFC-005 by filling the deferred projection composition / collision gap with a normative multi-source composition contract. Amends RFC-006 by classifying annotation → metadata emission as the **annotations** projection source under that contract (direct 1:1 exact preservation retained). Relies on RFC-022 adoption rules for any `rf` emission. Does **not** authorize Field / Relation / Operation metadata emission, new annotation vocabulary, direction/joins, or empty-vs-absent / null-element semantics. Conceptual alignment with RFC-004 fail-closed composition (no precedence / silent reconciliation) at a different ownership grain (`MetadataKey`, not namespace partition).

## Primary question

> When multiple **projection sources** contribute entries toward one `projectResourceMetadata` result, how are **collisions, composition, determinism, and failure** defined—without expanding which Resource constructs may emit metadata today?

## Thesis

RFC-023 defines **projection composition** as a pure, order-independent **disjoint union** of per-source contributions into one `ResourceMetadata` entry mapping:

- **Projection source (abstract)** — a distinct contributor that emits zero or more `MetadataKey → JsonValue` entries for one projection.
- **At most one source per key** — a `MetadataKey` collision across sources is a **hard composition error**, even when the contributing `JsonValue`s are deeply equal.
- **No reconciliation** — no precedence, ranking, last-wins / first-wins, deep-equality deduplication, implicit value merge, or silent drop.
- **Emitter set unchanged** — this RFC defines how contributions compose; it does **not** expand the set of constructs that contribute projections.
- **Annotations today** — the sole concrete source is annotations (RFC-006 direct 1:1); composition with that single source preserves today’s successful projection floor.

```text
Invariant:
  RFC-023 defines how projection contributions compose;
  it does not expand the set of constructs that contribute projections.

Composition (conceptual):
  inputs:  ResourceIdentity + unordered set of projection contributions
           (each contribution tagged by a distinct ProjectionSource)
  each contribution: unordered unique MetadataKey → JsonValue
  success: ResourceMetadata whose entries = disjoint union of contributions
  failure: any MetadataKey contributed by more than one source
           (values ignored for equality — collision is key identity only)

Today's concrete set:
  { annotations }  →  RFC-006 direct 1:1 entries
```

## 1. Scope

### 1.1 Goals

1. Define an abstract **projection source** and **projection contribution** model for `projectResourceMetadata`.
2. Define **collision detection** at `MetadataKey` identity (RFC-002 equality).
3. Define **composition** as disjoint union of contributions with hard failure on collision.
4. Explicitly **exclude** precedence, last/first-wins, deep-equality collapse, implicit merge, and silent dropping.
5. State **determinism**: successful composition results are independent of source evaluation order.
6. State **conflict/error** behavior as composition failure (not silent repair).
7. Fit the existing **Annotation → metadata** path as the current/only concrete source under this framework.
8. Require future emitter RFCs that introduce new sources to obey this contract and to resolve key-ownership conflicts themselves (not via silent precedence here).
9. Explicitly defer direction / joins, empty-vs-absent / null elements, and any new schema→metadata emitters.

### 1.2 Non-goals

This RFC does not define:

1. Field → metadata projection (authorization or key shapes)
2. Relation → metadata projection
3. Operation → metadata projection
4. Any new annotation vocabulary or changes to RFC-022’s closed `rf` catalog
5. Direction / joins / relationship traversal semantics
6. Empty-vs-absent / null-element value-state semantics (unless a future RFC shows a strict dependency; none is required for this contract)
7. Precedence ladders, source ranking, override, deep merge, or last/first-wins reconciliation
8. Deep-equality deduplication of colliding keys
9. Namespace-partition exclusive ownership as used by RFC-004 producers (different contract; see §7)
10. Reverse projection (`ResourceMetadata` → Resource)
11. Changes to RFC-006 within-source uniqueness, snapshot, or exact-preservation contribution rules
12. Registry association, discovery, host adapters, or wire formats
13. Concrete TypeScript API names, modules, or error-code enums beyond what a later Accepted plan needs to express this contract (informative names may appear)

## 2. Terminology

| Term | Meaning |
| --- | --- |
| Projection source | An abstract, distinct contributor of zero or more metadata entries during `projectResourceMetadata` |
| ProjectionSource identity | Stable identity of a projection source within one composition (e.g. conceptual `annotations`); used only to distinguish sources — not a precedence rank |
| Projection contribution | The unordered `MetadataKey → JsonValue` mapping emitted by one projection source for one composition |
| Cross-source collision | The same `MetadataKey` (RFC-002 equality) appears in two or more contributions in one composition |
| Composition | Pure combination of an unordered set of projection contributions into one entry mapping (or failure) |
| Disjoint union | Successful composition operator: entries are the set-union of contributions; defined only when key sets are pairwise disjoint |

RFC-001 / RFC-002 / RFC-005 / RFC-006 / RFC-022 terms (`Resource`, `ResourceIdentity`, `ResourceMetadata`, `MetadataKey`, `JsonValue`, `projectResourceMetadata`, `Annotations`, annotation vocabulary) keep their existing meanings except where this RFC defines multi-source composition.

## 3. Projection sources and contributions

### 3.1 Abstract source

A **projection source**:

1. Has a **ProjectionSource identity** distinct from other sources in the same composition.
2. Emits exactly one **projection contribution** per composition attempt (possibly empty).
3. Does not rank above or below any other source; identity is not precedence.
4. Is eligible for Resource projection only when an Accepted RFC explicitly authorizes that source and defines or adopts its contribution semantics. RFC-023 recognizes the already-authorized **annotations** source under RFC-006; it does not authorize Field, Relation, or Operation sources.

Duplicate ProjectionSource identities in one composition input set are invalid (composition failure). A duplicate `ProjectionSource` identity is a composition-input error and is distinct from a cross-source `MetadataKey` collision. Sources form an **unordered set**.

### 3.2 Contribution shape

Each contribution is an unordered mapping from `MetadataKey` to `JsonValue` such that:

1. Keys within one contribution are unique (no within-source duplicates).
2. Values are RFC-002 `JsonValue`s.
3. Empty contribution (zero entries) is valid.
4. Contribution emission MUST NOT mutate the Resource (RFC-005 purity).

Within-source uniqueness for annotations remains RFC-006’s responsibility. This RFC does not weaken that rule.

### 3.3 Concrete source today: annotations

The only projection source authorized by Accepted RFCs today is **annotations**:

| ProjectionSource identity | Contribution rule | Authority |
| --- | --- | --- |
| `annotations` | Direct 1:1 exact preservation of each annotation entry’s `MetadataKey` and `JsonValue` (RFC-006); empty annotations → empty contribution | RFC-006; vocabulary validity RFC-022 |

`projectResourceMetadata` MUST treat annotation participation as this source’s contribution. It MUST NOT invent additional sources under this RFC alone.

### 3.4 Emitter-set invariant

> **RFC-023 defines how projection contributions compose; it does not expand the set of constructs that contribute projections.**

Until a future Accepted RFC authorizes another source, the concrete source set for Resource projection is exactly `{ annotations }`.

## 4. Composition contract

### 4.1 Inputs, outputs, purity

Composition is a pure operation used by (or defining the entry-assembly portion of) `projectResourceMetadata`.

**Inputs:**

1. the Resource’s `ResourceIdentity` (RFC-001 / RFC-005 identity agreement);
2. an unordered set of projection contributions, each tagged by a distinct ProjectionSource identity.

**Outcomes:**

1. one entry mapping suitable for an RFC-002-valid `ResourceMetadata` (with that identity); or
2. a **composition failure**.

Composition MUST NOT mutate the Resource, registry state, or input contributions. Given equivalent identity and equivalent contributions, composition yields an equivalent entry mapping or an equivalent failure class.

Upstream Resource validation (RFC-005 / member floors / RFC-006 / RFC-022) remains a precondition for successful projection, as today. Composition failure is distinct from “invalid Resource” and from structural RFC-002 metadata construction failure, though implementations MAY surface them through a shared projection-error channel (informative packing).

### 4.2 Collision detection

A **cross-source collision** occurs when the same `MetadataKey` is present in two or more contributions in the composition input set.

- Key equality is RFC-002 `MetadataKey` equality (namespace + name; case-sensitive exact).
- Contributing `JsonValue`s are **irrelevant** to collision detection: equal values still collide; unequal values collide.
- Within-source duplicate keys remain invalid at the source’s own validation layer (for annotations: RFC-006) and MUST NOT be “fixed” by composition.

### 4.3 Hard failure — no reconciliation

If any cross-source collision exists, composition **MUST fail**.

Composition MUST NOT:

1. apply precedence or source ranking;
2. apply last-wins or first-wins;
3. collapse collisions via deep equality of values;
4. deep-merge, overlay, or otherwise combine values for the same key;
5. silently drop either colliding contribution;
6. rename, envelope, or rewrite keys to avoid a collision.

**Rationale lock:** ownership of key space stays with the RFCs that authorize emitters. If a future Field / Relation / Operation projection needs a key that annotations (or another source) already contribute, **that emitter RFC** must resolve namespace/key ownership — RFC-023 does not silently decide a winner.

### 4.4 Successful composition = disjoint union

When there is no cross-source collision:

1. The composed entry mapping is the **disjoint union** of all contributions.
2. Each entry appears with the contributing source’s exact `MetadataKey` and exact `JsonValue` (no normalization).
3. Absence of a key from all contributions means the key is absent from the result (this RFC does not define empty-vs-absent value-state beyond that).
4. Order of sources and order of entries have **no semantic effect** on the successful result (RFC-002 unordered mapping).

### 4.5 When “merge” is permitted

Under this RFC, **value-level merge is never permitted**.

The only permitted combination operator is **disjoint union of contributions**. Calling that “merge” in prose MUST NOT be read as deep merge, override, or reconciliation.

### 4.6 Determinism and ordering

1. Projection sources are an unordered set; evaluation order MUST NOT affect success/failure classification for a given contribution set.
2. For successful composition, the resulting `ResourceMetadata` entry mapping MUST be semantically equal regardless of evaluation order (RFC-002 equality).
3. Diagnostic message ordering, iteration order, and error formatting are non-normative.

### 4.7 Single-source and empty cases

1. **One source, any size** — composition succeeds iff that source’s contribution is well-formed; there is no cross-source collision possible.
2. **Annotations only (today)** — composition of `{ annotations }` with RFC-006’s contribution reproduces the current successful annotation projection floor.
3. **All contributions empty** — succeeds with zero metadata entries (still a valid RFC-002 snapshot when paired with identity), matching RFC-005’s empty Resource projection floor when annotations are empty.
4. **Zero contributions (abstract)** — Composition of zero contributions is valid as an abstract operation and produces an empty entry mapping. However, the current `projectResourceMetadata` contract always supplies the `annotations` source, whose contribution may itself be empty. Future RFCs MUST NOT remove annotations’ eligibility without an explicit amending decision.

### 4.8 `rf` adoption (relied upon, not redefined)

This RFC does not redefine RFC-022’s catalog.

1. The annotations source remains subject to RFC-022 vocabulary validation before/at Resource validity.
2. Any **future** projection source that emits `rf` keys MUST **explicitly adopt** RFC-022’s catalog (or a future amending vocabulary RFC) before doing so.
3. Composition itself does not reinterpret `rf` values; it only enforces key-disjointness across sources.

## 5. Worked examples (informative)

**Valid today — annotations only:**

```text
sources: { annotations }
annotations contribution:
  (rf, description) → "A customer"
  (ext, label)      → "Customer"
compose → both entries present
```

**Valid later (hypothetical) — disjoint keys across sources:**

```text
sources: { annotations, fields }   // fields source only if a future RFC authorizes it
annotations: (rf, description) → "A customer"
fields:      (rf, fieldCount)  → 3     // illustrative key only; not authorized here
compose → both entries present
```

**Invalid — cross-source collision (values equal):**

```text
annotations: (rf, description) → "A customer"
fields:      (rf, description) → "A customer"
compose → failure (same MetadataKey; equality of values does not matter)
```

**Invalid — cross-source collision (values differ):**

```text
annotations: (rf, description) → "A customer"
fields:      (rf, description) → "Customer entity"
compose → failure (no precedence; neither value wins)
```

## 6. Design rationale

- **Key-level hard collision** gives a single crisp invariant (“at most one source may contribute a given `MetadataKey`”) without inventing a precedence taxonomy before additional emitters exist.
- **Reject even deep-equal duplicates** prevents “accidental dual emission” from becoming an implicit merge policy and keeps ownership negotiations in emitter RFCs.
- **Disjoint union only** matches RFC-006 exact preservation and RFC-002 unordered uniqueness; composition does not become a transform layer.
- **Emitter-set freeze** prevents this RFC from smuggling Field/Relation/Operation projection design under a “composition” title.
- **Annotations as the sole concrete source** makes the framework immediately grounded and behavior-preserving for current `projectResourceMetadata`.
- **Alignment with RFC-004 spirit, not grain** — both fail closed and forbid silent reconciliation; RFC-004 owns **namespace partitions** for extension producers, while Resource projection composition owns **per-key** disjointness among projection sources. Neither contract replaces the other.

## 7. Relationship to other RFCs and milestones

| RFC / milestone | Relationship |
| --- | --- |
| RFC-001 Resource Identity | Relied upon; projected identity agreement unchanged |
| RFC-002 Metadata Model | Relied upon for key/value/snapshot equality; unordered entries |
| RFC-003 Registry | Relied upon only as a possible consumer of projected snapshots; unchanged |
| RFC-004 Extension Model | Conceptual alignment on fail-closed unordered composition; **different grain** (namespace ownership vs `MetadataKey` collision). RFC-004 `composeResourceMetadata` is not required as the implementation of `projectResourceMetadata` |
| RFC-005 Resource Model | **Amended**: normative composition contract fills the deferred projection composition/collision gap for multi-source projection; one-way purity retained |
| RFC-006 Annotations | **Amended**: annotation projection is the `annotations` source under this framework; direct 1:1 exact preservation retained; cross-source deferral closed by this RFC |
| RFC-007–RFC-021 | Relied upon / orthogonal; **no** Field / Relation / Operation emission authorized |
| RFC-022 Annotation Vocabulary | Relied upon; future `rf`-emitting sources must explicitly adopt; annotations source already governed |
| Later — Field/Relation/Operation projection RFCs | MUST obey this composition contract; MUST resolve any key ownership conflicts with annotations (or other sources) explicitly |
| Later — Direction / joins; empty-vs-absent | Orthogonal; deferred |
| M3.x implementation | Only after this RFC is Accepted and an Accepted implementation plan exists |

### Suggested sequence (non-normative)

```text
RFC-005 / RFC-006  Projection floor + annotations direct contribution
        │
RFC-022            Annotation vocabulary (rf catalog)     (Accepted)
        │
RFC-023            Projection composition semantics       ← this RFC (Accepted)
        │
Later              Emitter RFCs (Field/Relation/Operation → metadata) obey §4
        │
Later              Direction / joins
        │
Later              Empty-vs-absent / null elements
```

## 8. Document acceptance criteria (M2 → M3 Design Review)

This RFC may move from Draft to Accepted when Design Review finds:

1. Projection source / contribution terms are unambiguous and abstract.
2. Cross-source collision is defined solely by `MetadataKey` identity; value equality does not relax failure.
3. Successful composition is disjoint union only; precedence, last/first-wins, deep-equality collapse, implicit merge, and silent drop are explicitly forbidden.
4. Determinism / unordered evaluation requirements are clear.
5. Annotations are identified as the sole concrete authorized source today, with RFC-006 contribution rules retained.
6. The emitter-set invariant is explicit: this RFC does not authorize Field / Relation / Operation → metadata emission or new annotation vocabulary.
7. Direction / joins and empty-vs-absent / null elements remain explicitly deferred.
8. Relationship to RFC-004 (aligned spirit, different ownership grain) and RFC-022 (`rf` adoption) is clear without reinterpreting those RFCs silently.
9. No normative TypeScript API, adapter, or unrelated member-floor changes are introduced.

## 9. Explicit deferrals

- Field → metadata projection (keys, shapes, authorization)
- Relation → metadata projection
- Operation → metadata projection
- Additional annotation `rf` keys / vocabulary amendments
- Direction / joins / traversal
- Empty-vs-absent / null-element semantics
- Precedence or ranked source models (would require a future amending RFC if ever desired)
- Namespace-partition exclusive ownership for projection sources (RFC-004 remains separate)
- Concrete error-code enums and public TypeScript API shapes (M4/M6)
- Rewriting RFC-004 producer composition

## 10. Implementation gate (non-normative)

Coding that changes `projectResourceMetadata` composition behavior begins only after:

1. this RFC is Accepted;
2. an Accepted implementation plan for the relevant M3 slice exists.

No production Field / Relation / Operation metadata emission, precedence ladder, or silent collision reconciliation SHALL be introduced under this RFC alone. A single-source annotations composition that preserves RFC-006 exact contribution remains the expected behavioral floor until a future Accepted emitter RFC expands the source set.
