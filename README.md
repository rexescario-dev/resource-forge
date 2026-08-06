# Resource Forge

**Status:** M1 complete (repository foundation). Next: architecture RFCs for core contracts (M2), then implementation.

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

1. **M1** — Repository & workspace foundation *(done)*
2. **RFCs** — Resource identity, metadata, registry, extension model *(next)*
3. **M2** — Core contracts (vocabulary, not behavior)
4. **M3** — Resource model (transport-agnostic)
5. **M4** — Integrations: Nest → GraphQL → Prisma
6. **M5** — CLI & end-to-end examples

Details: [docs/roadmap.md](docs/roadmap.md). RFCs: [docs/rfc-process.md](docs/rfc-process.md).

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
