import {
  err,
  ok,
  projectResourceMetadata,
  type RegisterError,
  type Resource,
  type ResourceProjectionError,
  type ResourceRegistry,
  type ResourceValidationError,
  type Result,
  validateResource,
} from '@resource-forge/core';

export type HostingError =
  | { readonly code: 'validation_failed'; readonly cause: ResourceValidationError }
  | { readonly code: 'projection_failed'; readonly cause: ResourceProjectionError }
  | { readonly code: 'registration_failed'; readonly cause: RegisterError }
  | { readonly code: 'resolution_failed'; readonly cause: unknown }
  | { readonly code: 'zero_resources' }
  | { readonly code: 'multiple_resources' }
  | { readonly code: 'invalid_resource_yield' }
  | { readonly code: 'invalid_provider' };

/**
 * Ordered hosting steps for already-resolved Resources:
 * validate → project → register.
 * Does not own DI exposure; callers must not expose `registry` on failure.
 */
export function runHostingLifecycle(
  resources: readonly Resource[],
  registry: ResourceRegistry,
): Result<void, HostingError> {
  for (const resource of resources) {
    const validated = validateResource(resource);
    if (!validated.ok) {
      return err({ code: 'validation_failed', cause: validated.error });
    }

    const projected = projectResourceMetadata(validated.value);
    if (!projected.ok) {
      return err({ code: 'projection_failed', cause: projected.error });
    }

    const registered = registry.register(
      validated.value.identity,
      projected.value,
    );
    if (!registered.ok) {
      return err({ code: 'registration_failed', cause: registered.error });
    }
  }

  return ok(undefined);
}
