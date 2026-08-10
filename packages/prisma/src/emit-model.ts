import {
  resourceIdentitiesEqual,
  validateResource,
  type Field,
  type Relation,
  type Resource,
  type Result,
} from '@resource-forge/core';
import { emitError, type EmitError } from './emit-errors.js';
import { identityKey } from './mapping.js';
import type {
  IdentityDefaultKind,
  InstanceIdentity,
  NumberOverlayScalar,
  PrismaRealizationMapping,
} from './realization.js';

export type EmitScalarMember = {
  readonly name: string;
  readonly type: string;
  readonly nullCapable: boolean;
  readonly isId: boolean;
  readonly defaultKind?: IdentityDefaultKind;
  readonly isPrismaExtra: boolean;
};

export type EmitRelationMember = {
  readonly name: string;
  readonly targetModelName: string;
  readonly isList: boolean;
  readonly nullCapable: boolean;
  readonly relationFromFields: readonly string[];
  readonly relationToFields: readonly string[];
};

export type EmitPrismaModel = {
  readonly name: string;
  readonly scalars: readonly EmitScalarMember[];
  readonly relations: readonly EmitRelationMember[];
};

export type EmitModel = {
  readonly models: readonly EmitPrismaModel[];
};

type ResolvedNames = {
  readonly prismaModelName: string;
  readonly fieldNames: ReadonlyMap<string, string>;
  readonly relationNames: ReadonlyMap<string, string>;
};

type ResolvedResource = {
  readonly resource: Resource;
  readonly key: string;
  readonly identity: InstanceIdentity;
  readonly names: ResolvedNames;
  readonly fieldScalars: ReadonlyMap<string, string>;
};

function findResource(
  resources: readonly Resource[],
  identity: Resource['identity'],
): Resource | undefined {
  return resources.find((r) => resourceIdentitiesEqual(r.identity, identity));
}

function resolveFieldPrismaScalar(
  field: Field,
  overlay: NumberOverlayScalar | undefined,
): Result<string, EmitError> {
  if (field.type === 'string') return { ok: true, value: 'String' };
  if (field.type === 'boolean') return { ok: true, value: 'Boolean' };
  if (field.type === 'number') {
    if (overlay === undefined) return { ok: true, value: 'Float' };
    if (overlay === 'Int' || overlay === 'Float' || overlay === 'Decimal') {
      return { ok: true, value: overlay };
    }
    return {
      ok: false,
      error: emitError(
        'invalid_number_overlay',
        `Invalid number overlay ${String(overlay)} for Field ${field.name}`,
      ),
    };
  }
  return {
    ok: false,
    error: emitError(
      'emit_model_failure',
      `Unsupported Field type ${field.type} for ${field.name}`,
    ),
  };
}

function validateIdentityDefault(
  scalar: string,
  defaultKind: IdentityDefaultKind | undefined,
  context: string,
): Result<undefined, EmitError> {
  if (defaultKind === undefined) return { ok: true, value: undefined };
  if (
    defaultKind !== 'cuid' &&
    defaultKind !== 'uuid' &&
    defaultKind !== 'autoincrement'
  ) {
    return {
      ok: false,
      error: emitError(
        'invalid_identity_default',
        `Unsupported identity default for ${context}`,
      ),
    };
  }
  if (
    (defaultKind === 'cuid' || defaultKind === 'uuid') &&
    scalar !== 'String'
  ) {
    return {
      ok: false,
      error: emitError(
        'invalid_identity_default',
        `${defaultKind} requires String for ${context}`,
      ),
    };
  }
  if (defaultKind === 'autoincrement' && scalar !== 'Int') {
    return {
      ok: false,
      error: emitError(
        'invalid_identity_default',
        `autoincrement requires Int for ${context}`,
      ),
    };
  }
  return { ok: true, value: undefined };
}

function resolveNames(
  resources: readonly Resource[],
  realization: PrismaRealizationMapping,
): Result<Map<string, ResolvedNames>, EmitError> {
  const byKey = new Map<string, ResolvedNames>();
  const modelOwners = new Map<string, string>();

  for (const resource of resources) {
    const key = identityKey(resource.identity);
    const modelOverride = realization.models?.[key];
    if (modelOverride !== undefined && modelOverride.trim() === '') {
      return {
        ok: false,
        error: emitError('mapping_collision', `Empty model mapping for ${key}`),
      };
    }
    const prismaModelName = modelOverride ?? resource.identity.name;
    const prior = modelOwners.get(prismaModelName);
    if (prior !== undefined) {
      return {
        ok: false,
        error: emitError(
          'mapping_collision',
          `Resources ${prior} and ${key} both resolve to Prisma model ${prismaModelName}`,
        ),
      };
    }
    modelOwners.set(prismaModelName, key);

    const fieldNames = new Map<string, string>();
    const relationNames = new Map<string, string>();
    const memberToPrisma = new Map<string, string>();

    const fieldOverrides = realization.fields?.[key];
    for (const f of resource.schema.fields) {
      const override = fieldOverrides?.[f.name];
      if (override !== undefined && override.trim() === '') {
        return {
          ok: false,
          error: emitError(
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
          error: emitError(
            'mapping_collision',
            `Members ${clash} and Field ${f.name} on ${key} both resolve to Prisma name ${prismaName}`,
          ),
        };
      }
      memberToPrisma.set(prismaName, `Field ${f.name}`);
      fieldNames.set(f.name, prismaName);
    }

    const relationOverrides = realization.relations?.[key];
    for (const r of resource.schema.relations) {
      const override = relationOverrides?.[r.name];
      if (override !== undefined && override.trim() === '') {
        return {
          ok: false,
          error: emitError(
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
          error: emitError(
            'mapping_collision',
            `Members ${clash} and Relation ${r.name} on ${key} both resolve to Prisma name ${prismaName}`,
          ),
        };
      }
      memberToPrisma.set(prismaName, `Relation ${r.name}`);
      relationNames.set(r.name, prismaName);
    }

    byKey.set(key, { prismaModelName, fieldNames, relationNames });
  }

  return { ok: true, value: byKey };
}

type PairKey = string;

function unorderedModelPair(a: string, b: string): PairKey {
  return a <= b ? `${a}::${b}` : `${b}::${a}`;
}

type RelationPair = {
  readonly aKey: string;
  readonly aRel: Relation;
  readonly bKey: string;
  readonly bRel: Relation;
};

function collectPairs(
  resources: readonly Resource[],
  resolved: ReadonlyMap<string, ResolvedResource>,
): Result<readonly RelationPair[], EmitError> {
  const pairs: RelationPair[] = [];
  const seen = new Set<string>();

  for (const resource of resources) {
    const aKey = identityKey(resource.identity);
    const aResolved = resolved.get(aKey);
    if (aResolved === undefined) {
      return {
        ok: false,
        error: emitError('emit_model_failure', `Missing resolved ${aKey}`),
      };
    }

    for (const rel of resource.schema.relations) {
      if (rel.multiplicity === 'many' && rel.nullable) {
        return {
          ok: false,
          error: emitError(
            'many_nullable_unrealizable',
            `Relation ${aKey}.${rel.name} many+nullable cannot be realized as Prisma list`,
          ),
        };
      }

      const target = findResource(resources, rel.target);
      if (target === undefined) {
        return {
          ok: false,
          error: emitError(
            'missing_relation_target',
            `Relation ${aKey}.${rel.name} target not in emission unit`,
          ),
        };
      }

      if (rel.inverse === undefined) {
        return {
          ok: false,
          error: emitError(
            'unilateral_relation',
            `Relation ${aKey}.${rel.name} has no inverse; non-pairable for Prisma topology (no inferred counterpart)`,
          ),
        };
      }

      const counterpart = target.schema.relations.find(
        (r) => r.name === rel.inverse,
      );
      if (counterpart === undefined) {
        return {
          ok: false,
          error: emitError(
            'inverse_unrealized',
            `Inverse ${rel.inverse} not found on target for ${aKey}.${rel.name}`,
          ),
        };
      }

      // Counterpart must target back (basic pairing sanity)
      if (
        !resourceIdentitiesEqual(counterpart.target, resource.identity)
      ) {
        return {
          ok: false,
          error: emitError(
            'inverse_unrealized',
            `Inverse ${rel.inverse} on target does not target ${aKey}`,
          ),
        };
      }

      if (
        counterpart.inverse !== undefined &&
        counterpart.inverse !== rel.name
      ) {
        return {
          ok: false,
          error: emitError(
            'inverse_unrealized',
            `Inverse mismatch between ${aKey}.${rel.name} and ${identityKey(target.identity)}.${counterpart.name}`,
          ),
        };
      }

      if (counterpart.multiplicity === 'many' && counterpart.nullable) {
        return {
          ok: false,
          error: emitError(
            'many_nullable_unrealizable',
            `Relation ${identityKey(target.identity)}.${counterpart.name} many+nullable cannot be realized`,
          ),
        };
      }

      const bKey = identityKey(target.identity);
      const pairId = [aKey, rel.name, bKey, counterpart.name].sort().join('|');
      if (seen.has(pairId)) continue;
      seen.add(pairId);

      pairs.push({
        aKey,
        aRel: rel,
        bKey,
        bRel: counterpart,
      });
    }
  }

  return { ok: true, value: pairs };
}

type ResolvedJoin = {
  readonly owningKey: string;
  readonly owningRel: Relation;
  readonly localField: string;
  readonly localPrisma: string;
  readonly remotePrisma: string;
  readonly remoteScalar: string;
};

function resolveJoinForPair(
  pair: RelationPair,
  resolved: ReadonlyMap<string, ResolvedResource>,
  realization: PrismaRealizationMapping,
): Result<ResolvedJoin, EmitError> {
  const a = resolved.get(pair.aKey)!;
  const b = resolved.get(pair.bKey)!;

  type Candidate = {
    owningKey: string;
    owningRel: Relation;
    local: string;
    remote: string | { readonly prismaExtra: true };
    source: 'join' | 'overlay';
  };

  const candidates: Candidate[] = [];

  for (const side of [
    { key: pair.aKey, rel: pair.aRel, res: a },
    { key: pair.bKey, rel: pair.bRel, res: b },
  ] as const) {
    if (side.rel.join !== undefined) {
      candidates.push({
        owningKey: side.key,
        owningRel: side.rel,
        local: side.rel.join.local,
        remote: side.rel.join.remote,
        source: 'join',
      });
    }
    const overlay = realization.joinOverlays?.[side.key]?.[side.rel.name];
    if (overlay !== undefined) {
      candidates.push({
        owningKey: overlay.owningResourceKey,
        owningRel:
          overlay.owningResourceKey === pair.aKey
            ? pair.aRel
            : overlay.owningResourceKey === pair.bKey
              ? pair.bRel
              : side.rel,
        local: overlay.local,
        remote: overlay.remote,
        source: 'overlay',
      });
      // Prefer overlay's explicit owningRelation name
      if (overlay.owningResourceKey === pair.aKey) {
        if (overlay.owningRelation !== pair.aRel.name) {
          return {
            ok: false,
            error: emitError(
              'join_ownership_conflict',
              `Join overlay owningRelation ${overlay.owningRelation} does not match ${pair.aRel.name}`,
            ),
          };
        }
      } else if (overlay.owningResourceKey === pair.bKey) {
        if (overlay.owningRelation !== pair.bRel.name) {
          return {
            ok: false,
            error: emitError(
              'join_ownership_conflict',
              `Join overlay owningRelation ${overlay.owningRelation} does not match ${pair.bRel.name}`,
            ),
          };
        }
      } else {
        return {
          ok: false,
          error: emitError(
            'join_ownership_conflict',
            `Join overlay owningResourceKey ${overlay.owningResourceKey} is not a pair participant`,
          ),
        };
      }
      const last = candidates[candidates.length - 1]!;
      last.owningKey = overlay.owningResourceKey;
      last.owningRel =
        overlay.owningResourceKey === pair.aKey ? pair.aRel : pair.bRel;
    }
  }

  if (candidates.length === 0) {
    return {
      ok: false,
      error: emitError(
        'join_unrealized',
        `No Resource join or host join overlay for pair ${pair.aKey}.${pair.aRel.name} ↔ ${pair.bKey}.${pair.bRel.name}`,
      ),
    };
  }

  // Normalize ownership: prefer Resource join on a side; overlays must agree
  const normalized: Array<{
    owningKey: string;
    owningRel: Relation;
    local: string;
    remote: string | { readonly prismaExtra: true };
  }> = [];

  for (const c of candidates) {
    if (c.source === 'join') {
      normalized.push({
        owningKey: c.owningKey,
        owningRel: c.owningRel,
        local: c.local,
        remote: c.remote,
      });
    } else {
      normalized.push({
        owningKey: c.owningKey,
        owningRel: c.owningRel,
        local: c.local,
        remote: c.remote,
      });
    }
  }

  const first = normalized[0]!;
  for (const n of normalized.slice(1)) {
    const sameOwner = n.owningKey === first.owningKey;
    const sameRel = n.owningRel.name === first.owningRel.name;
    const sameLocal = n.local === first.local;
    const sameRemote =
      typeof n.remote === 'string' && typeof first.remote === 'string'
        ? n.remote === first.remote
        : typeof n.remote !== 'string' &&
          typeof first.remote !== 'string' &&
          n.remote.prismaExtra === true &&
          first.remote.prismaExtra === true;
    if (!(sameOwner && sameRel && sameLocal && sameRemote)) {
      return {
        ok: false,
        error: emitError(
          'join_ownership_conflict',
          `Conflicting join/overlay realizations for ${pair.aKey}.${pair.aRel.name} ↔ ${pair.bKey}.${pair.bRel.name}`,
        ),
      };
    }
  }

  const owning = resolved.get(first.owningKey);
  if (owning === undefined) {
    return {
      ok: false,
      error: emitError(
        'join_unrealized',
        `Owning Resource ${first.owningKey} not resolved`,
      ),
    };
  }

  const targetKey =
    first.owningKey === pair.aKey ? pair.bKey : pair.aKey;
  const target = resolved.get(targetKey)!;

  const localField = owning.resource.schema.fields.find(
    (f) => f.name === first.local,
  );
  if (localField === undefined) {
    return {
      ok: false,
      error: emitError(
        'join_participant_incompatible',
        `Local join Field ${first.local} does not exist on ${first.owningKey}; must not invent FK Fields`,
      ),
    };
  }

  const localPrisma = owning.names.fieldNames.get(first.local) ?? first.local;
  const localScalar = owning.fieldScalars.get(first.local);
  if (localScalar === undefined) {
    return {
      ok: false,
      error: emitError(
        'join_participant_incompatible',
        `Local Field ${first.local} has no resolved scalar`,
      ),
    };
  }

  let remotePrisma: string;
  let remoteScalar: string;

  if (typeof first.remote === 'string') {
    if (target.identity.kind !== 'resourceField') {
      return {
        ok: false,
        error: emitError(
          'join_participant_incompatible',
          `Resource join remote Field ${first.remote} requires target ${targetKey} resourceField identity`,
        ),
      };
    }
    if (target.identity.field !== first.remote) {
      return {
        ok: false,
        error: emitError(
          'join_participant_incompatible',
          `Remote join participant ${first.remote} is not target ${targetKey} instance-identity Field ${target.identity.field}`,
        ),
      };
    }
    remotePrisma =
      target.names.fieldNames.get(first.remote) ?? first.remote;
    remoteScalar = target.fieldScalars.get(first.remote)!;
  } else {
    if (target.identity.kind !== 'prismaExtra') {
      return {
        ok: false,
        error: emitError(
          'join_participant_incompatible',
          `prismaExtra remote overlay requires target ${targetKey} prismaExtra identity`,
        ),
      };
    }
    remotePrisma = target.identity.name;
    remoteScalar = target.identity.scalar;
  }

  if (localScalar !== remoteScalar) {
    return {
      ok: false,
      error: emitError(
        'join_participant_incompatible',
        `Join scalar mismatch local ${localScalar} vs remote ${remoteScalar}`,
      ),
    };
  }

  // FK nullability vs singular owning relation
  if (first.owningRel.multiplicity === 'one') {
    if (first.owningRel.nullable && !localField.nullable) {
      return {
        ok: false,
        error: emitError(
          'relation_nullability_inconsistent',
          `Nullable singular Relation ${first.owningKey}.${first.owningRel.name} requires nullable local FK Field ${first.local}`,
        ),
      };
    }
    if (!first.owningRel.nullable && localField.nullable) {
      return {
        ok: false,
        error: emitError(
          'relation_nullability_inconsistent',
          `Non-null singular Relation ${first.owningKey}.${first.owningRel.name} requires non-null local FK Field ${first.local}`,
        ),
      };
    }
  }

  // Ownership must be on singular side for 1:n (fields/references on many→one owning end)
  const owningIsMany = first.owningRel.multiplicity === 'many';
  if (owningIsMany) {
    return {
      ok: false,
      error: emitError(
        'join_ownership_conflict',
        `FK ownership on collection-side Relation ${first.owningKey}.${first.owningRel.name} is invalid`,
      ),
    };
  }

  return {
    ok: true,
    value: {
      owningKey: first.owningKey,
      owningRel: first.owningRel,
      localField: first.local,
      localPrisma,
      remotePrisma,
      remoteScalar,
    },
  };
}

function checkTopology(pair: RelationPair): Result<undefined, EmitError> {
  const a = pair.aRel.multiplicity;
  const b = pair.bRel.multiplicity;
  if (a === 'one' && b === 'one') {
    return {
      ok: false,
      error: emitError(
        'topology_unsupported',
        `FK-realized 1:1 pair ${pair.aKey}.${pair.aRel.name} ↔ ${pair.bKey}.${pair.bRel.name} fails closed (no @unique surface)`,
      ),
    };
  }
  if (a === 'many' && b === 'many') {
    return {
      ok: false,
      error: emitError(
        'topology_unsupported',
        `FK-realized m:n pair ${pair.aKey}.${pair.aRel.name} ↔ ${pair.bKey}.${pair.bRel.name} fails closed`,
      ),
    };
  }
  return { ok: true, value: undefined };
}

/**
 * Build the internal Emit Model (RFC-034). Not exported as public API.
 */
export function buildEmitModel(
  resources: readonly Resource[],
  realization: PrismaRealizationMapping,
): Result<EmitModel, EmitError> {
  if (resources.length === 0) {
    return {
      ok: false,
      error: emitError(
        'empty_emission_unit',
        'Emission unit contains zero Resources',
      ),
    };
  }

  for (const resource of resources) {
    const validated = validateResource(resource);
    if (!validated.ok) {
      return {
        ok: false,
        error: emitError(
          'invalid_resource',
          `Resource ${resource.identity.namespace}/${resource.identity.name} failed validateResource`,
          validated.error,
        ),
      };
    }
  }

  const namesResult = resolveNames(resources, realization);
  if (!namesResult.ok) return namesResult;

  const resolved = new Map<string, ResolvedResource>();

  for (const resource of resources) {
    const key = identityKey(resource.identity);
    const identity = realization.identities[key];
    if (identity === undefined) {
      return {
        ok: false,
        error: emitError(
          'missing_identity',
          `Missing Prisma instance-identity mapping for ${key}`,
        ),
      };
    }

    const names = namesResult.value.get(key)!;
    const fieldScalars = new Map<string, string>();
    const overlays = realization.numberOverlays?.[key];

    for (const f of resource.schema.fields) {
      const overlay = overlays?.[f.name];
      if (overlay !== undefined) {
        if (
          overlay !== 'Int' &&
          overlay !== 'Float' &&
          overlay !== 'Decimal'
        ) {
          return {
            ok: false,
            error: emitError(
              'invalid_number_overlay',
              `Invalid number overlay for ${key}.${f.name}`,
            ),
          };
        }
        if (f.type !== 'number') {
          return {
            ok: false,
            error: emitError(
              'invalid_number_overlay',
              `Number overlay on non-number Field ${key}.${f.name}`,
            ),
          };
        }
      }
      const scalar = resolveFieldPrismaScalar(f, overlay);
      if (!scalar.ok) return scalar;
      fieldScalars.set(f.name, scalar.value);
    }

    // Validate identity
    if (identity.kind === 'resourceField') {
      const f = resource.schema.fields.find((x) => x.name === identity.field);
      if (f === undefined) {
        return {
          ok: false,
          error: emitError(
            'invalid_identity',
            `resourceField identity ${identity.field} not found on ${key}`,
          ),
        };
      }
      if (f.nullable) {
        return {
          ok: false,
          error: emitError(
            'invalid_identity',
            `resourceField identity ${key}.${identity.field} must be nullable: false`,
          ),
        };
      }
      const scalar = fieldScalars.get(identity.field)!;
      if (scalar !== 'String' && scalar !== 'Int') {
        return {
          ok: false,
          error: emitError(
            'invalid_identity_scalar',
            `resourceField identity ${key}.${identity.field} resolves to ${scalar}; @id requires String|Int`,
          ),
        };
      }
      const def = validateIdentityDefault(
        scalar,
        identity.default,
        `${key}.${identity.field}`,
      );
      if (!def.ok) return def;
    } else if (identity.kind === 'prismaExtra') {
      if (identity.scalar !== 'String' && identity.scalar !== 'Int') {
        return {
          ok: false,
          error: emitError(
            'invalid_identity_scalar',
            `prismaExtra.scalar for ${key} must be String|Int`,
          ),
        };
      }
      if (identity.name.trim() === '') {
        return {
          ok: false,
          error: emitError(
            'invalid_identity',
            `prismaExtra name empty for ${key}`,
          ),
        };
      }
      const clash =
        [...names.fieldNames.values()].includes(identity.name) ||
        [...names.relationNames.values()].includes(identity.name);
      if (clash) {
        return {
          ok: false,
          error: emitError(
            'mapping_collision',
            `prismaExtra ${identity.name} collides with a member name on ${key}`,
          ),
        };
      }
      const def = validateIdentityDefault(
        identity.scalar,
        identity.default,
        `${key}.${identity.name}`,
      );
      if (!def.ok) return def;
    } else {
      return {
        ok: false,
        error: emitError(
          'invalid_identity',
          `Unknown identity kind for ${key}`,
        ),
      };
    }

    resolved.set(key, {
      resource,
      key,
      identity,
      names,
      fieldScalars,
    });
  }

  const pairsResult = collectPairs(resources, resolved);
  if (!pairsResult.ok) return pairsResult;
  const pairs = pairsResult.value;

  // Disambiguation: multiple associations between same Prisma model pair
  const modelPairCounts = new Map<string, number>();
  for (const pair of pairs) {
    const aModel = resolved.get(pair.aKey)!.names.prismaModelName;
    const bModel = resolved.get(pair.bKey)!.names.prismaModelName;
    const pk = unorderedModelPair(aModel, bModel);
    modelPairCounts.set(pk, (modelPairCounts.get(pk) ?? 0) + 1);
    if (aModel === bModel) {
      return {
        ok: false,
        error: emitError(
          'disambiguator_required',
          `Self-relation ${pair.aKey}.${pair.aRel.name} requires @relation(name: ...); M4.3.2 does not synthesize disambiguators`,
        ),
      };
    }
  }
  for (const [pk, count] of modelPairCounts) {
    if (count > 1) {
      return {
        ok: false,
        error: emitError(
          'disambiguator_required',
          `Multiple associations between Prisma models ${pk} require @relation(name: ...); M4.3.2 does not synthesize disambiguators`,
        ),
      };
    }
  }

  const joinByPair = new Map<string, ResolvedJoin>();
  for (const pair of pairs) {
    const topo = checkTopology(pair);
    if (!topo.ok) return topo;
    const join = resolveJoinForPair(pair, resolved, realization);
    if (!join.ok) return join;
    const pairId = [pair.aKey, pair.aRel.name, pair.bKey, pair.bRel.name]
      .sort()
      .join('|');
    joinByPair.set(pairId, join.value);
  }

  // Build models
  const models: EmitPrismaModel[] = [];

  for (const resource of resources) {
    const key = identityKey(resource.identity);
    const rr = resolved.get(key)!;
    const scalars: EmitScalarMember[] = [];

    for (const f of resource.schema.fields) {
      const prismaName = rr.names.fieldNames.get(f.name)!;
      const type = rr.fieldScalars.get(f.name)!;
      const isId =
        rr.identity.kind === 'resourceField' &&
        rr.identity.field === f.name;
      const member: EmitScalarMember = {
        name: prismaName,
        type,
        nullCapable: f.nullable,
        isId,
        isPrismaExtra: false,
      };
      if (isId && rr.identity.default !== undefined) {
        scalars.push({ ...member, defaultKind: rr.identity.default });
      } else {
        scalars.push(member);
      }
    }

    if (rr.identity.kind === 'prismaExtra') {
      const member: EmitScalarMember = {
        name: rr.identity.name,
        type: rr.identity.scalar,
        nullCapable: false,
        isId: true,
        isPrismaExtra: true,
      };
      if (rr.identity.default !== undefined) {
        scalars.push({ ...member, defaultKind: rr.identity.default });
      } else {
        scalars.push(member);
      }
    }

    const relationMembers: EmitRelationMember[] = [];
    for (const rel of resource.schema.relations) {
      const target = findResource(resources, rel.target)!;
      const targetKey = identityKey(target.identity);
      const targetRr = resolved.get(targetKey)!;
      const counterpartName = rel.inverse!;
      const pairId2 = [key, rel.name, targetKey, counterpartName]
        .sort()
        .join('|');
      const join = joinByPair.get(pairId2);
      if (join === undefined) {
        return {
          ok: false,
          error: emitError(
            'emit_model_failure',
            `Missing join resolution for ${key}.${rel.name}`,
          ),
        };
      }

      const isOwner = join.owningKey === key && join.owningRel.name === rel.name;
      relationMembers.push({
        name: rr.names.relationNames.get(rel.name)!,
        targetModelName: targetRr.names.prismaModelName,
        isList: rel.multiplicity === 'many',
        nullCapable: rel.nullable,
        relationFromFields: isOwner ? [join.localPrisma] : [],
        relationToFields: isOwner ? [join.remotePrisma] : [],
      });
    }

    models.push({
      name: rr.names.prismaModelName,
      scalars,
      relations: relationMembers,
    });
  }

  return { ok: true, value: { models } };
}

export function renderModelsSdl(emitModel: EmitModel): string {
  const blocks: string[] = [];
  for (const model of emitModel.models) {
    const lines: string[] = [`model ${model.name} {`];
    for (const s of model.scalars) {
      const nullMark = s.nullCapable ? '?' : '';
      let attrs = '';
      if (s.isId) attrs += ' @id';
      if (s.defaultKind === 'cuid') attrs += ' @default(cuid())';
      if (s.defaultKind === 'uuid') attrs += ' @default(uuid())';
      if (s.defaultKind === 'autoincrement') attrs += ' @default(autoincrement())';
      lines.push(`  ${s.name} ${s.type}${nullMark}${attrs}`);
    }
    for (const r of model.relations) {
      const typeExpr = r.isList
        ? `${r.targetModelName}[]`
        : r.nullCapable
          ? `${r.targetModelName}?`
          : r.targetModelName;
      let attrs = '';
      if (r.relationFromFields.length > 0) {
        attrs = ` @relation(fields: [${r.relationFromFields.join(', ')}], references: [${r.relationToFields.join(', ')}])`;
      }
      lines.push(`  ${r.name} ${typeExpr}${attrs}`);
    }
    lines.push('}');
    blocks.push(lines.join('\n'));
  }
  return blocks.join('\n\n');
}

export function deriveDmmf(emitModel: EmitModel): EmitSuccessDmmf {
  return {
    datamodel: {
      models: emitModel.models.map((m) => ({
        name: m.name,
        fields: [
          ...m.scalars.map((s) => ({
            name: s.name,
            kind: 'scalar',
            type: s.type,
            isList: false,
            isRequired: !s.nullCapable,
            isId: s.isId,
            ...(s.defaultKind !== undefined
              ? { default: { name: s.defaultKind, args: [] } }
              : {}),
          })),
          ...m.relations.map((r) => ({
            name: r.name,
            kind: 'object',
            type: r.targetModelName,
            isList: r.isList,
            isRequired: !r.nullCapable,
            relationFromFields: [...r.relationFromFields],
            relationToFields: [...r.relationToFields],
          })),
        ],
      })),
    },
  };
}

type EmitSuccessDmmf = {
  readonly datamodel: {
    readonly models: readonly Record<string, unknown>[];
  };
};

/** §4.7 verification-facing name mapping from emit realization */
export function toVerificationMapping(
  realization: PrismaRealizationMapping,
): {
  models?: PrismaRealizationMapping['models'];
  fields?: PrismaRealizationMapping['fields'];
  relations?: PrismaRealizationMapping['relations'];
} {
  const out: {
    models?: PrismaRealizationMapping['models'];
    fields?: PrismaRealizationMapping['fields'];
    relations?: PrismaRealizationMapping['relations'];
  } = {};
  if (realization.models !== undefined) out.models = realization.models;
  if (realization.fields !== undefined) out.fields = realization.fields;
  if (realization.relations !== undefined) out.relations = realization.relations;
  return out;
}
