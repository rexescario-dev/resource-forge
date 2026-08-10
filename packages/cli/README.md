# @resource-forge/cli

CLI foundation, Resource validation, package environment doctor, generate resource, and init project marker for Resource Forge (M5.1 / RFC-036, M5.2 / RFC-037, M5.3 / RFC-038, M5.4 / RFC-039, M5.5 / RFC-040).

## Current surface

```text
rf
rf --help
rf --version
rf validate <file>
rf doctor
rf generate resource <namespace> <name> <path>
rf init [path]
```

Unknown commands and unsupported global options produce a non-zero usage error on stderr.

`rf validate <file>` reads exactly one explicit JSON file path (no discovery, globbing, or stdin), then validates the document against Accepted `@resource-forge/core` contracts via `validateResource`.

`rf doctor` checks CLI/package environment health (version, command registry wiring, `@resource-forge/core` resolvability). It does not discover projects or validate Resource documents. Doctor’s required registry set remains `validate` + `doctor` only.

`rf generate resource <namespace> <name> <path>` constructs a minimal valid Resource via `@resource-forge/core` and writes a JSON document to an explicit path (fail-closed: existing parent required; destination must be absent; no overwrite; no mkdir). Successfully written files round-trip through `rf validate`.

`rf init [path]` establishes a minimal RF project boundary at an explicit path (default `.`): canonical `resource-forge.json` plus `resources/`. Direct resolve only (no upward discovery). Already conforming targets are a no-op; half-init/conflicts refuse without repair; siblings (`validate` / `doctor` / `generate`) do not load the marker.

## Package API

The sole public TypeScript export is `run(argv)`:

```ts
import { run } from '@resource-forge/cli';

const result = run(['init', './my-project']);
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

### Exit codes for `init`

| Code | Meaning |
| --- | --- |
| `0` | Project already conforming, or successfully created marker + `resources/` |
| `1` | Creatable attempt failed (including post-classify races) or unexpected internal error |
| `2` | Usage or conflict refusal (half-init, non-canonical marker, wrong types, options, extra args) |

## Out of scope

- Project / workspace doctor
- Project-aware `generate` / `validate` / `doctor` loading of `resource-forge.json`
- Other `generate` kinds, `from-prisma`
- `--force`, soft-repair, overwrite, configurable `resourcesDir`
- Nest / GraphQL / Prisma CLI wiring
- upward discovery / workspace inference
- examples applications
- public init or project-resolution APIs beyond `run`

## Dependency rules

- `@resource-forge/core` for `validateResource`, doctor resolvability, and generate construction
- `init` is CLI-local (no new core marker exports)
- No Nest / GraphQL / Prisma package dependencies
