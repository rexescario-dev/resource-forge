# @resource-forge/cli

CLI execution foundation for Resource Forge (M5.1 / RFC-036).

## Current surface

```text
rf
rf --help
rf --version
```

Unknown commands and unsupported global options produce a non-zero usage error on stderr. Semantic product commands are **not** part of this slice.

## Package API

The sole public TypeScript export is `run(argv)`:

```ts
import { run } from '@resource-forge/cli';

const result = run(['--help']);
// { exitCode, stdout, stderr }
```

`argv` excludes the Node executable and script path. `run` does not write to process streams or terminate the process. The `rf` executable is a thin adapter around `run`.

## Out of scope (this slice)

- `validate` / `doctor`
- generators (`init`, `generate`, …)
- Nest / GraphQL / Prisma wiring
- project config / discovery
- examples applications

## Dependency rules

- No `@resource-forge/*` workspace product dependencies in M5.1
- No framework runtime dependencies
