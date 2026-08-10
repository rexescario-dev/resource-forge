# @resource-forge/prisma

Prisma correspondence verification and schema realization for Resource Forge
([RFC-033](../../docs/superpowers/specs/2026-08-10-rfc-033-prisma-correspondence-verification-design.md),
[RFC-034](../../docs/superpowers/specs/2026-08-10-rfc-034-prisma-schema-realization-design.md)).

## Purpose

1. **Verify** that validated core `Resource` values correspond to an existing Prisma DMMF-shaped document (`verifyPrismaCorrespondence`).
2. **Emit** Prisma model semantics from a Resource unit (`emitPrismaSchema`), with a derived DMMF-shaped companion for the Emission Correspondence Invariant.

Neither entry requires Prisma Client, Prisma CLI/engine, or database access. Provider-specific `schema.prisma` validity is host-owned (RFC-034 §4.6).

## Emit usage

```ts
import {
  emitPrismaSchema,
  toVerificationMapping,
  verifyPrismaCorrespondence,
} from '@resource-forge/prisma';

const realization = {
  identities: {
    'crm/Customer': { kind: 'resourceField', field: 'id' },
    'crm/Order': { kind: 'resourceField', field: 'id' },
  },
};

const emitted = emitPrismaSchema([customer, order], realization, {
  // optional host composition only — does not affect correspondence
  preamble: 'datasource db { provider = "postgresql" url = env("DATABASE_URL") }',
});
if (!emitted.ok) {
  throw emitted.error;
}

const { models, preamble, dmmf } = emitted.value;
// Host composes preamble? + models → schema.prisma

// Compose with verify (test/host); emit does not call verify internally
const verified = verifyPrismaCorrespondence(
  [customer, order],
  dmmf,
  toVerificationMapping(realization),
);
```

Public emit entry: `emitPrismaSchema(resources, realization, options?) → Result<{ models, preamble?, dmmf }, EmitError>`.

- `models` — Prisma model-block SDL derived from the internal Emit Model (not “whatever Prisma accepts”).
- `dmmf` — package-defined DMMF-shaped view of the **same** Emit Model semantics.
- Realization mapping supplies instance identity (`resourceField` | `prismaExtra`), optional number overlays, join overlays, and optional name mapping.
- Missing join/overlay, unilateral Relations (`inverse` absent), FK-realized 1:1 / m:n, and disambiguator-required topologies fail closed.

## Verify usage

```ts
import { verifyPrismaCorrespondence } from '@resource-forge/prisma';

const result = verifyPrismaCorrespondence([customer, order], dmmf, mapping);
if (!result.ok) {
  throw result.error;
}
```

Public verify entry: `verifyPrismaCorrespondence(resources, dmmf, mapping?) → Result<CorrespondenceReport, CorrespondenceError>`.

- `dmmf` must be a DMMF-shaped document (`datamodel.models[]`).
- Optional `mapping` overrides Prisma schema-level model/field/relation names.

## Direction

```text
Resource (authoritative) → Prisma models / DMMF-shaped evidence (realized / observed)
```

Prisma → Resource generation and Prisma Client runtime bindings remain out of scope (M4.3.3 candidate).

## Dependency rules

- May depend on `@resource-forge/core`
- Must **not** depend on `@resource-forge/nest` or `@resource-forge/graphql`
- Must **not** require Prisma Client, Prisma CLI/engine, or database access for emit or verify

## Status

- M4.3.1 verification: Accepted RFC-033 / [#112](https://github.com/rexescario-dev/resource-forge/issues/112)
- M4.3.2 schema realization: Accepted RFC-034 / [#115](https://github.com/rexescario-dev/resource-forge/issues/115)
