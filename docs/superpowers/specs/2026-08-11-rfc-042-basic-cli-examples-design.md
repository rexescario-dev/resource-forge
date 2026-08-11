# RFC-042: Basic CLI Examples Walkthrough

**Date:** 2026-08-11  
**Status:** Accepted  
**M3:** Accepted (2026-08-11) — Design Review; no design blockers. Locked: sole example target `examples/basic/`; lifecycle `init` → `generate resource` → `validate` → `doctor`; fixed identity `demo` / `Item` / `resources/Item.json`; Resource golden byte-identical to RFC-039 generate output; marker semantic RFC-040 only; README literal + non-authoritative; harness in `@resource-forge/cli` via `run([...])` (no subprocess/shell/example executable); fixture retains marker, removes Resource destination, then `init .`; `validate` ≠ `doctor` (doctor not project-resource diagnostic); `from-prisma` out-of-scope coexistence (RFC-041); no host/adapters/new CLI semantics; create-only refusal documented not re-tested; §4.5 source of truth (039/040 authoritative). M4 (implementation planning) authorized for `#141`.  
**Package:** repository `examples/basic/` (sole example target); normative reproducibility harness in `@resource-forge/cli` tests  
**Tracking:** [#141](https://github.com/rexescario-dev/resource-forge/issues/141)  
**Depends on:** [RFC-036 CLI Foundation](2026-08-10-rfc-036-cli-foundation-design.md) (**Accepted**) for `rf` / `run(argv)` / exit `0/1/2` / bin adapter; [RFC-037 CLI Resource Validation](2026-08-10-rfc-037-cli-resource-validation-design.md) (**Accepted**) for `rf validate <file>`; [RFC-038 CLI Package Environment Doctor](2026-08-10-rfc-038-cli-package-environment-doctor-design.md) (**Accepted**) for `rf doctor` as package/CLI health only; [RFC-039 CLI Generate Resource](2026-08-10-rfc-039-cli-generate-resource-design.md) (**Accepted**) for `rf generate resource <namespace> <name> <path>` and create-only write semantics; [RFC-040 CLI Init Project Marker](2026-08-10-rfc-040-cli-init-project-marker-design.md) (**Accepted**) for `rf init` and canonical `resource-forge.json` + `resources/`  
**Followed by:** M5.7 implementation planning/delivery for `#141` after Accept; later host-application examples, richer authored Resources, project/workspace doctor, and `from-prisma` example fixtures only under separately Accepted designs  
**Unblocks:** A non-authoritative, CI-proven `examples/basic` walkthrough that demonstrates the shipped CLI lifecycle without expanding M5.1–M5.6 product contracts

**Amends / specializes:** Roadmap **M5 — CLI & examples** by **proposing/targeting M5.7 Basic CLI Examples Walkthrough** (CLI discoverability/reproducibility only as defined here). Does **not** mutate roadmap milestone status by itself. Does **not** reopen RFC-036–041 product semantics. Does **not** amend RFC-001–RFC-035 product contracts. Does **not** introduce new CLI commands, options, exit codes, or public package exports. Does **not** commit Nest/GraphQL/Prisma host applications or adapter DX. Roadmap documentation may include a cosmetic M5.6 summary-table correction alongside this slice’s docs (informative; not a product contract).

## Primary question

> How should Resource Forge ship a non-authoritative `examples/basic` that proves the shipped CLI lifecycle is discoverable and reproducible—without new CLI, project, or adapter semantics?

## Thesis

RFC-042 locks M5.7 as **Basic CLI Examples Walkthrough**:

- **Job:** CLI discoverability and reproducibility — not framework integration, not Resource-model expressiveness, not architecture reference material.
- **Sole example target:** `examples/basic/`.
- **Lifecycle (sole walkthrough):** `rf init` → `rf generate resource` → `rf validate` → `rf doctor`.
- **`from-prisma` is out:** no DMMF fixture, no appendix, no walkthrough steps (README may briefly mention existence only).
- **Goldens:** one Resource document that **MUST** be byte-identical to documented `generate resource` output (including current JSON formatting/newline behavior); marker checked **semantically** per RFC-040.
- **Fixed identity:** `namespace: demo`, `name: Item`, output `resources/Item.json`.
- **Proof layers:** literal README for humans; normative Vitest harness in `@resource-forge/cli` that invokes CLI operations through existing `run([...])` in a temporary fixture (marker retained; Resource destination absent before generate).
- **Role split:** `rf validate` verifies the example Resource; `rf doctor` verifies CLI/package installation health. **`rf doctor` is not a project-resource diagnostic.**
- **Public CLI API unchanged:** sole normative export remains `run`. No example-specific executable, shell script product surface, or examples package.

```text
examples/basic/                 # committed human walkthrough + goldens
        │
        │  README (literal commands)
        ▼
shipped CLI (RFC-036…040)
        │
        ▼
init → generate resource → validate → doctor

packages/cli Vitest harness     # normative reproducibility proof
        │
        │  run([...]) in temp fixture
        ▼
same lifecycle → byte-identical Resource golden
                 + semantic marker conformance
```

## 1. Scope

### 1.1 Goals

1. Propose/target **M5.7** as a basic CLI examples walkthrough under `examples/basic/`.
2. Lock the sole walkthrough lifecycle: `init` → `generate resource` → `validate` → `doctor`.
3. Lock committed tree shape: `README.md`, canonical `resource-forge.json`, and `resources/Item.json`.
4. Lock fixed identity constants: `demo` / `Item` / `resources/Item.json`.
5. Lock Resource golden contract: byte-identical to documented `generate resource` output, including current encoding (`JSON.stringify(…, null, 2)` + trailing newline as implemented by RFC-039 delivery).
6. Lock marker verification: semantic RFC-040 conformance only (not byte-identical formatting).
7. Lock human README as literal, copy/pasteable documentation (not generated/config-driven).
8. Lock normative Vitest harness in `@resource-forge/cli`: CLI invocations use `run([...])`; happy-path exits `0`.
9. Lock create-only honesty in documentation without duplicating existing generate refusal tests in the example harness.
10. Explicitly separate `validate` (Resource) from `doctor` (package/CLI health).
11. Fence `from-prisma`, host apps, richer Resources, new CLI semantics, and architecture-authority claims for example artifacts.
12. Allow roadmap M5.7 listing and an optional cosmetic M5.6 summary-table correction as documentation ride-alongs.

### 1.2 Non-goals

This RFC does not define:

1. NestJS / GraphQL / Prisma / TypeScript application scaffolding, servers, resolvers, or database setup
2. Full-stack or demo UI
3. New CLI commands, options, exit codes, or public exports beyond `run`
4. Changes to `init`, `generate`, `validate`, `doctor`, or `from-prisma` product semantics
5. Project-aware generation, upward discovery, or workspace semantics beyond what RFC-040 already Accepted
6. `from-prisma` fixtures, appendices, or walkthrough steps
7. Richer hand-authored Resources (fields, relations, operations, extensions) beyond the document produced by the documented `generate resource` invocation
8. A `generated/` vs `authored/` split or shared manifest driving both README and tests
9. Example-specific shell scripts, bins, or an `examples` pnpm workspace package
10. Making `examples/basic` an architecture reference or canonical Resource schema fixture for the framework
11. Requiring a globally installed `rf` binary
12. Expanding the example harness to re-prove create-only destination-exists refusal (owned by existing RFC-039 tests)
13. Roadmap status mutation by this Draft alone (proposes/targets M5.7; does not mark it done)

### 1.3 Informative only

1. Exact preferred `pnpm` invocation string(s) shown in the README (workspace-local forms may vary; see §5).
2. Cosmetic roadmap summary-table alignment for M5.6.
3. Filename of the Vitest file (e.g. `examples-basic.test.ts`) — location package is normative (`@resource-forge/cli`); basename is implementation-owned.

## 2. Terminology

| Term | Meaning |
| --- | --- |
| Example target | The committed directory `examples/basic/` |
| Resource golden | Committed `resources/Item.json`; MUST match generate output byte-for-byte |
| Marker | Committed `resource-forge.json` under the example target |
| Recreate | Produce the Resource golden again via shipped CLI after the destination is absent |
| Harness | Normative `@resource-forge/cli` Vitest proof; CLI steps via `run([...])` |
| Non-authoritative | Example artifacts MUST NOT be treated as framework architecture source of truth |

## 3. Invariants / boundaries

1. M5.7 MUST be a **CLI example** slice, not a framework integration example.
2. The sole example target MUST be `examples/basic/`. The normative harness MAY live under `packages/cli`.
3. The sole walkthrough MUST be `init` → `generate resource` → `validate` → `doctor`.
4. `from-prisma` MUST NOT appear as a fixture, appendix, or taught step.
5. The committed Resource golden MUST be byte-identical to the output produced by the documented `generate resource` invocation, including current JSON formatting/newline behavior.
6. Marker verification MUST be semantic RFC-040 conformance; MUST NOT require byte-identical marker formatting.
7. Fixed identity MUST be `namespace: demo`, `name: Item`, relative path `resources/Item.json`.
8. README commands MUST be literal and copy/pasteable; MUST NOT be generated from a shared config artifact.
9. CLI invocations in the harness MUST use the existing `run([...])` programmatic entrypoint; the harness MUST NOT invoke the CLI through a subprocess, shell script, or example-specific executable. (Fixture FS setup, golden reads, and assertions are permitted.)
10. Harness MUST prove happy-path exit `0` for the lifecycle; MUST NOT be required to test destination-exists refusal.
11. `rf validate` verifies the example Resource; `rf doctor` verifies CLI/package health; doctor MUST NOT be described as a project-resource diagnostic.
12. Example artifacts MUST be explicitly non-authoritative for framework architecture.
13. Public CLI package API MUST remain `run` only; doctor registry expectations remain `validate` + `doctor` only.
14. No new `examples` workspace package; harness runs under the existing `@resource-forge/cli` test job.

## 4. Committed tree and identity

### 4.1 Tree

```text
examples/basic/
├── README.md
├── resource-forge.json
└── resources/
    └── Item.json
```

### 4.2 Fixed identity

| Constant | Value |
| --- | --- |
| namespace | `demo` |
| name | `Item` |
| output path (relative to example root) | `resources/Item.json` |

Harness constants MUST encode the same identity. README MUST show the same values as literal command arguments.

### 4.3 Marker content

Committed and recreate marker MUST conform to RFC-040 canonical marker:

```json
{
  "version": 1,
  "resourcesDir": "resources"
}
```

Semantic equivalence of parsed values is required; byte-identical formatting is not.

### 4.4 Resource golden

Committed `resources/Item.json` MUST be exactly the bytes produced by the documented `rf generate resource demo Item resources/Item.json` invocation under the Accepted RFC-039 implementation, including current JSON formatting/newline behavior.

The example MUST NOT hand-enrich the generated document.

Illustrative shape (informative only — not a separate Resource contract; authoritative bytes are whatever the Accepted generate encoder emits for this identity):

```json
{
  "identity": {
    "namespace": "demo",
    "name": "Item"
  },
  "schema": {
    "fields": [],
    "relations": [],
    "operations": []
  },
  "annotations": []
}
```

### 4.5 Source of truth

RFC-039 remains authoritative for Resource generation semantics and encoding. RFC-040 remains authoritative for project marker semantics. RFC-042 only fixes the example identity, committed artifact location, and reproducibility comparison used by M5.7.

## 5. README contract

1. README MUST document workspace-local invocation after installation and CLI build. It MUST NOT require a globally installed `rf` binary or introduce an example-specific wrapper. Preferred and equivalent workspace-local forms MAY be shown; package-manager invocation syntax is **not** an architectural contract of this RFC.
2. README MUST state that the example is non-authoritative for framework architecture.
3. README MUST separate `validate` (Resource) from `doctor` (package/CLI health).
4. README MAY briefly mention that `from-prisma` exists; MUST NOT teach or exercise it.
5. README MUST document expected happy-path exits (`0`) and outcomes.
6. README MUST document create-only honesty: if `resources/Item.json` already exists, `generate resource` refuses (exit `2`, no overwrite). This is informative documentation only.

### 5.1 Human recreate procedure

Committed `examples/basic/` is directly usable from a clean checkout:

1. Install and build the workspace so workspace-local `rf` resolves.
2. `cd examples/basic`
3. If recreating the Resource: **remove `resources/Item.json` first**. Retain the committed `resource-forge.json` marker; conforming `init` is a no-op per RFC-040.
4. Run:

```text
rf init .
rf generate resource demo Item resources/Item.json
rf validate resources/Item.json
rf doctor
```

5. Generated `resources/Item.json` MUST match the committed golden byte-for-byte.

## 6. Normative harness

1. Location: `@resource-forge/cli` Vitest suite (existing package test job).
2. CLI invocations in the harness MUST use the existing `run([...])` programmatic entrypoint; the harness MUST NOT invoke the CLI through a subprocess, shell script, or example-specific executable. Fixture filesystem setup, golden reads, JSON parsing, and byte/semantic assertions are permitted.
3. Fixture setup: copy the committed example into a temporary workspace, then remove `resources/Item.json`. The committed `resource-forge.json` marker is retained. Run `init .` and assert semantic RFC-040 conformance after `init`.
4. Sequence: `init` → `generate resource demo Item …` → assert Resource **byte-identical** to committed golden → `validate` → `doctor`.
5. Marker: assert semantic RFC-040 conformance after `init` (not byte-identical).
6. Exits: happy-path `0` for the CLI steps above.
7. MUST NOT mutate the committed `examples/basic/` tree.
8. MUST NOT require testing destination-exists refusal in this harness.

```text
human workflow          CI workflow
    ↓                       ↓
README commands         Vitest harness
    ↓                       ↓
workspace-local rf      run([...])
    ↓                       ↓
examples/basic          temp clean fixture
    ↓                       ↓
committed goldens  ←→  same goldens
```

## 7. Relationships / dependencies

| Dependency | Relationship |
| --- | --- |
| RFC-036 | Relies upon — `run` / exit vocabulary / bin; not reopened |
| RFC-037 | Relies upon — `validate` semantics; not reopened |
| RFC-038 | Relies upon — `doctor` as package/CLI health; not reopened; explicitly not project-resource diagnosis |
| RFC-039 | Relies upon — `generate resource` + create-only; golden encoding authority; not reopened |
| RFC-040 | Relies upon — `init` + marker/layout; semantic marker check; not reopened |
| RFC-041 | **Out-of-scope coexistence** — `from-prisma` remains an Accepted CLI capability, but RFC-042 intentionally does not exercise, fixture, document (beyond optional existence mention), or extend it |

This RFC **extends** roadmap M5 by proposing M5.7. It does **not** constrain or reinterpret Accepted CLI command contracts beyond consuming them.

## 8. Rationale

1. **CLI-first example** closes the “CLI & examples” milestone gap without inventing host/application DX prematurely.
2. **Byte-identical Resource golden** keeps the recreate invariant literal and surfaces encoder drift intentionally.
3. **Semantic marker check** matches RFC-040 (formatting is not product contract).
4. **Harness in `@resource-forge/cli`** reuses existing `run` test infrastructure; avoids a second package/runner.
5. **Excluding `from-prisma`** preserves a single unambiguous walkthrough; M5.6 already has its own acceptance tests.
6. **Generate-output-only golden** avoids two notions of “the example” (generated vs authored) without inventing a “minimal valid Resource” characterization in this RFC.
7. **Documented create-only refusal without harness duplication** keeps M5.7 focused on discoverability/reproducibility.
8. **Retained marker + remove Resource destination** makes README and harness tell the same recreate story (conforming `init` no-op, then generate).

## 9. Acceptance criteria (for this specification)

This Draft may move to **Accepted** after M3 Design Review when:

1. Scope, goals, non-goals, terminology, and invariants are clear enough to plan M5.7 without inventing product semantics.
2. Tree, identity, comparison contracts, README procedure, and harness bounds are locked.
3. `validate` vs `doctor` role split is explicit.
4. `from-prisma`, host apps, richer Resources, and new CLI surfaces remain fenced.
5. Traceability to RFC-036–040 (consume) and RFC-041 (out-of-scope coexistence) is accurate.
6. No implementation plan or production code is required for Accept of this document.

## 10. Explicit deferrals / follow-ons

1. Host-application example (Nest and/or GraphQL) once adapter DX / project model are settled.
2. Richer authored Resource catalogs as examples.
3. `from-prisma` example fixtures / walkthrough.
4. Project/workspace doctor and project-aware sibling commands.
5. Other generate kinds.
6. Further Prisma DX convenience (e.g. `schema.prisma → DMMF`) examples.
7. Example workspace packaging or published example packages.

## 11. Worked example (informative)

Happy path after removing `resources/Item.json` (marker present and conforming):

```text
$ rf init .
# exit 0 (conforming no-op)

$ rf generate resource demo Item resources/Item.json
# exit 0; writes resources/Item.json

$ rf validate resources/Item.json
# exit 0

$ rf doctor
# exit 0; package/CLI health only
```

If `resources/Item.json` already exists:

```text
$ rf generate resource demo Item resources/Item.json
# exit 2; no overwrite
```

## 12. Document status

**Status: Accepted.** Authoritative for M5.7 product semantics (example identity, committed artifacts, README/harness reproducibility contracts). M4 implementation planning authorized for [#141](https://github.com/rexescario-dev/resource-forge/issues/141).
