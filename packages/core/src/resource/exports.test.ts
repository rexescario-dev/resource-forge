import { describe, expect, it } from 'vitest';
import * as core from '../index.js';
import {
  createEmptyResourceSchema,
  createResource,
  createResourceIdentity,
  emptyAnnotations,
  projectResourceMetadata,
  resourceIdentitiesEqual,
  validateResource,
} from '../index.js';
import type {
  Field,
  FieldValidationError,
  Relation,
  RelationValidationError,
} from '../index.js';
import { createResourceWithAnnotationsForTests } from './create-resource-with-annotations.js';

describe('M3.1 public exports', () => {
  it('exposes resource construction and validation', () => {
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const created = createResource(identity.value);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const validated = validateResource(created.value);
    expect(validated.ok).toBe(true);
    expect(createEmptyResourceSchema().fields).toEqual([]);
    expect(emptyAnnotations).toEqual([]);
  });
});

describe('M3.2 public exports', () => {
  it('exposes projectResourceMetadata', () => {
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
  });
});

describe('M3.3 public exports', () => {
  it('exposes Annotations surface without EmptyAnnotations or validateAnnotations', () => {
    expect('EmptyAnnotations' in core).toBe(false);
    expect('validateAnnotations' in core).toBe(false);
    expect('createResourceWithAnnotationsForTests' in core).toBe(false);
    expect(Array.isArray(emptyAnnotations)).toBe(true);

    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResourceWithAnnotationsForTests(identity.value, [
      { key: { namespace: 'docs', name: 'summary' }, value: 'hi' },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const projected = projectResourceMetadata(resource.value);
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;
    expect(projected.value.entries).toHaveLength(1);
  });
});

describe('M3.4 / M3.6 / M3.10 public exports', () => {
  it('exposes widened Field contracts without exporting optional validation helpers', () => {
    const field: Field = { name: 'email', type: 'string', optional: true };
    const error: FieldValidationError = {
      code: 'missing_field_optional',
      index: 0,
    };
    expect(field.optional).toBe(true);
    expect(error.code).toBe('missing_field_optional');
    expect('validateFields' in core).toBe(false);
    expect('validateOptional' in core).toBe(false);
    expect('validateFieldType' in core).toBe(false);
    expect('validateFieldName' in core).toBe(false);
    expect('snapshotFields' in core).toBe(false);
    expect('fieldsEqual' in core).toBe(false);
    expect('createResourceWithFieldsForTests' in core).toBe(false);
  });
});

describe('M3.5 / M3.7 / M3.8 / M3.10 public exports', () => {
  it('exposes widened Relation contracts without exporting relation validate helpers', () => {
    const relation: Relation = {
      name: 'customer',
      target: { namespace: 'crm', name: 'Customer' },
      multiplicity: 'one',
      optional: false,
    };
    const error: RelationValidationError = {
      code: 'invalid_relation_optional',
      index: 0,
      optional: 'false',
    };
    expect(relation.optional).toBe(false);
    expect(error.code).toBe('invalid_relation_optional');
    expect(typeof core).toBe('object');
    expect('validateRelations' in core).toBe(false);
    expect('validateRelationTarget' in core).toBe(false);
    expect('validateRelationMultiplicity' in core).toBe(false);
    expect('validateRelationName' in core).toBe(false);
    expect('snapshotRelations' in core).toBe(false);
    expect('relationsEqual' in core).toBe(false);
    expect('createResourceWithRelationsForTests' in core).toBe(false);
  });
});

describe('M3.9 public exports', () => {
  it('does not export operation validate helpers or EmptySchemaCollection', () => {
    expect('validateOperations' in core).toBe(false);
    expect('validateOperationName' in core).toBe(false);
    expect('snapshotOperations' in core).toBe(false);
    expect('operationsEqual' in core).toBe(false);
    expect('createResourceWithOperationsForTests' in core).toBe(false);
    expect('EmptySchemaCollection' in core).toBe(false);
  });
});
