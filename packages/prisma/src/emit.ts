import type { Resource, Result } from '@resource-forge/core';
import type { EmitError } from './emit-errors.js';
import {
  buildEmitModel,
  deriveDmmf,
  renderModelsSdl,
} from './emit-model.js';
import type {
  EmitOptions,
  EmitSuccess,
  PrismaRealizationMapping,
} from './realization.js';

/**
 * Realize a Resource unit as Prisma model semantics + derived DMMF-shaped view.
 * RFC-034. Does not call verifyPrismaCorrespondence; does not require Prisma Client/CLI.
 */
export function emitPrismaSchema(
  resources: readonly Resource[],
  realization: PrismaRealizationMapping,
  options?: EmitOptions,
): Result<EmitSuccess, EmitError> {
  const emitModel = buildEmitModel(resources, realization);
  if (!emitModel.ok) {
    return emitModel;
  }

  const models = renderModelsSdl(emitModel.value);
  const dmmf = deriveDmmf(emitModel.value);

  if (options?.preamble !== undefined) {
    return {
      ok: true,
      value: { models, preamble: options.preamble, dmmf },
    };
  }
  return { ok: true, value: { models, dmmf } };
}
