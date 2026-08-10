import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  type GraphQLInputType,
  type GraphQLNamedType,
  type GraphQLOutputType,
  type GraphQLScalarType,
} from 'graphql';
import type { FieldType } from '@resource-forge/core';

export function scalarOutputForFieldType(type: FieldType): GraphQLScalarType {
  switch (type) {
    case 'string':
      return GraphQLString;
    case 'number':
      return GraphQLFloat;
    case 'boolean':
      return GraphQLBoolean;
  }
}

/** SDL output nullability tracks `nullable` only (RFC-032 §5.3.2). */
export function wrapOutputNullability(
  base: GraphQLOutputType,
  nullable: boolean,
): GraphQLOutputType {
  return nullable ? base : new GraphQLNonNull(base);
}

/**
 * Relation `many`: element is always `Target!`; list wrapper non-null iff
 * `nullable=false` → `[Target!]!`, else `[Target!]` (RFC-032 §5.3.4).
 */
export function wrapManyRelationOutput(
  target: GraphQLNamedType & GraphQLOutputType,
  nullable: boolean,
): GraphQLOutputType {
  const element = new GraphQLNonNull(target);
  const list = new GraphQLList(element);
  return wrapOutputNullability(list, nullable);
}

/**
 * Operation argument SDL under-approximation (RFC-032 §5.3.3):
 * only (`optional=false` ∧ `nullable=false`) → `Base!`; else `Base`.
 */
export function wrapArgumentNullability(
  base: GraphQLInputType,
  optional: boolean,
  nullable: boolean,
): GraphQLInputType {
  if (!optional && !nullable) {
    return new GraphQLNonNull(base);
  }
  return base;
}
