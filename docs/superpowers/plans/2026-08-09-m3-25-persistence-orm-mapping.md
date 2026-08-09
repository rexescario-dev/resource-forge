# M3.25 Persistence / ORM Mapping — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. This slice is **docs/verification closeout** for Accepted RFC-028. Do **not** implement Prisma/SQL/ORM adapters, mapping descriptors, declaration widens, public checkers, ports, reverse/sync protocols, runtime traversal/query, Relation→metadata projection, wire/serialization, or constraint/index projection. Do **not** amend `validateResource`, `evaluateCascadeEvent`, or `checkRelationLoadStates`. Do **not** reopen RFC-024 / M3.21, RFC-025 / M3.22, RFC-026 / M3.23, or RFC-027 / M3.24. TDD for production code does **not** apply — verification is docs consistency + confirming the delivery diff has **no** `packages/core` product changes.

**Status:** Accepted  
**M5:** Accepted (2026-08-09) — Plan Review; no plan blockers after packaging/verification wording corrections: (1) delivery PR wording clarifies docs closeout + SCR under Accepted plan (RFC already Accepted; not re-delivered); (2) Task 2 primary check is `git diff --name-status <base>...HEAD -- packages/core` with expected result **no** `packages/core` changes; (3) Task 3 marks M3.25 ✅ only after docs verification + SCR are complete; (4) roadmap Later wording stays aligned with current roadmap topic names — invariant is persistence/ORM mapping is no longer a Later lead. Docs-only closeout confirmed; no core API manufactured. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#98](https://github.com/rexescario-dev/resource-forge/issues/98)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-028 Persistence / ORM Mapping (**Accepted**) — fills deferred persistence/ORM mapping gap as a semantic correspondence ledger; does not reopen RFC-024 / RFC-025 / RFC-026 / RFC-027  
**Depends on:** RFC-001 / RFC-005 / RFC-007–RFC-015 / RFC-024 / RFC-025 / RFC-026 / RFC-027 (**Accepted**); RFC-028 (**Accepted**); M3.1–M3.24 shipped  
**Package:** documentation under `docs/` (no `@resource-forge/core` product-surface change authorized by this plan)  
**Slice:** M3.25 only — RFC-028 docs closeout + no-core-surface verification

**Goal:** Close out Accepted RFC-028 as a reviewable M3 slice by confirming roadmap/spec indexing reflects the correspondence ledger, verifying that this delivery introduces **no** `packages/core` product changes, and recording the Slice Completion Report—without inventing persistence engines, adapters, or host-independent TypeScript check surfaces.

**Architecture:**

```text
RFC-028 (Accepted) — semantic correspondence ledger only
├── Resource-authoritative, one-way, total
├── Consumes RFC-024–027 as mapping inputs
└── No new core surface

M3.25 delivery (this plan)
├── Docs consistency (roadmap / specs index / plan SCR)
└── Verification: delivery diff has no packages/core changes

M4 Integrations (deferred; not this slice)
└── Prisma / other hosts realize correspondence
```

**Invariant:** RFC-028 defines what must correspond; hosts realize how. No implementation step in this slice may add core persistence APIs, widen Resource/Field/Relation floors, or reopen M3.21–M3.24.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-028 Accepted (#98)
       ↓
M3.25 plan Draft → M5 Plan Review → Accepted (#98)
       ↓
M6 docs/verification execution (complete task checkboxes during execution)
       ↓
M7–M10 as applicable (code review N/A if no product code; docs validation)
       ↓
one delivery PR for tracking #98 containing the docs closeout and
Slice Completion Report, with the Accepted implementation plan
recorded as the governing execution artifact
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M3.25 delivery slice: docs closeout + Slice Completion Report, with this Accepted plan as the governing execution artifact. The RFC-028 specification is already Accepted and is **not** re-delivered by this PR. Do **not** open a separate plan-only merge PR as a required gate. M6 treats Accepted RFC text as authoritative for semantics.

**Task checkboxes:** Completed during **M6 execution** only.

---

## Locked decisions (planning aids — not new product semantics)

| Decision | Lock |
| --- | --- |
| Product semantics owner | RFC-028 Accepted text only |
| Core declaration widen | **Forbidden** |
| Mapping descriptor / overlay | **Forbidden** |
| Public checker / persistence-view / adapter port | **Forbidden** |
| Amend `validateResource` / `evaluateCascadeEvent` / `checkRelationLoadStates` | **Forbidden** (unchanged and unwired) |
| Prisma / SQL / ORM / Nest / GraphQL realization | **Deferred** (M4 Integrations) |
| Reverse mapping / round-trip sync | **Forbidden** in this slice |
| Runtime traversal / query / Relation→metadata projection / wire | **Deferred** |
| Constraint→index / Operations / Annotations persistence | **Deferred** |
| TDD for `@resource-forge/core` product code | **N/A** — no product code in this slice |
| Core verification | Delivery diff MUST show **no** changes under `packages/core/**` |
| Verification substitute | Docs consistency + `git diff --name-status <base>...HEAD -- packages/core` empty |

---

## Goal / non-goals of this plan

### In scope

1. Docs closeout consistent with RFC-028 Accept (roadmap Later topics, specs index, M3 status wording).
2. Explicit diff-based verification that this slice does not change `packages/core`.
3. Slice Completion Report after M6–M10 as applicable; mark M3.25 ✅ only after verification + SCR are complete.

### Out of scope (plan non-goals)

1. Any `@resource-forge/core` implementation of mapping APIs or declaration changes.
2. Prisma adapter or any M4 Integration package work.
3. Redesign of RFC-028 or reopening RFC-024–027.
4. Opening a second mapping model “just so M6 has code.”

---

## Constraints (SHALL / SHALL NOT)

Derived only from Accepted RFC-028:

1. SHALL treat Resource declaration as authoritative for persistence correspondence (RFC-028 §7.1).
2. SHALL keep correspondence one-way and total for declared Fields/Relations (RFC-028 §7.2–§7.3).
3. SHALL NOT invent new declaration members, descriptors, ports, or public checkers (RFC-028 §1.2 / §7.9).
4. SHALL NOT change `validateResource`, `evaluateCascadeEvent`, or `checkRelationLoadStates` (RFC-028 §1.2 #4 / §7.9).
5. SHALL NOT prescribe SQL/ORM/Prisma mechanics or naming rules (RFC-028 §7.4 / §7.6 / §7.8).
6. SHALL NOT reopen RFC-024–027 / M3.21–M3.24 (RFC-028 §11 #10).
7. SHALL leave host realization to M4 Integrations (RFC-028 §1.1 #8 / §13).

---

## Ownership boundaries

| Area | Role |
| --- | --- |
| `docs/superpowers/specs/2026-08-09-rfc-028-persistence-orm-mapping-design.md` | Authoritative Accepted semantics — do not redesign |
| `docs/roadmap.md`, `docs/superpowers/specs/README.md` | Docs closeout ownership |
| This plan + SCR | Process closeout |
| `packages/core/**` | **Must remain untouched** in this delivery diff |
| Future `packages/*` Prisma/Nest adapters | Deferred M4 Integrations — not this PR |

---

## Contract inventory

| Surface | This slice |
| --- | --- |
| Resource / Field / Relation floors | No change |
| `validateResource` | No change |
| `evaluateCascadeEvent` | No change |
| `checkRelationLoadStates` | No change |
| New persistence TypeScript API | **None authorized** |
| Docs: RFC-028 Accepted indexing | Update/verify |
| Docs: roadmap Later | Confirm persistence/ORM mapping is **not** a Later lead (RFC-028 Accepted; M3.25 closes docs/verification). Keep Later topic wording aligned with current `docs/roadmap.md` |

---

## Slice sequence

```text
Slice A — Docs consistency verify/fix
Slice B — No-core-surface verification (diff-based)
Slice C — SCR + M7–M10 as applicable; then mark M3.25 ✅
```

No hard code prerequisites. Slice A and B may run in either order; C last. Do **not** mark M3.25 ✅ until Slice A + B + SCR are complete.

---

## TDD / verification strategy

**TDD:** N/A for product code (none authorized).

**Verification (M6):**

1. Primary: `git diff --name-status <base>...HEAD -- packages/core` is empty (no `packages/core` changes in the delivery).
2. Secondary: no persistence-mapping modules/exports introduced (should be vacuous if (1) holds).
3. Roadmap: RFC-028 Accepted; persistence/ORM mapping is no longer a Later lead; Later topic names match current roadmap wording.
4. Specs index lists RFC-028 Accepted.
5. Optional smoke: `@resource-forge/core` vitest/`tsc --noEmit` if desired (no new tests required).
6. SCR filled; M3.25 ✅ only after A+B+SCR complete.

---

## Task breakdown

### Task 1: Docs consistency (Slice A)

**Files:** `docs/roadmap.md`, `docs/superpowers/specs/README.md`, optionally parent M3 plan cross-links if present

- [ ] **Step 1:** Confirm RFC-028 row is **Accepted** in `docs/superpowers/specs/README.md` and M3 gate table in `docs/roadmap.md`
- [ ] **Step 2:** Confirm persistence/ORM mapping is **no longer a Later lead** because RFC-028 is Accepted; Later topic wording remains exactly as in current `docs/roadmap.md` (do not invent a new ordering)
- [ ] **Step 3:** Confirm M3 milestone/status prose mentions RFC-028 Accepted and does not claim persistence remains the Later lead
- [ ] **Step 4:** Fix any drift found (docs only; do not amend RFC-028 semantics)

### Task 2: No-core-surface verification (Slice B)

**Files:** `packages/core/**` (read-only verification)

- [ ] **Step 1:** Run `git diff --name-status <base>...HEAD -- packages/core` and confirm there are **no** changes under `packages/core/**`. Expected result for this slice: empty. If any files appear, they MUST be documentation/test-only and MUST NOT introduce persistence mapping semantics or exports — but the plan ownership target is simply **no `packages/core` changes**
- [ ] **Step 2:** Secondary defense: confirm no new persistence-mapping modules/exports under `packages/core` (vacuous if Step 1 is empty)
- [ ] **Step 3:** Confirm `validateResource`, `evaluateCascadeEvent`, and `checkRelationLoadStates` are not modified by this slice
- [ ] **Step 4:** Optional: run `@resource-forge/core` vitest/`tsc --noEmit` as smoke that the tree remains green without product changes

### Task 3: Slice Completion Report (Slice C)

**Files:** this plan (SCR section), `docs/roadmap.md` (M3.25 ✅ only after SCR)

- [ ] **Step 1:** After M6–M10 (as applicable), fill SCR Status **Slice complete**, PR URL, validation notes
- [ ] **Step 2:** **Only after** Slice A + Slice B verification and SCR are complete, mark M3.25 ✅ on roadmap
- [ ] **Step 3:** Leave Next Gate **None** for this slice; next product design work is a **new M2 tracking issue** for Later topics per current roadmap ordering (not additional RFC-028 work)

---

## Traceability

| Plan item | RFC-028 |
| --- | --- |
| Docs closeout / Accept indexing | §11, §13 |
| No new declaration / descriptor / port / checker | §1.2 #1–#4, §7.9 |
| Unchanged evaluation surfaces | §1.2 #4, §6.3 #4, §6.4 #4, §7.9 |
| Host realization deferred to M4 Integrations | §1.1 #8, §1.2 #5–#6, §12 |
| No reopen RFC-024–027 | §1.2 #12, §11 #10 |
| Total / one-way / Resource-authoritative (docs affirm only) | §7.1–§7.3 |
| Honor ≠ implement (docs affirm only) | §7.6 |

---

## Risks (operational)

| Risk | Mitigation |
| --- | --- |
| Pressure to invent a core API so M6 “has code” | Refuse; RFC-028 §8.4 / packaging note authorize docs-only closeout |
| Accidental Prisma/DMMF design creep in docs | Keep roadmap M4 Integrations as realization; do not amend RFC-028 |
| Drift leaving “persistence” as Later lead | Task 1 explicit check |
| Confusing M3.25 with M4 Prisma work | Slice boundary + deferred inventory |
| Marking M3.25 ✅ before SCR | Task 3 Step 2 ordering |

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.25 Persistence / ORM Mapping |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/98 |
| M4 | Plan **Accepted** |
| M5 | Review **Accepted** |
| M6 | — |
| M7 | — |
| M8 | — |
| M9 | — |
| Branch | — |
| PR | — |
| Status | **In progress** (M6 authorized) |

### M5 Plan Review

```text
Decision: Accepted
Subject (plan): docs/superpowers/plans/2026-08-09-m3-25-persistence-orm-mapping.md
Accepted specification: docs/superpowers/specs/2026-08-09-rfc-028-persistence-orm-mapping-design.md
Delivery goal: Docs/verification closeout for RFC-028 correspondence ledger without core persistence API surface

Review summary: No plan blockers after packaging/verification wording corrections. Docs-only closeout matches Accepted RFC-028 (no new core surface). Diff-based packages/core emptiness is primary verification. M3.25 ✅ gated on completed SCR. Traceability and deferrals adequate.

Findings: None (no plan blockers)
Traceability: adequate
Gate: Proceed to M6.
Authority: Plan governs sequencing/execution; specification governs product semantics.
```

### Next Gate

**M6 Implementation** — execute Tasks 1–3. Do not invent core APIs.
