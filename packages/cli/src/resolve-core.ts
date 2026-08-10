import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type ResolveCore = () => void;

/**
 * Resolve `@resource-forge/core` against the CLI package root.
 *
 * Uses `package.json` (not `import.meta.url`) so Vitest/CI module URLs still
 * see CLI dependencies. Entry resolve may fail when `dist/` is not built yet
 * (turbo `test` depends on `^test`, not `^build`); package presence in
 * `node_modules` is still sufficient for resolvability (no export assertions).
 */
const defaultResolveCore: ResolveCore = () => {
  const packageJsonPath = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'package.json',
  );
  const require = createRequire(packageJsonPath);

  try {
    require.resolve('@resource-forge/core');
    return;
  } catch {
    // Fall through to package-presence check.
  }

  const searchPaths = require.resolve.paths('@resource-forge/core') ?? [];
  for (const dir of searchPaths) {
    if (existsSync(join(dir, '@resource-forge', 'core', 'package.json'))) {
      return;
    }
  }

  throw new Error('Cannot resolve @resource-forge/core');
};

let resolveCoreImpl: ResolveCore = defaultResolveCore;
let resolveCallCount = 0;

/** Synchronous resolvability probe for `@resource-forge/core` (no export assertions). */
export function resolveCore(): void {
  resolveCallCount += 1;
  resolveCoreImpl();
}

/** Internal test seam — not public package API. */
export function setResolveCoreForTests(fn: ResolveCore): void {
  resolveCoreImpl = fn;
}

/** Internal test seam — not public package API. */
export function resetResolveCoreForTests(): void {
  resolveCoreImpl = defaultResolveCore;
}

/** Internal test seam — not public package API. */
export function getResolveCoreCallCountForTests(): number {
  return resolveCallCount;
}

/** Internal test seam — not public package API. */
export function resetResolveCoreCallCountForTests(): void {
  resolveCallCount = 0;
}
