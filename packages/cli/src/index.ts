/**
 * @resource-forge/cli
 *
 * TODO: CLI commands such as `rf init`, `rf generate resource`, and `rf generate from-prisma`.
 *
 * Depends on @resource-forge/core only.
 */
import { PACKAGE_NAME as CORE_PACKAGE_NAME } from '@resource-forge/core';

export const PACKAGE_NAME = '@resource-forge/cli' as const;
export const PACKAGE_VERSION = '0.0.0' as const;

/** Ensures the workspace dependency on core resolves at build time. */
export const CORE_DEPENDENCY = CORE_PACKAGE_NAME;
