# RFC-039: CLI Generate Resource

**Date:** 2026-08-10  
**Status:** Accepted  
**M3:** Accepted (2026-08-10) — Design Review; no design blockers. Locked: flat registered `generate` with kind token `resource` only; `rf generate resource <namespace> <name> <path>`; FS prechecks before construction (existing parent directory; destination absent; no mkdir/overwrite/`--force`); core constructors sole construction/defaulting authority (`createResourceIdentity` → `createResource`); mechanical JSON encoding of the **complete** constructed `Resource` value (not CLI field reconstruction); RFC-037 round-trip product guarantee; failure-safe write (no partial destination; temp artifacts cleaned where practicable and never presented as the destination); exit `0` wrote / `1` construction or unexpected/write failure / `2` usage or FS precondition; public API remains `run` only; no `run(argv, opts)`; `init` / other kinds / `from-prisma` / field flags / templates / nested command framework / new packages fenced; doctor registry expectations unchanged (`validate` + `doctor` only); testing centered on `run(['generate', …])` including validate round-trip coverage. M4 (implementation planning) authorized for `#132`.  
**Package:** `@resource-forge/cli` (registers `generate`; continues the `@resource-forge/cli → @resource-forge/core` dependency **allowed by** RFC-037)  
**Tracking:** [#132](https://github.com/rexescario-dev/resource-forge/issues/132)  
**Depends on:** [RFC-036 CLI Foundation](2026-08-10-rfc-036-cli-foundation-design.md) (**Accepted**) for `rf` / `run(argv)` / exit `0/1/2` / bin adapter / internal command registry; [RFC-037 CLI Resource Validation](2026-08-10-rfc-037-cli-resource-validation-design.md) (**Accepted**) for `validate`, the allowed `@resource-forge/cli → @resource-forge/core` dependency, and the JSON Resource document decode path; [RFC-001 Resource Identity](2026-08-06-rfc-001-resource-identity-design.md) (**Accepted**) and Accepted core `createResourceIdentity` / `createResource` contracts for construction authority; [RFC-038 CLI Package Environment Doctor](2026-08-10-rfc-038-cli-package-environment-doctor-design.md) (**Accepted**) as a coexisting product command (doctor registry expectations unchanged)  
**Followed by:** M5.4 implementation planning/delivery for `#132` after Accept; later `rf init`, other `generate` kinds, `from-prisma` / reverse Prisma generation, field flags, templates, `--force`, and directory creation only under separately Accepted designs  
**Unblocks:** A deterministic `rf generate resource` command that writes a **minimal valid JSON Resource document** to an explicit path—without inventing project layout, TypeScript codegen, or CLI-local Resource defaults

**Amends / specializes:** Roadmap **M5 — CLI & examples** with **M5.4 CLI Generate Resource** (`generate` + kind `resource` only as defined here). Extends RFC-036’s internal command registry to register `generate` alongside `validate` and `doctor`. Reuses RFC-036/037 exit-code vocabulary (`0` / `1` / `2`) with generate-specific outcome mapping; does **not** change those exit-code meanings or introduce new exit codes. Does **not** reopen RFC-036’s public package API (`run` only) or bin stream/exit rules. Does **not** reopen RFC-037 validate semantics. Does **not** amend RFC-001–RFC-035 product contracts beyond consuming Accepted core constructors. Does **not** commit `init`, `from-prisma`, other generate kinds, discovery, or project scaffolding.

## Primary question

> How should `@resource-forge/cli` expose `rf generate resource` so it produces a **minimal valid JSON Resource document** at an explicit path, with `@resource-forge/core` as the sole construction authority, while preserving RFC-036/037/038 (`run` only; exit `0/1/2`; no project model)?

## Thesis

RFC-039 locks M5.4 as **CLI Generate Resource**:

- **`generate` answers:** “Create a minimal valid Resource JSON document for this identity at this path.”
- **`generate` does not answer:** “Scaffold my project,” “emit TypeScript,” or “reverse-engineer Prisma.”
- **`generate` is a single registered command.** `resource` is a required **kind positional**, not a nested subcommand tree.
- **Invocation:** `rf generate resource <namespace> <name> <path>` — two identity positionals map 1:1 to Accepted `{ namespace, name }`; path is explicit.
- **Construction authority:** `createResourceIdentity` then `createResource` (or equivalent Accepted core constructors). The CLI MUST NOT invent Resource shape or defaulting rules.
- **Serialization:** mechanical JSON encoding of the **complete** constructed `Resource` value `{ identity, schema, annotations }` — not a CLI-reconstructed subset.
- **Round-trip:** a successfully written document MUST pass the RFC-037 validation path (`rf validate <path>` / `validateResourceDocument`).
- **Filesystem:** fail-closed — existing parent directory required; destination must be absent; no mkdir; no overwrite; no `--force`. FS prechecks run **before** construction.
- **Write safety:** a failed write MUST NOT leave a partially written destination file.
- **`run(argv)` remains the sole public package API.** `run(['generate', 'resource', namespace, name, path])` is the integration path. No `run(argv, opts)`.
- **Exit mapping:** `0` wrote successfully; `1` core construction failure or unexpected internal/write failure; `2` usage or FS precondition refusal. No new exit codes.

```text
CLI surface:
  rf generate resource <namespace> <name> <path>
  (+ RFC-036 builtins / unknown-command / invalid-global-argv)
  (+ RFC-037 rf validate <file>)
  (+ RFC-038 rf doctor)

Package API (unchanged):
  run(argv) → { exitCode, stdout, stderr }

rf (bin adapter)
      │
      │ argv
      ▼
run(argv)
      │
      ▼
registry: validate | doctor | generate
      │
      ▼
generate handler
      │
      ├─ argv gate (kind + three positionals; no options) → exit 2
      ├─ FS prechecks (parent directory; destination absent) → exit 2
      ├─ createResourceIdentity → createResource
      ├─ encode complete Resource → JSON text
      └─ failure-safe write to path
      │
      ▼
{ exitCode, stdout, stderr }
      │
      ▼
bin writes streams / sets exit
```

## 1. Scope

### 1.1 Goals

1. Define M5.4 as CLI generate of a **minimal valid JSON Resource document** via kind `resource` only.
2. Lock CLI surface `rf generate resource <namespace> <name> <path>`.
3. Lock composition: bin → `run` → generate handler → argv gate → FS prechecks → core construction → mechanical encode → failure-safe write → exit mapping.
4. Lock `@resource-forge/core` as sole construction/defaulting authority (`createResourceIdentity`, `createResource`).
5. Lock serialization as encoding of the complete constructed `Resource` value, with RFC-037 round-trip compatibility.
6. Lock fail-closed filesystem preconditions (existing parent; absent destination; no mkdir/overwrite/`--force`).
7. Reuse RFC-036/037 exit `0/1/2` with the generate outcome table in §7; do not change those meanings or invent new codes.
8. Preserve public package API: sole normative export remains `run`.
9. Fence `init`, other generate kinds, `from-prisma`, field flags, templates, interactive prompts, TypeScript codegen, discovery/config, Nest/GraphQL/Prisma CLI wiring, new packages, and `run(argv, opts)`.
10. Lock a testing contract centered on `run(['generate', …])`, including implementation-required validate round-trip **coverage** for the §6 product guarantee.

### 1.2 Non-goals

This RFC does not define:

1. `rf init` or any project/scaffold layout
2. Other `generate` kinds (including stubs that print “not implemented”)
3. `rf generate from-prisma` or any Prisma → Resource reverse generation
4. Field flags, templates, stdin, or interactive wizards
5. TypeScript / Nest / GraphQL / Prisma code generation
6. Default namespaces, compound `namespace/name` parsing, or identity shortcuts
7. `--force`, overwrite, or parent-directory creation
8. A general nested-command framework or public command-registration API
9. A new public `@resource-forge/core` serialize/export API
10. Public generate helpers beyond `run`
11. Changes to RFC-036/037/038 exit-code meanings or introduction of new exit codes
12. Changes to RFC-001–RFC-035 product contracts beyond consuming Accepted constructors
13. Command-specific `rf generate --help` as a committed UX (deferred; short stderr usage on arity/kind errors is sufficient)
14. A general-purpose positional/option argument framework for all future commands

### 1.3 Informative only

- Exact stderr wording is implementation-owned except that usage/FS refusals and construction failures SHOULD be distinguishable where practical.
- Exact TypeScript file layout and internal helper names are implementation-owned.
- JSON pretty-print, trailing newline, and key order are implementation-owned so long as §6 holds.
- The concrete failure-safe write strategy (e.g. write-temp-then-rename) is implementation-owned so long as §5.3 holds.

## 2. Terminology

| Term | Meaning |
| --- | --- |
| CLI surface | User-facing invocations of `rf`, including `rf generate resource …` |
| Package API | Normative TypeScript export surface of `@resource-forge/cli` — solely `run` (unchanged from RFC-036) |
| `generate` | Registered product command that emits generated artifacts under a kind token |
| Kind token | First positional after `generate`; this RFC locks only `resource` |
| Resource document | JSON object encoding a `Resource` as consumed by RFC-037 (`identity`, `schema`, `annotations`) |
| Minimal valid Resource | Result of successful Accepted core construction for the given identity (empty schema/annotations as core defines) |
| Mechanical encoding | JSON serialization of the complete constructed `Resource` value without CLI-local reconstruction or defaulting |
| Usage failure | Bad argv for `generate` (arity, unknown kind, undefined options) — exit `2` |
| FS precondition refusal | Parent missing/not a directory, or destination already exists — exit `2` |
| Core construction failure | Accepted core constructors reject the identity/Resource — exit `1` |
| Unexpected internal failure | Unexpected throwable or failed write after prechecks — exit `1` (RFC-036) |

## 3. Package and surfaces

### 3.1 Package boundary

1. Product surface for this slice remains `@resource-forge/cli`.
2. `@resource-forge/cli` continues the `@resource-forge/core` dependency **allowed by** RFC-037.
3. The package MUST NOT depend on `@resource-forge/nest`, `@resource-forge/graphql`, or `@resource-forge/prisma` for M5.4 generate.
4. M5.4 MUST NOT introduce a new workspace package for codegen.

### 3.2 Public package API

1. The sole normative public export remains `run(argv) → { exitCode, stdout, stderr }`.
2. Generate handlers, FS helpers, and encode helpers MUST NOT become public package API in M5.4.
3. M5.4 MUST NOT introduce `run(argv, opts)` or any generalized injection API on `run`.

### 3.3 CLI surface

| Invocation | Result |
| --- | --- |
| `rf generate resource <namespace> <name> <path>` | Construct, encode, write; exit `0` or mapped failure |
| Unknown kind after `generate` | Error on **stderr**, exit `2` |
| Missing/extra positionals or undefined post-command options | Error on **stderr**, exit `2` |
| RFC-036 `--help` / `--version` / unknown command / invalid global argv | Unchanged |

1. M5.4 MUST register `generate` in the internal command registry (alongside `validate` and `doctor`).
2. `CommandRegistry` remains non-public. M5.4 MUST NOT introduce a public command-registration API.
3. Global `--help` / `--version` handling remains RFC-036 (e.g. `--help generate` → help, not generate).
4. RFC-038 doctor registry expectations remain unchanged: doctor still requires `validate` + `doctor` only and MUST NOT require `generate`.

### 3.4 Authority split

1. **Core** defines Resource validity and defaults via Accepted constructors.
2. **CLI** owns only argv parsing, filesystem preconditions, serialization orchestration, and writing.
3. **Invariant:** no CLI-local Resource shape or defaulting logic exists.

## 4. Argv contract

```text
rf [global-options] generate resource <namespace> <name> <path>
```

1. `generate` is a **single registered command** (flat grammar; not a nested command framework).
2. After the `generate` command token, the first remaining token MUST be the kind `resource` (exact match).
3. After kind `resource`, exactly **three** positionals MUST follow: `namespace`, `name`, `path`.
4. `namespace` and `name` are required string positionals mapping to Accepted Resource identity components. There is **no** default namespace and **no** compound `namespace/name` parsing in this RFC.
5. `path` is interpreted **literally** as a filesystem path (no glob expansion, no project inference).
6. Missing kind, unknown kind, missing/extra positionals → exit `2`.
7. Options after `generate` (tokens starting with `-`) are rejected in M5.4 (exit `2`) unless a later Accepted RFC defines specific ones.
8. Global options remain governed by RFC-036 when they appear in positions RFC-036 already defines.
9. **Argument parsing / argv gate MUST complete before FS prechecks, construction, encoding, or writing.**

### 4.1 Parser evolution relative to RFC-036

RFC-036’s runner recognizes `rf [global-options] [command]` and dispatches registered handlers. M5.4 MUST:

1. Register and dispatch `generate`.
2. Consume generate’s command-local kind + three positionals after the command token.
3. Reject surplus tokens and undefined options with exit `2`.

This is a **narrow, command-local** grammar extension—not a general nested-command or parser redesign.

## 5. Pipeline

### 5.1 Composition (normative)

```text
run(['generate', 'resource', namespace, name, path])
  → generate handler
  → argv gate
  → FS prechecks (parent is existing directory; destination absent)
  → createResourceIdentity(namespace, name)   # Accepted core
  → createResource(identity)                  # Accepted core
  → mechanical JSON encode of complete Resource
  → failure-safe write to path
  → map to { exitCode, stdout, stderr }
```

Filesystem prechecks MUST run **before** core construction.

### 5.2 Filesystem preconditions

1. The **immediate parent** of `path` MUST exist and MUST be a directory. Otherwise → exit `2`; do not construct; do not write.
2. `path` MUST **not** already exist (file or non-file). If it exists → exit `2`; do not construct; do not overwrite.
3. M5.4 MUST NOT create parent directories.
4. M5.4 MUST NOT overwrite existing destinations.
5. M5.4 MUST NOT introduce `--force` or other command-local options.

### 5.3 Write safety

1. **Any non-zero exit MUST leave the destination unchanged** (not created, not overwritten).
2. A failed write MUST NOT leave a **partially written** destination file. The implementation MUST use an atomic or otherwise failure-safe write strategy appropriate to the platform.
3. Any temporary write artifact MUST be cleaned up on failure where practicable and MUST NOT be presented as the requested destination artifact.
4. Filesystem I/O for generate MUST remain command-local; MUST NOT become a generic `run` I/O API.

### 5.4 Construction authority

1. Identity MUST be constructed through Accepted core APIs (e.g. `createResourceIdentity(namespace, name)` with the default user-kind rules already Accepted by core / RFC-001).
2. The Resource MUST be constructed through Accepted core APIs (e.g. `createResource(identity)`).
3. If core construction fails → exit `1`; **do not write**.
4. The CLI MUST NOT duplicate or invent Resource member defaults, identity grammar, or validation rules.
5. This RFC references Accepted core constructor contracts; it does **not** restate their member defaults.

### 5.5 Semantic presentation of core errors

CLI presentation of core `Result` errors is informative; it MUST NOT reinterpret Accepted core error semantics into new product rules.

## 6. Serialization boundary

1. **Content authority:** the written document’s semantic content MUST be exactly the successful `createResource` `Resource` value: `{ identity, schema, annotations }` (Accepted `Resource` type).
2. The serializer MUST encode the **complete `Resource` value**; it MUST NOT reconstruct an “equivalent” document from selected fields or invent parallel CLI document schema.
3. No extra top-level keys; no omitted Resource members; no CLI-synthesized fields/relations/operations/constraints/annotations beyond what that value already holds.
4. Encoding is **mechanical JSON encoding** of that structure (and nested plain data)—not a second construction step.
5. **Round-trip invariant:** after a successful write, `rf validate <path>` / `validateResourceDocument` on the file contents MUST succeed (exit `0`).
6. M5.4 MUST NOT add a public `@resource-forge/core` serialize/export API solely for this command.
7. Pretty-print, trailing newline, and key order are implementation-owned so long as (1)–(5) hold.

```text
createResource(...)
      │
      ▼
Resource { identity, schema, annotations }
      │
      │ mechanical JSON encoding only
      ▼
JSON document
      │
      ▼
validateResourceDocument(...)  → PASS
```

## 7. Exit codes and streams

Extends RFC-036/037 without new exit codes:

| Outcome | Exit | Streams | Destination (§5.3) |
| --- | ---: | --- | --- |
| Constructed and wrote successfully | `0` | stdout quiet or minimal OK (informative); no failure text | created |
| Core construction failure (after argv/FS gates; **before** any destination creation) | `1` | message → **stderr** | unchanged (never created) |
| Unexpected internal failure, or failed write **after** successful construction | `1` | message → **stderr** | unchanged (no partial destination file; temps cleaned per §5.3) |
| Usage (arity / unknown kind / undefined options) | `2` | message → **stderr** | unchanged |
| FS precondition refusal (parent missing/not directory; destination exists) | `2` | message → **stderr** | unchanged |
| Unknown command / invalid global argv | `2` | unchanged (RFC-036) | n/a |

Normative meaning for scripts:

1. **Exit `0`** — Resource constructed successfully and JSON written.
2. **Exit `1`** — well-formed generate invocation that passed argv/FS gates, then failed either (a) during core construction **before any destination creation**, or (b) during unexpected internal error / failure-safe write abort **after** construction. Both cases MUST preserve the §5.3 destination-unchanged invariant.
3. **Exit `2`** — usage or FS precondition refusal (including RFC-036 usage/unknown-command cases when applicable).

No structured/JSON diagnostic output in M5.4.

## 8. Testing contract

1. Normative CLI behavior remains centered on `run(argv)`.
2. Required coverage at Accept/implementation time includes:
   - Success: `run(['generate', 'resource', namespace, name, path])` → exit `0`; destination created; `run(['validate', path])` → exit `0` (round-trip)
   - Core failure: identity input **actually rejected by the Accepted core contract** → exit `1`; destination absent
   - Usage: missing/extra tokens, unknown kind, post-command options → exit `2`; no write
   - FS: missing/non-directory parent → exit `2`; existing destination → exit `2`; no overwrite
   - Regressions: RFC-036 builtins; `validate` and `doctor` still pass
3. Internal unit tests MAY cover pure encode/orchestration seams within the package **without** exporting them.
4. Subprocess `rf` smoke tests remain optional.
5. Tests MUST NOT prescribe a particular invalid identity literal in this RFC unless already established by Accepted core contracts/tests; choose fixtures that core actually rejects.

## 9. Invariants

1. M5.4 MUST register `generate` as specified; MUST register only kind `resource` for this slice; MUST NOT register `init`, `from-prisma`, or other generator candidates.
2. M5.4 MUST NOT perform discovery, config loading, workspace inference, globbing, stdin reads, or TypeScript/adapter codegen.
3. Public package API MUST remain `run` only.
4. Filesystem I/O for generate MUST remain command-local; MUST NOT become a generic `run` I/O API.
5. Resource construction/defaulting MUST be decided solely by Accepted core constructors.
6. Serialization MUST encode the complete constructed `Resource` value; MUST NOT invent a CLI Resource document model.
7. Successfully written documents MUST round-trip through RFC-037 validation.
8. Exit codes MUST stay within `0` / `1` / `2` as mapped in §7; M5.4 MUST NOT change RFC-036/037/038 exit-code meanings.
9. Argv gate and FS prechecks MUST precede construction; non-zero exits MUST leave the destination unchanged (including no partial destination file; temporary write artifacts cleaned where practicable and never presented as the destination).
10. `run` MUST NOT write process streams or call `process.exit`.
11. `@resource-forge/cli` MUST NOT gain nest/graphql/prisma dependencies for this slice.
12. RFC-038 doctor registry expectations MUST remain `validate` + `doctor` only (MUST NOT require `generate`).

## 10. Rationale

1. **One product surface per RFC** — matches M5.1–M5.3; keeps `init` / `from-prisma` independently designable.
2. **Kind positional, not nested commands** — matches roadmap spelling without inventing a nested registry framework.
3. **Two identity positionals** — maps 1:1 onto Accepted `{ namespace, name }` without defaults or compound parsing.
4. **Core-authored construction** — avoids CLI-local Resource schema drift; validate remains the compatibility check.
5. **FS before construct** — fail-closed destination rules without wasted construction; clear exit `2` vs `1` split.
6. **Complete-Resource encode** — prevents serialization from becoming a second Resource model.
7. **Failure-safe write** — makes “non-zero ⇒ destination unchanged” operationally true.
8. **Reuse exit `0/1/2`** — scripts distinguish construction/internal failure from invocation/precondition refusal without new codes.
9. **`run` only** — preserves RFC-036’s single executable seam and integration-test story.

## 11. Relationships

| Artifact | Relationship |
| --- | --- |
| RFC-036 CLI Foundation | **Extended** — registry gains `generate`; command-local argv for generate; public `run` / bin / `0/1/2` vocabulary preserved |
| RFC-037 CLI Resource Validation | **Relied upon** — round-trip compatibility; core dependency already allowed; validate semantics not reopened |
| RFC-038 CLI Package Environment Doctor | **Coexists** — doctor registry expectations unchanged (`validate` + `doctor` only) |
| RFC-001 + Accepted core constructors | **Consumed** — construction/identity authority; not reopened |
| RFC-002–RFC-035 | Not reopened |
| Roadmap M5 | Opens M5.4 as generate-resource only; `init` / other kinds / `from-prisma` remain candidates |
| Later init / from-prisma / field flags / `--force` / mkdir | Deferred |

## 12. Acceptance criteria (for this specification)

This specification may move from **Draft** to **Accepted** after Design Review (M3) when:

1. Scope is `rf generate resource <namespace> <name> <path>` only; `init`, other kinds, `from-prisma`, field flags, templates, overwrite/mkdir, and TS/adapter codegen are explicitly fenced.
2. Composition (`run` → argv gate → FS prechecks → core construction → complete-Resource encode → failure-safe write → exit mapping) is unambiguous.
3. Public API remains `run` only; no `run(argv, opts)`; no public generate/serialize API.
4. Argv contract is flat `generate` + kind `resource` + three positionals; no nested command framework.
5. Core constructors are sole construction/defaulting authority; serialization encodes the complete `Resource` value with RFC-037 round-trip.
6. FS fail-closed rules (existing parent directory; absent destination; no mkdir/overwrite) and write-safety (no partial file on failure) are normative.
7. Exit mapping for success / construction-or-internal failure / usage-or-FS refusal is normative and compatible with RFC-036/037 `0/1/2` meanings.
8. Testing contract centers on `run(['generate', …])` including validate round-trip and core-rejected identity fixtures without inventing invalid literals beyond Accepted core contracts.
9. Nest/GraphQL/Prisma CLI deps and new codegen packages remain forbidden for this slice.

## 13. Explicit deferrals / follow-ons

1. `rf init` / project scaffold.
2. Other `generate` kinds.
3. `from-prisma` / reverse Prisma → Resource generation.
4. Field flags, templates, stdin, interactive UX.
5. `--force` / overwrite / parent-directory creation.
6. TypeScript / Nest / GraphQL / Prisma generators.
7. Public core serialize API or public CLI generate helpers.
8. Command-specific `generate --help` UX polish.
9. General-purpose nested-command / argument framework or public plugin registry.
10. End-to-end examples applications (separate M5 examples work).
