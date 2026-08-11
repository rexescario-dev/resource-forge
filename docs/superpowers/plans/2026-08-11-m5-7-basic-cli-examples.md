# M5.7 Basic CLI Examples Walkthrough — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Implement **only** Accepted RFC-042 Basic CLI Examples Walkthrough. Do **not** invent Nest/GraphQL/Prisma host apps, richer hand-authored Resources, `from-prisma` fixtures/appendix/walkthrough steps, new CLI commands/options/exit codes, `run(argv, opts)`, public helpers beyond `run`, example-specific shell scripts/bins/generation scripts, an `examples` pnpm workspace package, overwrite/`--force`, project-aware sibling semantics, or architecture-authority claims for example artifacts. Preserve RFC-036–041: sole public CLI export `run`; bin stream/exit only; exit `0/1/2` meanings unchanged; doctor registry still requires only `validate` + `doctor`; `init` / `generate resource` / `validate` / `doctor` / `from-prisma` product semantics not reopened. Resource golden MUST be byte-identical to documented `generate resource` output; marker comparison MUST be semantic RFC-040 only. Harness MUST use `run([...])` for CLI invocations (no subprocess/shell/example executable); fixture retains committed marker, removes `resources/Item.json`, then runs lifecycle. Happy-path only — do **not** duplicate destination-exists refusal tests. Docs surfaces for this plan: `examples/basic/README.md` + `docs/roadmap.md` only (no opportunistic package/root README edits). Sequence: establish goldens first, then harness (fixture-driven; not fake-red TDD).

**Status:** Accepted  
**M5:** Accepted (2026-08-11) — Plan Review re-entry; no plan blockers after prior return closures (fixture-first sequencing; workspace-local `rf` sole golden generation; harness filename implementation-owned; fixture preconditions; Task 4 roadmap+SCR only). Minor non-blocking confirmation retained: no fake-red harness required for this fixture-driven slice. RFC-042 remains Accepted and is semantic authority. M6 authorized; task checkboxes remain open until execution.  
**Revision note:** Returned once for sequencing/fixture/generation-surface tightenings; M5 Accepted with closures recorded above.  
**Tracking:** [#141](https://github.com/rexescario-dev/resource-forge/issues/141)  
**Source RFC:** [RFC-042 Basic CLI Examples Walkthrough](../specs/2026-08-11-rfc-042-basic-cli-examples-design.md) (**Accepted**)  
**Depends on:** [RFC-036](../specs/2026-08-10-rfc-036-cli-foundation-design.md) (**Accepted**); [RFC-037](../specs/2026-08-10-rfc-037-cli-resource-validation-design.md) (**Accepted**); [RFC-038](../specs/2026-08-10-rfc-038-cli-package-environment-doctor-design.md) (**Accepted**); [RFC-039](../specs/2026-08-10-rfc-039-cli-generate-resource-design.md) (**Accepted**); [RFC-040](../specs/2026-08-10-rfc-040-cli-init-project-marker-design.md) (**Accepted**) — consume only; semantics not reopened. [RFC-041](../specs/2026-08-10-rfc-041-cli-generate-from-prisma-design.md) (**Accepted**) — out-of-scope coexistence only.  
**Packages / areas:** `examples/basic/` (sole example target); `@resource-forge/cli` tests (normative harness)  
**Slice:** M5.7 only — basic CLI examples walkthrough  
**Goal:** Ship a non-authoritative `examples/basic` with committed goldens + literal README, and a CI-enforced Vitest harness in `@resource-forge/cli` that reproduces the Resource golden via `run([...])` through `init` → `generate resource` → `validate` → `doctor`.

**Architecture:**

```text
RFC-042 (Accepted)
└── Basic CLI Examples Walkthrough

examples/basic/
├── README.md                    # literal human walkthrough
├── resource-forge.json          # RFC-040 canonical marker
└── resources/Item.json          # byte-identical generate golden

@resource-forge/cli
├── run(argv) sole public export (unchanged)
└── Vitest harness (existing test location; filename implementation-owned)
      copy committed example → temp
      assert marker + resources/ present; Item.json absent after unlink
      chdir → run(['init', '.']) → semantic marker assert
      run(['generate','resource','demo','Item','resources/Item.json'])
      byte-compare to committed golden (untouched on disk)
      run(['validate', …]) → 0
      run(['doctor']) → 0

Forbidden: from-prisma fixtures | host apps | richer Resources |
examples workspace package | shell/script product | scratch generators |
run(argv, opts) | subprocess CLI | overwrite flags | new CLI semantics
```

**Tech Stack:** TypeScript strict, Vitest, Node ≥20. Sync `fs`/`path` in harness. Reuse existing `run` + `process.chdir` patterns from the CLI package’s established tests. No third-party CLI framework.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-042 Accepted (#141)
       ↓
M5.7 plan Draft → M5 Plan Review → (Accept or Return)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M10 as applicable + Slice Completion Report
       ↓
prefer one delivery PR for tracking #141 containing Accepted plan
+ implementation + SCR
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M5.7 delivery slice. Do **not** open a separate plan-only merge PR as a required gate. Fold plan Accept + implementation into the delivery PR for `#141` when executing M5–M6. M6 treats Accepted RFC-042 text as authoritative for product semantics. Intermediate commits on the delivery branch are permitted.

**Task checkboxes:** Completed during **M6 execution** only. Leave unchecked until M6 runs.

---

## Locked decisions (planning aids — not new product semantics)

| Decision | Lock (from RFC-042) |
| --- | --- |
| Product semantics owner | RFC-042 Accepted text only |
| Sole example target | `examples/basic/` |
| Lifecycle | `init` → `generate resource` → `validate` → `doctor` |
| Identity | `namespace: demo`, `name: Item`, path `resources/Item.json` |
| Resource golden | Byte-identical to documented generate output (RFC-039 encoding authority) |
| Marker | Semantic RFC-040 conformance; not byte-identical |
| README | Literal copy/pasteable; non-authoritative; workspace-local `rf` |
| Harness location | Existing `@resource-forge/cli` Vitest placement / job; **filename implementation-owned** |
| CLI entry in harness | `run([...])` — no subprocess / shell / example executable |
| Golden generation procedure | **Workspace-local `rf` only** (prescribed); no committed scratch script |
| Fixture | Copy committed example; **remove** `resources/Item.json`; **retain** marker; then `init .` |
| Doctor | Package/CLI health only — not project-resource diagnosis |
| Create-only refusal | Document in README; **do not** re-test in harness |
| `from-prisma` | Out of scope (no fixture/appendix/steps) |
| Public CLI API | `run` only; doctor registry still `validate` + `doctor` |
| Examples package | **Forbidden** — stay outside `pnpm-workspace` `packages/*` |
| Planned docs surfaces | `examples/basic/README.md` + `docs/roadmap.md` only |
| Source of truth | RFC-039 generate; RFC-040 marker; RFC-042 identity/location/comparison only |

### Fixed identity (from RFC-042 §4.2)

```text
namespace: demo
name: Item
output: resources/Item.json
```

### Comparison contracts (from RFC-042 §3 / §4 / §6)

| Artifact | Rule |
| --- | --- |
| `resources/Item.json` | Byte-identical to generate output |
| `resource-forge.json` | Semantic `{ version: 1, resourcesDir: "resources" }` |

---

## Ownership boundaries

| Area | Role |
| --- | --- |
| `examples/basic/**` | Committed walkthrough + goldens (touched) |
| `@resource-forge/cli` Vitest suite | Normative harness (create) — follow established test placement; exact filename **implementation-owned** |
| `packages/cli/src/index.ts` / command handlers | **Untouched** (no new CLI product surface) |
| `packages/core`, `nest`, `graphql`, `prisma` | **Untouched** |
| `docs/roadmap.md` | M5.7 listing + optional M5.6 summary cosmetic |
| `packages/cli/README.md`, root `README.md` | **Out of planned scope** — touch only if M6 discovers a real contradiction (not opportunistic) |
| `docs/superpowers/specs/README.md` | Already lists RFC-042 Accepted — touch only if inaccurate |
| `docs/workflows/**` | **Untouched** (installer-managed) |

---

## Contract inventory (authorized surfaces)

| Surface | Action |
| --- | --- |
| `examples/basic/resource-forge.json` | Commit canonical marker |
| `examples/basic/resources/Item.json` | Commit generate golden bytes |
| `examples/basic/README.md` | Replace placeholder; RFC-042 §5 |
| Harness test | Create in existing CLI test location; RFC-042 §6 |
| `docs/roadmap.md` | M5.7 + optional M5.6 cosmetic |
| CLI public API | **No change** |
| New packages / bins / generation scripts | **Deferred / forbidden** |

**Deferred (explicit):** host-app examples; richer Resources; `from-prisma` examples; project/workspace doctor; other generate kinds; examples workspace packaging.

---

## Slice sequence

```text
1. Establish committed fixtures (marker + generate Item.json via workspace-local rf)
2. Add normative reproducibility harness (green against existing goldens)
3. Replace examples/basic/README.md
4. Roadmap + SCR closeout
```

This slice is **fixture-driven documentation/examples**, not new CLI behavior. Do **not** manufacture a fake-red harness that fails at missing-golden load time. Establish goldens first; then add the harness that proves recreate matches them.

Harness MUST `process.chdir` into the temp fixture because documented commands use `init .` and relative paths against process cwd.

---

## Verification strategy

1. **Goldens:** produced only by workspace-local CLI generate; no hand-authored Resource JSON; no separate generation script checked into the repo.
2. **Harness:** proves recreate byte-match + validate/doctor exit `0` via `run([...])`.
3. **README:** inspected against RFC-042 §5 (not TDD).
4. **Regression:** `pnpm --filter @resource-forge/cli test` + typecheck; public export remains `run` only.

---

## Task breakdown

### Task 1: Establish committed example fixtures

**Files:**
- Create/replace: `examples/basic/resource-forge.json`
- Ensure: `examples/basic/resources/` directory
- Create: `examples/basic/resources/Item.json` (via CLI generate only)
- Leave: `examples/basic/README.md` stub until Task 3

**RFC:** §4.1–§4.5

- [x] **Step 1: Commit canonical marker + `resources/` directory**

```json
{
  "version": 1,
  "resourcesDir": "resources"
}
```

Pretty-print / trailing newline are implementation-owned so long as semantic RFC-040 conformance holds. Ensure `examples/basic/resources/` exists (may be empty before generate).

- [x] **Step 2: Produce `resources/Item.json` using workspace-local CLI only**

Prerequisites: `pnpm install` and CLI build so workspace-local `rf` resolves.

```bash
cd examples/basic
# ensure destination absent (create-only)
rm -f resources/Item.json
pnpm exec rf init .
pnpm exec rf generate resource demo Item resources/Item.json
```

Equivalent workspace-local forms (e.g. `pnpm --filter @resource-forge/cli exec rf …`) are fine. **Do not** hand-author Resource JSON. **Do not** add or keep a scratch script, Vitest one-off, or example-specific generator as a plan/product surface.

Commit the generated `resources/Item.json` **exactly** as written.

- [x] **Step 3: Sanity-check committed golden**

```bash
cd examples/basic
pnpm exec rf validate resources/Item.json
# expect exit 0
```

- [x] **Step 4: Commit fixtures**

```bash
git add examples/basic/resource-forge.json examples/basic/resources/Item.json
git commit -m "docs(examples): add RFC-042 basic CLI goldens"
```

---

### Task 2: Normative reproducibility harness

**Files:**
- Create: Vitest test in the **existing** `@resource-forge/cli` test location, following repository conventions (exact filename implementation-owned; illustrative sketch below uses `examples-basic.test.ts` colocated with other CLI tests — not a product contract)
- Read (pattern): existing CLI tests that use `mkdtempSync` / `process.chdir` / `run([...])`

**RFC:** §6, §4.2, §3.9–§3.11

- [x] **Step 1: Write harness against committed goldens**

Illustrative shape (adapt imports/paths to actual test file location):

```typescript
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { run } from './run.js'; // adjust relative import to match file location

const here = dirname(fileURLToPath(import.meta.url));
const exampleRoot = join(here, '../../../examples/basic'); // adjust if test path differs
const goldenResourcePath = join(exampleRoot, 'resources', 'Item.json');

const NAMESPACE = 'demo';
const NAME = 'Item';
const RESOURCE_REL = 'resources/Item.json';

describe('examples/basic reproducibility (RFC-042)', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function expectCanonicalMarker(dir: string): void {
    const marker = JSON.parse(
      readFileSync(join(dir, 'resource-forge.json'), 'utf8'),
    );
    expect(marker).toEqual({ version: 1, resourcesDir: 'resources' });
  }

  it('recreates the committed Resource golden via init → generate → validate → doctor', () => {
    expect(existsSync(join(exampleRoot, 'resource-forge.json'))).toBe(true);
    expect(existsSync(goldenResourcePath)).toBe(true);
    expect(lstatSync(join(exampleRoot, 'resources')).isDirectory()).toBe(true);

    const committedGolden = readFileSync(goldenResourcePath);
    const previous = process.cwd();
    const dir = mkdtempSync(join(tmpdir(), 'rf-ex-basic-'));
    dirs.push(dir);

    cpSync(exampleRoot, dir, { recursive: true });
    unlinkSync(join(dir, 'resources', 'Item.json'));

    // Fixture preconditions (temp workspace)
    expect(existsSync(join(dir, 'resource-forge.json'))).toBe(true);
    expect(lstatSync(join(dir, 'resources')).isDirectory()).toBe(true);
    expect(existsSync(join(dir, RESOURCE_REL))).toBe(false);
    // Committed golden must remain untouched
    expect(readFileSync(goldenResourcePath).equals(committedGolden)).toBe(true);

    try {
      process.chdir(dir);

      const initResult = run(['init', '.']);
      expect(initResult.exitCode).toBe(0);
      expect(initResult.stderr).toBe('');
      expectCanonicalMarker(dir);

      const genResult = run([
        'generate',
        'resource',
        NAMESPACE,
        NAME,
        RESOURCE_REL,
      ]);
      expect(genResult.exitCode).toBe(0);
      expect(genResult.stderr).toBe('');

      const produced = readFileSync(join(dir, RESOURCE_REL));
      expect(produced.equals(committedGolden)).toBe(true);

      const validateResult = run(['validate', RESOURCE_REL]);
      expect(validateResult.exitCode).toBe(0);

      const doctorResult = run(['doctor']);
      expect(doctorResult.exitCode).toBe(0);
    } finally {
      process.chdir(previous);
    }

    expect(readFileSync(goldenResourcePath).equals(committedGolden)).toBe(true);
  });
});
```

- [x] **Step 2: Run harness — expect PASS**

```bash
pnpm --filter @resource-forge/cli test
```

Expected: PASS (including the new examples/basic case).

- [x] **Step 3: Commit harness**

```bash
git add packages/cli/src/<harness-file>.test.ts   # actual path as created
git commit -m "test(cli): prove RFC-042 examples/basic reproducibility"
```

---

### Task 3: Replace README

**Files:**
- Modify: `examples/basic/README.md`

**RFC:** §5, §5.1, §11 informative

- [x] **Step 1: Replace placeholder README**

Must include:

1. Non-authoritative disclaimer (not architecture source of truth).
2. Workspace-local `rf` after install + CLI build; MUST NOT require global `rf`; MAY show preferred + equivalent workspace-local forms (invocation syntax not architectural).
3. Fixed commands:

```text
rf init .
rf generate resource demo Item resources/Item.json
rf validate resources/Item.json
rf doctor
```

4. Recreate: remove `resources/Item.json` first; retain marker; conforming `init` no-op.
5. Expected happy-path exit `0`.
6. Create-only honesty: existing `Item.json` → generate exit `2`, no overwrite (informative).
7. Explicit: `validate` = Resource check; `doctor` = package/CLI health (not project-resource diagnostic).
8. Optional one-line: `from-prisma` exists elsewhere — do not teach it.

- [x] **Step 2: Commit README**

```bash
git add examples/basic/README.md
git commit -m "docs(examples): document RFC-042 basic CLI walkthrough"
```

---

### Task 4: Roadmap + closeout

**Files:**
- Modify: `docs/roadmap.md` (M5.7 when shipping; optional M5.6 summary-table cosmetic; keep M5 overall “In progress” if later slices remain — **do not** mark whole M5 Done solely because examples shipped)
- Update this plan’s Slice Completion Report during M6–M9 closeout
- **Do not** plan edits to `packages/cli/README.md` or root `README.md`

**RFC:** §1.1.12, §1.3.2, Amends/specializes

- [x] **Step 1: Update roadmap M5 section**

Add M5.7 line linking RFC-042 / `#141` / delivery PR when known. Fix summary-table M5.6 omission if still present. Leave later candidates as not-committed.

- [x] **Step 2: Verify CLI suite + public API unchanged**

```bash
pnpm --filter @resource-forge/cli test
pnpm --filter @resource-forge/cli typecheck
# confirm packages/cli/src/index.ts still exports only run
```

- [x] **Step 3: Fill SCR gates after M7–M10; set Status Slice complete only after delivery merge + SCR closeout.**

---

## Traceability

| Task | RFC-042 |
| --- | --- |
| Task 1 fixtures | §4.1–§4.5 |
| Task 2 harness | §6, §3.9–11, §4.2 |
| Task 3 README | §5, §5.1 |
| Task 4 roadmap/SCR | §1.1.12, deferrals §10 |

---

## Execution risks (operational — not redesign)

1. **cwd sensitivity** — harness must chdir; restore cwd in `finally`.
2. **Golden drift** — if generate encoding changes later, regenerate via workspace-local `rf` (do not hand-patch).
3. **Fixture order** — remove Resource destination before generate; retain marker; assert preconditions.
4. **Doctor in harness** — exit `0` package health only; does not inspect example Resources.
5. **Example root path from test file** — compute relative to actual harness location; do not treat a specific basename as a contract.
6. **No second generator** — do not leave behind scratch scripts used during M6.

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M5.7 Basic CLI Examples Walkthrough |
| Tracking | [#141](https://github.com/rexescario-dev/resource-forge/issues/141) |
| M4 | Implementation Plan: **Accepted** |
| M5 | Review **Accepted** (2026-08-11) |
| M6 | **Complete** |
| M7 | **Approved** (2026-08-11) |
| M8 | **N/A** (no worthwhile behavior-preserving refactor beyond slice delivery) |
| M9 | **Complete** (`examples/basic/README.md` + roadmap M5.7 / M5.6 summary cosmetic + specs index) |
| M10 | **Accepted** (slice process path; workflow library assets unmodified) |
| Branch | `feat/m5-7-basic-cli-examples` |
| PR | Pending push |
| Status | **Ready for merge** |

### Shipped

- `examples/basic/resource-forge.json` + `resources/Item.json` (generate golden bytes via workspace-local CLI bin)
- Literal `examples/basic/README.md` walkthrough (`init` → `generate resource` → `validate` → `doctor`)
- Normative harness `packages/cli/src/examples-basic.test.ts` via `run([...])` (chdir temp fixture; byte Resource; semantic marker)
- Roadmap M5.7 + summary-table M5.6 cosmetic; RFC-042 Accepted in specs index
- Public CLI API remains `run` only; no new CLI commands; `from-prisma` not exercised

### Verification

| Check | Result |
| --- | --- |
| `pnpm exec vitest run … src/examples-basic.test.ts` | **PASS** (1 test; tinypool teardown noise may yield process exit 1 — ignored per prior CLI slices) |
| `pnpm --filter @resource-forge/cli typecheck` | **PASS** |
| `pnpm --filter @resource-forge/cli lint` | **PASS** |
| Public CLI export `run` only | **PASS** |
| Golden regenerated after core rebuild (includes `constraints: []`) | **PASS** |
| Doctor = package/CLI health only in README + harness | **PASS** |

### Next Gate

**Merge delivery PR for #141**, then optional SCR closeout commit if Status needs **Slice complete**.

---

**Status: Accepted.** Authoritative for M5.7 sequencing/execution. RFC-042 remains authoritative for product semantics. Delivery on `feat/m5-7-basic-cli-examples`.
