import { describe, expect, it } from 'vitest';
import * as core from '../index.js';
import {
  createEmptyResourceSchema,
  createResource,
  createResourceIdentity,
  emptyAnnotations,
  projectResourceMetadata,
  resourceIdentitiesEqual,
  validateResource,
} from '../index.js';
import { createResourceWithAnnotationsForTests } from './create-resource-with-annotations.js';

describe('M3.1 public exports', () => {
  it('exposes resource construction and validation', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const created = createResource(identity.value);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const validated = validateResource(created.value);
    expect(validated.ok).toBe(true);
    expect(createEmptyResourceSchema().fields).toEqual([]);
    expect(emptyAnnotations).toEqual([]);
  });
});

describe('M3.2 public exports', () => {
  it('exposes projectResourceMetadata', () => {
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
  });
});

describe('M3.3 public exports', () => {
  it('exposes Annotations surface without EmptyAnnotations or validateAnnotations', () => {
    expect('EmptyAnnotations' in core).toBe(false);
    expect('validateAnnotations' in core).toBe(false);
    expect('createResourceWithAnnotationsForTests' in core).toBe(false);
    expect(Array.isArray(emptyAnnotations)).toBe(true);

    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithAnnotationsForTests(identity.value, [
      { key: { namespace: 'docs', name: 'summary' }, value: 'hi' },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const projected = projectResourceMetadata(resource.value);
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;
    expect(projected.value.entries).toHaveLength(1);
  });
});

describe('M3.4 public exports', () => {
  it('does not export validateFields or internal field helpers', () => {
    expect('validateFields' in core).toBe(false);
    expect('validateFieldName' in core).toBe(false);
    expect('snapshotFields' in core).toBe(false);
    expect('fieldsEqual' in core).toBe(false);
    expect('createResourceWithFieldsForTests' in core).toBe(false);
  });
});
