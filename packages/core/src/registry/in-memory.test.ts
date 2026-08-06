import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/create.js';
import type { ResourceIdentity } from '../identity/types.js';
import { createResourceMetadata } from '../metadata/create.js';
import { resourceMetadataEqual } from '../metadata/equal.js';
import { createInMemoryResourceRegistry } from './in-memory.js';

function mustIdentity(namespace: string, name: string) {
  const result = createResourceIdentity(namespace, name);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('expected identity');
  }
  return result.value;
}

function mustMetadata(namespace: string, name: string) {
  const identity = mustIdentity(namespace, name);
  const result = createResourceMetadata(identity, []);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('expected metadata');
  }
  return { identity, metadata: result.value };
}

describe('createInMemoryResourceRegistry — register', () => {
  it('registers a metadata snapshot for an identity', () => {
    const registry = createInMemoryResourceRegistry();
    const { identity, metadata } = mustMetadata('crm', 'Customer');

    const registered = registry.register(identity, metadata);
    expect(registered).toEqual({ ok: true, value: undefined });

    const lookedUp = registry.lookup(identity);
    expect(lookedUp.status).toBe('hit');
    if (lookedUp.status !== 'hit') {
      return;
    }
    expect(resourceMetadataEqual(lookedUp.metadata, metadata)).toBe(true);
    expect(lookedUp.metadata).toBe(metadata); // retain supplied instance
  });

  it('rejects duplicate registration', () => {
    const registry = createInMemoryResourceRegistry();
    const { identity, metadata } = mustMetadata('crm', 'Customer');

    expect(registry.register(identity, metadata).ok).toBe(true);
    const duplicate = registry.register(identity, metadata);
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) {
      return;
    }
    expect(duplicate.error).toEqual({
      code: 'duplicate_registration',
      identity,
    });
  });

  it('isolates registries created by separate factory calls', () => {
    const a = createInMemoryResourceRegistry();
    const b = createInMemoryResourceRegistry();
    const { identity, metadata } = mustMetadata('crm', 'Customer');

    expect(a.register(identity, metadata).ok).toBe(true);
    expect(b.lookup(identity)).toEqual({ status: 'miss' });
  });
});
