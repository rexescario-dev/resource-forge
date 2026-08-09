import { describe, expect, it } from 'vitest';
import { composeProjectionContributions } from './projection-compose.js';

describe('composeProjectionContributions', () => {
  it('accepts zero contributions as empty entries', () => {
    const result = composeProjectionContributions([]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([]);
  });

  it('accepts a single empty contribution', () => {
    const result = composeProjectionContributions([
      { sourceId: 'annotations', entries: [] },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([]);
  });

  it('preserves a single non-empty contribution exactly', () => {
    const entries = [
      { key: { namespace: 'rf', name: 'description' }, value: 'A customer' },
      { key: { namespace: 'ext', name: 'label' }, value: 'Customer' },
    ];
    const result = composeProjectionContributions([
      { sourceId: 'annotations', entries },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual(entries);
  });

  it('unions disjoint multi-source contributions', () => {
    const result = composeProjectionContributions([
      {
        sourceId: 'annotations',
        entries: [
          { key: { namespace: 'rf', name: 'description' }, value: 'A customer' },
        ],
      },
      {
        sourceId: 'fields',
        entries: [{ key: { namespace: 'rf', name: 'fieldCount' }, value: 3 }],
      },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);
    expect(result.value).toEqual(
      expect.arrayContaining([
        { key: { namespace: 'rf', name: 'description' }, value: 'A customer' },
        { key: { namespace: 'rf', name: 'fieldCount' }, value: 3 },
      ]),
    );
  });

  it('fails on unequal-value key collision', () => {
    const result = composeProjectionContributions([
      {
        sourceId: 'annotations',
        entries: [
          { key: { namespace: 'rf', name: 'description' }, value: 'A customer' },
        ],
      },
      {
        sourceId: 'fields',
        entries: [
          {
            key: { namespace: 'rf', name: 'description' },
            value: 'Customer entity',
          },
        ],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({
      code: 'projection_key_collision',
      key: { namespace: 'rf', name: 'description' },
      sources: ['annotations', 'fields'],
    });
  });

  it('fails on equal-value key collision', () => {
    const result = composeProjectionContributions([
      {
        sourceId: 'annotations',
        entries: [
          { key: { namespace: 'rf', name: 'description' }, value: 'A customer' },
        ],
      },
      {
        sourceId: 'fields',
        entries: [
          { key: { namespace: 'rf', name: 'description' }, value: 'A customer' },
        ],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('projection_key_collision');
    if (result.error.code !== 'projection_key_collision') return;
    expect(result.error.key).toEqual({ namespace: 'rf', name: 'description' });
    expect(new Set(result.error.sources)).toEqual(
      new Set(['annotations', 'fields']),
    );
  });

  it('fails on duplicate projection source identity', () => {
    const result = composeProjectionContributions([
      {
        sourceId: 'annotations',
        entries: [
          { key: { namespace: 'rf', name: 'description' }, value: 'one' },
        ],
      },
      {
        sourceId: 'annotations',
        entries: [
          { key: { namespace: 'rf', name: 'displayName' }, value: 'two' },
        ],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({
      code: 'duplicate_projection_source',
      sourceId: 'annotations',
    });
  });

  it('is order-independent for successful disjoint unions', () => {
    const a = {
      sourceId: 'A',
      entries: [
        { key: { namespace: 'rf', name: 'description' }, value: 'desc' },
      ],
    };
    const b = {
      sourceId: 'B',
      entries: [{ key: { namespace: 'ext', name: 'label' }, value: 'L' }],
    };
    const forward = composeProjectionContributions([a, b]);
    const reverse = composeProjectionContributions([b, a]);
    expect(forward.ok).toBe(true);
    expect(reverse.ok).toBe(true);
    if (!forward.ok || !reverse.ok) return;

    const byKey = (entries: typeof forward.value) =>
      new Map(
        entries.map((entry) => [
          `${entry.key.namespace}/${entry.key.name}`,
          entry.value,
        ]),
      );
    expect(byKey(forward.value)).toEqual(byKey(reverse.value));
  });

  it('reports only colliding sources in a three-way collision', () => {
    const result = composeProjectionContributions([
      {
        sourceId: 'A',
        entries: [{ key: { namespace: 'rf', name: 'description' }, value: 'x' }],
      },
      {
        sourceId: 'B',
        entries: [{ key: { namespace: 'rf', name: 'description' }, value: 'y' }],
      },
      {
        sourceId: 'C',
        entries: [{ key: { namespace: 'rf', name: 'label' }, value: 'z' }],
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('projection_key_collision');
    if (result.error.code !== 'projection_key_collision') return;
    expect(result.error.key).toEqual({ namespace: 'rf', name: 'description' });
    expect(new Set(result.error.sources)).toEqual(new Set(['A', 'B']));
    expect(result.error.sources).not.toContain('C');
  });
});
