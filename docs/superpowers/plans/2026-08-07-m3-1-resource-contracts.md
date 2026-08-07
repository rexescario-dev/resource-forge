# M3.1 Resource Contracts — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-005. Reuse M2.1 `Result` and identity helpers — do not invent a parallel outcome model. Do **not** implement `projectResourceMetadata` in this slice.

**Status:** Accepted  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-005 Resource Model (Accepted); depends on RFC-001 / M2.1  
**Package:** `@resource-forge/core`  
**Slice:** M3.1 only — Resource / ResourceSchema / construction / validation; no projection

**Goal:** Implement the RFC-005 Resource aggregate with empty schema collections and empty annotations, plus construction and validation, proving structural invariants with Vitest.

**Architecture:** A Resource is authoritative state `{ identity, schema, annotations }` with no `metadata` property. Schema conceptually contains empty `fields` / `relations` / `operations` collections. Annotations are an opaque empty placeholder so RFC-006 can widen the type later. Construction and validation return `Result` values.

**Tech Stack:** TypeScript strict, Vitest (existing `packages/core` scripts)

---

## Locked decisions (export review)

| Decision | Lock |
| --- | --- |
| Public surface | tiny: types + empty schema factory + `createResource` + `validateResource` |
| Schema collections | empty tuple `readonly []` only in this slice (no member types) |
| Annotations | `EmptyAnnotations` unit value; non-empty forms deferred to RFC-006 |
| Outcome model | reuse `Result` / `ok` / `err` |
| Projection | **not** in M3.1 |
| Equality / builders / mutators | deferred |
| `metadata` on Resource | absent from the type and public API |

---

## M3.1 public contract surface

| Symbol | Kind | Role |
| --- | --- | --- |
| `ResourceSchema` | type | `{ readonly fields; readonly relations; readonly operations }` — empty collections only |
| `EmptyAnnotations` | type | Opaque empty annotations placeholder |
| `emptyAnnotations` | const | Canonical empty annotations value |
| `Resource` | type | `{ readonly identity; readonly schema; readonly annotations }` — no `metadata` |
| `createEmptyResourceSchema` | function | Construct empty schema |
| `createResource` | function | Construct minimal Resource from a validated-capable identity |
| `validateResource` | function | Validate a candidate Resource → `Result<Resource, …>` |
| `ResourceValidationError` | type | Discriminated failure reasons |

**Not public in M3.1:**

- `projectResourceMetadata` (M3.2)
- field / relation / operation member types
- non-empty annotation types or vocabulary
- Resource equality
- builders / mutators / schema editors
- registry or composition helpers

**Retain:** existing M2 exports and `PACKAGE_NAME` / `PACKAGE_VERSION`.

### Result return types

```text
createEmptyResourceSchema()
  → ResourceSchema

createResource(identity)
  → Result<Resource, ResourceValidationError>

validateResource(candidate)
  → Result<Resource, ResourceValidationError>
```

Validation returns a validated **Resource value**, not a boolean.

### Locked shapes

```ts
type EmptySchemaCollection = readonly [];

type ResourceSchema = {
  readonly fields: EmptySchemaCollection;
  readonly relations: EmptySchemaCollection;
  readonly operations: EmptySchemaCollection;
};

type EmptyAnnotations = {
  readonly readonlyTag: 'EmptyAnnotations';
};

declare const emptyAnnotations: EmptyAnnotations;
// runtime: Object.freeze({ readonlyTag: 'EmptyAnnotations' })

type Resource = {
  readonly identity: ResourceIdentity;
  readonly schema: ResourceSchema;
  readonly annotations: EmptyAnnotations;
};

type ResourceValidationError =
  | {
      readonly code: 'invalid_identity';
      readonly cause: IdentityValidationError;
    }
  | { readonly code: 'invalid_schema' }
  | { readonly code: 'invalid_annotations' };
```

### Construction behavior

```ts
createEmptyResourceSchema(): ResourceSchema
```

- returns `{ fields: [], relations: [], operations: [] }` (readonly / frozen as implementation detail)
- must not accept member arguments in M3.1

```ts
createResource(identity: ResourceIdentity): Result<Resource, ResourceValidationError>
```

1. Re-validate `identity` with M2.1 rules (`kind` inferred as `identity.namespace === 'rf' ? 'framework' : 'user'`).
2. On identity failure → `{ code: 'invalid_identity', cause }`.
3. On success → Resource with that identity, `createEmptyResourceSchema()`, and `emptyAnnotations`.

```ts
validateResource(candidate: {
  identity: ResourceIdentity;
  schema: ResourceSchema;
  annotations: EmptyAnnotations;
}): Result<Resource, ResourceValidationError>
```

1. Re-validate identity (same trust model as `createResource`).
2. Reject schema unless all three collections exist and are empty arrays (`invalid_schema`).
3. Reject annotations unless they are the empty annotations unit (`invalid_annotations`).
4. On success, return a readonly Resource snapshot.

**Empty annotations check (runtime):** `annotations.readonlyTag === 'EmptyAnnotations'` and no other own enumerable keys required beyond that tag (canonical `emptyAnnotations` always passes).

**Schema emptiness check (runtime):** each of `fields`, `relations`, `operations` is an array with `length === 0`.

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/core/src/resource/types.ts` | `Resource`, `ResourceSchema`, `EmptyAnnotations`, `ResourceValidationError` |
| `packages/core/src/resource/empty-annotations.ts` | `emptyAnnotations` constant |
| `packages/core/src/resource/schema.ts` | `createEmptyResourceSchema` |
| `packages/core/src/resource/validate.ts` | `validateResource` |
| `packages/core/src/resource/create.ts` | `createResource` |
| `packages/core/src/resource/index.ts` | resource barrel |
| `packages/core/src/resource/*.test.ts` | RFC-005 structural tests |
| `packages/core/src/index.ts` | re-export M3.1 public surface |

---

### Task 1: Types and empty annotations

**Files:**
- Create: `packages/core/src/resource/types.ts`
- Create: `packages/core/src/resource/empty-annotations.ts`
- Create: `packages/core/src/resource/empty-annotations.test.ts`
- Create: `packages/core/src/resource/index.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { emptyAnnotations } from './empty-annotations.js';

describe('emptyAnnotations', () => {
  it('is the empty annotations unit', () => {
    expect(emptyAnnotations).toEqual({ readonlyTag: 'EmptyAnnotations' });
  });

  it('is frozen', () => {
    expect(Object.isFrozen(emptyAnnotations)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @resource-forge/core test -- src/resource/empty-annotations.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Minimal implementation**

```ts
// types.ts
import type { ResourceIdentity } from '../identity/types.js';
import type { IdentityValidationError } from '../identity/types.js';

export type EmptySchemaCollection = readonly [];

export type ResourceSchema = {
  readonly fields: EmptySchemaCollection;
  readonly relations: EmptySchemaCollection;
  readonly operations: EmptySchemaCollection;
};

export type EmptyAnnotations = {
  readonly readonlyTag: 'EmptyAnnotations';
};

export type Resource = {
  readonly identity: ResourceIdentity;
  readonly schema: ResourceSchema;
  readonly annotations: EmptyAnnotations;
};

export type ResourceValidationError =
  | {
      readonly code: 'invalid_identity';
      readonly cause: IdentityValidationError;
    }
  | { readonly code: 'invalid_schema' }
  | { readonly code: 'invalid_annotations' };
```

```ts
// empty-annotations.ts
import type { EmptyAnnotations } from './types.js';

export const emptyAnnotations: EmptyAnnotations = Object.freeze({
  readonlyTag: 'EmptyAnnotations',
});
```

```ts
// index.ts
export type {
  EmptyAnnotations,
  EmptySchemaCollection,
  Resource,
  ResourceSchema,
  ResourceValidationError,
} from './types.js';
export { emptyAnnotations } from './empty-annotations.js';
```

Export the same symbols from `packages/core/src/index.ts`.

- [ ] **Step 4: Run tests and make sure they pass**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/resource packages/core/src/index.ts
git commit -m "feat(core): add Resource types and empty annotations"
```

---

### Task 2: Empty ResourceSchema

**Files:**
- Create: `packages/core/src/resource/schema.ts`
- Create: `packages/core/src/resource/schema.test.ts`
- Modify: `packages/core/src/resource/index.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createEmptyResourceSchema } from './schema.js';

describe('createEmptyResourceSchema', () => {
  it('returns empty fields, relations, and operations', () => {
    const schema = createEmptyResourceSchema();
    expect(schema.fields).toEqual([]);
    expect(schema.relations).toEqual([]);
    expect(schema.operations).toEqual([]);
    expect(schema.fields).toHaveLength(0);
    expect(schema.relations).toHaveLength(0);
    expect(schema.operations).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @resource-forge/core test -- src/resource/schema.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Minimal implementation**

```ts
import type { ResourceSchema } from './types.js';

export function createEmptyResourceSchema(): ResourceSchema {
  return Object.freeze({
    fields: Object.freeze([]) as ResourceSchema['fields'],
    relations: Object.freeze([]) as ResourceSchema['relations'],
    operations: Object.freeze([]) as ResourceSchema['operations'],
  });
}
```

Export `createEmptyResourceSchema` from resource barrel and package `index.ts`.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/resource/schema.ts packages/core/src/resource/schema.test.ts packages/core/src/resource/index.ts packages/core/src/index.ts
git commit -m "feat(core): add createEmptyResourceSchema"
```

---

### Task 3: validateResource

**Files:**
- Create: `packages/core/src/resource/validate.ts`
- Create: `packages/core/src/resource/validate.test.ts`
- Modify: `packages/core/src/resource/index.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing validation tests**

Cover at least:

- valid minimal Resource (user identity + empty schema + `emptyAnnotations`) succeeds
- invalid identity fails with `invalid_identity` and nested `cause`
- schema with non-empty `fields` fails with `invalid_schema`
- missing schema collection property fails with `invalid_schema`
- annotations that are not the empty unit fail with `invalid_annotations`
- successful validation returns readonly Resource with same identity

```ts
import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { emptyAnnotations } from './empty-annotations.js';
import { createEmptyResourceSchema } from './schema.js';
import { validateResource } from './validate.js';

describe('validateResource', () => {
  it('accepts a minimal resource', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: createEmptyResourceSchema(),
      annotations: emptyAnnotations,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.identity).toEqual({ namespace: 'crm', name: 'Customer' });
    expect(result.value.schema.fields).toEqual([]);
    expect(result.value.annotations).toEqual(emptyAnnotations);
    expect('metadata' in result.value).toBe(false);
  });

  it('rejects invalid identity', () => {
    const result = validateResource({
      identity: { namespace: 'CRM', name: 'Customer' },
      schema: createEmptyResourceSchema(),
      annotations: emptyAnnotations,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_identity');
    }
  });

  it('rejects non-empty fields', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    if (!identity.ok) return;
    const result = validateResource({
      identity: identity.value,
      schema: {
        fields: [{ name: 'x' }] as unknown as [],
        relations: [],
        operations: [],
      },
      annotations: emptyAnnotations,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_schema');
    }
  });

  it('rejects non-empty annotations placeholder', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    if (!identity.ok) return;
    const result = validateResource({
      identity: identity.value,
      schema: createEmptyResourceSchema(),
      annotations: { readonlyTag: 'EmptyAnnotations', extra: true } as never,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_annotations');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @resource-forge/core test -- src/resource/validate.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Minimal implementation**

```ts
import {
  validateResourceIdentity,
  type ResourceIdentity,
} from '../identity/index.js';
import { err, ok, type Result } from '../result.js';
import { emptyAnnotations } from './empty-annotations.js';
import type {
  EmptyAnnotations,
  Resource,
  ResourceSchema,
  ResourceValidationError,
} from './types.js';

function isEmptySchemaCollection(value: unknown): value is readonly [] {
  return Array.isArray(value) && value.length === 0;
}

function isValidEmptySchema(schema: ResourceSchema): boolean {
  return (
    isEmptySchemaCollection(schema.fields) &&
    isEmptySchemaCollection(schema.relations) &&
    isEmptySchemaCollection(schema.operations)
  );
}

function isEmptyAnnotations(value: EmptyAnnotations): boolean {
  if (value.readonlyTag !== 'EmptyAnnotations') {
    return false;
  }
  return Object.keys(value).length === 1;
}

export function validateResource(candidate: {
  identity: ResourceIdentity;
  schema: ResourceSchema;
  annotations: EmptyAnnotations;
}): Result<Resource, ResourceValidationError> {
  const kind =
    candidate.identity.namespace === 'rf' ? 'framework' : 'user';
  const identityResult = validateResourceIdentity(candidate.identity, { kind });
  if (!identityResult.ok) {
    return err({ code: 'invalid_identity', cause: identityResult.error });
  }

  if (!candidate.schema || !isValidEmptySchema(candidate.schema)) {
    return err({ code: 'invalid_schema' });
  }

  if (!isEmptyAnnotations(candidate.annotations)) {
    return err({ code: 'invalid_annotations' });
  }

  return ok({
    identity: identityResult.value,
    schema: {
      fields: candidate.schema.fields,
      relations: candidate.schema.relations,
      operations: candidate.schema.operations,
    },
    annotations: emptyAnnotations,
  });
}
```

Export `validateResource` from barrels.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/resource/validate.ts packages/core/src/resource/validate.test.ts packages/core/src/resource/index.ts packages/core/src/index.ts
git commit -m "feat(core): validate Resource contracts"
```

---

### Task 4: createResource

**Files:**
- Create: `packages/core/src/resource/create.ts`
- Create: `packages/core/src/resource/create.test.ts`
- Modify: `packages/core/src/resource/index.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing construction tests**

Cover at least:

- valid identity → minimal Resource with empty schema + `emptyAnnotations`
- invalid identity → `invalid_identity`
- constructed Resource has no `metadata` property
- constructed schema collections are empty

```ts
import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import { createResource } from './create.js';
import { emptyAnnotations } from './empty-annotations.js';

describe('createResource', () => {
  it('creates a minimal resource', () => {
    const identity = createResourceIdentity('billing', 'Invoice');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = createResource(identity.value);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.identity).toEqual({
      namespace: 'billing',
      name: 'Invoice',
    });
    expect(result.value.schema.fields).toEqual([]);
    expect(result.value.schema.relations).toEqual([]);
    expect(result.value.schema.operations).toEqual([]);
    expect(result.value.annotations).toBe(emptyAnnotations);
    expect('metadata' in result.value).toBe(false);
  });

  it('rejects invalid identity', () => {
    const result = createResource({ namespace: 'Billing', name: 'Invoice' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_identity');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @resource-forge/core test -- src/resource/create.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Minimal implementation**

```ts
import type { ResourceIdentity } from '../identity/types.js';
import type { Result } from '../result.js';
import { createEmptyResourceSchema } from './schema.js';
import { emptyAnnotations } from './empty-annotations.js';
import type { Resource, ResourceValidationError } from './types.js';
import { validateResource } from './validate.js';

export function createResource(
  identity: ResourceIdentity,
): Result<Resource, ResourceValidationError> {
  return validateResource({
    identity,
    schema: createEmptyResourceSchema(),
    annotations: emptyAnnotations,
  });
}
```

Export `createResource` from barrels.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/resource/create.ts packages/core/src/resource/create.test.ts packages/core/src/resource/index.ts packages/core/src/index.ts
git commit -m "feat(core): add createResource for minimal resources"
```

---

### Task 5: Package export smoke + parent §7 checklist

**Files:**
- Modify: `packages/core/src/index.test.ts` (or create `packages/core/src/resource/exports.test.ts`)

- [x] **Step 1: Write failing smoke test for public exports**

```ts
import { describe, expect, it } from 'vitest';
import {
  createEmptyResourceSchema,
  createResource,
  createResourceIdentity,
  emptyAnnotations,
  validateResource,
} from '../index.js';

describe('M3.1 public exports', () => {
  it('exposes resource construction and validation', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const created = createResource(identity.value);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const validated = validateResource(created.value);
    expect(validated.ok).toBe(true);
    expect(createEmptyResourceSchema().fields).toEqual([]);
    expect(emptyAnnotations.readonlyTag).toBe('EmptyAnnotations');
  });
});
```

- [x] **Step 2: Run full core suite**

Run: `pnpm --filter @resource-forge/core test`  
Expected: PASS (including prior M2 tests)

- [x] **Step 3: Confirm non-goals**

- `projectResourceMetadata` is **not** exported
- no Nest/GraphQL/Prisma imports under `packages/core/src/resource/`

- [x] **Step 4: Commit**

```bash
git add packages/core/src/index.test.ts packages/core/src/resource
git commit -m "test(core): smoke M3.1 resource public exports"
```

---

## Completion criteria (M3.1)

- [x] Parent plan §7 Resource contracts checklist is green
- [x] Public exports match the locked surface above
- [x] No `projectResourceMetadata` in this slice
- [x] No annotation vocabulary beyond `EmptyAnnotations`
- [x] No field / relation / operation member types
- [x] Placeholder packages remain feature-free

---

## Self-review

1. **Spec coverage:** RFC-005 authoritative parts, empty schema, empty annotations, construction, validation — mapped to Tasks 1–4. Projection deferred to M3.2.
2. **Placeholder scan:** no TBD steps; concrete symbols and error codes locked.
3. **Type consistency:** `Resource` / `ResourceSchema` / `EmptyAnnotations` / `ResourceValidationError` names stable across tasks.

---

## After Accept

Coding begins only when this plan’s **Status** is **Accepted**. Prefer subagent-driven TDD per task. Do not start M3.2 until M3.1 tests pass and are committed.
