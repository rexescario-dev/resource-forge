# @resource-forge/core

## Purpose

Core contracts for Resource Forge — vocabulary and invariants from accepted RFCs.

## Responsibilities

- Resource identity (M2.1)
- Metadata model (M2.2)
- Registry contracts (planned M2.3)
- Extension / composition contracts (planned M2.4)

## Current status

### M2.1 Identity

- `ResourceIdentity`, `ResourceIdentityKind`
- `createResourceIdentity`, `validateResourceIdentity`, `resourceIdentitiesEqual`

### M2.2 Metadata

- `MetadataKey`, `MetadataKeyKind`, `MetadataEntry`, `ResourceMetadata`, `JsonValue`
- `createMetadataKey`, `validateMetadataKey`, `metadataKeysEqual`
- `validateJsonValue`
- `createResourceMetadata`, `validateResourceMetadata`, `resourceMetadataEqual`
- shared `Result` / `ok` / `err`

Not public: identity/key string parse-format encodings, entry mutation helpers (`withEntry` / `withoutEntry`).

## Dependency rules

- Must not depend on NestJS, Prisma, or GraphQL
- All other `@resource-forge/*` packages may depend on this package

## Non-goals (current)

- Adapters, discovery, persistence, decorators
- Resource schemas (fields, relations, operations)
- Registry and composition modules (later M2 slices)
