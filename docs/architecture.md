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

```text
              @resource-forge/core
               ▲      ▲      ▲      ▲
               │      │      │      │
            nest   graphql prisma   cli
```

Arrows point toward the dependency (importer → imported).

Integrations communicate with each other only through core contracts.

Forbidden edges:

- `graphql` → `prisma`
- `prisma` → `graphql`
- `nest` → `prisma`
- `nest` → `graphql`
