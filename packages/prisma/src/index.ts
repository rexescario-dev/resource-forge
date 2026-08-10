/**
 * @resource-forge/prisma
 *
 * Prisma correspondence verification for Resource Forge (RFC-033).
 * Depends on @resource-forge/core only. Must not depend on Nest or GraphQL.
 */
import { PACKAGE_NAME as CORE_PACKAGE_NAME } from '@resource-forge/core';

export const PACKAGE_NAME = '@resource-forge/prisma' as const;
export const PACKAGE_VERSION = '0.0.0' as const;

/** Ensures the workspace dependency on core resolves at build time. */
export const CORE_DEPENDENCY = CORE_PACKAGE_NAME;

export { verifyPrismaCorrespondence } from './verify.js';
export type { PrismaResourceMapping } from './mapping.js';
export type {
  CorrespondenceError,
  CorrespondenceErrorCode,
} from './errors.js';
export type {
  CorrespondenceReport,
  FieldCorrespondence,
  RelationCorrespondence,
  ResourceCorrespondence,
} from './report.js';
