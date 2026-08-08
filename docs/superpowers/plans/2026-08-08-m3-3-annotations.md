# M3.3 Annotations — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-006. Reuse M2 metadata key/value validators and M3.1/M3.2 Resource / projection surfaces. Do **not** implement annotation vocabulary, reserved annotation catalogs, schema members, or cross-source merge/precedence.

**Status:** Accepted  
**M5:** Accepted (2026-08-08) — Plan Review; prior return addressed; wording refinements on validate vs snapshot and empty `createResource` applied  
**Tracking:** [#10](https://github.com/rexescario-dev/resource-forge/issues/10)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted) — M3.3+ was blocked on RFC-006  
**Source RFC:** RFC-006 Annotations (**Accepted**) — fills RFC-005 deferred annotations slot  
**Depends on:** RFC-002 (**Accepted**); RFC-005 (**Accepted**); M3.1 / M3.2 shipped  
**Package:** `@resource-forge/core`  
**Slice:** M3.3 only — annotation container + Resource validation + direct projection participation

**Goal:** Replace the M3.1 `EmptyAnnotations` placeholder with the RFC-006 zero-or-more-entry annotation snapshot, validate it as part of `validateResource`, and project valid annotations by direct 1:1 into `ResourceMetadata` entries.

**Architecture:**

```text
candidate annotation mappings
          │
          ▼
   snapshot construction   ← establishes snapshot-by-value (Resource construction / internal fixture seam)
          │
          ▼
 immutable Annotations
          │
          ▼
       Resource
          │
          ▼
    validateResource       ← validity only; does NOT silently normalize/rebuild annotation state
          │
          ▼
 projectResourceMetadata   ← revalidate Resource; direct 1:1 entries
```

Annotations are authoritative Resource state (not `ResourceMetadata`). The M3.3 representation is an implementation of the RFC-006 abstract collection. Validation reuses RFC-002 key/value rules (including reserved `rf`). Projection revalidates the Resource, then passes annotation mappings as metadata entries to `createResourceMetadata` with exact deep-value preservation and no vocabulary interpretation. Order is non-semantic; RFC-002 metadata equality already ignores entry order.

**Tech Stack:** TypeScript strict, Vitest (existing `packages/core` scripts)

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Locked decisions (export / shape review — planning aids)

These freeze the M3.3 implementation surface. They MUST NOT invent product semantics beyond RFC-006.

| Decision | Lock |
| --- | --- |
| Annotation identity / value | Reuse RFC-002 `MetadataKey` + `JsonValue` (and `MetadataEntry` as `{ key, value }`) |
| Container representation | **Implementation-level:** `Annotations` = `ReadonlyArray<MetadataEntry>`. This is an M3.3 representation of the RFC-006 abstract collection contract. Array order is non-semantic and MUST NOT leak into equality or projection semantics. |
| Empty | Zero-length array; public `emptyAnnotations` is that empty snapshot |
| `EmptyAnnotations` type | **Remove from the public API in M3.3** (no deprecated alias unless a concrete in-repo consumer requires it—none today) |
| `Resource.annotations` | Type widens from `EmptyAnnotations` → `Annotations` |
| Snapshot construction vs validation | **Separated.** Snapshot-by-value is established at Resource construction / fixture seams. `validateResource` validates; it MUST NOT become a silent normalizer/constructor that deep-clones caller-owned mutable annotations into a new Resource as its primary job. |
| Snapshot-by-value depth | Semantic requirement: once part of a Resource, annotation entries and their nested `JsonValue` graphs MUST NOT be mutable through external aliases. Deep snapshotting MUST cover the entry/key containers and the complete nested `JsonValue` graph as needed. Do **not** prescribe a particular clone API unless the repo already has one. |
| Non-empty Resource construction | **No public builder/mutator.** Public `createResource(identity)` remains empty-annotations only. Tests/fixtures needing non-empty Resources use an **internal** test/implementation seam (not a new product API) that constructs a Resource whose annotations are already snapshotted. |
| Internal helpers | Annotation snapshot + validation helpers (e.g. anything named like `snapshotAnnotations` / `validateAnnotations`) are **internal module helpers**, not public exports, unless an existing package pattern already exports every validator (it does not for this slice). Public validation surface remains `validateResource`. |
| Validation | Part of `validateResource`; reuse `validateMetadataKey` / `validateJsonValue` / duplicate-key detection |
| Annotation errors | Stay under Resource validation (`invalid_annotations` + structured `cause`); MUST NOT use `invalid_metadata` |
| Error taxonomy | Only `invalid_key` / `invalid_value` / `duplicate_key` under `AnnotationValidationError`. No separate malformed-container error unless the chosen representation makes such a failure observable at the Resource validation boundary (it should not for `ReadonlyArray<MetadataEntry>` candidates). |
| Projection | After `validateResource`, `createResourceMetadata(identity, annotationEntries)`; equal key/value (deep JSON), no transform |
| Order | No canonical sort; rely on RFC-002 unordered metadata equality for semantic determinism |
| Vocabulary / cross-source merge | Out of scope |
| Equality helper | **Test/internal only** `annotationsEqual` (order-insensitive) if needed; MUST NOT be a public product API. Public Resource equality remains deferred. |
| Compose / registry | SHALL NOT require `composeResourceMetadata`; SHALL NOT register |

---

## M3.3 public contract surface

| Symbol | Kind | Role |
| --- | --- | --- |
| `Annotations` | type | Implementation representation: `ReadonlyArray<MetadataEntry>` (unordered semantically) |
| `emptyAnnotations` | const | Canonical empty annotations snapshot |
| `Resource` | type | `annotations: Annotations` (no `metadata` property) |
| `validateResource` | function | Validates identity, empty schema collections, and annotation container. `Resource.annotations` is an already-snapshotted `Annotations`; `validateResource` validates that authoritative snapshot and does not establish snapshot-by-value from caller-owned mutable aliases. |
| `createResource` | function | Constructs minimal Resource with the canonical `emptyAnnotations` snapshot; it does not construct a mutable intermediate annotation container |
| `projectResourceMetadata` | function | Projects identity + direct annotation entries |
| `ResourceValidationError` | type | Includes annotation failure detail (see below) |
| `ResourceProjectionError` | type | Unchanged codes; annotation failures surface as `invalid_resource` |

**Not public in M3.3:**

- `EmptyAnnotations` (removed)
- `validateAnnotations` / `snapshotAnnotations` / `annotationsEqual` (internal or test-only)
- Public Resource builders/mutators / `createResource(identity, annotations)`
- Named annotation vocabulary / reserved catalogs
- Cross-source collision / precedence / merge
- Schema field / relation / operation members
- Public Resource equality
- Reverse projection; registry helpers

**Retain:** M2 exports; M3.1 schema empties; M3.2 projection error codes; `PACKAGE_NAME` / `PACKAGE_VERSION`.

### Annotation validation error shape (planning aid)

```ts
type AnnotationValidationError =
  | {
      readonly code: 'invalid_key';
      readonly index: number;
      readonly cause: MetadataKeyValidationError;
    }
  | {
      readonly code: 'invalid_value';
      readonly index: number;
      readonly cause: JsonValueValidationError;
    }
  | {
      readonly code: 'duplicate_key';
      readonly index: number;
      readonly key: MetadataKey;
    };

type ResourceValidationError =
  | {
      readonly code: 'invalid_identity';
      readonly cause: IdentityValidationError;
    }
  | { readonly code: 'invalid_schema' }
  | {
      readonly code: 'invalid_annotations';
      readonly cause: AnnotationValidationError;
    };
```

M3.1 used `{ code: 'invalid_annotations' }` without `cause`. M3.3 **adds** required `cause` using the three codes above. Do not invent additional cause codes for test convenience.

### Construction vs validation (normative for this plan)

| Concern | Owner |
| --- | --- |
| Establish snapshot-by-value `Annotations` | Resource construction seams (`createResource` for empty; **internal** fixture/helper for non-empty tests) |
| Decide validity of a Resource’s annotations | `validateResource` |
| Project annotations | `projectResourceMetadata` after revalidation |

**Internal non-empty fixture seam (Option B):** M3.3 does not introduce a public Resource builder/mutator API. Tests requiring non-empty Resources MAY construct validated Resource fixtures through an internal test helper or the minimal internal implementation seam necessary to exercise the existing Resource contract—provided that seam is **not** exported from package barrels as a product API.

Example shape (planning aid only; names non-normative):

```ts
// internal / test-only — NOT exported from packages/core public API
function createResourceWithAnnotationsForTests(
  identity: ResourceIdentity,
  candidateEntries: readonly MetadataEntry[],
): Result<Resource, ResourceValidationError>
```

That helper MUST snapshot candidate entries (deep nested `JsonValue` graph) **before** the Resource is considered constructed, then run `validateResource` (or equivalent) for validity.

### Projection behavior (RFC-006)

```text
projectResourceMetadata(resource)
  1. validateResource(resource)     // includes annotation validity rules
  2. on failure → invalid_resource
  3. createResourceMetadata(identity, [...resource.annotations])
  4. on metadata failure → invalid_metadata (defensive; do not fabricate)
  5. success → ResourceMetadata with same identity and annotation mappings as entries
```

MUST NOT mutate Resource. MUST NOT interpret/normalize/rename keys or values. MUST NOT invent a canonical entry sort.

---

## Constraints (from Accepted RFC-006)

### SHALL

- represent annotations as unordered unique `MetadataKey → JsonValue` snapshot
- treat empty as zero mappings
- validate annotations as part of Resource validity
- inherit RFC-002 key grammar / equality / `rf` reservation unchanged
- project by direct 1:1 equal key/value (deep JSON equality)
- preserve snapshot-by-value semantics at the construction boundary
- keep annotation errors distinct from metadata validation errors

### SHALL NOT

- invent vocabulary keys or catalogs
- invent cross-source collision/precedence/merge
- require `composeResourceMetadata` or registry calls inside projection
- prescribe wire formats or host adapters
- silently drop/merge/normalize invalid or conflicting annotations
- introduce a canonical sort “for determinism” beyond RFC-002 equality
- make `validateResource` the place that silently converts mutable caller-owned annotation aliases into authoritative state
- export a new public Resource builder solely to support annotation tests
- export `validateAnnotations` / `annotationsEqual` as public product APIs in this slice

---

## Package / ownership boundaries

### `@resource-forge/core` owns

- `packages/core/src/resource/*` annotation types, internal snapshot helpers, validation integration, projection updates
- tests for RFC-006 container / validation / projection participation

### Consume only

- `packages/core/src/metadata/*` (`MetadataEntry`, `validateMetadataKey`, `validateJsonValue`, `createResourceMetadata`, `resourceMetadataEqual`, `metadataKeysEqual`)

### Must remain untouched (feature-free)

- `packages/nest`, `packages/graphql`, `packages/prisma`, `packages/cli`

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/core/src/resource/types.ts` | `Annotations`, widened `Resource`, annotation error types; remove public `EmptyAnnotations` |
| `packages/core/src/resource/empty-annotations.ts` | empty snapshot const |
| `packages/core/src/resource/annotations.ts` | **internal** snapshot construction + annotation rule checking helpers (not barrel-exported) |
| `packages/core/src/resource/annotations.test.ts` | container / snapshot-by-value / validation integration tests (via Resource seams) |
| `packages/core/src/resource/validate.ts` | incorporate annotation **validity** into Resource validation |
| `packages/core/src/resource/validate.test.ts` | empty + invalid annotation cases via `validateResource` |
| `packages/core/src/resource/create.ts` | empty-annotations construction with snapshot semantics |
| `packages/core/src/resource/*test-helpers*` or colocated test helper | internal non-empty Resource fixture seam (not public) |
| `packages/core/src/resource/project.ts` | pass annotation entries into `createResourceMetadata` |
| `packages/core/src/resource/project.test.ts` | non-empty direct projection + order-insensitive equality |
| `packages/core/src/resource/empty-annotations.test.ts` | empty snapshot shape (no `readonlyTag`) |
| `packages/core/src/resource/exports.test.ts` | public export smoke; assert `EmptyAnnotations` not exported |
| `packages/core/src/resource/index.ts` / `packages/core/src/index.ts` | public exports only |

Planning note: `annotations.ts` and test-helper file names are layout choices, not product module boundaries required by RFC-006.

---

## TDD / verification strategy

For each task: write failing tests → implement → green → commit.

**Must cover:**

1. Empty annotations valid; empty snapshots equal
2. Unique valid mappings accepted on a Resource constructed via the internal fixture seam; duplicates rejected (`invalid_annotations` / `duplicate_key`) via `validateResource`
3. Invalid `MetadataKey` / reserved `rf` misuse / invalid `JsonValue` rejected as annotation errors (not `invalid_metadata`)
4. Snapshot-by-value at construction: after building a Resource via `createResource` or the internal non-empty fixture seam, mutating the original caller-owned entry/value objects MUST NOT change `resource.annotations`
5. `validateResource` on an already-constructed valid Resource succeeds without requiring re-snapshot as a public behavior
6. Projection: empty → zero entries (M3.2 regression)
7. Projection: non-empty → equal keys/values; `resourceMetadataEqual` holds if entry order differs
8. Projection: invalid Resource (including bad annotations) → `invalid_resource`
9. Purity: projection does not mutate Resource
10. Public surface: `emptyAnnotations` is the zero-entry snapshot; `EmptyAnnotations` is not exported; `validateAnnotations` is not exported
11. No vocabulary assertions (`displayName`, etc.)

**Do not:** fabricate `invalid_metadata` for annotation failures; test annotation failures via `validateResource` / `invalid_resource` only.

---

### Task 1: Contract types + failing tests

**Files:**
- Modify: `packages/core/src/resource/types.ts`
- Modify: `packages/core/src/resource/empty-annotations.ts` / `.test.ts` (empty array snapshot expectations)
- Modify: `packages/core/src/resource/index.ts` — export `Annotations`; stop exporting `EmptyAnnotations`
- Create: `packages/core/src/resource/annotations.test.ts` (and/or extend `validate.test.ts`) with failing expectations

- [ ] **Step 1: Widen types** — `Annotations`, `AnnotationValidationError`, update `Resource` / `ResourceValidationError`; **remove** public `EmptyAnnotations`
- [ ] **Step 2: Write failing tests** for empty snapshot shape, invalid key/value/duplicate via `validateResource`, and public-export expectations (`EmptyAnnotations` absent)
- [ ] **Step 3: Run tests — expect FAIL**
- [ ] **Step 4: Commit** `test(core): add failing M3.3 annotation contract tests`

### Task 2: Snapshot construction + validation integration

**Files:**
- Create/implement: `packages/core/src/resource/annotations.ts` (**internal** helpers)
- Update: `empty-annotations.ts` → empty snapshotted array
- Update: `create.ts` — `createResource` uses the canonical `emptyAnnotations` snapshot; it does not construct a mutable intermediate annotation container
- Add: internal/test-only non-empty Resource fixture seam
- Wire: `validate.ts` to **validate** the Resource’s already-snapshotted annotations (no silent normalize-from-alias as the construction path)
- Update: existing tests that assumed `readonlyTag`

- [ ] **Step 1: Internal snapshot helper** — deep snapshot covering entry/key containers and nested `JsonValue` graph; empty + non-empty
- [ ] **Step 2: Internal non-empty fixture seam** — constructs Resource with snapshotted annotations; not barrel-exported
- [ ] **Step 3: `validateResource` integrates annotation validity** using the three `AnnotationValidationError` causes; reuse `validateMetadataKey` (`rf` → framework kind); validates authoritative snapshots only
- [ ] **Step 4: Green construction / snapshot-by-value / validate tests**
- [ ] **Step 5: Commit** `feat(core): Resource annotation snapshots and validation (RFC-006)`

### Task 3: Direct annotation projection

**Files:**
- Modify: `packages/core/src/resource/project.ts`
- Modify: `packages/core/src/resource/project.test.ts`

- [ ] **Step 1: Failing tests** for non-empty direct projection (via internal fixture) + order-insensitive `resourceMetadataEqual` + purity + empty regression
- [ ] **Step 2: Implement** `createResourceMetadata(identity, [...validated.annotations])` — no sort, no compose, no registry
- [ ] **Step 3: Green tests**
- [ ] **Step 4: Commit** `feat(core): project annotations into ResourceMetadata entries`

### Task 4: Exports, roadmap, parent-plan note

**Files:**
- Modify: `packages/core/src/resource/exports.test.ts` / `packages/core/src/index.ts` as needed
- Modify: `docs/roadmap.md` — mark M3.3 **implementation** complete only after M6 verification is green
- Optionally note in parent M3 plan that M3.3 code is complete (only after green)

- [ ] **Step 1: Export smoke** — `Annotations` / `emptyAnnotations` / projection with entries; confirm no `EmptyAnnotations` / no `validateAnnotations`
- [ ] **Step 2: Full `pnpm --filter @resource-forge/core test` green**
- [ ] **Step 3: Docs status updates only after verification**
- [ ] **Step 4: Commit** `docs: record M3.3 annotations slice complete`

---

## Traceability

| Task | RFC-006 sections |
| --- | --- |
| Task 1 | §§2–3 container terms; public surface migration |
| Task 2 | §§3–4 snapshot-by-value, validation ownership, `rf` inheritance, empty = zero |
| Task 3 | §5 projection participation (direct 1:1, order-independent via RFC-002) |
| Task 4 | Implementation gate / roadmap hygiene |

---

## Explicit deferrals

- Annotation vocabulary RFC(s)
- Cross-source projection composition / precedence
- Schema Fields / Relations / Operations
- Public Resource equality / builders / `createResource(identity, annotations?)`
- Public `validateAnnotations` export
- Host adapters

---

## M5 Plan Review checklist (for reviewers)

- [ ] No new product semantics beyond RFC-006
- [ ] `EmptyAnnotations` **removed** from public API; `emptyAnnotations` is zero-entry snapshot
- [ ] Snapshot construction separated from `validateResource`
- [ ] Non-empty Resources via internal/test seam only (no public builder)
- [ ] Annotation helpers internal; public validation remains `validateResource`
- [ ] Deep snapshot-by-value required across nested `JsonValue` without mandating a specific clone API
- [ ] Annotation errors distinct from `invalid_metadata`; only three annotation causes
- [ ] Projection order independence relies on RFC-002 (no invented sort)
- [ ] Vocabulary / cross-source merge deferred
- [ ] TDD tasks executable without inventing sequencing
- [ ] M6 must not start until this plan is **Accepted**

---

## Gate

**M5 Accepted.** M6 implementation may begin under this plan and tracking issue #10. Do not invent vocabulary, cross-source merge, or a public annotation builder.
