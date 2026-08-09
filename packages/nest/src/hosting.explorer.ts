import { Inject, Injectable } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import type { Resource } from '@resource-forge/core';
import { err, ok, type Result } from '@resource-forge/core';
import { DISCOVERABLE_RESOURCE_METADATA } from './discoverable.decorator.js';
import type { HostingError } from './hosting-lifecycle.js';
import {
  awaitProvidedResource,
  isResourceDeclarationProvider,
} from './resource-declaration.js';

@Injectable()
export class HostingExplorer {
  constructor(
    @Inject(DiscoveryService)
    private readonly discovery: DiscoveryService,
  ) {}

  async discoverResources(): Promise<Result<Resource[], HostingError>> {
    const wrappers = this.discovery.getProviders().filter((wrapper) => {
      const metatype = wrapper.metatype;
      if (typeof metatype !== 'function') {
        return false;
      }
      return Reflect.getMetadata(DISCOVERABLE_RESOURCE_METADATA, metatype) === true;
    });

    const resources: Resource[] = [];
    for (const wrapper of wrappers) {
      const instance = wrapper.instance;
      if (!isResourceDeclarationProvider(instance)) {
        return err({ code: 'invalid_provider' });
      }
      const resolved = await awaitProvidedResource(instance);
      if (!resolved.ok) {
        return resolved;
      }
      resources.push(resolved.value);
    }

    return ok(resources);
  }
}
