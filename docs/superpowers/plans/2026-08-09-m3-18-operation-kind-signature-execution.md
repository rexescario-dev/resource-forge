# M3.18 Operation Kind / Signature / Execution — Implementation Tasks

> **For agentic workers:** Status is **Accepted**. REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Follow TDD; do not invent semantics beyond RFC-021. Reuse M3.9 Operations packaging (`checkOperations` / `snapshotOperations` / Resource validation — **no second public declaration-validation entry point**; still no public `validateOperations`). Do **not** implement dispatcher, middleware, handler registry APIs, CRUD engines, persistence, transactions, HTTP/RPC mapping, authz, retries, or business-error taxonomies. Do **not** reopen Field/Relation floors or RFC-020. Do **not** accept RFC-012 name-only Operations (no dual-shape). `"void"` means **no semantic result payload** — do not standardize a portable wire/`undefined` token; establish void success via `SemanticResultReport` only (concrete `core` realization of RFC-021’s semantic-result boundary — not a wire/host protocol). The TypeScript handler return type is a compile-time contract; `invokeOperation` MUST still defensively validate the runtime return value because JavaScript runtime values are not guaranteed to satisfy the declared TypeScript type.

**Status:** Accepted  
**M5:** Accepted (2026-08-09) — Plan Review after return revision; no plan blockers. Declaration validity locked as invoke **precondition** (MUST NOT call `validateResource`). `SemanticResultReport` locked as concrete `core` realization of RFC-021 semantic outcome (not wire/host protocol). Provider and handler throws propagate unchanged. Malformed runtime reports → `result_contract_mismatch` (TS return type is compile-time only; defensive runtime check required). `duplicate_argument` removed for `ReadonlyMap` API. Optional/nullable × Map matrix exhaustive. Scalar validation type-only (no `Object.is`). Single `checkOperations` declaration path retained. M6 authorized; task checkboxes remain open until execution.  
**Tracking:** [#78](https://github.com/rexescario-dev/resource-forge/issues/78)  
**Parent plan:** `docs/superpowers/plans/2026-08-07-m3-implementation-plan.md` (Accepted)  
**Source RFC:** RFC-021 Operation Kind, Signature, and Execution (**Accepted**) — amends RFC-012 Operation member  
**Depends on:** RFC-009 (**Accepted**, `FieldType` / scalar value semantics); RFC-012 (**Accepted**, packaging retained; member amended); RFC-013 / RFC-014 (**Accepted**, `optional` / `nullable` *concepts* on params only); RFC-021 (**Accepted**); M3.1–M3.17 / M3.9 Operations shipped  
**Related RFC issue:** [#77](https://github.com/rexescario-dev/resource-forge/issues/77) (RFC-021 Accept docs; not this delivery slice’s sole packaging identity)  
**Package:** `@resource-forge/core`  
**Slice:** M3.18 only — closed `command`|`query`; ordered scalar `params`; `result` scalar|`void`; K2 declaration rules; E1 `invokeOperation` with Resource-scoped handler provider + semantic result report

**Goal:** Implement RFC-021 so declaration-valid Resources carry flat Operations with kind/signature, and a thin invoke surface validates arguments, resolves a host handler for `Resource` + `OperationName`, invokes it, and checks the **semantic result report** against `result` — without building an execution framework.

**Architecture:**

```text
raw candidate schema.operations
          │
          ▼
 checkOperations(candidates)          ← widen for kind/params/result
          │  closed { name, kind, params, result }
          │  query ⇒ result ≠ void
          │  params: ordered unique-named scalars + optional/nullable
          │  (sole declaration path; reused by validateResource / fixtures)
          ▼
 snapshotOperations → valid Resource snapshot
          │
          │  RFC-021 “declaration validity” = precondition (by construction)
          │  invoke MUST NOT re-run validateResource
          ▼
 invokeOperation(resource, operationName, args, handlerProvider)
          │
          Operation lookup (Resource + name)
          │
          argument validation (by OperationParamName)
          │
          handler resolution | undefined → missing_operation_handler
          │   provider throw → propagate (not OperationInvocationError)
          │
          invoke handler(args) → runtime return
          │   handler throw → propagate (not OperationInvocationError)
          │
          interpret return as SemanticResultReport (malformed → result_contract_mismatch)
          │
          validate report vs declared result
               void  → report.outcome === 'void'
               scalar → report.outcome === 'value' + type match
```

**Invariant:** No implementation step may accept name-only Operations, coerce argument/result scalars, invoke a handler before argument validation and handler resolution succeed, treat host completion tokens as portable semantic results, place missing-handler under result-contract failure, re-run `validateResource` inside invoke, or invent dispatcher/middleware/registry product APIs.

Where this plan and an Accepted specification disagree, the specification wins and this plan must be revised.

---

## Lifecycle / packaging (process — not product semantics)

```text
RFC-021 Accepted (#77)
       ↓
M3.18 plan Accepted (this document) (#78)
       ↓
M6 implementation (complete task checkboxes during execution)
       ↓
M7–M9 / validation as required
       ↓
one delivery PR for tracking #78 (Accepted plan + implementation together)
```

**Delivery packaging constraint:** Prefer **one pull request per tracking issue** for the M3.18 delivery slice (Accepted plan + implementation). Do **not** open a separate plan-only merge PR as a required gate. RFC-021 Accept documentation for [#77](https://github.com/rexescario-dev/resource-forge/issues/77) MAY land in a separate docs PR; M6 treats Accepted RFC text as authoritative.

**Task checkboxes:** Completed during **M6 execution** only.

---

## Locked decisions (export / shape review — planning aids)

| Decision | Lock |
| --- | --- |
| `OperationKind` | Closed exclusive `"command" \| "query"` |
| Closed Operation keys | Exactly `{ name, kind, params, result }` — extra keys invalid |
| No dual-shape | RFC-012 `{ name }` alone is **invalid** |
| `OperationParam` keys | Exactly `{ name, type, optional, nullable }` |
| `OperationParamName` | Same grammar as `OperationName` (`^[a-z][a-zA-Z0-9]*$`); dedicated domain; unique within that Operation’s `params` |
| Param `type` | `"string" \| "number" \| "boolean"` only (`FieldType` vocabulary); `"void"` forbidden on params |
| `optional` / `nullable` | Exact booleans; omit invalid; no defaults |
| `result` | `"string" \| "number" \| "boolean" \| "void"` |
| K2 | `query` ⇒ `result !== "void"`; `command` may be `"void"` |
| Empty `params` / empty `operations` | Valid |
| Declaration API | Extend internal `checkOperations` / `snapshotOperations` / `operationsEqual` only; still no public `validateOperations`; reuse the existing M3.9 validation/export architecture (single declaration path behind Resource validation / fixtures) |
| Argument map | `ReadonlyMap<string, OperationRuntimeValue>` keyed by `OperationParamName`; binding **by name**, not position. Absence = missing key; null = present null value. |
| `OperationRuntimeValue` | `string \| number \| boolean \| null` (parallel to `FieldRuntimeValue`) |
| Invoke API name | Export `invokeOperation` from `@resource-forge/core` (RFC informative name made concrete) |
| Invoke inputs | `(resource, operationName, args, handlerProvider)` |
| Declaration validity vs invoke | RFC-021 E1 “declaration validity” is a **precondition**, not an invoke implementation step. `invokeOperation` operates only on a **valid immutable Resource snapshot**. It MUST NOT revalidate the entire Resource / MUST NOT call `validateResource`. Declaration validity is established by construction/validation before invocation; invoke may rely on the snapshot’s Operation invariants. Conceptual invoke flow: valid Resource snapshot → Operation lookup → argument validation → handler resolution → invoke → semantic result validation. |
| Handler provider | `(resource, operationName) => OperationHandler \| undefined` — **Resource-scoped**; not a global registry API |
| Provider throws | A handler-provider throw **propagates unchanged** and MUST NOT be converted into an `OperationInvocationError` (same philosophy as handler application failures). |
| `OperationHandler` | `(args: ReadonlyMap<string, OperationRuntimeValue>) => SemanticResultReport` (typed). **The TypeScript handler return type is a compile-time contract; `invokeOperation` MUST still defensively validate the runtime return value because JavaScript runtime values are not guaranteed to satisfy the declared TypeScript type.** |
| Application / provider failures | Handler **throws** and provider **throws** → **propagate**; MUST NOT wrap as argument / missing-handler / result-contract codes |
| `SemanticResultReport` | Discriminated report: `{ readonly outcome: "void" }` **\|** `{ readonly outcome: "value"; readonly value: string \| number \| boolean }`. **This is the concrete `core` representation of RFC-021’s semantic result outcome.** It does **not** define a wire format, host protocol, or portable representation outside `core`. |
| Void success | Declared `"void"` + well-formed report `{ outcome: "void" }`. MUST NOT treat JS `undefined` / unit objects as portable product semantics beyond this report. |
| Scalar success | Declared scalar + well-formed report `{ outcome: "value", value }` with non-null value matching declared scalar type (**type validation only; no coercion**) |
| Malformed report | Any handler return that does **not** conform to the `SemanticResultReport` representation (including `undefined`, wrong `outcome`, `{ outcome: "value", value: null }`, non-objects, etc.) is **`result_contract_mismatch`**. No new error code. Compile-time typing does **not** remove this runtime check. |
| Invoke result | `Result<SemanticResultReport, OperationInvocationError>` reusing core `Result` / `ok` / `err` |
| `OperationInvocationError` | Discriminated by `code` — see mapping below. Missing handler is **host-contract**, not result-contract. **No `duplicate_argument`** for this slice (`ReadonlyMap` cannot represent duplicate keys). |
| Purity | MUST NOT mutate Resource, schema, operations, args map, or handler provider |
| Projection | Still no Operation contribution |
| Fixtures | Update `create-resource-with-operations.ts` candidates to RFC-021 shape; test-local helpers OK |
| Equality | Operation: name+kind+params(order)+result; Param: name+type+optional+nullable; collection uniqueness still by `OperationName` only |
| Scalar type checks | Reuse existing RFC-009 / constraint-runtime **type** checking spirit already used for field values (typeof / null checks). No numeric-equality prescription (`Object.is` / `===` equality semantics are **not** required here — this surface is type validation, not value equality). |

### Argument Map × optional/nullable matrix (normative for invoke tests)

| Parameter | Map state | Result |
| --- | --- | --- |
| `optional: false`, `nullable: false` | key absent | `missing_required_argument` |
| `optional: false`, `nullable: true` | key absent | `missing_required_argument` |
| `optional: true`, `nullable: false` | key absent | OK (skip value checks) |
| `optional: true`, `nullable: true` | key absent | OK (skip value checks) |
| any, `nullable: false` | key present + `null` | `null_argument` |
| any, `nullable: true` | key present + `null` | OK |
| any | key present + wrong scalar type | `argument_type_mismatch` |
| any | key present + correct scalar | OK |
| — | unknown key | `unknown_argument` |

### Declaration cause → code mapping (planning lock)

| RFC-021 category | `code` (planning) |
| --- | --- |
| Invalid operation name | `invalid_operation_name` (reuse; include index) |
| Duplicate operation name | `duplicate_operation_name` (reuse) |
| Invalid operation member | `invalid_operation_member` (wrong/extra/missing top-level keys; invalid `kind` / `result` literals) |
| Invalid parameter member | `invalid_operation_param` (`index`, `paramIndex`) |
| Duplicate parameter name | `duplicate_operation_param_name` (`index`, `paramIndex`, `name`) |
| Kind/result rule violation | `invalid_operation_result_for_kind` (`index`) — e.g. `query` + `"void"` |

Widen `OperationValidationError` accordingly. Keep distinct from Field/Relation/Constraint codes.

### Invocation cause → code mapping (planning lock)

| RFC-021 category | `code` |
| --- | --- |
| Unknown operation | `unknown_operation` |
| Unknown argument key | `unknown_argument` |
| Missing required param | `missing_required_argument` |
| Null when `nullable: false` | `null_argument` |
| Wrong scalar type (args) | `argument_type_mismatch` |
| Missing handler (`undefined` from provider) | `missing_operation_handler` (**host-contract / invalid invocation**) |
| Semantic result mismatch **or** malformed report | `result_contract_mismatch` |

**Not in this slice’s public union:** `duplicate_argument` — RFC-021’s “duplicate binding if representable” is not representable on `ReadonlyMap` inputs; do not expose an unreachable error code.

`OperationInvocationError` carries diagnostics as needed (`operationName`, `paramName`, etc.). **MUST NOT** include handler application / provider-throw / business failure codes.

---

## Constraints (SHALL / SHALL NOT)

### SHALL

1. Widen `Operation` / related types per RFC-021 §3.
2. Validate declaration rules (RFC-021 §3–§4) inside `checkOperations`; reject name-only members.
3. Snapshot `params` immutably (freeze sequence + each param object).
4. Extend `operationsEqual` for full value equality (order-sensitive `params`).
5. Implement `invokeOperation` with fixed order on a valid Resource snapshot: lookup → args → handler resolve → invoke → semantic result check (RFC-021 §5; declaration validity is precondition).
6. Keep missing handler distinguishable from result-contract failure.
7. Treat malformed handler returns as `result_contract_mismatch`.
8. Propagate provider throws and handler throws unchanged.
9. Keep Field/Relation/Constraint/projection behavior green (regression).
10. Export new public types / function from existing export surfaces.

### SHALL NOT

1. Accept RFC-012 name-only Operations after this floor.
2. Coerce argument or result scalars. Scalar argument and result validation MUST be **type validation only**.
3. Invoke handler before argument validation and handler resolution succeed.
4. Call `validateResource` (or otherwise revalidate the entire Resource) inside `invokeOperation`.
5. Implement dispatcher, middleware, registry API, CRUD engine, persistence, transactions, or HTTP/RPC mapping.
6. Reclassify handler throws or provider throws as argument / missing-handler / result-contract failures.
7. Standardize portable wire/`undefined` as the product meaning of `"void"` beyond `SemanticResultReport`.
8. Treat `SemanticResultReport` as a wire format or host protocol outside `core`.
9. Couple `OperationParamName` to `FieldName` resolve against `fields`.
10. Add Operation contribution to `projectResourceMetadata`.
11. Introduce `custom` / `action` kinds or nested IO schemas.
12. Fold invoke into `validateResource`.
13. Expose `duplicate_argument` on the `ReadonlyMap`-based invoke API.

---

## Package / ownership boundaries

| Area | Role |
| --- | --- |
| `packages/core/src/resource/types.ts` | Widen `Operation`; add kind/param/result/runtime/report/invocation error types |
| `packages/core/src/resource/operations.ts` | Declaration validation + snapshot + equality (sole declaration path) |
| `packages/core/src/resource/operations.test.ts` | Declaration TDD (includes explicit name-only rejection) |
| `packages/core/src/resource/invoke-operation.ts` | **Create** — `invokeOperation` |
| `packages/core/src/resource/invoke-operation.test.ts` | **Create** — invoke TDD (matrix + throws + malformed reports) |
| `packages/core/src/resource/create-resource-with-operations.ts` | Fixture candidates must use RFC-021 shape |
| `packages/core/src/resource/index.ts` / `packages/core/src/index.ts` | Export new public surface |
| `packages/core/src/resource/exports.test.ts` | Export smoke |
| `docs/roadmap.md` | M3.18 ✅ on final delivery commit only |
| Constraints / fields / relations modules | Untouched except unavoidable compile fixes from Operation widen |

Planning note: placing invoke in `invoke-operation.ts` (rather than growing `operations.ts`) is a **file-layout** decision, not a product boundary.

---

## Slice sequence

| Slice | Delivers | Prerequisite |
| --- | --- | --- |
| A | Types + declaration validation + snapshot/equality | None (RFC-021 Accepted) |
| B | Fixture + existing operations/validate regressions on new shape | Slice A |
| C | `invokeOperation` + handler provider + semantic result report | Slice A |
| D | Exports / roadmap / SCR closeout docs | A+B+C green |

---

## TDD / verification strategy

- **Declaration:** failing tests first for valid `command`/`query`; empty params; **explicit reject name-only** `{ name: "foo" }`; reject extra keys; reject `query`+`void`; accept `command`+`void`; reject invalid param booleans/types/`void` param type; duplicate param names; duplicate operation names; param order equality sensitivity; operations sequence order equality.
- **Invoke — args matrix:** exhaustive optional/nullable × Map presence table above (absent/present-null/wrong-type/ok/unknown key).
- **Invoke — E1 / reports:** unknown operation; missing handler (`undefined`) → `missing_operation_handler`; void success via `{ outcome: "void" }`; void + value report → `result_contract_mismatch`; scalar success/fail; **malformed reports** (`undefined`, bad `outcome`, `value: null`, non-object) → `result_contract_mismatch`; handler throw propagates; **provider throw propagates**; handler MUST NOT run when args invalid or provider returns `undefined`; purity.
- **Regression:** `operations` / `validate` / `exports` / dependent constraint tests that build Resources with operations — update fixtures to RFC-021 shape; suites green. Task 3 repo sweep ensures no accidental legacy name-only fixtures remain (in addition to Task 2 unit rejection).
- **Commands:** `pnpm exec vitest run` on touched test files; `pnpm exec tsc --noEmit` in `@resource-forge/core`.
- **Lint/build:** skipped unless already required by repo norms for the slice.

---

## Task breakdown

### Task 1 — Types (Slice A)

**Files:** `packages/core/src/resource/types.ts`

- [x] **Step 1:** Add `OperationKind`, `OperationParamName`, `OperationParam`, widen `Operation` to `{ name, kind, params, result }`
- [x] **Step 2:** Add `OperationRuntimeValue`, `SemanticResultReport`, `OperationHandler`, `OperationHandlerProvider` (document report as concrete `core` realization of RFC-021 semantic outcome — not wire/host protocol)
- [x] **Step 3:** Widen `OperationValidationError` with param / kind-result codes (planning map)
- [x] **Step 4:** Add `OperationInvocationError` union with invoke codes (**no** `duplicate_argument`)

**Trace:** RFC-021 §2–§3, §4.1, §5.5

### Task 2 — Declaration validation (Slice A)

**Files:** `packages/core/src/resource/operations.ts`, `operations.test.ts`

- [x] **Step 1 (TDD):** Valid command/query examples; **reject name-only**; reject `query`+void; accept command+void; param rules; duplicates; equality order sensitivity
- [x] **Step 2:** Rewrite `checkOperations` closed-key validation for four top-level properties; validate params sequence; K2 rule (sole declaration path)
- [x] **Step 3:** Snapshot freeze operations + params arrays/objects
- [x] **Step 4:** Extend `operationsEqual` for full value equality
- [x] **Step 5:** Confirm invalid/duplicate name paths still behave

**Trace:** RFC-021 §3–§4, §3.5

### Task 3 — Fixtures + Resource gate regression (Slice B)

**Files:** `create-resource-with-operations.ts`, callers in `*.test.ts` that pass `{ name }` only, `validate` tests if any

- [x] **Step 1:** Update test fixture candidates to full RFC-021 Operation objects
- [x] **Step 2:** Grep/fix any `{ name: '…' }` operation-only fixtures repo-wide under `packages/core` (migration guard; complements Task 2 unit rejection)
- [x] **Step 3:** Run operations + validate + dependent suites; fix compile/type breaks only

**Trace:** RFC-021 §3.1 (no dual-shape); packaging continuity

### Task 4 — Invoke surface (Slice C)

**Files:** Create `packages/core/src/resource/invoke-operation.ts`, `invoke-operation.test.ts`

- [x] **Step 1 (TDD):** E1 on valid Resource snapshot (no `validateResource` inside); exhaustive optional/nullable Map matrix; missing handler; void/scalar reports; malformed reports → `result_contract_mismatch`; handler throw propagates; provider throw propagates; no invoke-before-validation; purity
- [x] **Step 2:** Implement `invokeOperation(resource, operationName, args, handlerProvider)` — MUST NOT call `validateResource`
- [x] **Step 3:** Argument validation per RFC-021 §5.2 + Map matrix (named keys; type checks only; no coercion)
- [x] **Step 4:** Handler resolve; `undefined` → `missing_operation_handler`; provider throw propagates; on success call handler; interpret return as `SemanticResultReport` (malformed → `result_contract_mismatch`); validate vs declared `result`
- [x] **Step 5:** Do not catch-and-reclassify handler or provider throws

**Trace:** RFC-021 §5 (declaration validity as precondition)

### Task 5 — Exports + docs closeout (Slice D)

**Files:** `resource/index.ts`, `packages/core/src/index.ts`, `exports.test.ts`, `docs/roadmap.md`, this plan’s SCR

- [x] **Step 1:** Export `invokeOperation` and related public types (including `SemanticResultReport` as `core` report type)
- [x] **Step 2:** Export smoke for kinds, void report, invocation error codes
- [x] **Step 3:** After M6+ gates, mark M3.18 ✅ on roadmap; fill SCR

**Trace:** RFC-021 §11; roadmap discoverability

---

## Traceability matrix

| RFC-021 section | Tasks |
| --- | --- |
| §3 Closed Operation member | Task 1–2 |
| §3.2 Kind / K2 | Task 2 |
| §3.3 Params / binding note | Task 2, 4 |
| §3.4–§3.5 Result / equality | Task 1–2 |
| §4 Declaration validation | Task 2–3 |
| §5.1 Invoke order (precondition interpretation) | Task 4 |
| §5.2 Arguments | Task 4 |
| §5.3 Result / void report | Task 1, 4 |
| §5.4–§5.5 Handler / categories | Task 4 |
| §6 Projection | Task 3 regression |
| §7 Examples | Tasks 2, 4 tests |
| §10 Invariants | All tasks |

---

## Execution risks (operational — not redesign)

| Risk | Mitigation |
| --- | --- |
| Treating JS `undefined` as product void | TDD requires `{ outcome: "void" }` report; malformed/`undefined` → `result_contract_mismatch` |
| Dual-shape leftover fixtures | Task 2 unit rejection + Task 3 repo grep |
| Invoking handler on bad args / missing handler | Tests assert handler not called |
| Swallowing business / provider errors | Explicit throw-propagation tests for handler **and** provider; no catch wrapper |
| Accidental `validateResource` inside invoke | Plan lock + Task 4 Step 2; test that invalid snapshots are out of contract (caller duty) |
| Growing `operations.ts` past clarity | Keep invoke in `invoke-operation.ts` |
| Unreachable `duplicate_argument` | Removed from public union for `ReadonlyMap` API |
| RFC-021 Accept docs not yet on `main` | Land [#77](https://github.com/rexescario-dev/resource-forge/issues/77) docs before or with delivery; M6 treats Accepted RFC text as authoritative |

---

## M5 return ledger (addressed)

| # | Required change | Resolution in this revision |
| --- | --- | --- |
| 1 | Reconcile declaration validity vs no `validateResource` | Locked: E1 declaration validity = **precondition**; invoke on valid snapshot only; MUST NOT re-run `validateResource` |
| 2 | Tighten `SemanticResultReport` boundary | Locked: concrete `core` realization of RFC-021 semantic outcome; not wire/host protocol |
| 3 | Handler-provider throws | Locked: propagate unchanged; TDD required |
| 4 | Malformed runtime reports | Locked: `result_contract_mismatch`; TDD required |
| 5 | Remove `Object.is` prescription | Removed; type validation only; reuse existing type-check spirit |
| 6 | Remove unreachable `duplicate_argument` | Removed from public invoke error union for this slice |
| 7 | Explicit optional/nullable × Map matrix | Added normative table + exhaustive invoke TDD |

---

## Slice Completion Report

| Field | Result |
| --- | --- |
| Slice | M3.18 Operation Kind / Signature / Execution |
| Tracking | https://github.com/rexescario-dev/resource-forge/issues/78 |
| M4 | Plan **Accepted** |
| M5 | Review **Accepted** |
| M6 | **Complete** |
| M7 | **Approved** |
| M8 | **N/A** |
| M9 | **Complete** |
| Branch | `feat/m3-18-operation-kind-signature-execution` |
| PR | https://github.com/rexescario-dev/resource-forge/pull/79 |
| Status | **Slice complete** |

### Shipped

- Widened closed Operation to `{ name, kind, params, result }` (`command`\|`query`; no dual-shape)
- Declaration validation + snapshot/equality for params and K2 (`query` ≠ void)
- `invokeOperation` with Resource-scoped handler provider + `SemanticResultReport`
- Missing handler / result mismatch / malformed reports; provider & handler throws propagate
- Public exports + roadmap M3.1–M3.18 ✅; RFC-021 Accept docs

### Validation

| Check | Result |
| --- | --- |
| Tests | **Passed** (operations 10; invoke-operation 11; exports 11; project 22; constraints 26; relations 28; validate 6; constraint-values 21; population-uniqueness 9) via `vitest run --pool=threads --maxWorkers=1 --minWorkers=1` |
| Typecheck | **Passed** (`tsc --noEmit` in `@resource-forge/core`) |
| Lint | Skipped |
| Build | Skipped |
| Package validation | Skipped |

### Next Gate

**None — slice complete**

### M5 Plan Review

```text
Decision: Accepted
Subject (plan): docs/superpowers/plans/2026-08-09-m3-18-operation-kind-signature-execution.md
Accepted specification: docs/superpowers/specs/2026-08-09-rfc-021-operation-kind-signature-execution-design.md
Delivery goal: Implement closed command|query Operation + scalar params + thin invokeOperation with SemanticResultReport; declaration validity as precondition; no validateResource rerun; provider/handler throws propagate; malformed reports → result_contract_mismatch

Review summary: Return ledger items resolved. Editorial lock: TS handler return type is compile-time only; invoke MUST defensively validate runtime returns. No further task/API/error-code/architecture changes. M6 authorized.

Findings: None (no plan blockers)
Authority: Plan governs sequencing/execution; specification governs product semantics.
Gate: Proceed to M6.
```

### M7 Code Review

```text
Decision: Approved for merge
Subject: feat/m3-18-operation-kind-signature-execution (#78)
Accepted plan: docs/superpowers/plans/2026-08-09-m3-18-operation-kind-signature-execution.md
Accepted specification: docs/superpowers/specs/2026-08-09-rfc-021-operation-kind-signature-execution-design.md

Review summary: Implementation matches Accepted plan Tasks 1–5. Declaration path sole via checkOperations; invoke precondition (no validateResource); SemanticResultReport defensive runtime parse; throws propagate; optional/nullable matrix covered; no dual-shape; exports present. Verification green (vitest + tsc).

Findings: None (no merge blockers)
Gate: Proceed to M8/M9 as applicable.
```

### M8 Refactoring

```text
Decision: N/A
Reason: No worthwhile behavior-preserving refactor identified beyond TDD-local structure (invoke-operation.ts already isolated).
```

### M9 Documentation

```text
Decision: Accepted
Scope: docs/roadmap.md; docs/superpowers/specs/README.md; RFC-021 Status Accepted; plan SCR
Summary: Roadmap lists RFC-021 Accepted and M3.18 ✅; specs index updated; SCR Slice complete.
```

### M10 Workflow Validation

```text
Decision: Accepted
Subject: installed docs/workflows assets (no prompt edits this slice)
Summary: M2–M10 prompts remain coherent for this delivery; no workflow asset changes required for M3.18 closeout.
```
