# M5.5 CLI Init Project Marker — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD. Implement **only** Accepted RFC-040 CLI Init Project Marker in `@resource-forge/cli`. Do **not** invent project-aware `generate`/`validate`/`doctor`, upward discovery, shared project APIs, core marker exports, `@resource-forge/project`, `--force`, `--resources-dir`, soft-repair, overwrite, starter Resource JSON, Nest/GraphQL/Prisma scaffolding, `from-prisma`, other generate kinds, `run(argv, opts)`, public init helpers, or `init`-specific help. Do **not** populate `examples/basic`. Preserve RFC-036/037/038/039: sole public export `run`; bin stream/exit only; exit `0/1/2` meanings unchanged; doctor registry still requires only `validate` + `doctor`. Tests centered on `run(['init', …])`. Preserve RFC-036 global `--help`/`--version` handling exactly. Classify before any filesystem mutation. Create only when both RF artifacts are absent. Marker publication MUST be same-directory complete stage then **`linkSync`** to `resource-forge.json` (forbid final-path `wx`, overwrite rename, copy-into-final). After successful `link`, return exit `0` (staging unlink only non-throwing best-effort). Failed create MUST NOT leave a conforming project.

**Status:** Accepted  
**M5:** Accepted (2026-08-10) — Plan Review re-entry; no plan blockers after prior return closures (marker publication locked to same-dir stage + `linkSync`; post-`link` unlink non-throwing best-effort only; immediate exit `0` after successful `link`; unreadable/uninspectable coverage; post-classify FS failures → `1`; global-help-only; SCR gate labels). Editorial Accept note retained: create-order row means the locked `linkSync` primitive (not a second publication strategy). Public-export `run` only; TDD via `run(['init', …])` retained. RFC-040 remains Accepted. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#135](https://github.com/rexescario-dev/resource-forge/issues/135)  
**Source RFC:** [RFC-040 CLI Init Project Marker](../specs/2026-08-10-rfc-040-cli-init-project-marker-design.md) (**Accepted**)  
**Depends on:** [RFC-036 CLI Foundation](../specs/2026-08-10-rfc-036-cli-foundation-design.md) (**Accepted**); [RFC-037 CLI Resource Validation](../specs/2026-08-10-rfc-037-cli-resource-validation-design.md) (**Accepted**); [RFC-038 CLI Package Environment Doctor](../specs/2026-08-10-rfc-038-cli-package-environment-doctor-design.md) (**Accepted**); [RFC-039 CLI Generate Resource](../specs/2026-08-10-rfc-039-cli-generate-resource-design.md) (**Accepted**) — coexist only; semantics not reopened  
**Package:** `@resource-forge/cli`  
**Slice:** M5.5 only — `rf init [path]`  
**Goal:** Deliver registered flat `init` so `run(['init'])` / `run(['init', path])` runs argv gate → direct resolve → classify (creatable / conforming / conflict) → no-op or create canonical `resource-forge.json` + `resources/` with RFC-040 exit/write-safety contracts—without teaching siblings to load the marker and without app scaffolding.

**Architecture:**

```text
RFC-040 (Accepted)
└── CLI Init Project Marker (init only)

@resource-forge/cli
├── run(argv) → { exitCode, stdout, stderr }   # sole public package API (sync)
├── RFC-036 global handling (unchanged)
├── dispatch registry: validate | doctor | generate | init
├── init handler
│     ├── argv gate (≤1 positional; reject option-like tokens) → exit 2
│     ├── resolve target (default "."; process cwd; no upward discovery)
│     ├── classify before mutation
│     ├── conforming → exit 0 (reads OK; no mutations)
│     ├── conflict → exit 2 (reads OK; no mutations)
│     └── creatable → ensure target; mkdir resources/; stage marker; linkSync publish
│           (+ non-throwing best-effort unlink; immediate exit 0 after link; post-classify FS fail → exit 1)
├── bin adapter unchanged (stream/exit only)
└── tests: run(['init', …]) + optional internal create-seam coverage

No new core exports. No @resource-forge/project.
Forbidden: nest | graphql | prisma | run(argv, opts) | public init API | sibling project loading | examples/*
```

**Tech Stack:** TypeScript strict, Vitest, Node ≥20. Prefer extending the existing custom runner (no third-party CLI framework). Use Node `fs` / `path` for command-local FS only. `run` MUST remain synchronous.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-040 Accepted (#135)
       ↓
M5.5 plan Draft → M5 Plan Review → (Accept or Return)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M10 as applicable + Slice Completion Report
       ↓
prefer one delivery PR for tracking #135 containing Accepted plan
+ implementation + SCR
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M5.5 delivery slice. Do **not** open a separate plan-only merge PR as a required gate. Fold plan Accept + implementation into the delivery PR for `#135` when executing M5–M6. M6 treats Accepted RFC-040 text as authoritative for semantics. (RFC Accept docs may ride the same delivery PR or a prior Accept PR for `#135`; do not invent a third packaging gate.)

**Task checkboxes:** Completed during **M6 execution** only. Leave unchecked until M6 runs.

---

## Locked decisions (planning aids — not new product semantics)

| Decision | Lock (from RFC-040) |
| --- | --- |
| Product semantics owner | RFC-040 Accepted text only |
| Package | `@resource-forge/cli` |
| Ownership | CLI-local marker/layout; **no** new core exports; **no** project package |
| Public package API | **`run` only** (synchronous) |
| CLI surface | `rf init [path]` — zero or one positional; default `.`; **no options** |
| Registry | Flat `init` registered alongside validate/doctor/generate |
| Resolve | Direct against CLI process cwd; **no** upward discovery |
| Marker file | Fixed `resource-forge.json` |
| Canonical marker | `{ "version": 1, "resourcesDir": "resources" }` exactly (no extra keys) |
| Layout | Fixed `resources/` directory |
| Conforming compare | Parsed semantic equivalence (not byte-identical) |
| Classify before | Any filesystem **mutation** (reads/stat/access OK) |
| Creatable | Both RF artifacts absent (target may be absent or non-RF dir with unrelated files) |
| Conforming | Canonical marker file + `resources` directory → exit `0`, no mutations |
| Conflict | Half-init (incl. empty `resources/` alone), bad marker, wrong types, unreadable, target not a dir, … → exit `2`, no mutations |
| Create order | Ensure target dir → create empty `resources/` → same-dir complete marker stage → **`linkSync`** to `resource-forge.json` |
| Marker publication primitive | Same-directory temp stage of **complete** marker bytes, then **`link` (hard-link) exclusive publish** to `resource-forge.json` (Node `linkSync` or equivalent). Final-path incremental writes (`wx`/`writeFile` into final), overwrite-capable `rename`, and `copyFile`/`copy`-into-final are **forbidden** |
| Staging cleanup after publish | After successful `link`, return exit `0` immediately as the success outcome. Staging `unlink` MAY run only as **non-throwing best-effort** (errors swallowed) and MUST NOT change the exit code. Leftover internal staging temps after success are **permitted**; they MUST NOT be named `resource-forge.json` and MUST never be presented as the project marker |
| Overwrite / repair | **Forbidden** |
| Failed create | MUST NOT leave a conforming project |
| After marker publish | MUST return exit `0` as success outcome; no post-`link` work may change the exit code. Staging unlink only as non-throwing best-effort |
| Before marker publish | Unexpected failures via existing `run()` catch MUST NOT leave a conforming project |
| Cleanup | MUST attempt remove empty `resources/` created by this invocation if marker fails; target-dir cleanup best-effort only, non-recursive parents not required |
| Post-classify FS failures | Any FS failure after creatable classification is a create failure → exit **`1`** (incl. late `EEXIST` on `resources/` or marker); MUST NOT remap to conflict `2` |
| Exit `0` | Conforming no-op or successful create |
| Exit `1` | Creatable attempt failed (incl. post-classify races) or unexpected via existing `run()` catch (before successful marker publication) |
| Exit `2` | Usage or conflict classification |
| Doctor registry | Still `validate` + `doctor` only; MUST NOT require `init` |
| Siblings | generate / validate / doctor **unchanged** |
| Globals / help | Existing RFC-036 handling only; update general command-list help only — **no** `init`-specific help parser/behavior |
| Docs | Update **only** surfaces rendered inaccurate by adding `init` |
| Examples | **`examples/**` untouched** |
| Roadmap | May note M5.5 / `#135` when shipping; RFC proposes/targets M5.5 (does not alone mark Done) |

### Canonical marker (planning aid — from RFC-040 §4)

```json
{
  "version": 1,
  "resourcesDir": "resources"
}
```

Pretty-print / trailing newline / key order are implementation-owned so long as conforming comparison holds.

### Create / write-safety (planning aid — from RFC-040 §6)

Successful creatable flow:

```text
classify creatable
       ↓
ensure target directory (mkdir if absent, incl. parents for target)
       ↓
mkdir resources/ (empty)
       ↓
write COMPLETE marker bytes to same-dir staging temp
       ↓
linkSync(temp → resource-forge.json)   # exclusive; EEXIST if marker exists
       │
       ├─ link success → best-effort non-throwing unlink(temp); return exit 0 IMMEDIATELY
       ├─ link / stage fail → exit 1; MUST NOT leave conforming;
       │     MUST attempt remove empty resources/ if this invocation created it;
       │     target cleanup best-effort only; cleanup staging temp where practicable
       └─ never overwrite pre-existing entries
```

Rules:

1. Classification precedes mutation.
2. **Locked publication primitive:** prepare the complete marker contents in a **same-directory** non-final staging file, then publish with **`link` / `linkSync`** (hard link) to `resource-forge.json`. This provides (a) complete contents prepared off the final path and (b) exclusive/non-overwriting creation of the final path (`EEXIST` if the marker already exists).
3. **Forbidden publication mechanisms:** final-path incremental writes (`writeFile`/`wx`/`O_EXCL` open + write into the final marker path); ordinary overwrite-capable `rename` into the final path; `copyFile` / copy-into-final (partial-visibility risk).
4. **`write-resource-document.ts` is a pattern reference** for “stage complete artifact, then `link` publish.” Init MUST implement its own marker publish path (or a shared exclusive-link helper that does not change generate behavior) and MUST NOT reuse generate’s parent-must-exist / no-mkdir prechecks—init **does** create directories.
5. **The create path MUST perform no fallible operation after successful marker publication that can cause `runInit` to return/throw a non-success result. Once `link` to the canonical marker succeeds, the handler MUST return exit `0`.** Staging `unlink` after successful `link` is allowed **only** as non-throwing best-effort (catch/swallow); it MUST NOT change the exit code. Leftover staging temps after success are permitted and MUST never be presented as `resource-forge.json`.
6. **Unexpected failures occurring before successful marker publication MUST follow the existing `run()` catch semantics and MUST NOT leave a conforming project.** Do not invent an init-specific exception policy or broad catch/rollback layer.
7. **Any filesystem failure occurring after the target has been classified as creatable is a create failure and therefore exits `1`; in particular, late `EEXIST` races on the resources directory or marker must not be remapped to conflict exit `2`.** Conflict (`2`) applies only to pre-create classification (and usage).
8. At no observable success path may the final marker contain incomplete JSON: the final path becomes a hard link to an already-complete staging file.

### Diff from RFC-039 generate (planning aid — avoid confusion)

| Topic | Generate (RFC-039) | Init (RFC-040) |
| --- | --- | --- |
| mkdir | Forbidden for parents | Allowed for target + `resources/` |
| Late artifact race after gates | Destination exists → exit **`2`** | Post-classify FS failure → exit **`1`** |
| Core constructors | Required | **Not used** |
| Idempotent re-run | Destination exists → refuse | Conforming → success no-op |
| After successful publish | Destination visible; success | Marker published → **immediate** exit `0` |

---

## Goal / non-goals of this plan

**Goal:** Sequence M6 so `@resource-forge/cli` ships RFC-040 `init`: register/dispatch, argv gate, direct resolve, classify, conforming no-op, creatable create with write-safety, conflict refusal, `run`-centered tests (plus optional create-seam coverage), conditional docs accuracy.

**Non-goals (plan):** Project-aware siblings; upward discovery; core/project marker packages; configurable `resourcesDir`; `--force`/repair/overwrite; starter Resources; app scaffolding; `from-prisma`; amending generate/validate/doctor; inventing semantics missing from RFC-040; changing doctor’s required registry set; populating `examples/basic`.

---

## Constraints (SHALL / SHALL NOT)

Derived only from Accepted RFC-040 (and preserved RFC-036–039 shell rules):

1. SHALL keep `run(argv)` as the sole public package export and **synchronous**.
2. SHALL register `init` in the internal dispatch registry alongside `validate`, `doctor`, and `generate`.
3. SHALL accept argv shape `init` with zero or one path positional; default `.`; reject option-like tokens and arity >1 → exit `2` before mutation.
4. SHALL resolve paths directly against the CLI process cwd; SHALL NOT walk upward or load config.
5. SHALL classify before any filesystem mutation into creatable / conforming / conflict.
6. SHALL treat conforming as exit `0` with zero mutations; conflict as exit `2` with zero mutations (reads/stat/access permitted).
7. SHALL create only when both `resource-forge.json` and `resources` are absent.
8. SHALL publish the marker by writing complete bytes to a same-directory staging temp, then **`linkSync` (hard link)** to `resource-forge.json`; SHALL NOT use final-path `wx`/incremental writes, overwrite-capable rename, or copy-into-final.
9. SHALL NOT overwrite or soft-repair existing RF artifacts; SHALL NOT add options.
10. SHALL ensure **Failed create MUST NOT leave a conforming project**; MUST attempt empty-`resources/` cleanup when this invocation created it and marker fails; target cleanup best-effort only (no required recursive parent rollback).
11. SHALL, after successful marker `link`, return exit `0` (staging unlink only as non-throwing best-effort); unexpected failures before publication follow existing `run()` catch and MUST NOT leave a conforming project.
12. SHALL treat any filesystem failure after creatable classification as create failure exit `1` (incl. late `EEXIST` on `resources/` or marker); SHALL NOT remap those to conflict `2`.
13. SHALL NOT write streams or call `process.exit` inside `run` / handlers.
14. SHALL NOT introduce `run(argv, opts)` or export init/marker helpers.
15. SHALL NOT add new `@resource-forge/core` marker/project exports or new packages.
16. SHALL center public verification on `run(['init', …])`; MAY add internal create-seam tests without exporting seams.
17. SHALL preserve RFC-036 globals and `validate`/`doctor`/`generate` regressions; doctor registry expectations unchanged (`validate` + `doctor` only).
18. SHALL update only existing global/general command-list help; SHALL NOT introduce an `init`-specific help parser or command-specific help behavior.
19. SHALL NOT change RFC-036–039 exit-code meanings or invent new exit codes.
20. SHALL NOT depend on nest/graphql/prisma packages for this slice.
21. SHALL NOT populate `examples/basic` or otherwise modify `examples/**`.
22. SHALL NOT change `generate` / `validate` / `doctor` product behavior.

---

## Ownership boundaries

| Area | Ownership |
| --- | --- |
| `packages/cli/**` | **Owns** M5.5 delivery |
| `packages/core` | **Untouched** — no marker/project API |
| `packages/nest`, `graphql`, `prisma` | **Untouched** |
| `examples/**` | **Untouched** |
| Docs | Update **only** docs that become inaccurate when `init` ships |

---

## Contract inventory

| Surface | Kind | RFC-040 |
| --- | --- | --- |
| `run(argv)` | Public package API (unchanged) | §3 / thesis |
| `rf init [path]` | CLI surface | §3 |
| `resource-forge.json` + `resources/` | Marker/layout contract | §4 |
| Creatable / conforming / conflict | State machine | §5 |
| Create order + write-safety | Process/FS contract | §6 |
| Exit `0/1/2` + streams | Process contract | §7 |
| Sibling project loading / discovery / core marker API | Deferred | §1.2 / §13 |

---

## TDD / verification strategy

1. **Fail first** on `run(['init', …])` cases before wiring registry/handler: add test → run red → implement → run green. Do **not** require committing intentionally red commits.
2. Required `run()` coverage (RFC-040 §8 + regressions):
   - Creatable: absent target; empty/non-RF directory; directory with unrelated files only → exit `0`; marker canonical; `resources` is directory
   - Conforming no-op (pre-seed canonical marker + `resources/`) → exit `0`; filesystem unchanged (marker bytes / dir mtime as practical; at least no rewrite of marker content and no error)
   - Conflicts → exit `2`, no mutations: marker only; `resources` only (empty); non-canonical marker; `resources` as file; target as file; **unreadable or otherwise uninspectable** marker/layout cases where deterministically testable (prefer an internal observation seam over brittle Unix-permission fixtures if needed for cross-platform CI)
   - Usage: extra positionals; option-like tokens (`init --flag`, `init -x`) → exit `2`
   - `run(['--help', 'init'])` → help via existing RFC-036 globals (not init create); `init --help` remains usage refusal under “no options” (do **not** invent command-specific help)
   - Regressions: bare/`--help`/`--version`/unknown command/`validate`/`doctor`/`generate` still pass
   - Public export still `run` only; RF workspace deps still only `core` (unchanged; init adds no new RF deps)
   - Doctor still healthy without requiring `init` in its required set
3. **Create-safety coverage (internal seam allowed):** because `run` has no `opts` DI surface, internal tests MAY exercise create/finalize seams directly **without exporting them**. Cover at least:
   - pre-existing marker is never overwritten (publish fails; contents preserved)
   - concurrent/late marker or `resources/` creation after classification → exit `1` (not `2`)
   - final marker is never exposed as partial/incomplete JSON (stage-complete-then-`link`; success means hard link to complete staging bytes)
   - successful `link` is the last fallible operation that can affect exit code (post-`link` unlink is non-throwing best-effort only; success still exit `0`)
   - marker failure after this invocation created empty `resources/` → attempt cleanup; result not conforming; exit `1` when surfaced through handler
   - Forbidden strategies are not used (`wx`-into-final, overwrite rename, copy-into-final) — assert via seam/implementation under test, not merely post-success file reads alone for the no-partial invariant
4. Prefer `os.tmpdir()` + unique subdirs for FS fixtures; clean up after tests. For “absent target” cases, use a path under a temp parent that does not yet exist.
5. Assert exits/streams/artifact presence/canonical parse — **not** brittle full pretty-print snapshots unless needed.
6. `pnpm --filter @resource-forge/cli test|typecheck|lint|build` must pass.

---

## Planning placement of modules (non-normative)

```text
packages/cli/src/
  commands/init.ts                 # argv gate + resolve + classify + create orchestration
  init-project.ts                  # OPTIONAL extract: classify/create/cleanup + test seams
  run.ts                           # register init; help lists init
  run.test.ts                      # init cases + regressions
  # optional: init-project.test.ts for internal create-seam coverage
  index.ts                         # comment; export { run } only
  bin.ts                           # untouched
  write-resource-document.ts       # untouched (generate-owned); do not overload for init unless clearly shared without bending generate semantics
packages/cli/README.md             # only if surface wording becomes inaccurate
README.md                          # only if root CLI role text becomes inaccurate
docs/roadmap.md                    # only if M5.5 lifecycle wording should reflect #135 / slice
```

Keep the handler cohesive initially. Extract classify/create helpers **only if** needed for readability and deterministic create-seam tests. Do **not** export init helpers from `index.ts`. Marker publish MUST use same-dir stage + `linkSync` (generate’s `write-resource-document.ts` is a pattern reference for that shape). Prefer a dedicated init marker publish path; do not overload the generate helper unless a shared exclusive-link helper can be extracted without changing generate behavior.

---

## Task breakdown

### Task 1: Failing `run(['init', …])` tests + create-safety cases (TDD)

**Files:**
- Modify: `packages/cli/src/run.test.ts`
- Optionally create: internal create-seam test file alongside an internal helper (only once Task 2 introduces the seam)

- [x] **Step 1:** Add a `describe('run() init', …)` block with cases for creatable success (absent target; empty dir; unrelated files), conforming no-op, conflicts (marker only; resources only; bad marker; resources as file; target as file; unreadable/uninspectable marker/layout where deterministically testable), usage (extra args; option-like tokens), help precedence (`--help` before/with init via globals; `init --help` as usage, not special help).
- [x] **Step 2:** Plan/write assertions for create-safety: pre-existing marker never overwritten; post-classify race → exit `1`; no partial final marker under stage-then-`link`; successful `link` is last exit-affecting fallible op; no conforming leftover on failed marker after resources create.
- [x] **Step 3:** Run `pnpm --filter @resource-forge/cli test` — establish **red** for new init cases; existing suites still pass.
- [x] **Step 4:** Proceed to Task 2 to green — do **not** treat committing red tests as required.

Example assertions (informative):

```ts
it('creates marker and resources in an empty directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rf-init-'));
  const result = run(['init', dir]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe('');
  const marker = JSON.parse(readFileSync(join(dir, 'resource-forge.json'), 'utf8'));
  expect(marker).toEqual({ version: 1, resourcesDir: 'resources' });
  expect(lstatSync(join(dir, 'resources')).isDirectory()).toBe(true);
});

it('is a no-op when already conforming', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rf-init-'));
  expect(run(['init', dir]).exitCode).toBe(0);
  const again = run(['init', dir]);
  expect(again.exitCode).toBe(0);
});

it('returns exit 2 for resources-only half-init', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rf-init-'));
  mkdirSync(join(dir, 'resources'));
  const result = run(['init', dir]);
  expect(result.exitCode).toBe(2);
  expect(existsSync(join(dir, 'resource-forge.json'))).toBe(false);
});
```

### Task 2: Init handler — argv + resolve + classify + create

**Files:**
- Create: `packages/cli/src/commands/init.ts`
- Optionally create: `packages/cli/src/init-project.ts` (only if needed for readability / create-seam tests)
- Modify: `packages/cli/src/run.ts` (register `init`; update help text)
- Modify: `packages/cli/src/run.test.ts` (green + create-safety coverage)
- Modify: `packages/cli/src/index.ts` (comment only; still export `run`)

- [x] **Step 1:** Implement `runInit(argvAfterCommand)`:
  - Gate: ≤1 positional; reject any `-…` token → exit `2`
  - Resolve: missing → `.`; `path.resolve(process.cwd(), token)` (or equivalent); no upward walk
  - Classify using RFC-040 §5 table (reads OK)
  - Conforming → exit `0`; conflict → exit `2`
  - Creatable → ensure target; `mkdir` `resources/`; write complete canonical marker to same-dir staging temp; **`linkSync(temp, resource-forge.json)`**; on link success → best-effort non-throwing unlink(temp); **return exit `0` immediately**
  - On create failure before/during publish: exit `1`; enforce non-conforming leftover; attempt empty-`resources/` cleanup if this invocation created it; target cleanup best-effort only
  - Any FS failure after creatable classification (incl. late `EEXIST` on `resources/` or marker) → exit `1` (never remapped to conflict `2`)
  - Do **not** use final-path `wx`/incremental write, overwrite-capable rename, or copy-into-final
- [x] **Step 2:** Extract classify/create helpers **only if** needed for readability and deterministic seam tests; keep command-local; do not export. Treat generate’s write helper as pattern reference only.
- [x] **Step 3:** Register `COMMAND_REGISTRY.set('init', runInit)`; update `HELP_TEXT` to list `init [path]`. **Only existing global/general command-list help is updated; do not introduce an `init`-specific help parser or command-specific help behavior.**
- [x] **Step 4:** Do **not** change doctor’s registry expectations (`validate` + `doctor` only).
- [x] **Step 5:** Do **not** modify generate/validate/doctor handlers beyond registry/help coexistence.
- [x] **Step 6:** Green all Task 1 / create-safety tests; keep validate/doctor/generate/RFC-036 regressions green.
- [x] **Step 7:** Confirm `index.ts` still exports only `run`.
- [x] **Step 8:** Run `pnpm --filter @resource-forge/cli test typecheck lint` — PASS.

### Task 3: Docs + SCR scaffolding (conditional)

**Files:**
- Modify: `packages/cli/README.md` **if** its current CLI surface wording becomes inaccurate after registering `init`
- Modify: `README.md` **only if** root CLI role text becomes inaccurate
- Modify: `docs/roadmap.md` **only if** M5 later-slice / M5.5 lifecycle wording should reference `#135` / RFC-040 (do not invent Done status beyond shipped truth)
- Modify: this plan’s SCR during M7–M10

- [x] **Step 1:** Inspect current README/root/roadmap text; update only inaccurate surfaces. When documenting init: argv, default `.`, marker+`resources/`, exit table, creatable/conforming/conflict notes, and out-of-scope (sibling project loading, discovery, `--force`, scaffolding). Keep `validate`/`doctor`/`generate` accurate.
- [x] **Step 2:** **Do not populate `examples/basic`** or otherwise modify `examples/**`.
- [x] **Step 3:** Fill SCR gates after M7–M10; set Status Slice complete only after delivery merge + SCR closeout.
- [x] **Step 4:** Final `pnpm --filter @resource-forge/cli test typecheck lint build`.

---

## Traceability (Accepted RFC-040 → tasks)

| RFC-040 section | Tasks |
| --- | --- |
| §3 argv + resolve | Tasks 1–2 |
| §4 marker/layout | Tasks 1–2 |
| §5 state machine | Tasks 1–2 |
| §6 create + write-safety | Tasks 1–2 |
| §7 exits/streams | Tasks 1–2 |
| §8 testing | Task 1 |
| §9 package boundaries / doctor registry | Task 2 |
| §13 deferrals (incl. examples / siblings) | All tasks (fence) |

---

## Execution / dependency risks (operational)

1. **`run` must stay sync** — use sync `fs` APIs.
2. **Do not confuse generate race exits** — init post-classify FS failures are exit `1`, not generate’s late-destination `2`.
3. **Classify before mutate** — never mkdir/write on usage/conflict/conforming paths.
4. **Half-init** — empty `resources/` alone is conflict; do not “complete” it.
5. **Failed create MUST NOT leave conforming** — primary postcondition; close the post-publish window by returning `0` immediately after successful marker publication.
6. **Marker publication** — same-dir stage + `linkSync` only; do not use `wx`/rename/copy-into-final; post-`link` unlink is non-throwing best-effort only.
7. **Doctor registry** — adding `init` MUST NOT change doctor’s required `validate` + `doctor` check.
8. **No core marker API** — keep marker JSON CLI-local.
9. **Path semantics** — resolve relative to process cwd; do not invent project-root normalization or discovery.
10. Avoid overloading `write-resource-document.ts` if that would bend generate’s no-mkdir semantics or weaken init’s no-partial-final-marker rule.
11. Do not invent `init`-specific `--help` behavior.
12. Do not turn M5.5 into an examples or project-doctor slice.

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M5.5 CLI Init Project Marker |
| Tracking | [#135](https://github.com/rexescario-dev/resource-forge/issues/135) |
| M4 | Implementation Plan: **Accepted** |
| M5 | Review **Accepted** (2026-08-10) |
| M6 | **Complete** |
| M7 | **Approved** (2026-08-10) |
| M8 | **N/A** (no worthwhile behavior-preserving refactor beyond slice delivery) |
| M9 | **Complete** (package README + root README CLI role + roadmap M5.5) |
| M10 | **Accepted** (slice process path; workflow library assets unmodified) |
| Branch | `feat/m5-5-cli-init-project-marker` |
| PR | [#136](https://github.com/rexescario-dev/resource-forge/pull/136) |
| Status | **Ready for merge** |

### Shipped

- Registered flat `init` command (`rf init [path]` / `run(['init', …])`)
- Canonical `resource-forge.json` + `resources/` create path (same-dir stage + `linkSync`)
- Creatable / conforming / conflict classification before mutation
- Post-classify FS failures → exit `1`; conflicts/usage → exit `2`
- Internal create seams for uninspectable / race / cleanup coverage
- Public API remains `run` only; doctor registry expectations unchanged

### Verification

| Check | Result |
| --- | --- |
| `pnpm --filter @resource-forge/cli test` | **PASS** (61 tests: 57 run + 4 document) |
| typecheck / lint / build | **PASS** |
| CI | **Passed** on [#136](https://github.com/rexescario-dev/resource-forge/pull/136) |
| Public export `run` only | **PASS** |
| Doctor registry still `validate` + `doctor` | **PASS** |
| Create-safety (stage+`linkSync`; non-conforming on failure; no overwrite; post-classify FS fail → 1; `link` last exit-affecting op) | **PASS** |

### Next Gate

**Merge delivery PR** for `#135`, then mark SCR **Slice complete** on closeout if required.

---

**Status: Accepted.** Authoritative for M5.5 sequencing/execution. RFC-040 remains authoritative for product semantics. Delivery in progress on `feat/m5-5-cli-init-project-marker`.
