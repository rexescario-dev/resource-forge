import * as core from '@resource-forge/core';
import {
  createInMemoryResourceRegistry,
  createResource,
  createResourceIdentity,
  type Resource,
} from '@resource-forge/core';
import { describe, expect, it, vi } from 'vitest';
import { runHostingLifecycle } from './hosting-lifecycle.js';

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

describe('runHostingLifecycle', () => {
  it('registers projected metadata for valid resources', () => {
    const resource = sampleResource('Customer');
    const registry = createInMemoryResourceRegistry();
    const result = runHostingLifecycle([resource], registry);
    expect(result.ok).toBe(true);
    const lookup = registry.lookup(resource.identity);
    expect(lookup.status).toBe('hit');
    if (lookup.status === 'hit') {
      expect(lookup.metadata.identity).toEqual(resource.identity);
    }
  });

  it('calls validate then project then register', () => {
    const resource = sampleResource('Order');
    const registry = createInMemoryResourceRegistry();
    const validateSpy = vi.spyOn(core, 'validateResource');
    const projectSpy = vi.spyOn(core, 'projectResourceMetadata');
    const registerSpy = vi.spyOn(registry, 'register');

    const result = runHostingLifecycle([resource], registry);
    expect(result.ok).toBe(true);
    expect(validateSpy).toHaveBeenCalled();
    expect(projectSpy).toHaveBeenCalled();
    expect(registerSpy).toHaveBeenCalled();

    const validateOrder = validateSpy.mock.invocationCallOrder[0];
    const projectOrder = projectSpy.mock.invocationCallOrder[0];
    const registerOrder = registerSpy.mock.invocationCallOrder[0];
    expect(validateOrder).toBeLessThan(projectOrder);
    expect(projectOrder).toBeLessThan(registerOrder);

    validateSpy.mockRestore();
    projectSpy.mockRestore();
  });

  it('surfaces lifecycle failure without successful result', () => {
    const registry = createInMemoryResourceRegistry();
    const invalid = {
      identity: { namespace: '', name: '' },
      schema: {},
      annotations: {},
    } as unknown as Resource;
    const result = runHostingLifecycle([invalid], registry);
    expect(result.ok).toBe(false);
  });

  it('fails duplicate identities via core duplicate_registration', () => {
    const a = sampleResource('Dup');
    const b = sampleResource('Dup');
    const registry = createInMemoryResourceRegistry();
    const result = runHostingLifecycle([a, b], registry);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('registration_failed');
      if (result.error.code === 'registration_failed') {
        expect(result.error.cause.code).toBe('duplicate_registration');
      }
    }
  });

  it('succeeds with empty input', () => {
    const registry = createInMemoryResourceRegistry();
    const result = runHostingLifecycle([], registry);
    expect(result.ok).toBe(true);
  });
});
