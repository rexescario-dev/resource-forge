# M3.27 Relation → Metadata Projection (Non-Contribution Closure) — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. This slice is **docs/verification closeout** for Accepted RFC-030. Do **not** implement a Relation projection source, reserved Relation metadata keys, Relation descriptor `JsonValue` shapes, opt-in markers/policies, Field→metadata emitters, Operation→metadata emitters, registry/consumer APIs, or wire/serialization. Do **not** amend `projectResourceMetadata` composition to add a `relations` source. Do **not** amend `validateResource`, `evaluateCascadeEvent`, or `checkRelationLoadStates`. Do **not** reopen RFC-023 / M3.20, RFC-024–RFC-029 / M3.21–M3.26, or invent Relation→metadata emission under the guise of “finishing” this slice. **No production-code implementation is authorized, therefore no TDD task is generated for this slice.** Verification is docs consistency + confirming the delivery diff has **no** `packages/core` changes (empty diff is unconditional).

**Status:** Accepted  
**M5:** Accepted (2026-08-10) — Plan Review; no plan blockers after optional wording/consistency tightenings: (1) tracking identity stays `#102` (no “or successor” anticipation); (2) Task 2 secondary checks are defense-in-depth only and do **not** relax the unconditional empty `packages/core` delivery-diff requirement; (3) SCR M4 field transitions to Implementation Plan **Accepted** on M5 Accept; (4) RFC-030 empty/`relations` wording narrowed to metadata-projection consequence only (no general semantic equivalence claim). Docs-only closeout confirmed; no Relation emitter / core API manufactured. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#102](https://github.com/rexescario-dev/resource-forge/issues/102)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-030 Relation → Metadata Projection (Non-Contribution Closure) (**Accepted**) — closes deferred Relation→metadata Later gap by affirming non-contribution; does not authorize a Relation emitter; does not reopen RFC-023–RFC-029  
**Depends on:** RFC-002 / RFC-005 / RFC-006 / RFC-008 / RFC-023 (**Accepted**); RFC-030 (**Accepted**); M3.1–M3.26 shipped  
**Package:** documentation under `docs/` (no `@resource-forge/core` product-surface change authorized by this plan)  
**Slice:** M3.27 only — RFC-030 docs closeout + no-core-surface verification

**Goal:** Close out Accepted RFC-030 as a reviewable M3 slice by confirming roadmap/spec indexing reflects the Relation→metadata **non-contribution** lock, verifying that this delivery introduces **no** `packages/core` product changes, and recording the Slice Completion Report—without inventing Relation metadata emitters, reserved keys, descriptor shapes, or consumer APIs.

**Architecture:**

```text
RFC-030 (Accepted) — non-contribution closure only (Approach 1)
├── Relations are NOT a projectResourceMetadata source
├── Currently authorized concrete source = { annotations } (RFC-006)
├── RFC-023 = composition / no silent emitters (not source inventory)
└── Future emitter RFC required before Relation contribution

M3.27 delivery (this plan)
├── Docs consistency (roadmap / specs index / plan SCR)
└── Verification: delivery diff has no packages/core changes

Deferred (not this slice)
├── Relation-metadata emitter RFC (only if a real consumer needs it)
├── Field → metadata emitter RFC
└── Operation → metadata emitter RFC
```

**Invariant:** RFC-030 locks that Relations are not a concrete projection source; absence of Relation-derived entries follows from absence of a source (not filtering; not an empty contribution). No implementation step in this slice may add a Relation emitter, widen Resource/Field/Relation floors, change `projectResourceMetadata` composition inputs, or reopen M3.20–M3.26.

**Scope boundary:** This slice verifies and documents the non-contribution closure only; it does **not** design or implement a future Relation-metadata emitter, and it does **not** reorder/prioritize Field or Operation emitter work.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-030 Accepted (#102)
       ↓
M3.27 plan Draft → M5 Plan Review → Accepted (#102)
       ↓
M6 docs/verification execution (complete task checkboxes during execution)
       ↓
M7–M10 as applicable (code review N/A if no product code; docs validation)
       ↓
one delivery PR for tracking #102 containing the docs closeout and
Slice Completion Report, with the Accepted implementation plan
recorded as the governing execution artifact
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M3.27 delivery slice: docs closeout + Slice Completion Report, with this Accepted plan as the governing execution artifact. The RFC-030 specification is already Accepted and is **not** re-delivered by this PR. Do **not** open a separate plan-only merge PR as a required gate. M6 treats Accepted RFC text as authoritative for semantics.

**Task checkboxes:** Completed during **M6 execution** only.

---

## Locked decisions (planning aids — not new product semantics)

| Decision | Lock |
| --- | --- |
| Product semantics owner | RFC-030 Accepted text only |
| Relation projection source / emitter | **Forbidden** in this slice |
| Reserved Relation metadata keys / descriptor shapes | **Forbidden** |
| Opt-in markers / policies for Relation emission | **Forbidden** |
| Amend `projectResourceMetadata` to include a `relations` contribution | **Forbidden** |
| Amend `validateResource` / `evaluateCascadeEvent` / `checkRelationLoadStates` | **Forbidden** (unchanged) |
| Field → metadata / Operation → metadata emitters | **Deferred** (not authorized or reordered here) |
| Future Relation-metadata emitter RFC | **Deferred** (required before any Relation contribution) |
| Registry / consumer access APIs for Relation-via-metadata | **Forbidden** in this slice |
| Wire / serialization of Relation descriptors as metadata | **Deferred** |
| Production-code / TDD | **N/A** — no production-code implementation authorized; no TDD task generated |
| Core verification | Delivery diff MUST be **empty** under `packages/core/**` (any output = unconditional slice-boundary failure) |
| Verification substitute | Docs consistency + empty `packages/core` delivery diff against recorded `<base>` |

---

## Goal / non-goals of this plan

### In scope

1. Docs closeout consistent with RFC-030 Accept (roadmap/status wording, specs index, M3.27 ✅ after SCR).
2. Explicit diff-based verification that this slice does not change `packages/core` (empty diff only).
3. Slice Completion Report after M6–M10 as applicable; mark M3.27 ✅ only after verification + SCR are complete.

### Out of scope (plan non-goals)

1. Any `@resource-forge/core` Relation→metadata emitter or composition change.
2. Manufacturing reserved keys / descriptor shapes / opt-in markers so M6 “has code.”
3. Redesign of RFC-030 or reopening RFC-023–RFC-029 / M3.20–M3.26.
4. Authorizing or sequencing Field/Operation emitter RFCs.
5. Designing the future Relation-metadata emitter RFC contents beyond affirming RFC-030’s checklist remains deferred.

---

## Constraints (SHALL / SHALL NOT)

Derived only from Accepted RFC-030:

1. SHALL treat Relations as **not** a concrete `projectResourceMetadata` source (RFC-030 §3.1).
2. SHALL keep the currently authorized concrete source set as `{ annotations }` via RFC-006 authorization + RFC-023 composition; RFC-030 authorizes no additional source (RFC-030 §3.1 #1).
3. SHALL NOT invent relation-derived keys, envelopes, reserved namespaces, or descriptor bags (RFC-030 §3.1 #3 / §1.2 #2–#3).
4. SHALL distinguish non-contribution from projection filtering and from empty contribution by an existing source (RFC-030 §3.1 invariant / terminology).
5. SHALL preserve validation-before-projection behavior established by RFC-005 / Relation floors (RFC-030 §3.3) — not re-impose it as a new independent requirement.
6. SHALL NOT change `validateResource`, `projectResourceMetadata` composition inputs, `evaluateCascadeEvent`, or `checkRelationLoadStates` (RFC-030 §1.1 #8 / §1.2).
7. SHALL leave Relation structure authoritative on the Resource/Relation contract with no metadata representation invented here (RFC-030 §3.4).
8. SHALL keep RFC-029 traversal orthogonal and unreopened (RFC-030 §3.5).
9. SHALL NOT reorder, prioritize, or authorize Field/Operation emitter work (RFC-030 §3.6).
10. SHALL leave future Relation contribution to an explicit Accepted emitter RFC (RFC-030 §3.2 / §9).

---

## Ownership boundaries

| Area | Role |
| --- | --- |
| `docs/superpowers/specs/2026-08-10-rfc-030-relation-metadata-projection-design.md` | Authoritative Accepted semantics — do not redesign |
| `docs/roadmap.md`, `docs/superpowers/specs/README.md` | Docs closeout ownership |
| This plan + SCR | Process closeout |
| `packages/core/**` | **Must remain untouched** in this delivery diff (empty diff only) |
| Future Relation / Field / Operation emitter RFCs | Deferred — not this PR; not designed here |

---

## Contract inventory

| Surface | This slice |
| --- | --- |
| Resource / Field / Relation floors | No change |
| `projectResourceMetadata` composition inputs | No change (annotations only) |
| `validateResource` | No change |
| `evaluateCascadeEvent` | No change |
| `checkRelationLoadStates` | No change |
| New Relation→metadata TypeScript API / keys / shapes | **None authorized** |
| Docs: RFC-030 Accepted indexing | Update/verify |
| Docs: roadmap | Confirm Relation→metadata Later gap is closed by RFC-030 Accept + M3.27 closeout; do **not** invent a new Later ordering for Field/Operation emitters |

---

## Slice sequence

```text
Slice A — Docs consistency verify/fix
Slice B — No-core-surface verification (diff-based)
Slice C — SCR + M7–M10 as applicable; then mark M3.27 ✅
```

No hard code prerequisites. Slice A and B may run in either order; C last. Do **not** mark M3.27 ✅ until Slice A + B + SCR are complete.

---

## TDD / verification strategy

**TDD:** No production-code implementation is authorized, therefore no TDD task is generated for this slice.

**Verification base (`<base>`):** The pre-M3.27 delivery base commit recorded when execution begins — normally `origin/main` (or the exact tracking base selected for the delivery PR). The executor MUST record the resolved base SHA in the SCR Validation section.

**Verification hierarchy (M6):**

1. **Primary:** `git diff --name-status <base>...HEAD -- packages/core` is **empty**. Any output is a slice-boundary failure and MUST be removed before M3.27 can be marked complete.
2. **Secondary (defense-in-depth only; does not relax the empty-diff requirement):** no Relation-metadata emitter modules/exports/keys introduced in the delivery diff (vacuous if primary is empty for `packages/core`); confirm `projectResourceMetadata` was not amended to add a `relations` contribution (vacuous if primary empty). Any non-empty primary `packages/core` diff remains an unconditional slice-boundary failure regardless of secondary findings.
3. **Tertiary (optional):** `@resource-forge/core` vitest / `tsc --noEmit` remain green if cheap (smoke only; not an emitter check).
4. Roadmap: RFC-030 Accepted; Relation→metadata projection is no longer an open Later lead awaiting design; M3.27 closeout entry present; do **not** add Field/Operation emitter Later topics unless already present in current roadmap wording.
5. Specs index lists RFC-030 Accepted.
6. SCR filled (including verification base SHA + empty core-diff evidence); M3.27 ✅ only after A+B+SCR complete.

This slice does **not** design or verify a future Relation-metadata emitter.

---

## Task breakdown

### Task 1: Docs consistency (Slice A)

**Files:** `docs/roadmap.md`, `docs/superpowers/specs/README.md`, optionally parent M3 plan cross-links if present

- [x] **Step 1:** Confirm RFC-030 row is **Accepted** in `docs/superpowers/specs/README.md` and M3 gate table in `docs/roadmap.md`
- [x] **Step 2:** Confirm Relation→metadata projection is **no longer an open Later design lead** because RFC-030 is Accepted as non-contribution closure; do **not** invent Field/Operation emitter Later ordering
- [x] **Step 3:** Confirm M3 milestone/status prose mentions RFC-030 Accepted / M3.27 closeout intent and does not claim Relation→metadata projection remains an unresolved Later design topic
- [x] **Step 4:** Confirm M3.27 bullet exists (or add it) as the RFC-030 docs/verification closeout slice. Add **only** the M3.27 closeout entry required to reflect the already-Accepted RFC-030; do **not** introduce a new Later topic or reorder deferred Field/Operation emitter work. Mark ✅ only in Task 3 after SCR
- [x] **Step 5:** Fix any drift found (docs only; do not amend RFC-030 semantics)

### Task 2: No-core-surface verification (Slice B)

**Files:** `packages/core/**` (read-only verification — must remain untouched)

- [x] **Step 1 (primary):** Resolve and record `<base>` (normally `origin/main` → SHA). Run `git diff --name-status <base>...HEAD -- packages/core` and confirm the result is **empty**. **Any output is a slice-boundary failure and must be removed before M3.27 can be marked complete.**
- [x] **Step 2 (secondary):** Defense-in-depth only; does **not** relax the empty-diff requirement — confirm no Relation-metadata emitter modules/exports/keys under `packages/core` (vacuous if Step 1 is empty). Any Step 1 output remains an unconditional failure.
- [x] **Step 3 (secondary):** Defense-in-depth only; does **not** relax the empty-diff requirement — confirm `projectResourceMetadata`, `validateResource`, `evaluateCascadeEvent`, and `checkRelationLoadStates` are not modified by this slice (vacuous if Step 1 is empty)
- [x] **Step 4 (tertiary, optional):** Run `@resource-forge/core` vitest/`tsc --noEmit` as smoke that the tree remains green without product changes — not an emitter check

### Task 3: Slice Completion Report (Slice C)

**Files:** this plan (SCR section), `docs/roadmap.md` (M3.27 ✅ only after SCR)

- [x] **Step 1:** After M6–M10 (as applicable), fill SCR Status **Slice complete**, PR URL, validation notes including:
  - `Verification base: <commit SHA>`
  - `Command: git diff --name-status <base>...HEAD -- packages/core`
  - `Result: empty`
- [x] **Step 2:** **Only after** Slice A + Slice B verification and SCR are complete, mark M3.27 ✅ on roadmap
- [x] **Step 3:** Leave Next Gate **None** for this slice; do **not** open Field/Operation emitter work from this closeout unless a separate tracking issue / M2 is explicitly started

---

## Traceability

| Plan item | RFC-030 |
| --- | --- |
| Docs closeout / Accept indexing | §6, §7, §9 |
| Relations not a projection source | §3.1, thesis |
| `{ annotations }` via RFC-006 + RFC-023 composition | §3.1 #1 |
| Non-contribution ≠ filtering / ≠ empty source contribution | §3.1 invariant, §2 |
| No reserved keys / descriptor shapes / opt-in markers | §1.2 #2–#5, §8 |
| Validation-before-projection preserved | §3.3 |
| Unchanged evaluation / projection surfaces | §1.1 #8 |
| Future emitter checklist deferred | §3.2, §8, §9 |
| RFC-029 orthogonal | §3.5 |
| No Field/Operation roadmap policy | §3.6 |
| Docs-only / no core surface | §1.2 #13–#14, §9 |

---

## Risks (operational)

| Risk | Mitigation |
| --- | --- |
| Pressure to invent a Relation emitter so M6 “has code” | Refuse; no production code authorized; RFC-030 §9 / packaging note authorize docs-only closeout |
| Misreading non-contribution as empty contribution / filtering | Keep Task 1/SCR language aligned with RFC-030 §3.1 |
| Accidental Field/Operation Later reorder | Task 1 Steps 2/4 forbid inventing Later ordering |
| Ambiguous `<base>` making core-diff unreproducible | Record base SHA in SCR Validation |
| Marking M3.27 ✅ before SCR | Task 3 Step 2 ordering |
| Reopening RFC-023–RFC-029 | Locked decisions + empty `packages/core` diff |

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.27 Relation → Metadata Projection (Non-Contribution Closure) |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/102 |
| M4 | Implementation Plan: **Accepted** |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | **Approved** |
| M8 | **N/A** |
| M9 | **Complete** |
| Branch | `feat/m3-27-relation-metadata-projection` |
| PR | https://github.com/rexescario-dev/resource-forge/pull/103 |
| Status | **Slice complete** |

### M5 Plan Review

```text
Decision: Accepted
Subject (plan): docs/superpowers/plans/2026-08-10-m3-27-relation-metadata-projection.md
Accepted specification: docs/superpowers/specs/2026-08-10-rfc-030-relation-metadata-projection-design.md
Delivery goal: Docs/verification closeout for RFC-030 Relation→metadata non-contribution closure without Relation emitter / core composition change

Review summary: No plan blockers after optional wording/consistency tightenings. Docs-only closeout matches Accepted RFC-030 (no Relation projection source; annotations remain sole authorized concrete source via RFC-006 + RFC-023 composition). Empty packages/core delivery diff is unconditional primary verification with recorded <base> SHA; secondary checks do not relax that requirement. Field/Operation emitters neither authorized nor reordered. M3.27 ✅ gated on completed SCR. Traceability and deferrals adequate.

Findings: None (no plan blockers)
Traceability: adequate (coverage + deferrals checked)
Gate: Proceed to M6. No implementation activity before this Accept.
Authority: Plan governs sequencing/execution; specification governs product semantics.
```

### Shipped

- Accepted M3.27 plan as governing execution artifact for RFC-030 docs/verification closeout
- Roadmap / specs index confirm RFC-030 Accepted; Relation→metadata Later design gap closed as non-contribution
- Delivery diff has **no** `packages/core` changes
- `projectResourceMetadata` remains annotations-only; `validateResource` / `evaluateCascadeEvent` / `checkRelationLoadStates` untouched
- No Relation emitter, reserved keys, descriptor shapes, or Field/Operation Later reorder

### Validation

| Check | Result |
| --- | --- |
| Verification base | `5503d7018e87220de2cadab8916cc803a674d96a` (`origin/main` at execution start) |
| Command | `git diff --name-status 5503d70...HEAD -- packages/core` |
| `packages/core` delivery diff | **Empty** |
| Docs consistency | **Passed** (RFC-030 Accepted; M3.27 closeout; no invented Field/Operation Later ordering) |
| Tests | Optional smoke: vitest 355 passed + `tsc --noEmit` clean |
| Lint | Skipped |
| Build | Skipped |
| Relation emitter | **Not implemented** (out of scope) |

### M7 Code Review

```text
Decision: Approved for merge
Subject: feat/m3-27-relation-metadata-projection (#102) / https://github.com/rexescario-dev/resource-forge/pull/103
Accepted plan: docs/superpowers/plans/2026-08-10-m3-27-relation-metadata-projection.md
Accepted specification: docs/superpowers/specs/2026-08-10-rfc-030-relation-metadata-projection-design.md

Review summary: Docs/verification-only delivery matches Accepted plan Tasks 1–3. No packages/core product changes; no Relation emitter manufactured; RFC-023–RFC-029 closed. Relation→metadata Later design gap closed as non-contribution; Field/Operation emitters not reordered.

Findings: None (no merge blockers)
Gate: Proceed to M8/M9 as applicable.
```

### M8 Refactoring

```text
Decision: N/A
Reason: No product code in this slice; no behavior-preserving refactor applicable.
```

### M9 Documentation

```text
Decision: Accepted
Scope: docs/roadmap.md; docs/superpowers/specs/README.md; RFC-030 Status Accepted; plan SCR; M3.27 ✅
Summary: Relation→metadata projection closed as docs/verification non-contribution slice; no new Later emitter ordering invented.
```

### M10 Workflow Validation

```text
Decision: Accepted
Subject: installed docs/workflows assets (no prompt edits this slice)
Summary: M2–M10 prompts remain coherent for docs-only closeout; no workflow asset changes required for M3.27.
```

### Next Gate

**None — slice complete**
