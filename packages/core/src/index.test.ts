import { describe, expect, it } from 'vitest';
import {
  PACKAGE_NAME,
  PACKAGE_VERSION,
  createInMemoryResourceRegistry,
  createMetadataKey,
  createResourceIdentity,
  createResourceMetadata,
  resourceIdentitiesEqual,
  resourceMetadataEqual,
} from './index.js';

describe('@resource-forge/core', () => {
  it('exports its package name placeholder', () => {
    expect(PACKAGE_NAME).toBe('@resource-forge/core');
  });

  it('exports its package version placeholder', () => {
    expect(PACKAGE_VERSION).toBe('0.0.0');
  });

  it('exposes identity create and equal from the package entry', () => {
    const created = createResourceIdentity('crm', 'Customer');
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    expect(
      resourceIdentitiesEqual(created.value, {
        namespace: 'crm',
        name: 'Customer',
      }),
    ).toBe(true);
  });

  it('exposes metadata create and equal from the package entry', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    const key = createMetadataKey('graphql', 'typeName');
    expect(identity.ok && key.ok).toBe(true);
    if (!identity.ok || !key.ok) {
      return;
    }

    const metadata = createResourceMetadata(identity.value, [
      { key: key.value, value: 'Customer' },
    ]);
    expect(metadata.ok).toBe(true);
    if (!metadata.ok) {
      return;
    }

    expect(resourceMetadataEqual(metadata.value, metadata.value)).toBe(true);
  });

  it('exposes in-memory ResourceRegistry from the package entry', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }
    const metadata = createResourceMetadata(identity.value, []);
    expect(metadata.ok).toBe(true);
    if (!metadata.ok) {
      return;
    }

    const registry = createInMemoryResourceRegistry();
    expect(registry.register(identity.value, metadata.value).ok).toBe(true);
    expect(registry.lookup(identity.value).status).toBe('hit');
    expect(registry.enumerate()).toHaveLength(1);
    expect(registry.unregister(identity.value).ok).toBe(true);
    expect(registry.lookup(identity.value)).toEqual({ status: 'miss' });
  });
});
