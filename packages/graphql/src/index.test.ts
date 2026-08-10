import { describe, expect, it } from 'vitest';
import {
  CORE_DEPENDENCY,
  PACKAGE_NAME,
  PACKAGE_VERSION,
  translateResources,
} from './index.js';

describe('@resource-forge/graphql', () => {
  it('exports its package name', () => {
    expect(PACKAGE_NAME).toBe('@resource-forge/graphql');
  });

  it('exports its package version', () => {
    expect(PACKAGE_VERSION).toBe('0.0.0');
  });

  it('depends on @resource-forge/core', () => {
    expect(CORE_DEPENDENCY).toBe('@resource-forge/core');
  });

  it('exports translateResources', () => {
    expect(typeof translateResources).toBe('function');
  });
});
