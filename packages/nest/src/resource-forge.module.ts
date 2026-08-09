import { type DynamicModule, Module, type InjectionToken } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { createInMemoryResourceRegistry } from '@resource-forge/core';
import { HostingExplorer } from './hosting.explorer.js';
import { runHostingLifecycle, type HostingError } from './hosting-lifecycle.js';
import { RESOURCE_REGISTRY } from './tokens.js';

const RESOURCE_FORGE_OPTIONS = Symbol('RESOURCE_FORGE_OPTIONS');

export type ResourceForgeModuleOptions = Record<string, never>;

export interface ResourceForgeModuleAsyncOptions {
  readonly imports?: DynamicModule['imports'];
  readonly inject?: InjectionToken[];
  readonly useFactory: (
    ...args: unknown[]
  ) =>
    | ResourceForgeModuleOptions
    | Promise<ResourceForgeModuleOptions>;
}

function hostingFailureMessage(error: HostingError): string {
  return `Resource Forge Nest hosting failed: ${error.code}`;
}

async function hostRegistry(explorer: HostingExplorer) {
  const registry = createInMemoryResourceRegistry();
  const discovered = await explorer.discoverResources();
  if (!discovered.ok) {
    throw new Error(hostingFailureMessage(discovered.error));
  }
  const hosted = runHostingLifecycle(discovered.value, registry);
  if (!hosted.ok) {
    throw new Error(hostingFailureMessage(hosted.error));
  }
  return registry;
}

@Module({})
export class ResourceForgeModule {
  static forRoot(): DynamicModule {
    return {
      module: ResourceForgeModule,
      imports: [DiscoveryModule],
      providers: [
        HostingExplorer,
        {
          provide: RESOURCE_REGISTRY,
          useFactory: async (explorer: HostingExplorer) => hostRegistry(explorer),
          inject: [HostingExplorer],
        },
      ],
      exports: [RESOURCE_REGISTRY],
    };
  }

  static forRootAsync(options: ResourceForgeModuleAsyncOptions): DynamicModule {
    return {
      module: ResourceForgeModule,
      imports: [DiscoveryModule, ...(options.imports ?? [])],
      providers: [
        {
          provide: RESOURCE_FORGE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        HostingExplorer,
        {
          provide: RESOURCE_REGISTRY,
          useFactory: async (
            explorer: HostingExplorer,
            _options: ResourceForgeModuleOptions,
          ) => hostRegistry(explorer),
          inject: [HostingExplorer, RESOURCE_FORGE_OPTIONS],
        },
      ],
      exports: [RESOURCE_REGISTRY],
    };
  }
}
