# M5.3 CLI Package Environment Doctor — Implementation Tasks

> **For agentic workers:** Status is **Draft** (awaiting M5 Plan Review). REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` **after** this plan is Accepted. Follow TDD. Implement **only** Accepted RFC-038 CLI Package Environment Doctor in `@resource-forge/cli`. Do **not** invent discovery, config, stdin, Resource validation, Nest/GraphQL/Prisma/workspace probing, structured diagnostics, or `run(argv, opts)`. Do **not** treat `run` as a registry command. Do **not** assert `@resource-forge/core` exports. Preserve RFC-036/037: sole public export `run`; bin stream/exit only; exit `0/1/2` meanings unchanged; tests centered on `run(['doctor'])`. Preserve RFC-036 global `--help`/`--version` handling exactly.

**Status:** Draft  
**Tracking:** [#128](https://github.com/rexescario-dev/resource-forge/issues/128)  
**Source RFC:** [RFC-038 CLI Package Environment Doctor](../specs/2026-08-10-rfc-038-cli-package-environment-doctor-design.md) (**Accepted**)  
**Depends on:** [RFC-036 CLI Foundation](../specs/2026-08-10-rfc-036-cli-foundation-design.md) (**Accepted**); [RFC-037 CLI Resource Validation](../specs/2026-08-10-rfc-037-cli-resource-validation-design.md) (**Accepted**); existing `@resource-forge/cli → @resource-forge/core` workspace dependency  
**Package:** `@resource-forge/cli` (continues to depend on `@resource-forge/core` per RFC-037/038)  
**Slice:** M5.3 only — `rf doctor` CLI/package environment health  
**Goal:** Deliver registered `doctor` with zero post-command tokens so `run(['doctor'])` runs collect-all isolated checks (non-empty package-local version; dispatch registry has `validate` + `doctor`; synchronous `@resource-forge/core` resolvability) and maps outcomes to RFC-038 exit/stream contracts—without discovery, Resource validation, or public probe APIs.

**Architecture:**

```text
RFC-038 (Accepted)
└── CLI Package Environment Doctor (doctor only)

@resource-forge/cli
├── run(argv) → { exitCode, stdout, stderr }   # sole public package API
├── registry: validate | doctor (internal; shared module)
├── doctor handler
│     ├── argv gate (zero tokens) → exit 2; no probes
│     └── collect-all isolated checks:
│           version | registry (same dispatch map) | core resolve
├── internal core-resolve seam (default sync resolve; test override)
├── bin adapter unchanged (stream/exit only)
└── tests: run(['doctor']) + internal seam for core-missing

Allowed dep: @resource-forge/core (already present)
Forbidden: nest | graphql | prisma | run(argv, opts) | public probe API | async run()
```

**Tech Stack:** TypeScript strict, Vitest, Node ≥20. Prefer extending the existing custom runner (no third-party CLI framework). Core resolvability via **synchronous** resolve (e.g. `createRequire(import.meta.url).resolve('@resource-forge/core')` or equivalent)—RFC-038 allows “dynamic import **or equivalent resolve**”; `run` MUST remain synchronous per RFC-036.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-038 Accepted (#128 / PR #129)
       ↓
M5.3 plan Draft → M5 Plan Review → (Accept or Return)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M10 as applicable + Slice Completion Report
       ↓
prefer one delivery PR for tracking #128 containing Accepted plan
+ implementation + SCR
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M5.3 delivery slice. Do **not** open a separate plan-only merge PR as a required gate. Fold plan Accept + implementation into the delivery PR for `#128` when executing M5–M6. M6 treats Accepted RFC-038 text as authoritative for semantics.

**Task checkboxes:** Completed during **M6 execution** only. Leave unchecked until M6 runs.

---

## Locked decisions (planning aids — not new product semantics)

| Decision | Lock (from RFC-038) |
| --- | --- |
| Product semantics owner | RFC-038 Accepted text only |
| Package | `@resource-forge/cli` |
| Workspace deps | Continues `@resource-forge/core` only among RF packages; nest/graphql/prisma forbidden |
| Public package API | **`run` only** |
| CLI surface | `rf doctor` (+ RFC-036 builtins/errors; coexist with `validate`) |
| Positionals after `doctor` | **Zero** |
| Integration path | `run(['doctor'])` |
| Bin | Stream/exit only; **MUST NOT** special-case doctor |
| Argv gate | Completes **before** any health probes |
| Checks | Collect-all; isolated; expected inability → check FAIL |
| Version | Non-empty package-local CLI version string (existing `CLI_VERSION` source) |
| Registry | Same internal dispatch registry as `run`; must contain `validate` + `doctor`; **not** `run` |
| Core | Synchronous resolvability only; **no** export assertions |
| Entrypoint tautology | No separate “CLI package loads” check |
| Exit `0` | Well-formed doctor; all checks pass; report → **stdout** |
| Exit `1` | Expected health failure (report → **stdout**) **or** unexpected throw (message → **stderr**; **no** required three-check report) |
| Exit `2` | Usage: extra tokens / post-command options; plus RFC-036 usage |
| Streams | Do not change RFC-036/037 exit meanings |
| Global `--help` / `--version` | **Preserve RFC-036 exactly**; dispatch `doctor` only when identified as the command |
| `run(argv, opts)` / public probes | **Forbidden** |
| Discovery / Resource validation / adapters / workspace inventory | **Forbidden** |
| README | Descriptive surface including `doctor`; keep generators/project-doctor out of scope |

### Planning placement of modules (non-normative layout)

```text
packages/cli/src/
  cli-version.ts              # package-local CLI_VERSION (shared by --version + doctor)
  command-registry.ts         # private COMMAND_REGISTRY map + register helpers
  resolve-core.ts             # default sync core resolve + internal test seam setter
  commands/doctor.ts          # argv gate + collect-all checks + report + exits
  commands/validate.ts        # unchanged behavior (may import shared registry if needed)
  run.ts                      # globals + dispatch via shared registry; help lists doctor
  run.test.ts                 # RFC-036/037 regressions + doctor integration via run()
  bin.ts                      # untouched adapter role
  index.ts                    # export { run } only
packages/cli/README.md        # document doctor surface + exit table
```

Keep the registry as a **small private module** shared by `run` dispatch and the doctor registry check. Do **not** invent a public plugin API. Do **not** maintain a second “expected commands” list solely for doctor.

Internal check outcome shape (planning aid — not a public contract):

```ts
type DoctorCheckId = 'version' | 'registry' | 'core';
type DoctorCheckResult = {
  readonly id: DoctorCheckId;
  readonly ok: boolean;
  readonly detail?: string; // non-normative prose
};
```

Stable **labels** for stdout (planning aid — tests assert these or equivalent fixed ids):

| Check id | Stable label (recommended) |
| --- | --- |
| `version` | `version` |
| `registry` | `registry` |
| `core` | `core` |

Pass/fail status tokens recommended: `ok` / `FAIL` (or `pass` / `fail`) — pick one pair and keep deterministic.

Core-resolve seam (planning aid):

```ts
type ResolveCore = () => void; // throw or return; success = no throw
// default: sync resolve of '@resource-forge/core'
// test-only: setResolveCoreForTests(fn) / reset — same-package; not exported from index
```

---

## Goal / non-goals of this plan

**Goal:** Sequence M6 so `@resource-forge/cli` ships RFC-038 `doctor`: register/dispatch, zero-arity argv gate, collect-all isolated checks (version / dispatch registry / sync core resolve), human report, exit/stream mapping, `run`-centered tests, internal core-failure seam.

**Non-goals (plan):** Project/workspace doctor; Resource validation; discovery/config/stdin; Nest/GraphQL/Prisma probing; generators; public probe API; `run(argv, opts)`; making `run` async; structured diagnostics; amending core; inventing semantics missing from RFC-038.

---

## Constraints (SHALL / SHALL NOT)

Derived only from Accepted RFC-038 (and preserved RFC-036/037 shell rules):

1. SHALL keep `run(argv)` as the sole public package export and **synchronous**.
2. SHALL register `doctor` in the **same** internal dispatch registry used by `run`, alongside `validate`.
3. SHALL accept **zero** tokens after `doctor`; extra positionals or post-command options → exit `2` stderr; **MUST NOT** run probes on usage failure.
4. SHALL run version, registry, and core checks collect-all and isolated after a well-formed invocation; expected inability → check FAIL without aborting siblings.
5. SHALL use the existing package-local version source; empty/unavailable → version FAIL.
6. SHALL inspect the dispatch registry for `validate` and `doctor`; SHALL NOT require `run` in the registry.
7. SHALL probe `@resource-forge/core` resolvability only (sync resolve/import-equivalent); SHALL NOT assert exports.
8. SHALL map: all pass → `0` + stdout report; any check FAIL → `1` + stdout report; usage → `2` stderr; unexpected throw → `1` stderr without required three-check report.
9. SHALL NOT write streams or call `process.exit` inside `run` / handlers.
10. SHALL NOT introduce `run(argv, opts)` or export probe/registry/version helpers.
11. SHALL NOT perform discovery, config, Resource validation, or adapter/workspace probing.
12. SHALL center verification on `run(['doctor'])`; MAY use an internal-only core-resolve test seam.
13. SHALL preserve RFC-036/037 validate and builtin behaviors (regression tests remain green).
14. SHALL NOT change RFC-036/037 exit-code meanings or invent new exit codes.

---

## Ownership boundaries

| Area | Ownership |
| --- | --- |
| `packages/cli/**` | **Owns** M5.3 delivery |
| `packages/core` | **Consumed only** — no product changes (resolvability probe only) |
| `packages/nest`, `graphql`, `prisma` | **Untouched** |
| `examples/**` | **Untouched** |
| Docs: RFC-038 (Accepted), this plan, package README, roadmap M5.3 note | Allowed documentation updates for the slice |

---

## Contract inventory

| Surface | Kind | RFC-038 |
| --- | --- | --- |
| `run(argv)` | Public package API (unchanged) | §3.2 |
| `rf doctor` | CLI surface | §3.3 / §4 |
| Zero post-command tokens | Argv contract | §4 |
| Version / registry / core checks | Internal health probes | §5 |
| Exit `0/1/2` + streams | Process contract | §6 |
| Report labels/statuses | Output contract | §7 |
| Internal core-failure seam | Test aid (non-public) | §8 |
| Project doctor / discovery / public probes | Deferred | §1.2 / §13 |

---

## TDD / verification strategy

1. **Fail first** on `run(['doctor'])` cases before wiring registry/handler.
2. Required `run()` coverage (RFC-038 §8 + RFC-036/037 regressions):
   - `run(['doctor'])` healthy → exit `0`; stdout contains stable labels/statuses for `version`, `registry`, `core` all pass; stderr `''`
   - With internal seam forcing core resolve to fail → exit `1`; stdout still reports all three checks; `core` marked fail; `version`/`registry` still reported
   - `run(['doctor', 'extra'])` → exit `2`; stderr non-empty; stdout `''`; **no** probe side effects (seam not invoked / counters unchanged if instrumented)
   - `run(['doctor', '--flag'])` → exit `2`
   - `run(['--help', 'doctor'])` / help precedence → help (RFC-036), not doctor report
   - RFC-036/037 regressions: bare/`--help`/`--version`/unknown command/`validate` success path still pass
3. Public-surface assertion: still exports only `run`; RF workspace deps remain **only** `@resource-forge/core`.
4. `pnpm --filter @resource-forge/cli test|typecheck|lint|build` must pass.
5. Assert labels/statuses + exits/streams — **not** brittle full-output snapshots.

---

## Task breakdown

### Task 1: Shared version + registry modules (refactor for doctor)

**Files:**
- Create: `packages/cli/src/cli-version.ts`
- Create: `packages/cli/src/command-registry.ts`
- Modify: `packages/cli/src/run.ts`
- Modify: `packages/cli/src/commands/validate.ts` (only if needed for import paths; behavior unchanged)

- [ ] **Step 1:** Extract `CLI_VERSION` to `cli-version.ts` (same string source used by `--version` and doctor version check).
- [ ] **Step 2:** Move `COMMAND_REGISTRY` into `command-registry.ts` as the **single** dispatch map; `run.ts` dispatches from it; validate remains registered.
- [ ] **Step 3:** Ensure nothing new is exported from `index.ts`.
- [ ] **Step 4:** Run existing CLI tests — all PASS (behavior-preserving refactor).
- [ ] **Step 5:** Commit refactor.

### Task 2: Failing `run(['doctor'])` tests (TDD)

**Files:**
- Modify: `packages/cli/src/run.test.ts`

- [ ] **Step 1:** Write failing tests for healthy doctor, usage (extra positional / option), help-precedence regression, and a placeholder for core-failure once the seam exists (or skip core-failure until Task 3 if seam not yet present—prefer writing the healthy/usage cases first).
- [ ] **Step 2:** Run `pnpm --filter @resource-forge/cli test` — new doctor cases **FAIL** (unknown command or missing behavior); RFC-036/037 cases still pass.
- [ ] **Step 3:** Commit failing tests (red) if preferred; otherwise keep with implementation.

Example assertions (informative):

```ts
it('doctor reports healthy environment', () => {
  const result = run(['doctor']);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe('');
  expect(result.stdout).toMatch(/version/i);
  expect(result.stdout).toMatch(/registry/i);
  expect(result.stdout).toMatch(/core/i);
});

it('doctor returns exit 2 with extra positional', () => {
  const result = run(['doctor', 'extra']);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe('');
  expect(result.stderr.length).toBeGreaterThan(0);
});
```

### Task 3: Core-resolve seam + doctor checks + handler

**Files:**
- Create: `packages/cli/src/resolve-core.ts`
- Create: `packages/cli/src/commands/doctor.ts`
- Modify: `packages/cli/src/command-registry.ts` / `run.ts` (register `doctor`; update help text)
- Modify: `packages/cli/src/run.test.ts` (green cases + core-failure via seam)

- [ ] **Step 1:** Implement default **sync** resolve of `@resource-forge/core` (e.g. `createRequire(import.meta.url).resolve('@resource-forge/core')`). Wrap expected resolve failure as check FAIL; do not assert exports.
- [ ] **Step 2:** Add internal-only `setResolveCoreForTests` / `resetResolveCoreForTests` (or equivalent) in `resolve-core.ts` — **not** exported from `index.ts`; **not** `run(argv, opts)`.
- [ ] **Step 3:** Implement `runDoctor(argvAfterCommand)`:
  - If any remaining tokens → exit `2` usage (options starting with `-` or extra positionals); **return before probes**
  - Else run three isolated checks (try/catch per check converting expected inability → FAIL; unexpected throw may bubble to `run`’s unexpectedFailure path)
  - Render deterministic stdout report with stable labels/statuses
  - Exit `0` if all ok else `1`
- [ ] **Step 4:** Register `doctor` on the **same** dispatch registry; update root help to list `doctor`.
- [ ] **Step 5:** Add/green core-failure test using the internal seam (collect-all still reports version/registry).
- [ ] **Step 6:** Fix stale `index.ts` comment if it still says “No product commands.”
- [ ] **Step 7:** Run `pnpm --filter @resource-forge/cli test|typecheck|lint` — PASS.
- [ ] **Step 8:** Confirm public export remains `run` only.

### Task 4: README + roadmap + SCR closeout

**Files:**
- Modify: `packages/cli/README.md`
- Modify: `README.md` (root CLI role if needed)
- Modify: `docs/roadmap.md` (lifecycle notes; final ✅ only after delivery merge + SCR)
- Modify: this plan’s SCR during M7–M10

- [ ] **Step 1:** Document `rf doctor`, exit table (healthy / health fail / usage), and out-of-scope (project doctor, discovery, generators). Keep `validate` docs accurate.
- [ ] **Step 2:** Update roadmap M5.3 line through Draft plan → Accepted plan → ✅ after merge.
- [ ] **Step 3:** Fill SCR gates after M7–M10; set Status Slice complete only after delivery merge + SCR closeout.
- [ ] **Step 4:** Final `pnpm --filter @resource-forge/cli test typecheck lint build`.

---

## Traceability (Accepted RFC-038 → tasks)

| RFC-038 section | Tasks |
| --- | --- |
| §3.1 core dependency continues | Tasks 1, 3 (no new dep) |
| §3.2 `run` only | Tasks 1–4 |
| §3.3 / §4 argv + CLI surface | Tasks 2–3 |
| §5 checks (isolation, registry identity, core resolvability, tautology) | Task 3 |
| §6 exits/streams + unexpected report exemption | Tasks 2–3 |
| §7 output labels/statuses | Tasks 2–3 |
| §8 testing + internal seam | Tasks 2–3 |
| §13 deferrals | All tasks (fence) |

---

## Execution / dependency risks (operational)

1. **`run` must stay sync** — use sync resolve for core; do not convert `run` to async for `import()`.
2. **Single dispatch registry** — doctor MUST NOT keep a parallel expected-command list (RFC-038 §5.2).
3. **Isolation** — a failed core resolve or empty version MUST be check FAIL, not an early unexpected stderr path that skips sibling checks.
4. **Usage before probes** — instrument or structure code so exit `2` paths never call resolve/version probes.
5. Do not export the core-resolve test seam from `index.ts`.
6. Preserve validate behavior and RFC-036 help/`--help doctor` semantics.

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M5.3 CLI Package Environment Doctor |
| Tracking | [#128](https://github.com/rexescario-dev/resource-forge/issues/128) |
| M4 | Implementation Plan: **Draft** (this document) |
| M5 | Pending Plan Review |
| M6 | Pending |
| M7 | Pending |
| M8 | Pending |
| M9 | Pending |
| M10 | Pending |
| Branch | `feat/m5-3-cli-doctor` |
| PR | TBD (delivery) |
| Status | **Draft plan** |

### Shipped

_(fill during M6–M9)_

### Verification

| Check | Result |
| --- | --- |
| `pnpm --filter @resource-forge/cli test` | Pending |
| typecheck / lint / build | Pending |
| CI | Pending |
| Public export `run` only | Pending |
| Sole RF workspace dep `core` | Pending |

### Next Gate

**M5 Plan Review** — Accept or Return this Draft plan. Do not begin M6 until Accepted.

---

**Status: Draft.** Authoritative for M5.3 sequencing once Accepted at M5. RFC-038 remains authoritative for product semantics.
