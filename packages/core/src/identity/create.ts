import type { Result } from '../result.js';
import type {
  IdentityValidationError,
  ResourceIdentity,
  ResourceIdentityKind,
} from './types.js';
import { validateResourceIdentity } from './validate.js';

export function createResourceIdentity(
  namespace: string,
  name: string,
  options?: { kind?: ResourceIdentityKind },
): Result<ResourceIdentity, IdentityValidationError> {
  return validateResourceIdentity(
    { namespace, name },
    { kind: options?.kind ?? 'user' },
  );
}
