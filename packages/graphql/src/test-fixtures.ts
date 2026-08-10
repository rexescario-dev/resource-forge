import {
  createResourceIdentity,
  emptyAnnotations,
  validateResource,
  type Field,
  type Operation,
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

export function queryOp(
  name: string,
  params: Operation['params'] = [],
  result: Exclude<Operation['result'], 'void'> = 'string',
): Operation {
  return { name, kind: 'query', params, result };
}

export function commandOp(
  name: string,
  params: Operation['params'] = [],
  result: Operation['result'] = 'void',
): Operation {
  return { name, kind: 'command', params, result };
}

export function requireResource(input: {
  identity: ResourceIdentity;
  fields?: readonly Field[];
  relations?: readonly Relation[];
  operations?: readonly Operation[];
}): Resource {
  const result = validateResource({
    identity: input.identity,
    schema: {
      fields: input.fields ?? [],
      relations: input.relations ?? [],
      operations: input.operations ?? [],
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
