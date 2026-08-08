import type {
  EmptySchemaCollection,
  Field,
  Relation,
  ResourceSchema,
} from './types.js';

export function createEmptyResourceSchema(): ResourceSchema {
  return Object.freeze({
    fields: Object.freeze([]) as ReadonlyArray<Field>,
    relations: Object.freeze([]) as ReadonlyArray<Relation>,
    operations: Object.freeze([]) as EmptySchemaCollection,
  });
}
