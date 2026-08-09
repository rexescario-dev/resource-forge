import { SetMetadata } from '@nestjs/common';

export const DISCOVERABLE_RESOURCE_METADATA =
  'resource-forge:discoverable-resource';

export function DiscoverableResource(): ClassDecorator {
  return SetMetadata(DISCOVERABLE_RESOURCE_METADATA, true);
}
