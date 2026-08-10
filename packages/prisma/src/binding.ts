import type { Resource, Result } from '@resource-forge/core';
import type { StructuralModelDelegate } from './binding-delegate.js';
import type { PrismaBindingError } from './binding-errors.js';
import { bindingErr, bindingOk } from './binding-errors.js';
import {
  resolveBindingMap,
  type InternalBindingMap,
} from './binding-map.js';
import type { PrismaRealizationMapping } from './realization.js';

export type ResourceRecord = Readonly<Record<string, unknown>>;

export type PrismaResourceBinding = {
  readonly create: (
    data: ResourceRecord,
    identity?: unknown,
  ) => Promise<Result<ResourceRecord, PrismaBindingError>>;
  readonly findUnique: (
    identity: unknown,
  ) => Promise<Result<ResourceRecord | null, PrismaBindingError>>;
  readonly update: (
    identity: unknown,
    patch: ResourceRecord,
  ) => Promise<Result<ResourceRecord, PrismaBindingError>>;
  readonly delete: (
    identity: unknown,
  ) => Promise<Result<ResourceRecord, PrismaBindingError>>;
};

export type CreatePrismaResourceBindingInput = {
  readonly resource: Resource;
  readonly realization: PrismaRealizationMapping;
  readonly delegate: StructuralModelDelegate;
};

function assertCallableDelegate(
  delegate: StructuralModelDelegate,
): Result<void, PrismaBindingError> {
  for (const name of ['create', 'findUnique', 'update', 'delete'] as const) {
    if (typeof delegate[name] !== 'function') {
      return bindingErr(
        'binding_invalid',
        'delegate_not_callable',
        `Delegate missing or non-callable required operation: ${name}`,
      );
    }
  }
  return bindingOk(undefined);
}

function mapDataToPrisma(
  map: InternalBindingMap,
  data: ResourceRecord,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [fieldName, value] of Object.entries(data)) {
    const prismaName = map.fieldNames.get(fieldName)!;
    out[prismaName] = value;
  }
  return out;
}

function projectRow(
  map: InternalBindingMap,
  row: Record<string, unknown>,
): Result<ResourceRecord, PrismaBindingError> {
  const out: Record<string, unknown> = {};
  for (const fieldName of map.bindableFields) {
    const prismaName = map.fieldNames.get(fieldName)!;
    if (!(prismaName in row)) {
      return bindingErr(
        'binding_invalid',
        'missing_projected_field',
        `Successful delegate row missing mapped Prisma field ${prismaName} for Resource Field ${fieldName}`,
      );
    }
    out[fieldName] = row[prismaName];
  }
  return bindingOk(Object.freeze(out));
}

async function invokeDelegate<T>(
  run: () => unknown,
): Promise<Result<T, PrismaBindingError>> {
  try {
    const value = (await Promise.resolve(run())) as T;
    return bindingOk(value);
  } catch (cause) {
    return bindingErr(
      'delegate_failed',
      'delegate_failed',
      'Delegate operation failed',
      cause,
    );
  }
}

function requireIdentityValue(
  identity: unknown,
): Result<unknown, PrismaBindingError> {
  if (identity === undefined || identity === null) {
    return bindingErr(
      'identity_invalid',
      'missing_identity_value',
      'Identity value is required',
    );
  }
  return bindingOk(identity);
}

export function createPrismaResourceBinding(
  input: CreatePrismaResourceBindingInput,
): Result<PrismaResourceBinding, PrismaBindingError> {
  const callable = assertCallableDelegate(input.delegate);
  if (!callable.ok) return callable;

  const mapResult = resolveBindingMap(input.resource, input.realization);
  if (!mapResult.ok) return mapResult;
  const map = mapResult.value;
  const delegate = input.delegate;
  const relationNames = new Set(
    input.resource.schema.relations.map((r) => r.name),
  );

  const validateKeys = (
    payload: ResourceRecord,
    label: string,
  ): Result<void, PrismaBindingError> => {
    for (const key of Object.keys(payload)) {
      if (relationNames.has(key)) {
        return bindingErr(
          'payload_invalid',
          'relation_key',
          `${label} must not contain Relation key: ${key}`,
        );
      }
      if (!map.bindableFields.has(key)) {
        return bindingErr(
          'payload_invalid',
          'unknown_or_non_bindable_key',
          `${label} contains unknown or non-bindable key: ${key}`,
        );
      }
    }
    return bindingOk(undefined);
  };

  const create = async (
    data: ResourceRecord,
    identity?: unknown,
  ): Promise<Result<ResourceRecord, PrismaBindingError>> => {
    const keys = validateKeys(data, 'create data');
    if (!keys.ok) return keys;

    const prismaData = mapDataToPrisma(map, data);

    if (map.identity.kind === 'resourceField') {
      if (!(map.identity.field in data)) {
        return bindingErr(
          'identity_invalid',
          'missing_identity_value',
          `create data missing identity Field ${map.identity.field}`,
        );
      }
    } else {
      const idVal = requireIdentityValue(identity);
      if (!idVal.ok) return idVal;
      prismaData[map.identityPrismaField] = idVal.value;
    }

    for (const fieldName of map.bindableFields) {
      if (
        map.identity.kind === 'resourceField' &&
        fieldName === map.identity.field
      ) {
        continue;
      }
      const field = map.fieldsByName.get(fieldName)!;
      if (!field.optional && !(fieldName in data)) {
        return bindingErr(
          'payload_invalid',
          'missing_required_field',
          `create data missing required Field ${fieldName}`,
        );
      }
    }

    const rowResult = await invokeDelegate<Record<string, unknown>>(() =>
      delegate.create({ data: prismaData }),
    );
    if (!rowResult.ok) return rowResult;
    if (rowResult.value === null || typeof rowResult.value !== 'object') {
      return bindingErr(
        'binding_invalid',
        'invalid_delegate_row',
        'Delegate create did not return a row object',
      );
    }
    return projectRow(map, rowResult.value);
  };

  const findUnique = async (
    identity: unknown,
  ): Promise<Result<ResourceRecord | null, PrismaBindingError>> => {
    const idVal = requireIdentityValue(identity);
    if (!idVal.ok) return idVal;

    const rowResult = await invokeDelegate<Record<string, unknown> | null>(() =>
      delegate.findUnique({
        where: { [map.identityPrismaField]: idVal.value },
      }),
    );
    if (!rowResult.ok) return rowResult;
    if (rowResult.value === null || rowResult.value === undefined) {
      return bindingOk(null);
    }
    if (typeof rowResult.value !== 'object') {
      return bindingErr(
        'binding_invalid',
        'invalid_delegate_row',
        'Delegate findUnique did not return a row object',
      );
    }
    return projectRow(map, rowResult.value);
  };

  const update = async (
    identity: unknown,
    patch: ResourceRecord,
  ): Promise<Result<ResourceRecord, PrismaBindingError>> => {
    const idVal = requireIdentityValue(identity);
    if (!idVal.ok) return idVal;

    const keys = validateKeys(patch, 'update patch');
    if (!keys.ok) return keys;

    if (
      map.identity.kind === 'resourceField' &&
      map.identity.field in patch
    ) {
      return bindingErr(
        'identity_invalid',
        'identity_immutable',
        `update patch must not include identity Field ${map.identity.field}`,
      );
    }

    const rowResult = await invokeDelegate<Record<string, unknown>>(() =>
      delegate.update({
        where: { [map.identityPrismaField]: idVal.value },
        data: mapDataToPrisma(map, patch),
      }),
    );
    if (!rowResult.ok) return rowResult;
    if (rowResult.value === null || typeof rowResult.value !== 'object') {
      return bindingErr(
        'binding_invalid',
        'invalid_delegate_row',
        'Delegate update did not return a row object',
      );
    }
    return projectRow(map, rowResult.value);
  };

  const del = async (
    identity: unknown,
  ): Promise<Result<ResourceRecord, PrismaBindingError>> => {
    const idVal = requireIdentityValue(identity);
    if (!idVal.ok) return idVal;

    const rowResult = await invokeDelegate<Record<string, unknown>>(() =>
      delegate.delete({
        where: { [map.identityPrismaField]: idVal.value },
      }),
    );
    if (!rowResult.ok) return rowResult;
    if (rowResult.value === null || typeof rowResult.value !== 'object') {
      return bindingErr(
        'binding_invalid',
        'invalid_delegate_row',
        'Delegate delete did not return a row object',
      );
    }
    return projectRow(map, rowResult.value);
  };

  return bindingOk({
    create,
    findUnique,
    update,
    delete: del,
  });
}
