---
name: session-handoff
description: >-
  Produce a complete, standalone Markdown session handoff for the next AI session.
  Use when the user says handoff, create a handoff, prepare a session handoff,
  session handoff, or otherwise indicates the current AI session is ending and
  working state must be transferred.
---

# Session Handoff

**Principle:** A handoff is a **state-transfer artifact**, not a summary of the conversation.

When the user says **`handoff`**, **`create a handoff`**, **`prepare a session handoff`**, or otherwise indicates that the current AI session is ending, produce a **complete, standalone Markdown handoff for the next AI session**.

## Required behavior

Before producing the handoff:

1. Inspect the current repository state.
2. Inspect `git status`, the current branch, and the relevant recent commit state.
3. Review files changed and work performed during the current session.
4. Identify what was actually completed versus what remains unfinished.
5. Determine the current engineering workflow stage when `docs/workflows/` is installed (M2–M10), without inventing a stage.
6. Inspect relevant specifications, plans, issues, and documentation that govern the work.
7. Determine the exact point from which the next AI should continue.
8. Record verification based only on commands actually run and results actually observed.

Do not rely solely on conversational memory when repository evidence is available.

Inspect at least:

- `git status`
- current branch and tracking
- recent commits
- files changed
- tests/verification actually performed
- current workflow stage (if applicable)
- authoritative specifications
- implementation plans
- issues/PRs
- unfinished work

## Handoff goals

The resulting handoff MUST allow a new AI session to:

* understand the objective;
* understand what has already been completed;
* understand what remains;
* reconstruct the current implementation state;
* identify files changed;
* preserve architectural and design decisions;
* understand newly introduced abstractions or components;
* reproduce or verify the current state;
* recognize known risks or unresolved issues;
* follow the recommended continuation sequence; and
* start work immediately without unnecessarily repeating completed work.

## Evidence rules

The handoff must be factual and evidence-based.

Never claim that:

* a test passed unless it was actually run and passed;
* a file was changed unless repository state confirms it;
* a commit exists unless it can be identified;
* an implementation is complete when it is only partially implemented;
* a specification or decision was accepted unless the repository/project evidence establishes that status.

Clearly distinguish:

* **PASS** — verified successfully;
* **FAIL** — verification was performed and failed;
* **NOT RUN** — verification has not been performed;
* **UNKNOWN** — the state cannot currently be established.

If the working tree contains uncommitted changes, explicitly state that.

## Authority rules

When describing architectural or implementation decisions, prefer authoritative repository artifacts over conversational assumptions.

Where applicable, reference:

1. accepted specifications;
2. accepted implementation plans;
3. repository documentation;
4. issue/PR tracking;
5. implementation code and tests.

The handoff must not silently introduce new architectural decisions.

If the current implementation conflicts with an authoritative specification or accepted plan, explicitly identify the discrepancy.

## Continuation rule

The handoff MUST identify an explicit **next intended action**.

The next action should be concrete enough that another AI can begin immediately.

Prefer:

> Review M5 plan against RFC-013 and update the implementation task document.

over:

> Continue working on the feature.

## Output rule

The final result must be **standalone Markdown** suitable for copying directly into a new AI session.

Use [template.md](template.md) for the exact Markdown structure of the artifact.

Fill every section. Omit a section only when it truly does not apply, and state why briefly inside that section.

Do not add conversational commentary before or after the handoff when the user explicitly requests the handoff artifact.

## Suggested first prompt

End the handoff with a ready-to-use prompt for the next AI session.

The prompt should instruct the next AI to:

1. read the handoff;
2. inspect the repository and git status;
3. verify the handoff against the actual repository;
4. read the referenced authoritative specifications/plans;
5. resolve any discrepancy before proceeding; and
6. continue from the stated next action.

The next AI should **not redo completed work** merely because it was described in the handoff.
