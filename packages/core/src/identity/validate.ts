import { err, ok, type Result } from '../result.js';
import type {
  IdentityValidationError,
  ResourceIdentity,
  ResourceIdentityKind,
} from './types.js';

const NAMESPACE_PATTERN = /^[a-z][a-z0-9-]*$/;
const NAME_PATTERN = /^[A-Z][A-Za-z0-9]*$/;

export function validateResourceIdentity(
  candidate: { namespace: string; name: string },
  options?: { kind?: ResourceIdentityKind },
): Result<ResourceIdentity, IdentityValidationError> {
  const kind = options?.kind ?? 'user';
  const { namespace, name } = candidate;

  if (!NAMESPACE_PATTERN.test(namespace)) {
    return err({ code: 'invalid_namespace', namespace });
  }

  if (!NAME_PATTERN.test(name)) {
    return err({ code: 'invalid_name', name });
  }

  if (kind === 'user' && namespace === 'rf') {
    return err({ code: 'reserved_namespace', namespace });
  }

  return ok({ namespace, name });
}
