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
  Constraint,
  ConstraintValidationError,
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

describe('M3.4 / M3.6 / M3.10 / M3.11 public exports', () => {
  it('exposes widened Field contracts without exporting optional/nullable validation helpers', () => {
    const field: Field = {
      name: 'email',
      type: 'string',
      optional: true,
      nullable: false,
    };
    const error: FieldValidationError = {
      code: 'missing_field_nullable',
      index: 0,
    };
    expect(field.optional).toBe(true);
    expect(field.nullable).toBe(false);
    expect(error.code).toBe('missing_field_nullable');
    expect('validateFields' in core).toBe(false);
    expect('validateOptional' in core).toBe(false);
    expect('validateNullable' in core).toBe(false);
    expect('validateFieldType' in core).toBe(false);
    expect('validateFieldName' in core).toBe(false);
    expect('snapshotFields' in core).toBe(false);
    expect('fieldsEqual' in core).toBe(false);
    expect('createResourceWithFieldsForTests' in core).toBe(false);
  });
});

describe('M3.5 / M3.7 / M3.8 / M3.10 / M3.12 public exports', () => {
  it('exposes widened Relation contracts without exporting relation/nullable validate helpers', () => {
    const relation: Relation = {
      name: 'customer',
      target: { namespace: 'crm', name: 'Customer' },
      multiplicity: 'one',
      optional: false,
      nullable: true,
    };
    const error: RelationValidationError = {
      code: 'missing_relation_nullable',
      index: 0,
    };
    expect(relation.optional).toBe(false);
    expect(relation.nullable).toBe(true);
    expect(error.code).toBe('missing_relation_nullable');
    expect(typeof core).toBe('object');
    expect('validateRelations' in core).toBe(false);
    expect('validateNullable' in core).toBe(false);
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

describe('M3.14 public exports', () => {
  it('exposes ConstraintKind contracts without exporting constraint validate helpers', () => {
    const constraint: Constraint = {
      name: 'nonNegativeTotal',
      kind: 'range',
      field: 'total',
      min: 0,
    };
    const error: ConstraintValidationError = {
      code: 'unknown_constraint_kind',
      index: 0,
      kind: 'placeholder',
    };
    expect(constraint.kind).toBe('range');
    expect(error.code).toBe('unknown_constraint_kind');
    expect('validateConstraints' in core).toBe(false);
    expect('validateConstraintName' in core).toBe(false);
    expect('snapshotConstraints' in core).toBe(false);
    expect('constraintsEqual' in core).toBe(false);
    expect('createResourceWithConstraintsForTests' in core).toBe(false);
  });
});
