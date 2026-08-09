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

  it('accepts catalogued rf annotation keys with JsonValue string shapes', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: createEmptyResourceSchema(),
      annotations: [
        { key: { namespace: 'rf', name: 'description' }, value: 'A customer record' },
        { key: { namespace: 'rf', name: 'displayName' }, value: 'Customer' },
        { key: { namespace: 'docs', name: 'summary' }, value: 'opaque extension' },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it('accepts empty-string values for catalogued rf keys', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: createEmptyResourceSchema(),
      annotations: [
        { key: { namespace: 'rf', name: 'description' }, value: '' },
        { key: { namespace: 'rf', name: 'displayName' }, value: '' },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it('rejects unknown rf annotation keys', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: createEmptyResourceSchema(),
      annotations: [{ key: { namespace: 'rf', name: 'icon' }, value: 'user' }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid_annotations');
    if (result.error.code !== 'invalid_annotations') return;
    expect(result.error.cause).toEqual({
      code: 'unknown_rf_annotation_key',
      index: 0,
      key: { namespace: 'rf', name: 'icon' },
    });
  });

  it('rejects non-string JsonValue shapes for catalogued rf keys', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const cases: Array<{ name: 'description' | 'displayName'; value: unknown }> = [
      { name: 'description', value: null },
      { name: 'description', value: 1 },
      { name: 'description', value: true },
      { name: 'description', value: { text: 'x' } },
      { name: 'description', value: ['x'] },
      { name: 'displayName', value: null },
      { name: 'displayName', value: 2 },
    ];

    for (const [index, testCase] of cases.entries()) {
      const result = validateResource({
        identity: identity.value,
        schema: createEmptyResourceSchema(),
        annotations: [
          {
            key: { namespace: 'rf', name: testCase.name },
            value: testCase.value as never,
          },
        ],
      });
      expect(result.ok, `case ${index}`).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('invalid_annotations');
      if (result.error.code !== 'invalid_annotations') return;
      expect(result.error.cause).toEqual({
        code: 'invalid_rf_annotation_value_shape',
        index: 0,
        key: { namespace: 'rf', name: testCase.name },
      });
    }
  });

  it('reports duplicate_key before vocabulary shape for a second catalogued key', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const result = validateResource({
      identity: identity.value,
      schema: createEmptyResourceSchema(),
      annotations: [
        { key: { namespace: 'rf', name: 'description' }, value: 'ok' },
        { key: { namespace: 'rf', name: 'description' }, value: null as never },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid_annotations');
    if (result.error.code !== 'invalid_annotations') return;
    expect(result.error.cause.code).toBe('duplicate_key');
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
