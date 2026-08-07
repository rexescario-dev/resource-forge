import { describe, expect, it } from 'vitest';
import { emptyAnnotations } from './empty-annotations.js';

describe('emptyAnnotations', () => {
  it('is the empty annotations unit', () => {
    expect(emptyAnnotations).toEqual({ readonlyTag: 'EmptyAnnotations' });
  });

  it('is frozen', () => {
    expect(Object.isFrozen(emptyAnnotations)).toBe(true);
  });
});
