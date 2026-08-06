# @resource-forge/core

## Purpose

Core contracts for Resource Forge — vocabulary and invariants from accepted RFCs.

## Responsibilities

- Resource identity (M2.1)
- Metadata model (planned M2.2)
- Registry contracts (planned M2.3)
- Extension / composition contracts (planned M2.4)

## Current status

M2.1 identity primitives are implemented:

- `ResourceIdentity`
- `ResourceIdentityKind`
- `createResourceIdentity`
- `validateResourceIdentity`
- `resourceIdentitiesEqual`
- shared `Result` / `ok` / `err`

Canonical string `parse` / `format` for `namespace/name` are **not** public.

## Dependency rules

- Must not depend on NestJS, Prisma, or GraphQL
- All other `@resource-forge/*` packages may depend on this package

## Non-goals (current)

- Adapters, discovery, persistence, decorators
- Resource schemas (fields, relations, operations)
- Metadata, registry, and composition modules (later M2 slices)
