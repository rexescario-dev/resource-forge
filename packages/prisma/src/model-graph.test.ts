import { describe, expect, it } from 'vitest';
import { normalizeDmmf } from './model-graph.js';
import {
  dmmf,
  dmmfModel,
  dmmfRelation,
  dmmfScalar,
} from './test-fixtures.js';

describe('normalizeDmmf', () => {
  it('normalizes scalar and relation fields with nullCapable', () => {
    const result = normalizeDmmf(
      dmmf([
        dmmfModel('Customer', [
          dmmfScalar('id', 'String', true),
          dmmfScalar('nickname', 'String', false),
          dmmfRelation('orders', 'Order', {
            isList: true,
            isRequired: true,
            relationFromFields: [],
            relationToFields: [],
          }),
        ]),
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const customer = result.value.models.get('Customer');
    expect(customer?.fields.get('id')).toMatchObject({
      kind: 'scalar',
      type: 'String',
      nullCapable: false,
    });
    expect(customer?.fields.get('nickname')).toMatchObject({
      kind: 'scalar',
      nullCapable: true,
    });
    expect(customer?.fields.get('orders')).toMatchObject({
      kind: 'relation',
      list: true,
      nullCapable: false,
      targetModelName: 'Order',
    });
  });

  it('fails when datamodel.models is missing', () => {
    const result = normalizeDmmf({ models: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unusable_dmmf');
  });

  it('fails when relation lacks target type', () => {
    const result = normalizeDmmf(
      dmmf([
        {
          name: 'Customer',
          fields: [
            {
              name: 'orders',
              kind: 'object',
              isList: true,
              isRequired: true,
              relationFromFields: [],
              relationToFields: [],
            },
          ],
        },
      ]),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unusable_dmmf');
  });

  it('fails when isRequired is missing', () => {
    const result = normalizeDmmf(
      dmmf([
        {
          name: 'Customer',
          fields: [{ name: 'id', kind: 'scalar', type: 'String' }],
        },
      ]),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unusable_dmmf');
  });
});
