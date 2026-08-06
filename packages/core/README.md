# @resource-forge/core

## Purpose

Core contracts for Resource Forge — vocabulary and invariants from accepted RFCs.

## Responsibilities

- Resource identity (M2.1)
- Metadata model (M2.2)
- Registry contracts (M2.3)
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

### M2.3 Registry

- `ResourceRegistry` interface
- `createInMemoryResourceRegistry()` — reference impl behind the interface
- `LookupResult` (`hit` / `miss`)
- `RegistryMutationError` + `RegisterError` / `ReplaceError` / `UnregisterError`

Behavior notes:

- Association-only: stores completed `ResourceMetadata` snapshots; does not compose or invent metadata
- Mutations return `Result<void, …>`; lookup miss is not an error
- `enumerate()` returns a snapshot array; order is non-normative
- Concrete Map-backed class and internal key encoding are not exported

## Dependency rules

- Must not depend on NestJS, Prisma, or GraphQL
- All other `@resource-forge/*` packages may depend on this package

## Non-goals (current)

- Adapters, discovery, persistence, decorators
- Resource schemas (fields, relations, operations)
- Composition / producer modules (M2.4)
