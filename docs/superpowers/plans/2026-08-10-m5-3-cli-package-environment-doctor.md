# M5.3 CLI Package Environment Doctor — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD. Implement **only** Accepted RFC-038 CLI Package Environment Doctor in `@resource-forge/cli`. Do **not** invent discovery, config, stdin, Resource validation, Nest/GraphQL/Prisma/workspace probing, structured diagnostics, or `run(argv, opts)`. Do **not** treat `run` as a registry command. Do **not** assert `@resource-forge/core` exports. Preserve RFC-036/037: sole public export `run`; bin stream/exit only; exit `0/1/2` meanings unchanged; tests centered on `run(['doctor'])`. Preserve RFC-036 global `--help`/`--version` handling exactly — do **not** add a doctor-specific global parser. Use the Check-failure helper contract (expected inability → FAIL + continue; unexpected implementation throw → bubble).

**Status:** Accepted  
**M5:** Accepted (2026-08-10) — Plan Review re-entry; no plan blockers after prior return closures (expected vs unexpected check contract; minimal share/extract; registry-identity test; conditional docs; drop red-commit guidance; RFC-036 globals only for `--help doctor`). Public-export `run` only; sync core resolve; same dispatch registry object; TDD via `run(['doctor'])` retained. RFC-038 remains Accepted. M6 authorized; task checkboxes remain open until execution.  
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
├── run(argv) → { exitCode, stdout, stderr }   # sole public package API (sync)
├── RFC-036 global handling (unchanged)
├── dispatch registry: validate | doctor        # same object doctor inspects
├── doctor handler
│     ├── argv gate (zero tokens) → exit 2; no probes
│     └── collect-all isolated checks via runCheck helper:
│           version | registry | core resolve
├── internal core-resolve seam (default sync resolve; test override)
├── bin adapter unchanged (stream/exit only)
└── tests: run(['doctor']) + seam + registry-identity

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
| Public package API | **`run` only** (synchronous) |
| CLI surface | `rf doctor` (+ RFC-036 builtins/errors; coexist with `validate`) |
| Positionals after `doctor` | **Zero** |
| Integration path | `run(['doctor'])` |
| Bin | Stream/exit only; **MUST NOT** special-case doctor |
| Argv gate | Completes **before** any health probes |
| Checks | Collect-all; isolated; expected inability → check FAIL |
| Expected vs unexpected | See **Check-failure helper contract** below |
| Version | Reuse existing RFC-036 package-local version source; extract only if needed for shared consumption |
| Registry | Same object as CLI dispatch; contains `validate` + `doctor`; **not** `run`; no parallel expected-commands list |
| Core | Synchronous resolvability only; **no** export assertions |
| Entrypoint tautology | No separate “CLI package loads” check |
| Exit `0` | Well-formed doctor; all checks pass; report → **stdout** |
| Exit `1` | Expected health failure (report → **stdout**) **or** unexpected throw (message → **stderr**; **no** required three-check report) |
| Exit `2` | Usage: extra tokens / post-command options; plus RFC-036 usage |
| Global `--help` / `--version` | **Existing RFC-036 handling only** before command dispatch; no doctor-specific global parser |
| `run(argv, opts)` / public probes | **Forbidden** |
| Discovery / Resource validation / adapters / workspace inventory | **Forbidden** |
| Docs | Update only surfaces rendered inaccurate by adding `doctor` |

### Check-failure helper contract (planning aid — executable semantics from RFC-038 §5–§6)

Each normative check MUST be invoked through a small internal helper (name non-normative), e.g. `runCheck(id, probe): DoctorCheckResult`, with this contract:

| Situation | Classification | Effect |
| --- | --- | --- |
| Probe establishes condition | Pass | `{ id, ok: true }` — continue siblings |
| Core cannot resolve (sync resolve throws / fails as expected inability) | **Expected health failure** | `{ id: 'core', ok: false }` — **continue** siblings → overall exit `1` + stdout report |
| Version empty / unavailable | **Expected health failure** | `{ id: 'version', ok: false }` — **continue** → exit `1` + stdout report |
| Dispatch registry missing `validate` or `doctor` | **Expected health failure** | `{ id: 'registry', ok: false }` — **continue** → exit `1` + stdout report |
| Unexpected exception in check **implementation** (programming/runtime bug outside the expected-inability path the probe is designed to catch) | **Unexpected internal failure** | Do **not** convert to check FAIL; let it bubble to `run`’s RFC-036 unexpectedFailure path → exit `1` + **stderr**; **no** required three-check report |

Concrete mapping for the core probe:

1. Default probe: sync resolve of `@resource-forge/core` (no export reads).
2. If resolve fails in the manner the probe treats as “not resolvable” → return check **FAIL** (expected).
3. Do **not** let a routine “module not found / cannot resolve” become an unexpected stderr abort that skips remaining checks.
4. True unexpected bugs (e.g. null deref in report formatting after checks) remain unexpected.

### Planning placement of modules (non-normative; extract only as needed)

```text
packages/cli/src/
  # Prefer minimal change. Extract modules only when needed for same-source / same-object sharing:
  cli-version.ts              # OPTIONAL extract of existing package-local version constant
  command-registry.ts         # OPTIONAL extract so dispatch + doctor share one Map object
  resolve-core.ts             # default sync core resolve + internal test seam
  commands/doctor.ts          # argv gate + runCheck collect-all + report + exits
  run.ts                      # existing globals + dispatch; register doctor; help lists doctor
  run.test.ts                 # doctor + registry-identity + RFC-036/037 regressions
  bin.ts                      # untouched
  index.ts                    # export { run } only
packages/cli/README.md        # document doctor (required if surface list is inaccurate)
```

**Registry sharing rule:** Doctor MUST inspect the **same object** used by CLI dispatch. Extract/share into a module **only if** that is the cleanest way to keep one object; otherwise doctor may receive the existing registry reference from `run`’s module without a drive-by file split. Do **not** maintain `EXPECTED_DOCTOR_COMMANDS = ['validate','doctor']` separate from dispatch.

**Version sharing rule:** Reuse the existing RFC-036 package-local version source (`CLI_VERSION` or successor). Extract to a shared module **only if** needed so `--version` and doctor consume the same source. Do **not** invent filesystem/`package.json` discovery.

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
type ResolveCore = () => void; // success = return; expected inability = throw typed/known failure
// default: sync resolve of '@resource-forge/core'
// test-only: setResolveCoreForTests(fn) / reset — same-package; not exported from index
```

---

## Goal / non-goals of this plan

**Goal:** Sequence M6 so `@resource-forge/cli` ships RFC-038 `doctor`: register/dispatch, zero-arity argv gate, collect-all isolated checks via explicit expected-vs-unexpected contract, human report, exit/stream mapping, `run`-centered tests (including registry identity), internal core-failure seam.

**Non-goals (plan):** Project/workspace doctor; Resource validation; discovery/config/stdin; Nest/GraphQL/Prisma probing; generators; public probe API; `run(argv, opts)`; making `run` async; structured diagnostics; amending core; inventing semantics missing from RFC-038; premature refactors beyond same-source/same-object sharing needs.

---

## Constraints (SHALL / SHALL NOT)

Derived only from Accepted RFC-038 (and preserved RFC-036/037 shell rules):

1. SHALL keep `run(argv)` as the sole public package export and **synchronous**.
2. SHALL register `doctor` in the **same** internal dispatch registry object used by `run`, alongside `validate`.
3. SHALL accept **zero** tokens after `doctor`; extra positionals or post-command options → exit `2` stderr; **MUST NOT** run probes on usage failure.
4. SHALL run version, registry, and core checks collect-all and isolated after a well-formed invocation using the **Check-failure helper contract** (expected inability → FAIL + continue; unexpected implementation throw → bubble).
5. SHALL reuse the existing package-local version source; empty/unavailable → version FAIL; SHALL NOT invent new version discovery.
6. SHALL inspect the dispatch registry for `validate` and `doctor`; SHALL NOT require `run` in the registry; SHALL NOT use a parallel expected-commands list.
7. SHALL probe `@resource-forge/core` resolvability only (sync resolve/import-equivalent); SHALL NOT assert exports.
8. SHALL map: all pass → `0` + stdout report; any check FAIL → `1` + stdout report; usage → `2` stderr; unexpected throw → `1` stderr without required three-check report.
9. SHALL NOT write streams or call `process.exit` inside `run` / handlers.
10. SHALL NOT introduce `run(argv, opts)` or export probe/registry/version helpers.
11. SHALL NOT perform discovery, config, Resource validation, or adapter/workspace probing.
12. SHALL center verification on `run(['doctor'])`; MAY use an internal-only core-resolve test seam; SHALL include a registry-identity verification.
13. SHALL preserve RFC-036 global handling before command dispatch (including `--help` + command token cases); SHALL NOT add a doctor-specific global parser.
14. SHALL preserve RFC-036/037 validate and builtin behaviors (regression tests remain green).
15. SHALL NOT change RFC-036/037 exit-code meanings or invent new exit codes.

---

## Ownership boundaries

| Area | Ownership |
| --- | --- |
| `packages/cli/**` | **Owns** M5.3 delivery |
| `packages/core` | **Consumed only** — no product changes (resolvability probe only) |
| `packages/nest`, `graphql`, `prisma` | **Untouched** |
| `examples/**` | **Untouched** |
| Docs | Update **only** docs that currently describe the CLI command surface or M5.3 lifecycle and become inaccurate when `doctor` ships |

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

1. **Fail first** on `run(['doctor'])` cases before wiring registry/handler: add test → run red → implement → run green. Do **not** require committing intentionally red commits.
2. Required `run()` coverage (RFC-038 §8 + RFC-036/037 regressions):
   - `run(['doctor'])` healthy → exit `0`; stdout contains stable labels/statuses for `version`, `registry`, `core` all pass; stderr `''`
   - With internal seam forcing core resolve to fail → exit `1`; stdout still reports all three checks; `core` marked fail; `version`/`registry` still reported (collect-all)
   - `run(['doctor', 'extra'])` → exit `2`; stderr non-empty; stdout `''`; **no** probe side effects
   - `run(['doctor', '--flag'])` → exit `2`
   - `run(['--help', 'doctor'])` → help via **existing RFC-036 global handling before command dispatch** (not a doctor-specific parser); not a doctor health report
   - **Registry identity:** establish (via same-package internal fixture/behavior) that doctor’s registry check observes the **same dispatch Map object** `run` uses — e.g. temporarily unregister `validate` on that object and assert doctor reports `registry` FAIL (then restore). Protects against a parallel `EXPECTED_DOCTOR_COMMANDS` list.
   - RFC-036/037 regressions: bare/`--help`/`--version`/unknown command/`validate` success path still pass
3. Public-surface assertion: still exports only `run`; RF workspace deps remain **only** `@resource-forge/core`.
4. `pnpm --filter @resource-forge/cli test|typecheck|lint|build` must pass.
5. Assert labels/statuses + exits/streams — **not** brittle full-output snapshots.

---

## Task breakdown

### Task 1: Share version source + dispatch registry (minimal)

**Files (as needed):**
- Optionally create: `packages/cli/src/cli-version.ts`
- Optionally create: `packages/cli/src/command-registry.ts`
- Modify: `packages/cli/src/run.ts` (and validate registration path only if imports move)

- [x] **Step 1:** Reuse the existing RFC-036 package-local version source for doctor. Extract to a shared module **only if** needed so `--version` and doctor consume the **same** source. Do **not** add filesystem/`package.json` discovery.
- [x] **Step 2:** Ensure doctor will inspect the **same** dispatch registry object `run` uses. Extract/share into a module **only if** necessary for that identity; otherwise keep the map where it lives and pass/share the reference. Preserve existing validate dispatch behavior.
- [x] **Step 3:** Ensure nothing new is exported from `index.ts`.
- [x] **Step 4:** Run existing CLI tests — all PASS (any extract is behavior-preserving).
- [x] **Step 5:** Commit if there was a real share/extract; skip a no-op commit if nothing moved yet and Task 3 will register `doctor` in place.

### Task 2: Failing `run(['doctor'])` tests (TDD)

**Files:**
- Modify: `packages/cli/src/run.test.ts`

- [x] **Step 1:** Write tests for healthy doctor, usage (extra positional / option), RFC-036 help-before-dispatch (`['--help','doctor']`), and registry-identity (may land with Task 3 if it needs the seam/registry hook — prefer writing healthy/usage/help first).
- [x] **Step 2:** Run `pnpm --filter @resource-forge/cli test` — establish **red** for new doctor cases; RFC-036/037 cases still pass.
- [x] **Step 3:** Proceed to implementation (Task 3) to green — do **not** treat committing red tests as a required step.

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
- Modify: `packages/cli/src/run.ts` (register `doctor` on the **existing** dispatch registry; update help text)
- Modify: `packages/cli/src/run.test.ts` (green cases + core-failure + registry-identity)

- [x] **Step 1:** Implement default **sync** resolve of `@resource-forge/core` (e.g. `createRequire(import.meta.url).resolve('@resource-forge/core')`). Do not assert exports.
- [x] **Step 2:** Add internal-only `setResolveCoreForTests` / `resetResolveCoreForTests` (or equivalent) — **not** exported from `index.ts`; **not** `run(argv, opts)`.
- [x] **Step 3:** Implement `runCheck` (or equivalent) per the **Check-failure helper contract**: expected inability → `{ ok: false }`; unexpected implementation throw → rethrow/bubble.
- [x] **Step 4:** Implement `runDoctor(argvAfterCommand)`:
  - If any remaining tokens → exit `2` usage; **return before probes**
  - Else run version / registry / core via `runCheck` (collect-all)
  - Render deterministic stdout report with stable labels/statuses
  - Exit `0` if all ok else `1` (expected health failures only on this path)
- [x] **Step 5:** Register `doctor` on the **same** dispatch registry object; update root help to list `doctor`. Do **not** add a second expected-commands list. Do **not** add a doctor-specific global `--help`/`--version` parser — rely on existing RFC-036 handling in `run` before dispatch.
- [x] **Step 6:** Green core-failure test (seam → `core` FAIL, siblings still reported, exit `1`, stdout report).
- [x] **Step 7:** Green registry-identity test (mutate/unregister on the real dispatch map → `registry` FAIL; restore).
- [x] **Step 8:** Fix stale `index.ts` comment if it still says “No product commands.”
- [x] **Step 9:** Run `pnpm --filter @resource-forge/cli test|typecheck|lint` — PASS.
- [x] **Step 10:** Confirm public export remains `run` only.

### Task 4: Docs + SCR closeout (conditional)

**Files:**
- Modify: `packages/cli/README.md` (expected — current surface omits `doctor`)
- Modify: `README.md` **only if** the root CLI role/surface text becomes inaccurate
- Modify: `docs/roadmap.md` **only for** M5.3 lifecycle accuracy (Draft plan → Accepted plan → ✅ after merge)
- Modify: this plan’s SCR during M7–M10

- [x] **Step 1:** Update package README: `rf doctor`, exit table (healthy / health fail / usage), out-of-scope (project doctor, discovery, generators). Keep `validate` accurate.
- [x] **Step 2:** Touch root README / roadmap **only** where current wording is rendered inaccurate by shipping `doctor`.
- [x] **Step 3:** Fill SCR gates after M7–M10; set Status Slice complete only after delivery merge + SCR closeout.
- [x] **Step 4:** Final `pnpm --filter @resource-forge/cli test typecheck lint build`.

---

## Traceability (Accepted RFC-038 → tasks)

| RFC-038 section | Tasks |
| --- | --- |
| §3.1 core dependency continues | Task 3 (no new dep) |
| §3.2 `run` only | Tasks 1–4 |
| §3.3 / §4 argv + CLI surface | Tasks 2–3 |
| §5 checks (isolation, registry identity, core resolvability, tautology) | Tasks 1, 3 |
| §6 exits/streams + unexpected report exemption | Tasks 2–3 |
| §7 output labels/statuses | Tasks 2–3 |
| §8 testing + internal seam | Tasks 2–3 |
| §13 deferrals | All tasks (fence) |

---

## Execution / dependency risks (operational)

1. **`run` must stay sync** — use sync resolve for core; do not convert `run` to async for `import()`.
2. **Single dispatch registry object** — doctor MUST NOT keep a parallel expected-command list (RFC-038 §5.2); registry-identity test guards this.
3. **Expected vs unexpected** — routine resolve miss / empty version / missing registry entry MUST be check FAIL + continue; only true implementation bugs bubble to stderr unexpected path.
4. **Usage before probes** — exit `2` paths never call resolve/version/registry probes.
5. Do not export the core-resolve test seam from `index.ts`.
6. Preserve validate behavior; `--help doctor` relies on **existing** RFC-036 globals, not a new doctor parser.
7. Avoid premature file extraction — share/extract only for same-source version or same-object registry identity.

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M5.3 CLI Package Environment Doctor |
| Tracking | [#128](https://github.com/rexescario-dev/resource-forge/issues/128) |
| M4 | Implementation Plan: **Accepted** |
| M5 | Review **Accepted** (2026-08-10) |
| M6 | **Complete** |
| M7 | **Approved** (2026-08-10) |
| M8 | **N/A** (no worthwhile behavior-preserving refactor beyond slice delivery) |
| M9 | **Complete** (package README + root README CLI role + roadmap M5.3) |
| M10 | **Accepted** (slice process path; workflow library assets unmodified) |
| Branch | `feat/m5-3-cli-doctor` |
| PR | [#130](https://github.com/rexescario-dev/resource-forge/pull/130) |
| Status | **Slice complete** |

### Shipped

- Registered `doctor` command: `rf doctor` / `run(['doctor'])`
- Collect-all isolated checks: version (package-local), dispatch registry (`validate` + `doctor`), sync `@resource-forge/core` resolvability
- `runCheck` expected-vs-unexpected failure contract; internal core-resolve test seam
- Shared `CLI_VERSION` + `COMMAND_REGISTRY` (same object as dispatch)
- Public API remains `run` only; bin unchanged

### Verification

| Check | Result |
| --- | --- |
| `pnpm --filter @resource-forge/cli test` | **PASS** (28 tests: 24 run + 4 document; tinypool teardown noise only) |
| typecheck / lint / build | **PASS** |
| CI | **Passed** on [#130](https://github.com/rexescario-dev/resource-forge/pull/130) |
| Public export `run` only | **PASS** |
| Sole RF workspace dep `core` | **PASS** |

### Next Gate

**None — slice complete.** Delivery merged via [#130](https://github.com/rexescario-dev/resource-forge/pull/130).

---

**Status: Accepted.** Authoritative for M5.3 sequencing/execution history. RFC-038 remains authoritative for product semantics. Delivery complete via [#130](https://github.com/rexescario-dev/resource-forge/pull/130).
