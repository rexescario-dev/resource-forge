import type { Resource, Result } from '@resource-forge/core';
import { correspondenceError, type CorrespondenceError } from './errors.js';
import type { ResolvedMapping } from './mapping.js';
import { identityKey } from './mapping.js';
import type { ConsumedModelGraph } from './model-graph.js';
import type { FieldCorrespondence } from './report.js';

const NUMBER_TYPES = new Set(['Int', 'Float', 'Decimal']);

function allowedScalarTypes(fieldType: string): ReadonlySet<string> {
  if (fieldType === 'string') return new Set(['String']);
  if (fieldType === 'boolean') return new Set(['Boolean']);
  if (fieldType === 'number') return NUMBER_TYPES;
  return new Set();
}

export function verifyFields(
  resources: readonly Resource[],
  graph: ConsumedModelGraph,
  resolved: ResolvedMapping,
): Result<readonly FieldCorrespondence[], CorrespondenceError> {
  const out: FieldCorrespondence[] = [];

  for (const resource of resources) {
    const key = identityKey(resource.identity);
    const rm = resolved.byIdentityKey.get(key);
    if (rm === undefined) {
      return {
        ok: false,
        error: correspondenceError(
          'mapping_collision',
          `Missing resolved mapping for ${key}`,
        ),
      };
    }

    const model = graph.models.get(rm.prismaModelName);
    if (model === undefined) {
      return {
        ok: false,
        error: correspondenceError(
          'missing_model',
          `Prisma model ${rm.prismaModelName} not found for ${key}`,
        ),
      };
    }

    for (const f of resource.schema.fields) {
      const prismaFieldName = rm.fieldNames.get(f.name) ?? f.name;
      const pf = model.fields.get(prismaFieldName);
      if (pf === undefined) {
        return {
          ok: false,
          error: correspondenceError(
            'missing_scalar_field',
            `Missing Prisma scalar ${rm.prismaModelName}.${prismaFieldName} for Field ${f.name}`,
          ),
        };
      }
      if (pf.kind !== 'scalar') {
        return {
          ok: false,
          error: correspondenceError(
            'missing_scalar_field',
            `Prisma field ${rm.prismaModelName}.${prismaFieldName} is a relation, not a scalar`,
          ),
        };
      }

      const allowed = allowedScalarTypes(f.type);
      if (!allowed.has(pf.type)) {
        return {
          ok: false,
          error: correspondenceError(
            'incompatible_scalar_type',
            `Field ${f.name} type ${f.type} incompatible with Prisma ${pf.type}`,
          ),
        };
      }

      if (f.nullable && !pf.nullCapable) {
        return {
          ok: false,
          error: correspondenceError(
            'incompatible_nullability',
            `Field ${f.name} nullable=true requires null-capable Prisma scalar`,
          ),
        };
      }
      if (!f.nullable && pf.nullCapable) {
        return {
          ok: false,
          error: correspondenceError(
            'incompatible_nullability',
            `Field ${f.name} nullable=false requires non-null Prisma scalar`,
          ),
        };
      }

      out.push({
        resourceIdentity: resource.identity,
        fieldName: f.name,
        prismaFieldName,
        prismaScalarType: pf.type,
      });
    }
  }

  return { ok: true, value: out };
}
