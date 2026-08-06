import { describe, expect, it } from 'vitest';
import { validateResourceIdentity } from './validate.js';

describe('validateResourceIdentity', () => {
  it('accepts a valid user identity', () => {
    const result = validateResourceIdentity(
      { namespace: 'crm', name: 'Customer' },
      { kind: 'user' },
    );
    expect(result).toEqual({
      ok: true,
      value: { namespace: 'crm', name: 'Customer' },
    });
  });

  it('accepts hyphenated namespaces and names with digits', () => {
    const result = validateResourceIdentity(
      { namespace: 'machine-learning', name: 'ModelCard' },
      { kind: 'user' },
    );
    expect(result.ok).toBe(true);

    const oauth = validateResourceIdentity(
      { namespace: 'billing', name: 'OAuth2Client' },
      { kind: 'user' },
    );
    expect(oauth.ok).toBe(true);
  });

  it('rejects reserved rf for user kind', () => {
    const result = validateResourceIdentity(
      { namespace: 'rf', name: 'Resource' },
      { kind: 'user' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        code: 'reserved_namespace',
        namespace: 'rf',
      });
    }
  });

  it('accepts rf for framework kind', () => {
    const result = validateResourceIdentity(
      { namespace: 'rf', name: 'Resource' },
      { kind: 'framework' },
    );
    expect(result).toEqual({
      ok: true,
      value: { namespace: 'rf', name: 'Resource' },
    });
  });

  it('rejects uppercase namespaces without normalizing', () => {
    const result = validateResourceIdentity(
      { namespace: 'CRM', name: 'Customer' },
      { kind: 'user' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_namespace');
      expect(result.error.namespace).toBe('CRM');
    }
  });

  it('rejects invalid namespaces', () => {
    for (const namespace of ['Auth', '', '1crm', 'crm_user']) {
      const result = validateResourceIdentity(
        { namespace, name: 'Customer' },
        { kind: 'user' },
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('invalid_namespace');
      }
    }
  });

  it('rejects invalid names', () => {
    for (const name of ['customer', 'customer-record', '', 'user_Name']) {
      const result = validateResourceIdentity(
        { namespace: 'crm', name },
        { kind: 'user' },
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('invalid_name');
      }
    }
  });

  it('defaults kind to user when options omitted', () => {
    const result = validateResourceIdentity({
      namespace: 'rf',
      name: 'Resource',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('reserved_namespace');
    }
  });
});
