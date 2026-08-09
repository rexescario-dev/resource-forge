import { err, ok, type Result } from '../result.js';
import type {
  RelationLoadStateEntry,
  RelationLoadStateError,
  Resource,
} from './types.js';

/**
 * Contract-level load-state check after a claimed completed owning Resource load
 * (RFC-027).
 *
 * Precondition: `resource` is declaration-valid and `states` entries are
 * structurally valid `RelationLoadStateEntry` values. This function does **not**
 * validate declaration shape or loaded value semantics (no validateResource /
 * checkRelationValueStates / evaluateCascadeEvent).
 */
export function checkRelationLoadStates(
  resource: Resource,
  states: ReadonlyMap<string, RelationLoadStateEntry>,
): Result<void, RelationLoadStateError> {
  for (const relation of resource.schema.relations) {
    const entry = states.get(relation.name);
    if (entry === undefined) {
      return err({
        code: 'missing_relation_load_state',
        relation: relation.name,
      });
    }

    if (relation.fetch === 'eager' && entry.status === 'not-loaded') {
      return err({
        code: 'eager_relation_not_loaded',
        relation: relation.name,
      });
    }
  }

  return ok(undefined);
}
