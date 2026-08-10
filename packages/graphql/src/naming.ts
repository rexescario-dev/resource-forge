import type { ResourceIdentity } from '@resource-forge/core';

const GRAPHQL_NAME = /^[_A-Za-z][_0-9A-Za-z]*$/;

const RESERVED_GRAPHQL_TYPE_NAMES = new Set([
  'Query',
  'Mutation',
  'Subscription',
  'String',
  'Int',
  'Float',
  'Boolean',
  'ID',
  'RfVoid',
]);

export type NamingIdentity = Pick<ResourceIdentity, 'namespace' | 'name'>;

export function capitalizeFirst(value: string): string {
  if (value.length === 0) {
    return value;
  }
  return value[0]!.toUpperCase() + value.slice(1);
}

export function decapitalizeFirst(value: string): string {
  if (value.length === 0) {
    return value;
  }
  return value[0]!.toLowerCase() + value.slice(1);
}

/** GraphQL Name lexical rules excluding the introspection `__*` namespace. */
export function isLegalGraphqlName(name: string): boolean {
  if (!GRAPHQL_NAME.test(name)) {
    return false;
  }
  if (name.startsWith('__')) {
    return false;
  }
  return true;
}

export function isReservedGraphqlTypeName(typeName: string): boolean {
  if (typeName.startsWith('__')) {
    return true;
  }
  return RESERVED_GRAPHQL_TYPE_NAMES.has(typeName);
}

export function isLegalGraphqlTypeName(typeName: string): boolean {
  return isLegalGraphqlName(typeName) && !isReservedGraphqlTypeName(typeName);
}

/** Deterministic ResourceIdentity → GraphQL object type name (RFC-032 §5.1). */
export function graphqlTypeNameForIdentity(identity: NamingIdentity): string {
  return capitalizeFirst(identity.namespace) + identity.name;
}

/** Deterministic (identity, operation) → Query/Mutation root field name. */
export function rootFieldNameForOperation(
  identity: NamingIdentity,
  operationName: string,
): string {
  return `${decapitalizeFirst(graphqlTypeNameForIdentity(identity))}_${operationName}`;
}

export function assertNoTypeNameCollisions(identities: readonly NamingIdentity[]): void {
  const seen = new Map<string, NamingIdentity>();
  for (const identity of identities) {
    const typeName = graphqlTypeNameForIdentity(identity);
    const prior = seen.get(typeName);
    if (prior !== undefined) {
      throw new Error(
        `GraphQL type name collision: "${typeName}" from ${prior.namespace}/${prior.name} and ${identity.namespace}/${identity.name}`,
      );
    }
    seen.set(typeName, identity);
  }
}

export function assertNoRootFieldCollisions(
  pairs: readonly { identity: NamingIdentity; operationName: string }[],
): void {
  const seen = new Map<string, { identity: NamingIdentity; operationName: string }>();
  for (const pair of pairs) {
    const rootField = rootFieldNameForOperation(pair.identity, pair.operationName);
    const prior = seen.get(rootField);
    if (prior !== undefined) {
      throw new Error(
        `GraphQL root field collision: "${rootField}" from ${prior.identity.namespace}/${prior.identity.name}.${prior.operationName} and ${pair.identity.namespace}/${pair.identity.name}.${pair.operationName}`,
      );
    }
    seen.set(rootField, pair);
  }
}
