# RFC-030: Relation → Metadata Projection (Non-Contribution Closure)

**Date:** 2026-08-10  
**Status:** Accepted  
**M3:** Accepted (2026-08-10) — Design Review; no design blockers. Locks Relation→metadata projection as a **non-contribution closure** (Approach 1): Relations are not a concrete `projectResourceMetadata` source; no Relation-derived contribution is supplied; non-contribution ≠ filtering and ≠ empty contribution by an existing source. Currently authorized concrete source remains `annotations` (RFC-006); RFC-023 retained as composition / no-silent-emitters only. Validation-before-projection preserved from RFC-005; Relation structure remains authoritative on the Resource/Relation contract; RFC-029 traversal orthogonal; Field/Operation emitters neither authorized nor reordered. Future Relation-metadata emitter RFC required (source identity, members, keys, shapes, emptiness/empty-collection contribution, RFC-023 collision). No new declaration members, reserved keys, descriptor shapes, consumer APIs, or `packages/core` product change required by this RFC. RFC-008 / RFC-023 Later gap closed; RFC-024–RFC-029 remain closed. M4 authorized (planning may be docs-only if no host-independent core surface is required).  
**Package:** `@resource-forge/core` (contracts / semantics; no implementation in this RFC)  
**Tracking:** [#102](https://github.com/rexescario-dev/resource-forge/issues/102)  
**Depends on:** RFC-002 (Metadata Model — `ResourceMetadata` / `MetadataKey` / `JsonValue`), RFC-005 (Resource Model — `projectResourceMetadata`; validation-before-projection gate), RFC-006 (Annotations — currently authorized concrete projection source), RFC-008 (Resource Relations — ordered `relations`; no Relation contribution), RFC-023 (Richer Projection — Composition Semantics — disjoint union; emitter-set invariant / no silent emitters)  
**Followed by:** Optional M3.27 planning/delivery after Accept ([#102](https://github.com/rexescario-dev/resource-forge/issues/102)) only if docs/verification closeout is required; any future Relation-metadata **emitter** RFC (must explicitly authorize a Relation projection source and define source identity, projected members, key ownership, descriptor shape, emptiness/empty-collection contribution behavior, and RFC-023 collision behavior); Field → metadata emitter RFC; Operation → metadata emitter RFC  
**Unblocks:** Closing the M3 Later “Relation→metadata projection” gap as a normative non-contribution boundary so emitter work cannot be smuggled under “finishing Later,” without inventing Relation-derived metadata under the current contract  

**Amends / specializes:** Closes the deferred **Relation → metadata projection** topic left open by RFC-008 / RFC-023 (and listed as roadmap Later after RFC-029 / M3.26) by affirming **non-contribution**. Does **not** authorize a Relation projection source. Does **not** reopen or reinterpret RFC-006 annotation contribution, RFC-023 composition / collision rules, RFC-008 Relation declaration floors, or RFC-024–RFC-029 runtime / persistence / load / cascade / value-state / traversal semantics. Does **not** reorder, prioritize, or authorize Field/Operation emitter work.

## Primary question

> Do Relation declarations contribute entries to `projectResourceMetadata`, and if not, what must a future RFC define before they may?

## Thesis

RFC-030 is a **closure / clarification RFC**, not an emitter RFC. It closes the Relation→metadata projection gap by establishing that **Relations are not a concrete projection source under the current Accepted contract. No Relation-derived metadata entries are produced. A future emitter RFC is required before such contribution is permitted.**

Normative lock:

> **Relations do not contribute metadata to `projectResourceMetadata` unless a future, explicit Relation-metadata emitter RFC authorizes such contribution.**

More precisely:

- **No Relation source today** — Relation declarations are **not** a concrete projection source for `projectResourceMetadata`. Consequently, no Relation-derived contribution is supplied.
- **Current authorized source inventory** — Under the currently Accepted RFC set, the only authorized concrete projection source is `annotations` (RFC-006). RFC-023 supplies the composition framework and forbids silent emitters; RFC-030 authorizes no additional source. Therefore, for `projectResourceMetadata`, the currently authorized concrete source set is `{ annotations }`.
- **Descriptors stay authoritative on Resource** — Relation structure remains on the Resource / Relation contract; this RFC provides no metadata-based representation of that structure.
- **Future emitter gate** — a later Relation-metadata emitter RFC MUST explicitly define at least: ProjectionSource identity; participating Relation members; `MetadataKey` ownership; descriptor `JsonValue` shape; within-source uniqueness / emptiness; empty Relation collection contribution behavior; and RFC-023 collision behavior.
- **Not runtime traversal** — RFC-029 defines runtime Relation-access *meaning*; RFC-030 defines only the *metadata projection boundary*. Neither redefines the other.

```text
Invariant:
  Relation declarations are not a concrete source for projectResourceMetadata
  until a future Accepted emitter RFC authorizes them.

Resource declaration
├── annotations ───────→ projectResourceMetadata
│                         RFC-006 (authorized concrete source)
│                         + RFC-023 (composition / no silent emitters)
│
├── fields ────────────→ no emitter yet (still deferred; not prioritized here)
├── operations ────────→ no emitter yet (still deferred; not prioritized here)
└── relations ─────────→ NOT a projection source
                          RFC-030 locks this (closure)
```

## 1. Scope

### 1.1 Goals

1. Affirm that Relations are **not** a concrete projection source and that **no Relation-derived contribution** is supplied to `projectResourceMetadata` under current Accepted floors.
2. Lock the rule that a **future emitter RFC is required** before Relations may become a concrete projection source.
3. Preserve the currently authorized concrete source inventory: only `annotations` (RFC-006), composed under RFC-023; RFC-030 authorizes no additional source.
4. Preserve validation-before-projection behavior established by RFC-005 and applicable Relation validation floors: non-contribution does not bypass declaration validation.
5. State that Relation structure remains authoritative on the Resource / Relation contract; this RFC invents no metadata representation of it.
6. Separate this projection-boundary closure from RFC-029 runtime traversal/query semantics.
7. Explicitly defer Field → metadata and Operation → metadata emitters without reordering, prioritizing, or authorizing that work.
8. Keep `validateResource`, `projectResourceMetadata` composition behavior, `evaluateCascadeEvent`, and `checkRelationLoadStates` **unchanged by this RFC**.

### 1.2 Non-goals

This RFC does not define:

1. A `relations` (or any Relation-derived) projection source
2. Reserved `MetadataKey` namespaces/names for Relation descriptors
3. Relation descriptor `JsonValue` shapes (identity, direction, multiplicity, fetch, join, cascade, etc.)
4. Collision / key-ownership rules beyond restating RFC-023 (hard failure; no precedence)
5. Opt-in markers, policies, or declaration members that enable Relation→metadata emission
6. Field → metadata projection (authorization or shapes)
7. Operation → metadata projection (authorization or shapes)
8. Roadmap priority or sequencing for Field/Operation emitter RFCs
9. Changes to RFC-006 annotation contribution or RFC-022 `rf` vocabulary
10. Runtime traversal / query AST / host navigation APIs (RFC-029 remains closed)
11. Persistence / ORM mapping, load/fetch, cascade, value-state, or direction/join reinterpretation (RFC-024–RFC-028 remain closed)
12. Wire / serialization formats for Relation descriptors
13. New Resource / Field / Relation declaration members
14. Concrete TypeScript API, module, or error-code changes for projection
15. Registry association policy or consumer access APIs beyond noting that projected snapshots omit Relation-derived entries under the current contract

## 2. Terminology

| Term | Meaning |
| --- | --- |
| Relation→metadata projection | Supply of one or more `MetadataKey → JsonValue` entries derived from Relation declarations during `projectResourceMetadata` |
| Concrete projection source | A ProjectionSource identity authorized by an Accepted RFC to supply a contribution under RFC-023 composition |
| Emitter RFC | A future Accepted RFC that authorizes a new concrete projection source and defines its contribution semantics under RFC-023 |
| Non-contribution | The normative state in which Relations are **not** a projection source and therefore **no Relation-derived contribution** is supplied to `projectResourceMetadata` (observable consequence: zero Relation-derived entries) |
| Closure RFC | An RFC that closes a deferred Later topic by locking a boundary without introducing a new emitter or declaration floor |

RFC-002 / RFC-005 / RFC-006 / RFC-008 / RFC-023 terms (`ResourceMetadata`, `projectResourceMetadata`, ProjectionSource, projection contribution, disjoint union, cross-source collision) keep their existing meanings. This RFC does **not** change Relation declaration members.

## 3. Normative non-contribution lock

### 3.1 Relations are not a concrete source

For every valid Resource:

1. Under the currently Accepted RFC set, the only authorized concrete projection source is `annotations` (RFC-006). RFC-023 defines composition and forbids silent emitters; **RFC-030 authorizes no additional source**. Therefore, for `projectResourceMetadata`, the currently authorized concrete source set is `{ annotations }`.
2. Relations are **not** a projection source. Consequently, **no Relation-derived contribution** is supplied to `projectResourceMetadata`.
3. Projection **MUST NOT** invent relation-derived keys, envelopes, reserved namespaces, or descriptor bags from `RelationName`s or Relation members.
4. Empty and non-empty `relations` collections have the same metadata-projection consequence under RFC-030: neither supplies a Relation-derived contribution (neither case introduces a Relation projection source).

**Non-contribution is not projection filtering.** RFC-030 does not define a mechanism that examines Relation declarations and selectively suppresses some Relation entries; it establishes that **no Relation projection source exists** under the current contract.

### 3.2 Future authorization required

Relations **MAY** become a concrete projection source **only** when a future Accepted **emitter RFC** explicitly authorizes that source.

That future RFC MUST define, at minimum:

1. ProjectionSource identity (e.g. conceptual `relations`);
2. which Relation declaration members participate in projection (if any);
3. `MetadataKey` ownership / reserved key rules relative to `annotations` and any other sources;
4. contribution `JsonValue` shapes;
5. within-source uniqueness / emptiness rules;
6. whether an empty Relation collection produces no contribution, an empty descriptor value, or another explicitly defined contribution;
7. how RFC-023 hard collision failure applies (no silent precedence).

Until such an RFC is Accepted, implementations MUST treat Relation→metadata contribution as **out of contract**.

### 3.3 Validation gate retained

`projectResourceMetadata` retains the validation-before-projection behavior established by RFC-005 and applicable Relation validation floors.

A Resource with invalid `relations` therefore cannot successfully project; **non-contribution does not bypass declaration validation.**

### 3.4 Descriptors remain on the Resource contract

Relation structure (name, target, multiplicity, direction, inverse, join, optionality, nullability, cascade, fetch, etc.) remains authoritative on the Resource / Relation contract. This RFC provides **no** metadata-based representation of that structure. Consumers requiring Relation structure therefore **cannot rely on `ResourceMetadata` to obtain it** under the current contract.

Absence of Relation-derived metadata MUST NOT be interpreted as “Relations do not exist” or “Relations are optional schema.”

### 3.5 Orthogonal to runtime traversal

RFC-029’s runtime traversal/query semantic floor is **orthogonal** to this RFC:

| Concern | Authority |
| --- | --- |
| What Relation access *means* at runtime | RFC-029 (closed) |
| Whether Relation declarations are a metadata projection source | RFC-030 (this RFC) |

This RFC MUST NOT redefine step/path/related-set meaning, not-loaded/unclassifiable rules, or host retrieval boundaries. RFC-029 MUST NOT be read as authorizing Relation→metadata contribution.

### 3.6 No Field/Operation roadmap policy

Closing the Relation→metadata projection gap does **not** reorder, prioritize, or authorize Field → metadata or Operation → metadata emitter work. Those remain deferred unless and until separate Accepted RFCs address them.

## 4. Worked examples (conceptual)

```text
Resource {
  identity: (crm, Order)
  schema: {
    fields:    [ … ]   # may exist; still no Field emitter
    relations: [
      { name: customer, target: (crm, Customer), multiplicity: "one", … },
      { name: lines, target: (crm, OrderLine), multiplicity: "many", … }
    ]
    operations: [ … ]  # may exist; still no Operation emitter
  }
  annotations: { (rf, displayName) → "Order" }
}

projectResourceMetadata(resource)
  → metadata identity: (crm, Order)
  → metadata entries:
       (rf, displayName) → "Order"    # annotations contribution only
  → no Relation-derived entries
  → no Field-derived entries
  → no Operation-derived entries
```

```text
# Same Resource with annotations = ∅
projectResourceMetadata(resource)
  → metadata identity: (crm, Order)
  → metadata entries: ∅
  # Relations remain present on the Resource; still not a projection source
```

## 5. Design rationale

- **Minimal Commitment** — closing Later by affirming the existing floor avoids inventing reserved keys, descriptor shapes, and consumer expectations before a demonstrated metadata consumer exists.
- **Closure ≠ emitter** — RFC-023 already required future emitters to be explicit; RFC-030 applies that gate specifically to Relations and retires the open Later topic without claiming RFC-023 owns the historical source inventory (RFC-006 does).
- **Not a source ≠ empty contribution** — locking “no Relation projection source” prevents later misreading non-contribution as “a Relations emitter that happens to emit `{}`.”
- **Non-contribution ≠ filtering** — there is no examine-and-suppress path over Relation declarations; absence of entries follows from absence of a source.
- **Why not opt-in markers** — a marker/policy would add declaration/configuration surface to solve an unproven need, and would raise whether the marker itself is metadata.
- **Why descriptors stay on Resource** — the Relation contract is already the authoritative structural model; duplicating it into metadata without ownership rules invites RFC-023 collisions and dual sources of truth. Registry/tooling consequences follow from that contract fact; they are not a separate consumer API mandate.
- **Keep RFC-029 out** — traversal meaning and metadata contribution answer different questions; mixing them recreates the “finish Later by inventing APIs” failure mode.
- **No accidental roadmap policy** — closing Relation projection does not promote Field/Operation emitters to the next Later lead.

## 6. Relationship to other RFCs and milestones

| RFC / milestone | Relationship |
| --- | --- |
| RFC-002 Metadata Model | Relied upon; identity vs entries model unchanged |
| RFC-005 Resource Model | Relied upon; validation-before-projection gate **preserved**, not re-specified as a new independent requirement |
| RFC-006 Annotations | Relied upon; remains the only currently authorized concrete source |
| RFC-007 Fields | Orthogonal; Field→metadata remains deferred (not authorized or prioritized here) |
| RFC-008 Relations | **Clarified / closed**: non-contribution affirmed as the stable boundary until an emitter RFC |
| RFC-012 Operations | Orthogonal; Operation→metadata remains deferred (not authorized or prioritized here) |
| RFC-022 Annotation Vocabulary | Relied upon; unchanged |
| RFC-023 Projection Composition | Relied upon: composition / hard collision / no silent emitters; RFC-030 does not treat RFC-023 as the owner of the historical source inventory |
| RFC-024–RFC-028 | Closed; not reopened |
| RFC-029 Runtime Traversal / Query | Closed; orthogonal; not an emitter authorization |
| Later — Relation-metadata emitter RFC | Required before Relations may contribute; out of scope here |
| Later — Field / Operation emitter RFCs | Still deferred; not closed, reordered, or authorized by this RFC |
| M3.27 delivery | After Accept: likely docs/verification closeout only (no new core emitter) |

### Suggested sequence (non-normative)

```text
RFC-006 / RFC-023   annotations authorized; composition forbids silent emitters
RFC-008             Relations exist; no Relation contribution
        │
RFC-029             Runtime traversal meaning (closed; orthogonal)
        │
RFC-030             Relation→metadata NON-contribution closure  ← this RFC (Accepted)
        │
Optional M3.27      Docs/verification closeout after Accept
        │
Future (only if needed)  Relation-metadata emitter RFC under RFC-023
```

## 7. Document acceptance criteria (M2 → M3 Design Review)

This RFC may move from Draft to Accepted when Design Review finds:

1. The primary lock is unambiguous: Relations are not a concrete projection source; no Relation-derived contribution is supplied to `projectResourceMetadata` today.
2. A future emitter RFC is explicitly required before Relations may become a concrete source, with a minimum content checklist including empty Relation collection contribution behavior.
3. The currently authorized concrete source set is stated as `{ annotations }` via RFC-006 authorization + RFC-023 composition (no silent emitters); RFC-030 authorizes no new ProjectionSource and does not mis-attribute source inventory ownership to RFC-023 alone.
4. Validation-before-projection is preserved as established by RFC-005 / Relation floors, not newly imposed by this RFC; non-contribution does not bypass declaration validation.
5. Relation structure remains authoritative on the Resource/Relation contract; this RFC invents no metadata representation and imposes no consumer access API.
6. Non-contribution is distinguished from projection filtering and from “empty contribution by an existing source.”
7. RFC-029 traversal semantics are explicitly orthogonal and not amended.
8. Field/Operation emitters remain deferred without roadmap reordering; reserved keys, descriptor shapes, opt-in markers, and runtime/persistence floors remain explicitly out of scope.
9. No normative TypeScript API or declaration-member changes are introduced.
10. The document is clearly a **closure/clarification** RFC, not an emitter RFC.

## 8. Explicit deferrals

- Relation-metadata **emitter** RFC (source id, keys, shapes, projected members, empty-collection contribution behavior, collision ownership)
- Field → metadata projection
- Operation → metadata projection
- Roadmap priority among deferred emitter topics
- Opt-in / policy / marker surfaces for selective Relation contribution
- Wire / serialization of Relation descriptors as metadata
- Any change to RFC-024–RFC-029 semantics
- Concrete error-code enums and public TypeScript API shapes for a future emitter

## 9. Implementation gate (non-normative)

Coding that changes `projectResourceMetadata` to supply Relation-derived entries begins only after:

1. a future Relation-metadata **emitter** RFC is Accepted (not this RFC alone); and
2. an Accepted implementation plan for that emitter slice exists.

Under RFC-030 alone, the expected behavioral floor remains: compose only the currently authorized `annotations` contribution (current `project.ts` posture). Docs/verification closeout for M3.27 MAY confirm that posture without adding core surface.
