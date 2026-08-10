# M5.2 CLI Resource Validation — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD. Implement **only** Accepted RFC-037 CLI Resource Validation in `@resource-forge/cli`. Do **not** register `doctor` or other product commands. Do **not** invent config, discovery, stdin, globbing, structured diagnostics, `run(argv, opts)` / FS DI, or a public `validateResourceDocument`. Do **not** amend `@resource-forge/core` validation semantics. Do **not** depend on `@resource-forge/nest|graphql|prisma`. Preserve RFC-036: sole public export `run`; bin stream/exit only (no validate pre-read); exit `0/1/2`; tests centered on `run()`. Preserve RFC-036 global `--help`/`--version` handling exactly; dispatch `validate` only when identified as the command.

**Status:** Accepted  
**M5:** Accepted (2026-08-10) — Plan Review re-entry; no plan blockers after prior return closures (remove phantom §3.5.2; defer global `--help`/`--version` to RFC-036; use existing `validateResource` signature without unsafe cast bypass). Public-export `run` only; command-local FS; pure document seam; core workspace dep only; TDD via `run(['validate', …])` retained. RFC-037 remains Accepted. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#124](https://github.com/rexescario-dev/resource-forge/issues/124)  
**Source RFC:** [RFC-037 CLI Resource Validation](../specs/2026-08-10-rfc-037-cli-resource-validation-design.md) (**Accepted**)  
**Depends on:** [RFC-036 CLI Foundation](../specs/2026-08-10-rfc-036-cli-foundation-design.md) (**Accepted**); Accepted `@resource-forge/core` `validateResource` (RFC-005+)  
**Package:** `@resource-forge/cli` (**MAY** depend on `@resource-forge/core` only among workspace packages)  
**Slice:** M5.2 only — thin `rf validate <file>`  
**Goal:** Deliver registered `validate` with exactly one explicit path positional so `run(['validate', path])` reads that file via a command-local adapter, validates through an internal pure document seam + `validateResource`, and maps outcomes to RFC-037 exit/stream contracts—without discovery, stdin, `doctor`, or a second public validation API.

**Architecture:**

```text
RFC-037 (Accepted)
└── CLI Resource Validation (validate only)

@resource-forge/cli
├── run(argv) → { exitCode, stdout, stderr }   # sole public package API
├── registry: validate (internal)
├── validate handler
│     └── command-local readFile(path)         # not in bin; no run DI
├── validateResourceDocument(jsonText)         # internal, pure
│     ├── JSON.parse + object guard
│     └── validateResource(...)                # @resource-forge/core
├── bin adapter unchanged (stream/exit only)
└── tests: run(['validate', …]) + optional internal document-seam unit tests

Allowed dep: @resource-forge/core (workspace:*)
Forbidden: nest | graphql | prisma | run(argv, opts) | public document API
```

**Tech Stack:** TypeScript strict, Vitest, Node ≥20, `node:fs` for command-local reads only, `@resource-forge/core` `validateResource`. Prefer extending the RFC-036 custom runner (no third-party CLI framework).

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-037 Accepted (#124 / PR #125)
       ↓
M5.2 plan Draft → M5 Plan Review → (Accept or Return)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M10 as applicable + Slice Completion Report
       ↓
prefer one delivery PR for tracking #124 containing Accepted RFC
+ Accepted plan + implementation + SCR
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M5.2 delivery slice. Do **not** open a separate plan-only merge PR as a required gate. Docs Accept PR [#125](https://github.com/rexescario-dev/resource-forge/pull/125) may land first; fold plan + implementation into the delivery PR for `#124` when executing M5–M6. M6 treats Accepted RFC-037 text as authoritative for semantics.

**Task checkboxes:** Completed during **M6 execution** only. Leave unchecked until M6 runs.

---

## Locked decisions (planning aids — not new product semantics)

| Decision | Lock (from RFC-037) |
| --- | --- |
| Product semantics owner | RFC-037 Accepted text only |
| Package | `@resource-forge/cli` |
| Workspace deps | **`@resource-forge/core` only**; nest/graphql/prisma forbidden |
| Public package API | **`run` only** |
| CLI surface | `rf validate <file>` (+ RFC-036 builtins/errors) |
| Positional | Exactly one required literal path after `validate` |
| Integration path | `run(['validate', path])` |
| Bin | Stream/exit only; **MUST NOT** pre-read or special-case validate |
| Filesystem | Command-local adapter inside validate handler after `run` dispatch |
| Pure seam | Internal `validateResourceDocument(jsonText)` — JSON decode + `validateResource`; **no** exit/stream mapping |
| Semantic authority | `validateResource` only |
| Exit `0` | Valid Resource |
| Exit `1` | Semantic `validateResource` err **or** unexpected internal |
| Exit `2` | Input/decode: bad arity, missing/unreadable file, invalid JSON, non-object JSON; plus RFC-036 usage |
| Streams | Failures → stderr; quiet or minimal OK on success (prefer quiet); no structured JSON reports |
| Global `--help` / `--version` | **Preserve RFC-036 exactly** in positions RFC-036 already defines; do **not** invent plan-level precedence for `['--help','validate']`. Only after RFC-036 global-option handling has identified `validate` as the command to run, pass remaining argv to the validate handler |
| `validate --help` / post-command options | Exit `2` (undefined post-command option) — RFC-037 §4.1 |
| `doctor` / stdin / discovery / config | **Forbidden** |
| Public `validateResourceDocument` | **Forbidden** |
| `run(argv, { fs })` | **Forbidden** |
| README | Descriptive of current surface including `validate`; no aspirational doctor/generator tables |

### Planning placement of modules (non-normative layout)

```text
packages/cli/src/
  run.ts                      # parse globals; dispatch registry; map handler → RunResult
  run.test.ts                 # RFC-036 regressions + validate integration via run()
  commands/validate.ts        # validate handler: arity + read + document + map exits
  validate-document.ts        # internal validateResourceDocument (pure)
  validate-document.test.ts   # optional internal unit tests (same package; not exported)
  read-explicit-file.ts       # command-local readFile helper (utf8 text | error)
  bin.ts                      # unchanged adapter role
  index.ts                    # export { run } only
packages/cli/package.json     # add @resource-forge/core workspace:*
packages/cli/README.md        # document validate surface
packages/cli/test/fixtures/   # JSON Resource fixtures for run() tests
  valid-minimal.json
  invalid-identity.json
```

Keep the registry as a **small private map** `command → handler` inside `run.ts` (or a tiny private module). Do **not** invent a public plugin API.

Internal document-seam outcome shape (planning aid — not a public contract):

```ts
type DocumentValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly kind: 'input_decode'; readonly message: string }
  | { readonly ok: false; readonly kind: 'semantic'; readonly message: string };
```

Handler maps `input_decode` → exit `2`, `semantic` → exit `1`, `ok` → exit `0`.

---

## Goal / non-goals of this plan

**Goal:** Sequence M6 so `@resource-forge/cli` ships RFC-037 `validate`: register/dispatch, one positional path, command-local read, pure document validation via `validateResource`, exit/stream mapping, `run`-centered tests, core dependency only.

**Non-goals (plan):** `doctor`; stdin; discovery/config; Nest/GraphQL/Prisma CLI; generators; public document API; FS DI on `run`; structured diagnostics; amending core validators; inventing semantics missing from RFC-037.

---

## Constraints (SHALL / SHALL NOT)

Derived only from Accepted RFC-037 (and preserved RFC-036 shell rules):

1. SHALL keep `run(argv)` as the sole public package export.
2. SHALL register `validate` in the internal registry and dispatch it when RFC-036 global-option handling has identified `validate` as the command to run (RFC-037 §3.5: MUST NOT fall through to root help **merely** because a command token is present—e.g. `['validate', path]` must not become root help). SHALL NOT invent a new global `--help`/`--version` precedence rule beyond RFC-036 + RFC-037 §4.1.3.
3. SHALL accept exactly one required positional path after `validate`; missing/extra positionals → exit `2` stderr.
4. SHALL reject undefined options after `validate` → exit `2` stderr.
5. SHALL read only the explicit path inside the validate handler via a command-local adapter (bin MUST NOT pre-read).
6. SHALL implement internal pure `validateResourceDocument(jsonText)` that JSON-parses, rejects non-object JSON (incl. arrays/`null`) as input/decode, and delegates objects to `validateResource`.
7. SHALL map: valid → `0`; semantic err → `1` stderr; input/decode (arity/file/JSON/non-object) → `2` stderr; unexpected throw → `1` stderr.
8. SHALL NOT write streams or call `process.exit` inside `run` / handlers / document seam.
9. SHALL depend on `@resource-forge/core` for `validateResource`; SHALL NOT depend on nest/graphql/prisma.
10. SHALL NOT export `validateResourceDocument`, handlers, registry, or FS helpers.
11. SHALL NOT introduce `run(argv, opts)` or generalized FS injection.
12. SHALL NOT perform discovery, config loading, globbing, workspace inference, or stdin reads.
13. SHALL center verification on `run(['validate', …])` covering RFC-037 §7; MAY unit-test the document seam internally.
14. SHALL preserve RFC-036 builtin/unknown-command/invalid-global-option behaviors (regression tests remain green).

---

## Ownership boundaries

| Area | Ownership |
| --- | --- |
| `packages/cli/**` | **Owns** M5.2 delivery |
| `packages/core` | **Consumed only** — no product changes |
| `packages/nest`, `graphql`, `prisma` | **Untouched** |
| `examples/**` | **Untouched** |
| Docs: RFC-037 (Accepted), this plan, package README, roadmap M5.2 note | Allowed documentation updates for the slice |

---

## Contract inventory

| Surface | Kind | RFC-037 |
| --- | --- | --- |
| `run(argv)` | Public package API (unchanged) | §3.3 |
| `rf validate <file>` | CLI surface | §3.2 / §4 |
| Command-local positional | Argv contract | §4.1 |
| Command-local `readFile` | Internal I/O | §5.3 |
| `validateResourceDocument` | Internal pure seam | §5.2 |
| `validateResource` | Semantic authority (core) | §5.4 |
| Exit `0/1/2` + streams | Process contract | §6 |
| `doctor` / stdin / discovery / public document API | Deferred | §1.2 / §12 |

---

## TDD / verification strategy

1. **Fail first** on `run(['validate', …])` cases before wiring registry/handler.
2. Required `run()` coverage (RFC-037 §7 + RFC-036 regressions):
   - `run(['validate', validFixture])` → exit `0`; stdout empty or minimal; stderr `''`
   - `run(['validate', invalidIdentityFixture])` → exit `1`; stderr non-empty; stdout `''`
   - `run(['validate'])` → exit `2` (missing path)
   - `run(['validate', 'a.json', 'b.json'])` → exit `2` (extra positional)
   - `run(['validate', missingPath])` → exit `2`
   - `run(['validate', invalidJsonFixture])` → exit `2`
   - `run(['validate', nonObjectJsonFixture])` → exit `2` (e.g. `[]` or `null`)
   - `run(['validate', path, '--help'])` or `run(['validate', '--flag'])` → exit `2` (undefined post-command option)
   - Global `--help` / `--version` with or without a following command token: **follow RFC-036 established handling exactly** (do not invent plan-only expectations such as “`--help validate` must dispatch validate”). Add regression coverage only for behaviors RFC-036 already requires; once globals resolve to “run command `validate`,” remaining argv go to the validate handler.
   - RFC-036 regressions: bare/`--help`/`--version`/unknown command/unknown option/`foo --help` still pass
3. Public-surface assertion: still exports only `run` among product symbols; **does** list `@resource-forge/core` as the only `@resource-forge/*` dependency (update the M5.1 “no RF deps” assertion).
4. Optional: internal `validateResourceDocument` unit tests for decode/object-guard/semantic mapping without filesystem.
5. `pnpm --filter @resource-forge/cli test|typecheck|lint|build` must pass; lockfile updated only for adding `core` workspace dep.

**Fixture note:** Fixtures are static JSON files under `packages/cli/test/fixtures/` (or equivalent). Valid minimal Resource:

```json
{
  "identity": { "namespace": "crm", "name": "Customer" },
  "schema": {
    "fields": [],
    "relations": [],
    "operations": [],
    "constraints": []
  },
  "annotations": []
}
```

Invalid semantic fixture: same shape with `"namespace": "CRM"` (invalid identity per core).

---

## Task breakdown

### Task 1: Package dependency + fixtures + README posture

**Files:**
- Modify: `packages/cli/package.json`
- Modify: `packages/cli/README.md`
- Create: `packages/cli/test/fixtures/valid-minimal.json`
- Create: `packages/cli/test/fixtures/invalid-identity.json`
- Create: `packages/cli/test/fixtures/invalid-json.txt` (or `.json` with deliberate syntax error content read as text)
- Create: `packages/cli/test/fixtures/non-object-array.json` (`[]`)
- Modify: `pnpm-lock.yaml` (core workspace edge only)

- [x] **Step 1:** Add `"dependencies": { "@resource-forge/core": "workspace:*" }` to `packages/cli/package.json`. Keep description accurate (CLI foundation + resource validation command).
- [x] **Step 2:** Run `pnpm install` and commit **only** the lockfile delta for that workspace edge.
- [x] **Step 3:** Write the four fixtures above (valid / invalid-identity / invalid-json / non-object-array).
- [x] **Step 4:** Update README: document `rf validate <file>`, CLI vs `run` API, core delegation, and out-of-scope (`doctor`, discovery, stdin). No aspirational command tables.

### Task 2: Failing `run(['validate', …])` tests (TDD)

**Files:**
- Modify: `packages/cli/src/run.test.ts`

- [x] **Step 1:** Add fixture path helpers (resolve via `import.meta.url` to `../test/fixtures/...`).
- [x] **Step 2:** Write failing tests for success, semantic failure, missing path, extra positional, missing file, invalid JSON, non-object JSON, post-command option, and update the dependency assertion to allow **only** `@resource-forge/core`.
- [x] **Step 3:** Run `pnpm --filter @resource-forge/cli test` — expect new validate cases to **FAIL** (unknown command or missing behavior) while RFC-036 cases still pass.
- [x] **Step 4:** Commit the failing tests + fixtures (red) if the branch workflow prefers red commits; otherwise keep with implementation commit in Task 5.

Example assertions (informative):

```ts
it('validates a minimal Resource file', () => {
  const result = run(['validate', validMinimalPath]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe('');
});

it('returns exit 1 for semantically invalid Resource JSON', () => {
  const result = run(['validate', invalidIdentityPath]);
  expect(result.exitCode).toBe(1);
  expect(result.stdout).toBe('');
  expect(result.stderr.length).toBeGreaterThan(0);
});

it('returns exit 2 when path is missing', () => {
  const result = run(['validate']);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe('');
  expect(result.stderr.length).toBeGreaterThan(0);
});
```

### Task 3: Internal pure `validateResourceDocument`

**Files:**
- Create: `packages/cli/src/validate-document.ts`
- Create: `packages/cli/src/validate-document.test.ts` (optional but recommended)

- [x] **Step 1:** Write failing unit tests for: valid JSON object → ok; invalid identity object → semantic; malformed JSON → input_decode; `[]` / `null` / `"x"` → input_decode.
- [x] **Step 2:** Implement pure `validateResourceDocument(jsonText)`:
  - `JSON.parse` in try/catch → input_decode on throw
  - reject values that are not plain JSON objects suitable to pass as a Resource candidate (arrays / `null` / primitives → input_decode). The object guard is **only** a JSON-shape guard for input/decode classification.
  - Call `validateResource` using its **existing** Accepted core input type/signature (the `{ identity, schema, annotations }` candidate shape). Do **not** introduce a new core-facing type, and do **not** use an unsafe cast merely to bypass the core contract or invent a CLI-only validation assertion.
  - Map `err` → semantic with a short message (exact wording non-normative; distinguishable from input_decode)
  - Map `ok` → `{ ok: true }`
- [x] **Step 3:** Ensure the module does **not** import `node:fs` and is **not** exported from `index.ts`.
- [x] **Step 4:** Run document tests — PASS.

### Task 4: Command-local file reader

**Files:**
- Create: `packages/cli/src/read-explicit-file.ts`

- [x] **Step 1:** Implement a tiny helper, e.g. `readExplicitFile(path: string): { ok: true; text: string } | { ok: false; message: string }` using `readFileSync` (utf8) and mapping thrown errors to `ok: false`.
- [x] **Step 2:** Do **not** export from `index.ts`. Do **not** scan directories or resolve globs.

### Task 5: Validate handler + registry dispatch in `run`

**Files:**
- Create: `packages/cli/src/commands/validate.ts`
- Modify: `packages/cli/src/run.ts`
- Modify: `packages/cli/src/run.test.ts` (green the Task 2 cases)

- [x] **Step 1:** Implement `runValidate(argvAfterCommand: readonly string[]): RunResult`:
  - If first token missing → exit `2` usage
  - If any token after the first path starts with `-` → exit `2` (undefined option)
  - If more than one positional → exit `2`
  - `readExplicitFile(path)`; on failure → exit `2`
  - `validateResourceDocument(text)`; map outcome → exit `0` / `1` / `2` with stderr; success stdout `''`
- [x] **Step 2:** Change `runUnchecked` parsing:
  - Collect global `--help` / `--version` / invalid globals as today **until** the first non-option token (command), preserving RFC-036 grammar `rf [global-options] [command]`.
  - **Preserve RFC-036's established handling of global `--help` / `--version` exactly.** Do not invent plan-level precedence for cases like `['--help', 'validate']`. Only once RFC-036's global-option handling has identified `validate` as the command to run should remaining argv be passed to the validate handler.
  - If command unknown → unknown-command exit `2` (RFC-036).
  - If command is `validate` **and** global-option handling has selected command dispatch (not a builtin help/version outcome) → pass **remaining** argv after the command token to `runValidate`. Preserve the Accepted RFC-037 command-dispatch rule (RFC-037 §3.5): do not fall through to root help **merely** because a registered command token is present (e.g. `['validate', path]` must invoke validate, not root help).
  - If no command: preserve RFC-036 help/version behavior (`help || !version` → help; else version).
- [x] **Step 3:** Register `validate` in the internal registry (private map/set + dispatch).
- [x] **Step 4:** Update root help text so it **MAY** list `validate` (informative); remove “No product commands are registered” if no longer true.
- [x] **Step 5:** Run `pnpm --filter @resource-forge/cli test` — all PASS.
- [x] **Step 6:** Confirm `index.ts` still exports only `run`.

### Task 6: Docs / validation closeout

**Files:**
- Modify: `docs/roadmap.md` (M5.2 lifecycle note at appropriate point; final ✅ only after delivery merge + SCR)
- Modify: this plan’s SCR section during M7–M10
- Modify: `packages/cli/README.md` if any drift

- [x] **Step 1:** Update roadmap M5.2 line to reference plan / `#124` at the appropriate lifecycle point (Draft → Accepted plan → ✅ after merge).
- [x] **Step 2:** Fill SCR gates after M7–M10; set Status Slice complete only after delivery merge + SCR closeout per repo convention.
- [x] **Step 3:** Run final `pnpm --filter @resource-forge/cli test typecheck lint build`.
- [x] **Step 4:** Record in SCR that public export remains `run` only; sole RF workspace dep is `core`; no bin pre-read.

---

## Traceability (Accepted RFC-037 → tasks)

| RFC-037 section | Tasks |
| --- | --- |
| §3.1 core dep allowed | Task 1 |
| §3.2 / §4 argv + CLI surface | Tasks 2, 5 |
| §3.3 `run` only | Tasks 5–6 |
| §3.4 bin unchanged / no pre-read | Task 5 (bin untouched) |
| §3.5 registry + dispatch | Task 5 |
| §5.2 document seam | Task 3 |
| §5.3 command-local FS | Task 4–5 |
| §5.4 `validateResource` | Task 3 |
| §6 exits/streams | Tasks 2, 5 |
| §7 testing | Tasks 2–3, 5–6 |
| §12 deferrals | All tasks (fence) |

---

## Execution / dependency risks (operational)

1. M5.1 `run.ts` currently ignores tokens after the command and falls through to help whenever `help || !version` after the unknown-command check — Task 5 **must** dispatch registered `validate` for command invocations without inventing new global `--help`/`--version` precedence (RFC-036 + RFC-037 §4.1.3).
2. Public-surface test currently asserts **zero** `@resource-forge/*` deps — update in the same change that adds `core`.
3. Do not “fix” purity by moving reads into `bin.ts` — violates RFC-037 §3.4.
4. Do not export document helper for easier testing — test via same-package imports or `run()` fixtures.
5. Avoid unrelated lockfile churn when adding `workspace:*` core.
6. Do not cite nonexistent RFC subsections (e.g. “§3.5.2”); cite RFC-037 §3.5 / §4.1.3 and RFC-036 for globals.

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M5.2 CLI Resource Validation |
| Tracking | [#124](https://github.com/rexescario-dev/resource-forge/issues/124) |
| M4 | Implementation Plan: **Accepted** |
| M5 | Review **Accepted** (2026-08-10) |
| M6 | **Complete** |
| M7 | **Approved** (2026-08-10) |
| M8 | **N/A** (no worthwhile behavior-preserving refactor beyond slice delivery) |
| M9 | **Complete** (package README + root README CLI role + roadmap M5.2) |
| M10 | **Accepted** (slice process path; workflow library assets unmodified) |
| Branch | `feat/m5-2-cli-resource-validation` |
| PR | [#126](https://github.com/rexescario-dev/resource-forge/pull/126) |
| Status | **Ready for merge** |

### Shipped

- Registered `validate` command: `rf validate <file>` / `run(['validate', path])`
- Command-local explicit-path read (bin unchanged; no `run` FS DI)
- Internal pure `validateResourceDocument` → `@resource-forge/core` `validateResource`
- Exit `0` / `1` / `2` mapping per RFC-037; RFC-036 global `--help`/`--version` preserved
- `@resource-forge/cli` depends on `@resource-forge/core` only among workspace packages
- Public export remains `run` only

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (`pnpm --filter @resource-forge/cli test` — 22 tests) |
| Typecheck | **Passed** |
| Lint | **Passed** |
| Build | **Passed** |
| Package validation | **Passed** (`run` only public; sole RF dep `core`; no bin pre-read) |
| CI | Pending on delivery PR |

### Next Gate

**Merge** — then SCR Status **Slice complete** on closeout commit if required by convention.

### M7 Code Review

```text
Decision: Approved for merge
Subject: feat/m5-2-cli-resource-validation
Accepted specification: docs/superpowers/specs/2026-08-10-rfc-037-cli-resource-validation-design.md
Accepted implementation plan: docs/superpowers/plans/2026-08-10-m5-2-cli-resource-validation.md

Plan tasks reviewed:
- Task 1 package/fixtures/README: ✓
- Task 2 run(['validate']) tests: ✓
- Task 3 validateResourceDocument: ✓
- Task 4 readExplicitFile: ✓
- Task 5 handler + registry dispatch: ✓
- Task 6 docs/SCR: ✓

Verification evidence:
- pnpm --filter @resource-forge/cli test → 22 passed
- typecheck / lint / build → passed

Review summary: Implements RFC-037 composition (run → validate handler → command-local read → pure document → validateResource); run-only public API; RFC-036 globals preserved; fences held.
Blocking findings: None (no merge blockers)

Non-blocking observations:
- annotationsValue as Annotations is the JSON→core boundary after Array.isArray; validateResource remains semantic authority

Gate: Merge per human/project norms. M8/M9 may follow when appropriate.
```

### M8 / M9 / M10

```text
Decision: N/A
Subject: packages/cli M5.2 validate surface
Accepted specification: docs/superpowers/specs/2026-08-10-rfc-037-cli-resource-validation-design.md
Accepted implementation plan: docs/superpowers/plans/2026-08-10-m5-2-cli-resource-validation.md
M7 / authorization: Approved for merge (2026-08-10)
Gate: N/A — proceed to M9
```

```text
Decision: Complete
Subject: M5.2 / #124
Accepted specification: docs/superpowers/specs/2026-08-10-rfc-037-cli-resource-validation-design.md
Accepted implementation plan: docs/superpowers/plans/2026-08-10-m5-2-cli-resource-validation.md
M7: Approved for merge
M8: N/A

Documentation scope:
- packages/cli/README.md
- README.md (cli role)
- docs/roadmap.md (M5.2 Ready for merge)
- plan SCR

Gate: Documentation complete. Code/behavior unchanged by this stage.
```

```text
Decision: Accepted (slice process path)
Subject: M5.2 CLI Resource Validation workflow path
Governing specification: docs/workflows/specs/agent-workflow-design.md
Blocking findings: None
Non-blocking observations: Workflow library assets unmodified; product-slice path only
Gate: Workflow path for this slice validated; library revalidation N/A
```

---

## Document status

**Status: Accepted.** Authoritative for M5.2 sequencing/execution history. RFC-037 remains authoritative for product semantics. Delivery ready for merge via tracking [#124](https://github.com/rexescario-dev/resource-forge/issues/124).
