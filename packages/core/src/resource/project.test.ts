import { describe, expect, it } from 'vitest';
import {
  createResourceIdentity,
  resourceIdentitiesEqual,
} from '../identity/index.js';
import {
  resourceMetadataEqual,
  validateResourceMetadata,
} from '../metadata/index.js';
import { createResourceWithAnnotationsForTests } from './create-resource-with-annotations.js';
import { createResourceWithConstraintsForTests } from './create-resource-with-constraints.js';
import { createResourceWithFieldsForTests } from './create-resource-with-fields.js';
import { createResourceWithOperationsForTests } from './create-resource-with-operations.js';
import { createResourceWithRelationsForTests } from './create-resource-with-relations.js';
import { createResource } from './create.js';
import { emptyAnnotations } from './empty-annotations.js';
import { projectResourceMetadata } from './project.js';
import { createEmptyResourceSchema } from './schema.js';
import { snapshotAnnotations } from './annotations.js';

describe('projectResourceMetadata', () => {
  it('projects a minimal Resource to RFC-002-valid metadata with identity agreement', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResource(identity.value);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const projected = projectResourceMetadata(resource.value);
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;

    expect(
      resourceIdentitiesEqual(projected.value.identity, resource.value.identity),
    ).toBe(true);
    expect(projected.value.entries).toEqual([]);
    expect(validateResourceMetadata(projected.value).ok).toBe(true);
  });

  it('projects non-empty annotations by direct 1:1 entry mapping', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithAnnotationsForTests(identity.value, [
      { key: { namespace: 'docs', name: 'summary' }, value: 'A customer' },
      { key: { namespace: 'docs', name: 'title' }, value: 'Customer' },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const projected = projectResourceMetadata(resource.value);
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;

    expect(projected.value.entries).toHaveLength(2);
    expect(validateResourceMetadata(projected.value).ok).toBe(true);

    const reordered = {
      identity: projected.value.identity,
      entries: [...projected.value.entries].reverse(),
    };
    expect(resourceMetadataEqual(projected.value, reordered)).toBe(true);
  });

  it('does not mutate the Resource', () => {
    const identity = createResourceIdentity('billing', 'Invoice');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;
    const resource = createResource(identity.value);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const before = structuredClone(resource.value);
    const projected = projectResourceMetadata(resource.value);
    expect(projected.ok).toBe(true);
    expect(resource.value).toEqual(before);
  });

  it('fails for an invalid Resource without projecting', () => {
    const projected = projectResourceMetadata({
      identity: { namespace: 'crm', name: 'nope' },
      schema: createEmptyResourceSchema(),
      annotations: emptyAnnotations,
    });
    expect(projected.ok).toBe(false);
    if (projected.ok) return;
    expect(projected.error.code).toBe('invalid_resource');
  });

  it('fails for invalid annotations as invalid_resource', () => {
    const projected = projectResourceMetadata({
      identity: { namespace: 'crm', name: 'Customer' },
      schema: createEmptyResourceSchema(),
      annotations: [
        { key: { namespace: 'docs', name: 'summary' }, value: 'a' },
        { key: { namespace: 'docs', name: 'summary' }, value: 'b' },
      ],
    });
    expect(projected.ok).toBe(false);
    if (projected.ok) return;
    expect(projected.error.code).toBe('invalid_resource');
    if (projected.error.code !== 'invalid_resource') return;
    expect(projected.error.cause.code).toBe('invalid_annotations');
  });

  it('projects catalogued rf annotation strings by exact 1:1 preservation', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithAnnotationsForTests(identity.value, [
      { key: { namespace: 'rf', name: 'description' }, value: 'A customer record' },
      { key: { namespace: 'rf', name: 'displayName' }, value: 'Customer' },
      { key: { namespace: 'docs', name: 'summary' }, value: 'CRM aggregate root' },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const projected = projectResourceMetadata(resource.value);
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;

    expect(projected.value.entries).toEqual([
      { key: { namespace: 'rf', name: 'description' }, value: 'A customer record' },
      { key: { namespace: 'rf', name: 'displayName' }, value: 'Customer' },
      { key: { namespace: 'docs', name: 'summary' }, value: 'CRM aggregate root' },
    ]);
    expect(validateResourceMetadata(projected.value).ok).toBe(true);
  });

  it('fails projection for unknown rf annotation vocabulary', () => {
    const projected = projectResourceMetadata({
      identity: { namespace: 'crm', name: 'Customer' },
      schema: createEmptyResourceSchema(),
      annotations: [{ key: { namespace: 'rf', name: 'icon' }, value: 'user' }],
    });
    expect(projected.ok).toBe(false);
    if (projected.ok) return;
    expect(projected.error.code).toBe('invalid_resource');
    if (projected.error.code !== 'invalid_resource') return;
    expect(projected.error.cause.code).toBe('invalid_annotations');
    if (projected.error.cause.code !== 'invalid_annotations') return;
    expect(projected.error.cause.cause).toEqual({
      code: 'unknown_rf_annotation_key',
      index: 0,
      key: { namespace: 'rf', name: 'icon' },
    });
  });

  it('does not contribute fields to projected metadata', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithFieldsForTests(identity.value, [
      { name: 'id', type: 'string', optional: false, nullable: false },
      { name: 'email', type: 'string', optional: true, nullable: false },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const before = structuredClone(resource.value);
    const projected = projectResourceMetadata(resource.value);
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;

    expect(projected.value.entries).toEqual([]);
    expect(resource.value).toEqual(before);
    expect(resource.value.schema.fields.map((f) => f.name)).toEqual([
      'id',
      'email',
    ]);
  });

  it('projects annotations only when fields are also present', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const annotations = snapshotAnnotations([
      { key: { namespace: 'docs', name: 'summary' }, value: 'A customer' },
    ]);
    expect(annotations.ok).toBe(true);
    if (!annotations.ok) return;

    const resource = createResourceWithFieldsForTests(
      identity.value,
      [{ name: 'id', type: 'string', optional: false, nullable: false }],
      annotations.value,
    );
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const projected = projectResourceMetadata(resource.value);
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;
    expect(projected.value.entries).toHaveLength(1);
    expect(projected.value.entries[0]?.key).toEqual({
      namespace: 'docs',
      name: 'summary',
    });
  });

  it('fails for invalid fields as invalid_resource', () => {
    const projected = projectResourceMetadata({
      identity: { namespace: 'crm', name: 'Customer' },
      schema: {
        fields: [
          { name: 'id', type: 'string', optional: false, nullable: false },
          { name: 'id', type: 'string', optional: true, nullable: false },
        ],
        relations: [],
        operations: [],
      constraints: [],
      },
      annotations: emptyAnnotations,
    });
    expect(projected.ok).toBe(false);
    if (projected.ok) return;
    expect(projected.error.code).toBe('invalid_resource');
    if (projected.error.code !== 'invalid_resource') return;
    expect(projected.error.cause.code).toBe('invalid_schema');
  });

  it('fails for name-only fields as invalid_resource', () => {
    const projected = projectResourceMetadata({
      identity: { namespace: 'crm', name: 'Customer' },
      schema: {
        fields: [{ name: 'id' } as { name: string; type: 'string' }],
        relations: [],
        operations: [],
      constraints: [],
      },
      annotations: emptyAnnotations,
    });
    expect(projected.ok).toBe(false);
    if (projected.ok) return;
    expect(projected.error.code).toBe('invalid_resource');
    if (projected.error.code !== 'invalid_resource') return;
    expect(projected.error.cause.code).toBe('invalid_schema');
  });

  it('fails for two-member fields missing optional as invalid_resource', () => {
    const projected = projectResourceMetadata({
      identity: { namespace: 'crm', name: 'Customer' },
      schema: {
        fields: [{ name: 'id', type: 'string' } as never],
        relations: [],
        operations: [],
      constraints: [],
      },
      annotations: emptyAnnotations,
    });
    expect(projected.ok).toBe(false);
    if (projected.ok) return;
    expect(projected.error.code).toBe('invalid_resource');
    if (projected.error.code !== 'invalid_resource') return;
    expect(projected.error.cause.code).toBe('invalid_schema');
    if (projected.error.cause.code !== 'invalid_schema') return;
    expect(projected.error.cause.cause?.code).toBe('missing_field_optional');
  });

  it('fails for three-member fields missing nullable as invalid_resource', () => {
    const projected = projectResourceMetadata({
      identity: { namespace: 'crm', name: 'Customer' },
      schema: {
        fields: [
          { name: 'id', type: 'string', optional: false } as never,
        ],
        relations: [],
        operations: [],
      constraints: [],
      },
      annotations: emptyAnnotations,
    });
    expect(projected.ok).toBe(false);
    if (projected.ok) return;
    expect(projected.error.code).toBe('invalid_resource');
    if (projected.error.code !== 'invalid_resource') return;
    expect(projected.error.cause.code).toBe('invalid_schema');
    if (projected.error.cause.code !== 'invalid_schema') return;
    expect(projected.error.cause.cause?.code).toBe('missing_field_nullable');
  });

  it('does not contribute relations to projected metadata', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithRelationsForTests(identity.value, [
      {
        name: 'author',
        target: { namespace: 'crm', name: 'User' },
        multiplicity: 'one',
        optional: false,
        nullable: false,
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
      },
      {
        name: 'lineItems',
        target: { namespace: 'crm', name: 'LineItem' },
        multiplicity: 'many',
        optional: true,
        nullable: true,
        direction: 'outbound',
        onDelete: 'none',
        onUpdate: 'none',
      },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const before = structuredClone(resource.value);
    const projected = projectResourceMetadata(resource.value);
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;

    expect(projected.value.entries).toEqual([]);
    expect(resource.value).toEqual(before);
    expect(resource.value.schema.relations.map((r) => r.name)).toEqual([
      'author',
      'lineItems',
    ]);
  });

  it('projects annotations only when relations are also present', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const annotations = snapshotAnnotations([
      { key: { namespace: 'docs', name: 'summary' }, value: 'An order' },
    ]);
    expect(annotations.ok).toBe(true);
    if (!annotations.ok) return;

    const resource = createResourceWithRelationsForTests(
      identity.value,
      [
        {
          name: 'author',
          target: { namespace: 'crm', name: 'User' },
          multiplicity: 'one',
          optional: false,
          nullable: false,
          direction: 'outbound',
          onDelete: 'none',
          onUpdate: 'none',
        },
      ],
      annotations.value,
    );
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const projected = projectResourceMetadata(resource.value);
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;
    expect(projected.value.entries).toHaveLength(1);
    expect(projected.value.entries[0]?.key).toEqual({
      namespace: 'docs',
      name: 'summary',
    });
  });

  it('fails for invalid relations as invalid_resource', () => {
    const projected = projectResourceMetadata({
      identity: { namespace: 'crm', name: 'Order' },
      schema: {
        fields: [],
        relations: [
          {
            name: 'author',
            target: { namespace: 'crm', name: 'User' },
            multiplicity: 'one',
            optional: false,
            nullable: false,
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
          },
          {
            name: 'author',
            target: { namespace: 'crm', name: 'Account' },
            multiplicity: 'one',
            optional: true,
            nullable: true,
            direction: 'outbound',
            onDelete: 'none',
            onUpdate: 'none',
          },
        ],
        operations: [],
      constraints: [],
      },
      annotations: emptyAnnotations,
    });
    expect(projected.ok).toBe(false);
    if (projected.ok) return;
    expect(projected.error.code).toBe('invalid_resource');
    if (projected.error.code !== 'invalid_resource') return;
    expect(projected.error.cause.code).toBe('invalid_schema');
  });

  it('fails for four-member relations missing nullable as invalid_resource', () => {
    const projected = projectResourceMetadata({
      identity: { namespace: 'crm', name: 'Order' },
      schema: {
        fields: [],
        relations: [
          {
            name: 'author',
            target: { namespace: 'crm', name: 'User' },
            multiplicity: 'one',
            optional: false,
          } as never,
        ],
        operations: [],
      constraints: [],
      },
      annotations: emptyAnnotations,
    });
    expect(projected.ok).toBe(false);
    if (projected.ok) return;
    expect(projected.error.code).toBe('invalid_resource');
    if (projected.error.code !== 'invalid_resource') return;
    expect(projected.error.cause.code).toBe('invalid_schema');
    if (projected.error.cause.code !== 'invalid_schema') return;
    expect(projected.error.cause.cause?.code).toBe('missing_relation_nullable');
  });

  it('fails for two-member relations as invalid_resource', () => {
    const projected = projectResourceMetadata({
      identity: { namespace: 'crm', name: 'Order' },
      schema: {
        fields: [],
        relations: [
          {
            name: 'author',
            target: { namespace: 'crm', name: 'User' },
          } as never,
        ],
        operations: [],
      constraints: [],
      },
      annotations: emptyAnnotations,
    });
    expect(projected.ok).toBe(false);
    if (projected.ok) return;
    expect(projected.error.code).toBe('invalid_resource');
  });

  it('fails for three-member relations missing optional as invalid_resource', () => {
    const projected = projectResourceMetadata({
      identity: { namespace: 'crm', name: 'Order' },
      schema: {
        fields: [],
        relations: [
          {
            name: 'author',
            target: { namespace: 'crm', name: 'User' },
            multiplicity: 'one',
          } as never,
        ],
        operations: [],
      constraints: [],
      },
      annotations: emptyAnnotations,
    });
    expect(projected.ok).toBe(false);
    if (projected.ok) return;
    expect(projected.error.code).toBe('invalid_resource');
    if (projected.error.code !== 'invalid_resource') return;
    expect(projected.error.cause.code).toBe('invalid_schema');
    if (projected.error.cause.code !== 'invalid_schema') return;
    expect(projected.error.cause.cause?.code).toBe('missing_relation_optional');
  });

  it('does not contribute operations to projected metadata', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithOperationsForTests(identity.value, [
      { name: 'create', kind: 'command', params: [], result: 'void' },
      { name: 'cancel', kind: 'command', params: [], result: 'void' },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const before = structuredClone(resource.value);
    const projected = projectResourceMetadata(resource.value);
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;

    expect(projected.value.entries).toEqual([]);
    expect(resource.value).toEqual(before);
    expect(resource.value.schema.operations.map((o) => o.name)).toEqual([
      'create',
      'cancel',
    ]);
  });

  it('projects annotations only when operations are also present', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const annotations = snapshotAnnotations([
      { key: { namespace: 'docs', name: 'summary' }, value: 'An order' },
    ]);
    expect(annotations.ok).toBe(true);
    if (!annotations.ok) return;

    const resource = createResourceWithOperationsForTests(
      identity.value,
      [{ name: 'create', kind: 'command', params: [], result: 'void' }],
      annotations.value,
    );
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const projected = projectResourceMetadata(resource.value);
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;
    expect(projected.value.entries).toHaveLength(1);
    expect(projected.value.entries[0]?.key).toEqual({
      namespace: 'docs',
      name: 'summary',
    });
  });

  it('fails for invalid operations as invalid_resource', () => {
    const projected = projectResourceMetadata({
      identity: { namespace: 'crm', name: 'Order' },
      schema: {
        fields: [],
        relations: [],
        operations: [
          { name: 'create', kind: 'command', params: [], result: 'void' },
          { name: 'create', kind: 'command', params: [], result: 'void' },
        ],
        constraints: [],
      },
      annotations: emptyAnnotations,
    });
    expect(projected.ok).toBe(false);
    if (projected.ok) return;
    expect(projected.error.code).toBe('invalid_resource');
    if (projected.error.code !== 'invalid_resource') return;
    expect(projected.error.cause.code).toBe('invalid_schema');
  });

  it('does not contribute constraints to projected metadata', () => {
    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithConstraintsForTests(
      identity.value,
      [
        {
          name: 'nonNegativeTotal',
          kind: 'range',
          field: 'total',
          min: 0,
        },
      ],
      emptyAnnotations,
      [
        {
          name: 'total',
          type: 'number',
          optional: false,
          nullable: false,
        },
      ],
    );
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const projected = projectResourceMetadata(resource.value);
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;
    expect(projected.value.entries).toEqual([]);
  });

  it('fails for invalid constraints as invalid_resource', () => {
    const projected = projectResourceMetadata({
      identity: { namespace: 'crm', name: 'Order' },
      schema: {
        fields: [],
        relations: [],
        operations: [],
        constraints: [{ name: 'a' }],
      },
      annotations: emptyAnnotations,
    });
    expect(projected.ok).toBe(false);
    if (projected.ok) return;
    expect(projected.error.code).toBe('invalid_resource');
    if (projected.error.code !== 'invalid_resource') return;
    expect(projected.error.cause).toEqual({
      code: 'invalid_schema',
      cause: { code: 'missing_constraint_kind', index: 0 },
    });
  });
});
