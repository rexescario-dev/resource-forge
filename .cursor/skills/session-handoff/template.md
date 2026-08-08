# Session handoff artifact structure

Fill this structure with evidence-backed content. Placeholders in `[brackets]` must be replaced. Do not leave instructional prose from this file in the final artifact except where a section truly does not apply (then state why briefly).

---

# Session Handoff — [short objective title]

> Generated: [ISO date] · Repo: [repo name/path] · Branch: `[branch]` · HEAD: `[short sha]` `[subject]`

## Executive Summary

Write 2–4 sentences covering: the objective, current status, and the **exact next intended action** (must match Recommended Next Steps #1).

## Completed Tasks

List only work confirmed by repository evidence (commits, files, issues, observed command results).

- [x] **[Task]** — [evidence: commit, file, issue, or observed result]

## Remaining Tasks

List unfinished work and why it remains.

- [ ] **[Task]** — [why it remains; blocking dependency if any]

## Current Work State

| Item | Value |
| --- | --- |
| Branch | `[branch]` |
| Tracking | `[upstream or none]` |
| Working tree | Clean / **Uncommitted changes present** |
| HEAD | `[sha]` — [subject] |
| Workflow stage | [M2–M10 if determinable from installed workflow + artifacts; else N/A] |
| In-progress artifact | [spec/plan/PR/issue path or URL, or none] |
| Next intended action | [one concrete action] |

### Uncommitted changes (if any)

If the tree is dirty, paste relevant `git status` / `git diff --stat`. If clean, omit this subsection or state `None`.

```
[paste]
```

## Files Touched

Only paths confirmed by git or explicit session edits.

| Path | Change | Notes |
| --- | --- | --- |
| `path` | added / modified / deleted / unchanged-but-relevant | [session role] |

## Architectural Decisions

List only decisions supported by authoritative artifacts or explicit session confirmation. Do not invent new ones.

| Decision | Authority | Status |
| --- | --- | --- |
| [decision] | [RFC/plan/doc path] | Accepted / Draft / Session-confirmed |

### Spec / plan discrepancies (if any)

- [None] **or** [concrete conflict between implementation and accepted artifact]

## New Abstractions / Components

| Name | Location | Purpose |
| --- | --- | --- |
| [name] | `path` | [one-line purpose] |

If none, write `None`.

## Verification

Use only results actually observed. Status must be one of: **PASS** / **FAIL** / **NOT RUN** / **UNKNOWN**.

| Check | Result | Evidence |
| --- | --- | --- |
| [command or review] | PASS / FAIL / NOT RUN / UNKNOWN | [observed output summary] |

## Risks / Known Issues

- [risk or issue, with severity if known]

If none, write `None`.

## Recommended Next Steps

1. **[Next intended action — must match Executive Summary]**
2. [optional follow-on]
3. [optional follow-on]

## Authoritative References

- Spec: `[path]` — status: [Accepted/Draft/…]
- Plan: `[path]` — status: [Accepted/Draft/…]
- Issue/PR: [URL or id]
- Docs: `[path]`

## Suggested First Prompt for the Next Session

Emit a fenced markdown block the next session can paste verbatim. It MUST instruct the next AI to:

1. read the handoff as a brief (not as proof);
2. inspect the repository and `git status`;
3. verify handoff claims against the repo and correct staleness;
4. read Authoritative References (accepted specs/plans first);
5. resolve discrepancies before new work;
6. not redo completed work merely because it appears here;
7. continue from the exact next intended action below.

```markdown
Read this handoff and treat it as the session-start brief (not as proof).

1. Inspect the repository and `git status` (branch, HEAD, clean vs dirty tree).
2. Verify every Completed / Remaining / Files Touched claim against the actual repo; correct the working picture if the handoff is stale.
3. Read the Authoritative References (accepted specs/plans first).
4. If implementation or docs conflict with an accepted artifact, surface the discrepancy and resolve it before new work.
5. Do **not** redo completed work merely because it appears in the handoff.
6. Continue from this next intended action:

   [PASTE THE EXACT NEXT INTENDED ACTION HERE]
```
