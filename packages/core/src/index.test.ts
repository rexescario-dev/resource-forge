import { describe, expect, it } from 'vitest';
import {
  PACKAGE_NAME,
  PACKAGE_VERSION,
  createResourceIdentity,
  resourceIdentitiesEqual,
} from './index.js';

describe('@resource-forge/core', () => {
  it('exports its package name placeholder', () => {
    expect(PACKAGE_NAME).toBe('@resource-forge/core');
  });

  it('exports its package version placeholder', () => {
    expect(PACKAGE_VERSION).toBe('0.0.0');
  });

  it('exposes identity create and equal from the package entry', () => {
    const created = createResourceIdentity('crm', 'Customer');
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    expect(
      resourceIdentitiesEqual(created.value, {
        namespace: 'crm',
        name: 'Customer',
      }),
    ).toBe(true);
  });
});
