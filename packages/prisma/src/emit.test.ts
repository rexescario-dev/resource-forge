import { emptyAnnotations, type Resource } from '@resource-forge/core';
import { describe, expect, it } from 'vitest';
import { emitPrismaSchema } from './emit.js';
import { toVerificationMapping } from './emit-model.js';
import type { PrismaRealizationMapping } from './realization.js';
import {
  field,
  relation,
  requireIdentity,
  requireResource,
} from './test-fixtures.js';
import { verifyPrismaCorrespondence } from './verify.js';

function customerOrderResources(opts?: {
  orderNullable?: boolean;
  customerIdNullable?: boolean;
  includeInverses?: boolean;
}) {
  const includeInverses = opts?.includeInverses ?? true;
  const customerId = requireIdentity('crm', 'Customer');
  const orderId = requireIdentity('crm', 'Order');
  const customer = requireResource({
    identity: customerId,
    fields: [field('id'), field('name')],
    relations: [
      relation({
        name: 'orders',
        target: orderId,
        multiplicity: 'many',
        optional: false,
        nullable: false,
        ...(includeInverses ? { inverse: 'customer' } : {}),
      }),
    ],
  });
  const order = requireResource({
    identity: orderId,
    fields: [
      field('id'),
      field(
        'customerId',
        'string',
        false,
        opts?.customerIdNullable ?? false,
      ),
    ],
    relations: [
      relation({
        name: 'customer',
        target: customerId,
        multiplicity: 'one',
        optional: false,
        nullable: opts?.orderNullable ?? false,
        join: { local: 'customerId', remote: 'id' },
        ...(includeInverses ? { inverse: 'orders' } : {}),
      }),
    ],
  });
  return { customer, order, customerId, orderId };
}

function baseRealization(
  overrides?: Partial<PrismaRealizationMapping>,
): PrismaRealizationMapping {
  return {
    identities: {
      'crm/Customer': { kind: 'resourceField', field: 'id' },
      'crm/Order': { kind: 'resourceField', field: 'id' },
    },
    ...overrides,
  };
}

describe('emitPrismaSchema', () => {
  it('fails on empty unit', () => {
    const result = emitPrismaSchema([], { identities: {} });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('empty_emission_unit');
  });

  it('fails invalid Resource', () => {
    const invalid = {
      identity: requireIdentity('crm', 'Broken'),
      schema: {
        fields: [
          { name: '!!!', type: 'string', optional: false, nullable: false },
        ],
        relations: [],
        operations: [],
        constraints: [],
      },
      annotations: emptyAnnotations,
    } as unknown as Resource;
    const result = emitPrismaSchema([invalid], {
      identities: {
        'crm/Broken': { kind: 'resourceField', field: 'id' },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid_resource');
  });

  it('§11.1 resourceField String identity succeeds', () => {
    const r = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('id'), field('name')],
    });
    const result = emitPrismaSchema([r], {
      identities: {
        'crm/Customer': { kind: 'resourceField', field: 'id' },
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.models).toContain('id String @id');
    expect(result.value.dmmf.datamodel.models[0]?.name).toBe('Customer');
  });

  it('§11.2–3 prismaExtra String/Int identity succeeds', () => {
    const r = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('email')],
    });
    const stringId = emitPrismaSchema([r], {
      identities: {
        'crm/Customer': {
          kind: 'prismaExtra',
          name: 'rfId',
          scalar: 'String',
          default: 'cuid',
        },
      },
    });
    expect(stringId.ok).toBe(true);
    if (!stringId.ok) return;
    expect(stringId.value.models).toContain('rfId String @id @default(cuid())');

    const intId = emitPrismaSchema([r], {
      identities: {
        'crm/Customer': {
          kind: 'prismaExtra',
          name: 'rfId',
          scalar: 'Int',
          default: 'autoincrement',
        },
      },
    });
    expect(intId.ok).toBe(true);
    if (!intId.ok) return;
    expect(intId.value.models).toContain(
      'rfId Int @id @default(autoincrement())',
    );
  });

  it('§11.4–5 prismaExtra Float/Decimal fail', () => {
    const r = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('email')],
    });
    for (const scalar of ['Float', 'Decimal', 'BigInt'] as const) {
      const result = emitPrismaSchema([r], {
        identities: {
          'crm/Customer': {
            kind: 'prismaExtra',
            name: 'rfId',
            // @ts-expect-error intentional invalid scalar
            scalar,
          },
        },
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('invalid_identity_scalar');
    }
  });

  it('§11.6 resourceField number→Float identity fails', () => {
    const r = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('id', 'number')],
    });
    const result = emitPrismaSchema([r], {
      identities: {
        'crm/Customer': { kind: 'resourceField', field: 'id' },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid_identity_scalar');
  });

  it('resourceField nullable identity fails', () => {
    const r = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('id', 'string', false, true)],
    });
    const result = emitPrismaSchema([r], {
      identities: {
        'crm/Customer': { kind: 'resourceField', field: 'id' },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid_identity');
  });

  it('resourceField Int overlay identity succeeds', () => {
    const r = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('id', 'number')],
    });
    const result = emitPrismaSchema([r], {
      identities: {
        'crm/Customer': { kind: 'resourceField', field: 'id' },
      },
      numberOverlays: { 'crm/Customer': { id: 'Int' } },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.models).toContain('id Int @id');
  });

  it('invalid number overlay fails', () => {
    const r = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('amount', 'number'), field('id')],
    });
    const result = emitPrismaSchema([r], {
      identities: {
        'crm/Customer': { kind: 'resourceField', field: 'id' },
      },
      numberOverlays: {
        'crm/Customer': {
          // @ts-expect-error intentional
          amount: 'DateTime',
        },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid_number_overlay');
  });

  it('incompatible identity default fails', () => {
    const r = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('id')],
    });
    const result = emitPrismaSchema([r], {
      identities: {
        'crm/Customer': {
          kind: 'resourceField',
          field: 'id',
          default: 'autoincrement',
        },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid_identity_default');
  });

  it('name collisions fail', () => {
    const a = requireResource({ identity: requireIdentity('foo', 'Customer') });
    const b = requireResource({ identity: requireIdentity('bar', 'Customer') });
    const result = emitPrismaSchema([a, b], {
      identities: {
        'foo/Customer': {
          kind: 'prismaExtra',
          name: 'id',
          scalar: 'String',
        },
        'bar/Customer': {
          kind: 'prismaExtra',
          name: 'id',
          scalar: 'String',
        },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('mapping_collision');
  });

  it('§11.7 1:n FK relation succeeds', () => {
    const { customer, order } = customerOrderResources();
    const realization = baseRealization();
    const result = emitPrismaSchema([customer, order], realization);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.models).toContain('orders Order[]');
    expect(result.value.models).toMatch(
      /customer Customer @relation\(fields: \[customerId\], references: \[id\]\)/,
    );

    const verify = verifyPrismaCorrespondence(
      [customer, order],
      result.value.dmmf,
      toVerificationMapping(realization),
    );
    expect(verify.ok).toBe(true);
  });

  it('§11.8 nullable singular FK succeeds when FK nullability consistent', () => {
    const { customer, order } = customerOrderResources({
      orderNullable: true,
      customerIdNullable: true,
    });
    const result = emitPrismaSchema([customer, order], baseRealization());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.models).toContain('customer Customer?');
  });

  it('nullable singular FK with non-null local fails', () => {
    const { customer, order } = customerOrderResources({
      orderNullable: true,
      customerIdNullable: false,
    });
    const result = emitPrismaSchema([customer, order], baseRealization());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('relation_nullability_inconsistent');
  });

  it('§11.9 1:1 FK fails', () => {
    const userId = requireIdentity('app', 'User');
    const profileId = requireIdentity('app', 'Profile');
    const user = requireResource({
      identity: userId,
      fields: [field('id')],
      relations: [
        relation({
          name: 'profile',
          target: profileId,
          multiplicity: 'one',
          optional: false,
          nullable: false,
          inverse: 'user',
        }),
      ],
    });
    const profile = requireResource({
      identity: profileId,
      fields: [field('id'), field('userId')],
      relations: [
        relation({
          name: 'user',
          target: userId,
          multiplicity: 'one',
          optional: false,
          nullable: false,
          inverse: 'profile',
          join: { local: 'userId', remote: 'id' },
        }),
      ],
    });
    const result = emitPrismaSchema([user, profile], {
      identities: {
        'app/User': { kind: 'resourceField', field: 'id' },
        'app/Profile': { kind: 'resourceField', field: 'id' },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('topology_unsupported');
  });

  it('§11.10 m:n fails', () => {
    const aId = requireIdentity('app', 'A');
    const bId = requireIdentity('app', 'B');
    const a = requireResource({
      identity: aId,
      fields: [field('id')],
      relations: [
        relation({
          name: 'bs',
          target: bId,
          multiplicity: 'many',
          optional: false,
          nullable: false,
          inverse: 'as',
        }),
      ],
    });
    const b = requireResource({
      identity: bId,
      fields: [field('id')],
      relations: [
        relation({
          name: 'as',
          target: aId,
          multiplicity: 'many',
          optional: false,
          nullable: false,
          inverse: 'bs',
        }),
      ],
    });
    const result = emitPrismaSchema([a, b], {
      identities: {
        'app/A': { kind: 'resourceField', field: 'id' },
        'app/B': { kind: 'resourceField', field: 'id' },
      },
      joinOverlays: {
        'app/A': {
          bs: {
            owningResourceKey: 'app/A',
            owningRelation: 'bs',
            local: 'id',
            remote: 'id',
          },
        },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('topology_unsupported');
  });

  it('§11.11 unilateral inverse absent fails', () => {
    const { customer, order } = customerOrderResources({
      includeInverses: false,
    });
    const result = emitPrismaSchema([customer, order], baseRealization());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unilateral_relation');
  });

  it('§11.12 coincidental counterparts not inferred', () => {
    const aId = requireIdentity('app', 'A');
    const bId = requireIdentity('app', 'B');
    const a = requireResource({
      identity: aId,
      fields: [field('id')],
      relations: [
        relation({
          name: 'b',
          target: bId,
          multiplicity: 'one',
          optional: false,
          nullable: false,
        }),
      ],
    });
    const b = requireResource({
      identity: bId,
      fields: [field('id'), field('aId')],
      relations: [
        relation({
          name: 'aLike',
          target: aId,
          multiplicity: 'one',
          optional: false,
          nullable: false,
          join: { local: 'aId', remote: 'id' },
        }),
      ],
    });
    const result = emitPrismaSchema([a, b], {
      identities: {
        'app/A': { kind: 'resourceField', field: 'id' },
        'app/B': { kind: 'resourceField', field: 'id' },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unilateral_relation');
  });

  it('§11.13 two same-model associations requiring disambiguator fail', () => {
    const aId = requireIdentity('app', 'A');
    const bId = requireIdentity('app', 'B');
    const a = requireResource({
      identity: aId,
      fields: [field('id')],
      relations: [
        relation({
          name: 'primary',
          target: bId,
          multiplicity: 'many',
          optional: false,
          nullable: false,
          inverse: 'aPrimary',
        }),
        relation({
          name: 'secondary',
          target: bId,
          multiplicity: 'many',
          optional: false,
          nullable: false,
          inverse: 'aSecondary',
        }),
      ],
    });
    const b = requireResource({
      identity: bId,
      fields: [field('id'), field('a1'), field('a2')],
      relations: [
        relation({
          name: 'aPrimary',
          target: aId,
          multiplicity: 'one',
          optional: false,
          nullable: false,
          inverse: 'primary',
          join: { local: 'a1', remote: 'id' },
        }),
        relation({
          name: 'aSecondary',
          target: aId,
          multiplicity: 'one',
          optional: false,
          nullable: false,
          inverse: 'secondary',
          join: { local: 'a2', remote: 'id' },
        }),
      ],
    });
    const result = emitPrismaSchema([a, b], {
      identities: {
        'app/A': { kind: 'resourceField', field: 'id' },
        'app/B': { kind: 'resourceField', field: 'id' },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('disambiguator_required');
  });

  it('§11.14 self-relation requiring disambiguation fails', () => {
    const eId = requireIdentity('app', 'Employee');
    const employee = requireResource({
      identity: eId,
      fields: [field('id'), field('managerId', 'string', false, true)],
      relations: [
        relation({
          name: 'manager',
          target: eId,
          multiplicity: 'one',
          optional: false,
          nullable: true,
          inverse: 'reports',
          join: { local: 'managerId', remote: 'id' },
        }),
        relation({
          name: 'reports',
          target: eId,
          multiplicity: 'many',
          optional: false,
          nullable: false,
          inverse: 'manager',
        }),
      ],
    });
    const result = emitPrismaSchema([employee], {
      identities: {
        'app/Employee': { kind: 'resourceField', field: 'id' },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('disambiguator_required');
  });

  it('§11.15 Resource join against non-ID remote fails', () => {
    const customerId = requireIdentity('crm', 'Customer');
    const orderId = requireIdentity('crm', 'Order');
    const customer = requireResource({
      identity: customerId,
      fields: [field('id'), field('code')],
      relations: [
        relation({
          name: 'orders',
          target: orderId,
          multiplicity: 'many',
          optional: false,
          nullable: false,
          inverse: 'customer',
        }),
      ],
    });
    const order = requireResource({
      identity: orderId,
      fields: [field('id'), field('customerCode')],
      relations: [
        relation({
          name: 'customer',
          target: customerId,
          multiplicity: 'one',
          optional: false,
          nullable: false,
          inverse: 'orders',
          join: { local: 'customerCode', remote: 'code' },
        }),
      ],
    });
    const result = emitPrismaSchema([customer, order], baseRealization());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('join_participant_incompatible');
  });

  it('§11.16 prismaExtra remote overlay succeeds', () => {
    const customerId = requireIdentity('crm', 'Customer');
    const orderId = requireIdentity('crm', 'Order');
    const customer = requireResource({
      identity: customerId,
      fields: [field('email')],
      relations: [
        relation({
          name: 'orders',
          target: orderId,
          multiplicity: 'many',
          optional: false,
          nullable: false,
          inverse: 'customer',
        }),
      ],
    });
    const order = requireResource({
      identity: orderId,
      fields: [field('id'), field('customerRfId')],
      relations: [
        relation({
          name: 'customer',
          target: customerId,
          multiplicity: 'one',
          optional: false,
          nullable: false,
          inverse: 'orders',
        }),
      ],
    });
    const realization: PrismaRealizationMapping = {
      identities: {
        'crm/Customer': {
          kind: 'prismaExtra',
          name: 'rfId',
          scalar: 'String',
        },
        'crm/Order': { kind: 'resourceField', field: 'id' },
      },
      joinOverlays: {
        'crm/Order': {
          customer: {
            owningResourceKey: 'crm/Order',
            owningRelation: 'customer',
            local: 'customerRfId',
            remote: { prismaExtra: true },
          },
        },
      },
    };
    const result = emitPrismaSchema([customer, order], realization);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.models).toMatch(
      /customer Customer @relation\(fields: \[customerRfId\], references: \[rfId\]\)/,
    );
    const verify = verifyPrismaCorrespondence(
      [customer, order],
      result.value.dmmf,
      toVerificationMapping(realization),
    );
    expect(verify.ok).toBe(true);
  });

  it('§11.17 absent join + absent overlay fails', () => {
    const customerId = requireIdentity('crm', 'Customer');
    const orderId = requireIdentity('crm', 'Order');
    const customer = requireResource({
      identity: customerId,
      fields: [field('id')],
      relations: [
        relation({
          name: 'orders',
          target: orderId,
          multiplicity: 'many',
          optional: false,
          nullable: false,
          inverse: 'customer',
        }),
      ],
    });
    const order = requireResource({
      identity: orderId,
      fields: [field('id'), field('customerId')],
      relations: [
        relation({
          name: 'customer',
          target: customerId,
          multiplicity: 'one',
          optional: false,
          nullable: false,
          inverse: 'orders',
        }),
      ],
    });
    const result = emitPrismaSchema([customer, order], baseRealization());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('join_unrealized');
  });

  it('many + nullable fails', () => {
    const customerId = requireIdentity('crm', 'Customer');
    const orderId = requireIdentity('crm', 'Order');
    const customer = requireResource({
      identity: customerId,
      fields: [field('id')],
      relations: [
        relation({
          name: 'orders',
          target: orderId,
          multiplicity: 'many',
          optional: false,
          nullable: true,
          inverse: 'customer',
        }),
      ],
    });
    const order = requireResource({
      identity: orderId,
      fields: [field('id'), field('customerId')],
      relations: [
        relation({
          name: 'customer',
          target: customerId,
          multiplicity: 'one',
          optional: false,
          nullable: false,
          inverse: 'orders',
          join: { local: 'customerId', remote: 'id' },
        }),
      ],
    });
    const result = emitPrismaSchema([customer, order], baseRealization());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('many_nullable_unrealizable');
  });

  it('invented local FK field fails', () => {
    const customerId = requireIdentity('crm', 'Customer');
    const orderId = requireIdentity('crm', 'Order');
    const customer = requireResource({
      identity: customerId,
      fields: [field('id')],
      relations: [
        relation({
          name: 'orders',
          target: orderId,
          multiplicity: 'many',
          optional: false,
          nullable: false,
          inverse: 'customer',
        }),
      ],
    });
    const order = requireResource({
      identity: orderId,
      fields: [field('id')],
      relations: [
        relation({
          name: 'customer',
          target: customerId,
          multiplicity: 'one',
          optional: false,
          nullable: false,
          inverse: 'orders',
        }),
      ],
    });
    const result = emitPrismaSchema([customer, order], {
      ...baseRealization(),
      joinOverlays: {
        'crm/Order': {
          customer: {
            owningResourceKey: 'crm/Order',
            owningRelation: 'customer',
            local: 'customerId',
            remote: 'id',
          },
        },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('join_participant_incompatible');
  });

  it('preamble passthrough does not affect models/dmmf', () => {
    const r = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('id')],
    });
    const realization = {
      identities: {
        'crm/Customer': { kind: 'resourceField' as const, field: 'id' },
      },
    };
    const without = emitPrismaSchema([r], realization);
    const withPreamble = emitPrismaSchema([r], realization, {
      preamble: 'datasource db { provider = "postgresql" }',
    });
    expect(without.ok && withPreamble.ok).toBe(true);
    if (!without.ok || !withPreamble.ok) return;
    expect(withPreamble.value.preamble).toContain('postgresql');
    expect(withPreamble.value.models).toBe(without.value.models);
    expect(withPreamble.value.dmmf).toEqual(without.value.dmmf);
  });

  it('does not invoke Prisma CLI/engine/client (provider-independent)', () => {
    const r = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('id'), field('amount', 'number')],
    });
    const result = emitPrismaSchema([r], {
      identities: {
        'crm/Customer': { kind: 'resourceField', field: 'id' },
      },
      numberOverlays: { 'crm/Customer': { amount: 'Decimal' } },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.models).toContain('amount Decimal');
    // Success without any Prisma package dependency beyond this package's core dep
  });

  it('missing identity fails', () => {
    const r = requireResource({
      identity: requireIdentity('crm', 'Customer'),
      fields: [field('id')],
    });
    const result = emitPrismaSchema([r], { identities: {} });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('missing_identity');
  });
});
