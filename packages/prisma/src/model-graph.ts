import type { Result } from '@resource-forge/core';
import { correspondenceError, type CorrespondenceError } from './errors.js';

export type ConsumedScalarField = {
  readonly kind: 'scalar';
  readonly name: string;
  readonly type: string;
  readonly nullCapable: boolean;
};

export type ConsumedRelationField = {
  readonly kind: 'relation';
  readonly name: string;
  readonly list: boolean;
  readonly nullCapable: boolean;
  readonly targetModelName: string;
  readonly relationFromFields: readonly string[];
  readonly relationToFields: readonly string[];
};

export type ConsumedField = ConsumedScalarField | ConsumedRelationField;

export type ConsumedModel = {
  readonly name: string;
  readonly fields: ReadonlyMap<string, ConsumedField>;
};

export type ConsumedModelGraph = {
  readonly models: ReadonlyMap<string, ConsumedModel>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      return undefined;
    }
    out.push(item);
  }
  return out;
}

/**
 * Normalize a DMMF-shaped document into the internal consumed model graph.
 * Requires `datamodel.models[]`. Does not accept a bare ConsumedModelGraph.
 */
export function normalizeDmmf(
  input: unknown,
): Result<ConsumedModelGraph, CorrespondenceError> {
  if (!isRecord(input) || !isRecord(input.datamodel)) {
    return {
      ok: false,
      error: correspondenceError(
        'unusable_dmmf',
        'DMMF input must be an object with datamodel.models[]',
      ),
    };
  }

  const modelsRaw = input.datamodel.models;
  if (!Array.isArray(modelsRaw)) {
    return {
      ok: false,
      error: correspondenceError(
        'unusable_dmmf',
        'DMMF datamodel.models must be an array',
      ),
    };
  }

  const models = new Map<string, ConsumedModel>();

  for (const modelRaw of modelsRaw) {
    if (!isRecord(modelRaw) || typeof modelRaw.name !== 'string') {
      return {
        ok: false,
        error: correspondenceError(
          'unusable_dmmf',
          'Each DMMF model must have a string name',
        ),
      };
    }

    if (!Array.isArray(modelRaw.fields)) {
      return {
        ok: false,
        error: correspondenceError(
          'unusable_dmmf',
          `Model ${modelRaw.name} fields must be an array`,
        ),
      };
    }

    const fields = new Map<string, ConsumedField>();

    for (const fieldRaw of modelRaw.fields) {
      if (!isRecord(fieldRaw) || typeof fieldRaw.name !== 'string') {
        return {
          ok: false,
          error: correspondenceError(
            'unusable_dmmf',
            `Model ${modelRaw.name} has a field without a string name`,
          ),
        };
      }

      if (typeof fieldRaw.isRequired !== 'boolean') {
        return {
          ok: false,
          error: correspondenceError(
            'unusable_dmmf',
            `Field ${modelRaw.name}.${fieldRaw.name} missing boolean isRequired`,
          ),
        };
      }

      const nullCapable = !fieldRaw.isRequired;
      const kind = fieldRaw.kind;

      if (kind === 'scalar') {
        if (typeof fieldRaw.type !== 'string') {
          return {
            ok: false,
            error: correspondenceError(
              'unusable_dmmf',
              `Scalar ${modelRaw.name}.${fieldRaw.name} missing type`,
            ),
          };
        }
        fields.set(fieldRaw.name, {
          kind: 'scalar',
          name: fieldRaw.name,
          type: fieldRaw.type,
          nullCapable,
        });
        continue;
      }

      if (kind === 'object') {
        if (typeof fieldRaw.type !== 'string') {
          return {
            ok: false,
            error: correspondenceError(
              'unusable_dmmf',
              `Relation ${modelRaw.name}.${fieldRaw.name} missing target model type`,
            ),
          };
        }
        if (typeof fieldRaw.isList !== 'boolean') {
          return {
            ok: false,
            error: correspondenceError(
              'unusable_dmmf',
              `Relation ${modelRaw.name}.${fieldRaw.name} missing boolean isList`,
            ),
          };
        }
        const fromFields = readStringArray(fieldRaw.relationFromFields);
        const toFields = readStringArray(fieldRaw.relationToFields);
        if (fromFields === undefined || toFields === undefined) {
          return {
            ok: false,
            error: correspondenceError(
              'unusable_dmmf',
              `Relation ${modelRaw.name}.${fieldRaw.name} missing relationFromFields/relationToFields string arrays`,
            ),
          };
        }
        fields.set(fieldRaw.name, {
          kind: 'relation',
          name: fieldRaw.name,
          list: fieldRaw.isList,
          nullCapable,
          targetModelName: fieldRaw.type,
          relationFromFields: fromFields,
          relationToFields: toFields,
        });
        continue;
      }

      // Ignore enum/unsupported kinds that are not Resource correspondence targets
      // only when they are not claimed by Resource Fields later; normalize still
      // accepts unknown kinds by skipping them so extras remain allowed.
    }

    models.set(modelRaw.name, { name: modelRaw.name, fields });
  }

  return { ok: true, value: { models } };
}
