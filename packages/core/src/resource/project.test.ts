import { describe, expect, it } from 'vitest';
import {
  createResourceIdentity,
  resourceIdentitiesEqual,
} from '../identity/index.js';
import {
  resourceMetadataEqual,
  validateResourceMetadata,
} from '../metadata/index.js';
import { createResourceWithAnnotationsForTests } from './create-resource-with-annotations.js';
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

  it('projects non-empty annotations by direct 1:1 entry mapping', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithAnnotationsForTests(identity.value, [
      { key: { namespace: 'docs', name: 'summary' }, value: 'A customer' },
      { key: { namespace: 'docs', name: 'title' }, value: 'Customer' },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const projected = projectResourceMetadata(resource.value);
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;

    expect(projected.value.entries).toHaveLength(2);
    expect(validateResourceMetadata(projected.value).ok).toBe(true);

    const reordered = {
      identity: projected.value.identity,
      entries: [...projected.value.entries].reverse(),
    };
    expect(resourceMetadataEqual(projected.value, reordered)).toBe(true);
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
      identity: { namespace: 'crm', name: 'nope' },
      schema: createEmptyResourceSchema(),
      annotations: emptyAnnotations,
    });
    expect(projected.ok).toBe(false);
    if (projected.ok) return;
    expect(projected.error.code).toBe('invalid_resource');
  });

  it('fails for invalid annotations as invalid_resource', () => {
    const projected = projectResourceMetadata({
      identity: { namespace: 'crm', name: 'Customer' },
      schema: createEmptyResourceSchema(),
      annotations: [
        { key: { namespace: 'docs', name: 'summary' }, value: 'a' },
        { key: { namespace: 'docs', name: 'summary' }, value: 'b' },
      ],
    });
    expect(projected.ok).toBe(false);
    if (projected.ok) return;
    expect(projected.error.code).toBe('invalid_resource');
    if (projected.error.code !== 'invalid_resource') return;
    expect(projected.error.cause.code).toBe('invalid_annotations');
  });
});
