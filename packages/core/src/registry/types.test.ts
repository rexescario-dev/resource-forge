import { describe, expect, it } from 'vitest';
import type { ResourceIdentity } from '../identity/types.js';
import type { ResourceMetadata } from '../metadata/types.js';
import type {
  LookupResult,
  RegisterError,
  RegistryMutationError,
  ReplaceError,
  ResourceRegistry,
  UnregisterError,
} from './types.js';

// Type-surface fixtures only — runtime values are irrelevant.
const identity = {
  namespace: 'crm',
  name: 'Customer',
} as ResourceIdentity;
const metadata = {
  identity,
  entries: [],
} as ResourceMetadata;

describe('registry types', () => {
  it('models lookup hit and miss', () => {
    const hit: LookupResult = {
      status: 'hit',
      metadata,
    };
    const miss: LookupResult = { status: 'miss' };
    expect(hit.status).toBe('hit');
    expect(miss.status).toBe('miss');
  });

  it('keeps RegisterError free of not_registered', () => {
    const err: RegisterError = {
      code: 'duplicate_registration',
      identity,
    };
    expect(err.code).toBe('duplicate_registration');

    // @ts-expect-error not_registered is not a RegisterError
    const _bad: RegisterError = {
      code: 'not_registered',
      identity,
    };
    void _bad;
  });

  it('allows RegistryMutationError to carry all codes', () => {
    const other = {
      namespace: 'billing',
      name: 'Invoice',
    } as ResourceIdentity;
    const errors: RegistryMutationError[] = [
      {
        code: 'duplicate_registration',
        identity,
      },
      {
        code: 'not_registered',
        identity,
      },
      {
        code: 'invalid_identity',
        cause: { code: 'invalid_namespace', namespace: 'CRM' },
      },
      {
        code: 'invalid_metadata',
        cause: {
          code: 'invalid_identity',
          cause: { code: 'invalid_name', name: 'customer' },
        },
      },
      {
        code: 'identity_mismatch',
        identity,
        metadataIdentity: other,
      },
    ];
    expect(errors).toHaveLength(5);
  });

  it('types ResourceRegistry method results', () => {
    type RegisterReturn = ReturnType<ResourceRegistry['register']>;
    type LookupReturn = ReturnType<ResourceRegistry['lookup']>;
    type EnumerateReturn = ReturnType<ResourceRegistry['enumerate']>;

    const _r: RegisterReturn = { ok: true, value: undefined };
    const _l: LookupReturn = { status: 'miss' };
    const _e: EnumerateReturn = [];
    void _r;
    void _l;
    void _e;

    type ReplaceReturn = ReturnType<ResourceRegistry['replace']>;
    type UnregisterReturn = ReturnType<ResourceRegistry['unregister']>;
    const _replace: ReplaceReturn = {
      ok: false,
      error: { code: 'not_registered', identity } satisfies ReplaceError,
    };
    const _unregister: UnregisterReturn = {
      ok: false,
      error: { code: 'not_registered', identity } satisfies UnregisterError,
    };
    void _replace;
    void _unregister;
  });
});
