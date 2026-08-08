import { createResourceMetadata } from '../metadata/create.js';
import type { ResourceMetadata } from '../metadata/types.js';
import { err, ok, type Result } from '../result.js';
import type { Resource, ResourceProjectionError } from './types.js';
import { validateResource } from './validate.js';

export function projectResourceMetadata(
  resource: Resource,
): Result<ResourceMetadata, ResourceProjectionError> {
  const validated = validateResource(resource);
  if (!validated.ok) {
    return err({ code: 'invalid_resource', cause: validated.error });
  }

  const metadata = createResourceMetadata(validated.value.identity, []);
  if (!metadata.ok) {
    return err({ code: 'invalid_metadata', cause: metadata.error });
  }

  return ok(metadata.value);
}
