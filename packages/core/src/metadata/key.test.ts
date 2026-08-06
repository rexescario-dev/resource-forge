import { describe, expect, it } from 'vitest';
import {
  createMetadataKey,
  metadataKeysEqual,
  validateMetadataKey,
} from './key.js';

describe('validateMetadataKey', () => {
  it('accepts valid extension keys', () => {
    expect(
      validateMetadataKey(
        { namespace: 'graphql', name: 'typeName' },
        { kind: 'extension' },
      ),
    ).toEqual({
      ok: true,
      value: { namespace: 'graphql', name: 'typeName' },
    });

    expect(
      validateMetadataKey({
        namespace: 'openapi',
        name: 'operationId',
      }).ok,
    ).toBe(true);
  });

  it('rejects invalid names and namespaces', () => {
    expect(
      validateMetadataKey({ namespace: 'GraphQL', name: 'typeName' }).ok,
    ).toBe(false);
    expect(
      validateMetadataKey({ namespace: 'graphql', name: 'TypeName' }).ok,
    ).toBe(false);
    expect(
      validateMetadataKey({ namespace: 'graphql', name: 'type-name' }).ok,
    ).toBe(false);
  });

  it('rejects rf for extension kind by default', () => {
    const result = createMetadataKey('rf', 'description');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('reserved_namespace');
    }
  });

  it('accepts rf for framework kind', () => {
    const result = createMetadataKey('rf', 'description', {
      kind: 'framework',
    });
    expect(result).toEqual({
      ok: true,
      value: { namespace: 'rf', name: 'description' },
    });
  });
});

describe('metadataKeysEqual', () => {
  it('is exact and case-sensitive', () => {
    expect(
      metadataKeysEqual(
        { namespace: 'graphql', name: 'typeName' },
        { namespace: 'graphql', name: 'typeName' },
      ),
    ).toBe(true);
    expect(
      metadataKeysEqual(
        { namespace: 'graphql', name: 'typeName' },
        { namespace: 'GraphQL', name: 'typeName' },
      ),
    ).toBe(false);
  });
});
