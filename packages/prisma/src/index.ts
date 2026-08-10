/**
 * @resource-forge/prisma
 *
 * Prisma correspondence verification + schema realization for Resource Forge
 * (RFC-033 / RFC-034). Depends on @resource-forge/core only.
 * Must not depend on Nest or GraphQL. Must not require Prisma Client/CLI for emit.
 */
import { PACKAGE_NAME as CORE_PACKAGE_NAME } from '@resource-forge/core';

export const PACKAGE_NAME = '@resource-forge/prisma' as const;
export const PACKAGE_VERSION = '0.0.0' as const;

/** Ensures the workspace dependency on core resolves at build time. */
export const CORE_DEPENDENCY = CORE_PACKAGE_NAME;

export { emitPrismaSchema } from './emit.js';
export type {
  EmitError,
  EmitErrorCode,
} from './emit-errors.js';
export type {
  EmitOptions,
  EmitSuccess,
  InstanceIdentity,
  JoinOverlay,
  PrismaRealizationMapping,
} from './realization.js';
export { toVerificationMapping } from './emit-model.js';
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
