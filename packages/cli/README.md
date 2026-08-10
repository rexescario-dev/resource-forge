# @resource-forge/cli

CLI foundation, Resource validation, package environment doctor, and generate resource for Resource Forge (M5.1 / RFC-036, M5.2 / RFC-037, M5.3 / RFC-038, M5.4 / RFC-039).

## Current surface

```text
rf
rf --help
rf --version
rf validate <file>
rf doctor
rf generate resource <namespace> <name> <path>
```

Unknown commands and unsupported global options produce a non-zero usage error on stderr.

`rf validate <file>` reads exactly one explicit JSON file path (no discovery, globbing, or stdin), then validates the document against Accepted `@resource-forge/core` contracts via `validateResource`.

`rf doctor` checks CLI/package environment health (version, command registry wiring, `@resource-forge/core` resolvability). It does not discover projects or validate Resource documents.

`rf generate resource <namespace> <name> <path>` constructs a minimal valid Resource via `@resource-forge/core` and writes a JSON document to an explicit path (fail-closed: existing parent required; destination must be absent; no overwrite; no mkdir). Successfully written files round-trip through `rf validate`.

## Package API

The sole public TypeScript export is `run(argv)`:

```ts
import { run } from '@resource-forge/cli';

const result = run(['generate', 'resource', 'crm', 'Customer', './customer.json']);
// { exitCode, stdout, stderr }
```

`argv` excludes the Node executable and script path. `run` does not write to process streams or terminate the process. The `rf` executable is a thin adapter around `run`.

### Exit codes for `validate`

| Code | Meaning |
| --- | --- |
| `0` | Valid Resource |
| `1` | Semantic validation failure (or unexpected internal error) |
| `2` | Input/decode failure (arity, missing/unreadable file, invalid JSON, non-object JSON) or usage errors |

### Exit codes for `doctor`

| Code | Meaning |
| --- | --- |
| `0` | Healthy (all checks passed); report on stdout |
| `1` | Expected health failure (report on stdout) or unexpected internal error (stderr) |
| `2` | Usage (extra tokens / options after `doctor`) |

### Exit codes for `generate`

| Code | Meaning |
| --- | --- |
| `0` | Constructed and wrote JSON successfully |
| `1` | Core construction failure, or unexpected encode/write/finalization failure |
| `2` | Usage / FS refusal (arity, unknown kind/options, missing parent, destination exists including late conflict) |

## Out of scope

- Project / workspace doctor
- `rf init`, other `generate` kinds, `from-prisma`
- `--force`, overwrite, parent-directory creation
- Nest / GraphQL / Prisma CLI wiring
- project config / discovery / stdin
- examples applications
- public document-validation, generate, or health-probe APIs beyond `run`

## Dependency rules

- `@resource-forge/core` for `validateResource`, doctor resolvability, and generate construction
- No Nest / GraphQL / Prisma package dependencies
