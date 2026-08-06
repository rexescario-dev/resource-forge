/**
 * @resource-forge/nest
 *
 * TODO: NestJS dynamic module, decorators, discovery, and dependency injection.
 *
 * Depends on @resource-forge/core only. Must not depend on graphql or prisma packages.
 */
import { PACKAGE_NAME as CORE_PACKAGE_NAME } from '@resource-forge/core';

export const PACKAGE_NAME = '@resource-forge/nest' as const;
export const PACKAGE_VERSION = '0.0.0' as const;

/** Ensures the workspace dependency on core resolves at build time. */
export const CORE_DEPENDENCY = CORE_PACKAGE_NAME;
