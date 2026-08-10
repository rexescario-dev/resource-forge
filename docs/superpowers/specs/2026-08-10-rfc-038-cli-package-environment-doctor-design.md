# RFC-038: CLI Package Environment Doctor

**Date:** 2026-08-10  
**Status:** Draft  
**Package:** `@resource-forge/cli` (registers `doctor`; continues to depend on `@resource-forge/core` as established by RFC-037)  
**Tracking:** [#128](https://github.com/rexescario-dev/resource-forge/issues/128)  
**Depends on:** [RFC-036 CLI Foundation](2026-08-10-rfc-036-cli-foundation-design.md) (**Accepted**) for `rf` / `run(argv)` / exit `0/1/2` / bin adapter / internal command registry; [RFC-037 CLI Resource Validation](2026-08-10-rfc-037-cli-resource-validation-design.md) (**Accepted**) for the existing `validate` product command and the allowed `@resource-forge/cli → @resource-forge/core` dependency  
**Followed by:** M5.3 implementation planning/delivery for `#128` after Accept; later project/workspace doctor, stdin UX, generators, discovery/config, Nest/GraphQL/Prisma CLI wiring, and structured diagnostics only under separately Accepted designs  
**Unblocks:** A deterministic `rf doctor` command that answers whether the Resource Forge CLI environment is installed and wired correctly—without inventing discovery, configuration, or Resource validation

**Amends / specializes:** Roadmap **M5 — CLI & examples** with **M5.3 CLI Package Environment Doctor** (`doctor` only as defined here). Extends RFC-036’s internal command registry to register `doctor` alongside `validate`. Reuses RFC-036/037 exit-code vocabulary (`0` / `1` / `2`) with doctor-specific outcome mapping; does **not** change those exit-code meanings or introduce new exit codes. Does **not** reopen RFC-036’s public package API (`run` only), bin stream/exit rules, or RFC-037’s validate semantics. Does **not** amend RFC-001–RFC-035 product contracts. Does **not** commit generators, discovery, project health, or adapter-package probing.

## Primary question

> How should `@resource-forge/cli` expose `rf doctor` so it diagnoses **CLI runtime health and direct `@resource-forge/core` resolvability**, while preserving RFC-036/037 (public `run` only; exit `0/1/2`; no discovery/config; no Resource validation duplication)?

## Thesis

RFC-038 locks M5.3 as **CLI Package Environment Doctor**:

- **`doctor` answers:** “Is the Resource Forge CLI environment installed and wired correctly?”
- **`doctor` does not answer:** “Is my project healthy?” or “Are my Resources valid?”
- **`rf doctor` executing successfully establishes that the CLI entrypoint itself can load.** Doctor does **not** separately claim to prove an independent “CLI package loads” condition.
- **Meaningful checks:** package-local CLI version produces a non-empty string; internal registry includes `validate` and `doctor`; `@resource-forge/core` is dynamically resolvable/importable (resolvability only—**no** export assertions).
- **`run` is the public TypeScript API**, not a registered CLI command. Doctor MUST NOT treat `run` as a registry entry to verify.
- **`run(argv)` remains the sole public package API.** `run(['doctor'])` is the integration path. No `run(argv, opts)`.
- **Zero positionals.** Argv gate before any health probes. Collect-all isolated checks after a well-formed invocation.
- **Exit mapping:** `0` healthy (report on stdout); `1` expected health failure (report on stdout) or unexpected internal failure (stderr); `2` usage. No new exit codes; no reinterpretation of RFC-036/037 meanings.

```text
CLI surface:
  rf doctor
  (+ RFC-036 builtins / unknown-command / invalid-global-argv)
  (+ RFC-037 rf validate <file>)

Package API (unchanged):
  run(argv) → { exitCode, stdout, stderr }

rf (bin adapter)
      │
      │ argv
      ▼
run(argv)
      │
      ▼
registry: validate | doctor
      │
      ▼
doctor handler
      │
      ├─ argv gate (arity / options) → exit 2; no probes
      └─ collect-all isolated checks:
            version | registry | core import
      │
      ▼
{ exitCode, stdout, stderr }
      │
      ▼
bin writes streams / sets exit
```

## 1. Scope

### 1.1 Goals

1. Define M5.3 as CLI/package environment health via `doctor` only (as specified here).
2. Lock CLI surface `rf doctor` with **zero** tokens after the command.
3. Lock composition: bin → `run` → doctor handler → argv gate → collect-all isolated checks → report → exit mapping.
4. Lock checks: non-empty package-local CLI version; registry contains `validate` and `doctor`; dynamic resolve/import of `@resource-forge/core` succeeds without asserting particular exports.
5. Reuse RFC-036/037 exit `0/1/2` with the doctor outcome table in §6; do not change those meanings or invent new codes.
6. Preserve public package API: sole normative export remains `run`.
7. Fence discovery, config, stdin, Resource validation, Nest/GraphQL/Prisma/workspace probing, generators, structured diagnostics, and `run(argv, opts)`.
8. Lock a testing contract centered on `run(['doctor'])` plus an internal-only seam for simulating core-resolve failure.

### 1.2 Non-goals

This RFC does not define:

1. Project, workspace, or repository health checks
2. Resource discovery, config loading, filesystem scanning, globbing, or stdin
3. Resource validation (that remains `validate` / `@resource-forge/core`)
4. Probing `@resource-forge/nest`, `@resource-forge/graphql`, `@resource-forge/prisma`, or enumerating monorepo workspace packages
5. Generators (`init`, `generate`, `from-prisma`, …)
6. Structured / JSON diagnostic report formats
7. Public health-probe APIs or `run(argv, opts)` / dependency-injection surfaces
8. Treating `run` as a registered CLI command
9. Changes to the RFC-036/037 exit-code meanings or introduction of new exit codes
10. Changes to RFC-001–RFC-037 product contracts beyond registering `doctor` and specializing CLI doctor outcomes as specified here
11. Command-specific `rf doctor --help` as a committed UX (deferred; short stderr usage on arity errors is sufficient)
12. A general-purpose positional/option argument framework for all future commands

### 1.3 Informative only

- Exact human-readable report prose is implementation-owned, except that check **identities/labels** and pass/fail **statuses** used for the three normative checks MUST be stable enough for tests to assert without brittle full-output snapshots.
- Exact TypeScript file layout and internal helper names are implementation-owned.
- How dynamic import is expressed (e.g. `import('@resource-forge/core')` vs equivalent resolve) is implementation-owned so long as the check is resolvability-only.

## 2. Terminology

| Term | Meaning |
| --- | --- |
| CLI surface | User-facing invocations of `rf`, including `rf doctor` |
| Package API | Normative TypeScript export surface of `@resource-forge/cli` — solely `run` (unchanged from RFC-036) |
| `doctor` | Registered product command that reports CLI/package environment health |
| Health check | One isolated probe producing pass or fail without aborting sibling checks |
| Collect-all | After a well-formed doctor invocation, all normative checks run even if earlier checks fail |
| Core resolvability | Dynamic resolve/import of `@resource-forge/core` succeeds; **not** an export/API compatibility contract |
| Expected health failure | One or more normative checks fail after a well-formed doctor invocation |
| Unexpected internal failure | Unexpected throwable in the runner/command path (RFC-036 exit `1`, message on stderr) |
| Usage failure | Bad arity or undefined post-command options for `doctor` (exit `2`) |

## 3. Package and surfaces

### 3.1 Package boundary

1. Product surface for this slice remains `@resource-forge/cli`.
2. The package MAY continue to depend on `@resource-forge/core` (already allowed by RFC-037). Doctor’s core check is resolvability of that direct dependency.
3. The package MUST NOT depend on `@resource-forge/nest`, `@resource-forge/graphql`, or `@resource-forge/prisma` for M5.3 doctor.
4. Doctor MUST NOT probe Nest/GraphQL/Prisma packages or enumerate workspace packages.

### 3.2 Public package API

1. The sole normative public export remains `run(argv) → { exitCode, stdout, stderr }`.
2. Doctor handlers, check helpers, registry inspection, and core-probe seams MUST NOT become public package API in M5.3.
3. M5.3 MUST NOT introduce `run(argv, opts)` or any generalized injection API on `run`.

### 3.3 CLI surface

| Invocation | Result |
| --- | --- |
| `rf doctor` | Run health checks; report on stdout; exit `0` or `1` |
| `rf doctor` with extra positionals | Error on **stderr**, exit `2` |
| `rf doctor` with undefined post-command options | Error on **stderr**, exit `2` |
| RFC-036 `--help` / `--version` / unknown command / invalid global argv | Unchanged |

1. M5.3 MUST register `doctor` in the internal command registry (alongside `validate`).
2. `CommandRegistry` remains non-public. M5.3 MUST NOT introduce a public command-registration API.
3. Global `--help` / `--version` handling remains RFC-036 (e.g. `--help doctor` → help, not doctor).

## 4. Argv contract

1. After the `doctor` command token, there MUST be **zero** remaining tokens for a well-formed invocation.
2. Extra positional arguments → exit `2`.
3. Options after `doctor` are rejected in M5.3 (exit `2`) unless a later Accepted RFC defines specific ones.
4. **Argument parsing / argv gate MUST complete before any health probes.** Invalid invocations MUST NOT partially execute checks before returning `2`.

## 5. Health checks

After a well-formed `doctor` invocation, M5.3 MUST run **all** of the following checks (**collect-all**), each **isolated** so a failure in one does not prevent the others from producing a pass/fail result:

### 5.1 Version

1. Using the existing package-local CLI version source (RFC-036 / M5.1), produce a **non-empty** version string.
2. Empty or unavailable version → check **fail**.
3. This MUST NOT invent a new version discovery mechanism (no reading arbitrary `package.json` paths via project discovery).

### 5.2 Registry

1. The internal command registry MUST contain handlers for `validate` and `doctor`.
2. Absence of either → check **fail**.
3. Doctor MUST NOT require `run` to appear in the command registry (`run` is the public TypeScript API, not an argv command).

### 5.3 Core resolvability

1. Dynamically resolve/import `@resource-forge/core` successfully.
2. Success means the package is resolvable in the CLI runtime; M5.3 MUST NOT assert particular named exports or create a new core API compatibility contract.
3. Resolve/import failure → check **fail**.

### 5.4 Entrypoint tautology

`rf doctor` (or `run(['doctor'])`) reaching the doctor handler already demonstrates that the CLI entrypoint can load. M5.3 MUST NOT present a separate normative “CLI package loads” check as if it were independent of doctor execution.

## 6. Exit codes and streams

Reuses RFC-036/037 exit vocabulary without changing meanings or inventing new codes:

| Outcome | Exit | Streams |
| --- | ---: | --- |
| Well-formed doctor; all checks pass | `0` | Deterministic human report → **stdout**; stderr empty |
| Well-formed doctor; one or more checks fail (expected health failure) | `1` | Same report shape → **stdout** (failed checks marked); stderr empty |
| Unexpected internal failure | `1` | Message → **stderr** (RFC-036) |
| Extra positionals / undefined post-command options | `2` | Message → **stderr** |
| Unknown command / invalid global argv | `2` | Unchanged (RFC-036) |

Normative meaning for scripts:

1. **Exit `0`** — well-formed doctor; all normative checks passed.
2. **Exit `1`** — either (a) well-formed doctor with one or more expected health-check failures (report on stdout), or (b) unexpected internal failure (message on stderr). Distinguishing (a) vs (b) is by stream/report shape, not a fourth exit code.
3. **Exit `2`** — usage failure for `doctor`, or unchanged RFC-036 usage/unknown-command cases.

No structured/JSON diagnostic output in M5.3.

## 7. Output contract

1. For well-formed doctor invocations, stdout MUST carry a human-readable report covering all three normative checks.
2. Check **identities/labels** and pass/fail **statuses** MUST be deterministic and stable enough for tests.
3. Exact prose wording is non-normative.
4. Tests SHOULD assert labels/statuses, exit codes, and stream placement—not brittle full-output snapshots.

## 8. Testing contract

1. Normative CLI behavior remains centered on `run(argv)`.
2. Required coverage at Accept/implementation time includes:
   - `run(['doctor'])` healthy → exit `0`, report on stdout with stable labels/statuses for version, registry, and core
   - simulated core-resolve failure via **internal-only** seam → exit `1`, report still includes all checks (collect-all), core marked fail
   - extra positionals / undefined options → exit `2` on stderr; **no** probe side effects
   - `--help doctor` (or equivalent RFC-036 help precedence) → help, not doctor
   - unknown command still exit `2` (RFC-036 regression)
3. M5.3 MAY provide an internal-only test seam to simulate core-resolve failure. That seam MUST NOT be public package API and MUST NOT be expressed as `run(argv, opts)`.
4. Subprocess `rf` smoke tests remain optional.

## 9. Invariants

1. M5.3 MUST register `doctor` as specified; MUST NOT register generators or other roadmap candidates.
2. M5.3 MUST NOT perform discovery, config loading, workspace inference, globbing, stdin reads, or Resource validation.
3. Public package API MUST remain `run` only.
4. Doctor MUST NOT probe Nest/GraphQL/Prisma or enumerate workspace packages.
5. Core check MUST be resolvability-only (no export contract).
6. Exit codes MUST stay within `0` / `1` / `2` as mapped in §6; M5.3 MUST NOT change RFC-036/037 exit-code meanings.
7. Argv gate MUST precede probes; checks MUST be collect-all and isolated.
8. `run` MUST NOT write process streams or call `process.exit`.
9. `@resource-forge/cli` MUST NOT gain nest/graphql/prisma dependencies for this slice.

## 10. Rationale

1. **Doctor after validate** — RFC-037 deferred doctor until environment questions could be scoped; M5.3 answers CLI/package health without inventing project discovery.
2. **CLI + direct core only** — doctor validates dependencies the CLI itself requires, not the wider monorepo.
3. **Resolvability-only core probe** — avoids accidental core API compatibility contracts.
4. **Entrypoint tautology made explicit** — prevents a fake independent “CLI loads” check.
5. **Collect-all isolated checks** — one invocation yields full diagnostic value.
6. **Exit `1` for health failure vs `2` for usage** — mirrors validate’s well-formed vs usage distinction without new codes.
7. **Internal seam, not `run(argv, opts)`** — preserves RFC-036 public API while enabling unhealthy fixtures.
8. **`run` not in registry** — keeps TypeScript API and argv commands distinct.

## 11. Relationships

| Artifact | Relationship |
| --- | --- |
| RFC-036 CLI Foundation | **Extended** — registry gains `doctor`; exit table specialized for doctor outcomes; public `run` / bin / `0/1/2` vocabulary preserved |
| RFC-037 CLI Resource Validation | **Relied upon / coexists** — `validate` remains; doctor does not duplicate Resource validation; core dependency already allowed |
| RFC-001–RFC-035 | Not reopened |
| Roadmap M5 | Opens M5.3 as CLI/package environment doctor; project doctor / generators remain candidates |
| Later project doctor / discovery / generators / structured diagnostics | Deferred |

## 12. Acceptance criteria (for this specification)

This specification may move from **Draft** to **Accepted** after Design Review (M3) when:

1. Scope is CLI/package environment `doctor` only; project health, discovery, config, Resource validation, and adapter/workspace probing are explicitly fenced.
2. Composition (`run` → argv gate → collect-all isolated checks → report → exit mapping) is unambiguous.
3. Public API remains `run` only; no `run(argv, opts)`; no public probe API.
4. Argv contract is zero tokens after `doctor`.
5. Normative checks are version (non-empty package-local string), registry (`validate` + `doctor`), and core resolvability (no export assertions), with entrypoint tautology stated.
6. Exit mapping for healthy / expected health failure / usage / unexpected internal is normative and compatible with RFC-036/037 `0/1/2` meanings (no new codes; no reinterpretation).
7. Testing contract centers on `run(['doctor'])` plus optional internal core-failure seam.
8. Nest/GraphQL/Prisma CLI deps and workspace enumeration remain forbidden for this slice.

## 13. Explicit deferrals / follow-ons

1. Project / workspace / repository doctor.
2. Structured / machine-readable diagnostic reports.
3. stdin and discovery/config models.
4. Generators and Nest/GraphQL/Prisma CLI wiring.
5. Command-specific `doctor --help` UX polish.
6. General-purpose CLI argument/parser framework or public plugin registry.
7. Probing packages beyond `@resource-forge/core`.
