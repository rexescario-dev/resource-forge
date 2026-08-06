# M2.2 Metadata Model — Implementation Tasks

> **For agentic workers:** Status is Accepted. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-002. Reuse M2.1 `Result` helpers — do not invent a parallel outcome model.

**Status:** Accepted  
**Parent plan:** `docs/superpowers/plans/2026-08-06-m2-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-002 Metadata Model (Accepted); depends on RFC-001 / M2.1  
**Package:** `@resource-forge/core`  
**Slice:** M2.2 only — no registry or composition

**Goal:** Implement owned metadata key/value/snapshot construction, validation, and equality in `@resource-forge/core`, proving RFC-002 invariants with Vitest.

**Architecture:** `ResourceMetadata` is an immutable snapshot `{ identity, entries }` built only through core factories. Entries are supplied as an ordered list of pairs; uniqueness and equality are semantic over `MetadataKey`. `MetadataKeyKind` is a **validation context** (like `ResourceIdentityKind`), not a stored field on `MetadataKey` — RFC-002’s key remains `(namespace, name)`. No `withEntry` / `withoutEntry` in v0. No key string encodings.

**Tech Stack:** TypeScript strict, Vitest (existing `packages/core` scripts)

---

## Locked decisions (export review)

| Decision | Lock |
| --- | --- |
| Public shape | create + validate + equal (mirror M2.1) |
| Entries input | ordered `ReadonlyArray<MetadataEntry>` |
| Equality | order-independent; deep JSON value equality |
| `rf` reservation | enforced at key create/validate via `MetadataKeyKind` |
| Mutation helpers | deferred |
| Outcome model | reuse `Result` / `ok` / `err` |

---

## M2.2 public contract surface

| Symbol | Kind | Role |
| --- | --- | --- |
| `MetadataKey` | type | Readonly `{ namespace, name}` |
| `MetadataKeyKind` | type | `'framework' \| 'extension'` — validation context only |
| `createMetadataKey` | function | Construct validated key; default kind `'extension'` |
| `validateMetadataKey` | function | Validate candidate key under a kind → `Result<MetadataKey, …>` |
| `metadataKeysEqual` | function | Exact equality on both components |
| `JsonValue` | type | JSON-compatible value union |
| `isJsonValue` / `validateJsonValue` | function | Structural JSON-value check → `Result<JsonValue, …>` |
| `MetadataEntry` | type | `{ readonly key: MetadataKey; readonly value: JsonValue }` |
| `ResourceMetadata` | type | `{ readonly identity: ResourceIdentity; readonly entries: ReadonlyArray<MetadataEntry> }` |
| `createResourceMetadata` | function | Construct validated snapshot |
| `validateResourceMetadata` | function | Validate candidate snapshot → `Result<ResourceMetadata, …>` |
| `resourceMetadataEqual` | function | RFC-002 equality |
| `MetadataKeyValidationError` | type | Key failure reasons |
| `JsonValueValidationError` | type | Value failure reasons |
| `MetadataValidationError` | type | Snapshot failure reasons (includes nested key/value/identity errors) |

**Not public in M2.2:**

- entry mutation helpers (`withEntry`, `withoutEntry`, …)
- `MetadataKey` string parse/format / encodings
- registry, extension/composition modules
- concrete `rf` key catalog

### Result return types

```text
createMetadataKey / validateMetadataKey
  → Result<MetadataKey, MetadataKeyValidationError>

validateJsonValue
  → Result<JsonValue, JsonValueValidationError>

createResourceMetadata / validateResourceMetadata
  → Result<ResourceMetadata, MetadataValidationError>
```

Validation returns validated **values**, not booleans.

### MetadataKey behavior

```ts
createMetadataKey(namespace: string, name: string, options?: { kind?: MetadataKeyKind })
```

- default `kind: 'extension'`
- grammar (derived from RFC-002; RFC-002 remains authoritative):
  - `Namespace ::= ^[a-z][a-z0-9-]*$`
  - `Name ::= ^[a-z][a-zA-Z0-9]*$` (camelCase)
- `kind: 'extension'` + `namespace === 'rf'` → `reserved_namespace`
- `kind: 'framework'` → `rf` allowed if grammar-valid
- never normalize/repair strings
- **kind is not stored** on the returned `MetadataKey`

### JsonValue behavior

Accept: `null`, `boolean`, `number`, `string`, arrays of JsonValue, plain objects whose own enumerable values are JsonValue.

Reject (at least): `undefined`, functions, symbols, `bigint`, class instances that are not plain objects (use a conservative plain-object check). Do not attempt to accept GraphQL AST / ORM models.

### ResourceMetadata behavior

```ts
createResourceMetadata(
  identity: ResourceIdentity,
  entries: ReadonlyArray<MetadataEntry>,
): Result<ResourceMetadata, MetadataValidationError>
```

Construction / validation steps:

1. Re-validate `identity` using M2.1 rules with kind inferred as `identity.namespace === 'rf' ? 'framework' : 'user'` (same trust model as forged identity objects elsewhere).
2. For each entry, re-validate `key` with kind inferred as `key.namespace === 'rf' ? 'framework' : 'extension'`.
3. Validate each `value` as `JsonValue`.
4. Reject duplicate keys via `metadataKeysEqual` (`duplicate_key`).
5. On success, return a readonly snapshot (`identity` + `entries` as a readonly array). Input order may be preserved; equality ignores order. Whether runtime `Object.freeze` is used is an implementation detail — the public API must not expose a mutation surface.

`validateResourceMetadata` accepts a candidate `{ identity, entries }` and returns the same `Result` shape.

**Trust model for `rf` during snapshot validate/create:** `validateResourceMetadata` / `createResourceMetadata` validate **structural** invariants only. Because `MetadataKey` does not store ownership kind, ownership cannot be proven after construction. Revalidation uses the same namespace-derived trust model as forged values:

```text
createMetadataKey("rf", "description")
  → requires { kind: "framework" }

createResourceMetadata(identity, [
  { key: { namespace: "rf", name: "description" }, value: "x" }
])
  → accepted if key grammar is valid
```

The normal constructors prevent accidental misuse; they do not provide runtime provenance tracking.

### Equality

```ts
resourceMetadataEqual(a, b): boolean
```

true iff:

1. `resourceIdentitiesEqual(a.identity, b.identity)`; and
2. the same set of keys (via `metadataKeysEqual`) map to deeply equal `JsonValue`s.

Entry order irrelevant. Missing key ≠ key with `null` value. For object `JsonValue`s, **property key ordering is ignored** (do not use `JSON.stringify` equality).

---

## Suggested error codes

```ts
type MetadataKeyValidationError =
  | { readonly code: 'invalid_namespace'; readonly namespace: string }
  | { readonly code: 'invalid_name'; readonly name: string }
  | { readonly code: 'reserved_namespace'; readonly namespace: string };

type JsonValueValidationError = {
  readonly code: 'invalid_json_value';
  readonly path: string; // e.g. "" or "[0].x"
};

type MetadataValidationError =
  | { readonly code: 'invalid_identity'; readonly cause: IdentityValidationError }
  | { readonly code: 'invalid_key'; readonly index: number; readonly cause: MetadataKeyValidationError }
  | { readonly code: 'invalid_value'; readonly index: number; readonly cause: JsonValueValidationError }
  | { readonly code: 'duplicate_key'; readonly index: number; readonly key: MetadataKey };
```

Exact code names may be tightened during review; semantic distinctions must remain.

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/core/src/metadata/types.ts` | `MetadataKey`, kinds, entries, snapshot, error types |
| `packages/core/src/metadata/json-value.ts` | `JsonValue`, `validateJsonValue` |
| `packages/core/src/metadata/key.ts` | create/validate/equal for keys |
| `packages/core/src/metadata/equal.ts` | `resourceMetadataEqual` (+ deep JSON equal helper if private) |
| `packages/core/src/metadata/validate.ts` | `validateResourceMetadata` |
| `packages/core/src/metadata/create.ts` | `createResourceMetadata` |
| `packages/core/src/metadata/index.ts` | barrel |
| `packages/core/src/metadata/*.test.ts` | RFC-002 invariant tests |
| `packages/core/src/index.ts` | re-export metadata surface |

Reuse `packages/core/src/result.ts` and identity APIs from M2.1.

---

### Task 1: JsonValue validation

**Files:**
- Create: `packages/core/src/metadata/types.ts` (at least `JsonValue` + `JsonValueValidationError`)
- Create: `packages/core/src/metadata/json-value.ts`
- Create: `packages/core/src/metadata/json-value.test.ts`

- [ ] **Step 1: Write failing tests** — accept null/bool/number/string/array/plain object; reject `undefined`, function, bigint; nested object/array paths reported

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `validateJsonValue`**

- [ ] **Step 4: Tests PASS; commit**

```bash
git commit -m "feat(core): validate JsonValue for metadata entries"
```

---

### Task 2: MetadataKey create / validate / equal

**Files:**
- Extend: `packages/core/src/metadata/types.ts`
- Create: `packages/core/src/metadata/key.ts`
- Create: `packages/core/src/metadata/key.test.ts`
- Create: `packages/core/src/metadata/index.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Failing tests**

  - valid extension keys: `graphql`/`typeName`, `openapi`/`operationId`
  - invalid name casing / separators
  - extension rejects `rf`/`description`
  - framework accepts `rf`/`description`
  - equality case-sensitive; no normalization
  - default kind is extension

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement create/validate/equal** (rules derived from RFC-002; RFC-002 remains authoritative)

- [ ] **Step 4: Export; tests PASS; commit**

```bash
git commit -m "feat(core): add MetadataKey create/validate/equal"
```

---

### Task 3: ResourceMetadata validate + create

**Files:**
- Extend types with `MetadataEntry`, `ResourceMetadata`, `MetadataValidationError`
- Create: `packages/core/src/metadata/validate.ts`
- Create: `packages/core/src/metadata/create.ts`
- Create: `packages/core/src/metadata/validate.test.ts`
- Create: `packages/core/src/metadata/create.test.ts`
- Modify barrels / package index

- [ ] **Step 1: Failing tests**

  - empty entries success
  - mixed `rf` + extension entries success when keys valid
  - duplicate key failure
  - invalid identity failure
  - invalid key / invalid value failures with index
  - forged `{namespace:'rf',...}` key accepted when structurally grammar-valid (trust model: no provenance tracking)
  - identity remains the explicit input identity (not derived from entries)

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement validate + create wrapper**

- [ ] **Step 4: Tests PASS; commit**

```bash
git commit -m "feat(core): create and validate ResourceMetadata snapshots"
```

---

### Task 4: resourceMetadataEqual

**Files:**
- Create: `packages/core/src/metadata/equal.ts`
- Create: `packages/core/src/metadata/equal.test.ts`

- [ ] **Step 1: Failing tests**

  - equal when same identity + same entries different order
  - unequal when identity differs
  - unequal when value differs
  - missing key ≠ null value

- [ ] **Step 2–4: Implement; PASS; commit**

```bash
git commit -m "feat(core): add resourceMetadataEqual"
```

---

### Task 5: Package export smoke + README

**Files:**
- Modify: `packages/core/src/index.test.ts`
- Modify: `packages/core/README.md`

- [ ] **Step 1: Smoke-test** create identity → create metadata key → create metadata → equal

- [ ] **Step 2: README** — document M2.2 exports; note no mutation helpers / no key encodings

- [ ] **Step 3: Full core gate**

```bash
pnpm --filter @resource-forge/core lint
pnpm --filter @resource-forge/core typecheck
pnpm --filter @resource-forge/core test
pnpm --filter @resource-forge/core build
```

- [ ] **Step 4: Commit**

```bash
git commit -m "docs(core): document M2.2 metadata exports"
```

---

## Acceptance criteria (this task plan)

- [x] Public symbols in the table are agreed.
- [x] `MetadataKeyKind` is validation context only (not stored on `MetadataKey`).
- [x] Entries are ordered pairs; equality is order-independent (object key order ignored).
- [x] Snapshot validate uses structural/`rf` trust model (no provenance).
- [x] create/validate return `Result<…>` with validated values.
- [x] No mutation helpers, key encodings, registry, or composition in this slice.

## M2.2 implementation complete when

- All tasks checked off with green tests
- Unknown/extension namespaces preserved (no stripping)
- Duplicate keys rejected
- `@resource-forge/nest|graphql|prisma|cli` unchanged

---

## Checkpoint

```text
M2.1 Identity                 ✅
M2.2 export decisions         ✅
M2.2 task breakdown           ✅ Accepted
M2.2 code                     🔓 Task 1 next
```
