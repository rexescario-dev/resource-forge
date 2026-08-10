# RFC-041: CLI Generate From-Prisma (Bootstrap)

**Date:** 2026-08-10  
**Status:** Accepted  
**M3:** Accepted (2026-08-11) — Design Review; no design blockers. Locked: Supported DMMF Profile (required field metadata; unique model/field names; path-safe model names; missing metadata → API error); independent closed reverse map (not RFC-033/034 inverse; no verify obligation); prisma owns synthesis / CLI thin I/O; `rf generate from-prisma <dmmfPath> <outDir> --namespace <namespace>`; per-model fail-closed; relation recognition `kind==="object"`; self-relation + complete-set implicit m:n pair refusals; list relations `nullable/optional:false` (`isRequired` ignored); inverse via relationName pairing; FK scalars retained; write-safety invariant + create-only races; exit `0` iff ≥1 written; `run` only; doctor registry unchanged. M4 (implementation planning) authorized for `#138`.  
**Package:** `@resource-forge/prisma` (owns DMMF → Resource bootstrap synthesis); `@resource-forge/cli` (thin `generate from-prisma` I/O adapter)  
**Tracking:** [#138](https://github.com/rexescario-dev/resource-forge/issues/138)  
**Depends on:** [RFC-036 CLI Foundation](2026-08-10-rfc-036-cli-foundation-design.md) (**Accepted**) for `rf` / `run(argv)` / exit `0/1/2` / bin adapter / internal command registry; [RFC-037 CLI Resource Validation](2026-08-10-rfc-037-cli-resource-validation-design.md) (**Accepted**) for Resource document validation vocabulary and the allowed `@resource-forge/cli → @resource-forge/core` dependency; [RFC-038 CLI Package Environment Doctor](2026-08-10-rfc-038-cli-package-environment-doctor-design.md) (**Accepted**) as a coexisting product command (doctor registry expectations unchanged); [RFC-039 CLI Generate Resource](2026-08-10-rfc-039-cli-generate-resource-design.md) (**Accepted**) for flat `generate` + kind-token composition (extended here with kind `from-prisma` only); [RFC-040 CLI Init Project Marker](2026-08-10-rfc-040-cli-init-project-marker-design.md) (**Accepted**) as a coexisting product command (init semantics not reopened; project marker unused by this slice); [RFC-001](2026-08-06-rfc-001-resource-identity-design.md) / [RFC-005](2026-08-07-rfc-005-resource-model-design.md) / Field & Relation RFCs (**Accepted**) as the core Resource construction/validation boundary; [RFC-033](2026-08-10-rfc-033-prisma-correspondence-verification-design.md) / [RFC-034](2026-08-10-rfc-034-prisma-schema-realization-design.md) / [RFC-035](2026-08-10-rfc-035-prisma-client-bindings-design.md) (**Accepted**) as **fences and coexistence only** — not reverse-mapping authority  
**Followed by:** M5.6 implementation planning/delivery for `#138` after Accept; later `schema.prisma → DMMF` convenience, round-trip reverse synthesis, richer type mapping, `--force`/mkdir, filters, and `join` inference only under separately Accepted designs  
**Unblocks:** A deterministic bootstrap path from an existing Prisma DMMF document to starter Resource JSON documents without claiming Resource↔Prisma round-trip fidelity

**Amends / specializes:** Roadmap **M5 — CLI & examples** by **proposing/targeting M5.6 CLI Generate From-Prisma** (bootstrap only as defined here). Extends RFC-039’s `generate` kind surface with kind token `from-prisma`. Extends `@resource-forge/prisma` with a public bootstrap synthesis API. Reuses RFC-036/037 exit-code vocabulary (`0` / `1` / `2`) with from-prisma-specific outcome mapping; does **not** change those exit-code meanings or introduce new exit codes. Does **not** reopen RFC-036’s public package API (`run` only) or bin stream/exit rules. Does **not** reopen RFC-037–040 product semantics beyond registering the new generate kind. Does **not** reopen RFC-033/034/035 as inverse algorithms. Does **not** amend RFC-001–RFC-035 product contracts beyond consuming Accepted core constructors/validators. Does **not** mutate roadmap milestone status by itself.

**Revision note:** Revised after pre-M3 review return — locks Supported DMMF Profile (§4.1), relation recognition/refusal/inverse rules (§5.2), relation nullability (§5.2.3), core-failure classification (§4.5), write-safety invariant (§6.2), create-only write races (§6.3), filename path-safety (§4.2 / §6.3), `@map` naming (§5.4), and `cli → prisma` dependency edge (§3). Final pre-Accept tightenings: unique model/field names (§4.1); complete-set implicit m:n classification before mapping (§5.2.4); list-relation `isRequired` ignored for nullability (§5.2.3).

## Primary question

> How should Resource Forge expose deterministic **Prisma DMMF → starter Resource JSON** bootstrap generation—owned by `@resource-forge/prisma` with a thin CLI adapter—without inventing schema parsing, project awareness, or a round-trip guarantee?

## Thesis

RFC-041 locks M5.6 as **CLI Generate From-Prisma (Bootstrap)**:

- **Job:** adoption-oriented bootstrap aid — turn an existing Prisma DMMF into useful starter Resource JSON documents.
- **Normative input:** Prisma **DMMF JSON only**, constrained by the **Supported DMMF Profile** in §4.1. `schema.prisma → DMMF` is out of scope. Incomplete/simplified DMMF variants missing required metadata are **API errors**, not heuristic inference.
- **Mapping authority:** a **new closed, deterministic reverse-mapping contract**. It is **not** an inversion of RFC-033/034 and provides **no round-trip guarantee**. Generated Resources are **not required to verify** against the source DMMF under RFC-033.
- **Ownership:** `@resource-forge/prisma` owns synthesis; `@resource-forge/cli` owns argv, filesystem policy, and reporting.
- **Unit of work:** one DMMF + required `namespace` → per-model `emit` or `refuse`; CLI succeeds only when **≥1 Resource is written**.
- **Per-model fail-closed:** a model is emitted only when **all** of its included members are mappable; no silent in-model member dropping. Self-relations and implicit many-to-many relations are **refusal conditions**, not omitted members.
- **CLI surface:** `rf generate from-prisma <dmmfPath> <outDir> --namespace <namespace>` (flat kind under `generate`).
- **Filesystem:** existing `outDir`; create-if-absent / create-only; **write-safety invariant** (deterministically detectable failures before first write); any destination collision → write **zero** files; no `--force`.
- **`run(argv)` remains the sole public CLI package API.** Doctor registry still requires only `validate` + `doctor`.

```text
DMMF JSON + namespace
        │
        ▼
@resource-forge/prisma
  synthesizeResourcesFromDmmf(...)
  (Supported DMMF Profile + closed reverse map;
   per-model emit|refuse + structured refusals)
        │
        ▼
{ emissions[], refusals[] }   # conceptual; exact export names are product surface in §4
        │
        ▼
@resource-forge/cli  (generate from-prisma)
  path/outDir preflight → synthesize → collision preflight → write
  exit by ≥1 written rule
```

## 1. Scope

### 1.1 Goals

1. Propose/target **M5.6** as Prisma DMMF → starter Resource JSON bootstrap via `generate` kind `from-prisma`.
2. Lock `@resource-forge/prisma` as owner of a public bootstrap synthesis API over DMMF + required `namespace`.
3. Lock the **Supported DMMF Profile** (§4.1) as the normative input contract (structurally compatible profiles, not “any DMMF-ish JSON”).
4. Lock an **independent closed reverse-mapping table** (scalars + relations) with Approach-3-conservative initial allow-list and documented lossiness.
5. Lock normative relation recognition, self-relation, implicit many-to-many, inverse, and list-nullability rules (§5.2).
6. Lock per-model emit/refuse with structured refusals and the invariant that each model appears in **exactly one** of emissions or refusals.
7. Lock CLI surface `rf generate from-prisma <dmmfPath> <outDir> --namespace <namespace>`.
8. Lock multi-file emit into an explicit existing `outDir` with deterministic `{ModelName}.json` filenames and path-safety.
9. Lock full preflight / create-if-absent / collision→zero-writes filesystem policy.
10. Lock exit `0/1/2` outcome table: success means **≥1 Resource written**.
11. Preserve CLI public API: sole normative export remains `run`; no Prisma runtime/CLI dependency in `@resource-forge/cli`.
12. Fence schema parsing, round-trip fidelity, project awareness, overwrite/`--force`, and richer Prisma constructs as listed in §1.2 / §13.
13. Lock testing centered on prisma synthesis unit tests plus `run(['generate', 'from-prisma', …])`.

### 1.2 Non-goals

This RFC does not define:

1. `schema.prisma → DMMF` tooling or Prisma CLI/engine/runtime dependency in `@resource-forge/cli`
2. Round-trip / verify / emit fidelity. In particular, generated Resources are **not required to verify against the source DMMF** under RFC-033; bootstrap is not `Resource → Prisma → Resource` fidelity
3. Inversion or reuse of RFC-033/034 allow-lists as the reverse authority (bootstrap table is independent)
4. `--force`, overwrite, `outDir` creation (`mkdir`), or transactional multi-file rollback
5. Project marker loading / upward discovery / project-aware path defaults (`resource-forge.json` unused)
6. Model include/exclude filters, interactive selection, or stdin DMMF
7. Mapping of `BigInt`, `DateTime`, `Json`, `Bytes`, enums, scalar lists, composites, and any other **unsupported Prisma model members/kinds encountered inside the DMMF** (encountered unsupported members are refusal causes, not ignorable)
8. Implicit many-to-many or self-relations as mapped members — those are **refusal conditions**, not silently omitted members
9. `join` inference from FK scalars; FK scalars remain ordinary Fields
10. Cascade/fetch fidelity from Prisma referential actions / include behavior (fixed `"none"` / `"lazy"` bootstrap defaults)
11. Widening core `FieldType`, new core persistence APIs, or `@resource-forge/project`
12. Other `generate` kinds; nested command frameworks; `run(argv, opts)`; public CLI helpers beyond `run`
13. Changing doctor’s required registry set (`validate` + `doctor` only)
14. Examples app population, Nest/GraphQL wiring, or Prisma Client binding generation
15. Bidirectional sync, watch mode, or merge/update of existing Resource docs
16. Acceptance of incomplete/simplified Prisma DMMF variants that omit §4.1-required metadata (those are API errors)
17. Roadmap status mutation (this RFC proposes/targets M5.6; it does not by itself mark M5.6 done)

### 1.3 Informative only

- Exact stderr wording is implementation-owned except that report ordering (§7.4) and distinguishability of usage / collision / refusal / write-failure classes SHOULD hold where practical.
- Exact TypeScript file layout and internal helper names are implementation-owned.
- JSON pretty-print, trailing newline, and key order of written Resource documents are implementation-owned so long as RFC-037 round-trip validation of a successfully written document holds.
- Concrete create-only write primitive (e.g. exclusive-create flags) is implementation-owned so long as §6.3 holds.
- Public function export name may be `synthesizeResourcesFromDmmf` or an equivalent locked at Accept/M4; semantics in §4 are normative.
- Stable refusal `code` string vocabulary is implementation-owned so long as codes are deterministic for the same input and distinguish the refusal classes required by tests (§8).

## 2. Terminology

| Term | Meaning |
| --- | --- |
| Bootstrap synthesis | Deterministic DMMF → starter Resource generation under this RFC’s closed map |
| Supported DMMF Profile | The structural input contract in §4.1; structurally compatible DMMF documents that supply all required metadata |
| DMMF document | JSON object conforming to the Supported DMMF Profile |
| Emission | One successfully synthesized Resource for one Prisma model, with deterministic filename |
| Refusal | Structured diagnostic that a Prisma model will not be emitted |
| Kind token | First positional after `generate`; this RFC adds `from-prisma` beside RFC-039 `resource` |
| Reverse-mapping table | Closed Prisma→Resource member mapping defined here; not an inverse of RFC-033/034 |
| Relation field | A DMMF model field with `kind === "object"` under §5.2.1 |
| Option-like token | Any argv token beginning with `-` after `generate from-prisma`, except the recognized `--namespace` option |

## 3. Architecture and package boundaries

1. **Prisma package owns domain synthesis.** Public API accepts `{ dmmf, namespace }` and returns emissions + refusals, or an error for malformed/unsupported DMMF / invalid namespace / unexpected failures (§4.5).
2. **CLI owns orchestration/I/O.** Read DMMF JSON from `dmmfPath`; call synthesis; preflight filesystem; write files; print report; set exit code via `run`.
3. **Core remains Resource validity authority.** Synthesis MUST construct Resources through Accepted core construction/validation boundaries; it MUST NOT bypass core invariants to accommodate Prisma input.
4. **CLI MUST NOT** implement the reverse-mapping table locally.
5. **CLI MUST NOT** require Prisma Client, Prisma CLI, or schema parsing for this slice.
6. **Dependency edge:** `@resource-forge/cli` MAY depend on `@resource-forge/prisma` **and** may continue to depend on `@resource-forge/core` (as allowed by RFC-037). Allowed graph:

   ```text
   cli → prisma → core
   cli → core
   ```

   CLI MUST import only the **public synthesis API** from `@resource-forge/prisma`; it MUST NOT import Prisma package implementation internals.
7. Nest / GraphQL remain forbidden CLI dependencies for this slice.
8. Doctor registry expectations remain `validate` + `doctor` only; presence of `from-prisma` MUST NOT change them.
9. Public CLI export remains `run` only.

## 4. Prisma synthesis API contract

### 4.1 Supported DMMF Profile (normative)

RFC-041 accepts **structurally compatible DMMF profiles**, not a pinned Prisma major/minor “DMMF vX only” label and not “whatever looks DMMF-ish.”

**Accepted root shape:**

1. Input MUST be a JSON object (after parse) with `datamodel.models` as an array.
2. Other top-level DMMF keys (e.g. `schema`, `mappings`) MAY be present and are ignored.

**Each model entry MUST provide:**

1. `name`: non-empty string
2. `fields`: array (declaration order = member order)

**Uniqueness (profile errors, not model refusals):**

1. `datamodel.models` MUST contain **unique** model `name` values. Duplicate model names → **API error**.
2. Within a single model, field `name` values MUST be **unique**. Duplicate field names → **API error**.

**Each field entry MUST provide:**

| Property | Requirement |
| --- | --- |
| `name` | non-empty string |
| `kind` | string |
| `type` | string |
| `isRequired` | boolean |
| `isList` | boolean |

**Additionally, when `kind === "object"` (relation field), the field MUST provide:**

| Property | Requirement |
| --- | --- |
| `relationFromFields` | array of strings (may be empty) |
| `relationToFields` | array of strings (may be empty) |
| `relationName` | string or `null` (MUST be present as either; used for inverse pairing) |

**Profile failure rule:**

1. Missing/wrong-typed required metadata → **API error** (unsupported/malformed DMMF).
2. Duplicate model names or duplicate field names within a model → **API error**.
3. Implementations MUST NOT invent defaults for missing `isRequired`, `isList`, relation target, or relation scalar-field arrays.
4. Simplified Prisma DMMF variants that omit these properties are **out of contract** for this slice.

**Model-name path safety (input):**

1. Each model `name` MUST match the single-path-segment identifier pattern `^[A-Za-z_][A-Za-z0-9_]*$`.
2. Otherwise → **API error** (invalid DMMF model name). Path separators, `.`, `..`, or other traversal components MUST never be accepted as model names.

### 4.2 Inputs / outputs

1. `dmmf` — document conforming to §4.1. Failure → API error.
2. `namespace` — required non-empty Resource identity namespace string. Invalid/missing → API error (library MUST NOT invent a default namespace).

Conceptual success payload:

```ts
type Emission = {
  model: string;
  resource: Resource; // Accepted core Resource value
  filename: string;   // "{ModelName}.json"
};

type Refusal = {
  model: string;
  code: string;       // stable refusal code
  member?: string;    // field/relation name when applicable
  detail: string;
};

type SynthesisSuccess = {
  emissions: readonly Emission[];
  refusals: readonly Refusal[];
};
```

Invariants:

1. Each Prisma **model** candidate appears in **exactly one** of `emissions` or `refusals`.
2. `filename` MUST be `{ModelName}.json` where `ModelName` is the Prisma model name unchanged (already path-safe by §4.1).
3. Emitted `resource.identity` MUST be `{ namespace, name: ModelName }` with `name` exactly the Prisma model name.
4. Empty `emissions` with only refusals is a valid synthesis success payload (CLI maps that to exit `1` with zero writes).

### 4.3 Model selection

1. Every Prisma **model** in `datamodel.models` is a candidate.
2. Enums, composites, and non-model DMMF entries are not emission candidates; their mere presence does not fail the run.
3. No include/exclude filters in this slice.

### 4.4 Per-model decision

For each candidate model:

1. Inspect **all** fields on that model in `fields` array order.
2. Classify each field as scalar (`kind === "scalar"`), relation (`kind === "object"`), or unsupported kind.
3. If every included member maps under §5 → attempt core construction/validation → on success **emit**.
4. If any member falls outside §5 → **refuse** the whole model (no partial Resource; no silent member drop).
5. Self-relations and implicit many-to-many relations are refusal conditions for that model (§5.2.4).

### 4.5 Core construction failure classification

1. **Mapping refusals** — documented §5 failures attributable to Prisma member shape (unsupported type, self-relation, implicit m:n, etc.) → populate `refusals`.
2. **Model-derived core failures** — the synthesized candidate Resource shape is fully determined by §5 rules, yet Accepted core construction/validation rejects it for a reason attributable to that Prisma-derived shape (e.g. a core-invariants violation arising from the mapped members) → **refusal** with a stable code (MUST NOT emit a partial Resource).
3. **Unexpected failures** — programming bugs, invariant violations in the synthesizer itself, unexpected thrown exceptions, and failures not attributable to the Prisma input MUST propagate as **API errors**. Implementations MUST NOT catch arbitrary throwables and rewrite them as `refused: core_construction_failed`.

## 5. Closed reverse-mapping table

### 5.1 Scalar fields

A field is a scalar candidate when `kind === "scalar"`.

| Prisma scalar `type` | Resource `FieldType` |
| --- | --- |
| `String` | `string` |
| `Boolean` | `boolean` |
| `Int` | `number` |
| `Float` | `number` |
| `Decimal` | `number` |

Documented loss: **`Float` and `Decimal` precision/representation semantics are not preserved.**

**Refuse the model** when a scalar candidate has:

1. `isList === true` (scalar lists unsupported), or
2. `type` outside the table above, or
3. any other unsupported scalar/member situation covered by §1.2.7

Rules:

1. Field `name` = DMMF field `name` (schema-level name). Database-level mapped names (`dbName` / `@map`) are **ignored**.
2. **Nullability/optionality bootstrap heuristic (lossy) for scalars:**
   - `isRequired === false` → `nullable: true`, `optional: true`
   - `isRequired === true` → `nullable: false`, `optional: false`
3. This heuristic does **not** claim to recover RFC-013 semantics from Prisma.
4. FK scalar columns that are allow-listed scalars **remain Fields** even when a corresponding Relation exists. Do **not** infer `join` from them.

### 5.2 Relations

#### 5.2.1 Recognition

A field is a **relation field** when and only when:

```text
kind === "object"
```

`type` is the related Prisma model name. The related model MUST exist in `datamodel.models` or the source model is refused (§5.2.4).

Unsupported `kind` values (including `enum`, `unsupported`, and any newly encountered kind) → **refuse the model** (not ignored).

#### 5.2.2 Mapped Relation members

| Resource member | Bootstrap rule |
| --- | --- |
| `name` | DMMF field `name` |
| `target` | `{ namespace, name: type }` |
| `multiplicity` | `isList === true` → `"many"`; `isList === false` → `"one"` |
| `nullable` / `optional` | §5.2.3 |
| `direction` | fixed bootstrap default `"outbound"` (core `RelationDirection`) |
| `onDelete` / `onUpdate` | fixed bootstrap default `"none"` |
| `fetch` | fixed bootstrap default `"lazy"` |
| `inverse` | §5.2.5 |
| `join` | **omit** this slice |

#### 5.2.3 Relation nullability / optionality

List relations are **not** treated as nullable lists:

```text
isList === true
  → nullable: false
  → optional: false

isList === false && isRequired === true
  → nullable: false
  → optional: false

isList === false && isRequired === false
  → nullable: true
  → optional: true
```

For list relations (`isList === true`), `isRequired` does **not** affect bootstrap nullability/optionality; list relations always map to `nullable: false`, `optional: false`. The profile still requires `isRequired` as a boolean (§4.1); its value is ignored for this mapping rule.

#### 5.2.4 Relation refusal conditions

**Classification sequencing:** relation-pair classifications (including implicit many-to-many) are performed against the **complete** `datamodel.models` set **before** member mapping for emissions. An identified implicit many-to-many relation causes **refusal of the source model** (refusal condition, not a silently omitted member).

**Refuse the model** when any relation field on that model matches any of:

1. **Self-relation:** `type ===` current model `name`
2. **Missing related model:** no model in `datamodel.models` with `name === type`
3. **Implicit many-to-many (relation pair):** a relation is classified as implicit many-to-many when the source field `R` on model `A` and a reciprocal field `S` on target model `B` satisfy all of:
   - `R.kind === "object"` and `S.kind === "object"`
   - `R.type === B.name` and `S.type === A.name`
   - `R.isList === true` and `S.isList === true`
   - `R.relationFromFields.length === 0` and `S.relationFromFields.length === 0`
   - relation-name pairing: either both `relationName` values are non-null strings and equal, or both are `null`
4. **Undetermined multiplicity/target:** required profile fields are present (else API error), but the closed rules still cannot classify the relation (reserved for completeness; prefer specific codes above)
5. **Otherwise not expressible** under this table

Notes:

1. Explicit one-to-one / one-to-many relations that satisfy the table **are mapped** (including cases where `relationFromFields` is non-empty on the FK-owning side).
2. Relation targets reference identities under the supplied namespace; the target model need **not** itself emit successfully for the source to emit, but the target model MUST exist in the DMMF.
3. Fixed cascade/fetch defaults are bootstrap aids only — **not** Prisma referential-action / include fidelity.
4. Self-relations and implicit many-to-many are **refusal conditions**, not silently omitted members.
5. Do **not** invent heuristics beyond the relation-pair rule above for recognizing implicit many-to-many.

#### 5.2.5 Inverse detection

Set `inverse` to the target-side relation field name when **all** of the following hold; otherwise **omit** `inverse`:

1. Source field `R` on model `A` targets model `B` (`R.type === B.name`).
2. There exists exactly one field `S` on model `B` such that:
   - `S.kind === "object"`
   - `S.type === A.name`
   - relation-name pairing holds: either both `R.relationName` and `S.relationName` are non-null equal strings, or both are `null` **and** `S` is the unique such back-reference on `B` to `A`
3. The relation is not refused as self-relation or implicit many-to-many.

If multiple candidate back-references exist without a distinguishing non-null equal `relationName`, omit `inverse` (do not guess). If the ambiguity means the relation cannot be safely mapped under product needs, prefer refusal only when §5.2.4 already applies; otherwise omit `inverse` and still emit when otherwise mappable.

### 5.3 Ordering inside emitted Resources

1. Preserve **`model.fields` array order** for Fields and Relations (DMMF declaration order under the Supported DMMF Profile).
2. Because §4.1 requires `fields` arrays, name-sort fallback is **not** used for profile-conforming input.

### 5.4 Non-claims / naming

1. Not an inverse of RFC-033/034.
2. No obligation that emitted Resources satisfy `verifyPrismaCorrespondence` against the source DMMF.
3. No widening of core `FieldType`.
4. Annotations remain as produced by Accepted core construction (empty unless core requires otherwise).
5. Constraints / operations / indexes are out of the mapping surface; indexes alone do not refuse a model; unmappable **members** do.
6. Resource Field/Relation names come from the DMMF model field `name`; database-level mapped names (`dbName` / `@map`) are ignored.

## 6. CLI argv, paths, and filesystem

### 6.1 Invocation

```text
rf generate from-prisma <dmmfPath> <outDir> --namespace <namespace>
```

1. Flat kind under `generate` (kind token `from-prisma`).
2. Exactly two positionals: `dmmfPath`, `outDir`.
3. Required option: `--namespace <value>` (single option/value pair).
4. `--namespace <value>` MAY appear anywhere after `generate from-prisma`.
5. Any other option-like token, bare `--namespace`, or extra tokens → exit `2`.
6. Resolve paths relative to process cwd; absolute paths unchanged. No upward discovery. No project marker loading.

Valid examples:

```text
rf generate from-prisma schema.json out --namespace crm
rf generate from-prisma --namespace crm schema.json out
rf generate from-prisma schema.json --namespace crm out
```

### 6.2 Execution order (preflight before write)

```text
argv
→ resolve paths
→ validate dmmf path (existence)
→ validate outDir (exists + directory)
→ read/parse DMMF
→ synthesize (Supported DMMF Profile + mapping)
→ calculate destinations
→ collision checks
→ write
```

**Write-safety invariant:** every failure that is deterministically detectable before writing MUST be detected before the first write. Equivalently: no failure that is deterministically detectable before file creation may first surface after a file has been written. This does **not** claim that the filesystem cannot fail after those checks (quota, permission change, concurrent create, disk errors).

If `emissions.length === 0` after successful synthesis → **no filesystem writes**, exit `1`.

### 6.3 Filesystem policy

1. `outDir` MUST already exist and be a directory (no mkdir).
2. Destinations are `join(outDir, filename)` only. Filenames are single path segments from §4.1/§4.2; implementations MUST NOT allow model names to escape `outDir`.
3. Preflight requires every destination path to be **absent**. If **any** candidate exists → report collisions, write **zero** files, exit `2`.
4. Never overwrite; no `--force`.
5. File creation MUST use a **no-overwrite / create-only** mechanism where the host filesystem permits it. Preflight absence checks are not a concurrency proof: a race that causes create-only to fail is an **exit `1` write failure** (not a silent overwrite).
6. After preflight passes, write all emission files.
7. Unexpected mid-write filesystem failure → exit `1`; **no rollback guarantee** for already-written sibling files. Do not invent a transactional temp-directory multi-file commit for this slice.
8. Successfully written documents MUST be valid Resource JSON under the RFC-037 validation path.

## 7. Exit codes, streams, and reporting

### 7.1 Exit table

| Outcome | Files written | Exit |
| --- | ---: | ---: |
| ≥1 Resource written (mapping refusals OK) | ≥1 | `0` |
| Synthesis success with zero emissions (all models refused) | 0 | `1` |
| DMMF path exists but unreadable | 0 | `1` |
| JSON malformed / structurally invalid vs Supported DMMF Profile | 0 | `1` |
| Synthesis API error / write / internal / unexpected failure | 0 or partial after unexpected write fail | `1` |
| Create-only race after preflight | may be partial | `1` |
| Usage / bad argv / missing `--namespace` | 0 | `2` |
| DMMF path missing / does not exist | 0 | `2` |
| Invalid `outDir` (missing / not a directory) | 0 | `2` |
| Any output collision | 0 | `2` |

Normative meaning:

1. **Exit `0`** — ≥1 Resource actually written.
2. **Exit `1`** — valid invocation, but synthesis/input/execution failed to produce a successful bootstrap write set (including zero emissions).
3. **Exit `2`** — invocation / usage / destination precondition refusal.

### 7.2 Missing vs unreadable DMMF

| Condition | Exit |
| --- | ---: |
| DMMF path missing / does not exist | `2` |
| DMMF path exists but cannot be read | `1` |
| JSON malformed | `1` |
| JSON structurally invalid vs Supported DMMF Profile | `1` |

### 7.3 Streams

1. Failure and diagnostic report text → **stderr**.
2. stdout MAY be quiet or carry a minimal success hint (informative).
3. No structured/JSON CLI diagnostic channel in this slice beyond the human report.

### 7.4 Report ordering (deterministic)

1. Generated and refused entries ordered by **model name**.
2. Within each refusal, stable member/code/detail ordering.
3. Collision entries ordered by **filename**.

Example (successful partial bootstrap):

```text
generated: Comment.json
generated: User.json
refused: Post — unsupported_field: createdAt (DateTime)
```

Resource member order inside files follows §5.3 (`fields` array order); report order is independently model-name deterministic.

## 8. Testing contract

1. Prisma package: unit coverage for Supported DMMF Profile rejection, scalar/relation mapping, relation nullability, inverse pairing, refusals (self-relation, implicit m:n, unsupported kinds), namespace required, model∈exactly-one-of emissions/refusals, ordering rules, and §4.5 refusal-vs-API-error classification seams.
2. CLI: coverage via `run(['generate', 'from-prisma', …])` for usage, missing path, invalid outDir-before-synthesis ordering, malformed DMMF, collisions, zero-emission → `1`, ≥1 write → `0`, namespace placement variants, path-safety, and validate round-trip of a written document.
3. Doctor registry expectations unchanged.
4. Public CLI export remains `run` only.

## 9. Rationale

1. **Bootstrap ≠ round-trip** — adoption needs a lossy starter path without coupling to Resource-authoritative correspondence contracts.
2. **Supported DMMF Profile** — Prisma DMMF variants can omit metadata; missing required fields must fail closed as API errors, not heuristic guesses.
3. **DMMF-only** — keeps prisma focused on transformation and CLI free of Prisma tooling.
4. **Prisma owns synthesis** — reverse mapping is Prisma-domain logic; CLI stays I/O policy.
5. **Per-model fail-closed** — avoids misleading incomplete Resources while still bootstrapping the rest of a schema.
6. **Independent closed map** — prevents accidental “invert emit/verify” coupling.
7. **Preflight-covered failures before first write** — multi-file bootstrap must not leave ambiguous partial refreshes for detectable preconditions.
8. **Required namespace** — identity context is not reliably present in DMMF.
9. **Reuse `0/1/2`** — preserves CLI scripting vocabulary from RFC-036–040.

## 10. Relationships

| Artifact | Relationship |
| --- | --- |
| RFC-036 CLI Foundation | **Extended** — `generate` kind surface gains `from-prisma`; public `run` / bin / `0/1/2` preserved |
| RFC-037 CLI Resource Validation | **Relied on** — written documents MUST validate; validate semantics not reopened |
| RFC-038 Doctor | **Coexists** — registry expectations unchanged |
| RFC-039 Generate Resource | **Extended** — adds kind `from-prisma`; `resource` kind semantics not reopened |
| RFC-040 Init | **Coexists** — marker unused by this slice |
| RFC-033 / RFC-034 / RFC-035 | **Fenced / coexistence** — not reverse authority; no verify obligation for bootstrap outputs |
| RFC-001–RFC-035 core contracts | **Consumed** for Resource construction/validation only |
| Roadmap M5 | **Proposes/targets M5.6**; does not mutate roadmap status by itself |

## 11. Acceptance criteria (for this specification)

This specification may move from **Draft** to **Accepted** after Design Review (M3) when:

1. Scope is bootstrap DMMF → Resource JSON only; schema parsing and round-trip fidelity remain fenced.
2. Supported DMMF Profile (§4.1) is normative and fail-closed on missing required metadata, duplicate model names, and duplicate field names.
3. Prisma synthesis API + CLI adapter ownership/`cli → prisma` dependency boundary is unambiguous.
4. Closed scalar/relation reverse map, per-model fail-closed, and structured refusal invariants are normative.
5. Relation recognition, self-relation, complete-set implicit m:n pair classification before mapping, inverse, and list-nullability rules (including list `isRequired` ignored) are precise enough to implement without invention.
6. Core-construction refusal vs unexpected API error classification (§4.5) is normative.
7. Generated Resources are explicitly **not required** to verify against the source DMMF under RFC-033.
8. CLI argv, write-safety invariant, create-only race handling, filename path-safety, and exit `0/1/2` table are normative.
9. Public CLI API remains `run` only; doctor registry expectations unchanged.
10. Testing contract covers synthesis refusals and `run(['generate', 'from-prisma', …])`.
11. Non-goals/deferrals are strong enough to stop M4–M6 scope creep.

## 12. Worked examples (informative)

### 12.1 Scalar refusal + successful siblings

DMMF models `User`, `Post` (with `DateTime createdAt`), `Comment`; namespace `crm`; empty `./resources`.

Synthesis:

- `User` → emit `crm/User` → `User.json`
- `Post` → refuse (`unsupported_field: createdAt`)
- `Comment` → emit `crm/Comment` → `Comment.json`

CLI: preflight OK → write `User.json` and `Comment.json` → exit `0` with refused `Post` reported.

If `User.json` already exists: write **zero** files → exit `2` (collision), even though `Comment.json` would have been creatable.

### 12.2 Relations + FK scalars

Supported DMMF models (abbreviated):

```text
User
  id: Int @id
  posts: Post[]

Post
  id: Int @id
  authorId: Int
  author: User  (@relation fields: [authorId], references: [id])
```

Namespace `crm`. Both models fully mappable.

Emissions (conceptual):

```text
crm/User
  fields: id:number
  relations: posts → crm/Post (many, nullable:false, optional:false, inverse: author)

crm/Post
  fields: id:number, authorId:number
  relations: author → crm/User (one, nullable/optional from isRequired, inverse: posts)
```

Notes:

1. `authorId` remains a Field; `join` is not inferred.
2. `posts` list relation uses §5.2.3 (`nullable: false`, `optional: false`).
3. Filenames: `User.json`, `Post.json`.

## 13. Explicit deferrals / follow-ons

1. `schema.prisma → DMMF` convenience front-end
2. Round-trip / correspondence-preserving reverse synthesis
3. Richer type mapping (`DateTime`, enums, `BigInt`, lists, …)
4. Acceptance of simplified/incomplete Prisma DMMF variants
5. `--force` / overwrite / `mkdir` outDir
6. Model include/exclude filters
7. Relation `join` synthesis from FK scalars
8. CascadePolicy ↔ Prisma referential-action mapping; fetch ↔ include fidelity
9. Self-relation / implicit m:n support
10. Project-aware defaults via `resource-forge.json`
11. Command-specific help UX polish; structured JSON diagnostics channel
12. Pinning a specific Prisma package version as the only legal DMMF producer
