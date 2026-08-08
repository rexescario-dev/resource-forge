# M3.3 Annotations — Implementation Tasks

> **For agentic workers:** Status is **Draft** (awaiting M5 Plan Review). After **Accepted**, use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-006. Reuse M2 metadata key/value validators and M3.1/M3.2 Resource / projection surfaces. Do **not** implement annotation vocabulary, reserved annotation catalogs, schema members, or cross-source merge/precedence.

**Status:** Draft  
**Tracking:** [#10](https://github.com/rexescario-dev/resource-forge/issues/10)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted) — M3.3+ was blocked on RFC-006  
**Source RFC:** RFC-006 Annotations (**Accepted**) — fills RFC-005 deferred annotations slot  
**Depends on:** RFC-002 (**Accepted**); RFC-005 (**Accepted**); M3.1 / M3.2 shipped  
**Package:** `@resource-forge/core`  
**Slice:** M3.3 only — annotation container + Resource validation + direct projection participation

**Goal:** Replace the M3.1 `EmptyAnnotations` placeholder with the RFC-006 zero-or-more-entry annotation snapshot, validate it as part of `validateResource`, and project valid annotations by direct 1:1 into `ResourceMetadata` entries.

**Architecture:** Annotations are authoritative Resource state (not `ResourceMetadata`). Representation is an immutable snapshot of unordered unique `MetadataKey → JsonValue` mappings. Validation reuses RFC-002 key/value rules (including reserved `rf`). Projection revalidates the Resource, then passes annotation mappings as metadata entries to `createResourceMetadata` with exact deep-value preservation and no vocabulary interpretation. Order is non-semantic; RFC-002 metadata equality already ignores entry order.

**Tech Stack:** TypeScript strict, Vitest (existing `packages/core` scripts)

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Locked decisions (export / shape review — planning aids)

These freeze the M3.3 implementation surface. They MUST NOT invent product semantics beyond RFC-006.

| Decision | Lock |
| --- | --- |
| Annotation identity / value | Reuse RFC-002 `MetadataKey` + `JsonValue` (and `MetadataEntry` as `{ key, value }`) |
| Container representation | `Annotations` = frozen `ReadonlyArray<MetadataEntry>` (array order non-semantic) |
| Empty | Zero-length array; public `emptyAnnotations` becomes that empty snapshot (migrate off `readonlyTag` sentinel) |
| `EmptyAnnotations` type | Remove from public surface (or keep only as deprecated type alias to empty array if needed for a single transition commit—prefer remove in this slice) |
| `Resource.annotations` | Type widens from `EmptyAnnotations` → `Annotations` |
| Snapshot-by-value | On successful validation/construction, store deep-cloned + frozen entries/values so external aliases cannot mutate Resource state |
| Validation | Part of `validateResource`; reuse `validateMetadataKey` / `validateJsonValue` / duplicate-key detection |
| Annotation errors | Stay under Resource validation (`invalid_annotations` + structured `cause`); MUST NOT use `invalid_metadata` |
| Projection | After `validateResource`, `createResourceMetadata(identity, annotationEntries)`; equal key/value (deep JSON), no transform |
| Order | No canonical sort; rely on RFC-002 unordered metadata equality for semantic determinism |
| Vocabulary / cross-source merge | Out of scope |
| Equality helper | Optional internal/test helper `annotationsEqual` (order-insensitive); public Resource equality still deferred |
| Compose / registry | SHALL NOT require `composeResourceMetadata`; SHALL NOT register |

---

## M3.3 public contract surface

| Symbol | Kind | Role |
| --- | --- | --- |
| `Annotations` | type | Immutable snapshot: `ReadonlyArray<MetadataEntry>` (unordered semantically) |
| `emptyAnnotations` | const | Canonical empty annotations snapshot (`Object.freeze([])`) |
| `Resource` | type | `annotations: Annotations` (no `metadata` property) |
| `validateResource` | function | Validates identity, empty schema collections, and annotation container |
| `createResource` | function | Still constructs minimal Resource with empty annotations |
| `projectResourceMetadata` | function | Projects identity + direct annotation entries |
| `ResourceValidationError` | type | Extends annotation failure detail (see below) |
| `ResourceProjectionError` | type | Unchanged codes; annotation failures surface as `invalid_resource` |

**Not public in M3.3:**

- Named annotation vocabulary / reserved catalogs
- Cross-source collision / precedence / merge
- Schema field / relation / operation members
- Resource equality / builders / mutators as product APIs
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

Note: M3.1 used `{ code: 'invalid_annotations' }` without `cause`. M3.3 **adds** `cause` for non-empty validation failures. Empty/malformed container failures that cannot attach an entry index MAY use a minimal cause or a dedicated cause code only if tests require it—prefer always attaching `cause` when rejecting a candidate entry list.

### Projection behavior (RFC-006)

```text
projectResourceMetadata(resource)
  1. validateResource(resource)     // includes annotation rules
  2. on failure → invalid_resource
  3. createResourceMetadata(identity, validated.annotations as entry list)
  4. on metadata failure → invalid_metadata (defensive; do not fabricate)
  5. success → ResourceMetadata with same identity and annotation mappings as entries
```

MUST NOT mutate Resource. MUST NOT interpret/normalize/rename keys or values.

---

## Constraints (from Accepted RFC-006)

### SHALL

- represent annotations as unordered unique `MetadataKey → JsonValue` snapshot
- treat empty as zero mappings
- validate annotations as part of Resource validity
- inherit RFC-002 key grammar / equality / `rf` reservation unchanged
- project by direct 1:1 equal key/value (deep JSON equality)
- preserve snapshot-by-value semantics
- keep annotation errors distinct from metadata validation errors

### SHALL NOT

- invent vocabulary keys or catalogs
- invent cross-source collision/precedence/merge
- require `composeResourceMetadata` or registry calls inside projection
- prescribe wire formats or host adapters
- silently drop/merge/normalize invalid or conflicting annotations
- introduce a canonical sort “for determinism” beyond RFC-002 equality

---

## Package / ownership boundaries

### `@resource-forge/core` owns

- `packages/core/src/resource/*` annotation types, validation, projection updates
- tests for RFC-006 container / validation / projection participation

### Consume only

- `packages/core/src/metadata/*` (`MetadataEntry`, `validateMetadataKey`, `validateJsonValue`, `createResourceMetadata`, `resourceMetadataEqual`, `metadataKeysEqual`)

### Must remain untouched (feature-free)

- `packages/nest`, `packages/graphql`, `packages/prisma`, `packages/cli`

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/core/src/resource/types.ts` | `Annotations`, widened `Resource`, annotation error types |
| `packages/core/src/resource/empty-annotations.ts` | empty snapshot const |
| `packages/core/src/resource/annotations.ts` | validate/normalize annotations snapshot (deep clone + freeze) |
| `packages/core/src/resource/annotations.test.ts` | container / equality / snapshot-by-value tests |
| `packages/core/src/resource/validate.ts` | call annotation validation |
| `packages/core/src/resource/validate.test.ts` | update for non-empty + failure cases |
| `packages/core/src/resource/create.ts` | continue empty-annotations construction |
| `packages/core/src/resource/project.ts` | pass annotation entries into `createResourceMetadata` |
| `packages/core/src/resource/project.test.ts` | non-empty direct projection + order-insensitive equality |
| `packages/core/src/resource/empty-annotations.test.ts` | empty snapshot shape |
| `packages/core/src/resource/exports.test.ts` | public export smoke |
| `packages/core/src/resource/index.ts` / `packages/core/src/index.ts` | exports |

Planning note: `annotations.ts` is a file-layout choice, not a product module boundary required by RFC-006.

---

## TDD / verification strategy

For each task: write failing tests → implement → green → commit.

**Must cover:**

1. Empty annotations valid; equal to each other
2. Unique valid mappings accepted; duplicates rejected (`invalid_annotations` / `duplicate_key`)
3. Invalid `MetadataKey` / reserved `rf` misuse / invalid `JsonValue` rejected as annotation errors (not `invalid_metadata`)
4. Snapshot-by-value: mutating a caller-owned object after `validateResource` success does not change Resource annotations
5. Projection: empty → zero entries (M3.2 regression)
6. Projection: non-empty → equal keys/values; `resourceMetadataEqual` holds if entry order differs
7. Projection: invalid Resource (including bad annotations) → `invalid_resource`
8. Purity: projection does not mutate Resource
9. No vocabulary assertions (`displayName`, etc.)

**Do not:** fabricate `invalid_metadata` for annotation failures; test annotation failures via `validateResource` / `invalid_resource` only.

---

### Task 1: Types + annotation validation helper (failing tests)

**Files:**
- Modify: `packages/core/src/resource/types.ts`
- Create: `packages/core/src/resource/annotations.ts` (stub exports OK until Task 2)
- Create: `packages/core/src/resource/annotations.test.ts`
- Modify: `packages/core/src/resource/empty-annotations.ts` / `.test.ts` as needed for empty array shape
- Modify: `packages/core/src/resource/index.ts` — export new types

- [ ] **Step 1: Widen types** — `Annotations`, `AnnotationValidationError`, update `Resource` / `ResourceValidationError`; remove public `EmptyAnnotations` sentinel type
- [ ] **Step 2: Write failing tests** for empty, duplicate key, invalid key, invalid value, snapshot-by-value (via `validateAnnotations` or through `validateResource` once wired)
- [ ] **Step 3: Run tests — expect FAIL**
- [ ] **Step 4: Commit** `test(core): add failing M3.3 annotation container tests`

### Task 2: Implement annotation snapshot validation

**Files:**
- Implement: `packages/core/src/resource/annotations.ts`
- Update: `empty-annotations.ts` → `Object.freeze([])` (or equivalent empty snapshot)
- Wire: `validate.ts` to validate/normalize annotations into snapshot-by-value `Annotations`
- Update: existing validate/create/empty tests that assumed `readonlyTag`

- [ ] **Step 1: Implement validate + deep clone/freeze**
- [ ] **Step 2: Reuse `validateMetadataKey` with same kind rules as metadata (`rf` → framework)**
- [ ] **Step 3: Green annotation + validate tests**
- [ ] **Step 4: Commit** `feat(core): validate Resource annotations per RFC-006`

### Task 3: Direct annotation projection

**Files:**
- Modify: `packages/core/src/resource/project.ts`
- Modify: `packages/core/src/resource/project.test.ts`

- [ ] **Step 1: Failing tests** for non-empty direct projection + order-insensitive `resourceMetadataEqual` + purity
- [ ] **Step 2: Implement** `createResourceMetadata(identity, [...validated.annotations])` (entry list copy OK; values already snapshotted)
- [ ] **Step 3: Green tests including M3.2 empty floor regression**
- [ ] **Step 4: Commit** `feat(core): project annotations into ResourceMetadata entries`

### Task 4: Exports, roadmap, parent-plan note

**Files:**
- Modify: `packages/core/src/resource/exports.test.ts` / `packages/core/src/index.ts` as needed
- Modify: `docs/roadmap.md` — mark M3.3 **implementation** complete only after M6 verification is green
- Optionally note in parent M3 plan that M3.3 code is complete (only after green)

- [ ] **Step 1: Export smoke for Annotations / emptyAnnotations / projection with entries**
- [ ] **Step 2: Full `pnpm --filter @resource-forge/core test` green**
- [ ] **Step 3: Docs status updates only after verification**
- [ ] **Step 4: Commit** `docs: record M3.3 annotations slice complete`

---

## Traceability

| Task | RFC-006 sections |
| --- | --- |
| Task 1–2 | §§2–4 container, identity/value reuse, validation, snapshot-by-value, `rf` inheritance |
| Task 3 | §5 projection participation (direct 1:1, order-independent via RFC-002) |
| Task 4 | Implementation gate / roadmap hygiene |

---

## Explicit deferrals

- Annotation vocabulary RFC(s)
- Cross-source projection composition / precedence
- Schema Fields / Relations / Operations
- Public Resource equality / builders
- Host adapters

---

## M5 Plan Review checklist (for reviewers)

- [ ] No new product semantics beyond RFC-006
- [ ] `EmptyAnnotations` migration is explicit
- [ ] Annotation errors distinct from `invalid_metadata`
- [ ] Snapshot-by-value required without prescribing “deep clone” as the only mechanism
- [ ] Projection order independence relies on RFC-002 (no invented sort)
- [ ] Vocabulary / cross-source merge deferred
- [ ] TDD tasks executable without inventing sequencing
- [ ] M6 must not start until this plan is **Accepted**

---

## Gate

**Status remains Draft** until M5 Plan Review Accepts. Implementation (M6) is blocked until then.
