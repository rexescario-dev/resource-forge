import { resourceIdentitiesEqual } from '../identity/equal.js';
import type { ResourceIdentity } from '../identity/types.js';
import { validateResourceIdentity } from '../identity/validate.js';
import type { ResourceMetadata } from '../metadata/types.js';
import { validateResourceMetadata } from '../metadata/validate.js';
import { err, ok, type Result } from '../result.js';
import type {
  LookupResult,
  RegisterError,
  RegistryMutationError,
  ReplaceError,
  ResourceRegistry,
  UnregisterError,
} from './types.js';

type AssociationPrepError = Extract<
  RegistryMutationError,
  { code: 'invalid_identity' | 'invalid_metadata' | 'identity_mismatch' }
>;

function toKey(identity: ResourceIdentity): string {
  return `${identity.namespace}/${identity.name}`;
}

function prepareAssociation(
  identity: ResourceIdentity,
  metadata: ResourceMetadata,
): Result<{ identity: ResourceIdentity }, AssociationPrepError> {
  const identityKind =
    identity.namespace === 'rf' ? 'framework' : 'user';
  const validatedIdentity = validateResourceIdentity(identity, {
    kind: identityKind,
  });
  if (!validatedIdentity.ok) {
    return err({ code: 'invalid_identity', cause: validatedIdentity.error });
  }

  const validatedMetadata = validateResourceMetadata(metadata);
  if (!validatedMetadata.ok) {
    return err({ code: 'invalid_metadata', cause: validatedMetadata.error });
  }

  if (
    !resourceIdentitiesEqual(
      validatedIdentity.value,
      validatedMetadata.value.identity,
    )
  ) {
    return err({
      code: 'identity_mismatch',
      identity: validatedIdentity.value,
      metadataIdentity: validatedMetadata.value.identity,
    });
  }

  return ok({ identity: validatedIdentity.value });
}

function createRegistry(): ResourceRegistry {
  const store = new Map<string, ResourceMetadata>();

  return {
    register(identity, metadata): Result<void, RegisterError> {
      const prepared = prepareAssociation(identity, metadata);
      if (!prepared.ok) {
        return prepared;
      }

      const key = toKey(prepared.value.identity);
      if (store.has(key)) {
        return err({
          code: 'duplicate_registration',
          identity: prepared.value.identity,
        });
      }

      // Retain caller-supplied immutable snapshot instance.
      store.set(key, metadata);
      return ok(undefined);
    },

    replace(identity, metadata): Result<void, ReplaceError> {
      const prepared = prepareAssociation(identity, metadata);
      if (!prepared.ok) {
        return prepared;
      }

      const key = toKey(prepared.value.identity);
      if (!store.has(key)) {
        return err({
          code: 'not_registered',
          identity: prepared.value.identity,
        });
      }

      // Retain caller-supplied immutable snapshot instance.
      store.set(key, metadata);
      return ok(undefined);
    },

    unregister(identity): Result<void, UnregisterError> {
      const identityKind =
        identity.namespace === 'rf' ? 'framework' : 'user';
      const validated = validateResourceIdentity(identity, {
        kind: identityKind,
      });
      if (!validated.ok) {
        return err({ code: 'invalid_identity', cause: validated.error });
      }

      const key = toKey(validated.value);
      if (!store.has(key)) {
        return err({
          code: 'not_registered',
          identity: validated.value,
        });
      }

      store.delete(key);
      return ok(undefined);
    },

    lookup(identity): LookupResult {
      const identityKind =
        identity.namespace === 'rf' ? 'framework' : 'user';
      const validated = validateResourceIdentity(identity, {
        kind: identityKind,
      });
      if (!validated.ok) {
        return { status: 'miss' };
      }

      const metadata = store.get(toKey(validated.value));
      if (metadata === undefined) {
        return { status: 'miss' };
      }
      return { status: 'hit', metadata };
    },

    enumerate(): ReadonlyArray<ResourceIdentity> {
      return Array.from(store.values(), (metadata) => metadata.identity);
    },
  };
}

export function createInMemoryResourceRegistry(): ResourceRegistry {
  return createRegistry();
}
