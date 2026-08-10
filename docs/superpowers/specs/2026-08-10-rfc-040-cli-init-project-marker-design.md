# RFC-040: CLI Init Project Marker

**Date:** 2026-08-10  
**Status:** Accepted  
**M3:** Accepted (2026-08-10) — Design Review; no design blockers. Locked: flat registered `init`; `rf init [path]` (default `.`; no options; option-like tokens rejected); direct resolve only (no upward discovery); canonical `resource-forge.json` `{ version: 1, resourcesDir: "resources" }` + `resources/`; classify before mutation into creatable / conforming / conflict; conforming no-op exit `0`; create only when both RF artifacts absent; half-init (incl. empty `resources/` alone) → exit `2`; conflict/conforming → zero filesystem mutations (reads/stat/access OK); create order resources then exclusive marker; **Failed create MUST NOT leave a conforming project**; best-effort empty-`resources/` cleanup and best-effort non-recursive target cleanup; post-classify concurrent FS failures → exit `1` not conflict `2`; exit `0/1/2` with existing `run()` catch for unexpected throwables; public API remains `run` only; CLI-local ownership (no new core/project package); siblings unchanged; doctor registry still `validate` + `doctor` only; testing centered on `run(['init', …])`. Proposes/targets M5.5 without mutating roadmap status. M4 (implementation planning) authorized for `#135`.  
**Package:** `@resource-forge/cli` (registers `init`; CLI-local marker/layout ownership; does **not** require new `@resource-forge/core` exports)  
**Tracking:** [#135](https://github.com/rexescario-dev/resource-forge/issues/135)  
**Depends on:** [RFC-036 CLI Foundation](2026-08-10-rfc-036-cli-foundation-design.md) (**Accepted**) for `rf` / `run(argv)` / exit `0/1/2` / bin adapter / internal command registry; [RFC-037 CLI Resource Validation](2026-08-10-rfc-037-cli-resource-validation-design.md) (**Accepted**), [RFC-038 CLI Package Environment Doctor](2026-08-10-rfc-038-cli-package-environment-doctor-design.md) (**Accepted**), and [RFC-039 CLI Generate Resource](2026-08-10-rfc-039-cli-generate-resource-design.md) (**Accepted**) as coexisting product commands (their semantics are **not** reopened; doctor registry expectations remain `validate` + `doctor` only)  
**Followed by:** M5.5 implementation planning/delivery for `#135` after Accept; later project-aware `generate` / `validate` / `doctor`, custom `resourcesDir`, repair/`--force`, examples, and `from-prisma` only under separately Accepted designs  
**Unblocks:** A deterministic `rf init` command that establishes a **minimal RF project boundary** (canonical marker + managed layout directory) without scaffolding an application, generating Resources, or inventing project resolution for other commands

**Amends / specializes:** Roadmap **M5 — CLI & examples** by **proposing/targeting M5.5 CLI Init Project Marker** (`init` only as defined here). Does **not** mutate roadmap milestone status by itself. Extends RFC-036’s internal command registry to register `init` alongside `validate`, `doctor`, and `generate`. Reuses RFC-036/037 exit-code vocabulary (`0` / `1` / `2`) with init-specific outcome mapping; does **not** change those exit-code meanings or introduce new exit codes. Does **not** reopen RFC-036’s public package API (`run` only) or bin stream/exit rules. Does **not** reopen RFC-037/038/039 product semantics. Does **not** amend RFC-001–RFC-035 product contracts. Does **not** commit app scaffolding, upward discovery, shared project APIs, or sibling-command project consumption.

## Primary question

> How should `@resource-forge/cli` expose `rf init` so it establishes a **minimal RF project marker and layout** at an explicit target directory—without scaffolding applications, generating Resources, or inventing project resolution for other commands—while preserving RFC-036–039 (`run` only; exit `0/1/2`)?

## Thesis

RFC-040 locks M5.5 (proposed) as **CLI Init Project Marker**:

- **`init` answers:** “Make this directory an RF project boundary.”
- **`init` does not answer:** “Scaffold my app,” “generate a Resource,” or “discover my project root.”
- **Invocation:** `rf init [path]` — zero or one positional; default `.`; **no options**. Option-like tokens are rejected (not treated as paths).
- **Artifacts:** fixed `resource-forge.json` (project identity/metadata) and `resources/` (managed Resource layout directory).
- **Canonical marker** (create and conforming compare):

```json
{
  "version": 1,
  "resourcesDir": "resources"
}
```

- **`version`** is the marker/schema version, not an application or package version.
- **`resourcesDir`** is explicit metadata; for this slice it is always `"resources"` and is **not** user-configurable.
- **Resolve:** path is resolved directly relative to the CLI process cwd (absolute paths unchanged). **No upward discovery.**
- **State machine:** classify **before any filesystem mutation** into creatable / conforming / conflict.
- **Idempotence:** already conforming → exit `0`, no filesystem mutations (reads/stat/access permitted).
- **No repair:** half-init and conflicts → exit `2`, no filesystem mutations / no overwrite.
- **Ownership:** all init semantics are CLI-local. No new core exports; no `@resource-forge/project`; no shared project-resolution API.
- **Siblings unchanged:** `generate`, `validate`, and `doctor` do not read or require the marker.
- **`run(argv)` remains the sole public package API.** `run(['init'])` / `run(['init', path])` is the integration path. No `run(argv, opts)`.
- **Exit mapping:** `0` conforming or successfully created; `1` creatable attempt that failed to establish the project (or unexpected via existing `run()` catch); `2` usage or conflict. No new exit codes.
- **Key invariant:** **Failed create MUST NOT leave a conforming project.**

```text
CLI surface:
  rf init [path]
  (+ RFC-036 builtins / unknown-command / invalid-global-argv)
  (+ RFC-037 rf validate <file>)
  (+ RFC-038 rf doctor)
  (+ RFC-039 rf generate resource …)

Package API (unchanged):
  run(argv) → { exitCode, stdout, stderr }

rf (bin adapter)
      │
      │ argv
      ▼
run(argv)
      │
      ▼
registry: validate | doctor | generate | init
      │
      ▼
init handler
      │
      ├─ argv gate (≤1 positional; reject option-like tokens) → exit 2
      ├─ resolve target (default "."; direct; no upward discovery)
      ├─ classify (conforming / creatable / conflict)  ← before any mutation
      ├─ conforming → exit 0 (no mutations; reads OK)
      ├─ creatable → ensure target; create resources/; write marker
      └─ conflict → exit 2 (no mutations; reads OK)
      │
      ▼
{ exitCode, stdout, stderr }
      │
      ▼
bin writes streams / sets exit
```

## 1. Scope

### 1.1 Goals

1. Propose/target **M5.5** as CLI establishment of a **minimal RF project boundary** via `init` only.
2. Lock CLI surface `rf init [path]` (default `.`; no options).
3. Lock composition: bin → `run` → init handler → argv gate → resolve → classify → no-op / create / refuse → exit mapping.
4. Lock fixed artifacts: `<target>/resource-forge.json` + `<target>/resources/`.
5. Lock the canonical marker schema for this slice (`version: 1`, `resourcesDir: "resources"`).
6. Lock the creatable / conforming / conflict state machine with classification before filesystem mutations.
7. Lock write-safety: no silent overwrite; failed create MUST NOT leave a conforming project; best-effort cleanup when this invocation created an empty `resources/` and marker write then fails.
8. Reuse RFC-036/037 exit `0/1/2` with the init outcome table in §7; do not change those meanings or invent new codes.
9. Preserve public package API: sole normative export remains `run`.
10. Fence app scaffolding, starter Resources, sibling-command project consumption, upward discovery, shared project APIs, configurable layout, repair/`--force`, examples, `from-prisma`, and `run(argv, opts)`.
11. Lock a testing contract centered on `run(['init', …])`.

### 1.2 Non-goals

This RFC does not define:

1. NestJS / GraphQL / Prisma / TypeScript application scaffolding or dependency wiring
2. Starter Resource JSON or invoking `generate` from `init`
3. Changes to `generate`, `validate`, or `doctor` behavior
4. Upward project-root discovery or workspace inference
5. Shared project-resolution APIs, `@resource-forge/core` project exports, or `@resource-forge/project`
6. `--force`, `--resources-dir`, marker-field overrides, interactive prompts, or stdin
7. Custom `resourcesDir` layouts or Resource inventory entries in the marker
8. Soft-repair, migration, or overwrite of existing RF artifacts
9. Population of `examples/**`
10. `from-prisma` / reverse Prisma generation or other `generate` kinds
11. Public helpers beyond `run`; `run(argv, opts)`
12. Changes to RFC-036–039 exit-code meanings or introduction of new exit codes
13. Command-specific `rf init --help` as a committed UX (deferred; short stderr usage on arity/option errors is sufficient)
14. Roadmap status mutation (this RFC proposes/targets M5.5; it does not by itself mark M5.5 done)

### 1.3 Informative only

- Exact stderr wording is implementation-owned except that usage/conflict refusals and create failures SHOULD be distinguishable where practical.
- Exact TypeScript file layout and internal helper names are implementation-owned.
- JSON pretty-print, trailing newline, and key order are implementation-owned so long as conforming comparison (§4) holds.
- Concrete failure-safe marker write strategy is implementation-owned so long as §6 holds.
- Whether `run` observes cwd via `process.cwd()` or an equivalent host cwd is implementation-owned so long as relative targets resolve against the CLI process cwd used by the bin/`run` invocation under test.

## 2. Terminology

| Term | Meaning |
| --- | --- |
| CLI surface | User-facing invocations of `rf`, including `rf init [path]` |
| Package API | Normative TypeScript export surface of `@resource-forge/cli` — solely `run` (unchanged from RFC-036) |
| `init` | Registered product command that establishes an RF project boundary at a target directory |
| Target | Directory path resolved from the optional positional (default `.`) |
| Project marker | Canonical file `resource-forge.json` at the target root |
| Managed layout | Directory named by marker `resourcesDir` (for this slice always `resources/`) |
| RF artifacts | The pair: project marker file + managed layout path at the target |
| Conforming | Both RF artifacts present and satisfying §4 |
| Creatable | Neither RF artifact exists at the target (target may be absent or a non-RF directory) |
| Conflict | Any other observed state (including half-init) |
| Half-init | Exactly one RF artifact present, or both present but non-conforming |
| Direct resolve | Path resolution without walking ancestors or consulting config |
| Option-like token | Any argv token beginning with `-` after the `init` command name |

## 3. Argv and path resolution

1. Registered command name: `init` (flat registry entry).
2. After `init`, **zero or one** positional path token is allowed.
3. Missing positional → treat as `.`.
4. More than one positional → exit `2` (usage); no filesystem mutations.
5. Any option-like token → exit `2` (usage); MUST NOT interpret option-like tokens as paths.
6. Resolve the path token directly against the CLI process cwd; absolute paths are unchanged.
7. MUST NOT walk upward looking for an existing marker.
8. MUST NOT load config, scan workspaces, or infer a project root beyond the resolved target.

## 4. Marker and layout contract

### 4.1 Fixed names

1. Marker filename MUST be exactly `resource-forge.json` at `<target>/resource-forge.json`.
2. Managed layout directory MUST be `<target>/resources` for this slice (matching canonical `resourcesDir`).

### 4.2 Canonical marker content

On create, the marker MUST be JSON encoding of exactly:

```json
{
  "version": 1,
  "resourcesDir": "resources"
}
```

Normative field rules:

1. `version` MUST be the number `1` (marker/schema version).
2. `resourcesDir` MUST be the string `"resources"`.
3. No other top-level keys are allowed for conforming markers in this slice.
4. No Resource entries, framework config, or package metadata belong in the marker.

### 4.3 Conforming comparison

A target is **conforming** when all of the following hold:

1. `<target>/resource-forge.json` exists and is a regular file.
2. The marker parses as JSON object with **exactly** the canonical fields/values in §4.2 (semantic equivalence of parsed values; byte-identical formatting is not required).
3. `<target>/resources` exists and is a directory.

Extra keys, wrong types, wrong values, invalid JSON, wrong filesystem types, or unreadable artifacts → **not** conforming.

## 5. State machine (classify before mutation)

After argv gate and resolve, classify the target. **Classification MUST precede any filesystem mutation.**

| Observed state | Class | Action |
| --- | --- | --- |
| Target absent | creatable | Create target directory (including parents as needed for the target itself); then create both RF artifacts → exit `0` |
| Target exists as directory; marker absent; `resources` absent | creatable | Create both RF artifacts (unrelated sibling files/dirs OK) → exit `0` |
| Marker present and canonical **and** `resources` is a directory | conforming | No filesystem mutations → exit `0` |
| Target exists but is not a directory | conflict | Refuse → exit `2` |
| Marker only | conflict | Refuse → exit `2` |
| `resources` only (including empty directory) | conflict | Refuse → exit `2` |
| Marker present but invalid / non-canonical | conflict | Refuse → exit `2` |
| `resources` exists but is not a directory | conflict | Refuse → exit `2` |
| Marker or layout unreadable | conflict | Refuse → exit `2` |
| Any other non-conforming combination of RF artifacts | conflict | Refuse → exit `2` |

Notes:

1. **Create is allowed only when both RF artifacts are absent.**
2. Presence of `resources/` alone—even empty—is half-init and MUST refuse.
3. Unrelated non-RF files in an existing target directory do **not** block create when both RF artifacts are absent.
4. **Conflict and conforming paths MUST perform zero filesystem mutations. Reads/stat/access checks are permitted.**

## 6. Create path and write-safety

Applies only after classification **creatable**.

### 6.1 Create order

1. Ensure `target` exists as a directory (create if absent, including parents required for that target path).
2. Create empty `resources/` directory.
3. Write `resource-forge.json` with canonical content using **create-if-absent / exclusive create** semantics (MUST NOT overwrite an existing marker).

### 6.2 Invariants

1. **Failed create MUST NOT leave a conforming project.**
2. MUST NOT silently overwrite or modify pre-existing filesystem entries.
3. Marker MUST NOT become visible as a partially written file (failure-safe write strategy).
4. If this invocation created `resources/` and marker creation subsequently fails, the implementation **MUST attempt** to remove that directory if it is still empty. Failure to clean up MUST NOT change the exit code; the command MUST NOT claim success.
5. If this invocation creates the target directory and creation subsequently fails, removal of the newly-created target directory is **best-effort only** and MUST NOT remove pre-existing entries. The command MUST NOT claim success. The primary invariant remains that the resulting state is non-conforming. Recursive rollback of newly-created parent directories is **not** required.
6. Filesystem I/O for `init` MUST remain command-local; MUST NOT become a generic `run` I/O API.
7. Once a target has been classified as **creatable**, failures caused by concurrent filesystem changes during the create sequence are **create failures (exit `1`)**, not conflict classifications (exit `2`). This includes late exclusive-create conflicts on the marker (e.g. raced into existence) and `EEXIST` (or equivalent) when creating `resources/` after classification. Such failures MUST follow the §6.2 cleanup/invariant rules and MUST NOT silently overwrite.

## 7. Exit codes and streams

Extends RFC-036/037 without new exit codes:

| Outcome | Exit | Streams | FS effect |
| --- | ---: | --- | --- |
| Conforming no-op | `0` | stdout quiet or minimal OK (informative); no failure text | no mutations |
| Create succeeded (both artifacts) | `0` | same | target (if needed) + `resources/` + canonical marker |
| Usage (arity / option-like tokens) | `2` | message → **stderr** | no mutations |
| Conflict classification | `2` | message → **stderr** | no mutations (reads/stat/access permitted) |
| Creatable path, but mkdir/write/create failed (incl. post-classify races) | `1` | message → **stderr** | MUST NOT leave conforming; cleanup per §6.2 |
| Unexpected throwable from handler | `1` | via existing `run()` catch → **stderr** | same non-success invariants; **no init-specific exception policy** |
| Unknown command / invalid global argv | `2` | unchanged (RFC-036) | n/a |

Normative meaning for scripts:

1. **Exit `0`** — project is (now or already) conforming under this RFC’s marker+layout contract.
2. **Exit `1`** — well-formed `init` that did not successfully establish a conforming project after a creatable attempt, or unexpected failure via the existing `run()` path.
3. **Exit `2`** — usage refusal or conflict classification (including half-init).

No structured/JSON diagnostic output in this slice.

## 8. Testing contract

1. Normative CLI behavior remains centered on `run(argv)`.
2. Required coverage classes via `run(['init'])` / `run(['init', path])`:
   - creatable: absent target; empty/non-RF directory; directory with unrelated files only → exit `0` and both artifacts present/canonical
   - conforming no-op → exit `0`, filesystem unchanged
   - conflicts: marker only; `resources` only (incl. empty); non-canonical marker; `resources` as file; target as file; unreadable cases as practicable → exit `2`, no filesystem mutations
   - usage: extra positionals; option-like tokens → exit `2`
   - create failure / write-safety seams as needed: no conforming leftover; no overwrite of pre-existing entries; cleanup attempt when marker fails after this invocation created empty `resources/`; post-classify race failures map to exit `1`
3. Doctor’s required registry set remains `validate` + `doctor` only (presence of `init` MUST NOT change RFC-038 expectations).
4. Public package export remains `run` only.

## 9. Package and dependency boundaries

1. `init` is implemented in `@resource-forge/cli`.
2. This RFC MUST NOT add new `@resource-forge/core` project/marker exports.
3. This RFC MUST NOT create `@resource-forge/project` or other new packages.
4. Nest / GraphQL / Prisma packages remain forbidden CLI dependencies for this slice.
5. Existing `@resource-forge/cli → @resource-forge/core` dependency (allowed by RFC-037 for other commands) is unchanged by this RFC; `init` MUST NOT invent core coupling for marker ownership.
6. Doctor registry expectations remain unchanged (`validate` + `doctor` only).

## 10. Rationale

1. **Boundary before consumption** — defining the marker without teaching siblings to load it prevents `init` from becoming an accidental shared resolver.
2. **One product surface per RFC** — matches M5.1–M5.4 slicing discipline.
3. **CLI-local ownership** — consumption is deferred; extracting marker types into core/project packages waits for a real consumer RFC.
4. **Strict half-init refusal** — declarative establishment beats ambiguous repair.
5. **Fixed canonical layout** — keeps idempotence and conflict rules trivial; configurable dirs need their own justification later.
6. **Failed create MUST NOT leave a conforming project** — preserves a clear postcondition even when filesystem rollback cannot be perfectly transactional.
7. **Reuse `run()` unexpected path** — avoids inventing an init-specific exception policy.

## 11. Relationships

| Artifact | Relationship |
| --- | --- |
| RFC-036 CLI Foundation | **Extended** — registry gains `init`; public `run` / bin / `0/1/2` vocabulary preserved |
| RFC-037 CLI Resource Validation | **Coexists** — validate semantics not reopened |
| RFC-038 CLI Package Environment Doctor | **Coexists** — doctor registry expectations unchanged (`validate` + `doctor` only) |
| RFC-039 CLI Generate Resource | **Coexists** — generate semantics not reopened; `init` does not call generate |
| RFC-001–RFC-035 | Not reopened |
| Roadmap M5 | **Proposes/targets M5.5** as CLI init / project marker only; does not mutate roadmap status by itself |
| Later project-aware generate/validate/doctor; custom dirs; repair/`--force`; examples; from-prisma | Deferred |

## 12. Acceptance criteria (for this specification)

This specification may move from **Draft** to **Accepted** after Design Review (M3) when:

1. Scope is `rf init [path]` only; sibling commands unchanged; no upward discovery; no shared project abstraction.
2. Composition (`run` → argv gate → resolve → classify → no-op/create/refuse → exit mapping) is unambiguous.
3. Canonical marker + `resources/` contract and creatable/conforming/conflict rules are normative.
4. Write-safety includes: classify before mutation; no silent overwrite; **Failed create MUST NOT leave a conforming project**; best-effort empty-`resources/` cleanup after failed marker create; best-effort non-recursive target cleanup when this invocation created the target; post-classify concurrent FS failures → exit `1`.
5. Exit mapping for success/no-op / create failure / usage-or-conflict is normative and compatible with RFC-036/037 `0/1/2` meanings; unexpected throwables use existing `run()` catch.
6. Public API remains `run` only; no `run(argv, opts)`; CLI-local ownership; no new core/project package.
7. Testing contract centers on `run(['init', …])`.
8. Nest/GraphQL/Prisma CLI deps and app scaffolding remain forbidden for this slice.

## 13. Explicit deferrals / follow-ons

1. Project-aware defaults or loading in `generate` / `validate` / `doctor`.
2. Custom `resourcesDir` / alternative layouts / marker schema evolution beyond `version: 1`.
3. Soft-repair, migration, or `--force` overwrite.
4. Lifting marker/layout types into `@resource-forge/core` or a project package once a consumer requires it.
5. App/framework scaffolding and dependency wiring.
6. Starter Resource generation from `init`.
7. End-to-end `examples/**` applications.
8. `from-prisma` / reverse Prisma → Resource generation.
9. Command-specific `init --help` UX polish.
10. Structured diagnostics.
