import { describe, expect, it } from 'vitest';
import { resourceIdentitiesEqual } from './equal.js';

describe('resourceIdentitiesEqual', () => {
  it('is true for exact matches', () => {
    expect(
      resourceIdentitiesEqual(
        { namespace: 'crm', name: 'Customer' },
        { namespace: 'crm', name: 'Customer' },
      ),
    ).toBe(true);
  });

  it('is false when case differs', () => {
    expect(
      resourceIdentitiesEqual(
        { namespace: 'crm', name: 'Customer' },
        { namespace: 'CRM', name: 'Customer' },
      ),
    ).toBe(false);
  });

  it('is false when name differs', () => {
    expect(
      resourceIdentitiesEqual(
        { namespace: 'crm', name: 'Customer' },
        { namespace: 'crm', name: 'Account' },
      ),
    ).toBe(false);
  });
});
