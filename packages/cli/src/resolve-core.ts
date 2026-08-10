import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export type ResolveCore = () => void;

const defaultResolveCore: ResolveCore = () => {
  require.resolve('@resource-forge/core');
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
