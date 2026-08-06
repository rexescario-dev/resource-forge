# Resource Forge

**Status:** Early scaffold. Repository structure and package boundaries are established. Framework integrations and runtime functionality will be introduced incrementally.

## Vision

A resource-centric framework for building APIs through declarative resource definitions.

## Philosophy

- Resource-first, transport-agnostic
- Core defines contracts, not implementations
- Integrations depend only on core
- Framework support is additive, never foundational
- Repository structure precedes framework features
- No package should expose a public API until its responsibilities have been documented

## Architecture overview

Logical pipeline (not a package dependency graph):

```text
Resources
    ↓
Metadata
    ↓
Transport
    ↓
Generated API
```

See [docs/architecture.md](docs/architecture.md).

## Packages

| Package | Role |
| --- | --- |
| `@resource-forge/core` | Framework abstractions |
| `@resource-forge/nest` | NestJS integration (future) |
| `@resource-forge/graphql` | GraphQL transport (future) |
| `@resource-forge/prisma` | Prisma adapter (future) |
| `@resource-forge/cli` | CLI (future) |

## Roadmap summary

1. Repository & workspace foundation
2. Core contracts
3. Resource model
4. Initial transport and persistence integrations (NestJS, GraphQL, Prisma)
5. CLI and end-to-end examples

Details: [docs/roadmap.md](docs/roadmap.md).

## Development

Requires Node.js 20 LTS and pnpm.

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Installation and usage guides for application developers will be added when packages gain real APIs.

## License

MIT © Resource Forge Contributors
