# @resource-forge/prisma

Prisma correspondence verification, schema realization, thin Client
persistence bindings, and DMMF→Resource bootstrap synthesis for Resource Forge
([RFC-033](../../docs/superpowers/specs/2026-08-10-rfc-033-prisma-correspondence-verification-design.md),
[RFC-034](../../docs/superpowers/specs/2026-08-10-rfc-034-prisma-schema-realization-design.md),
[RFC-035](../../docs/superpowers/specs/2026-08-10-rfc-035-prisma-client-bindings-design.md),
[RFC-041](../../docs/superpowers/specs/2026-08-10-rfc-041-cli-generate-from-prisma-design.md)).

## Purpose

1. **Verify** that validated core `Resource` values correspond to an existing Prisma DMMF-shaped document (`verifyPrismaCorrespondence`).
2. **Emit** Prisma model semantics from a Resource unit (`emitPrismaSchema`), with a derived DMMF-shaped companion for the Emission Correspondence Invariant.
3. **Bind** Resource-shaped scalar CRUD to an **injected** structural model delegate (`createPrismaResourceBinding`).
4. **Bootstrap** starter Resource documents from a Supported DMMF Profile (`synthesizeResourcesFromDmmf`) — deterministic and lossy; **not** a round-trip / RFC-033 verify obligation.

Emit, verify, and bootstrap never require Prisma Client, Prisma CLI/engine, or database access. Binding also does **not** import or depend on `@prisma/client`; hosts that use a real Client install it themselves and pass e.g. `client.customer` as the delegate. Provider-specific `schema.prisma` validity is host-owned (RFC-034 §4.6).

## Binding usage

```ts
import { createPrismaResourceBinding } from '@resource-forge/prisma';

const realization = {
  identities: {
    'crm/Customer': { kind: 'resourceField', field: 'id' },
  },
};

// Host owns Prisma Client lifecycle and selects the model delegate.
const binding = createPrismaResourceBinding({
  resource: customer,
  realization,
  delegate: prisma.customer, // structural; package does not look up by model name
});
if (!binding.ok) {
  throw binding.error;
}

const created = await binding.value.create({
  id: 'c1',
  displayName: 'Rex',
});
const found = await binding.value.findUnique('c1'); // ok(null) when missing
```

- Public values are **Resource-shaped scalars** (Field names). Realization mapping owns Field→Prisma name and instance identity.
- Ops: `create` / `findUnique` / `update` / `delete` only. No `findMany`, relation writes, transactions, or includes.
- `prismaExtra` identity uses a **separate** identity argument on `create(data, identity)`; it is not invented as a Resource Field and is not projected into returned records.
- Correspondence verification is optional and independent — binding does not require `dmmf` or a verify proof.
- Realized **model name** in realization is metadata only; the host injects the delegate.

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

## Bootstrap usage

```ts
import { synthesizeResourcesFromDmmf } from '@resource-forge/prisma';

const result = synthesizeResourcesFromDmmf({ dmmf, namespace: 'crm' });
// { emissions: [{ modelName, filename, resource }], refusals: [...] }
```

CLI thin adapter: `rf generate from-prisma <dmmfPath> <outDir> --namespace <namespace>`. Bootstrap is lossy and does **not** imply RFC-033 correspondence.

## Direction

```text
Resource (authoritative) → Prisma models / DMMF-shaped evidence / delegate calls (realized / observed)
DMMF (Supported Profile) → starter Resource JSON (bootstrap aid; not round-trip)
```

`schema.prisma` parsing and reverse generation beyond this bootstrap remain out of scope until separately Accepted.

## Dependency rules

- May depend on `@resource-forge/core`
- Must **not** depend on `@resource-forge/nest` or `@resource-forge/graphql`
- Must **not** import/require Prisma Client, Prisma CLI/engine, or database access for emit, verify, binding, or bootstrap
- Emit/verify/bootstrap-only consumers do **not** need `@prisma/client` installed
- Real Prisma hosts install `@prisma/client` themselves and inject model delegates

## Status

- M4.3.1 verification: Accepted RFC-033 / [#112](https://github.com/rexescario-dev/resource-forge/issues/112)
- M4.3.2 schema realization: Accepted RFC-034 / [#115](https://github.com/rexescario-dev/resource-forge/issues/115)
- M4.3.3 Client persistence bindings: Accepted RFC-035 / [#118](https://github.com/rexescario-dev/resource-forge/issues/118)
- M5.6 DMMF→Resource bootstrap: Accepted RFC-041 / [#138](https://github.com/rexescario-dev/resource-forge/issues/138)
