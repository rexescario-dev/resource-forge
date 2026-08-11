# examples/basic

Non-authoritative CLI walkthrough for Resource Forge.

This example demonstrates the shipped CLI lifecycle only. It is **not** a source of truth for framework architecture, Resource modeling, or adapter/host integration.

## Prerequisites

From the repository root:

1. `pnpm install`
2. `pnpm --filter @resource-forge/cli build`

Invoke the workspace-local CLI binary (no global `rf` install required). Preferred form from this directory:

```bash
node ../../packages/cli/dist/bin.js <command> …
```

Equivalent workspace-local forms that resolve the same built package binary are fine. Package-manager invocation syntax is not part of the example’s contract.

## Walkthrough

Committed files:

- `resource-forge.json` — project marker (RFC-040)
- `resources/Item.json` — Resource golden produced by `generate resource` (exact CLI output)

Commands (happy path; expect exit `0`):

```text
rf init .
rf generate resource demo Item resources/Item.json
rf validate resources/Item.json
rf doctor
```

Concrete copy/paste from this directory after build:

```bash
node ../../packages/cli/dist/bin.js init .
node ../../packages/cli/dist/bin.js generate resource demo Item resources/Item.json
node ../../packages/cli/dist/bin.js validate resources/Item.json
node ../../packages/cli/dist/bin.js doctor
```

### Roles

- `validate` checks the Resource document.
- `doctor` checks CLI/package installation health only. It is **not** a project-resource diagnostic.

### Recreate the Resource golden

`generate resource` is create-only (no overwrite).

1. Remove `resources/Item.json` (keep `resource-forge.json`).
2. Run the walkthrough commands above.
3. The new `resources/Item.json` MUST match the committed golden byte-for-byte.

If `resources/Item.json` already exists, `generate resource` exits `2` and does not overwrite.

### Out of scope here

- Nest / GraphQL / Prisma host applications
- Richer hand-authored Resources
- `from-prisma` (that command exists elsewhere; this example does not teach or exercise it)
