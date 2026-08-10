import type { Field, Resource, Result } from '@resource-forge/core';
import type { PrismaBindingError } from './binding-errors.js';
import { bindingErr, bindingOk } from './binding-errors.js';
import { identityKey } from './mapping.js';
import type {
  InstanceIdentity,
  PrismaRealizationMapping,
} from './realization.js';

export type InternalBindingMap = {
  /** Metadata only — never used for delegate lookup (RFC-035 / M5 plan). */
  readonly modelName: string;
  readonly resourceKey: string;
  readonly identity: InstanceIdentity;
  /** Realized Prisma @id field name */
  readonly identityPrismaField: string;
  /** Resource Field name → Prisma field name */
  readonly fieldNames: ReadonlyMap<string, string>;
  /** Bindable Resource Field names */
  readonly bindableFields: ReadonlySet<string>;
  readonly fieldsByName: ReadonlyMap<string, Field>;
};

function resourceFieldPrismaName(
  resourceKey: string,
  fieldName: string,
  realization: PrismaRealizationMapping,
): string {
  return realization.fields?.[resourceKey]?.[fieldName] ?? fieldName;
}

function resolveIdentityPrismaField(
  resource: Resource,
  resourceKey: string,
  identity: InstanceIdentity,
  realization: PrismaRealizationMapping,
): Result<string, PrismaBindingError> {
  if (identity.kind === 'resourceField') {
    const f = resource.schema.fields.find((x) => x.name === identity.field);
    if (f === undefined) {
      return bindingErr(
        'binding_invalid',
        'invalid_identity',
        `resourceField identity ${identity.field} not found on ${resourceKey}`,
      );
    }
    if (f.nullable) {
      return bindingErr(
        'binding_invalid',
        'invalid_identity',
        `resourceField identity ${resourceKey}.${identity.field} must be nullable: false`,
      );
    }
    const overlay = realization.numberOverlays?.[resourceKey]?.[identity.field];
    const okScalar =
      f.type === 'string' ||
      (f.type === 'number' && overlay === 'Int');
    if (!okScalar) {
      return bindingErr(
        'binding_invalid',
        'invalid_identity_scalar',
        `resourceField identity ${resourceKey}.${identity.field} is not a String|Int @id scalar`,
      );
    }
    return bindingOk(
      resourceFieldPrismaName(resourceKey, identity.field, realization),
    );
  }

  if (identity.kind === 'prismaExtra') {
    if (identity.scalar !== 'String' && identity.scalar !== 'Int') {
      return bindingErr(
        'binding_invalid',
        'invalid_identity_scalar',
        `prismaExtra.scalar for ${resourceKey} must be String|Int`,
      );
    }
    if (identity.name.trim() === '') {
      return bindingErr(
        'binding_invalid',
        'invalid_identity',
        `prismaExtra name empty for ${resourceKey}`,
      );
    }
    return bindingOk(identity.name);
  }

  return bindingErr(
    'binding_invalid',
    'invalid_identity',
    `Unknown identity kind for ${resourceKey}`,
  );
}

export function resolveBindingMap(
  resource: Resource,
  realization: PrismaRealizationMapping,
): Result<InternalBindingMap, PrismaBindingError> {
  const resourceKey = identityKey(resource.identity);
  const identity = realization.identities[resourceKey];
  if (identity === undefined) {
    return bindingErr(
      'binding_invalid',
      'missing_identity',
      `Missing Prisma instance-identity mapping for ${resourceKey}`,
    );
  }

  const fieldOverrides = realization.fields?.[resourceKey];
  if (fieldOverrides !== undefined) {
    for (const name of Object.keys(fieldOverrides)) {
      if (!resource.schema.fields.some((f) => f.name === name)) {
        return bindingErr(
          'binding_invalid',
          'unknown_field_overlay',
          `Field name overlay references unknown Field ${resourceKey}.${name}`,
        );
      }
    }
  }

  const fieldNames = new Map<string, string>();
  const fieldsByName = new Map<string, Field>();
  const bindableFields = new Set<string>();

  for (const f of resource.schema.fields) {
    fieldsByName.set(f.name, f);
    const prismaName = resourceFieldPrismaName(
      resourceKey,
      f.name,
      realization,
    );
    fieldNames.set(f.name, prismaName);
    if (f.type === 'string' || f.type === 'number' || f.type === 'boolean') {
      bindableFields.add(f.name);
    }
  }

  const identityPrisma = resolveIdentityPrismaField(
    resource,
    resourceKey,
    identity,
    realization,
  );
  if (!identityPrisma.ok) return identityPrisma;

  if (identity.kind === 'prismaExtra') {
    for (const [fieldName, prismaName] of fieldNames) {
      if (prismaName === identityPrisma.value) {
        return bindingErr(
          'binding_invalid',
          'identity_collision',
          `prismaExtra identity field ${identityPrisma.value} collides with Resource Field ${resourceKey}.${fieldName} mapping`,
        );
      }
    }
  }

  const modelName =
    realization.models?.[resourceKey] ?? resource.identity.name;

  return bindingOk({
    modelName,
    resourceKey,
    identity,
    identityPrismaField: identityPrisma.value,
    fieldNames,
    bindableFields,
    fieldsByName,
  });
}
