/**
 * @resource-forge/core
 *
 * Core contracts for Resource Forge. Must not depend on NestJS, Prisma, or GraphQL.
 */
export const PACKAGE_NAME = '@resource-forge/core' as const;
export const PACKAGE_VERSION = '0.0.0' as const;

export type { Err, Ok, Result } from './result.js';
export { err, ok } from './result.js';
