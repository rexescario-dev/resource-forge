import {
  resourceIdentitiesEqual,
  type Resource,
  type Result,
} from '@resource-forge/core';
import { correspondenceError, type CorrespondenceError } from './errors.js';
import type { ResolvedMapping } from './mapping.js';
import { identityKey } from './mapping.js';
import type { ConsumedModelGraph } from './model-graph.js';
import type { RelationCorrespondence } from './report.js';

function findResource(
  resources: readonly Resource[],
  identity: Resource['identity'],
): Resource | undefined {
  return resources.find((r) => resourceIdentitiesEqual(r.identity, identity));
}

export function verifyRelationTargets(
  resources: readonly Resource[],
): Result<undefined, CorrespondenceError> {
  for (const resource of resources) {
    for (const rel of resource.schema.relations) {
      if (findResource(resources, rel.target) === undefined) {
        return {
          ok: false,
          error: correspondenceError(
            'missing_relation_target',
            `Relation ${resource.identity.namespace}/${resource.identity.name}.${rel.name} target ${rel.target.namespace}/${rel.target.name} not in verification unit`,
          ),
        };
      }
    }
  }
  return { ok: true, value: undefined };
}

export function verifyRelations(
  resources: readonly Resource[],
  graph: ConsumedModelGraph,
  resolved: ResolvedMapping,
): Result<readonly RelationCorrespondence[], CorrespondenceError> {
  const out: RelationCorrespondence[] = [];

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

    const targetResource = (target: Resource['identity']) =>
      findResource(resources, target);

    for (const rel of resource.schema.relations) {
      const prismaRelationName = rm.relationNames.get(rel.name) ?? rel.name;
      const pf = model.fields.get(prismaRelationName);
      if (pf === undefined || pf.kind !== 'relation') {
        return {
          ok: false,
          error: correspondenceError(
            'missing_relation_field',
            `Missing Prisma relation ${rm.prismaModelName}.${prismaRelationName} for Relation ${rel.name}`,
          ),
        };
      }

      const target = targetResource(rel.target);
      if (target === undefined) {
        return {
          ok: false,
          error: correspondenceError(
            'missing_relation_target',
            `Relation ${rel.name} target not in unit`,
          ),
        };
      }

      const targetKey = identityKey(target.identity);
      const targetRm = resolved.byIdentityKey.get(targetKey);
      if (targetRm === undefined) {
        return {
          ok: false,
          error: correspondenceError(
            'mapping_collision',
            `Missing resolved mapping for target ${targetKey}`,
          ),
        };
      }

      if (pf.targetModelName !== targetRm.prismaModelName) {
        return {
          ok: false,
          error: correspondenceError(
            'missing_relation_field',
            `Prisma relation ${prismaRelationName} targets ${pf.targetModelName}, expected ${targetRm.prismaModelName}`,
          ),
        };
      }

      if (rel.multiplicity === 'one' && pf.list) {
        return {
          ok: false,
          error: correspondenceError(
            'multiplicity_mismatch',
            `Relation ${rel.name} multiplicity one requires singular Prisma relation`,
          ),
        };
      }
      if (rel.multiplicity === 'many' && !pf.list) {
        return {
          ok: false,
          error: correspondenceError(
            'multiplicity_mismatch',
            `Relation ${rel.name} multiplicity many requires list Prisma relation`,
          ),
        };
      }

      if (rel.nullable && !pf.nullCapable) {
        return {
          ok: false,
          error: correspondenceError(
            'incompatible_nullability',
            `Relation ${rel.name} nullable=true requires null-capable Prisma relation`,
          ),
        };
      }
      if (!rel.nullable && pf.nullCapable) {
        return {
          ok: false,
          error: correspondenceError(
            'incompatible_nullability',
            `Relation ${rel.name} nullable=false requires non-null Prisma relation`,
          ),
        };
      }

      // direction: consumed; same Prisma evidence already checked (owner relation → target model)

      if (rel.inverse !== undefined) {
        const counterpart = target.schema.relations.find(
          (r) => r.name === rel.inverse,
        );
        if (counterpart === undefined) {
          return {
            ok: false,
            error: correspondenceError(
              'inverse_unrealized',
              `Inverse ${rel.inverse} not found on target Resource ${targetKey}`,
            ),
          };
        }
        const targetModel = graph.models.get(targetRm.prismaModelName);
        const inversePrismaName =
          targetRm.relationNames.get(counterpart.name) ?? counterpart.name;
        const inverseField = targetModel?.fields.get(inversePrismaName);
        if (inverseField === undefined || inverseField.kind !== 'relation') {
          return {
            ok: false,
            error: correspondenceError(
              'inverse_unrealized',
              `Inverse Relation ${counterpart.name} has no Prisma relation ${targetRm.prismaModelName}.${inversePrismaName}`,
            ),
          };
        }
      }

      if (rel.join !== undefined) {
        const localPrisma =
          rm.fieldNames.get(rel.join.local) ?? rel.join.local;
        const remotePrisma =
          targetRm.fieldNames.get(rel.join.remote) ?? rel.join.remote;
        if (
          pf.relationFromFields.length !== 1 ||
          pf.relationToFields.length !== 1 ||
          pf.relationFromFields[0] !== localPrisma ||
          pf.relationToFields[0] !== remotePrisma
        ) {
          return {
            ok: false,
            error: correspondenceError(
              'join_unrealized',
              `Join { local: ${rel.join.local}, remote: ${rel.join.remote} } not realized as owner-side fromFields=[${localPrisma}] toFields=[${remotePrisma}]`,
            ),
          };
        }
      }

      out.push({
        resourceIdentity: resource.identity,
        relationName: rel.name,
        prismaRelationName,
        targetIdentity: rel.target,
        prismaTargetModelName: targetRm.prismaModelName,
        multiplicity: rel.multiplicity,
      });
    }
  }

  return { ok: true, value: out };
}
