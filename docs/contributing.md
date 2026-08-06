# Contributing

Thank you for your interest in Resource Forge.

## Development

Requires Node.js 20+ and pnpm.

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Guidelines

- Prefer changes that strengthen package boundaries over cross-package shortcuts.
- Do not add NestJS, GraphQL, or Prisma runtime dependencies until the corresponding integration work begins.
- No package should expose a public API until its responsibilities have been documented.
- Architecture changes go through RFCs before implementation — see [rfc-process.md](rfc-process.md).
- Keep commits focused. Use Changesets when public package APIs change (once packages are released).
