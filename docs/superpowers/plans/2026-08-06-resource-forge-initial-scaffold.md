# Resource Forge Initial Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the minimal open-source monorepo foundation for Resource Forge with five placeholder packages, tooling, CI, and documentation — and zero framework feature implementations.

**Architecture:** Sibling repository at `/home/rex/Project/resource-forge` with pnpm workspaces and Turborepo. `@resource-forge/core` holds abstractions; `nest`, `graphql`, `prisma`, and `cli` depend only on `core` via `workspace:*`. Each package exports a placeholder entry point and a smoke test. No NestJS, GraphQL, or Prisma runtime dependencies.

**Tech Stack:** TypeScript (strict), Node.js 20, pnpm, Turborepo, ESLint, Prettier, Vitest, Changesets, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-08-06-resource-forge-initial-scaffold-design.md`

---

## File structure

| Path | Responsibility |
| --- | --- |
| `package.json` | Root scripts, shared devDependencies, engines |
| `pnpm-workspace.yaml` | Workspace globs for `packages/*` |
| `turbo.json` | `build`, `lint`, `typecheck`, `test` pipeline |
| `tsconfig.base.json` | Shared strict compiler options |
| `.eslintrc.cjs` / `.prettierrc` / `.editorconfig` / `.gitignore` | Coding standards and ignore rules |
| `LICENSE` | MIT, Resource Forge Contributors |
| `.changeset/config.json` + `README.md` | Changesets configured, no publish workflow |
| `.github/workflows/ci.yml` | install → lint → typecheck → test → build |
| `packages/*/package.json` | Package metadata, scripts, workspace deps |
| `packages/*/tsconfig.json` | Extends base, emits `dist/` |
| `packages/*/src/index.ts` | Placeholder export + TODO |
| `packages/*/src/index.test.ts` | Smoke test for placeholder export |
| `packages/*/README.md` | Purpose / Responsibilities / Status / Deps / Future |
| `docs/*.md` | Vision, architecture, roadmap, contributing |
| `README.md` | Project status, vision, philosophy, packages, roadmap, dev |
| `apps/README.md`, `scripts/README.md`, `tests/README.md`, `.cursor/rules/README.md`, `examples/basic/README.md` | Namespace placeholders |

---

### Task 1: Root workspace and tooling config

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `.prettierrc`
- Create: `.eslintrc.cjs`
- Create: `LICENSE`
- Create: `.npmrc`

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "resource-forge",
  "private": true,
  "version": "0.0.0",
  "description": "Resource-centric API framework for TypeScript",
  "license": "MIT",
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.11",
    "@types/node": "^22.10.5",
    "@typescript-eslint/eslint-plugin": "^8.19.1",
    "@typescript-eslint/parser": "^8.19.1",
    "eslint": "^8.57.1",
    "eslint-config-prettier": "^9.1.0",
    "prettier": "^3.4.2",
    "turbo": "^2.3.3",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 3: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```

- [ ] **Step 5: Create `.gitignore`**

```gitignore
node_modules
dist
coverage
.turbo
*.tsbuildinfo
.DS_Store
*.log
.env
.env.*
!.env.example
```

- [ ] **Step 6: Create `.editorconfig`**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 7: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

- [ ] **Step 8: Create `.eslintrc.cjs`**

```js
/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: ['dist', 'node_modules', 'coverage', '.turbo'],
  overrides: [
    {
      files: ['*.cjs'],
      env: { node: true },
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
  ],
};
```

- [ ] **Step 9: Create `.npmrc`**

```ini
auto-install-peers=true
strict-peer-dependencies=false
```

- [ ] **Step 10: Create `LICENSE`**

Use the full MIT license text with:

```text
Copyright (c) 2026 Resource Forge Contributors
```

- [ ] **Step 11: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json \
  .gitignore .editorconfig .prettierrc .eslintrc.cjs .npmrc LICENSE
git commit -m "chore: add root workspace and tooling config"
```

---

### Task 2: Scaffold `@resource-forge/core`

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/src/index.test.ts`
- Create: `packages/core/README.md`

- [ ] **Step 1: Create package manifests**

`packages/core/package.json`:

```json
{
  "name": "@resource-forge/core",
  "version": "0.0.0",
  "description": "Core abstractions for Resource Forge",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "lint": "eslint src --ext .ts"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

`packages/core/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts"]
}
```

`packages/core/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 2: Write the failing smoke test**

`packages/core/src/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index.js';

describe('@resource-forge/core', () => {
  it('exports its package name placeholder', () => {
    expect(PACKAGE_NAME).toBe('@resource-forge/core');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /home/rex/Project/resource-forge
pnpm install
pnpm --filter @resource-forge/core test
```

Expected: FAIL (cannot resolve `./index.js` / missing export)

- [ ] **Step 4: Implement placeholder entry point**

`packages/core/src/index.ts`:

```ts
/**
 * @resource-forge/core
 *
 * TODO: Resource contracts, metadata model, registry interfaces,
 * extension points, and internal utilities.
 *
 * This package must not depend on NestJS, Prisma, or GraphQL.
 */
export const PACKAGE_NAME = '@resource-forge/core' as const;
```

- [ ] **Step 5: Create package README**

`packages/core/README.md`:

```markdown
# @resource-forge/core

## Purpose

Framework abstractions for Resource Forge.

## Responsibilities

- Resource contracts
- Metadata model
- Registry interfaces
- Extension points
- Internal utilities

## Current status

Placeholder. No framework features are implemented yet.

## Dependency rules

- Must not depend on NestJS, Prisma, or GraphQL
- All other `@resource-forge/*` packages may depend on this package

## Future scope

Define the resource-first contracts that transports and persistence adapters implement against.
```

- [ ] **Step 6: Run build, typecheck, test, lint**

```bash
pnpm --filter @resource-forge/core build
pnpm --filter @resource-forge/core typecheck
pnpm --filter @resource-forge/core test
pnpm --filter @resource-forge/core lint
```

Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add packages/core pnpm-lock.yaml
git commit -m "feat(core): scaffold placeholder package"
```

---

### Task 3: Scaffold `@resource-forge/nest`

**Files:**
- Create: `packages/nest/package.json`
- Create: `packages/nest/tsconfig.json`
- Create: `packages/nest/vitest.config.ts`
- Create: `packages/nest/src/index.ts`
- Create: `packages/nest/src/index.test.ts`
- Create: `packages/nest/README.md`

- [ ] **Step 1: Create package manifests**

`packages/nest/package.json`:

```json
{
  "name": "@resource-forge/nest",
  "version": "0.0.0",
  "description": "NestJS integration for Resource Forge",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "@resource-forge/core": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

`packages/nest/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "references": [{ "path": "../core" }],
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts"]
}
```

`packages/nest/vitest.config.ts` — same as core.

- [ ] **Step 2: Write failing test**

`packages/nest/src/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index.js';

describe('@resource-forge/nest', () => {
  it('exports its package name placeholder', () => {
    expect(PACKAGE_NAME).toBe('@resource-forge/nest');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm install
pnpm --filter @resource-forge/nest test
```

Expected: FAIL

- [ ] **Step 4: Implement placeholder**

`packages/nest/src/index.ts`:

```ts
/**
 * @resource-forge/nest
 *
 * TODO: NestJS dynamic module, decorators, discovery, and dependency injection.
 *
 * Depends on @resource-forge/core only. Must not depend on graphql or prisma packages.
 */
import { PACKAGE_NAME as CORE_PACKAGE_NAME } from '@resource-forge/core';

export const PACKAGE_NAME = '@resource-forge/nest' as const;

/** Ensures the workspace dependency on core resolves at build time. */
export const CORE_DEPENDENCY = CORE_PACKAGE_NAME;
```

- [ ] **Step 5: Create README**

```markdown
# @resource-forge/nest

## Purpose

NestJS integration for Resource Forge.

## Responsibilities

- Dynamic module
- Decorators
- Discovery
- Dependency injection

## Current status

Placeholder. No NestJS integration is implemented yet.

## Dependency rules

- May depend on `@resource-forge/core`
- Must not depend on `@resource-forge/graphql` or `@resource-forge/prisma`
- No NestJS runtime dependency in this scaffold

## Future scope

Host Resource Forge inside NestJS applications through discovery and DI.
```

- [ ] **Step 6: Verify**

```bash
pnpm --filter @resource-forge/nest build
pnpm --filter @resource-forge/nest typecheck
pnpm --filter @resource-forge/nest test
pnpm --filter @resource-forge/nest lint
```

Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add packages/nest pnpm-lock.yaml
git commit -m "feat(nest): scaffold placeholder package"
```

---

### Task 4: Scaffold `@resource-forge/graphql`

**Files:**
- Create: `packages/graphql/package.json`
- Create: `packages/graphql/tsconfig.json`
- Create: `packages/graphql/vitest.config.ts`
- Create: `packages/graphql/src/index.ts`
- Create: `packages/graphql/src/index.test.ts`
- Create: `packages/graphql/README.md`

Follow the same pattern as nest:

- `dependencies`: `{ "@resource-forge/core": "workspace:*" }`
- Placeholder TODO: schema generation, resolvers, GraphQL metadata
- Import `PACKAGE_NAME` from `@resource-forge/core` as `CORE_DEPENDENCY` (same pattern as nest)
- README dependency rules: may depend on core; must not depend on prisma; no GraphQL runtime dep yet

- [ ] **Step 1: Create manifests, failing test, placeholder `index.ts`, README** (mirror Task 3 with graphql naming)

`packages/graphql/src/index.ts`:

```ts
/**
 * @resource-forge/graphql
 *
 * TODO: GraphQL schema generation, resolvers, and GraphQL metadata.
 *
 * Depends on @resource-forge/core only. Must not depend on @resource-forge/prisma.
 */
import { PACKAGE_NAME as CORE_PACKAGE_NAME } from '@resource-forge/core';

export const PACKAGE_NAME = '@resource-forge/graphql' as const;

/** Ensures the workspace dependency on core resolves at build time. */
export const CORE_DEPENDENCY = CORE_PACKAGE_NAME;
```

- [ ] **Step 2: Verify build/typecheck/test/lint**

```bash
pnpm install
pnpm --filter @resource-forge/graphql build
pnpm --filter @resource-forge/graphql typecheck
pnpm --filter @resource-forge/graphql test
pnpm --filter @resource-forge/graphql lint
```

Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add packages/graphql pnpm-lock.yaml
git commit -m "feat(graphql): scaffold placeholder package"
```

---

### Task 5: Scaffold `@resource-forge/prisma`

**Files:**
- Create: `packages/prisma/package.json`
- Create: `packages/prisma/tsconfig.json`
- Create: `packages/prisma/vitest.config.ts`
- Create: `packages/prisma/src/index.ts`
- Create: `packages/prisma/src/index.test.ts`
- Create: `packages/prisma/README.md`

Mirror Task 3 with prisma naming:

- TODO: metadata extraction, model adapter, persistence
- Must not depend on `@resource-forge/graphql`
- No Prisma runtime dependency yet

`packages/prisma/src/index.ts`:

```ts
/**
 * @resource-forge/prisma
 *
 * TODO: Prisma metadata extraction, model adapter, and persistence.
 *
 * Depends on @resource-forge/core only. Must not depend on @resource-forge/graphql.
 */
import { PACKAGE_NAME as CORE_PACKAGE_NAME } from '@resource-forge/core';

export const PACKAGE_NAME = '@resource-forge/prisma' as const;

/** Ensures the workspace dependency on core resolves at build time. */
export const CORE_DEPENDENCY = CORE_PACKAGE_NAME;
```

- [ ] **Step 1: Create package files (manifests, test, index, README)**

- [ ] **Step 2: Verify**

```bash
pnpm install
pnpm --filter @resource-forge/prisma build
pnpm --filter @resource-forge/prisma typecheck
pnpm --filter @resource-forge/prisma test
pnpm --filter @resource-forge/prisma lint
```

Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add packages/prisma pnpm-lock.yaml
git commit -m "feat(prisma): scaffold placeholder package"
```

---

### Task 6: Scaffold `@resource-forge/cli`

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/vitest.config.ts`
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/index.test.ts`
- Create: `packages/cli/README.md`

Mirror Task 3 with cli naming. No bin entry yet (commands not implemented).

`packages/cli/src/index.ts`:

```ts
/**
 * @resource-forge/cli
 *
 * TODO: CLI commands such as `rf init`, `rf generate resource`, and `rf generate from-prisma`.
 *
 * Depends on @resource-forge/core only.
 */
import { PACKAGE_NAME as CORE_PACKAGE_NAME } from '@resource-forge/core';

export const PACKAGE_NAME = '@resource-forge/cli' as const;

/** Ensures the workspace dependency on core resolves at build time. */
export const CORE_DEPENDENCY = CORE_PACKAGE_NAME;
```

README future scope may mention planned commands without implementing them:

```text
rf init
rf generate resource User
rf generate from-prisma
```

- [ ] **Step 1: Create package files**

- [ ] **Step 2: Verify**

```bash
pnpm install
pnpm --filter @resource-forge/cli build
pnpm --filter @resource-forge/cli typecheck
pnpm --filter @resource-forge/cli test
pnpm --filter @resource-forge/cli lint
```

Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add packages/cli pnpm-lock.yaml
git commit -m "feat(cli): scaffold placeholder package"
```

---

### Task 7: Documentation and namespace placeholders

**Files:**
- Create: `docs/vision.md`
- Create: `docs/architecture.md`
- Create: `docs/roadmap.md`
- Create: `docs/contributing.md`
- Create: `apps/README.md`
- Create: `scripts/README.md`
- Create: `tests/README.md`
- Create: `.cursor/rules/README.md`
- Create: `examples/basic/README.md`
- Create: `README.md`

- [ ] **Step 1: Create `docs/vision.md`**

```markdown
# Vision

Resource Forge is a resource-centric framework for building APIs through declarative resource definitions.

It is resource-first, not GraphQL-first and not Prisma-first. Transports and persistence adapters are replaceable modules. GraphQL is planned as the first transport; Prisma as the first persistence adapter.
```

- [ ] **Step 2: Create `docs/architecture.md`**

````markdown
# Architecture

Resource Forge organizes work around a logical pipeline:

```text
Resources
    ↓
Metadata
    ↓
Transport
    ↓
Generated API
```

This is a logical pipeline, not a package dependency graph. Stages do not map one-to-one to packages.

## Package dependency rules

`nest`, `graphql`, `prisma`, and `cli` may depend on `@resource-forge/core`. `core` depends on none of them.

Integrations communicate with each other only through core contracts.

Forbidden edges:

- `graphql` → `prisma`
- `prisma` → `graphql`
- `nest` → `prisma`
- `nest` → `graphql`
````

- [ ] **Step 3: Create `docs/roadmap.md`**

````markdown
# Roadmap

| Milestone | Focus |
| --- | --- |
| M1 | Repository & workspace foundation |
| M2 | Core contracts |
| M3 | Resource model |
| M4 | Initial transport and persistence integrations (NestJS, GraphQL, Prisma) |
| M5 | CLI and end-to-end examples |
````

- [ ] **Step 4: Create `docs/contributing.md`**

````markdown
# Contributing

Thank you for your interest in Resource Forge.

## Development

Requires Node.js 20+ and pnpm.

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Guidelines

- Prefer changes that strengthen package boundaries over cross-package shortcuts.
- Do not add NestJS, GraphQL, or Prisma runtime dependencies until the corresponding integration work begins.
- Keep commits focused. Use Changesets when public package APIs change (once packages are released).
````

- [ ] **Step 5: Create namespace placeholder READMEs**

`apps/README.md`:

```markdown
# apps/

Reserved for future applications (playground, demos, or services).

No applications are included in the initial scaffold.
```

`scripts/README.md`:

```markdown
# scripts/

Reserved for automation and bootstrap tasks.

No scripts are included in the initial scaffold.
```

`tests/README.md`:

```markdown
# tests/

Workspace-level test notes.

Package tests live next to source as `packages/*/src/*.test.ts`.
This directory is reserved for future cross-package or end-to-end suites.
```

`.cursor/rules/README.md`:

```markdown
# Cursor rules

Reserved for project-specific Cursor AI rules.

No substantive rules are committed in the initial scaffold.
```

`examples/basic/README.md`:

```markdown
# examples/basic

Reserved for a minimal usage example.

No example API is included in the initial scaffold.
```

- [ ] **Step 6: Create root `README.md`**

````markdown
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
````

- [ ] **Step 7: Commit**

```bash
git add README.md docs/vision.md docs/architecture.md docs/roadmap.md \
  docs/contributing.md apps/README.md scripts/README.md tests/README.md \
  .cursor/rules/README.md examples/basic/README.md
git commit -m "docs: add vision, architecture, and placeholder READMEs"
```

---

### Task 8: Changesets and CI

**Files:**
- Create: `.changeset/config.json`
- Create: `.changeset/README.md`
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create Changesets config**

`.changeset/config.json`:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.5/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

`.changeset/README.md`:

```markdown
# Changesets

This repository uses [Changesets](https://github.com/changesets/changesets) for versioning.

No publish workflow is included in the initial scaffold.
```

- [ ] **Step 2: Create CI workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build
```

- [ ] **Step 3: Optionally rename default branch to `main`**

```bash
git branch -m master main
```

(Only if the local repo is still on `master` and no remote exists yet.)

- [ ] **Step 4: Commit**

```bash
git add .changeset .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow and Changesets config"
```

---

### Task 9: Full workspace verification

**Files:** none (verification only)

- [ ] **Step 1: Clean install and run full pipeline**

```bash
cd /home/rex/Project/resource-forge
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: all commands exit 0.

- [ ] **Step 2: Confirm dependency boundaries**

```bash
# Must find workspace deps on core for nest/graphql/prisma/cli
rg '"@resource-forge/core"' packages/*/package.json

# Must NOT find framework runtime deps
rg -i '(@nestjs|graphql|@prisma/client|prisma)' packages/*/package.json || true
```

Expected: core dependency present on the four integration packages; no Nest/GraphQL/Prisma package dependencies.

- [ ] **Step 3: Confirm each package builds independently**

```bash
pnpm --filter @resource-forge/core build
pnpm --filter @resource-forge/nest build
pnpm --filter @resource-forge/graphql build
pnpm --filter @resource-forge/prisma build
pnpm --filter @resource-forge/cli build
```

Expected: each exits 0.

- [ ] **Step 4: Final commit if any lockfile/config fixes were needed**

```bash
git add -A
git status
# If there are fixes:
git commit -m "chore: finalize scaffold after workspace verification"
```

---

## Self-review checklist

| Spec requirement | Task |
| --- | --- |
| Sibling repo layout + placeholders (`apps`, `scripts`, `.cursor`) | 7 |
| Five scoped packages, core-only deps | 2–6 |
| No Nest/Prisma/GraphQL runtime or peer deps | 2–6, 9 |
| Package README template | 2–6 |
| Strict TS, ESLint, Prettier, Vitest, Turborepo, pnpm | 1–2 |
| Changesets without publish workflow | 8 |
| CI: install → lint → typecheck → test → build | 8 |
| Docs + root README with Project Status | 7 |
| MIT Contributors license | 1 |
| Every package builds independently | 9 |

No architectural scope beyond the approved design.
