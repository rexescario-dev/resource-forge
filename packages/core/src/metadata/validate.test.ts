import { describe, expect, it } from 'vitest';
import { createResourceIdentity } from '../identity/create.js';
import { validateResourceMetadata } from './validate.js';

function userIdentity() {
  const result = createResourceIdentity('crm', 'Customer');
  if (!result.ok) {
    throw new Error('expected identity');
  }
  return result.value;
}

describe('validateResourceMetadata', () => {
  it('accepts empty entries', () => {
    const result = validateResourceMetadata({
      identity: userIdentity(),
      entries: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.entries).toEqual([]);
      expect(result.value.identity).toEqual({
        namespace: 'crm',
        name: 'Customer',
      });
    }
  });

  it('accepts mixed rf and extension entries when structurally valid', () => {
    const result = validateResourceMetadata({
      identity: userIdentity(),
      entries: [
        {
          key: { namespace: 'rf', name: 'description' },
          value: 'CRM customer',
        },
        {
          key: { namespace: 'graphql', name: 'typeName' },
          value: 'Customer',
        },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it('rejects duplicate keys', () => {
    const result = validateResourceMetadata({
      identity: userIdentity(),
      entries: [
        { key: { namespace: 'graphql', name: 'typeName' }, value: 'A' },
        { key: { namespace: 'graphql', name: 'typeName' }, value: 'B' },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('duplicate_key');
      expect(result.error.index).toBe(1);
    }
  });

  it('rejects invalid identity', () => {
    const result = validateResourceMetadata({
      identity: { namespace: 'CRM', name: 'Customer' },
      entries: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_identity');
    }
  });

  it('rejects invalid key and value with index', () => {
    const badKey = validateResourceMetadata({
      identity: userIdentity(),
      entries: [{ key: { namespace: 'graphql', name: 'TypeName' }, value: 1 }],
    });
    expect(badKey.ok).toBe(false);
    if (!badKey.ok) {
      expect(badKey.error.code).toBe('invalid_key');
      expect(badKey.error.index).toBe(0);
    }

    const badValue = validateResourceMetadata({
      identity: userIdentity(),
      entries: [
        {
          key: { namespace: 'graphql', name: 'typeName' },
          value: undefined as unknown as string,
        },
      ],
    });
    expect(badValue.ok).toBe(false);
    if (!badValue.ok) {
      expect(badValue.error.code).toBe('invalid_value');
      expect(badValue.error.index).toBe(0);
    }
  });

  it('does not derive identity from entries', () => {
    const result = validateResourceMetadata({
      identity: userIdentity(),
      entries: [
        {
          key: { namespace: 'graphql', name: 'typeName' },
          value: 'Other',
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.identity).toEqual({
        namespace: 'crm',
        name: 'Customer',
      });
    }
  });
});
