/**
 * @resource-forge/nest
 *
 * Nest discovery-first host for Resource Forge (RFC-031).
 * Depends on @resource-forge/core only among Resource Forge packages.
 */
import { PACKAGE_NAME as CORE_PACKAGE_NAME } from '@resource-forge/core';

export const PACKAGE_NAME = '@resource-forge/nest' as const;
export const PACKAGE_VERSION = '0.0.0' as const;

/** Ensures the workspace dependency on core resolves at build time. */
export const CORE_DEPENDENCY = CORE_PACKAGE_NAME;

export { RESOURCE_REGISTRY } from './tokens.js';
export {
  DISCOVERABLE_RESOURCE_METADATA,
  DiscoverableResource,
} from './discoverable.decorator.js';
export {
  awaitProvidedResource,
  isResourceDeclarationProvider,
  type ResourceDeclarationProvider,
} from './resource-declaration.js';
export {
  runHostingLifecycle,
  type HostingError,
} from './hosting-lifecycle.js';
export { HostingExplorer } from './hosting.explorer.js';
export {
  ResourceForgeModule,
  type ResourceForgeModuleAsyncOptions,
  type ResourceForgeModuleOptions,
} from './resource-forge.module.js';
