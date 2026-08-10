import {
  createResourceIdentity,
  emptyAnnotations,
  validateResource,
  type Field,
  type Relation,
  type Resource,
  type ResourceIdentity,
} from '@resource-forge/core';

export function requireIdentity(namespace: string, name: string): ResourceIdentity {
  const identity = createResourceIdentity(namespace, name);
  if (!identity.ok) {
    throw new Error(`identity ${namespace}/${name}: ${identity.error.code}`);
  }
  return identity.value;
}

export function field(
  name: string,
  type: Field['type'] = 'string',
  optional = false,
  nullable = false,
): Field {
  return { name, type, optional, nullable };
}

export function relation(
  partial: Omit<Relation, 'direction' | 'onDelete' | 'onUpdate' | 'fetch'> &
    Partial<Pick<Relation, 'direction' | 'onDelete' | 'onUpdate' | 'fetch'>>,
): Relation {
  return {
    direction: 'outbound',
    onDelete: 'none',
    onUpdate: 'none',
    fetch: 'eager',
    ...partial,
  };
}

export function requireResource(input: {
  identity: ResourceIdentity;
  fields?: readonly Field[];
  relations?: readonly Relation[];
}): Resource {
  const result = validateResource({
    identity: input.identity,
    schema: {
      fields: input.fields ?? [],
      relations: input.relations ?? [],
      operations: Object.freeze([]),
      constraints: Object.freeze([]),
    },
    annotations: emptyAnnotations,
  });
  if (!result.ok) {
    throw new Error(
      `validateResource failed for ${input.identity.namespace}/${input.identity.name}: ${result.error.code}`,
    );
  }
  return result.value;
}

/** Minimal DMMF-shaped document builder for tests. */
export function dmmf(models: readonly unknown[]): { datamodel: { models: unknown[] } } {
  return { datamodel: { models: [...models] } };
}

export function dmmfModel(
  name: string,
  fields: readonly Record<string, unknown>[],
): Record<string, unknown> {
  return { name, fields: [...fields] };
}

export function dmmfScalar(
  name: string,
  type: string,
  isRequired: boolean,
): Record<string, unknown> {
  return {
    name,
    kind: 'scalar',
    type,
    isList: false,
    isRequired,
  };
}

export function dmmfRelation(
  name: string,
  type: string,
  opts: {
    isList: boolean;
    isRequired: boolean;
    relationFromFields?: readonly string[];
    relationToFields?: readonly string[];
  },
): Record<string, unknown> {
  return {
    name,
    kind: 'object',
    type,
    isList: opts.isList,
    isRequired: opts.isRequired,
    relationFromFields: opts.relationFromFields ?? [],
    relationToFields: opts.relationToFields ?? [],
  };
}
