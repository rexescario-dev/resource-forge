# @resource-forge/cli

CLI foundation and Resource validation command for Resource Forge (M5.1 / RFC-036, M5.2 / RFC-037).

## Current surface

```text
rf
rf --help
rf --version
rf validate <file>
```

Unknown commands and unsupported global options produce a non-zero usage error on stderr.

`rf validate <file>` reads exactly one explicit JSON file path (no discovery, globbing, or stdin), then validates the document against Accepted `@resource-forge/core` contracts via `validateResource`.

## Package API

The sole public TypeScript export is `run(argv)`:

```ts
import { run } from '@resource-forge/cli';

const result = run(['validate', './resource.json']);
// { exitCode, stdout, stderr }
```

`argv` excludes the Node executable and script path. `run` does not write to process streams or terminate the process. The `rf` executable is a thin adapter around `run`.

Exit codes for `validate`:

| Code | Meaning |
| --- | --- |
| `0` | Valid Resource |
| `1` | Semantic validation failure (or unexpected internal error) |
| `2` | Input/decode failure (arity, missing/unreadable file, invalid JSON, non-object JSON) or usage errors |

## Out of scope

- `doctor`
- generators (`init`, `generate`, …)
- Nest / GraphQL / Prisma CLI wiring
- project config / discovery / stdin
- examples applications
- public document-validation API beyond `run`

## Dependency rules

- `@resource-forge/core` for `validateResource` only
- No Nest / GraphQL / Prisma package dependencies
