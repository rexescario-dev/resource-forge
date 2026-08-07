import type { ResourceSchema } from './types.js';

export function createEmptyResourceSchema(): ResourceSchema {
  return Object.freeze({
    fields: Object.freeze([]) as ResourceSchema['fields'],
    relations: Object.freeze([]) as ResourceSchema['relations'],
    operations: Object.freeze([]) as ResourceSchema['operations'],
  });
}
