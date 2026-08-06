import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/create.js';
import { createResourceMetadata } from './create.js';
import { resourceMetadataEqual } from './equal.js';

function snapshot(
  entries: Parameters<typeof createResourceMetadata>[1],
) {
  const identity = createResourceIdentity('crm', 'Customer');
  if (!identity.ok) {
    throw new Error('identity');
  }
  const metadata = createResourceMetadata(identity.value, entries);
  if (!metadata.ok) {
    throw new Error('metadata');
  }
  return metadata.value;
}

describe('resourceMetadataEqual', () => {
  it('ignores entry order', () => {
    const a = snapshot([
      { key: { namespace: 'graphql', name: 'typeName' }, value: 'Customer' },
      { key: { namespace: 'rf', name: 'description' }, value: 'x' },
    ]);
    const b = snapshot([
      { key: { namespace: 'rf', name: 'description' }, value: 'x' },
      { key: { namespace: 'graphql', name: 'typeName' }, value: 'Customer' },
    ]);
    expect(resourceMetadataEqual(a, b)).toBe(true);
  });

  it('ignores object key order in JsonValue', () => {
    const a = snapshot([
      { key: { namespace: 'graphql', name: 'meta' }, value: { a: 1, b: 2 } },
    ]);
    const b = snapshot([
      { key: { namespace: 'graphql', name: 'meta' }, value: { b: 2, a: 1 } },
    ]);
    expect(resourceMetadataEqual(a, b)).toBe(true);
  });

  it('is false when identity differs', () => {
    const a = snapshot([]);
    const otherIdentity = createResourceIdentity('billing', 'Invoice');
    if (!otherIdentity.ok) {
      throw new Error('identity');
    }
    const b = createResourceMetadata(otherIdentity.value, []);
    if (!b.ok) {
      throw new Error('metadata');
    }
    expect(resourceMetadataEqual(a, b.value)).toBe(false);
  });

  it('treats missing key as unequal to null value', () => {
    const a = snapshot([]);
    const b = snapshot([
      { key: { namespace: 'graphql', name: 'typeName' }, value: null },
    ]);
    expect(resourceMetadataEqual(a, b)).toBe(false);
  });
});
