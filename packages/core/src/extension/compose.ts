import type { ResourceIdentity } from '../identity/types.js';
import { validateResourceIdentity } from '../identity/validate.js';
import { createResourceMetadata } from '../metadata/create.js';
import type { ResourceMetadata } from '../metadata/types.js';
import type { Result } from '../result.js';
import { err, ok } from '../result.js';
import type { CompositionError, Contribution } from './types.js';

export function composeResourceMetadata(
  identity: ResourceIdentity,
  contributions: ReadonlyArray<Contribution>,
): Result<ResourceMetadata, CompositionError> {
  const identityKind = identity.namespace === 'rf' ? 'framework' : 'user';
  const validatedIdentity = validateResourceIdentity(identity, {
    kind: identityKind,
  });
  if (!validatedIdentity.ok) {
    return err({
      code: 'invalid_identity',
      cause: validatedIdentity.error,
    });
  }

  // Later tasks fill contribution validation / ownership.
  void contributions;

  const metadata = createResourceMetadata(validatedIdentity.value, []);
  if (!metadata.ok) {
    throw new Error(
      'composeResourceMetadata: unreachable metadata failure after validation',
    );
  }
  return ok(metadata.value);
}
