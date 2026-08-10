import { describe, expect, it } from 'vitest';
import { verifyFields } from './fields.js';
import { resolveCorrespondenceMapping } from './mapping.js';
import { normalizeDmmf } from './model-graph.js';
import {
  dmmf,
  dmmfModel,
  dmmfRelation,
  dmmfScalar,
  field,
  requireIdentity,
  requireResource,
} from './test-fixtures.js';

function prepare(resources: Parameters<typeof resolveCorrespondenceMapping>[0], doc: unknown) {
  const resolved = resolveCorrespondenceMapping(resources);
  if (!resolved.ok) throw new Error(resolved.error.message);
  const graph = normalizeDmmf(doc);
  if (!graph.ok) throw new Error(graph.error.message);
  return { resolved: resolved.value, graph: graph.value };
}

describe('verifyFields', () => {
  it('accepts string/boolean/number allow-list types', () => {
    const resource = requireResource({
      identity: requireIdentity('crm', 'Item'),
      fields: [
        field('label', 'string'),
        field('flag', 'boolean'),
        field('amount', 'number'),
      ],
    });
    const { resolved, graph } = prepare(
      [resource],
      dmmf([
        dmmfModel('Item', [
          dmmfScalar('label', 'String', true),
          dmmfScalar('flag', 'Boolean', true),
          dmmfScalar('amount', 'Decimal', true),
        ]),
      ]),
    );
    const result = verifyFields([resource], graph, resolved);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(3);
  });

  it('rejects DateTime for number', () => {
    const resource = requireResource({
      identity: requireIdentity('crm', 'Item'),
      fields: [field('amount', 'number')],
    });
    const { resolved, graph } = prepare(
      [resource],
      dmmf([dmmfModel('Item', [dmmfScalar('amount', 'DateTime', true)])]),
    );
    const result = verifyFields([resource], graph, resolved);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('incompatible_scalar_type');
  });

  it('rejects Field mapped to a relation field', () => {
    const resource = requireResource({
      identity: requireIdentity('crm', 'Item'),
      fields: [field('owner')],
    });
    const { resolved, graph } = prepare(
      [resource],
      dmmf([
        dmmfModel('Item', [
          dmmfRelation('owner', 'User', {
            isList: false,
            isRequired: true,
            relationFromFields: ['ownerId'],
            relationToFields: ['id'],
          }),
          dmmfScalar('ownerId', 'String', true),
        ]),
      ]),
    );
    const result = verifyFields([resource], graph, resolved);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('missing_scalar_field');
  });

  it('rejects nullable=false against null-capable scalar', () => {
    const resource = requireResource({
      identity: requireIdentity('crm', 'Item'),
      fields: [field('nickname', 'string', true, false)],
    });
    const { resolved, graph } = prepare(
      [resource],
      dmmf([dmmfModel('Item', [dmmfScalar('nickname', 'String', false)])]),
    );
    const result = verifyFields([resource], graph, resolved);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('incompatible_nullability');
  });

  it('allows optional=true nullable=false with non-null Prisma scalar', () => {
    const resource = requireResource({
      identity: requireIdentity('crm', 'Item'),
      fields: [field('nickname', 'string', true, false)],
    });
    const { resolved, graph } = prepare(
      [resource],
      dmmf([dmmfModel('Item', [dmmfScalar('nickname', 'String', true)])]),
    );
    const result = verifyFields([resource], graph, resolved);
    expect(result.ok).toBe(true);
  });
});
