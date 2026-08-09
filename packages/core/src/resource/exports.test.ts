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
  CascadeEffects,
  CascadeEvaluationError,
  CascadeEvent,
  CascadePolicy,
  FetchPolicy,
  Constraint,
  ConstraintEnforcementError,
  ConstraintValidationError,
  Field,
  FieldValidationError,
  FieldValueStateError,
  Operation,
  OperationInvocationError,
  Relation,
  RelationCrossRefValidationError,
  RelationDirection,
  RelationJoin,
  RelationLoadStateEntry,
  RelationLoadStateError,
  RelationRuntimeValue,
  RelationSingularAssociation,
  RelationValidationError,
  RelationValueStateError,
  ResourceProjectionError,
  SemanticResultReport,
  ValueStateError,
} from '../index.js';
import { createResourceWithAnnotationsForTests } from './create-resource-with-annotations.js';
import { createResourceWithOperationsForTests } from './create-resource-with-operations.js';

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

describe('M3.20 public exports', () => {
  it('surfaces composition codes on ResourceProjectionError without exporting compose helper', () => {
    expect('composeProjectionContributions' in core).toBe(false);

    const duplicate: ResourceProjectionError = {
      code: 'duplicate_projection_source',
      sourceId: 'annotations',
    };
    const collision: ResourceProjectionError = {
      code: 'projection_key_collision',
      key: { namespace: 'rf', name: 'description' },
      sources: ['annotations', 'fields'],
    };
    expect(duplicate.code).toBe('duplicate_projection_source');
    expect(collision.code).toBe('projection_key_collision');
  });
});

describe('M3.19 public exports', () => {
  it('surfaces vocabulary rejection codes on invalid_annotations without validateAnnotations', () => {
    expect('validateAnnotations' in core).toBe(false);

    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const unknown = createResourceWithAnnotationsForTests(identity.value, [
      { key: { namespace: 'rf', name: 'icon' }, value: 'user' },
    ]);
    expect(unknown.ok).toBe(false);
    if (unknown.ok) return;
    expect(unknown.error.code).toBe('invalid_annotations');
    if (unknown.error.code !== 'invalid_annotations') return;
    expect(unknown.error.cause.code).toBe('unknown_rf_annotation_key');

    const badShape = createResourceWithAnnotationsForTests(identity.value, [
      { key: { namespace: 'rf', name: 'description' }, value: null },
    ]);
    expect(badShape.ok).toBe(false);
    if (badShape.ok) return;
    expect(badShape.error.code).toBe('invalid_annotations');
    if (badShape.error.code !== 'invalid_annotations') return;
    expect(badShape.error.cause.code).toBe('invalid_rf_annotation_value_shape');
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
      direction: 'outbound',
      onDelete: 'none',
      onUpdate: 'none',
      fetch: 'eager',
    };
    const error: RelationValidationError = {
      code: 'missing_relation_nullable',
      index: 0,
    };
    expect(relation.optional).toBe(false);
    expect(relation.nullable).toBe(true);
    expect(relation.direction).toBe('outbound');
    expect(error.code).toBe('missing_relation_nullable');
    expect(typeof core).toBe('object');
    expect('validateRelations' in core).toBe(false);
    expect('validateNullable' in core).toBe(false);
    expect('validateRelationTarget' in core).toBe(false);
    expect('validateRelationMultiplicity' in core).toBe(false);
    expect('validateRelationName' in core).toBe(false);
    expect('snapshotRelations' in core).toBe(false);
    expect('relationsEqual' in core).toBe(false);
    expect('checkRelations' in core).toBe(false);
    expect('createResourceWithRelationsForTests' in core).toBe(false);
  });
});

describe('M3.21 public exports', () => {
  it('exposes direction/join types and checkRelationCrossRefs without internals', () => {
    expect(typeof core.checkRelationCrossRefs).toBe('function');
    expect('checkRelations' in core).toBe(false);
    expect('relationsEqual' in core).toBe(false);
    expect('snapshotRelations' in core).toBe(false);

    const direction: RelationDirection = 'inbound';
    const join: RelationJoin = { local: 'customerId', remote: 'id' };
    const relation: Relation = {
      name: 'customer',
      target: { namespace: 'crm', name: 'Customer' },
      multiplicity: 'one',
      optional: false,
      nullable: false,
      direction: 'outbound',
      onDelete: 'none',
      onUpdate: 'none',
      fetch: 'eager',
      inverse: 'orders',
      join,
    };
    const crossRefError: RelationCrossRefValidationError = {
      code: 'unknown_inverse_relation',
      relation: 'customer',
      inverse: 'orders',
    };
    const localError: RelationValidationError = {
      code: 'missing_relation_direction',
      index: 0,
    };
    expect(direction).toBe('inbound');
    expect(relation.join?.remote).toBe('id');
    expect(crossRefError.code).toBe('unknown_inverse_relation');
    expect(localError.code).toBe('missing_relation_direction');

    const checked = core.checkRelationCrossRefs(
      { identity: { namespace: 'crm', name: 'Order' }, relations: [relation] },
      [],
    );
    expect(checked).toEqual({ ok: true, value: undefined });
  });
});

describe('M3.22 public exports', () => {
  it('exposes value-state checks and types without wiring into validateResource', () => {
    expect(typeof core.checkFieldValueStates).toBe('function');
    expect(typeof core.checkRelationValueStates).toBe('function');
    expect(typeof core.checkConstraintValues).toBe('function');

    const fieldError: FieldValueStateError = {
      code: 'forbidden_absent_field',
      field: 'total',
    };
    const relationError: RelationValueStateError = {
      code: 'forbidden_null_relation_element',
      relation: 'tags',
      index: 0,
    };
    const umbrella: ValueStateError = fieldError;
    const singular: RelationSingularAssociation = Object.freeze({});
    const runtime: RelationRuntimeValue = singular;
    expect(fieldError.code).toBe('forbidden_absent_field');
    expect(relationError.index).toBe(0);
    expect(umbrella.code).toBe('forbidden_absent_field');
    expect(runtime).toEqual({});

    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;
    const resource = createResource(identity.value);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    expect(core.checkFieldValueStates(resource.value, new Map())).toEqual({
      ok: true,
      value: undefined,
    });
    expect(core.checkRelationValueStates(resource.value, new Map())).toEqual({
      ok: true,
      value: undefined,
    });
  });
});

describe('M3.23 public exports', () => {
  it('exposes cascade types and evaluateCascadeEvent without wiring into validateResource', () => {
    expect(typeof core.evaluateCascadeEvent).toBe('function');
    expect('checkRelations' in core).toBe(false);

    const policy: CascadePolicy = 'restrict';
    const event: CascadeEvent = 'delete';
    const effects: CascadeEffects = { cascades: [], setNulls: [] };
    const evaluationError: CascadeEvaluationError = {
      code: 'cascade_restricted',
      relation: 'customer',
      event: 'delete',
    };
    const declarationError: RelationValidationError = {
      code: 'missing_relation_on_delete',
      index: 0,
    };
    expect(policy).toBe('restrict');
    expect(event).toBe('delete');
    expect(effects.setNulls).toEqual([]);
    expect(evaluationError.code).toBe('cascade_restricted');
    expect(declarationError.code).toBe('missing_relation_on_delete');

    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;
    const resource = createResource(identity.value);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    expect(core.evaluateCascadeEvent(resource.value, 'delete', new Map())).toEqual({
      ok: true,
      value: { cascades: [], setNulls: [] },
    });
    expect(core.validateResource(resource.value)).toEqual({
      ok: true,
      value: resource.value,
    });
  });
});

describe('M3.24 public exports', () => {
  it('exposes fetch types and checkRelationLoadStates without wiring into validateResource', () => {
    expect(typeof core.checkRelationLoadStates).toBe('function');
    expect('checkRelations' in core).toBe(false);

    const fetch: FetchPolicy = 'lazy';
    const entry: RelationLoadStateEntry = { status: 'not-loaded' };
    const loadError: RelationLoadStateError = {
      code: 'eager_relation_not_loaded',
      relation: 'customer',
    };
    const declarationError: RelationValidationError = {
      code: 'missing_relation_fetch',
      index: 0,
    };
    expect(fetch).toBe('lazy');
    expect(entry.status).toBe('not-loaded');
    expect(loadError.code).toBe('eager_relation_not_loaded');
    expect(declarationError.code).toBe('missing_relation_fetch');

    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;
    const resource = createResource(identity.value);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    expect(core.checkRelationLoadStates(resource.value, new Map())).toEqual({
      ok: true,
      value: undefined,
    });
    expect(core.validateResource(resource.value)).toEqual({
      ok: true,
      value: resource.value,
    });
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

describe('M3.15 public exports', () => {
  it('exposes checkConstraintValues and enforcement types without declaration helpers', () => {
    expect(typeof core.checkConstraintValues).toBe('function');
    expect('validateConstraints' in core).toBe(false);
    expect('createResourceWithConstraintsForTests' in core).toBe(false);

    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;

    const resource = createResource(identity.value);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const enforced = core.checkConstraintValues(resource.value, new Map());
    expect(enforced).toEqual({ ok: true, value: undefined });
  });
});

describe('M3.16 public exports', () => {
  it('exposes distinct/equal ConstraintKind without validate helpers', () => {
    const distinct: Constraint = {
      name: 'emailsDiffer',
      kind: 'distinct',
      fields: ['primaryEmail', 'billingEmail'],
    };
    const equal: Constraint = {
      name: 'passwordsMatch',
      kind: 'equal',
      fields: ['password', 'passwordConfirm'],
    };
    const enforcement: ConstraintEnforcementError = {
      code: 'distinct_constraint_violated',
      index: 0,
      constraintName: 'emailsDiffer',
      field: 'primaryEmail',
    };
    expect(distinct.kind).toBe('distinct');
    expect(equal.kind).toBe('equal');
    expect(enforcement.code).toBe('distinct_constraint_violated');
    expect('validateConstraints' in core).toBe(false);
  });
});

describe('M3.17 public exports', () => {
  it('exposes unique kind, checkPopulationUniqueness, and population error types', () => {
    expect(typeof core.checkPopulationUniqueness).toBe('function');

    const uniqueField: Constraint = {
      name: 'emailUnique',
      kind: 'unique',
      field: 'email',
    };
    const uniqueFields: Constraint = {
      name: 'tenantSeq',
      kind: 'unique',
      fields: ['tenantId', 'sequence'],
    };
    const violated: ConstraintEnforcementError = {
      code: 'unique_constraint_violated',
      index: 0,
      constraintName: 'emailUnique',
      field: 'email',
    };
    expect(uniqueField.kind).toBe('unique');
    expect(uniqueFields.kind).toBe('unique');
    expect(violated.code).toBe('unique_constraint_violated');
    expect(violated.code).not.toBe('missing_occupancy_surface');

    const identity = createResourceIdentity('crm', 'User');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;
    const resource = createResource(identity.value);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const checked = core.checkPopulationUniqueness(
      resource.value,
      new Map(),
      () => undefined,
    );
    expect(checked).toEqual({ ok: true, value: undefined });
  });
});

describe('M3.18 public exports', () => {
  it('exposes invokeOperation, Operation kinds, and SemanticResultReport', () => {
    expect(typeof core.invokeOperation).toBe('function');
    expect('validateOperations' in core).toBe(false);

    const operation: Operation = {
      name: 'cancel',
      kind: 'command',
      params: [],
      result: 'void',
    };
    const report: SemanticResultReport = { outcome: 'void' };
    const missing: OperationInvocationError = {
      code: 'missing_operation_handler',
      operationName: 'cancel',
    };
    expect(operation.kind).toBe('command');
    expect(report.outcome).toBe('void');
    expect(missing.code).toBe('missing_operation_handler');

    const identity = createResourceIdentity('crm', 'Order');
    expect(identity.ok).toBe(true);
    if (!identity.ok) return;
    const resource = createResourceWithOperationsForTests(identity.value, [
      { name: 'cancel', kind: 'command', params: [], result: 'void' },
    ]);
    expect(resource.ok).toBe(true);
    if (!resource.ok) return;

    const invoked = core.invokeOperation(
      resource.value,
      'cancel',
      new Map(),
      () => () => ({ outcome: 'void' }),
    );
    expect(invoked).toEqual({ ok: true, value: { outcome: 'void' } });
  });
});
