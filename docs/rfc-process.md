# RFC process

Resource Forge uses architecture RFCs the same way ContextForge does: **design decisions are written and accepted before implementation**.

## Why

- Implementation must not outrun design
- Transports and persistence adapters can be evaluated against explicit decisions
- Future contributors inherit stable vocabulary instead of implicit assumptions

## Location

Accepted and in-progress RFCs live under:

```text
docs/superpowers/specs/
```

Implementation plans (when needed) live under:

```text
docs/superpowers/plans/
```

## Lifecycle

1. **Draft** — propose scope, vocabulary, and non-goals
2. **Review** — refine until boundaries are crisp
3. **Accept** — mark ready for planning / implementation
4. **Implement** — only after acceptance; keep code aligned with the RFC

Small RFCs are preferred over large omnibus documents.

## M2 gate (current)

Do not implement core contracts until these are accepted:

| RFC | Topic |
| --- | --- |
| RFC-001 | Resource identity |
| RFC-002 | Metadata model |
| RFC-003 | Registry contracts |
| RFC-004 | Extension model |

M3+ work may introduce additional RFCs as needed.
