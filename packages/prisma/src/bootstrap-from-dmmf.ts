/**
 * RFC-041 bootstrap: Supported DMMF Profile → starter Resources.
 * Independent of RFC-033/034 reverse mapping. No verifyPrismaCorrespondence.
 */
import {
  createResourceIdentity,
  emptyAnnotations,
  err,
  ok,
  validateResource,
  type Field,
  type Relation,
  type Resource,
  type Result,
} from '@resource-forge/core';

export type BootstrapEmission = {
  readonly model: string;
  readonly resource: Resource;
  readonly filename: string;
};

export type BootstrapRefusal = {
  readonly model: string;
  readonly code: string;
  readonly member?: string;
  readonly detail: string;
};

export type BootstrapSuccess = {
  readonly emissions: readonly BootstrapEmission[];
  readonly refusals: readonly BootstrapRefusal[];
};

export type BootstrapError = {
  readonly code: 'unusable_dmmf' | 'invalid_namespace';
  readonly message: string;
};

const MODEL_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const SCALAR_MAP: ReadonlyMap<string, Field['type']> = new Map([
  ['String', 'string'],
  ['Boolean', 'boolean'],
  ['Int', 'number'],
  ['Float', 'number'],
  ['Decimal', 'number'],
]);

type ProfileField = {
  readonly name: string;
  readonly kind: string;
  readonly type: string;
  readonly isRequired: boolean;
  readonly isList: boolean;
  readonly relationFromFields?: readonly string[];
  readonly relationToFields?: readonly string[];
  readonly relationName?: string | null;
  readonly dbName?: unknown;
};

type ProfileModel = {
  readonly name: string;
  readonly fields: readonly ProfileField[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') return undefined;
    out.push(item);
  }
  return out;
}

function bootstrapError(
  code: BootstrapError['code'],
  message: string,
): BootstrapError {
  return { code, message };
}

function parseProfile(dmmf: unknown): Result<readonly ProfileModel[], BootstrapError> {
  if (!isRecord(dmmf) || !isRecord(dmmf.datamodel)) {
    return err(
      bootstrapError(
        'unusable_dmmf',
        'DMMF input must be an object with datamodel.models[]',
      ),
    );
  }

  const modelsRaw = dmmf.datamodel.models;
  if (!Array.isArray(modelsRaw)) {
    return err(
      bootstrapError('unusable_dmmf', 'DMMF datamodel.models must be an array'),
    );
  }

  const seenModels = new Set<string>();
  const models: ProfileModel[] = [];

  for (const modelRaw of modelsRaw) {
    if (!isRecord(modelRaw) || typeof modelRaw.name !== 'string') {
      return err(
        bootstrapError('unusable_dmmf', 'Each DMMF model must have a string name'),
      );
    }
    const modelName = modelRaw.name;
    if (!MODEL_NAME_PATTERN.test(modelName)) {
      return err(
        bootstrapError(
          'unusable_dmmf',
          `Invalid DMMF model name for path safety: ${modelName}`,
        ),
      );
    }
    if (seenModels.has(modelName)) {
      return err(
        bootstrapError(
          'unusable_dmmf',
          `Duplicate DMMF model name: ${modelName}`,
        ),
      );
    }
    seenModels.add(modelName);

    if (!Array.isArray(modelRaw.fields)) {
      return err(
        bootstrapError(
          'unusable_dmmf',
          `Model ${modelName} fields must be an array`,
        ),
      );
    }

    const seenFields = new Set<string>();
    const fields: ProfileField[] = [];

    for (const fieldRaw of modelRaw.fields) {
      if (!isRecord(fieldRaw) || typeof fieldRaw.name !== 'string') {
        return err(
          bootstrapError(
            'unusable_dmmf',
            `Model ${modelName} has a field without a string name`,
          ),
        );
      }
      if (seenFields.has(fieldRaw.name)) {
        return err(
          bootstrapError(
            'unusable_dmmf',
            `Duplicate field name in model ${modelName}: ${fieldRaw.name}`,
          ),
        );
      }
      seenFields.add(fieldRaw.name);

      if (typeof fieldRaw.kind !== 'string') {
        return err(
          bootstrapError(
            'unusable_dmmf',
            `Field ${modelName}.${fieldRaw.name} missing string kind`,
          ),
        );
      }
      if (typeof fieldRaw.type !== 'string') {
        return err(
          bootstrapError(
            'unusable_dmmf',
            `Field ${modelName}.${fieldRaw.name} missing string type`,
          ),
        );
      }
      if (typeof fieldRaw.isRequired !== 'boolean') {
        return err(
          bootstrapError(
            'unusable_dmmf',
            `Field ${modelName}.${fieldRaw.name} missing boolean isRequired`,
          ),
        );
      }
      if (typeof fieldRaw.isList !== 'boolean') {
        return err(
          bootstrapError(
            'unusable_dmmf',
            `Field ${modelName}.${fieldRaw.name} missing boolean isList`,
          ),
        );
      }

      if (fieldRaw.kind === 'object') {
        const fromFields = readStringArray(fieldRaw.relationFromFields);
        const toFields = readStringArray(fieldRaw.relationToFields);
        if (fromFields === undefined || toFields === undefined) {
          return err(
            bootstrapError(
              'unusable_dmmf',
              `Relation ${modelName}.${fieldRaw.name} missing relationFromFields/relationToFields string arrays`,
            ),
          );
        }
        if (
          !('relationName' in fieldRaw) ||
          (fieldRaw.relationName !== null &&
            typeof fieldRaw.relationName !== 'string')
        ) {
          return err(
            bootstrapError(
              'unusable_dmmf',
              `Relation ${modelName}.${fieldRaw.name} missing relationName (string|null)`,
            ),
          );
        }
        fields.push({
          name: fieldRaw.name,
          kind: fieldRaw.kind,
          type: fieldRaw.type,
          isRequired: fieldRaw.isRequired,
          isList: fieldRaw.isList,
          relationFromFields: fromFields,
          relationToFields: toFields,
          relationName: fieldRaw.relationName as string | null,
          dbName: fieldRaw.dbName,
        });
        continue;
      }

      fields.push({
        name: fieldRaw.name,
        kind: fieldRaw.kind,
        type: fieldRaw.type,
        isRequired: fieldRaw.isRequired,
        isList: fieldRaw.isList,
        dbName: fieldRaw.dbName,
      });
    }

    models.push({ name: modelName, fields });
  }

  return ok(models);
}

function relationNamesPair(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (typeof a === 'string' && typeof b === 'string') {
    return a === b;
  }
  return a === null && b === null;
}

function findObjectFields(
  model: ProfileModel,
): readonly ProfileField[] {
  return model.fields.filter((f) => f.kind === 'object');
}

function isImplicitManyToMany(
  source: ProfileModel,
  field: ProfileField,
  byName: ReadonlyMap<string, ProfileModel>,
): boolean {
  if (field.kind !== 'object' || !field.isList) return false;
  if ((field.relationFromFields?.length ?? 0) !== 0) return false;
  const target = byName.get(field.type);
  if (target === undefined) return false;

  for (const s of findObjectFields(target)) {
    if (s.type !== source.name) continue;
    if (!s.isList) continue;
    if ((s.relationFromFields?.length ?? 0) !== 0) continue;
    if (!relationNamesPair(field.relationName, s.relationName)) continue;
    return true;
  }
  return false;
}

function resolveInverse(
  source: ProfileModel,
  field: ProfileField,
  byName: ReadonlyMap<string, ProfileModel>,
): string | undefined {
  const target = byName.get(field.type);
  if (target === undefined) return undefined;

  const candidates = findObjectFields(target).filter(
    (s) => s.type === source.name,
  );

  if (typeof field.relationName === 'string') {
    const matched = candidates.filter(
      (s) =>
        typeof s.relationName === 'string' &&
        s.relationName === field.relationName,
    );
    if (matched.length === 1) return matched[0]!.name;
    return undefined;
  }

  if (field.relationName === null) {
    const nullPaired = candidates.filter((s) => s.relationName === null);
    if (nullPaired.length === 1) return nullPaired[0]!.name;
    return undefined;
  }

  return undefined;
}

function refuse(
  model: string,
  code: string,
  detail: string,
  member?: string,
): BootstrapRefusal {
  return member === undefined
    ? { model, code, detail }
    : { model, code, member, detail };
}

function mapModel(
  model: ProfileModel,
  namespace: string,
  byName: ReadonlyMap<string, ProfileModel>,
): Result<Resource, BootstrapRefusal> {
  const fields: Field[] = [];
  const relations: Relation[] = [];

  for (const f of model.fields) {
    if (f.kind === 'scalar') {
      if (f.isList) {
        return err(
          refuse(
            model.name,
            'unsupported_field',
            `scalar list unsupported: ${f.type}[]`,
            f.name,
          ),
        );
      }
      const mapped = SCALAR_MAP.get(f.type);
      if (mapped === undefined) {
        return err(
          refuse(
            model.name,
            'unsupported_field',
            `unsupported scalar type: ${f.type}`,
            f.name,
          ),
        );
      }
      const optional = !f.isRequired;
      fields.push({
        name: f.name,
        type: mapped,
        optional,
        nullable: optional,
      });
      continue;
    }

    if (f.kind === 'object') {
      if (f.type === model.name) {
        return err(
          refuse(
            model.name,
            'unsupported_relation',
            'self-relation is not supported in bootstrap',
            f.name,
          ),
        );
      }
      if (!byName.has(f.type)) {
        return err(
          refuse(
            model.name,
            'unsupported_relation',
            `missing related model: ${f.type}`,
            f.name,
          ),
        );
      }
      if (isImplicitManyToMany(model, f, byName)) {
        return err(
          refuse(
            model.name,
            'unsupported_relation',
            'implicit many-to-many is not supported in bootstrap',
            f.name,
          ),
        );
      }
      if (
        f.relationFromFields === undefined ||
        f.relationToFields === undefined ||
        !('relationName' in f)
      ) {
        return err(
          refuse(
            model.name,
            'unsupported_relation',
            'relation metadata incomplete',
            f.name,
          ),
        );
      }

      const multiplicity = f.isList ? 'many' : 'one';
      let optional: boolean;
      let nullable: boolean;
      if (f.isList) {
        optional = false;
        nullable = false;
      } else if (f.isRequired) {
        optional = false;
        nullable = false;
      } else {
        optional = true;
        nullable = true;
      }

      const inverse = resolveInverse(model, f, byName);
      const relation: Relation = {
        name: f.name,
        target: { namespace, name: f.type },
        multiplicity,
        optional,
        nullable,
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
        fetch: 'lazy',
        ...(inverse !== undefined ? { inverse } : {}),
      };
      relations.push(relation);
      continue;
    }

    return err(
      refuse(
        model.name,
        'unsupported_field',
        `unsupported field kind: ${f.kind}`,
        f.name,
      ),
    );
  }

  const identityResult = createResourceIdentity(namespace, model.name);
  if (!identityResult.ok) {
    return err(
      refuse(
        model.name,
        'core_construction_failed',
        `identity rejected: ${identityResult.error.code}`,
      ),
    );
  }

  const validated = validateResource({
    identity: identityResult.value,
    schema: {
      fields,
      relations,
      operations: Object.freeze([]),
      constraints: Object.freeze([]),
    },
    annotations: emptyAnnotations,
  });

  if (!validated.ok) {
    return err(
      refuse(
        model.name,
        'core_construction_failed',
        `validateResource failed: ${validated.error.code}`,
      ),
    );
  }

  return ok(validated.value);
}

/**
 * Deterministic Prisma DMMF → starter Resource bootstrap (RFC-041).
 * No round-trip / verify obligation.
 */
export function synthesizeResourcesFromDmmf(input: {
  readonly dmmf: unknown;
  readonly namespace: string;
}): Result<BootstrapSuccess, BootstrapError> {
  if (typeof input.namespace !== 'string' || input.namespace.length === 0) {
    return err(
      bootstrapError('invalid_namespace', 'namespace is required and non-empty'),
    );
  }

  // Probe namespace early via core identity rules using a throwaway PascalCase name.
  const nsProbe = createResourceIdentity(input.namespace, 'Probe');
  if (!nsProbe.ok && nsProbe.error.code === 'invalid_namespace') {
    return err(
      bootstrapError(
        'invalid_namespace',
        `invalid namespace: ${input.namespace}`,
      ),
    );
  }
  if (!nsProbe.ok && nsProbe.error.code === 'reserved_namespace') {
    return err(
      bootstrapError(
        'invalid_namespace',
        `reserved namespace: ${input.namespace}`,
      ),
    );
  }

  const profile = parseProfile(input.dmmf);
  if (!profile.ok) return profile;

  const models = profile.value;
  const byName = new Map(models.map((m) => [m.name, m]));

  const emissions: BootstrapEmission[] = [];
  const refusals: BootstrapRefusal[] = [];

  for (const model of models) {
    const mapped = mapModel(model, input.namespace, byName);
    if (!mapped.ok) {
      refusals.push(mapped.error);
      continue;
    }
    emissions.push({
      model: model.name,
      resource: mapped.value,
      filename: `${model.name}.json`,
    });
  }

  return ok({ emissions, refusals });
}
