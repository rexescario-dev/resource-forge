# RFC-018: Runtime Constraint Enforcement

**Date:** 2026-08-08  
**Status:** Accepted  
**M3:** Accepted (2026-08-08) — Design Review; no design blockers after clarifications; field-value map surface; per-Constraint presence/null/type gates (no separate field-validity pass); inclusive `range` on finite numbers established by §5.2; ECMAScript `pattern` full-string match without reinterpreting `^`/`$`; `enum` membership via ECMAScript `===` (`-0`/`0` equivalent); unknown keys ignored (Constraint-driven invariant); empty `constraints` evaluates nothing; missing required fields only when a Constraint targets them; RFC-016/017/M3.14 declaration floors unreopened; fail-fast / no exclusivity flags / no regex flags / no collect-all  
**Package:** `@resource-forge/core` (contracts; no implementation in this RFC)  
**Tracking:** [#66](https://github.com/rexescario-dev/resource-forge/issues/66)  
**Depends on:** RFC-001 (Resource Identity — via Resource), RFC-005 (Resource Model — aggregate / schema), RFC-007 (Resource Fields — `FieldName` / ordered `fields`), RFC-009 (Resource Field Types — `FieldType` ∈ {string, number, boolean}), RFC-013 (Field optionality — `optional` declaration flag, relied upon for runtime presence rules here), RFC-014 (Field nullability — `nullable` declaration flag, relied upon for runtime null rules here), RFC-016 (Constraints framework — packaging retained), RFC-017 (Concrete Constraint Kinds — declaration shapes retained; evaluation owned here)  
**Followed by:** Uniqueness / cross-member constraints; Relation-targeted constraints; Field-local constraint slots; inclusive/exclusive declaration flags beyond the inclusive evaluation locked here (only if a future RFC amends declaration); richer pattern flags / dialects beyond the ECMAScript floor locked here; wire / serialization of values or enforcement results; persistence / ORM mapping; Operation kind / signature / execution; annotation vocabulary; richer projection; direction / joins; empty-vs-absent / null elements for Relations; general Resource instance / aggregate value model beyond the field-value map used here  
**Unblocks:** M3.x Runtime Constraint Enforcement implementation planning (M4→M5), then implementation (M6), after this RFC is Accepted — not implementation by itself  
**Amends / specializes:** Nothing in RFC-016 packaging or RFC-017 declaration shapes. This RFC **adds** the runtime evaluation contract for already-declared concrete Constraints. Does **not** reopen or modify RFC-016, RFC-017, or the M3.14 implementation floor’s declaration-time behavior.

## Primary question

> Given a declaration-valid Resource and a field-value map, how are RFC-017 `range` / `pattern` / `enum` Constraints evaluated—including bound inclusivity, pattern dialect/matching, enum membership, optional/nullable skip-vs-fail, ordering, and deterministic failure causes—without changing declaration contracts?

## Thesis

RFC-018 defines the **runtime constraint enforcement** contract:

- The runtime value surface is a **field-value map** keyed by `FieldName`.
- Evaluation assumes the Resource is **declaration-valid** under RFC-016 / RFC-017 (and supporting Field floors). Invalid declaration is out of scope for this check.
- Every declared Constraint is evaluated against the runtime value of its target Field according to a **complete kind evaluation contract**:
  - `range` — **inclusive** bounds on finite numbers
  - `pattern` — **ECMAScript** regular-expression dialect; **full-string** match; no flags
  - `enum` — exact **membership** in declared `values`
- `optional` / `nullable` control **skip vs fail** before kind evaluation (presence / null gates).
- Constraints are considered in **`constraints` sequence order**; evaluation is **fail-fast** (first deterministic violation wins).
- A distinct conceptual runtime check surface evaluates values; it does **not** replace or reopen declaration-time `checkConstraints` / Resource schema validity.

```text
Valid Resource (RFC-016 / RFC-017 declaration floor)
        +
Field-value map  (this RFC’s runtime surface)
        │
        ▼
checkConstraintValues  (conceptual)  — presence/null gates → kind evaluation
        │
        ├── ok
        └── enforcement failure (deterministic cause)
```

**RFC-016 owns packaging; RFC-017 owns declaration shapes and declaration-time coherence; this RFC owns runtime evaluation against field values.**

Declaration-time validity remains mandatory and unchanged. This RFC does **not** imply that M3.14 already performs runtime enforcement.

## 1. Scope

### 1.1 Goals

1. Define the runtime value surface as a **field-value map** (§4).
2. Require a **declaration-valid** Resource as a precondition for enforcement; do not redefine declaration validation.
3. Lock **complete evaluation semantics** for `range`, `pattern`, and `enum` (§6).
4. Lock **inclusive** `range` bound evaluation without adding exclusive declaration flags (no RFC-017 reopen).
5. Lock **ECMAScript** `pattern` dialect, no-flags compilation, and **full-string** matching; define compile-failure vs mismatch causes.
6. Lock `enum` **membership** via exact equality against declared `values` (order irrelevant for membership).
7. Lock **optional / nullable** skip-vs-fail gates before kind evaluation (§5).
8. Lock evaluation **ordering** (`constraints` sequence) and **fail-fast** result model (§7).
9. Define deterministic conceptual **failure causes** distinct from declaration-time causes (§8).
10. Define the conceptual **runtime check surface** and its relationship to declared constraints (§3, §9).
11. Preserve projection non-participation and Field / Relation / Operation declaration floors; explicitly defer uniqueness, cross-member rules, Relation targeting, wire/persistence, and a full Resource instance model (§1.2).

### 1.2 Non-goals

This RFC does not define:

1. Any change to RFC-016 packaging (`ResourceSchema.constraints`, `ConstraintName`, namespaces, projection non-participation, validate-before-snapshot for **declaration**)
2. Any change to RFC-017 closed `ConstraintKind`, discriminated members, `field` targeting, or declaration-time resolve / type-match / kind-specific declaration rules
3. Exclusive / half-open bound **declaration** properties (`exclusiveMin`, `exclusiveMax`, etc.) — evaluation is inclusive on the existing `min` / `max` properties
4. Pattern flags, non-ECMAScript dialects, normalization of `pattern` strings, or declaration-time pattern compilation
5. Uniqueness constraints or cross-member / cross-field / Resource-wide rules
6. Relation-targeted constraints or Field-local constraint attachment slots
7. A full Resource **instance** / aggregate value model, builders, mutation APIs, or persistence of field values on Resource
8. Runtime enforcement of Relations, Operations, or Annotations
9. Wire / serialization representation of field-value maps or enforcement results
10. Persistence / database constraints / ORM mapping
11. Folding runtime enforcement into `validateResource` / declaration `checkConstraints` as a required behavior
12. Public TypeScript API names, modules, or error-code enums (conceptual separation only; informative names may appear)
13. Empty-collection vs absent for Relations; Relation nullability runtime rules
14. Operation kind / signature / execution; annotation vocabulary; richer projection; direction / joins

## 2. Terminology

| Term | Meaning |
| --- | --- |
| Field-value map | Runtime map from `FieldName` to a field runtime value; the sole value surface for this RFC |
| Field runtime value | A present map entry whose value is a `string`, `number`, `boolean`, or `null` |
| Absent | A `FieldName` with **no** key in the field-value map (distinct from `null`) |
| Declaration-valid Resource | A Resource that satisfies RFC-005 / Field floors / RFC-016 / RFC-017 declaration contracts (implementation: passes Resource schema validation including declaration `checkConstraints`) |
| Kind evaluation | Applying a concrete Constraint’s runtime match rules to a present non-null scalar value |
| Skip | Constraint is not kind-evaluated; does not produce an enforcement failure by itself |
| Fail-fast | Stop at the first deterministic enforcement violation in `constraints` order |
| Runtime check surface | Conceptual operation that evaluates a field-value map against a declaration-valid Resource’s constraints (informative name: `checkConstraintValues`) |

RFC-007 / RFC-009 / RFC-013 / RFC-014 / RFC-016 / RFC-017 terms keep their existing meanings. This RFC interprets `optional` and `nullable` as **runtime gates** over the field-value map; it does not change their declaration-time definitions.

## 3. Relationship to declaration floors

| Concern | Authority |
| --- | --- |
| `constraints` packaging / names / order / projection | RFC-016 (unchanged) |
| Closed kinds + discriminated declaration shapes + declaration validation | RFC-017 (unchanged) |
| Field `optional` / `nullable` declaration | RFC-013 / RFC-014 (unchanged as declaration) |
| Runtime evaluation of declared Constraints against field values | **This RFC** |
| Declaration `checkConstraints` / Resource schema validity | Unchanged; still declaration-only |

**Invariant:** Runtime enforcement **reuses** declared Constraints; it MUST NOT invent kinds, rewrite shapes, or accept declaration-invalid Resources as a substitute for declaration validation.

If a caller supplies a declaration-invalid Resource, behavior is **out of scope** for this RFC (implementations MAY reject as a precondition failure distinct from enforcement causes below). Normative rules below assume declaration validity.

## 4. Field-value map (runtime surface)

```text
FieldValueMap:
  keys   ⊆ FieldName
  values ∈ { string, number, boolean, null }
```

Rules:

1. The map is the **only** runtime value surface defined here.
2. **Absent** means the key is missing. **Null** means the key is present and the value is `null`. These are distinct.
3. Keys that do not name a Field in the Resource’s `fields` sequence are **ignored** for enforcement (unknown keys do not fail this check).
4. This RFC does **not** require the map to contain every Field; presence obligations are enforced per §5.
5. Resource snapshot state is unchanged by this RFC: Values are **not** stored on Resource by this contract.

**Invariant (Constraint-driven surface):** Runtime enforcement is driven solely by declared Constraints and their target Fields. Unknown map keys MUST NOT cause enforcement failure. Implementations MUST NOT treat `checkConstraintValues` as a closed-payload / general Resource-instance validator that rejects undeclared keys.

Informative shape (not a normative API):

```ts
type FieldRuntimeValue = string | number | boolean | null;
type FieldValueMap = ReadonlyMap<FieldName, FieldRuntimeValue>;
// or an equivalent plain object map with the same absent-vs-null distinction
```

## 5. Presence and null gates (optional / nullable)

Before kind evaluation of a Constraint targeting Field `F`, apply gates using `F.optional` and `F.nullable` and the map entry for `F.name`.

**Invariant (per-Constraint gates):** For every Constraint, its target Field’s presence / null / type gates are evaluated before that Constraint’s kind evaluation. Runtime enforcement does **not** establish a separate field-validity pass. Presence/null/type validity is therefore considered once per targeted Constraint (as evaluation walks `constraints`), not once per Field up front.

### 5.1 Per-constraint gate procedure

For Constraint `C` with `field: F.name`:

1. **Absent** (`F.name` not in map):
   - If `F.optional === true` → **skip** `C` (no kind evaluation; not a failure).
   - If `F.optional === false` → **fail** with cause **Missing required field value** (do not kind-evaluate `C`).
2. **Present `null`**:
   - If `F.nullable === true` → **skip** `C` (null is an allowed empty value; kind rules apply only to non-null scalars).
   - If `F.nullable === false` → **fail** with cause **Null field value** (do not kind-evaluate `C`).
3. **Present non-null scalar** → continue to type gate (§5.2), then kind evaluation (§6).

Missing required Fields are enforced **only when a Constraint targets that Field**. Untargeted required Fields are out of scope for this check (they do not invent a general instance validator).

### 5.2 Runtime type gate

When a present non-null value is about to be kind-evaluated for Constraint `C` targeting Field `F`:

| `F.type` | Allowed runtime value |
| --- | --- |
| `string` | string |
| `number` | finite number (`NaN` / `±Infinity` not allowed) |
| `boolean` | boolean |

If the runtime value is not allowed for `F.type` → **fail** with cause **Field value type mismatch** (do not kind-evaluate `C`).

Notes:

1. These gates apply **per Constraint** as evaluation walks the `constraints` sequence. Skipping one Constraint does not skip later Constraints on other Fields (or on the same Field, unless that later Constraint also gates to skip).
2. This RFC defines presence/null/type gates **only for constraint enforcement** over the field-value map. It is not a general Relation/Operation runtime presence RFC.
3. Declared `optional` / `nullable` meanings from RFC-013 / RFC-014 are not amended; this section only defines how enforcement interprets them at runtime.

### 5.3 Gate matrix (informative)

| Map entry for `F` | `optional` | `nullable` | Gate result for Constraints targeting `F` |
| --- | --- | --- | --- |
| absent | `true` | any | skip |
| absent | `false` | any | fail — Missing required field value |
| `null` | any | `true` | skip |
| `null` | any | `false` | fail — Null field value |
| non-null wrong type / non-finite number | any | any | fail — Field value type mismatch |
| non-null matching type | any | any | kind-evaluate |

## 6. Kind evaluation contracts

Kind evaluation runs only after §5 gates pass for that Constraint. The target value is a present non-null scalar matching `F.type`.

### 6.1 `range` (inclusive bounds)

Applies when `C.kind === "range"`.

**Precondition:** Because RFC-009 permits `number` as the declared `FieldType` and §5.2 rejects non-finite runtime numbers, a `range` Constraint always receives a **finite** numeric value when §6.1 is reached. Non-finite numbers are never kind-evaluated under `range`; they fail at the type gate with **Field value type mismatch**.

Let `v` be that finite number. Let `min` / `max` be the declared properties (at least one present by declaration validity).

| Declared bounds | Passes iff |
| --- | --- |
| `min` only | `v >= min` |
| `max` only | `v <= max` |
| both | `v >= min` **and** `v <= max` |

Rules:

1. Bounds are **inclusive** on every present endpoint.
2. No exclusive / half-open mode exists in this RFC; declaration shape gains no exclusivity flags.
3. Failure cause: **Range constraint violated**.

Rationale: RFC-017 stores plain `min` / `max` without exclusivity metadata; inclusive evaluation is the only complete contract that does not reopen declaration.

### 6.2 `pattern` (ECMAScript, full-string, no flags)

Applies when `C.kind === "pattern"`. Target value `v` is a string. Declared `C.pattern` is a non-empty string (declaration-valid).

Rules:

1. **Dialect:** ECMAScript regular expressions (as specified for `RegExp` in ECMA-262), compiled from `C.pattern` as the **Pattern** source with **no flags** (empty flags string).
2. **Compilation:** If `C.pattern` cannot be compiled under that dialect/flags rule → **fail** with cause **Pattern compilation failure** (distinct from mismatch).
3. **Matching (normative):** The value passes iff there exists a match of the compiled expression such that the match spans the **entire** string `v`. Partial substring matches are insufficient. This is a semantic full-string requirement imposed by this RFC; it does **not** invent a custom regex dialect.
4. **Anchors:** `^` / `$` (and other ECMAScript anchor) semantics remain ordinary ECMAScript regular-expression semantics. RFC-018 does **not** reinterpret anchors. Full-string matching is an additional pass condition on match extent, not a rewrite of the pattern language.
5. Matching is performed against the exact runtime string; no trim, case-fold, Unicode normalization, or other string normalization is applied by this RFC before matching.
6. Failure causes: **Pattern compilation failure** or **Pattern constraint violated**.

Notes:

1. Declaration-time opacity of `pattern` (RFC-017) is preserved: declaration does not compile or validate dialect. Compilation belongs to runtime enforcement.
2. Callers who need flags must encode them in the pattern language itself where ECMAScript allows, or await a future RFC that amends declaration — this RFC does **not** add a flags property.
3. Implementations may realize full-string matching by any technique that preserves the normative match-extent rule and ordinary ECMAScript pattern/`^`/`$` semantics; this RFC does not prescribe a particular wrapping or API.

### 6.3 `enum` (exact membership)

Applies when `C.kind === "enum"`. Target value `v` is a non-null scalar matching `F.type`. Declared `C.values` is a non-empty homogeneous sequence (declaration-valid).

Rules:

1. The value passes iff there exists an element `e` in `C.values` such that `v` and `e` are equal under the following equality relation:
   - strings: case-sensitive exact string equality
   - numbers: **ECMAScript strict equality** (`===`); therefore `-0` and `0` are members-equivalent. (`NaN` is already excluded by the §5.2 type gate and by declaration finiteness, so it never reaches membership.)
   - booleans: exact boolean equality
2. Sequence **order** of `values` does **not** affect membership (order remains meaningful for Constraint **value equality** under RFC-017, but not for runtime membership).
3. Failure cause: **Enum constraint violated**.

Implementations MUST NOT use `Object.is` (or other SameValue relations) for numeric enum membership under this RFC.

## 7. Evaluation ordering and result model

1. Consider Constraints in the Resource’s `constraints` **sequence order** (RFC-016 order).
2. For each Constraint, apply §5 gates; if skip, continue to the next Constraint; if fail, **stop**.
3. If gates pass, apply the matching §6 kind contract; on violation / compilation failure, **stop**.
4. If every Constraint skips or passes → enforcement **succeeds**.
5. **Fail-fast:** at most one enforcement failure is produced per check invocation; it corresponds to the earliest failing Constraint (or its presence/null/type gate) in sequence order.
6. Multiple Constraints on the same Field are each considered in sequence order (no per-Field regrouping).
7. Empty `constraints` → success for any field-value map; no field presence, nullability, type, or kind gates are evaluated because there is no targeted Constraint. Unknown map keys remain ignored.

**Determinism:** For a fixed declaration-valid Resource and field-value map, the success/failure outcome and failing cause identity are deterministic.

## 8. Failure causes (conceptual)

Runtime enforcement failures are **distinct** from declaration-time Constraint validation causes (RFC-016 / RFC-017). Conceptual causes:

| Cause | When |
| --- | --- |
| Missing required field value | Absent map entry for `optional: false` Field targeted by the current Constraint |
| Null field value | Present `null` for `nullable: false` Field targeted by the current Constraint |
| Field value type mismatch | Present non-null value not allowed for the target Field’s `FieldType` (including non-finite number for `number`) |
| Range constraint violated | Finite number fails inclusive `min` / `max` rules |
| Pattern compilation failure | Declared `pattern` is not a compilable no-flag ECMAScript RegExp Pattern |
| Pattern constraint violated | Compiled pattern does not full-string-match the value |
| Enum constraint violated | Value not exactly equal to any declared enum element |

Rules:

1. Causes above are enforcement / value-check failures — not Resource schema declaration failures.
2. No silent repair, coercion, defaulting, trimming, or bound rewriting.
3. Concrete error codes / TypeScript unions are deferred to implementation planning; **separation** of these causes is normative.
4. A precondition failure for declaration-invalid Resource (if implemented) MUST NOT be conflated with the causes in this table.

## 9. Runtime check surface

### 9.1 Conceptual operation

```text
checkConstraintValues(resource, fieldValueMap) → ok | enforcement failure
```

Normative properties:

1. **Inputs:** a Resource (assumed declaration-valid) and a field-value map (§4).
2. **Behavior:** §5–§7.
3. **Success:** no enforcement failure under fail-fast evaluation.
4. **Failure:** exactly one conceptual cause from §8 for fail-fast evaluation.
5. **Purity:** MUST NOT mutate Resource, declared `constraints`, or the caller’s field-value map.
6. **Independence from declaration API:** This surface is conceptually distinct from declaration-time Constraint checking. This RFC does **not** require exposing declaration `validateConstraints`, and does **not** require folding runtime checks into `validateResource`.

### 9.2 Relationship to declared constraints

| Declared artifact | Runtime role |
| --- | --- |
| `constraints` sequence | Authoritative ordered list of Constraints to evaluate |
| Constraint `name` | Identifies the Constraint in diagnostics (implementations SHOULD include name/index); not an evaluation input beyond identity |
| Constraint `kind` + kind properties | Select and parameterize §6 rules |
| Constraint `field` | Selects the Field and map entry for gates / evaluation |
| Field `type` / `optional` / `nullable` | Type gate and presence/null gates |

Hosts MAY call the runtime check when applying values (create/update handlers, adapters, etc.). This RFC does not mandate a particular host lifecycle hook.

## 10. Projection and Resource aggregate

1. Runtime enforcement does **not** contribute to `projectResourceMetadata`.
2. Enforcement failures are not metadata.
3. Resource aggregate shape (`identity`, `schema`, `annotations`) is unchanged.
4. Field values are not added to the Resource aggregate by this RFC.

## 11. Worked examples (conceptual)

```text
fields:
  total:  { type: number, optional: false, nullable: false }
  code:   { type: string, optional: true,  nullable: false }
  note:   { type: string, optional: true,  nullable: true }
  status: { type: string, optional: false, nullable: false }

constraints (order):
  0: { name: totalBounds, kind: "range", field: total, min: 0, max: 100 }   # inclusive
  1: { name: codePattern, kind: "pattern", field: code, pattern: "^[A-Z]+$" }
  2: { name: statusEnum, kind: "enum", field: status, values: ["open", "closed"] }
```

```text
# Success — all present & satisfying; code omitted (optional → skip pattern)
values: { total: 50, status: "open" }

# Success — code present and matching
values: { total: 0, code: "ABC", status: "closed" }   # min inclusive

# Success — note null skipped if a pattern were targeted at note (nullable)
# (no note constraint in this fixture)

# Fail — missing required total (gate), before later constraints
values: { status: "open" }
→ Missing required field value (constraint totalBounds / field total)

# Fail — null on non-nullable total
values: { total: null, status: "open" }
→ Null field value

# Fail — inclusive range (101 > max)
values: { total: 101, status: "open" }
→ Range constraint violated (totalBounds)

# Fail — enum membership
values: { total: 1, status: "pending" }
→ Enum constraint violated (statusEnum)

# Fail — pattern mismatch (full-string; partial insufficient)
values: { total: 1, code: "ABCdef", status: "open" }
→ Pattern constraint violated (codePattern)

# Fail-fast ordering: range fails before enum is considered
values: { total: -1, status: "pending" }
→ Range constraint violated (totalBounds)
  (statusEnum not evaluated)
```

```text
# Inclusive bounds
range min:0 max:100
  0 → pass; 100 → pass; -0.1 → fail; 100.1 → fail

# Pattern compilation vs mismatch
pattern: "["     → Pattern compilation failure (ECMAScript compile)
pattern: "^A+$" with value "A" → pass; value "B" → Pattern constraint violated
```

## 12. Design rationale

- **Follow declaration without reopening it** — M3.14/RFC-017 already closed kinds and shapes; this RFC only evaluates them.
- **Inclusive `range`** — exclusivity would require declaration metadata RFC-017 does not have; inclusive is the complete no-reopen contract.
- **ECMAScript `pattern` + full-string + no flags** — matches the TypeScript host ecosystem; full-string avoids silent substring acceptance; no flags avoids smuggling a second declaration channel.
- **Compile failure ≠ mismatch** — declaration opacity means bad patterns surface at runtime; callers need a distinct cause.
- **Enum membership ignores order** — order remains a declaration equality concern; membership is set-like under exact equality without introducing a set type.
- **optional/nullable gates before kind rules** — reuses Accepted Field flags; skip means “no scalar to enforce,” fail means presence/null contract broken for enforcement.
- **Fail-fast in constraints order** — deterministic, aligned with ordered `constraints`, and avoids underspecified multi-error aggregation.
- **Separate check surface** — keeps declaration validate-before-snapshot pure; runtime values are not Resource schema state.
- **Ignore unknown map keys** — normative Constraint-driven invariant (§4); rejecting undeclared keys would invent a closed-payload validator this RFC deliberately does not own.
- **Per-Constraint gates only** — avoids a two-phase field-validity model that would blur the boundary with a general instance validator.

## 13. Relationship to other RFCs and milestones

| RFC / milestone | Relationship |
| --- | --- |
| RFC-013 / RFC-014 | Declaration flags reused as runtime gates; declaration text not reopened |
| RFC-016 Constraints | Packaging / order / names retained; evaluation added here |
| RFC-017 Concrete Constraint Kinds | Declaration shapes retained; deferred runtime / inclusivity / pattern dialect / enum membership locked here |
| Later — uniqueness / cross-member | Extends vocabulary beyond RFC-017’s three kinds |
| Later — Relation-targeted constraints | Orthogonal attachment |
| Later — wire / persistence / instance model | May consume this check surface |
| M3.x Runtime Constraint Enforcement implementation | Only after this RFC is Accepted and an Accepted implementation plan exists |

### Suggested sequence (non-normative)

```text
RFC-016  Constraints framework                         (Accepted)
        │
RFC-017  Concrete constraint kinds (declaration only)  (Accepted / M3.14)
        │
RFC-018  Runtime constraint enforcement (this RFC)     ← evaluation contract
        │
Later    Uniqueness / cross-member; Relation-targeted; …
```

## 14. Document acceptance criteria (M2 → M3 Design Review)

This RFC may move from Draft to Accepted when Design Review finds:

1. Field-value map surface (including absent vs `null`, ignore-unknown-keys) is unambiguous.
2. Declaration-valid Resource precondition is clear; RFC-016 / RFC-017 / M3.14 declaration behavior is not reopened or assumed to already enforce values.
3. Inclusive `range` evaluation is unambiguous; no exclusive declaration flags are introduced.
4. ECMAScript `pattern` dialect, no flags, full-string matching, and compile-failure vs mismatch causes are unambiguous.
5. `enum` exact-membership rules are unambiguous; declaration `values` order does not affect membership.
6. `optional` / `nullable` skip-vs-fail gates and the type gate are unambiguous, applied per targeted Constraint (no separate field-validity pass), and Field-scoped to this check.
7. `constraints` sequence order + fail-fast determinism are unambiguous.
8. Conceptual failure causes are distinct from declaration-time causes and from each other as listed in §8.
9. Runtime check surface is distinct from declaration validation; projection / Resource aggregate remain unchanged.
10. Deferred concerns in §1.2 remain deferred.

## 15. Explicit deferrals

Deferred concerns are listed in §1.2. This ledger does not add scope; it records that uniqueness / cross-member vocabularies, Relation attachment, exclusive declaration flags, pattern flags/alternate dialects, wire/persistence, a full Resource instance model, Relation runtime presence, multi-error aggregation APIs, and host lifecycle mandates remain out of scope unless a future RFC says otherwise.

## 16. Compatibility / impact

| Concern | Impact |
| --- | --- |
| RFC-016 / RFC-017 / M3.14 declaration contracts | **Unchanged** |
| Existing declaration-valid Resources | Remain declaration-valid; gain an optional runtime check when callers supply values |
| Dual evaluation modes (inclusive vs exclusive) | **Not** provided |
| Pattern flags property | **Not** provided |
| `validateResource` / declaration `checkConstraints` | Not required to invoke runtime enforcement |
| Projection | Still no Constraint contribution |

## 17. Open questions for Design Review (M3)

None. M3 Design Review Accepted (2026-08-08). Clarifications applied before Accept: per-Constraint gate invariant (no separate field-validity pass); `range` finite precondition tied to §5.2; implementation-neutral full-string `pattern` match with ordinary ECMAScript `^`/`$` semantics; `enum` numeric membership via `===` (`-0`/`0` equivalent); unknown-keys ignore promoted to normative invariant; empty-`constraints` wording corrected. Inclusive-only `range`, no regex flags, fail-fast, and Constraint-targeted missing-required enforcement retained; RFC-017 not reopened.
