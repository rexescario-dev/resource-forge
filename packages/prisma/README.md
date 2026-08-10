# @resource-forge/prisma

Prisma correspondence verification for Resource Forge ([RFC-033](../../docs/superpowers/specs/2026-08-10-rfc-033-prisma-correspondence-verification-design.md)).

## Purpose

Verify that validated core `Resource` values can be realized by an existing Prisma DMMF/model graph under RFC-028 correspondence—without emitting Prisma schema, invoking Prisma Client, or making Prisma authoritative over Resource declarations.

## Usage

```ts
import { verifyPrismaCorrespondence } from '@resource-forge/prisma';

const result = verifyPrismaCorrespondence([customer, order], dmmf, mapping);
if (!result.ok) {
  // fail-closed: no successful correspondence report
  throw result.error;
}

const { resources, fields, relations } = result.value;
```

Public entry: `verifyPrismaCorrespondence(resources, dmmf, mapping?) → Result<CorrespondenceReport, CorrespondenceError>`.

- `dmmf` must be a DMMF-shaped document (`datamodel.models[]`). A bare internal model-graph object is rejected as `unusable_dmmf`.
- Optional `mapping` overrides Prisma schema-level model/field/relation names (defaults are identity-preserving).

## Direction

```text
Resource (authoritative) → Prisma DMMF (observed)
```

Prisma → Resource generation, schema emission, and Prisma Client runtime are out of scope for M4.3.1.

## Correspondence rules (summary)

- Resource-covered only: every Resource identity/Field/Relation must realize; Prisma extras are allowed.
- Field types: `string`→`String`; `boolean`→`Boolean`; `number`→`Int|Float|Decimal`.
- Nullability: Prisma schema verifies Resource `nullable` only; `optional` is runtime/value-state.
- Relations: in-unit targets; singular/list multiplicity; join evidence when `join` is declared (owner-side ordered `relationFromFields`/`relationToFields`).
- Mapping collisions (including Field∪Relation name clashes) fail closed.

## Dependency rules

- May depend on `@resource-forge/core`
- Must **not** depend on `@resource-forge/nest` or `@resource-forge/graphql`
- Must **not** require Prisma Client or database access for verification

## Status

M4.3.1 product surface implemented per Accepted RFC-033 / Accepted implementation plan ([#112](https://github.com/rexescario-dev/resource-forge/issues/112)).
