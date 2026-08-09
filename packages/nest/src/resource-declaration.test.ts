import 'reflect-metadata';
import {
  createResource,
  createResourceIdentity,
  type Resource,
} from '@resource-forge/core';
import { describe, expect, it } from 'vitest';
import {
  awaitProvidedResource,
  isResourceDeclarationProvider,
  type ResourceDeclarationProvider,
} from './resource-declaration.js';

function sampleResource(name: string): Resource {
  const identity = createResourceIdentity('crm', name);
  expect(identity.ok).toBe(true);
  if (!identity.ok) {
    throw new Error('identity');
  }
  const resource = createResource(identity.value);
  expect(resource.ok).toBe(true);
  if (!resource.ok) {
    throw new Error('resource');
  }
  return resource.value;
}

describe('isResourceDeclarationProvider', () => {
  it('accepts objects with provideResource function', () => {
    const provider: ResourceDeclarationProvider = {
      provideResource: () => sampleResource('Customer'),
    };
    expect(isResourceDeclarationProvider(provider)).toBe(true);
    expect(isResourceDeclarationProvider({})).toBe(false);
    expect(isResourceDeclarationProvider(null)).toBe(false);
  });
});

describe('awaitProvidedResource', () => {
  it('awaits a sync Resource', async () => {
    const resource = sampleResource('Order');
    const result = await awaitProvidedResource({
      provideResource: () => resource,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(resource);
    }
  });

  it('awaits a Promise<Resource>', async () => {
    const resource = sampleResource('Line');
    const result = await awaitProvidedResource({
      provideResource: async () => resource,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(resource);
    }
  });

  it('fails on throw', async () => {
    const result = await awaitProvidedResource({
      provideResource: () => {
        throw new Error('boom');
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('resolution_failed');
    }
  });

  it('fails on zero / multiple via malformed doubles', async () => {
    const zero = await awaitProvidedResource({
      provideResource: () => undefined as unknown as Resource,
    });
    expect(zero.ok).toBe(false);
    if (!zero.ok) {
      expect(zero.error.code).toBe('zero_resources');
    }

    const multiple = await awaitProvidedResource({
      provideResource: () =>
        [sampleResource('A'), sampleResource('B')] as unknown as Resource,
    });
    expect(multiple.ok).toBe(false);
    if (!multiple.ok) {
      expect(multiple.error.code).toBe('multiple_resources');
    }
  });
});
