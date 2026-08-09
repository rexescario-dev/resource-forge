# RFC-022: Annotation Vocabulary

**Date:** 2026-08-09  
**Status:** Accepted  
**M3:** Accepted (2026-08-09) — Design Review after return revision; no design blockers. Locks closed annotation-scoped `rf` catalog (`description` \| `displayName`) with string value shapes; enforcement is Resource annotations only (not a universal `ResourceMetadata` producer rule); later producers must explicitly adopt before emitting `rf`; reservation remains RFC-002/RFC-004; RFC-006 container/uniqueness/direct projection retained; catalog removals/narrowings are breaking. M4 authorized.  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#80](https://github.com/rexescario-dev/resource-forge/issues/80)  
**Depends on:** RFC-001 (Resource Identity — via Resource), RFC-002 (Metadata Model — `MetadataKey` / `JsonValue` / reserved `rf`), RFC-005 (Resource Model — annotations slot), RFC-006 (Annotations — container, validation ownership, direct projection)  
**Followed by:** M3.x implementation planning for annotation vocabulary after Accept; richer projection (cross-source collision / precedence / merge); direction / joins; empty-vs-absent / null elements; additional `rf` keys only via future RFCs that amend this closed catalog; per-member (Field / Relation / Operation) annotation attachment; UI / authoring catalogs; authorization annotation frameworks  
**Unblocks:** M3.x annotation-vocabulary implementation planning (M4→M5), then implementation (M6), after this RFC is Accepted — not implementation by itself  
**Amends / specializes:** RFC-002 by defining the first closed concrete `rf` key catalog and value-shape rules (structural `MetadataKey` / `JsonValue` model unchanged). Amends RFC-006 by adding vocabulary-aware validation for `rf` annotation entries while retaining the container, equality, and direct 1:1 projection floors. Does **not** reopen Field / Relation / Operation member floors, constraint vocabularies, or cross-source projection/composition rules.

## Primary question

> What closed **framework annotation vocabulary** exists under the RFC-006 container (concrete `rf` keys and value shapes), and what **extension / reservation boundaries** apply—without changing direct projection or absorbing richer projection / UI / authz concerns?

## Thesis

RFC-022 defines annotation vocabulary as a **closed exclusive catalog of framework `rf` metadata keys** with **value-shape rules**, **normatively enforced on Resource annotations**:

- **Closed `rf` catalog (annotation enforcement)** — only the keys named here may appear under namespace `rf` on annotations; unknown `rf` names are invalid on that surface.
- **Value shapes** — each catalogued key has a required JSON value shape; wrong shapes are invalid on annotations.
- **Optional presence** — every catalogued key may be absent; vocabulary does not require any key on a Resource.
- **Enforcement scope** — RFC-022’s normative validation applies to Resource annotations. It does **not** establish a universal validity rule for every `ResourceMetadata` producer.
- **Extension boundary** — non-`rf` namespaces remain opaque to `core` beyond structural rules (RFC-002 / RFC-006); this RFC does not redefine namespace ownership.
- **Projection unchanged** — valid annotations still project by direct 1:1 exact preservation (RFC-006); vocabulary validation is a declaration/precondition concern, not a projection transform.
- **Growth path** — new framework keys require a future RFC that amends this closed catalog (same discipline as closed `ConstraintKind` / `OperationKind` growth).

```text
Annotation vocabulary (framework):
  (rf, description)  → string
  (rf, displayName)  → string

Annotations (RFC-006 container) {
  entries: unordered unique MetadataKey → JsonValue
}

Validation adds (when key.namespace == "rf"):
  key.name ∈ closed catalog
  value satisfies that key's value shape

Projection (unchanged):
  each annotation entry → equal metadata entry (exact key/value preservation)
```

## 1. Scope

### 1.1 Goals

1. Define a closed exclusive catalog of framework annotation keys under the reserved `rf` namespace.
2. Define value-shape rules for each catalogued key.
3. Define vocabulary validation as part of Resource annotation validity (RFC-006 / RFC-005), distinct from metadata-aggregate validation failures where error ownership already separates them.
4. Preserve RFC-006 container invariants: unordered unique keys, immutable snapshot, empty = zero entries, opaque non-vocabulary values for non-`rf` keys.
5. Preserve RFC-006 direct 1:1 projection with exact preservation and no vocabulary-driven rewrite.
6. Establish a reusable catalog boundary later RFCs (especially richer projection) can **explicitly adopt** before emitting `rf` entries—without making RFC-022 a universal `ResourceMetadata` validity rule.
7. Explicitly defer cross-source collision / precedence / merge, UI catalogs, authz frameworks, and per-member annotation attachment.

### 1.2 Non-goals

This RFC does not define:

1. Additional `rf` keys beyond the closed catalog in §3 (for example `icon`, `tags`, `label`, documentation URLs, provider hints) — those require a future amending RFC
2. Cross-source projection collisions, precedence, merge, or composition between annotation-derived entries and other Resource projection sources (richer projection)
3. Changes to RFC-006 direct projection semantics (no envelopes, renaming, normalization, or vocabulary-aware transforms during projection)
4. Per-member annotations attached to Field / Relation / Operation declarations
5. UI / authoring catalogs, builders, editing workflows, localization frameworks, or documentation site generators
6. Authorization, tenancy, policy, or security annotation frameworks
7. Wire / serialization encodings of `MetadataKey` (RFC-002 still owns structural identity; textual forms remain non-normative)
8. Reverse projection (`ResourceMetadata` → annotations)
9. Reopening Field / Relation / Operation / Constraint floors
10. Direction / joins; empty-vs-absent / null elements
11. Concrete TypeScript API names, modules, or error-code enums beyond what is necessary for a later Accepted plan to express this contract (informative names may appear)
12. Requiring any vocabulary key to be present on every Resource

## 2. Terminology

| Term | Meaning |
| --- | --- |
| Annotation vocabulary | The closed exclusive set of framework `rf` keys and their value-shape rules defined by this RFC |
| Catalogued key | A `MetadataKey` with `namespace == "rf"` and `name` in the closed catalog (§3) |
| Unknown `rf` key | A `MetadataKey` with `namespace == "rf"` whose `name` is not in the closed catalog |
| Value shape | The JSON-level constraint on a catalogued key’s `JsonValue` (for this RFC: JSON string) |
| Opaque extension entry | An annotation mapping whose key namespace is not `rf`; structurally validated only (RFC-002 / RFC-006) |

RFC-002 terms (`MetadataKey`, `JsonValue`, `ResourceMetadata`, reserved `rf`) and RFC-006 terms (`Annotations`, annotation projection) keep their existing meanings except where this RFC adds vocabulary validation for `rf` keys.

## 3. Closed catalog

### 3.1 Keys

The closed exclusive annotation vocabulary is:

| `MetadataKey` | Value shape | Meaning |
| --- | --- | --- |
| `(rf, description)` | JSON **string** | Human-readable description of the Resource type |
| `(rf, displayName)` | JSON **string** | Human-readable display label for the Resource type |

- Catalog membership is by exact `MetadataKey` equality (`namespace` + `name` strings; RFC-002 case-sensitive exact equality).
- No other `rf` names are valid on annotations under this RFC.
- Presence of either key is **optional**. Absence is valid.
- Empty annotations (zero entries) remain valid (RFC-006).
- At most one entry for each catalogued `MetadataKey` may occur in an annotation snapshot, by RFC-006 key uniqueness (no “last wins” / merge semantics).

### 3.2 Value-shape rules

For each catalogued key present in an annotations snapshot:

| Rule | Statement |
| --- | --- |
| Type | Value MUST be a JSON string (`JsonValue` string variant) |
| Null | JSON `null` is **invalid** for catalogued keys in this RFC |
| Empty string | `""` is **valid** (structural; no non-empty requirement) |
| No coercion | Numbers, booleans, arrays, and objects are invalid even if “string-like” |
| No normalization | Projection and equality MUST NOT trim, case-fold, or otherwise rewrite the string |

### 3.3 Unknown and reserved-namespace interaction

| Case | Result |
| --- | --- |
| `(rf, description)` / `(rf, displayName)` with string value | Valid (vocabulary) |
| `(rf, description)` / `(rf, displayName)` with non-string value | Invalid (value-shape failure) |
| Any other `(rf, *)` name | Invalid (unknown `rf` key) |
| Non-`rf` namespace keys | Structurally validated only (RFC-002 key grammar + RFC-006 unique keys + `JsonValue`); no vocabulary interpretation |
| `rf` reservation vs catalog | `rf` remains framework-reserved under RFC-002 / RFC-004. RFC-022 additionally defines which `rf` names are currently recognized by the **annotation** vocabulary |

RFC-002’s reserved-namespace rule for `rf` remains in force and is **not** redefined here. This RFC specializes that reservation for the annotation surface by closing which `rf` names are recognized and what value shapes they require—not by inventing a second ownership authority.

### 3.4 Growth rule

Adding, removing, or changing the meaning/value shape of a catalogued key requires a future RFC that **amends this closed catalog**. Implementations MUST NOT silently accept extra `rf` names as “forward compatible.” Removing a previously accepted key or narrowing its value shape is a **breaking vocabulary change** and MUST NOT be performed implicitly by implementation versioning.

## 4. Validation

Vocabulary validation is part of Resource annotation validity (RFC-006 §4 / Resource validity).

A Resource’s annotations snapshot is valid only if all of the following hold:

1. RFC-006 container rules still hold (key grammar, unique keys, `JsonValue` structural validity, empty valid).
2. For every entry whose key has `namespace == "rf"`:
   - `name` MUST be a catalogued key name from §3.1;
   - value MUST satisfy that key’s value-shape rules (§3.2).
3. Non-`rf` entries remain subject only to RFC-006 / RFC-002 structural rules.

Invalid annotations → invalid Resource.

### 4.1 Error ownership (conceptual)

| Failure | Conceptual category |
| --- | --- |
| Duplicate keys / bad key grammar / non-`JsonValue` | Existing RFC-006 annotation-container failures |
| Unknown `rf` key | Annotation vocabulary failure (unknown framework key) |
| Catalogued key with wrong value shape | Annotation vocabulary failure (value shape) |
| Non-`rf` opaque entries | No vocabulary errors; structural only |

Vocabulary failures remain **Resource / annotation** validation failures and MUST stay distinct from RFC-002 `invalid_metadata` (or equivalent) aggregate failures. Concrete error codes / TypeScript unions are deferred to an Accepted implementation plan.

### 4.2 Enforcement scope (annotations vs metadata producers)

**RFC-022’s normative enforcement scope is Resource annotations.** It does **not** establish a universal validity rule for every `ResourceMetadata` producer, and it does **not** by itself rewrite the general `ResourceMetadata` validate operation for entries produced by non-annotation sources.

Because RFC-006 projection preserves keys and values exactly, a Resource whose annotations are vocabulary-valid projects `rf` entries that conform to this catalog. That consequence follows from annotation enforcement plus exact preservation—not from a new metadata-wide invariant in this RFC.

Later RFCs that introduce additional metadata-producing sources MUST **explicitly adopt** this closed catalog and value-shape rules before emitting `rf` entries, rather than inventing a second framework vocabulary. Until those RFCs exist and adopt the catalog, annotation validation remains the sole normative enforcement point defined here.

## 5. Projection participation (unchanged)

RFC-006 projection rules remain normative:

1. Revalidate the Resource (including vocabulary rules once this RFC is Accepted and implemented) before projection.
2. Direct 1:1 entry projection with exact key/value preservation.
3. No interpretation, normalization, envelope, rename, or vocabulary-driven transform during projection.
4. Empty annotations contribute zero entries.
5. Cross-source collisions remain out of scope (richer projection).

Vocabulary meaning informs **authors and validators**; it does **not** change the projection function’s preservation contract.

### 5.1 Worked examples (conceptual)

**Valid — both catalogued keys, plus opaque extension entry:**

```text
Resource {
  identity: (crm, Customer)
  schema: { … }
  annotations: {
    { namespace: rf, name: description } → "A customer record"
    { namespace: rf, name: displayName } → "Customer"
    { namespace: docs, name: summary } → "CRM aggregate root"
  }
}

projectResourceMetadata(resource) → ResourceMetadata {
  identity: (crm, Customer)
  entries: {
    { namespace: rf, name: description } → "A customer record"
    { namespace: rf, name: displayName } → "Customer"
    { namespace: docs, name: summary } → "CRM aggregate root"
  }
}
```

**Valid — empty strings; absent other catalogued key:**

```text
annotations: {
  { namespace: rf, name: description } → ""
}
```

**Invalid — unknown `rf` key:**

```text
annotations: {
  { namespace: rf, name: icon } → "user"
}
```

**Invalid — wrong value shape:**

```text
annotations: {
  { namespace: rf, name: description } → { "text": "A customer record" }
}
```

## 6. Design rationale

- **Closed catalog under `rf`** completes RFC-002’s reserved-namespace promise without inventing a second identity system, and matches Resource Forge’s closed-vocabulary discipline (`FieldType`, `ConstraintKind`, `OperationKind`).
- **Minimal initial set (`description`, `displayName`)** extends the model meaningfully for documentation/labeling while avoiding UI/tag/icon coupling that later RFCs can add by amendment.
- **String-only shapes + empty string allowed** keep the first vocabulary structurally simple; non-empty / length / localization policies are product concerns outside `core`.
- **Unknown `rf` rejected** prevents silent accumulation of undeclared framework keys and keeps the growth path explicit (amend the RFC).
- **Opaque non-`rf` retained** avoids forcing all descriptive data through framework keys and does not redefine RFC-002 / RFC-004 reservation/ownership.
- **Projection unchanged** prevents this RFC from preempting richer projection’s collision/precedence work; vocabulary becomes a reusable boundary those RFCs can **explicitly adopt**.
- **Annotation-scoped enforcement** matches authoritative Resource state ownership (RFC-005 / RFC-006) without accidentally changing existing metadata-producer contracts.

## 7. Relationship to other RFCs and milestones

| RFC / milestone | Relationship |
| --- | --- |
| RFC-001 Resource Identity | Relied upon via Resource identity; unchanged |
| RFC-002 Metadata Model | **Specialized**: first closed concrete `rf` key catalog + value shapes; structural key/value model unchanged |
| RFC-004 Extension Model | Relied upon for non-`rf` ownership; `rf` remains framework-reserved |
| RFC-005 Resource Model | Relied upon; annotations slot unchanged as packaging |
| RFC-006 Annotations | **Amended**: vocabulary validation added; container / equality / direct projection retained |
| RFC-007–RFC-021 | Relied upon / orthogonal; not reopened |
| Later — Richer projection | MUST **explicitly adopt** this catalog before emitting/merging `rf` keys; owns cross-source collision / precedence / merge |
| Later — Direction / joins; empty-vs-absent | Orthogonal; deferred |
| M3.x implementation | Only after this RFC is Accepted and an Accepted implementation plan exists |

### Suggested sequence (non-normative)

```text
RFC-006  Annotations container + direct projection
        │
RFC-022  Annotation vocabulary (rf catalog)   ← this RFC (Accepted)
        │
Later    Richer projection / composition (cross-source rules; explicitly adopt rf catalog)
        │
Later    Direction / joins
        │
Later    Empty-vs-absent / null elements
```

## 8. Document acceptance criteria (M2 → M3 Design Review)

This RFC may move from Draft to Accepted when Design Review finds:

1. The closed `rf` catalog (`description`, `displayName`) and string value shapes are unambiguous.
2. Unknown `rf` keys and wrong value shapes are invalid on annotations; non-`rf` entries remain opaque/structural only.
3. Presence of catalogued keys is optional; empty annotations remain valid; catalogued-key uniqueness follows RFC-006 (no last-wins).
4. Normative enforcement scope is Resource annotations only—not a universal `ResourceMetadata` producer rule; later producers must explicitly adopt the catalog.
5. RFC-006 container, equality, and direct 1:1 projection are explicitly retained (no projection rewrite).
6. Cross-source collision / precedence / merge, UI/authz catalogs, per-member annotations, and additional `rf` keys remain explicitly deferred.
7. Growth rule is clear: catalog changes require a future amending RFC; removals/narrowings are breaking and not implicit via versioning.
8. `rf` reservation remains RFC-002 / RFC-004; this RFC specializes recognized annotation names only.
9. No normative TypeScript API, adapter, or unrelated member-floor changes are introduced.

## 9. Explicit deferrals

- Additional `rf` keys (`icon`, `tags`, `label`, links, provider hints, …)
- Cross-source projection collision detection, precedence, and merge/composition
- Per-member Field / Relation / Operation annotation attachment
- UI / authoring / localization / documentation tooling
- Authorization / policy annotation frameworks
- Non-empty string requirements, length limits, markdown dialects
- Concrete error-code enums and public TypeScript API shapes (M4/M6)
- Universal `ResourceMetadata` validity / validate rewrite for all non-annotation producers (later RFCs may explicitly adopt this catalog when they emit `rf` entries)

## 10. Implementation gate (non-normative)

Coding that enforces annotation vocabulary begins only after:

1. this RFC is Accepted;
2. an Accepted implementation plan for the relevant M3 slice exists.

No production acceptance of undeclared `rf` annotation keys, vocabulary-driven projection transforms, or cross-source merge behavior SHALL be introduced under this RFC alone.
