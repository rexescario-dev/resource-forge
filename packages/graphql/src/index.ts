/**
 * @resource-forge/graphql
 *
 * TODO: GraphQL schema generation, resolvers, and GraphQL metadata.
 *
 * Depends on @resource-forge/core only. Must not depend on @resource-forge/prisma.
 */
import { PACKAGE_NAME as CORE_PACKAGE_NAME } from '@resource-forge/core';

export const PACKAGE_NAME = '@resource-forge/graphql' as const;
export const PACKAGE_VERSION = '0.0.0' as const;

/** Ensures the workspace dependency on core resolves at build time. */
export const CORE_DEPENDENCY = CORE_PACKAGE_NAME;
