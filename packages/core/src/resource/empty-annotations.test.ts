import { describe, expect, it } from 'vitest';
import { emptyAnnotations } from './empty-annotations.js';

describe('emptyAnnotations', () => {
  it('is the zero-entry annotations snapshot', () => {
    expect(emptyAnnotations).toEqual([]);
    expect(emptyAnnotations).toHaveLength(0);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(emptyAnnotations)).toBe(true);
  });
});
