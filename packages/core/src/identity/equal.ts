import type { ResourceIdentity } from './types.js';

export function resourceIdentitiesEqual(
  a: ResourceIdentity,
  b: ResourceIdentity,
): boolean {
  return a.namespace === b.namespace && a.name === b.name;
}
