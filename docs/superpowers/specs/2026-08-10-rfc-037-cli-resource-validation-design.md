# RFC-037: CLI Resource Validation

**Date:** 2026-08-10  
**Status:** Accepted  
**M3:** Accepted (2026-08-10) — Design Review; no design blockers. Locked: `validate` only (`doctor` deferred); `rf validate <file>` with exactly one command-local positional; `run(['validate', path])` sole integration path; bin stream/exit-only (no validate pre-read); command-local filesystem adapter (no `run` FS DI); internal pure `validateResourceDocument` (JSON decode + `validateResource`, no exit/stream mapping); public API remains `run` only; `@resource-forge/cli → @resource-forge/core` allowed; exit `0` valid / `1` semantic or unexpected / `2` input/decode (incl. RFC-036 usage); discovery/config/stdin/structured diagnostics/Nest/GraphQL/Prisma CLI/generators fenced; testing centered on `run(['validate', …])`. M4 (implementation planning) authorized for `#124`.  
**Package:** `@resource-forge/cli` (first semantic command; may depend on `@resource-forge/core`)  
**Tracking:** [#124](https://github.com/rexescario-dev/resource-forge/issues/124)  
**Depends on:** [RFC-036 CLI Foundation](2026-08-10-rfc-036-cli-foundation-design.md) (**Accepted**) for `rf` / `run(argv)` / exit `0/1/2` / bin adapter / internal command registry; Accepted `@resource-forge/core` Resource contracts culminating in `validateResource` ([RFC-005](2026-08-07-rfc-005-resource-model-design.md) and amending RFCs through the Accepted Resource validation surface)  
**Followed by:** M5.2 implementation planning/delivery for `#124` after Accept; later `doctor`, stdin UX, generators, discovery/config, and Nest/GraphQL/Prisma CLI wiring only under separately Accepted designs  
**Unblocks:** A thin, deterministic `rf validate <file>` command that exposes Accepted core Resource validation without inventing project models, discovery, or new core semantics

**Amends / specializes:** Roadmap **M5 — CLI & examples** with **M5.2 CLI Resource Validation** (`validate` only). Extends RFC-036’s internal command registry and narrow argv grammar **only** as required for `validate`’s single required positional; specializes command execution so registered handlers may perform **command-local** explicit-path filesystem reads inside `run`’s dispatch (bin remains stream/exit-only; no generalized `run` I/O API; no discovery). Does **not** reopen RFC-036’s public package API (`run` only), bin stream/exit rules, or exit-code vocabulary (`0` / `1` / `2`). Does **not** amend RFC-001–RFC-035 product validation semantics. Does **not** commit `doctor` or other roadmap candidate commands.

## Primary question

> How should `@resource-forge/cli` expose a thin `validate` command that checks an explicitly named JSON Resource document against Accepted `@resource-forge/core` contracts—without inventing discovery, config, stdin, a second public validation API, or new core semantics?

## Thesis

RFC-037 locks M5.2 as **CLI Resource Validation**:

- **`validate` is the first semantic CLI command.** `doctor` and all other product commands remain deferred.
- **CLI owns invocation; core owns semantics.** The CLI acquires exactly the Resource the user names, maps outcomes to RFC-036 exit codes/streams, and delegates semantic validation to `validateResource`.
- **`run(argv)` remains the sole public package API and the single CLI execution seam.** `run(['validate', path])` is the real integration path.
- **Filesystem I/O is command-local**, not a generalized `run` dependency-injection surface. No `run(argv, opts)` / `{ fs }` API.
- **Document validation is an internal pure seam** (`validateResourceDocument(jsonText)`): JSON decode + `validateResource`. It is **not** a public host API.
- **No discovery/project model.** Exactly one explicit path positional; no globbing, walking, workspace inference, config loading, or stdin.

```text
CLI surface:
  rf validate <file>
  (+ RFC-036 builtins / unknown-command / invalid-global-argv)

Package API (unchanged):
  run(argv) → { exitCode, stdout, stderr }

rf (bin adapter)
      │
      │ argv
      ▼
run(argv)
      │
      ▼
registry: validate
      │
      ▼
validate handler
      │
      │ command-local readFile(path)
      ▼
validateResourceDocument(jsonText)   # internal, pure
      │
      ├─ JSON decode
      └─ validateResource(...)       # @resource-forge/core
      │
      ▼
{ exitCode, stdout, stderr }
      │
      ▼
bin writes streams / sets exit
```

## 1. Scope

### 1.1 Goals

1. Define M5.2 as the first semantic CLI command: `validate` only.
2. Lock CLI surface `rf validate <file>` with exactly one required positional path argument.
3. Lock composition: bin → `run` → validate handler → command-local file read → internal pure document validation → `validateResource`.
4. Allow `@resource-forge/cli` to depend on `@resource-forge/core` for `validateResource` (and types needed to call it).
5. Extend RFC-036 exit mapping for validate outcomes without inventing new exit codes.
6. Preserve RFC-036 public API: sole normative export remains `run`.
7. Fence discovery, config, stdin, `doctor`, structured diagnostics, Nest/GraphQL/Prisma CLI wiring, generators, and new core validation semantics.
8. Lock a testing contract centered on `run(['validate', …])` plus internal unit coverage of the pure document seam.

### 1.2 Non-goals

This RFC does not define:

1. `doctor` or environment/install health checks
2. stdin input (`rf validate < document.json` deferred)
3. Project configuration files or configuration loading
4. Project/resource discovery, repository/workspace inference, filesystem scanning, or glob expansion
5. New or amended validation semantics in `@resource-forge/core`
6. Nest / GraphQL / Prisma CLI wiring or consumption of those packages
7. Generators (`init`, `generate`, `from-prisma`, …)
8. A public `validateResourceDocument` (or equivalent) host API from `@resource-forge/cli`
9. Generic `run(argv, { fs })` / dependency-injection filesystem ports
10. A general-purpose positional/option argument framework for all future commands
11. Structured / JSON diagnostic report formats
12. Command-specific `rf validate --help` as a committed UX (deferred; short stderr usage on arity errors is sufficient)
13. Changes to RFC-001–RFC-035 product contracts beyond consuming Accepted `validateResource`

### 1.3 Informative only

- Exact stderr/stdout human wording is implementation-owned except where this RFC requires distinguishability of error classes (input/decode vs semantic failure) where practical.
- Exact TypeScript file layout and internal helper names are implementation-owned.
- Whether successful validation prints a minimal human OK line on stdout or remains quiet is implementation-owned; failure MUST NOT write success-oriented stdout content.

## 2. Terminology

| Term | Meaning |
| --- | --- |
| CLI surface | User-facing invocations of `rf`, including `rf validate <file>` |
| Package API | Normative TypeScript export surface of `@resource-forge/cli` — solely `run` (unchanged from RFC-036) |
| `validate` | Registered product command that validates one explicit JSON Resource document |
| Command-local positional | Exactly one required path token after `validate`; not a general positional framework |
| Command-local filesystem adapter | Tiny module/helper used only by the validate handler to read the explicit path |
| `validateResourceDocument` | Internal pure transformation from JSON text to a decoded Resource-validation result. Performs JSON decoding and delegates semantic validation to `validateResource`; does not perform CLI exit/stream mapping. **Not** public API |
| Input/decode failure | The CLI cannot produce a Resource candidate suitable for semantic validation because of bad arity, file acquisition failure, malformed JSON, or non-object JSON |
| Semantic validation failure | A Resource candidate was decoded as a JSON object and `validateResource` returned `err` |
| Unexpected internal failure | Unexpected throwable in the runner/command path (RFC-036 exit `1`) |

## 3. Package and surfaces

### 3.1 Package boundary

1. Product surface for this slice remains `@resource-forge/cli`.
2. The package **MAY** depend on `@resource-forge/core` to call `validateResource` (and related Accepted types).
3. The package MUST NOT depend on `@resource-forge/nest`, `@resource-forge/graphql`, or `@resource-forge/prisma` in M5.2.
4. No third-party CLI framework is required; prefer extending the RFC-036 custom runner.

### 3.2 CLI surface (normative)

| Invocation | Result |
| --- | --- |
| `rf validate <file>` | Validate the named JSON Resource document (see §5) |
| `rf validate` (missing path) | Error on **stderr**, exit `2` |
| `rf validate <a> <b>` (extra positionals) | Error on **stderr**, exit `2` |
| `rf validate` with undefined post-command options | Error on **stderr**, exit `2` |
| RFC-036 builtins / unknown command / invalid global argv | Unchanged from RFC-036 |

Root `--help` MAY list `validate` (informative). Exact help prose is not normative.

### 3.3 Package API (normative)

Unchanged from RFC-036:

```ts
run(argv: readonly string[]): {
  exitCode: number;
  stdout: string;
  stderr: string;
}
```

1. `run` remains the **sole** normative public export.
2. `validateResourceDocument`, validate handlers, filesystem adapters, argv helpers, and result mappers MUST NOT become public package API in M5.2.
3. `run` MUST NOT write to process streams or terminate the process (RFC-036).
4. `run(['validate', path])` is the normative integration path for the validate command.

### 3.4 Bin adapter

Unchanged from RFC-036 for process streams and termination: invoke `run`, write returned streams, terminate with `exitCode`.

Bin MUST remain a stream/exit adapter only. It MUST invoke `run(argv)` without special-casing `validate`; validate filesystem acquisition occurs inside the registered validate command handler via its command-local adapter. The bin MUST NOT pre-read the path.

### 3.5 CommandRegistry (non-public)

1. M5.2 MUST register `validate` in the internal command registry.
2. Registered commands MUST dispatch to their handlers (MUST NOT fall through to root help merely because a command token is present).
3. `CommandRegistry` remains non-public. M5.2 MUST NOT introduce a public command-registration API.
4. Only `validate` is registered for product commands in this slice.

## 4. Argv grammar for `validate`

### 4.1 Command-local positional

```text
rf [global-options] validate <file>
```

1. After the `validate` command token, exactly **one** required positional argument `file` MUST be present.
2. `file` is interpreted **literally** as a filesystem path (no glob expansion, no implicit directory walking, no project inference).
3. Global options (`--help`, `--version`) remain governed by RFC-036 when they appear in positions RFC-036 already defines. Unknown commands remain RFC-036.
4. Options after `validate` are rejected in M5.2 (exit `2`) unless a later Accepted RFC defines specific ones.
5. Extra positional arguments after `file` → exit `2`.
6. Missing `file` → exit `2`.
7. M5.2 MUST NOT introduce a general-purpose positional/option framework for arbitrary future commands. Future commands may define their own command-local contracts under their own RFCs.

### 4.2 Parser evolution relative to RFC-036

RFC-036’s M5.1 runner recognized `rf [global-options] [command]` and, with an empty registry, never dispatched product handlers. M5.2 MUST:

1. Register and dispatch `validate`.
2. Consume validate’s single required positional after the command token.
3. Reject surplus tokens for `validate` with exit `2`.

This is a **narrow, command-local** grammar extension—not a general parser redesign.

## 5. Validation pipeline

### 5.1 Composition (normative)

```text
run(['validate', path])
  → validate handler
  → command-local read of path → jsonText | input/decode error
  → validateResourceDocument(jsonText)   # internal, pure
       → JSON.parse
       → require JSON object (non-null object; not array)
       → validateResource(candidate)
  → map to { exitCode, stdout, stderr }
```

### 5.2 `validateResourceDocument` (internal)

`validateResourceDocument` is an internal pure transformation from JSON text to a decoded Resource-validation result. It performs JSON decoding and delegates semantic validation to `validateResource`; it does not perform CLI exit/stream mapping.

1. MUST be pure with respect to its string input (no filesystem, process exit, or stream writes).
2. MUST parse JSON text.
3. MUST reject non-object JSON values (including arrays and `null`) as **input/decode** failures (exit `2` when surfaced through `run`).
4. MUST pass object candidates to `validateResource` from `@resource-forge/core`.
5. MUST NOT invent Resource validation rules beyond what `validateResource` already enforces.
6. MUST NOT be exported as public package API in M5.2.

### 5.3 Filesystem adapter (command-local)

1. Only the validate handler may read the explicit path (after `run` dispatch; not in the bin).
2. The adapter MUST read only the supplied path (no scanning, no fallback paths, no config lookup).
3. Missing or unreadable files are input/decode failures (exit `2`).
4. M5.2 MUST NOT introduce `run(argv, { fs })` or any generalized filesystem injection API on `run`.

### 5.4 Semantic authority

1. `@resource-forge/core` `validateResource` is authoritative for Resource validity.
2. CLI presentation of `Result` errors is informative; it MUST NOT reinterpret Accepted core error semantics into new product rules.
3. Hosts that need programmatic validation continue to use `@resource-forge/core` directly.

## 6. Exit codes and streams

Extends RFC-036 §5 without new exit codes:

| Outcome | Exit | Streams |
| --- | ---: | --- |
| Valid Resource (`validateResource` ok) | `0` | stdout quiet or minimal OK (informative); no failure text |
| Semantic validation failure (`validateResource` err) | `1` | message → **stderr**; no success stdout |
| Unexpected internal failure | `1` | message → **stderr** (RFC-036) |
| Missing/extra path; undefined post-command options | `2` | message → **stderr** |
| Missing/unreadable file | `2` | message → **stderr** |
| Invalid JSON / non-object JSON | `2` | message → **stderr** |
| Unknown command / invalid global argv | `2` | unchanged (RFC-036) |

Normative meaning for scripts:

1. **Exit `0`** — validation succeeded.
2. **Exit `1`** — command/runner failure after the shell accepted a well-formed validate invocation that obtained a JSON object candidate: either the Resource violates Accepted core contracts, or an unexpected internal failure occurred. Distinguishing those two is by stderr text only; M5.2 does not invent a fourth exit code.
3. **Exit `2`** — usage / input/decode failure: the CLI cannot produce a Resource candidate suitable for semantic validation (including RFC-036 usage errors, bad arity, missing/unreadable file, malformed JSON, or non-object JSON).

Exact wording is non-normative except that, where practical, input/decode failures and semantic validation failures SHOULD be distinguishable on stderr.

No structured/JSON diagnostic output in M5.2.

## 7. Testing contract

1. Normative CLI behavior remains centered on `run(argv)`.
2. Required coverage at Accept/implementation time includes:
   - `run(['validate', fixturePath])` success → exit `0`
   - semantic invalid fixture → exit `1` on stderr
   - missing path / extra positionals → exit `2`
   - missing/unreadable file → exit `2`
   - invalid JSON / non-object JSON → exit `2`
   - unknown command still exit `2` (RFC-036 regression)
3. Internal unit tests MAY cover `validateResourceDocument` directly within the package (without exporting it).
4. Subprocess `rf` smoke tests remain optional.

## 8. Invariants

1. M5.2 MUST register only `validate` as a product command (`doctor` and others deferred).
2. M5.2 MUST NOT perform discovery, config loading, workspace inference, globbing, or stdin reads.
3. Public package API MUST remain `run` only.
4. Filesystem I/O for validate MUST remain command-local; MUST NOT become a generic `run` I/O API.
5. Semantic Resource validity MUST be decided solely by Accepted `validateResource` (no new core rules in the CLI).
6. Exit codes MUST stay within `0` / `1` / `2` as mapped in §6.
7. `run` MUST NOT write process streams or call `process.exit`.
8. `@resource-forge/cli` MUST NOT depend on nest/graphql/prisma packages in this slice.

## 9. Rationale

1. **`validate` before `doctor`** — `validate` hangs on existing core authority; `doctor` would force unresolved project/environment questions.
2. **Explicit path only** — proves the semantic CLI boundary without inventing discovery.
3. **`run` owns argv** — preserves RFC-036’s single executable seam and integration-test story.
4. **Command-local read + pure document seam** — keeps process stream/exit purity at the bin boundary while allowing deterministic unit tests of decode + `validateResource` without a generalized DI port.
5. **`run` only as public API** — `@resource-forge/core` remains the host validation API; the CLI is the command execution API.
6. **Reuse exit `0/1/2`** — scripts get input/decode vs semantic-or-internal failure distinction without expanding the vocabulary.
7. **No general argument framework** — M5.2 needs one positional for one command; future RFCs can define their own command-local contracts.

## 10. Relationships

| Artifact | Relationship |
| --- | --- |
| RFC-036 CLI Foundation | **Extended** — registry gains `validate`; narrow command-local positional; exit table specialized for validate outcomes; public `run` / bin / `0/1/2` vocabulary preserved |
| RFC-005+ / `validateResource` | **Relied upon** — semantic authority; not reinterpreted |
| RFC-001–RFC-035 (except via core validate) | Not reopened |
| Roadmap M5 | Opens M5.2 as `validate` only; `doctor` remains candidate |
| Later stdin / doctor / generators / discovery | Deferred |

## 11. Acceptance criteria (for this specification)

This specification may move from **Draft** to **Accepted** after Design Review (M3) when:

1. Scope is `validate` only; `doctor`, discovery, config, stdin, and structured diagnostics are explicitly fenced.
2. Composition (`run` → command-local read → internal pure document validation → `validateResource`) is unambiguous.
3. Public API remains `run` only; no `run(argv, opts)` FS DI; no public document helper.
4. Argv contract is exactly one required positional path for `validate`.
5. Exit mapping for success / semantic failure / input/decode failure / unexpected internal is normative and compatible with RFC-036’s `0/1/2`.
6. `@resource-forge/cli → @resource-forge/core` dependency is explicitly allowed; nest/graphql/prisma CLI deps remain forbidden for this slice.
7. Testing contract centers on `run(['validate', …])` plus optional internal pure-seam tests.
8. No new core validation semantics are introduced.

## 12. Explicit deferrals / follow-ons

1. **`doctor`** — environment/project health (needs its own design).
2. **stdin** input for validate.
3. Project config and discovery (only when a command provides concrete justification).
4. Structured / machine-readable diagnostic reports.
5. Public document-level validation API from `@resource-forge/cli`.
6. Command-specific `validate --help` UX polish.
7. Generators and Nest/GraphQL/Prisma CLI wiring.
8. General-purpose CLI argument/parser framework or public plugin registry.
