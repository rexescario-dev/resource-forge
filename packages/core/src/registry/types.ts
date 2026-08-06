import type {
  IdentityValidationError,
  ResourceIdentity,
} from '../identity/types.js';
import type {
  MetadataValidationError,
  ResourceMetadata,
} from '../metadata/types.js';
import type { Result } from '../result.js';

export type LookupResult =
  | {
      readonly status: 'hit';
      readonly metadata: ResourceMetadata;
    }
  | {
      readonly status: 'miss';
    };

export type RegistryMutationError =
  | {
      readonly code: 'duplicate_registration';
      readonly identity: ResourceIdentity;
    }
  | {
      readonly code: 'not_registered';
      readonly identity: ResourceIdentity;
    }
  | {
      readonly code: 'invalid_identity';
      readonly cause: IdentityValidationError;
    }
  | {
      readonly code: 'invalid_metadata';
      readonly cause: MetadataValidationError;
    }
  | {
      readonly code: 'identity_mismatch';
      readonly identity: ResourceIdentity;
      readonly metadataIdentity: ResourceIdentity;
    };

export type RegisterError = Extract<
  RegistryMutationError,
  {
    code:
      | 'duplicate_registration'
      | 'invalid_identity'
      | 'invalid_metadata'
      | 'identity_mismatch';
  }
>;

export type ReplaceError = Extract<
  RegistryMutationError,
  {
    code:
      | 'not_registered'
      | 'invalid_identity'
      | 'invalid_metadata'
      | 'identity_mismatch';
  }
>;

export type UnregisterError = Extract<
  RegistryMutationError,
  { code: 'not_registered' | 'invalid_identity' }
>;

export interface ResourceRegistry {
  register(
    identity: ResourceIdentity,
    metadata: ResourceMetadata,
  ): Result<void, RegisterError>;

  replace(
    identity: ResourceIdentity,
    metadata: ResourceMetadata,
  ): Result<void, ReplaceError>;

  unregister(identity: ResourceIdentity): Result<void, UnregisterError>;

  lookup(identity: ResourceIdentity): LookupResult;

  enumerate(): ReadonlyArray<ResourceIdentity>;
}
