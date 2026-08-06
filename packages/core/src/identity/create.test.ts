import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from './create.js';

describe('createResourceIdentity', () => {
  it('defaults to user kind', () => {
    const denied = createResourceIdentity('rf', 'Resource');
    expect(denied.ok).toBe(false);
  });

  it('creates a validated identity', () => {
    const result = createResourceIdentity('crm', 'Customer');
    expect(result).toEqual({
      ok: true,
      value: { namespace: 'crm', name: 'Customer' },
    });
  });

  it('allows framework kind for rf', () => {
    const result = createResourceIdentity('rf', 'Resource', {
      kind: 'framework',
    });
    expect(result.ok).toBe(true);
  });
});
