import { err, ok, type Result } from '../result.js';
import type {
  CascadeEffects,
  CascadeEvaluationError,
  CascadeEvent,
  RelationAssociationElement,
  RelationRuntimeValue,
  RelationSingularAssociation,
  Resource,
} from './types.js';

type RelationValueState =
  | 'absent'
  | 'present_null'
  | 'present_non_null_one'
  | 'present_empty_many'
  | 'present_non_empty_many';

function classifyRelationValue(
  multiplicity: 'one' | 'many',
  relationName: string,
  values: ReadonlyMap<string, RelationRuntimeValue>,
):
  | { ok: true; state: RelationValueState; targets?: ReadonlyArray<RelationAssociationElement | RelationSingularAssociation> }
  | { ok: false; error: CascadeEvaluationError } {
  if (!values.has(relationName)) {
    return { ok: true, state: 'absent' };
  }

  const value = values.get(relationName);
  if (value === null) {
    return { ok: true, state: 'present_null' };
  }

  if (multiplicity === 'one') {
    if (Array.isArray(value)) {
      return {
        ok: false,
        error: {
          code: 'cascade_relation_value_shape_mismatch',
          relation: relationName,
          multiplicity: 'one',
        },
      };
    }
    return {
      ok: true,
      state: 'present_non_null_one',
      targets: [value as RelationSingularAssociation],
    };
  }

  if (!Array.isArray(value)) {
    return {
      ok: false,
      error: {
        code: 'cascade_relation_value_shape_mismatch',
        relation: relationName,
        multiplicity: 'many',
      },
    };
  }

  if (value.some((element) => element === null)) {
    return {
      ok: false,
      error: {
        code: 'cascade_relation_value_shape_mismatch',
        relation: relationName,
        multiplicity: 'many',
      },
    };
  }

  if (value.length === 0) {
    return { ok: true, state: 'present_empty_many' };
  }

  return {
    ok: true,
    state: 'present_non_empty_many',
    targets: value as ReadonlyArray<RelationAssociationElement>,
  };
}

/**
 * Evaluate declared delete/update cascade effects for Relation value states (RFC-026).
 * Does not call validateResource or checkRelationValueStates; does not inspect
 * direction / inverse / join.
 */
export function evaluateCascadeEvent(
  resource: Resource,
  event: CascadeEvent,
  values: ReadonlyMap<string, RelationRuntimeValue>,
): Result<CascadeEffects, CascadeEvaluationError> {
  const cascades: Array<{
    relation: string;
    targets: ReadonlyArray<
      RelationSingularAssociation | RelationAssociationElement
    >;
  }> = [];
  const setNulls: Array<{ relation: string }> = [];

  for (const relation of resource.schema.relations) {
    const policy = event === 'delete' ? relation.onDelete : relation.onUpdate;
    if (policy === 'none') {
      continue;
    }

    const classified = classifyRelationValue(
      relation.multiplicity,
      relation.name,
      values,
    );
    if (!classified.ok) {
      return err(classified.error);
    }

    const { state, targets } = classified;

    switch (policy) {
      case 'restrict':
        if (
          state === 'present_non_null_one' ||
          state === 'present_non_empty_many'
        ) {
          return err({
            code: 'cascade_restricted',
            relation: relation.name,
            event,
          });
        }
        break;
      case 'cascade':
        if (state === 'present_non_null_one' && targets !== undefined) {
          cascades.push({ relation: relation.name, targets });
        } else if (state === 'present_non_empty_many' && targets !== undefined) {
          cascades.push({ relation: relation.name, targets });
        }
        break;
      case 'setNull':
        if (
          state === 'present_non_null_one' ||
          state === 'present_empty_many' ||
          state === 'present_non_empty_many'
        ) {
          setNulls.push({ relation: relation.name });
        }
        break;
      default:
        break;
    }
  }

  return ok({
    cascades: Object.freeze(
      cascades.map((entry) =>
        Object.freeze({
          relation: entry.relation,
          targets: Object.freeze([...entry.targets]),
        }),
      ),
    ),
    setNulls: Object.freeze(
      setNulls.map((entry) => Object.freeze({ relation: entry.relation })),
    ),
  });
}
