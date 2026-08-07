import type { ResourceIdentity } from '../identity/types.js';
import type { Result } from '../result.js';
import { createEmptyResourceSchema } from './schema.js';
import { emptyAnnotations } from './empty-annotations.js';
import type { Resource, ResourceValidationError } from './types.js';
import { validateResource } from './validate.js';

export function createResource(
  identity: ResourceIdentity,
): Result<Resource, ResourceValidationError> {
  return validateResource({
    identity,
    schema: createEmptyResourceSchema(),
    annotations: emptyAnnotations,
  });
}
