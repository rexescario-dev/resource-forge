# Resource Forge — Initial Scaffold Design

**Date:** 2026-08-06  
**Status:** Approved for implementation planning  
**Scope:** Repository foundation only — no framework features

## Goal

Create the initial open-source scaffold for **Resource Forge**, a resource-centric API framework for TypeScript.

Resource Forge is inspired by NestJS, PHP Lighthouse, and API Platform, but is **resource-first**, not GraphQL-first and not Prisma-first.

- GraphQL will be the first supported transport (later).
- Prisma will be the first persistence adapter (later).
- Both are replaceable modules.

This design covers only the maintainable architecture and project foundation. No Resources, GraphQL generation, CRUD generation, or ORM integration is in scope.

## Guiding principle

> Build the repository shape first, the contracts second, and the implementations third.

## Architecture principles

- Resource-first, transport-agnostic.
- Core defines contracts, not implementations.
- Integrations depend only on core.
- Framework support is additive, never foundational.
- Repository structure precedes framework features.

## Relationship to ContextForge

Resource Forge lives as a **sibling repository** to ContextForge:

```text
/home/rex/Project/
├── ContextForge/      # knowledge, ontology, RFCs, patterns, extracted context
└── resource-forge/    # application/library: resource-centric API framework
```

- Independent versioning, issues, and CI/CD.
- ContextForge must not host Resource Forge source.
- Resource Forge may later consume ContextForge (checkout, package, or API) without a circular dependency.

## Approach

**Minimal foundation** (chosen over tooling-heavy and single-package-then-split):

| Include | Defer |
| --- | --- |
| pnpm workspaces, Turborepo | Husky, Commitlint |
| Strict TypeScript, ESLint, Prettier | Typedoc |
| Vitest, Changesets (config only) | Coverage gates |
| GitHub Actions CI | Release / publish workflows |
| Placeholder packages + docs | Nest / GraphQL / Prisma runtime deps |
| Package READMEs | Peer dependencies (until real adapters) |

## Repository layout

```text
/home/rex/Project/resource-forge/
├── .cursor/
│   └── rules/
│       └── README.md
├── .github/
│   └── workflows/
│       └── ci.yml
├── apps/
│   └── README.md
├── docs/
│   ├── vision.md
│   ├── architecture.md
│   ├── roadmap.md
│   ├── contributing.md
│   └── superpowers/
│       └── specs/
│           └── 2026-08-06-resource-forge-initial-scaffold-design.md
├── examples/
│   └── basic/
│       └── README.md
├── packages/
│   ├── core/
│   ├── nest/
│   ├── graphql/
│   ├── prisma/
│   └── cli/
├── scripts/
│   └── README.md
├── tests/
│   └── README.md
├── .editorconfig
├── .eslintrc.cjs
├── .gitignore
├── .prettierrc
├── LICENSE
├── package.json
├── pnpm-workspace.yaml
├── README.md
├── tsconfig.base.json
└── turbo.json
```

Placeholder directories (`apps/`, `scripts/`, `.cursor/rules/`) use README stubs only — no code.

## Package boundaries

### Packages (v0)

| Package | Role |
| --- | --- |
| `@resource-forge/core` | Framework abstractions only |
| `@resource-forge/nest` | NestJS integration (future) |
| `@resource-forge/graphql` | GraphQL transport (future) |
| `@resource-forge/prisma` | Prisma adapter (future) |
| `@resource-forge/cli` | CLI (future) |

Reserved names (not created yet): `@resource-forge/types`, `contracts`, `testing`, `config`, `devtools`.

### Allowed dependency graph

`nest`, `graphql`, `prisma`, and `cli` may depend on `core`. `core` depends on none of them.

```text
              @resource-forge/core
               ▲      ▲      ▲      ▲
               │      │      │      │
            nest   graphql prisma   cli
```

Arrows point toward the dependency (importer → imported).

### Forbidden edges

```text
graphql ──► prisma
prisma  ──► graphql
nest    ──► prisma
nest    ──► graphql
```

Integrations communicate with each other **only through `@resource-forge/core` contracts**.

`core` must not depend on NestJS, Prisma, or GraphQL.

### Peer dependencies

Omit entirely for v0. Introduce alongside the first real adapter implementation.

## Logical pipeline (documentation only)

```text
Resources
    ↓
Metadata
    ↓
Transport
    ↓
Generated API
```

This is a **logical pipeline**, not a package dependency graph. Stages do not map 1:1 to packages.

## Per-package shape

```text
packages/<name>/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts
    └── index.test.ts
```

Each package:

- Builds successfully.
- Exports a placeholder entry point with a TODO for its future responsibility.
- Ships a README using a consistent template: Purpose, Responsibilities, Current status, Dependency rules, Future scope.
- Uses `version: 0.0.0` and is configured to be publishable (`private: false`), although no publishing workflow is included in this scaffold.
- Depends on `@resource-forge/core` via `workspace:*` where applicable (except `core` itself).
- Has **no** runtime dependencies on NestJS, Prisma, or GraphQL libraries.

## Tooling

- Node.js 20 LTS
- pnpm workspaces
- Turborepo tasks: `build`, `lint`, `typecheck`, `test`
- Strict TypeScript via shared `tsconfig.base.json`
- ESLint + Prettier at repo root
- Vitest for package-local smoke tests
- Changesets configured; no publish workflow yet

## Tests

- Primary tests: package-local `src/index.test.ts` smoke tests.
- Root `tests/README.md` documents that convention; no duplicated suite required for v0.

## CI

`.github/workflows/ci.yml` on push/PR:

```text
install → lint → typecheck → test → build
```

No release automation, coverage gates, docs generation, or publish pipeline.

## Documentation

### Root README

Must include:

- Project Status (early scaffold; structure and boundaries first)
- Vision
- Philosophy
- Architecture overview (logical pipeline)
- Package overview
- Roadmap summary
- Development instructions (placeholder install text only)

No badges. No implementation examples. No real installation cookbook beyond placeholder text.

### Docs

| File | Content |
| --- | --- |
| `docs/vision.md` | Resource-centric APIs via declarative resource definitions |
| `docs/architecture.md` | High-level architecture; logical pipeline note |
| `docs/roadmap.md` | Milestones below |
| `docs/contributing.md` | Placeholder contribution guide |

### Roadmap milestones

Normative detail lives in [`docs/roadmap.md`](../../roadmap.md). Summary:

| Milestone | Focus |
| --- | --- |
| M1 | Repository & workspace foundation |
| — | Core architecture RFCs (gate before M2) |
| M2 | Core contracts (vocabulary, not behavior) |
| M3 | Resource model |
| M4 | Integrations (Nest → GraphQL → Prisma) |
| M5 | CLI & end-to-end examples |

## License

MIT License:

```text
Copyright (c) 2026 Resource Forge Contributors
```

## Explicit non-goals (this scaffold)

- Resource decorators or metadata implementation
- GraphQL schema/resolver generation
- Prisma metadata extraction or adapters
- CRUD generation
- Example APIs
- Husky / Commitlint / Typedoc / coverage enforcement
- npm publish workflows

## Success criteria

1. Fresh clone: `pnpm install` succeeds on Node 20.
2. `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` succeed.
3. CI runs the same pipeline.
4. Package dependency graph matches the allowed/forbidden rules above.
5. Documentation states intent without promising unimplemented features.
6. No NestJS, Prisma, or GraphQL runtime dependencies are present.
7. Every package builds independently within the workspace.
