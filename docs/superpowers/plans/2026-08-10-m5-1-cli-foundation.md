# M5.1 CLI Foundation — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD. Implement **only** Accepted RFC-036 CLI Foundation in `@resource-forge/cli`. Do **not** depend on any `@resource-forge/*` workspace package. Do **not** register product commands (`validate`, `doctor`, `init`, `generate`, `from-prisma`, etc.). Do **not** invent config files, project-root discovery, workspace detection, filesystem scanning, Resource loading, nested command trees, aliases, env configuration, command-specific flags, auto-discovery, or a public command-registration API. Do **not** reopen RFC-001–RFC-035. Preserve: pure `run(argv)`; thin `rf` bin adapter as sole process I/O/exit site; exit `0/1/2`; `--help` precedence; unknown-command wins over later `--help`; empty internal registry; tests centered on `run()`.

**Status:** Accepted  
**M5:** Accepted (2026-08-10) — Plan Review re-entry; no plan blockers after prior return closures (package-local version source without discovery; exit `1` via non-public seam or structural review — no `run(argv, testOptions)`; adapter stream flush + `process.exit` or equivalent). Public-export assertions, lockfile-only dep update, descriptive README retained. RFC-036 remains Accepted. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#121](https://github.com/rexescario-dev/resource-forge/issues/121)  
**Source RFC:** [RFC-036 CLI Foundation](../specs/2026-08-10-rfc-036-cli-foundation-design.md) (**Accepted**)  
**Depends on:** M1 repository foundation (package slot + Node ≥20); RFC-001–RFC-035 (**independent / not consumed**)  
**Package:** `@resource-forge/cli` (**no** `@resource-forge/*` dependencies)  
**Slice:** M5.1 only — CLI execution shell  
**Goal:** Deliver `rf` + pure `run(argv) → { exitCode, stdout, stderr }` so the CLI package is a deterministic executable shell with help/version builtins and defined usage errors—without product commands or Resource Forge domain coupling.

**Architecture:**

```text
RFC-036 (Accepted)
└── CLI execution foundation (shell only)

@resource-forge/cli
├── run(argv) → { exitCode, stdout, stderr }   # sole public package API
├── narrow parser: rf [global-options] [command]
├── builtins: --help / --version (and bare rf → help)
├── package-local version source (no project/workspace discovery)
├── internal empty CommandRegistry (non-public)
├── bin adapter: rf → run(argv) → write streams → terminate
└── tests centered on run()

Forbidden deps: @resource-forge/core|nest|graphql|prisma
```

**Tech Stack:** TypeScript strict, Vitest, Node ≥20. Prefer a **tiny custom argv parser** (no third-party CLI framework unless Plan Review / execution proves a concrete need). No workspace product packages.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-036 Accepted (#121)
       ↓
M5.1 plan Draft → M5 Plan Review → (Returned once) → Revised Draft → M5 re-entry
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M10 as applicable + Slice Completion Report
       ↓
one delivery PR for tracking #121 containing Accepted RFC
+ Accepted plan + implementation + SCR
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M5.1 delivery slice. Do **not** open a separate plan-only merge PR as a required gate. M6 treats Accepted RFC-036 text as authoritative for semantics.

**Task checkboxes:** Completed during **M6 execution** only. Leave unchecked until M6 runs.

---

## Locked decisions (planning aids — not new product semantics)

| Decision | Lock (from RFC-036) |
| --- | --- |
| Product semantics owner | RFC-036 Accepted text only |
| Package | `@resource-forge/cli` only |
| Workspace `@resource-forge/*` deps | **Forbidden** (remove existing `core` dependency) |
| Third-party CLI framework | **Prefer omit**; custom narrow parser |
| Public package API | **`run` only** |
| CLI surface | `rf`, `rf --help`, `rf --version` + defined errors |
| Grammar | `rf [global-options] [command]` |
| Registered commands | **None** |
| CommandRegistry | Internal empty seam; **not** exported; do not over-build |
| `--help` + `--version` | `--help` wins → exit `0`, stdout help |
| `rf foo --help` | Unknown command → exit `2` |
| Exit codes | `0` success; `2` usage/caller; `1` unexpected internal failure |
| Error wording | Non-normative except unknown-command vs invalid-global-argv **distinguishable** |
| Version source | Corresponds to installed `@resource-forge/cli` package; **mechanism implementation-defined** — select a **package-local** source compatible with the package build/runtime model; MUST NOT introduce a workspace dependency or project/filesystem discovery as a runtime requirement of `run` |
| `run` purity | No process I/O; no process termination |
| Bin adapter | Adapter-only process interaction; write streams **before** termination; terminate with returned exit code via `process.exit` **or equivalent** |
| Stream completion | Do not assume a naive async `write` + immediate exit is always safe; use a synchronous-safe strategy or the repo’s established CLI/process conventions |
| Exit `1` verification | Identify runner failure boundary; cover via deterministic **non-public** seam if one exists naturally; otherwise structural review — **MUST NOT** export test-only APIs / `run(argv, testOptions)` / public failure injectors solely for coverage |
| Subprocess smoke | Optional; not required for normative contract |
| Config / discovery / Resources / generators / examples | **Forbidden** |
| README | Descriptive of M5.1 surface only; **no** aspirational “coming soon” command tables |

### Planning placement of modules (non-normative layout)

```text
packages/cli/src/
  run.ts           # run() + RunResult (public via index)
  run.test.ts      # normative behavioral tests
  bin.ts           # rf adapter only (compiled to dist/bin.js)
  index.ts         # export { run } only — remove placeholder CORE_* exports
```

Keep the empty registry and parser as **small private helpers inside `run.ts`** unless file size forces a split. Do **not** invent a sophisticated registry abstraction. A tiny private package-local version binding (constant or equivalent) MAY live beside `run` if useful; it MUST NOT become a public API or a filesystem/project discovery path.

`package.json` planning changes (non-normative packaging detail implementing RFC-036 §3):

- Remove `dependencies["@resource-forge/core"]`
- Add `"bin": { "rf": "./dist/bin.js" }` (or equivalent path after build)
- Update description/README to shell-foundation posture (current M5.1 surface only)

---

## Goal / non-goals of this plan

**Goal:** Sequence M6 so `@resource-forge/cli` ships the RFC-036 shell: pure `run`, `rf` bin, help/version, exit/stream contracts, empty registry, zero RF workspace deps, with `run()`-centered tests.

**Non-goals (plan):** validate/doctor; generators; Nest/GraphQL/Prisma CLI wiring; config/discovery; examples; reverse Prisma; public registration API; expanding the parser; inventing semantics missing from RFC-036; artificial public/test-only APIs for exit `1` coverage.

---

## Constraints (SHALL / SHALL NOT)

Derived only from Accepted RFC-036:

1. SHALL implement `run(argv: readonly string[]) → { exitCode, stdout, stderr }` as the sole public package API.
2. SHALL treat `argv` as excluding Node executable and script path.
3. SHALL expose executable `rf` as a thin adapter around `run(process.argv.slice(2))` (or equivalent).
4. SHALL confine process stream writes and process termination to the bin adapter; SHALL write streams before terminating; MAY use `process.exit` or an equivalent adapter-level mechanism.
5. SHALL implement bare `rf` / `--help` → exit `0`, help on stdout; `--version` → exit `0`, version on stdout corresponding to the installed `@resource-forge/cli` package.
6. SHALL implement unknown command and invalid global argv → exit `2`, stderr; messages distinguishable.
7. SHALL map unexpected runner failures to exit `1`, stderr, without process termination inside `run`.
8. SHALL apply `--help` precedence over `--version` when both present.
9. SHALL treat any command token as unknown (empty registry).
10. SHALL NOT depend on `@resource-forge/core|nest|graphql|prisma` or any other workspace `@resource-forge/*` package.
11. SHALL NOT register product commands or export CommandRegistry / parser internals / version helpers.
12. SHALL NOT load config, discover project roots, scan the filesystem for Resources, or invent a project model (including as a version-loading strategy for `run`).
13. SHALL NOT perform process I/O or termination inside `run`.
14. SHALL center verification on `run()` unit tests covering the RFC-036 matrix.
15. SHALL NOT expand the public API solely to force exit `1` in tests.

---

## Ownership boundaries

| Area | Ownership |
| --- | --- |
| `packages/cli/**` | **Owns** M5.1 delivery |
| `packages/core`, `nest`, `graphql`, `prisma` | **Untouched** (no product changes; CLI must drop core dep) |
| `examples/**` | **Untouched** |
| Docs: RFC-036 (Accepted), this plan, package README, specs index, roadmap M5.1 note | Allowed documentation updates for the slice |

---

## Contract inventory

| Surface | Kind | RFC |
| --- | --- | --- |
| `run(argv)` | Public package API | §3.3 |
| `rf` bin | CLI surface adapter | §3.2 / §3.4 |
| Help / version builtins | Framework builtins | §4 |
| Exit `0/1/2` + streams | Process contract | §5 |
| Empty internal registry | Internal seam | §3.5 |
| Product commands / config / discovery | Deferred | §1.2 / §11 |

---

## TDD / verification strategy

1. Replace placeholder `index.test.ts` expectations that assert `CORE_DEPENDENCY` / core coupling with `run()` behavioral tests (**fail first** where behavior is missing).
2. Required `run()` cases (RFC-036 §6):
   - `[]` → exit `0`, stdout help (non-empty)
   - `["--help"]` → exit `0`, stdout help
   - `["--version"]` → exit `0`, stdout reports a version that **corresponds** to the installed `@resource-forge/cli` package (assert observable correspondence; do **not** prescribe that `run` imports `package.json` or walks the filesystem)
   - `["--help", "--version"]` → exit `0`, help (not version-only)
   - `["foo"]` → exit `2`, stderr unknown-command class
   - `["foo", "--help"]` → exit `2`, unknown-command (not help)
   - unsupported global (e.g. `["--unknown-flag"]`) → exit `2`, stderr invalid-global-argv class distinguishable from unknown-command
3. Public-surface assertion: the package entrypoint exports `run` and does **not** export `CORE_DEPENDENCY`, `PACKAGE_NAME`/`PACKAGE_VERSION` placeholders (unless retained only if already part of an Accepted public contract — they are **not**), `CommandRegistry`, parser helpers, or other placeholder/internal symbols.
4. Assert `package.json` has **no** `@resource-forge/*` dependencies (test or package-validation step).
5. **Exit `1`:** Identify the runner failure boundary (top-level conversion of unexpected throwables inside `run` → `{ exitCode: 1, stdout: "", stderr }`). Add coverage where a deterministic **non-public** test mechanism exists naturally; otherwise document structural-review coverage of the catch mapping in validation/SCR notes. MUST NOT introduce `run(argv, testOptions)`, an exported failure injector, or artificial production failure semantics solely for a green test.
6. Optional: one subprocess smoke of the built `rf` / `dist/bin.js` after build — **not** required for SCR green if `run` + adapter coverage exist.
7. `pnpm --filter @resource-forge/cli test|typecheck|lint` must pass.

**Test harness note:** Tests MAY read `packages/cli/package.json` (or equivalent) solely to obtain the **expected** version string for assertions. That harness read is not a license for `run` to perform filesystem/project discovery at runtime.

---

## Task breakdown

### Task 1: Package boundary + bin metadata

**Files:**
- Modify: `packages/cli/package.json`
- Modify: `packages/cli/README.md` (current M5.1 surface only)
- Modify/remove placeholder exports as needed in later tasks

- [x] **Step 1:** Remove `@resource-forge/core` from `dependencies`. Confirm no other `@resource-forge/*` deps.
- [x] **Step 2:** Add `"bin": { "rf": "./dist/bin.js" }` (path must match compiled adapter).
- [x] **Step 3:** Update package description to CLI foundation / shell (not generators).
- [x] **Step 4:** Rewrite package README **descriptively**: document the current CLI surface (`rf`, `rf --help`, `rf --version`) plus defined usage errors; distinguish CLI surface vs `run` package API; state that semantic commands are **not** part of this slice. Do **not** publish aspirational “coming soon” command tables that make roadmap candidates look committed.
- [x] **Step 5:** If dependency removal changes the lockfile, run `pnpm install` and update **only** the resulting dependency metadata for that removal; do **not** perform unrelated dependency upgrades or workspace churn.

### Task 2: Failing `run()` tests (TDD)

**Files:**
- Create/replace: `packages/cli/src/run.test.ts`
- Modify or remove: `packages/cli/src/index.test.ts` (fold into `run.test.ts` or keep a thin export smoke)

- [x] **Step 1:** Write failing tests for the matrix:
  - `[]` → `0` / help
  - `--help` → `0` / help
  - `--version` → `0` / version corresponding to package (observable)
  - `--help --version` → `0` / help
  - `foo` → `2` / unknown
  - `foo --help` → `2` / unknown
  - `--unknown-flag` → `2` / invalid-global (distinguishable from unknown)
- [x] **Step 2:** Assert public entrypoint exports `run` and does not export `CORE_DEPENDENCY`, `CommandRegistry`, parser helpers, or other placeholder/internal symbols.
- [x] **Step 3:** Assert package boundary: no `@resource-forge/*` in CLI dependencies (as part of this suite or an adjacent package-validation assertion).
- [x] **Step 4:** Run `pnpm --filter @resource-forge/cli test` and confirm new tests fail for the right reason (missing `run` behavior / wrong exports), not harness errors.

### Task 3: Pure `run()` implementation

**Files:**
- Create: `packages/cli/src/run.ts` (and optional tiny private version binding module if needed)
- Modify: `packages/cli/src/index.ts` — export **only** `run`

- [x] **Step 1:** Implement narrow parse for `rf [global-options] [command]` with globals `--help` / `--version` only.
- [x] **Step 2:** Select a **package-local** version source that corresponds to the installed `@resource-forge/cli` package version and is compatible with the package’s build/runtime model. MUST NOT introduce a workspace dependency or project/filesystem discovery as a `run` runtime requirement. Prefer a source/constant binding over cwd/`import.meta`-relative package walks.
- [x] **Step 3:** Implement builtins: bare/`--help` → `{0, help, ""}`; `--version` → `{0, version, ""}`.
- [x] **Step 4:** Keep an internal empty command map/registry; any command token → exit `2` unknown-command class.
- [x] **Step 5:** Unsupported global / malformed recognized argv → exit `2` invalid-global-argv class (distinguishable message).
- [x] **Step 6:** Apply `--help` over `--version` precedence; unknown-command wins over later `--help`.
- [x] **Step 7:** Identify the unexpected-failure boundary: convert unexpected throwables inside the runner to `{ exitCode: 1, stdout: "", stderr: <message> }` without process termination. Cover via a deterministic non-public mechanism **only if** one exists without expanding the public API or inventing artificial production failure semantics; otherwise rely on structural review of the catch mapping and record that in Task 5 validation/SCR notes. MUST NOT add `run(argv, testOptions)` or an exported failure injector.
- [x] **Step 8:** Re-run tests to green for Task 2 matrix (and any non-public exit-`1` coverage if present).

### Task 4: Bin adapter

**Files:**
- Create: `packages/cli/src/bin.ts`
- Ensure `package.json` `bin` points at compiled output

- [x] **Step 1:** Implement adapter: invoke `run(process.argv.slice(2))` (or equivalent); write returned `stdout`/`stderr` to process streams; then terminate with the returned exit code using `process.exit` **or an equivalent adapter-level mechanism**.
- [x] **Step 2:** Ensure streams are fully written / flushed before termination (synchronous-safe strategy or repository-established CLI/process convention). Do not casually assume fire-and-forget `write` + immediate exit is always safe.
- [x] **Step 3:** Ensure the adapter is the **only** site of process stream writes and process termination for CLI execution; `run` performs neither.
- [x] **Step 4:** Confirm `tsc` emits the bin entry and `package.json` `bin` resolves (build or typecheck as repo requires).
- [x] **Step 5:** Optional smoke: invoke the built bin with `--version` after build.

### Task 5: Docs / validation closeout

**Files:**
- Modify: `docs/roadmap.md` — mark M5.1 / RFC-036 at the appropriate lifecycle point
- Modify: this plan’s Slice Completion Report fields during M7–M10
- Specs index already Accepted for RFC-036

- [x] **Step 1:** Update roadmap M5 section to reference M5.1 CLI Foundation / RFC-036 / `#121` at the appropriate lifecycle point (final ✅ only after delivery merge + SCR convention).
- [x] **Step 2:** Fill SCR gates after M7–M10; set Status Slice complete only after delivery merge + SCR closeout per repo convention.
- [x] **Step 3:** Verify `pnpm --filter @resource-forge/cli test|typecheck|lint` green; confirm no `@resource-forge/*` in CLI `package.json` dependencies; confirm public export surface remains `run`-only.
- [x] **Step 4:** If exit `1` was covered by structural review rather than a non-public deterministic test, record that explicitly in SCR validation notes.

---

## Traceability

| Task | RFC-036 |
| --- | --- |
| 1 Package boundary / README / bin field | §3.1, §3.2, §3.4 |
| 2 `run()` tests + public-surface assertions | §3.3, §5, §6, §7 |
| 3 `run()` implementation + version source + failure boundary | §3.3, §3.5, §4, §5, §7 |
| 4 Bin adapter | §3.4, §7 |
| 5 Docs / SCR | §10, §11; process |

---

## Execution / dependency risks (operational)

1. Leaving `@resource-forge/core` dependency by habit → violates RFC-036; fail package-boundary check.
2. Loading version via cwd/`package.json` walks or project discovery → violates shell boundary spirit; use package-local source.
3. Over-building `CommandRegistry` into a public plugin API → reject; keep empty private seam.
4. Making `--help` global-anywhere (so `rf foo --help` shows help) → violates unknown-command-wins rule.
5. Calling `process.exit` / writing streams inside `run` → breaks pure-runner testing contract.
6. Expanding README with aspirational command tables → fence; cite RFC-036 non-goals.
7. Inventing `run(argv, testOptions)` solely for exit `1` → reject; use non-public seam or structural review.
8. Unrelated lockfile upgrades during Task 1 → avoid; dependency-removal metadata only.

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M5.1 CLI Foundation |
| Tracking | [#121](https://github.com/rexescario-dev/resource-forge/issues/121) |
| M4 | Implementation Plan: **Accepted** |
| M5 | Review **Accepted** (2026-08-10) |
| M6 | **Complete** |
| M7 | **Approved** (2026-08-10) |
| M8 | **N/A** (no worthwhile behavior-preserving refactor beyond slice delivery) |
| M9 | **Complete** (package README + root README CLI role + roadmap M5.1 + specs index) |
| Branch | `feat/m5-1-cli-foundation` |
| PR | [#122](https://github.com/rexescario-dev/resource-forge/pull/122) |
| Status | **Ready for merge** |

### Shipped

- Public `run(argv)` in `@resource-forge/cli` (pure `{ exitCode, stdout, stderr }`)
- `rf` bin adapter (`process.stdout`/`stderr` write + `process.exitCode`; sole process interaction)
- Framework builtins: bare/`--help` / `--version`; `--help` precedence; unknown-command wins over later `--help`
- Exit `0` / `1` / `2` mapping; unknown-command vs unknown-option distinguishable stderr
- Empty internal command registry; package-local `CLI_VERSION` constant (no fs/project discovery)
- Removed `@resource-forge/core` dependency; lockfile updated for that removal only
- Docs: package README, root README CLI role, roadmap M5.1 ✅, RFC-036 Accepted in specs index

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (`pnpm --filter @resource-forge/cli test` — 9 tests) |
| Typecheck | **Passed** |
| Lint | **Passed** |
| Build | **Passed** (`pnpm --filter @resource-forge/cli build`; optional bin smoke `--version` / unknown command) |
| Package validation | **Passed** (no `@resource-forge/*` deps; public export is `run` only) |
| Exit `1` coverage | **Structural review** — top-level `try/catch` in `run` maps unexpected throwables to `{ exitCode: 1, … }` without a public/`testOptions` injector (per Accepted plan) |
| CI on #122 | **Passed** |

### Next Gate

**Merge** per project norms, then SCR Status → **Slice complete** closeout.

### M7 outcome (record)

```text
Decision: Approved for merge
Subject: feat/m5-1-cli-foundation / tracking #121 / PR #122
Accepted specification: docs/superpowers/specs/2026-08-10-rfc-036-cli-foundation-design.md
Accepted implementation plan: docs/superpowers/plans/2026-08-10-m5-1-cli-foundation.md

Plan tasks reviewed:
- Task 1 Package boundary + bin + README: ✓
- Task 2 Failing run() tests: ✓
- Task 3 Pure run() implementation: ✓
- Task 4 Bin adapter: ✓
- Task 5 Docs / validation: ✓

Verification evidence:
- pnpm --filter @resource-forge/cli test|typecheck|lint (9 tests PASS)
- pnpm --filter @resource-forge/cli build + bin smoke
- gh pr checks 122 → ci pass

Review summary: Implements RFC-036 shell-only CLI foundation within @resource-forge/cli; no product commands, no RF workspace deps, run()-centered verification.
Blocking findings: None (no merge blockers)

Non-blocking observations (optional):
- Empty COMMAND_REGISTRY Set is intentionally minimal; do not expand into a public registration API in follow-ons without an Accepted design.
- Keep CLI_VERSION in sync with package.json version manually (package-local constant).

Gate: Merge per human/project norms. M8/M9 may follow when appropriate.
```

### M8 / M9 / M10

```text
Decision: N/A
Subject: packages/cli/src/{run,bin,index}.ts
Scope:
- packages/cli M5.1 delivery surface
Accepted specification: docs/superpowers/specs/2026-08-10-rfc-036-cli-foundation-design.md
Accepted implementation plan: docs/superpowers/plans/2026-08-10-m5-1-cli-foundation.md
M7 / authorization: Approved for merge (2026-08-10)

Maintainability goals:
- None identified that outweigh risk for this tiny shell

Changes (Complete only):
- n/a

Verification:
Before:
- cli test/typecheck/lint green
After:
- n/a (no structural change)

Externally observable behavior changes: None

Gate: N/A — proceed to M9
```

```text
Decision: Complete
Subject: M5.1 / PR #122
Accepted specification: docs/superpowers/specs/2026-08-10-rfc-036-cli-foundation-design.md
Accepted implementation plan: docs/superpowers/plans/2026-08-10-m5-1-cli-foundation.md
M7: Approved for merge
M8: N/A

Documentation scope:
- packages/cli/README.md (already descriptive in delivery)
- docs/roadmap.md (M5.1 ✅ indexing)
- docs/superpowers/specs/README.md (RFC-036 Accepted)
- README.md (package role for @resource-forge/cli)

Updated artifacts:
- README.md ← M7-approved CLI foundation surface
- docs/roadmap.md ← M5.1 ✅ / #122 linkage
- plan SCR ← M7–M10 outcomes

Editorial changes:
- none material beyond status consistency

Content updates:
- root README CLI role; roadmap M5.1 marked delivered-approved

Verification:
- Links checked (RFC-036, plan, #121, #122)
- Heading hierarchy checked
- Status consistency checked (Accepted RFC/plan; Ready for merge SCR)
- Cross-references checked
- Terminology checked (CLI surface vs package API vs run)
- Duplicates / outdated refs checked (root README no longer “CLI (future)”)

Gate: Documentation complete. Code/behavior/contracts unchanged by this stage.
```

```text
Decision: Accepted (slice process path)
Subject: M5.1 CLI Foundation workflow path
Governing specification: docs/workflows/specs/agent-workflow-design.md

Asset inventory:
- Product slice used installed M2–M9 prompts; workflow library assets were not modified

Blocking findings:
- None

Non-blocking observations:
- Full prompt-library revalidation not required for this product slice (no workflow asset changes)

Gate: Workflow path for this slice validated; library revalidation N/A
```

- **M8:** N/A — no worthwhile behavior-preserving refactor beyond M6 structure.
- **M9:** Complete — package README + root README + roadmap M5.1 indexing; RFC-036 already Accepted in specs index.
- **M10:** Accepted for this slice’s process path (gates reachable; SCR emitted; one PR per tracking issue). Workflow prompt library assets were not modified; no library revalidation required.

---

## Document status

**Status: Accepted.** Authoritative for M5.1 sequencing/execution history. RFC-036 remains authoritative for product semantics. Delivery Ready for merge via [#122](https://github.com/rexescario-dev/resource-forge/pull/122).
