import type { Resource } from '@resource-forge/core';
import { err, ok, type Result } from '@resource-forge/core';
import type { HostingError } from './hosting-lifecycle.js';

/**
 * Nest-local contract: each discovered provider yields exactly one core Resource.
 * `Resource[]` is not a supported return shape.
 */
export interface ResourceDeclarationProvider {
  provideResource(): Resource | Promise<Resource>;
}

export function isResourceDeclarationProvider(
  value: unknown,
): value is ResourceDeclarationProvider {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ResourceDeclarationProvider).provideResource === 'function'
  );
}

/**
 * Internal resolution boundary only. Awaits sync or Promise&lt;Resource&gt;.
 * Malformed yields (null, arrays, etc.) fail here for hosting; do not advertise
 * `Resource[]` as a public provider return type.
 */
export async function awaitProvidedResource(
  provider: ResourceDeclarationProvider,
): Promise<Result<Resource, HostingError>> {
  try {
    const value: unknown = await provider.provideResource();

    if (value === null || value === undefined) {
      return err({ code: 'zero_resources' });
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return err({ code: 'zero_resources' });
      }
      if (value.length > 1) {
        return err({ code: 'multiple_resources' });
      }
      return err({ code: 'invalid_resource_yield' });
    }

    return ok(value as Resource);
  } catch (cause) {
    return err({ code: 'resolution_failed', cause });
  }
}
