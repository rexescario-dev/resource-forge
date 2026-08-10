import { describe, expect, it } from 'vitest';
import {
  CORE_DEPENDENCY,
  PACKAGE_NAME,
  PACKAGE_VERSION,
  verifyPrismaCorrespondence,
} from './index.js';

describe('@resource-forge/prisma', () => {
  it('exports its package name placeholder', () => {
    expect(PACKAGE_NAME).toBe('@resource-forge/prisma');
  });

  it('exports its package version placeholder', () => {
    expect(PACKAGE_VERSION).toBe('0.0.0');
  });

  it('depends on @resource-forge/core', () => {
    expect(CORE_DEPENDENCY).toBe('@resource-forge/core');
  });

  it('exports verifyPrismaCorrespondence', () => {
    expect(typeof verifyPrismaCorrespondence).toBe('function');
  });
});
