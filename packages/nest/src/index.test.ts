import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import {
  CORE_DEPENDENCY,
  DiscoverableResource,
  PACKAGE_NAME,
  PACKAGE_VERSION,
  RESOURCE_REGISTRY,
  ResourceForgeModule,
} from './index.js';

describe('@resource-forge/nest', () => {
  it('exports its package name', () => {
    expect(PACKAGE_NAME).toBe('@resource-forge/nest');
  });

  it('exports its package version', () => {
    expect(PACKAGE_VERSION).toBe('0.0.0');
  });

  it('depends on @resource-forge/core', () => {
    expect(CORE_DEPENDENCY).toBe('@resource-forge/core');
  });

  it('exports hosting public surface', () => {
    expect(RESOURCE_REGISTRY).toBeTypeOf('symbol');
    expect(typeof DiscoverableResource).toBe('function');
    expect(typeof ResourceForgeModule.forRoot).toBe('function');
    expect(typeof ResourceForgeModule.forRootAsync).toBe('function');
  });
});
