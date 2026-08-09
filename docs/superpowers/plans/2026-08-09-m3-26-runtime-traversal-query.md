# M3.26 Runtime Traversal / Query Semantics — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. This slice is **docs/verification closeout** for Accepted RFC-029. Do **not** implement query AST/syntax, public `@resource-forge/core` navigation/query APIs, `TraversalResult` / `Query` / `Path` / `NavigationError` (or similar) types, ORM/SQL/Prisma execution, planning/batching/caching/transactions, auto-load-on-traverse, Relation→metadata projection, or wire/serialization. Do **not** amend `validateResource`, `evaluateCascadeEvent`, or `checkRelationLoadStates`. Do **not** reopen RFC-024 / M3.21, RFC-025 / M3.22, RFC-026 / M3.23, RFC-027 / M3.24, or RFC-028 / M3.25. **No production-code implementation is authorized, therefore no TDD task is generated for this slice.** Verification is docs consistency + confirming the delivery diff has **no** `packages/core` changes (empty diff is unconditional).

**Status:** Accepted  
**M5:** Accepted (2026-08-09) — Plan Review; no plan blockers after wording/consistency corrections: (1) any `packages/core` delivery-diff output is an unconditional slice-boundary failure (not “docs/test-only” exception); (2) `<base>` defined as the pre-M3.26 delivery base (normally `origin/main`) and recorded as SHA in SCR; (3) SCR field clarified as **M4 | Implementation Plan**; (4) Task 1 roadmap edits may only add the M3.26 closeout entry — no Later reorder; (5) host traversal/query realization is neither implemented nor verified by this slice. Docs-only closeout confirmed; no core API manufactured. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#100](https://github.com/rexescario-dev/resource-forge/issues/100)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-029 Runtime Traversal / Query Semantics (**Accepted**) — fills deferred runtime traversal/query gap as a semantic floor; does not reopen RFC-024 / RFC-025 / RFC-026 / RFC-027 / RFC-028  
**Depends on:** RFC-001 / RFC-005 / RFC-008 / RFC-010 / RFC-011 / RFC-013 / RFC-015 / RFC-024 / RFC-025 / RFC-026 / RFC-027 / RFC-028 (**Accepted**); RFC-029 (**Accepted**); M3.1–M3.25 shipped  
**Package:** documentation under `docs/` (no `@resource-forge/core` product-surface change authorized by this plan)  
**Slice:** M3.26 only — RFC-029 docs closeout + no-core-surface verification

**Goal:** Close out Accepted RFC-029 as a reviewable M3 slice by confirming roadmap/spec indexing reflects the semantic traversal/query floor, verifying that this delivery introduces **no** `packages/core` product changes, and recording the Slice Completion Report—without inventing navigation APIs, query languages, or host-independent TypeScript traversal surfaces.

**Architecture:**

```text
RFC-029 (Accepted) — semantic floor only (approach A)
├── Step / path / set-valued related set / query intent
├── not-loaded = unclassifiable (≠ empty related set)
├── Consumes RFC-024–028; cascade orthogonal
└── No new core surface

M3.26 delivery (this plan)
├── Docs consistency (roadmap / specs index / plan SCR)
└── Verification: delivery diff has no packages/core changes

Deferred (not this slice)
├── Relation→metadata projection (next Later / new M2)
├── Host navigation/query APIs
└── M4 Integrations execution strategies
```

**Invariant:** RFC-029 defines what traversal/query *means*; hosts express/execute/expose how. No implementation step in this slice may add core navigation/query APIs, widen Resource/Field/Relation floors, or reopen M3.21–M3.25.

**Scope boundary:** This slice verifies and documents the semantic floor only; it does **not** verify a host’s traversal/query realization (Prisma/Nest/GraphQL/SQL strategies are out of scope for M3.26 acceptance).

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-029 Accepted (#100)
       ↓
M3.26 plan Draft → M5 Plan Review → Accepted (#100)
       ↓
M6 docs/verification execution (complete task checkboxes during execution)
       ↓
M7–M10 as applicable (code review N/A if no product code; docs validation)
       ↓
one delivery PR for tracking #100 containing the docs closeout and
Slice Completion Report, with the Accepted implementation plan
recorded as the governing execution artifact
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M3.26 delivery slice: docs closeout + Slice Completion Report, with this Accepted plan as the governing execution artifact. The RFC-029 specification is already Accepted and is **not** re-delivered by this PR. Do **not** open a separate plan-only merge PR as a required gate. M6 treats Accepted RFC text as authoritative for semantics.

**Task checkboxes:** Completed during **M6 execution** only.

---

## Locked decisions (planning aids — not new product semantics)

| Decision | Lock |
| --- | --- |
| Product semantics owner | RFC-029 Accepted text only |
| Core declaration widen | **Forbidden** |
| Query AST / syntax / language | **Forbidden** |
| Public navigation/query API / `TraversalResult` / `Query` / `Path` / `NavigationError` | **Forbidden** |
| Amend `validateResource` / `evaluateCascadeEvent` / `checkRelationLoadStates` | **Forbidden** (unchanged and unwired) |
| Auto-load-on-traverse / subsequent-load API | **Forbidden** in this slice |
| ORM / SQL / Prisma / Nest / GraphQL execution | **Deferred** (not implemented or verified here) |
| Planning / batching / caching / transactions | **Deferred** |
| Relation→metadata projection / wire | **Deferred** |
| Independent host retrieval API semantics | **Deferred** (RFC-029 §6.3 boundary only; not implemented here) |
| Path mixed-branch host policy (fail/partial/hole) | **Deferred** (named gap) |
| Production-code / TDD | **N/A** — no production-code implementation authorized; no TDD task generated |
| Core verification | Delivery diff MUST be **empty** under `packages/core/**` (any output = failure) |
| Verification substitute | Docs consistency + empty `packages/core` delivery diff against recorded `<base>` |

---

## Goal / non-goals of this plan

### In scope

1. Docs closeout consistent with RFC-029 Accept (roadmap Later topics, specs index, M3 status wording, M3.26 ✅ after SCR).
2. Explicit diff-based verification that this slice does not change `packages/core` (empty diff only).
3. Slice Completion Report after M6–M10 as applicable; mark M3.26 ✅ only after verification + SCR are complete.

### Out of scope (plan non-goals)

1. Any `@resource-forge/core` implementation of traversal/query APIs or declaration changes.
2. Manufacturing a TypeScript surface so M6 “has code.”
3. Redesign of RFC-029 or reopening RFC-024–028.
4. Relation→metadata projection RFC or delivery.
5. Host query/navigation API design.
6. Verifying or accepting any host’s traversal/query realization strategy.

---

## Constraints (SHALL / SHALL NOT)

Derived only from Accepted RFC-029:

1. SHALL treat traversal/query as a semantic floor: meaning ≠ express / execute / expose (RFC-029 §3 / §7.1).
2. SHALL keep not-loaded as unclassifiable traversal state, never an empty related set (RFC-029 §4.2 / §5.1.1 / §7.4).
3. SHALL keep related sets mathematically set-valued when classifiable (RFC-029 §2 / §5.1 / §7.6).
4. SHALL NOT invent new declaration members, AST/syntax, or public navigation/query APIs (RFC-029 §1.2 #1–#2 / §7.13).
5. SHALL NOT change `validateResource`, `evaluateCascadeEvent`, or `checkRelationLoadStates` (RFC-029 §1.2 #11 / §7.13).
6. SHALL NOT prescribe ORM/SQL/Prisma mechanics, planning, batching, caching, or transactions (RFC-029 §1.2 #3–#4).
7. SHALL NOT reopen RFC-024–028 / M3.21–M3.25 (RFC-029 §1.2 #12 / §12 #14).
8. SHALL leave Relation→metadata projection and host APIs deferred (RFC-029 §1.2 #6 / §13).
9. SHALL NOT collapse instance Relation-state traversal with independent host retrieval (RFC-029 §6.3).

---

## Ownership boundaries

| Area | Role |
| --- | --- |
| `docs/superpowers/specs/2026-08-09-rfc-029-runtime-traversal-query-semantics-design.md` | Authoritative Accepted semantics — do not redesign |
| `docs/roadmap.md`, `docs/superpowers/specs/README.md` | Docs closeout ownership |
| This plan + SCR | Process closeout |
| `packages/core/**` | **Must remain untouched** in this delivery diff (empty diff only) |
| Future host navigation/query / M4 Integration packages | Deferred — not this PR; not verified here |

---

## Contract inventory

| Surface | This slice |
| --- | --- |
| Resource / Field / Relation floors | No change |
| `validateResource` | No change |
| `evaluateCascadeEvent` | No change |
| `checkRelationLoadStates` | No change |
| New traversal/query TypeScript API | **None authorized** |
| Docs: RFC-029 Accepted indexing | Update/verify |
| Docs: roadmap Later | Confirm runtime traversal/query is **not** a Later lead (RFC-029 Accepted; M3.26 closes docs/verification). Later remains Relation→metadata projection per current `docs/roadmap.md` |

---

## Slice sequence

```text
Slice A — Docs consistency verify/fix
Slice B — No-core-surface verification (diff-based)
Slice C — SCR + M7–M10 as applicable; then mark M3.26 ✅
```

No hard code prerequisites. Slice A and B may run in either order; C last. Do **not** mark M3.26 ✅ until Slice A + B + SCR are complete.

---

## TDD / verification strategy

**TDD:** No production-code implementation is authorized, therefore no TDD task is generated for this slice.

**Verification base (`<base>`):** The pre-M3.26 delivery base commit recorded when execution begins — normally `origin/main` (or the exact tracking base selected for the delivery PR). The executor MUST record the resolved base SHA in the SCR Validation section.

**Verification hierarchy (M6):**

1. **Primary:** `git diff --name-status <base>...HEAD -- packages/core` is **empty**. Any output is a slice-boundary failure and MUST be removed before M3.26 can be marked complete.
2. **Secondary (defense-in-depth):** named forbidden traversal/query symbols/modules were not introduced in the delivery diff (vacuous if primary is empty for `packages/core`; also scan delivery docs only for accidental API invention claims).
3. **Tertiary (optional):** `@resource-forge/core` vitest / `tsc --noEmit` remain green if cheap (smoke only; not a host-realization check).
4. Roadmap: RFC-029 Accepted; runtime traversal/query is no longer a Later lead; Later topic wording matches current roadmap (Relation→metadata projection).
5. Specs index lists RFC-029 Accepted.
6. SCR filled (including verification base SHA + empty core-diff evidence); M3.26 ✅ only after A+B+SCR complete.

This slice does **not** verify host traversal/query realization.

---

## Task breakdown

### Task 1: Docs consistency (Slice A)

**Files:** `docs/roadmap.md`, `docs/superpowers/specs/README.md`, optionally parent M3 plan cross-links if present

- [x] **Step 1:** Confirm RFC-029 row is **Accepted** in `docs/superpowers/specs/README.md` and M3 gate table in `docs/roadmap.md`
- [x] **Step 2:** Confirm runtime traversal/query is **no longer a Later lead** because RFC-029 is Accepted; Later topic wording remains exactly as in current `docs/roadmap.md` (Relation→metadata projection — do not invent a new ordering)
- [x] **Step 3:** Confirm M3 milestone/status prose mentions RFC-029 Accepted / M3.26 closeout intent and does not claim traversal remains the Later lead
- [x] **Step 4:** Confirm M3.26 bullet exists (or add it) as the RFC-029 docs/verification closeout slice. Add **only** the M3.26 closeout entry required to reflect the already-Accepted RFC-029 and current roadmap ordering; do **not** introduce a new Later topic or reorder existing Later work. Mark ✅ only in Task 3 after SCR
- [x] **Step 5:** Fix any drift found (docs only; do not amend RFC-029 semantics)

### Task 2: No-core-surface verification (Slice B)

**Files:** `packages/core/**` (read-only verification — must remain untouched)

- [x] **Step 1 (primary):** Resolve and record `<base>` (normally `origin/main` → SHA). Run `git diff --name-status <base>...HEAD -- packages/core` and confirm the result is **empty**. **Any output is a slice-boundary failure and must be removed before M3.26 can be marked complete.**
- [x] **Step 2 (secondary):** Defense-in-depth — confirm no new traversal/query modules/exports under `packages/core` (vacuous if Step 1 is empty)
- [x] **Step 3 (secondary):** Confirm `validateResource`, `evaluateCascadeEvent`, and `checkRelationLoadStates` are not modified by this slice (vacuous if Step 1 is empty)
- [x] **Step 4 (tertiary, optional):** Run `@resource-forge/core` vitest/`tsc --noEmit` as smoke that the tree remains green without product changes — not a host-realization check

### Task 3: Slice Completion Report (Slice C)

**Files:** this plan (SCR section), `docs/roadmap.md` (M3.26 ✅ only after SCR)

- [x] **Step 1:** After M6–M10 (as applicable), fill SCR Status **Slice complete**, PR URL, validation notes including:
  - `Verification base: <commit SHA>`
  - `Command: git diff --name-status <base>...HEAD -- packages/core`
  - `Result: empty`
- [x] **Step 2:** **Only after** Slice A + Slice B verification and SCR are complete, mark M3.26 ✅ on roadmap
- [x] **Step 3:** Leave Next Gate **None** for this slice; next product design work is a **new M2 tracking issue** for Later topics per current roadmap ordering (Relation→metadata projection — not additional RFC-029 work)

---

## Traceability

| Plan item | RFC-029 |
| --- | --- |
| Docs closeout / Accept indexing | §12, §14 |
| No AST / navigation API / declaration widen | §1.2 #1–#2 / #10, §7.13 |
| Unchanged evaluation surfaces | §1.2 #11, §7.13 |
| not-loaded = unclassifiable (docs affirm only) | §4.2, §5.1.1, §7.3–§7.4 |
| Set-valued related sets (docs affirm only) | §2, §5.1, §7.6 |
| Independent retrieval ≠ Relation-state traversal (docs affirm only) | §6.3 |
| Host/API/ORM deferred (not verified here) | §1.2 #2–#7, §10, §13 |
| No reopen RFC-024–028 | §1.2 #12, §12 #14 |
| Meaning ≠ express/execute/expose (docs affirm only) | §3, §7.1 |

---

## Risks (operational)

| Risk | Mitigation |
| --- | --- |
| Pressure to invent a core navigation API so M6 “has code” | Refuse; no production code authorized; RFC-029 §8.1 / packaging note authorize docs-only closeout |
| Collapsing not-loaded into empty in docs prose | Keep Task 1/SCR language aligned with RFC-029 §5.1.1 |
| Accidental Relation→metadata projection creep | Later remains projection; new M2 after this slice |
| Confusing M3.26 with host query API / realization checks | Scope boundary + deferred inventory + “not verified here” |
| Ambiguous `<base>` making core-diff unreproducible | Record base SHA in SCR Validation |
| Marking M3.26 ✅ before SCR | Task 3 Step 2 ordering |
| Reopening load/cascade/persistence floors | Locked decisions + empty `packages/core` diff |

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.26 Runtime Traversal / Query Semantics |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/100 |
| M4 | Implementation Plan: **Accepted** |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | **Approved** |
| M8 | **N/A** |
| M9 | **Complete** |
| Branch | `feat/m3-26-runtime-traversal-query` |
| PR | https://github.com/rexescario-dev/resource-forge/pull/101 |
| Status | **Slice complete** |

### M5 Plan Review

```text
Decision: Accepted
Subject (plan): docs/superpowers/plans/2026-08-09-m3-26-runtime-traversal-query.md
Accepted specification: docs/superpowers/specs/2026-08-09-rfc-029-runtime-traversal-query-semantics-design.md
Delivery goal: Docs/verification closeout for RFC-029 semantic traversal/query floor without core navigation/query API surface

Review summary: No plan blockers after packaging/verification wording corrections. Docs-only closeout matches Accepted RFC-029 (no new core surface). Empty packages/core delivery diff is unconditional primary verification with recorded <base> SHA. Host realization neither implemented nor verified. M3.26 ✅ gated on completed SCR. Traceability and deferrals adequate.

Findings: None (no plan blockers)
Traceability: adequate
Gate: Proceed to M6.
Authority: Plan governs sequencing/execution; specification governs product semantics.
```

### Shipped

- Accepted M3.26 plan as governing execution artifact for RFC-029 docs/verification closeout
- Roadmap / specs index confirm RFC-029 Accepted; runtime traversal/query no longer a Later lead
- Delivery diff has **no** `packages/core` changes
- `validateResource` / `evaluateCascadeEvent` / `checkRelationLoadStates` untouched

### Validation

| Check | Result |
| --- | --- |
| Verification base | `17b201978890d542254907913bbd603d60caf957` (`origin/main` at execution start) |
| Command | `git diff --name-status 17b2019...HEAD -- packages/core` |
| `packages/core` delivery diff | **Empty** |
| Docs consistency | **Passed** (RFC-029 Accepted; Later = Relation→metadata projection) |
| Tests | Optional smoke: vitest 355 passed + `tsc --noEmit` clean |
| Lint | Skipped |
| Build | Skipped |
| Host realization | **Not verified** (out of scope) |

### M7 Code Review

```text
Decision: Approved for merge
Subject: feat/m3-26-runtime-traversal-query (#100) / https://github.com/rexescario-dev/resource-forge/pull/101
Accepted plan: docs/superpowers/plans/2026-08-09-m3-26-runtime-traversal-query.md
Accepted specification: docs/superpowers/specs/2026-08-09-rfc-029-runtime-traversal-query-semantics-design.md

Review summary: Docs/verification-only delivery matches Accepted plan Tasks 1–3. No packages/core product changes; no navigation/query API manufactured; RFC-024–028 closed. Roadmap Later remains Relation→metadata projection.

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
Scope: docs/roadmap.md; docs/superpowers/specs/README.md; RFC-029 Status Accepted; plan SCR; M3.26 ✅
Summary: Runtime traversal/query closed as docs/verification slice; Later remains Relation→metadata projection.
```

### M10 Workflow Validation

```text
Decision: Accepted
Subject: installed docs/workflows assets (no prompt edits this slice)
Summary: M2–M10 prompts remain coherent for docs-only closeout; no workflow asset changes required for M3.26.
```

### Next Gate

**None — slice complete**
