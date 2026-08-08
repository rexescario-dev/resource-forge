import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/index.js';
import type { MetadataEntry } from '../metadata/types.js';
import { createResourceWithAnnotationsForTests } from './create-resource-with-annotations.js';
import { emptyAnnotations } from './empty-annotations.js';
import { createEmptyResourceSchema } from './schema.js';
import { validateResource } from './validate.js';

describe('M3.3 annotation contracts', () => {
  it('accepts empty annotations on a minimal Resource', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: createEmptyResourceSchema(),
      annotations: emptyAnnotations,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.annotations).toEqual([]);
  });

  it('rejects duplicate annotation keys via validateResource', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const key = { namespace: 'docs', name: 'summary' };
    const result = validateResource({
      identity: identity.value,
      schema: createEmptyResourceSchema(),
      annotations: [
        { key, value: 'a' },
        { key, value: 'b' },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid_annotations');
    if (result.error.code !== 'invalid_annotations') return;
    expect(result.error.cause.code).toBe('duplicate_key');
  });

  it('rejects invalid annotation keys via validateResource', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: createEmptyResourceSchema(),
      annotations: [{ key: { namespace: 'Docs', name: 'summary' }, value: 'x' }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid_annotations');
    if (result.error.code !== 'invalid_annotations') return;
    expect(result.error.cause.code).toBe('invalid_key');
  });

  it('accepts rf annotation keys under the same framework kind rules as metadata', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: createEmptyResourceSchema(),
      annotations: [{ key: { namespace: 'rf', name: 'description' }, value: 'x' }],
    });
    expect(result.ok).toBe(true);
  });

  it('rejects invalid annotation JsonValue via validateResource', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: createEmptyResourceSchema(),
      annotations: [
        {
          key: { namespace: 'docs', name: 'summary' },
          value: undefined as never,
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid_annotations');
    if (result.error.code !== 'invalid_annotations') return;
    expect(result.error.cause.code).toBe('invalid_value');
  });

  it('snapshot-by-value: mutating caller-owned values does not change Resource annotations', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const nested = { note: 'before' };
    const candidate: MetadataEntry[] = [
      {
        key: { namespace: 'docs', name: 'summary' },
        value: nested,
      },
    ];

    const resource = createResourceWithAnnotationsForTests(
      identity.value,
      candidate,
    );
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    nested.note = 'after';
    candidate.push({
      key: { namespace: 'docs', name: 'other' },
      value: 'x',
    });

    expect(resource.value.annotations).toHaveLength(1);
    expect(resource.value.annotations[0]?.value).toEqual({ note: 'before' });

    const revalidated = validateResource(resource.value);
    expect(revalidated.ok).toBe(true);
  });
});
