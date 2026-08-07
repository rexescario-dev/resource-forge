import { describe, expect, it } from 'vitest';
import {
  createEmptyResourceSchema,
  createResource,
  createResourceIdentity,
  emptyAnnotations,
  validateResource,
} from '../index.js';

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
    expect(emptyAnnotations.readonlyTag).toBe('EmptyAnnotations');
  });

  it('does not export projectResourceMetadata', async () => {
    const mod = await import('../index.js');
    expect('projectResourceMetadata' in mod).toBe(false);
  });
});
