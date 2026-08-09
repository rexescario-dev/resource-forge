import { resourceIdentitiesEqual } from '../identity/equal.js';
import type { ResourceIdentity } from '../identity/types.js';
import { err, ok, type Result } from '../result.js';
import type {
  Field,
  Relation,
  RelationCrossRefValidationError,
  RelationDirection,
} from './types.js';

function oppositeDirection(direction: RelationDirection): RelationDirection {
  return direction === 'outbound' ? 'inbound' : 'outbound';
}

/**
 * Multi-Resource Relation cross-ref resolve (RFC-024 §7.2).
 *
 * `targets` is an explicitly supplied partial schema set — not a registry.
 * When a Relation’s target schema is not among `targets`, that Relation is
 * skipped (not a failure). Does not invent `missing_target_schema`.
 *
 * MUST NOT be called from `validateResource`.
 */
export function checkRelationCrossRefs(
  owner: {
    readonly identity: ResourceIdentity;
    readonly relations: ReadonlyArray<Relation>;
  },
  targets: ReadonlyArray<{
    readonly identity: ResourceIdentity;
    readonly fields: ReadonlyArray<Field>;
    readonly relations: ReadonlyArray<Relation>;
  }>,
): Result<void, RelationCrossRefValidationError> {
  for (const relation of owner.relations) {
    const targetSchema = targets.find((candidate) =>
      resourceIdentitiesEqual(candidate.identity, relation.target),
    );
    if (targetSchema === undefined) {
      continue;
    }

    if (relation.inverse !== undefined) {
      const counterpart = targetSchema.relations.find(
        (candidate) => candidate.name === relation.inverse,
      );
      if (counterpart === undefined) {
        return err({
          code: 'unknown_inverse_relation',
          relation: relation.name,
          inverse: relation.inverse,
        });
      }
      if (!resourceIdentitiesEqual(counterpart.target, owner.identity)) {
        return err({
          code: 'inverse_target_mismatch',
          relation: relation.name,
          inverse: relation.inverse,
        });
      }
      if (counterpart.direction !== oppositeDirection(relation.direction)) {
        return err({
          code: 'inverse_direction_mismatch',
          relation: relation.name,
          inverse: relation.inverse,
        });
      }
    }

    if (relation.join !== undefined) {
      const remoteExists = targetSchema.fields.some(
        (field) => field.name === relation.join!.remote,
      );
      if (!remoteExists) {
        return err({
          code: 'unknown_join_remote_field',
          relation: relation.name,
          name: relation.join.remote,
        });
      }
    }
  }

  return ok(undefined);
}
