import type { EmptySchemaCollection, ResourceSchema } from './types.js';

export function createEmptyResourceSchema(): ResourceSchema {
  return Object.freeze({
    fields: Object.freeze([]) as ReadonlyArray<never>,
    relations: Object.freeze([]) as EmptySchemaCollection,
    operations: Object.freeze([]) as EmptySchemaCollection,
  });
}
