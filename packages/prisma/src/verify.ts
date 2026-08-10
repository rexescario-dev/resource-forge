import {
  validateResource,
  type Resource,
  type Result,
} from '@resource-forge/core';
import { correspondenceError, type CorrespondenceError } from './errors.js';
import { verifyFields } from './fields.js';
import {
  resolveCorrespondenceMapping,
  type PrismaResourceMapping,
} from './mapping.js';
import { normalizeDmmf } from './model-graph.js';
import type { CorrespondenceReport } from './report.js';
import {
  verifyRelationTargets,
  verifyRelations,
} from './relations.js';

/**
 * Verify Resource→Prisma correspondence against a DMMF-shaped document.
 * Atomic success or fail-closed failure (RFC-033 §6–§7).
 */
export function verifyPrismaCorrespondence(
  resources: readonly Resource[],
  dmmf: unknown,
  mapping?: PrismaResourceMapping,
): Result<CorrespondenceReport, CorrespondenceError> {
  // 1. Reject empty unit
  if (resources.length === 0) {
    return {
      ok: false,
      error: correspondenceError(
        'empty_verification_unit',
        'Verification unit contains zero Resources',
      ),
    };
  }

  // 2. validateResource for every Resource
  for (const resource of resources) {
    const validated = validateResource(resource);
    if (!validated.ok) {
      return {
        ok: false,
        error: correspondenceError(
          'invalid_resource',
          `Resource ${resource.identity.namespace}/${resource.identity.name} failed validateResource`,
          validated.error,
        ),
      };
    }
  }

  // 3. Resolve and validate host mapping
  const resolved = resolveCorrespondenceMapping(resources, mapping);
  if (!resolved.ok) {
    return resolved;
  }

  // normalizeDmmf after stages 1–3, before stage 4
  const graph = normalizeDmmf(dmmf);
  if (!graph.ok) {
    return graph;
  }

  // 4. Resolve Resource identities → Prisma models
  const resourcesOut: CorrespondenceReport['resources'][number][] = [];
  for (const resource of resources) {
    const key = `${resource.identity.namespace}/${resource.identity.name}`;
    const rm = resolved.value.byIdentityKey.get(key);
    if (rm === undefined) {
      return {
        ok: false,
        error: correspondenceError(
          'mapping_collision',
          `Missing resolved mapping for ${key}`,
        ),
      };
    }
    if (!graph.value.models.has(rm.prismaModelName)) {
      return {
        ok: false,
        error: correspondenceError(
          'missing_model',
          `Prisma model ${rm.prismaModelName} not found for ${key}`,
        ),
      };
    }
    resourcesOut.push({
      resourceIdentity: resource.identity,
      prismaModelName: rm.prismaModelName,
    });
  }

  // 5. Verify Fields
  const fields = verifyFields(resources, graph.value, resolved.value);
  if (!fields.ok) {
    return fields;
  }

  // 6. Verify Relation target in-unit closure
  const targets = verifyRelationTargets(resources);
  if (!targets.ok) {
    return targets;
  }

  // 7. Verify Relation topology
  const relations = verifyRelations(resources, graph.value, resolved.value);
  if (!relations.ok) {
    return relations;
  }

  // 8. Emit CorrespondenceReport
  return {
    ok: true,
    value: {
      resources: resourcesOut,
      fields: fields.value,
      relations: relations.value,
    },
  };
}
