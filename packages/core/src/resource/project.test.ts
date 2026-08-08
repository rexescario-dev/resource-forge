import { describe, expect, it } from 'vitest';
import {
  createResourceIdentity,
  resourceIdentitiesEqual,
} from '../identity/index.js';
import { validateResourceMetadata } from '../metadata/index.js';
import { createResource } from './create.js';
import { emptyAnnotations } from './empty-annotations.js';
import { projectResourceMetadata } from './project.js';
import { createEmptyResourceSchema } from './schema.js';

describe('projectResourceMetadata', () => {
  it('projects a minimal Resource to RFC-002-valid metadata with identity agreement', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResource(identity.value);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const projected = projectResourceMetadata(resource.value);
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;

    expect(
      resourceIdentitiesEqual(projected.value.identity, resource.value.identity),
    ).toBe(true);
    expect(projected.value.entries).toEqual([]);
    expect(validateResourceMetadata(projected.value).ok).toBe(true);
  });

  it('does not mutate the Resource', () => {
    const identity = createResourceIdentity('billing', 'Invoice');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;
    const resource = createResource(identity.value);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const before = structuredClone(resource.value);
    const projected = projectResourceMetadata(resource.value);
    expect(projected.ok).toBe(true);
    expect(resource.value).toEqual(before);
  });

  it('fails for an invalid Resource without projecting', () => {
    const projected = projectResourceMetadata({
      identity: { namespace: 'rf', name: 'Nope' },
      schema: createEmptyResourceSchema(),
      annotations: emptyAnnotations,
    });
    expect(projected.ok).toBe(false);
    if (projected.ok) return;
    expect(projected.error.code).toBe('invalid_resource');
  });
});
