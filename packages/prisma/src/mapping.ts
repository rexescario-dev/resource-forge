import type { Resource, ResourceIdentity, Result } from '@resource-forge/core';
import { correspondenceError, type CorrespondenceError } from './errors.js';

export type PrismaResourceMapping = {
  readonly models?: Readonly<Record<string, string>>;
  readonly fields?: Readonly<
    Record<string, Readonly<Record<string, string>>>
  >;
  readonly relations?: Readonly<
    Record<string, Readonly<Record<string, string>>>
  >;
};

export type ResolvedResourceMapping = {
  readonly identity: ResourceIdentity;
  readonly prismaModelName: string;
  readonly fieldNames: ReadonlyMap<string, string>;
  readonly relationNames: ReadonlyMap<string, string>;
};

export type ResolvedMapping = {
  readonly byIdentityKey: ReadonlyMap<string, ResolvedResourceMapping>;
};

export function identityKey(identity: ResourceIdentity): string {
  return `${identity.namespace}/${identity.name}`;
}

export function resolveCorrespondenceMapping(
  resources: readonly Resource[],
  mapping?: PrismaResourceMapping,
): Result<ResolvedMapping, CorrespondenceError> {
  const byIdentityKey = new Map<string, ResolvedResourceMapping>();
  const modelOwners = new Map<string, string>();

  for (const resource of resources) {
    const key = identityKey(resource.identity);
    const modelOverride = mapping?.models?.[key];
    if (modelOverride !== undefined && modelOverride.trim() === '') {
      return {
        ok: false,
        error: correspondenceError(
          'mapping_collision',
          `Empty model mapping for ${key}`,
        ),
      };
    }
    const prismaModelName = modelOverride ?? resource.identity.name;

    const priorOwner = modelOwners.get(prismaModelName);
    if (priorOwner !== undefined) {
      return {
        ok: false,
        error: correspondenceError(
          'mapping_collision',
          `Resources ${priorOwner} and ${key} both resolve to Prisma model ${prismaModelName}`,
        ),
      };
    }
    modelOwners.set(prismaModelName, key);

    const fieldNames = new Map<string, string>();
    const relationNames = new Map<string, string>();
    const memberToPrisma = new Map<string, string>();

    const fieldOverrides = mapping?.fields?.[key];
    for (const f of resource.schema.fields) {
      const override = fieldOverrides?.[f.name];
      if (override !== undefined && override.trim() === '') {
        return {
          ok: false,
          error: correspondenceError(
            'mapping_collision',
            `Empty field mapping for ${key}.${f.name}`,
          ),
        };
      }
      const prismaName = override ?? f.name;
      const clash = memberToPrisma.get(prismaName);
      if (clash !== undefined) {
        return {
          ok: false,
          error: correspondenceError(
            'mapping_collision',
            `Members ${clash} and Field ${f.name} on ${key} both resolve to Prisma name ${prismaName}`,
          ),
        };
      }
      memberToPrisma.set(prismaName, `Field ${f.name}`);
      fieldNames.set(f.name, prismaName);
    }

    const relationOverrides = mapping?.relations?.[key];
    for (const r of resource.schema.relations) {
      const override = relationOverrides?.[r.name];
      if (override !== undefined && override.trim() === '') {
        return {
          ok: false,
          error: correspondenceError(
            'mapping_collision',
            `Empty relation mapping for ${key}.${r.name}`,
          ),
        };
      }
      const prismaName = override ?? r.name;
      const clash = memberToPrisma.get(prismaName);
      if (clash !== undefined) {
        return {
          ok: false,
          error: correspondenceError(
            'mapping_collision',
            `Members ${clash} and Relation ${r.name} on ${key} both resolve to Prisma name ${prismaName}`,
          ),
        };
      }
      memberToPrisma.set(prismaName, `Relation ${r.name}`);
      relationNames.set(r.name, prismaName);
    }

    byIdentityKey.set(key, {
      identity: resource.identity,
      prismaModelName,
      fieldNames,
      relationNames,
    });
  }

  return { ok: true, value: { byIdentityKey } };
}
