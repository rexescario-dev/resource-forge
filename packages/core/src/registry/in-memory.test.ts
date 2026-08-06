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

describe('createInMemoryResourceRegistry — replace / unregister', () => {
  it('replaces the current snapshot with no history', () => {
    const registry = createInMemoryResourceRegistry();
    const identity = mustIdentity('crm', 'Customer');
    const first = createResourceMetadata(identity, []);
    const second = createResourceMetadata(identity, []);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }

    expect(registry.register(identity, first.value).ok).toBe(true);
    const replaced = registry.replace(identity, second.value);
    expect(replaced).toEqual({ ok: true, value: undefined });

    const lookedUp = registry.lookup(identity);
    expect(lookedUp.status).toBe('hit');
    if (lookedUp.status !== 'hit') {
      return;
    }
    expect(lookedUp.metadata).toBe(second.value);
    expect(lookedUp.metadata).not.toBe(first.value);
  });

  it('rejects replace when not registered', () => {
    const registry = createInMemoryResourceRegistry();
    const { identity, metadata } = mustMetadata('crm', 'Customer');
    const result = registry.replace(identity, metadata);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toEqual({ code: 'not_registered', identity });
  });

  it('unregisters a registered identity', () => {
    const registry = createInMemoryResourceRegistry();
    const { identity, metadata } = mustMetadata('crm', 'Customer');
    expect(registry.register(identity, metadata).ok).toBe(true);

    const removed = registry.unregister(identity);
    expect(removed).toEqual({ ok: true, value: undefined });
    expect(registry.lookup(identity)).toEqual({ status: 'miss' });
  });

  it('rejects unregister when not registered', () => {
    const registry = createInMemoryResourceRegistry();
    const identity = mustIdentity('crm', 'Customer');
    const result = registry.unregister(identity);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toEqual({ code: 'not_registered', identity });
  });
});

describe('createInMemoryResourceRegistry — lookup / enumerate', () => {
  it('returns miss for an unknown identity', () => {
    const registry = createInMemoryResourceRegistry();
    const identity = mustIdentity('crm', 'Customer');
    expect(registry.lookup(identity)).toEqual({ status: 'miss' });
  });

  it('returns miss for an invalid identity without reporting validation', () => {
    const registry = createInMemoryResourceRegistry();
    const lookedUp = registry.lookup({
      namespace: 'CRM',
      name: 'Customer',
    });
    expect(lookedUp).toEqual({ status: 'miss' });
  });

  it('enumerates currently registered identities as a snapshot', () => {
    const registry = createInMemoryResourceRegistry();
    const a = mustMetadata('crm', 'Customer');
    const b = mustMetadata('billing', 'Invoice');
    expect(registry.register(a.identity, a.metadata).ok).toBe(true);
    expect(registry.register(b.identity, b.metadata).ok).toBe(true);

    const snapshot = registry.enumerate();
    expect(snapshot).toHaveLength(2);
    expect(
      snapshot.some(
        (id) => id.namespace === 'crm' && id.name === 'Customer',
      ),
    ).toBe(true);
    expect(
      snapshot.some(
        (id) => id.namespace === 'billing' && id.name === 'Invoice',
      ),
    ).toBe(true);

    // Mutating the returned array must not affect the registry
    (snapshot as ResourceIdentity[]).length = 0;
    expect(registry.enumerate()).toHaveLength(2);

    // Registry mutation must not rewrite a prior snapshot array
    expect(registry.unregister(a.identity).ok).toBe(true);
    expect(snapshot).toHaveLength(0);
    expect(registry.enumerate()).toEqual([b.identity]);
  });
});

describe('createInMemoryResourceRegistry — validation', () => {
  it('rejects register with invalid identity', () => {
    const registry = createInMemoryResourceRegistry();
    const identity = { namespace: 'CRM', name: 'Customer' };
    const metadata = {
      identity: { namespace: 'crm', name: 'Customer' },
      entries: [],
    };
    const result = registry.register(identity, metadata as never);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe('invalid_identity');
  });

  it('rejects register with invalid metadata', () => {
    const registry = createInMemoryResourceRegistry();
    const identity = mustIdentity('crm', 'Customer');
    const result = registry.register(identity, {
      identity,
      entries: [
        {
          key: { namespace: 'graphql', name: 'typeName' },
          value: undefined as never,
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe('invalid_metadata');
  });

  it('rejects register when identity does not match metadata.identity', () => {
    const registry = createInMemoryResourceRegistry();
    const identity = mustIdentity('crm', 'Customer');
    const other = mustMetadata('billing', 'Invoice');
    const result = registry.register(identity, other.metadata);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toEqual({
      code: 'identity_mismatch',
      identity,
      metadataIdentity: other.identity,
    });
  });

  it('rejects unregister with invalid identity', () => {
    const registry = createInMemoryResourceRegistry();
    const result = registry.unregister({
      namespace: 'CRM',
      name: 'Customer',
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe('invalid_identity');
  });

  it('rejects replace with identity mismatch when registered', () => {
    const registry = createInMemoryResourceRegistry();
    const { identity, metadata } = mustMetadata('crm', 'Customer');
    expect(registry.register(identity, metadata).ok).toBe(true);
    const other = mustMetadata('billing', 'Invoice');
    const result = registry.replace(identity, other.metadata);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe('identity_mismatch');
  });

  it('reports invalid_identity when both identity and metadata are invalid', () => {
    const registry = createInMemoryResourceRegistry();
    const result = registry.register(
      { namespace: 'CRM', name: 'Customer' },
      {
        identity: { namespace: 'also-bad', name: 'notValid' },
        entries: [
          {
            key: { namespace: 'graphql', name: 'typeName' },
            value: undefined as never,
          },
        ],
      } as never,
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    // Identity validation precedes metadata validation.
    expect(result.error.code).toBe('invalid_identity');
  });
});
