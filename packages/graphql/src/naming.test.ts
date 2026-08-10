import { describe, expect, it } from 'vitest';
import {
  assertNoRootFieldCollisions,
  assertNoTypeNameCollisions,
  graphqlTypeNameForIdentity,
  isLegalGraphqlName,
  isReservedGraphqlTypeName,
  rootFieldNameForOperation,
} from './naming.js';

describe('graphql naming (RFC-032 §5.1)', () => {
  it('maps crm/Customer → CrmCustomer and getById → crmCustomer_getById', () => {
    const typeName = graphqlTypeNameForIdentity({ namespace: 'crm', name: 'Customer' });
    expect(typeName).toBe('CrmCustomer');
    expect(
      rootFieldNameForOperation({ namespace: 'crm', name: 'Customer' }, 'getById'),
    ).toBe('crmCustomer_getById');
  });

  it('rejects reserved / illegal GraphQL type names', () => {
    for (const reserved of [
      'Query',
      'Mutation',
      'Subscription',
      'String',
      'Int',
      'Float',
      'Boolean',
      'ID',
      'RfVoid',
      '__Type',
    ]) {
      expect(isReservedGraphqlTypeName(reserved)).toBe(true);
    }
    expect(isReservedGraphqlTypeName('CrmCustomer')).toBe(false);
  });

  it('rejects illegal member / param / root-field lexical and __* names', () => {
    expect(isLegalGraphqlName('email')).toBe(true);
    expect(isLegalGraphqlName('_id')).toBe(true);
    expect(isLegalGraphqlName('getById')).toBe(true);
    expect(isLegalGraphqlName('1bad')).toBe(false);
    expect(isLegalGraphqlName('bad-name')).toBe(false);
    expect(isLegalGraphqlName('__typename')).toBe(false);
    expect(isLegalGraphqlName('')).toBe(false);
  });

  it('detects type-name collisions without assuming injectivity', () => {
    // Distinct inputs that collide after the locked algorithm would require
    // differently-cased namespaces that capitalize to the same prefix + same name.
    // Assert the collision detector itself: two identities → same mapped name → fail.
    const a = { namespace: 'crm', name: 'Customer' };
    const b = { namespace: 'Crm', name: 'Customer' }; // capitalizeFirst('Crm')+'Customer' = 'CrmCustomer'
    expect(graphqlTypeNameForIdentity(a)).toBe(graphqlTypeNameForIdentity(b));
    expect(() => assertNoTypeNameCollisions([a, b])).toThrow(/type name collision/i);
  });

  it('detects root-field collisions without assuming injectivity', () => {
    const a = { namespace: 'crm', name: 'Customer' };
    const b = { namespace: 'Crm', name: 'Customer' };
    const pairs = [
      { identity: a, operationName: 'getById' },
      { identity: b, operationName: 'getById' },
    ] as const;
    expect(rootFieldNameForOperation(a, 'getById')).toBe(
      rootFieldNameForOperation(b, 'getById'),
    );
    expect(() => assertNoRootFieldCollisions(pairs)).toThrow(/root field collision/i);
  });

  it('documents that naming functions are not assumed injective', () => {
    // Same mapped outputs from distinct identities prove non-injectivity;
    // collision detection after mapping is the uniqueness mechanism.
    const mapped = [
      graphqlTypeNameForIdentity({ namespace: 'crm', name: 'Customer' }),
      graphqlTypeNameForIdentity({ namespace: 'Crm', name: 'Customer' }),
    ];
    expect(new Set(mapped).size).toBe(1);
    expect(mapped[0]).toBe('CrmCustomer');
  });
});
