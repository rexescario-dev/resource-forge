# M5.4 CLI Generate Resource — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD. Implement **only** Accepted RFC-039 CLI Generate Resource in `@resource-forge/cli`. Do **not** invent `init`, other generate kinds, `from-prisma`, field flags, templates, interactive prompts, TypeScript/Nest/GraphQL/Prisma codegen, discovery/config/stdin, `--force`, mkdir, overwrite, nested command frameworks, public serialize/generate APIs, or `run(argv, opts)`. Do **not** invent CLI-local Resource shape/defaulting. Do **not** populate `examples/basic`. Preserve RFC-036/037/038: sole public export `run`; bin stream/exit only; exit `0/1/2` meanings unchanged; doctor registry still requires only `validate` + `doctor`. Tests centered on `run(['generate', …])`. Preserve RFC-036 global `--help`/`--version` handling exactly. Write finalization MUST be create-if-absent (no unconditional rename/replace that can overwrite). Destination MUST only become visible after the complete encoded artifact has been successfully prepared.

**Status:** Accepted  
**M5:** Accepted (2026-08-10) — Plan Review re-entry; no plan blockers after prior return closures (create-if-absent finalization; late destination conflict → exit `2`; write-safety seam coverage; mechanical encode of actual `Resource`; conditional docs; `examples/**` fenced; inspect actual core contracts). Editorial Accept clarification retained: destination MUST only become visible after the complete encoded artifact is prepared (`O_EXCL` + direct destination write alone is insufficient). Public-export `run` only; TDD via `run(['generate', …])` retained. RFC-039 remains Accepted. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#132](https://github.com/rexescario-dev/resource-forge/issues/132)  
**Source RFC:** [RFC-039 CLI Generate Resource](../specs/2026-08-10-rfc-039-cli-generate-resource-design.md) (**Accepted**)  
**Depends on:** [RFC-036 CLI Foundation](../specs/2026-08-10-rfc-036-cli-foundation-design.md) (**Accepted**); [RFC-037 CLI Resource Validation](../specs/2026-08-10-rfc-037-cli-resource-validation-design.md) (**Accepted**); [RFC-038 CLI Package Environment Doctor](../specs/2026-08-10-rfc-038-cli-package-environment-doctor-design.md) (**Accepted**); Accepted core `createResourceIdentity` / `createResource`; existing `@resource-forge/cli → @resource-forge/core` workspace dependency  
**Package:** `@resource-forge/cli`  
**Slice:** M5.4 only — `rf generate resource <namespace> <name> <path>`  
**Goal:** Deliver registered flat `generate` with required kind token `resource` so `run(['generate','resource', ns, name, path])` runs argv gate → FS prechecks → core construction → mechanical complete-Resource JSON encode → failure-safe create-if-absent write, with RFC-039 exit/stream contracts and RFC-037 round-trip—without project scaffolding or CLI-local Resource models.

**Architecture:**

```text
RFC-039 (Accepted)
└── CLI Generate Resource (generate + kind resource only)

@resource-forge/cli
├── run(argv) → { exitCode, stdout, stderr }   # sole public package API (sync)
├── RFC-036 global handling (unchanged)
├── dispatch registry: validate | doctor | generate
├── generate handler
│     ├── argv gate (kind + 3 positionals; no options) → exit 2
│     ├── FS prechecks (parent dir exists; destination absent) → exit 2
│     ├── createResourceIdentity → createResource
│     ├── encode complete Resource → JSON text
│     └── failure-safe create-if-absent finalization
│           (no unconditional rename/replace overwrite)
├── bin adapter unchanged (stream/exit only)
└── tests: run(['generate', …]) + validate round-trip
    + internal write-seam coverage (partial/late conflict)

Allowed dep: @resource-forge/core (already present)
Forbidden: nest | graphql | prisma | run(argv, opts) | public generate API | mkdir | --force | examples/*
```

**Tech Stack:** TypeScript strict, Vitest, Node ≥20. Prefer extending the existing custom runner (no third-party CLI framework). Use Node `fs` / `path` for command-local FS only. `run` MUST remain synchronous.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-039 Accepted (#132)
       ↓
M5.4 plan Draft → M5 Plan Review → (Accept or Return)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M10 as applicable + Slice Completion Report
       ↓
prefer one delivery PR for tracking #132 containing Accepted plan
+ implementation + SCR
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M5.4 delivery slice. Do **not** open a separate plan-only merge PR as a required gate. Fold plan Accept + implementation into the delivery PR for `#132` when executing M5–M6. M6 treats Accepted RFC-039 text as authoritative for semantics. (RFC Accept docs may ride the same delivery PR or a prior Accept PR for `#132`; do not invent a third packaging gate.)

**Task checkboxes:** Completed during **M6 execution** only. Leave unchecked until M6 runs.

---

## Locked decisions (planning aids — not new product semantics)

| Decision | Lock (from RFC-039) |
| --- | --- |
| Product semantics owner | RFC-039 Accepted text only |
| Package | `@resource-forge/cli` |
| Workspace deps | Continues `@resource-forge/core` only among RF packages; nest/graphql/prisma forbidden |
| Public package API | **`run` only** (synchronous) |
| CLI surface | `rf generate resource <namespace> <name> <path>` |
| Registry | Flat `generate` registered; kind `resource` is a positional, not a nested command |
| Kind | Only `resource`; unknown kinds → exit `2` |
| Identity / constructors | Inspect **actual** Accepted core APIs before coding; RFC “e.g.” signatures are non-literal |
| Construction | Core constructors only; no CLI defaults |
| Serialization | Simplest mechanical encoding of the actual `Resource` value; no project/normalize/default/reconstruct unless the representation requires it |
| Round-trip | Successful write ⇒ `run(['validate', path])` exit `0` |
| FS order | Argv gate → parent is directory → destination absent → construct → encode → finalize create-if-absent |
| Parent dirs | Must exist; **no** mkdir |
| Overwrite | **Forbidden** at precheck and at finalization; **no** `--force` |
| Write safety | Create-if-absent finalization; no partial destination; temps cleaned where practicable; never present temp as destination; **no** unconditional rename/replace |
| Exit `0` | Constructed + wrote |
| Exit `1` | Core construction failure, or unexpected encode/write/finalization failure other than a late destination conflict |
| Exit `2` | Usage / FS precondition refusal (**including** destination discovered during finalization) |
| Non-zero ⇒ destination unchanged | Hard invariant |
| Doctor registry | Still `validate` + `doctor` only; MUST NOT require `generate` |
| Globals | Existing RFC-036 handling only |
| Docs | Update **only** surfaces rendered inaccurate by adding `generate` |
| Examples | **`examples/**` untouched** — do not populate `examples/basic` |

| Situation | Exit |
| --- | ---: |
| Destination discovered to exist during finalization (after initial absent precheck) | `2` |

Maps to RFC-039 §7 FS precondition refusal (“destination exists / cannot safely proceed”), not unexpected internal failure.

### Mechanical encode contract (planning aid — from RFC-039 §6)

1. Inspect the actual Accepted `Resource` representation before choosing an encode expression.
2. Use the **simplest mechanical encoding** of that value (e.g. `JSON.stringify(resource)` when it already serializes the complete Resource).
3. Do **not** project, normalize, default, or reconstruct a parallel document object unless required by the actual representation.
4. Pretty-print / trailing newline remain implementation-owned.
5. Round-trip through RFC-037 validation remains the compatibility check.

### Failure-safe write contract (planning aid — from RFC-039 §5.3)

Successful flow:

```text
encode complete content
       ↓
write complete content to temp (or equivalent staging)
       ↓
finalize ONLY if destination is still absent (create-if-absent)
       │
       ├─ destination absent → success (destination becomes visible only now)
       ├─ destination exists → exit 2, preserve destination
       └─ other failure → exit 1, destination unchanged
```

Rules:

1. Initial FS precheck: parent is directory; destination absent.
2. **The destination MUST only become visible after the complete encoded artifact has been successfully prepared.** An exclusive create followed by writing directly into the destination is **insufficient** if a subsequent write failure can leave a partial destination.
3. Finalization MUST be a failure-safe **create-if-absent** strategy that preserves the no-overwrite invariant even if the destination appears after the initial precheck.
4. MUST NOT use an **unconditional** rename/replace that can overwrite an existing destination (TOCTOU-unsafe `rename` into an existing path is forbidden as the sole finalization step).
5. Exact mechanism is implementation-owned (e.g. exclusive create of a temp path then no-replace link/rename patterns, etc.) so long as (2)–(4) hold. Do **not** treat “`O_EXCL` on the destination + direct write” alone as satisfying the no-partial invariant.
6. If finalization discovers the destination now exists → exit **`2`**; destination unchanged (not overwritten); cleanup temps where practicable.
7. Other write/finalization failures (I/O errors that are not destination-exists) → exit **`1`**; destination unchanged; no partial destination file; cleanup temps where practicable.
8. Temporary artifacts MUST NOT be presented as the requested destination artifact.

### Core-error presentation (planning aid)

Map `Result` errors to a short stderr string for exit `1`. Do **not** invent new error codes. Informative presentation only—core remains authoritative.

---

## Goal / non-goals of this plan

**Goal:** Sequence M6 so `@resource-forge/cli` ships RFC-039 `generate resource`: register/dispatch, argv gate, FS prechecks, core construction, complete-Resource encode, failure-safe create-if-absent write, `run`-centered tests (including validate round-trip + write-safety seam coverage), conditional docs accuracy.

**Non-goals (plan):** `init`; other kinds; `from-prisma`; field flags/templates; `--force`/mkdir/overwrite; TS/adapter codegen; public generate/serialize APIs; `run(argv, opts)`; amending core constructors; inventing semantics missing from RFC-039; changing doctor’s required registry set; populating `examples/basic`.

---

## Constraints (SHALL / SHALL NOT)

Derived only from Accepted RFC-039 (and preserved RFC-036/037/038 shell rules):

1. SHALL keep `run(argv)` as the sole public package export and **synchronous**.
2. SHALL register `generate` in the internal dispatch registry alongside `validate` and `doctor`.
3. SHALL accept argv shape `generate` + `resource` + `namespace` + `name` + `path` exactly; unknown kind / bad arity / post-command options → exit `2` before FS/construct/write.
4. SHALL run FS prechecks before construction: parent exists and is a directory; destination absent.
5. SHALL NOT create parent directories; SHALL NOT overwrite; SHALL NOT add `--force`.
6. SHALL construct via Accepted core constructors after inspecting actual signatures; on core failure → exit `1` with destination never created.
7. SHALL mechanically encode the **complete** constructed `Resource` value; SHALL NOT invent CLI Resource document schema/defaults or preferential field reconstruction.
8. SHALL finalize with create-if-absent semantics such that the destination becomes visible **only after** the complete encoded artifact is prepared; non-zero exits leave destination unchanged; temps cleaned where practicable and never presented as the destination; SHALL NOT use unconditional rename/replace overwrite; SHALL NOT use exclusive-create-on-destination + direct write alone if that can leave a partial destination.
9. SHALL map late destination conflict at finalization to exit `2` (FS-refusal); construction failure or unexpected encode/write/finalization failure (other than late destination conflict) to exit `1`.
10. SHALL NOT write streams or call `process.exit` inside `run` / handlers.
11. SHALL NOT introduce `run(argv, opts)` or export generate/encode/FS helpers.
12. SHALL center public verification on `run(['generate', …])` including validate round-trip on success; MAY test write-safety via an internal seam without exporting it.
13. SHALL preserve RFC-036 globals and `validate`/`doctor` regressions; doctor registry expectations unchanged.
14. SHALL NOT change RFC-036/037/038 exit-code meanings or invent new exit codes.
15. SHALL NOT depend on nest/graphql/prisma packages for this slice.
16. SHALL NOT populate `examples/basic` or otherwise modify `examples/**`.

---

## Ownership boundaries

| Area | Ownership |
| --- | --- |
| `packages/cli/**` | **Owns** M5.4 delivery |
| `packages/core` | **Consumed only** — constructors/types; no product changes |
| `packages/nest`, `graphql`, `prisma` | **Untouched** |
| `examples/**` | **Untouched** — do not populate `examples/basic` |
| Docs | Update **only** docs that become inaccurate when `generate` ships |

---

## Contract inventory

| Surface | Kind | RFC-039 |
| --- | --- | --- |
| `run(argv)` | Public package API (unchanged) | §3.2 |
| `rf generate resource <ns> <name> <path>` | CLI surface | §3.3 / §4 |
| Kind token `resource` | Argv contract | §4 |
| FS prechecks + create-if-absent write | Process/FS contract | §5 |
| Core construction | Authority boundary | §5.4 |
| Complete-Resource encode + round-trip | Serialization | §6 |
| Exit `0/1/2` + streams | Process contract | §7 |
| `init` / other kinds / `from-prisma` / `--force` / mkdir / examples | Deferred | §1.2 / §13 |

---

## TDD / verification strategy

1. **Fail first** on `run(['generate', …])` cases before wiring registry/handler: add test → run red → implement → run green. Do **not** require committing intentionally red commits.
2. Required `run()` coverage (RFC-039 §8 + regressions):
   - Success with valid `namespace`/`name` into a path under an existing parent → exit `0`; file exists with complete JSON; `run(['validate', path])` → exit `0`
   - Core-rejected identity (fixture that Accepted core actually rejects) → exit `1`; destination absent
   - Usage: missing tokens / extra tokens / unknown kind / `--flag` after command → exit `2`; no write
   - FS: missing parent → exit `2`; existing destination at precheck → exit `2`; destination contents unchanged if pre-existed
   - `run(['--help', 'generate'])` → help via existing RFC-036 globals (not generate write)
   - Regressions: bare/`--help`/`--version`/unknown command/`validate`/`doctor` still pass
   - Public export still `run` only; RF workspace deps still only `core`
3. **Write-safety coverage (internal seam allowed):** because `run` has no `opts` DI surface, internal failure-safe write tests MAY exercise the internal write/finalization seam directly **without exporting it**. Public integration remains centered on `run`. Cover at least:
   - successful finalization → destination exists with complete JSON
   - failure during temporary write/finalization → destination absent/unchanged (no partial destination)
   - destination appearing before finalization → never overwritten; maps to exit `2` when surfaced through the handler/`run` path (or equivalent seam result the handler maps to exit `2`)
4. Prefer `os.tmpdir()` + unique subdirs for FS fixtures; clean up after tests.
5. Assert exits/streams/file existence/validate round-trip / no-overwrite — **not** brittle full JSON snapshots.
6. `pnpm --filter @resource-forge/cli test|typecheck|lint|build` must pass.

---

## Planning placement of modules (non-normative)

```text
packages/cli/src/
  commands/generate.ts          # argv gate + FS + construct + encode + write (cohesive first)
  write-resource-document.ts    # OPTIONAL extract only if needed for readability / seam tests
  run.ts                        # register generate; help lists generate
  run.test.ts                   # generate cases + regressions
  # optional: write-resource-document.test.ts for internal seam write-safety
  index.ts                      # comment; export { run } only
  bin.ts                        # untouched
packages/cli/README.md          # only if surface/generator wording becomes inaccurate
docs/roadmap.md                 # only if M5.4 lifecycle wording becomes inaccurate
```

Keep the handler cohesive initially. Extract write/encode helpers **only if** needed to keep the handler readable and to host deterministic write-seam tests. Do **not** export encode/write/generate from `index.ts`.

---

## Task breakdown

### Task 1: Failing `run(['generate', …])` tests + write-safety cases (TDD)

**Files:**
- Modify: `packages/cli/src/run.test.ts`
- Optionally create: internal write-seam test file alongside an internal helper (only once Task 2 introduces the seam)

- [x] **Step 1:** Add a `describe('run() generate', …)` block with cases for success (temp path + validate round-trip), usage (arity/kind/options), FS (missing parent / existing dest), core failure (core-rejected identity), help precedence.
- [x] **Step 2:** Plan/write assertions for write-safety: no partial destination on failed finalization; late destination conflict never overwrites (via internal seam and/or `run` once the seam exists—prefer writing the public cases first, add seam cases with Task 2 if the helper lands then).
- [x] **Step 3:** Run `pnpm --filter @resource-forge/cli test` — establish **red** for new generate cases; existing suites still pass.
- [x] **Step 4:** Proceed to Task 2 to green — do **not** treat committing red tests as required.

Example assertions (informative):

```ts
it('generates a minimal Resource JSON and round-trips validate', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rf-gen-'));
  const path = join(dir, 'customer.json');
  const result = run(['generate', 'resource', 'crm', 'Customer', path]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe('');
  expect(existsSync(path)).toBe(true);
  expect(run(['validate', path]).exitCode).toBe(0);
});

it('returns exit 2 for unknown kind', () => {
  const result = run(['generate', 'widget', 'crm', 'Customer', 'out.json']);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe('');
  expect(result.stderr.length).toBeGreaterThan(0);
});
```

### Task 2: Generate handler — argv + FS + core + encode + create-if-absent write

**Files:**
- Create: `packages/cli/src/commands/generate.ts`
- Optionally create: `packages/cli/src/write-resource-document.ts` (only if needed for readability / write-seam tests)
- Modify: `packages/cli/src/run.ts` (register `generate`; update help text)
- Modify: `packages/cli/src/run.test.ts` (green + write-safety coverage)
- Modify: `packages/cli/src/index.ts` (comment only; still export `run`)

- [x] **Step 1:** Inspect the **actual** Accepted core constructor signatures and `Resource` representation (`createResourceIdentity`, `createResource`, `Resource` type/value shape). Do **not** infer argument order, return shape, or serialization shape from RFC “e.g.” text alone.
- [x] **Step 2:** Implement `runGenerate(argvAfterCommand)`:
  - Gate: first token MUST be `resource`; then exactly `namespace`, `name`, `path`; reject options (`-…`) and wrong arity → exit `2`
  - FS precheck: `dirname(path)` must exist and be a directory; `path` must not exist → else exit `2`
  - Construct via actual core APIs; on `err` → exit `1` stderr; no write
  - Encode: simplest mechanical encoding of the complete constructed `Resource` value (RFC-039 §6)
  - Finalize: prepare complete artifact first (destination not yet visible); then create-if-absent finalization. If destination now exists → exit `2` (no overwrite). Other encode/write/finalization failures → exit `1`. Cleanup temps; no partial destination. Do **not** open the destination with `O_EXCL` and write contents directly if a mid-write failure would leave a partial file.
  - Success → exit `0` (stdout quiet or minimal OK)
- [x] **Step 3:** Extract write/encode helpers **only if** needed for readability and deterministic seam tests; keep command-local; do not export.
- [x] **Step 4:** Register `COMMAND_REGISTRY.set('generate', runGenerate)`; update `HELP_TEXT` to list `generate resource <namespace> <name> <path>`.
- [x] **Step 5:** Do **not** change doctor’s registry expectations (`validate` + `doctor` only).
- [x] **Step 6:** Green all Task 1 / write-safety tests; keep validate/doctor/RFC-036 regressions green.
- [x] **Step 7:** Confirm `index.ts` still exports only `run`.
- [x] **Step 8:** Run `pnpm --filter @resource-forge/cli test typecheck lint` — PASS.

### Task 3: Docs + SCR scaffolding (conditional)

**Files:**
- Modify: `packages/cli/README.md` **if** its current CLI surface / generator wording becomes inaccurate after registering `generate`
- Modify: `README.md` **only if** root CLI role text becomes inaccurate
- Modify: `docs/roadmap.md` **only if** M5.4 lifecycle wording becomes inaccurate (Draft plan → Accepted plan → ✅ after merge)
- Modify: this plan’s SCR during M7–M10

- [x] **Step 1:** Inspect current README/root/roadmap text; update only inaccurate surfaces. When documenting generate: argv, exit table, fail-closed FS / create-if-absent notes, and out-of-scope (`init`, other kinds, `from-prisma`, `--force`, mkdir). Keep `validate`/`doctor` accurate.
- [x] **Step 2:** **Do not populate `examples/basic`** or otherwise modify `examples/**`.
- [x] **Step 3:** Fill SCR gates after M7–M10; set Status Slice complete only after delivery merge + SCR closeout.
- [x] **Step 4:** Final `pnpm --filter @resource-forge/cli test typecheck lint build`.

---

## Traceability (Accepted RFC-039 → tasks)

| RFC-039 section | Tasks |
| --- | --- |
| §3.1–3.3 package/CLI surfaces; doctor registry unchanged | Task 2 |
| §3.2 `run` only | Tasks 1–3 |
| §4 argv (kind + three positionals) | Tasks 1–2 |
| §5 pipeline / FS / write safety / construction | Tasks 1–2 |
| §6 serialization + round-trip | Tasks 1–2 |
| §7 exits/streams (incl. late destination conflict → `2`) | Tasks 1–2 |
| §8 testing | Task 1 |
| §13 deferrals (incl. examples) | All tasks (fence) |

---

## Execution / dependency risks (operational)

1. **`run` must stay sync** — use sync `fs` APIs for prechecks/write.
2. **Complete-Resource encode** — simplest mechanical encoding of the actual value; do not invent a second Resource model.
3. **FS before construct** — never call core constructors on usage/FS failure paths.
4. **Core-failure before create** — destination must remain absent on constructor err.
5. **Create-if-absent finalization** — destination becomes visible only after complete artifact is prepared; unconditional rename/replace overwrite and `O_EXCL`-on-destination + direct write (partial-risk) are forbidden; late destination conflict → exit `2`.
6. **Doctor registry** — adding `generate` MUST NOT change doctor’s required `validate` + `doctor` check.
7. **Path semantics** — interpret `path` literally relative to process cwd; do not invent project-root normalization.
8. **Core-rejected fixtures** — pick identities Accepted core actually rejects; do not invent CLI-only invalid rules.
9. **Inspect core first** — adapt to actual constructor/`Resource` contracts, not RFC example prose.
10. Avoid premature file extraction — keep `generate.ts` cohesive; extract only for readability / write-seam tests.
11. Do not turn M5.4 into an examples slice.

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M5.4 CLI Generate Resource |
| Tracking | [#132](https://github.com/rexescario-dev/resource-forge/issues/132) |
| M4 | Implementation Plan: **Accepted** |
| M5 | Review **Accepted** (2026-08-10) |
| M6 | **Complete** |
| M7 | **Approved** (2026-08-10) |
| M8 | **N/A** (no worthwhile behavior-preserving refactor beyond slice delivery) |
| M9 | **Complete** (package README + root README CLI role + roadmap M5.4) |
| M10 | **Accepted** (slice process path; workflow library assets unmodified) |
| Branch | `feat/m5-4-cli-generate-resource` |
| PR | [#133](https://github.com/rexescario-dev/resource-forge/pull/133) |
| Status | **Ready for merge** |

### Shipped

- Registered flat `generate` command with kind token `resource`
- `rf generate resource <namespace> <name> <path>` / `run(['generate','resource',…])`
- Core-authored construction (`createResourceIdentity` → `createResource`)
- Mechanical JSON encode of complete `Resource`; RFC-037 validate round-trip
- Failure-safe create-if-absent write (`link` finalization); late EEXIST → exit `2`
- Internal write-seam tests for no-partial / no-overwrite
- Public API remains `run` only; doctor registry expectations unchanged

### Verification

| Check | Result |
| --- | --- |
| `pnpm --filter @resource-forge/cli test` | **PASS** (42 tests: 38 run + 4 document) |
| typecheck / lint / build | **PASS** |
| CI | Pending (delivery PR) |
| Public export `run` only | **PASS** |
| Sole RF workspace dep `core` | **PASS** |
| Validate round-trip on generated file | **PASS** |
| Write-safety (no partial / no overwrite / late conflict → 2) | **PASS** |

### Next Gate

**Merge delivery PR** for `#132`, then SCR Slice complete closeout. RFC-039 remains authoritative for product semantics.

---

**Status: Accepted.** Authoritative for M5.4 sequencing/execution history. RFC-039 remains authoritative for product semantics. Delivery pending merge.
