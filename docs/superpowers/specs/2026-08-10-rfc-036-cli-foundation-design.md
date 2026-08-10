# RFC-036: CLI Foundation

**Date:** 2026-08-10  
**Status:** Accepted  
**M3:** Accepted (2026-08-10) — Design Review; no design blockers. Locked: shell-only `rf` / `--help` / `--version`; pure `run(argv) → { exitCode, stdout, stderr }`; exit `0/1/2`; empty internal command registry (non-public); zero `@resource-forge/*` deps; narrow grammar `rf [global-options] [command]`; `--help` precedence over `--version`; unknown-command wins over later `--help`; no config/discovery/project model; no semantic commands; tests centered on `run()`. Non-blocking notes for planning only: exception→exit `1` mechanism; prefer tiny custom parser unless a library is truly needed; keep `exitCode: number` (not literal union); do not over-build `CommandRegistry`. M4 (implementation planning) authorized for `#121`.  
**Package:** `@resource-forge/cli` (CLI execution foundation / shell only; no Resource Forge workspace product dependencies)  
**Tracking:** [#121](https://github.com/rexescario-dev/resource-forge/issues/121)  
**Depends on:** Repository foundation (M1) for package layout and Node ≥20 engines; **does not** depend on RFC-001–RFC-035 product contracts  
**Followed by:** M5.1 implementation planning/delivery for `#121` after Accept; M5.2 validate/doctor (candidate); later generator/integration CLI slices; `from-prisma` only after separately Accepted Prisma reverse-generation RFCs  
**Unblocks:** A stable `rf` executable shell and pure `run(argv)` contract so later M5 slices can add semantic commands without redesigning CLI process I/O, exit codes, or help/version builtins

**Amends / specializes:** Opens roadmap **M5 — CLI & examples** with **M5.1 CLI Foundation** only. Does **not** commit roadmap candidate command names (`validate`, `doctor`, `generate`, `init`, `from-prisma`, etc.) as CLI APIs. Does **not** reopen or extend RFC-001–RFC-035. Does **not** invent a project/config/discovery model for future commands.

## Primary question

> How should `@resource-forge/cli` expose a stable `rf` executable shell—help, version, unknown-command and invalid-global-argv handling, and deterministic exit codes—without inventing product commands, project models, or Resource Forge domain coupling?

## Thesis

RFC-036 locks M5.1 as a **CLI execution foundation**:

- **`@resource-forge/cli` is the CLI package.** It MUST NOT depend on `@resource-forge/core`, `@resource-forge/nest`, `@resource-forge/graphql`, or `@resource-forge/prisma` in this slice.
- **CLI surface ≠ package API.** The user-facing CLI surface is `rf` / `rf --help` / `rf --version` plus defined error behavior. The normative package API is solely `run(argv)`.
- **Prove the shell, not the product surface.** No semantic subcommands are registered. Help and version are framework-level builtins, not committed Resource Forge commands.
- **Pure runner + thin bin adapter.** `run` returns `{ exitCode, stdout, stderr }` and MUST NOT perform process I/O or process termination. The `rf` executable is the only place that writes process streams and exits.
- **Empty internal command registry.** An internal extension seam MAY exist for later slices; it is **not** a public registration API in M5.1 and MUST contain no product commands.
- **No implicit project model.** No config files, project-root discovery, workspace traversal, filesystem scanning, or Resource loading.

```text
CLI surface:
  rf
  rf --help
  rf --version
  (+ defined unknown-command / invalid-global-argv errors)

Package API:
  run(argv) → { exitCode, stdout, stderr }

rf (bin adapter)
      │
      ▼
run(argv excluding node + script path)
      │
      ▼
narrow parse: rf [global-options] [command]
      │
      ├── --help (or bare rf) → usage on stdout, exit 0
      ├── --version → package version on stdout, exit 0
      ├── unknown command token → stderr, exit 2
      └── invalid global argv → stderr, exit 2

CommandRegistry — internal, empty; not public
```

## 1. Scope

### 1.1 Goals

1. Define the M5.1 CLI foundation boundary in `@resource-forge/cli`.
2. Lock the `rf` executable / bin contract as a thin adapter around `run`.
3. Lock the sole normative package API: `run(argv) → { exitCode, stdout, stderr }`.
4. Lock narrow argv grammar `rf [global-options] [command]` with no registered commands.
5. Lock `--help` / `--version` builtins, including `--help` precedence over `--version`.
6. Lock deterministic exit-code and stream contracts for success and caller/usage errors.
7. Lock a testing contract centered on `run()` (no required subprocess smoke).
8. Explicitly fence product commands, config/discovery, Resource loading, generators, adapters, and examples.

### 1.2 Non-goals

This RFC does not define:

1. Semantic commands (`validate`, `doctor`, `init`, `generate`, etc.)
2. Reserved stubs or “not implemented” product command names
3. Nested command trees, aliases, positional argument schemas, or command-specific flags
4. Config files (`resource-forge.config.*` or otherwise)
5. Project-root discovery, workspace detection, or filesystem scanning
6. Resource loading or any consumption of `@resource-forge/core` contracts
7. Nest / GraphQL / Prisma wiring or optional peers for those packages
8. `examples/basic` or any end-to-end integration application
9. Environment-variable configuration of the CLI
10. Automatic command discovery / plugin loading
11. A general-purpose public CLI framework API (beyond `run`)
12. Reverse Prisma→Resource generation (`from-prisma`)
13. Changes to RFC-001–RFC-035 product semantics

### 1.3 Informative only

- Exact help-text wording is implementation-owned except where this RFC requires distinguishability of error classes.
- Exact TypeScript file layout and internal helper names are implementation-owned.
- How package version is obtained for `--version` (package metadata, generated constant, etc.) is implementation-defined so long as the reported value corresponds to the installed `@resource-forge/cli` package.

## 2. Terminology

| Term | Meaning |
| --- | --- |
| CLI surface | User-facing invocations of the `rf` executable and their defined success/error behavior |
| Package API | Normative TypeScript export surface of `@resource-forge/cli` for M5.1 — solely `run` |
| `run` | Pure function that interprets CLI argv (excluding Node executable and script path) and returns `{ exitCode, stdout, stderr }` |
| Bin adapter | Process entrypoint that calls `run(process.argv.slice(2))` (or equivalent), writes streams, then terminates with `exitCode` |
| Global options | M5.1-recognized options `--help` and `--version` only |
| Command token | Optional positional token after global options under the narrow grammar; not a registered product command in M5.1 |
| CommandRegistry | Internal implementation seam that may later hold commands; empty and non-public in M5.1 |
| Invalid global argv | Unsupported global options and malformed arguments recognized by the M5.1 parser |
| Unknown command | Any supplied command token while the registry contains no registered commands |

## 3. Package and surfaces

### 3.1 Package boundary

1. Product surface for this slice lives in `@resource-forge/cli`.
2. The package MUST NOT depend on any `@resource-forge/*` workspace package.
3. Allowed runtime dependencies: Node.js only, plus an argv/help library **only if actually needed**. Prefer no third-party CLI framework for this slice’s narrow grammar.
4. Development/test tooling follows repository conventions and is not a product dependency edge.

### 3.2 CLI surface (normative)

| Invocation | Result |
| --- | --- |
| `rf` | Root help / usage on **stdout**, exit `0` |
| `rf --help` | Help on **stdout**, exit `0` |
| `rf --version` | Version on **stdout**, exit `0` |
| Unknown command | Error on **stderr**, exit `2` |
| Invalid global argv | Error on **stderr**, exit `2` |

### 3.3 Package API (normative)

The sole normative package export for M5.1 is:

```ts
run(argv: readonly string[]): {
  exitCode: number;
  stdout: string;
  stderr: string;
}
```

1. `argv` is the CLI argument vector **excluding** the Node executable and script path. Examples: `run([])`, `run(["--help"])`, `run(["--version"])`, `run(["foo"])`.
2. `run` MUST NOT write to process stdout/stderr.
3. `run` MUST NOT call `process.exit` or otherwise terminate the process.
4. `run` MUST be deterministic with respect to its explicit inputs and the CLI package version; it MUST NOT require project state, filesystem discovery, or process termination.
5. Types/helpers other than `run` MUST NOT be part of the M5.1 public package API merely because they are convenient internally.

### 3.4 Bin adapter (normative role)

1. The package MUST expose an executable named `rf`.
2. The adapter MUST invoke `run` with argv excluding Node executable and script path.
3. The adapter MUST write returned `stdout` / `stderr` to the corresponding process streams **before** terminating.
4. The adapter MAY call `process.exit(exitCode)` (or equivalent). This is the **only** place that directly interacts with process termination.
5. Command/builtin logic MUST NOT call `process.exit`.

### 3.5 CommandRegistry (non-public)

1. An internal `CommandRegistry` (name informative) MAY exist as an extension seam for later slices.
2. In M5.1 the registry MUST contain **no** product commands.
3. `CommandRegistry` MUST NOT be part of the M5.1 public API.

## 4. Parser grammar and builtins

### 4.1 Grammar

M5.1 recognizes only:

```text
rf [global-options] [command]
```

1. Global options are `--help` and `--version` only.
2. No command is registered in M5.1; therefore **every** supplied command token produces the unknown-command result.
3. The parser MUST remain deliberately narrow. M5.1 MUST NOT introduce nested command trees, aliases, positional schemas, command-specific flags, env-based configuration, config files, or automatic command discovery.

### 4.2 Precedence and edge cases

1. When both `--help` and `--version` are present, `--help` takes precedence (help on stdout, exit `0`). This is not an error.
2. For `rf foo --help` (or any unknown command token with later options), **unknown command wins** — exit `2` — rather than treating `--help` as globally dominant in every position.
3. Bare `rf` (empty argv to `run`) is successful help/usage, exit `0`.

### 4.3 Version

`--version` MUST report the version corresponding to the installed `@resource-forge/cli` package. It MUST NOT require `@resource-forge/core` or project discovery. The mechanism used to obtain that version is implementation-defined (§1.3).

### 4.4 Help text

Help/usage content MUST identify the CLI (`rf`) and the supported global options. Exact prose is not normative.

## 5. Exit codes and errors

| Case | Exit code | Streams |
| --- | --- | --- |
| Successful help / version | `0` | message → **stdout** |
| Unknown command | `2` | message → **stderr** |
| Invalid global argv | `2` | message → **stderr** |
| Unexpected internal failure in the runner | `1` | message → **stderr** |

1. Exit codes are normative.
2. Exact human-readable error wording is **not** normative, except that unknown-command and invalid-global-argv errors MUST be distinguishable.
3. M5.1 does not invent additional exit codes beyond `0` / `1` / `2`.

## 6. Testing contract

1. The normative behavioral contract belongs to `run()`.
2. Tests MUST invoke `run(argv)` with argv excluding Node executable and script path.
3. Required coverage at Accept/implementation time includes: `[]`, `["--help"]`, `["--version"]`, unknown command, unsupported global option, `--help`+`--version` precedence, and unknown-command-wins when a command token precedes `--help`.
4. Subprocess / `rf` bin smoke tests are optional for M5.1; they are not required to establish the normative contract.

## 7. Invariants

1. M5.1 MUST NOT register product commands.
2. M5.1 MUST NOT load config, discover project roots, scan the filesystem for Resources, or otherwise invent a project model.
3. M5.1 MUST NOT depend on any `@resource-forge/*` workspace package.
4. Command/builtin logic MUST NOT call `process.exit`; only the bin adapter exits.
5. The parser MUST stay narrow (no nested trees, aliases, env config, command-specific flags, auto-discovery, config files).
6. `run(argv)` MUST be deterministic with respect to its explicit inputs and CLI package version; it MUST NOT require project state, filesystem discovery, or process termination.
7. `run()` MUST NOT perform process I/O or process termination.
8. `CommandRegistry` is internal-only and empty in M5.1.

## 8. Rationale

1. **Shell before product surface** avoids committing command names (`validate`, `doctor`, generators) before their semantics have Accepted RFCs.
2. **Zero workspace product dependencies** keeps the dependency graph honest: the shell has no Resource Forge domain knowledge until a later slice deliberately adds `@resource-forge/core` (or other packages).
3. **Pure `run` + thin bin** makes unit testing deterministic without subprocesses and prevents `process.exit` from leaking into command logic.
4. **Empty internal registry** preserves an extension seam for M5.2+ without publishing a registration API prematurely.
5. **No config/discovery** prevents an implicit project model; the first command that needs discovery can introduce it with concrete justification.
6. **Tiny custom runner** matches the deliberately tiny grammar better than adopting a general CLI framework in M5.1.
7. **Exit `0` / `1` / `2`** follows common CLI convention without over-specifying sysexits-style taxonomies.

## 9. Relationships

| Artifact | Relationship |
| --- | --- |
| M1 repository foundation | Relied upon for monorepo package slot `@resource-forge/cli` |
| RFC-001–RFC-035 | **Independent** — not consumed; not reinterpreted |
| Roadmap M5 | Opens with M5.1 only; candidate commands remain non-committed |
| M5.2 validate/doctor (candidate) | Expected first semantic commands; may add `@resource-forge/cli → @resource-forge/core` |
| Later generator / integration CLI slices | Deferred |
| `from-prisma` | Deferred until separately Accepted Prisma reverse-generation RFCs |

## 10. Acceptance criteria (for this specification)

This specification may move from **Draft** to **Accepted** after Design Review (M3) when:

1. Scope is shell-only; product commands and discovery/config are explicitly fenced.
2. `run` argv/result contract and exit-code table are normative and unambiguous.
3. Zero `@resource-forge/*` dependencies are required for M5.1.
4. Testing contract centers on `run()`, not subprocess.
5. `run()` MUST NOT perform process I/O or process termination (stated as an acceptance criterion, not only implied).
6. M5.2+ command/discovery/generator/example work is deferred explicitly.
7. CLI surface and package API are distinguished (§3.2 vs §3.3).

## 11. Explicit deferrals / follow-ons

1. **M5.2** — thin `validate` / `doctor` against Accepted core contracts (candidate).
2. Generator commands and Nest/GraphQL/Prisma CLI wiring (candidate; each needs its own Accepted design).
3. Project config and discovery (only when a command provides a concrete reason).
4. `examples/basic` end-to-end integration application.
5. `from-prisma` / reverse generation.
6. Public command-registration API or plugin system.
7. Expanding the parser beyond `rf [global-options] [command]`.
