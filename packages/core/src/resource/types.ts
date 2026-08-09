import type { ResourceIdentity } from '../identity/types.js';
import type { IdentityValidationError } from '../identity/types.js';
import type {
  JsonValueValidationError,
  MetadataEntry,
  MetadataKey,
  MetadataKeyValidationError,
  MetadataValidationError,
} from '../metadata/types.js';

/** Validated field identity string (RFC-007). */
export type FieldName = string;

/** Closed FieldType vocabulary (RFC-009). */
export type FieldType = 'string' | 'number' | 'boolean';

/** Closed typed Field member (RFC-014; supersedes RFC-013 Field member floor). */
export type Field = {
  readonly name: FieldName;
  readonly type: FieldType;
  readonly optional: boolean;
  readonly nullable: boolean;
};

export type FieldValidationError =
  | {
      readonly code: 'invalid_field_name';
      readonly index: number;
      readonly name: string;
    }
  | {
      readonly code: 'duplicate_field_name';
      readonly index: number;
      readonly name: string;
    }
  | {
      readonly code: 'invalid_field_member';
      readonly index: number;
    }
  | {
      readonly code: 'invalid_field_type';
      readonly index: number;
      readonly type: unknown;
    }
  | {
      readonly code: 'missing_field_optional';
      readonly index: number;
    }
  | {
      readonly code: 'invalid_field_optional';
      readonly index: number;
      readonly optional: unknown;
    }
  | {
      readonly code: 'missing_field_nullable';
      readonly index: number;
    }
  | {
      readonly code: 'invalid_field_nullable';
      readonly index: number;
      readonly nullable: unknown;
    };

/** Validated relation identity string (RFC-008). */
export type RelationName = string;

/** Closed relationship-shape vocabulary (RFC-011). */
export type RelationMultiplicity = 'one' | 'many';

/** Closed Relation traversal direction (RFC-024). */
export type RelationDirection = 'outbound' | 'inbound';

/** Closed join-field binding identity (RFC-024). */
export type RelationJoin = {
  readonly local: FieldName;
  readonly remote: FieldName;
};

/**
 * Closed associated Relation member (RFC-024; widens RFC-015).
 * Required `direction`; optional `inverse` / `join` only when present.
 */
export type Relation = {
  readonly name: RelationName;
  readonly target: ResourceIdentity;
  readonly multiplicity: RelationMultiplicity;
  readonly optional: boolean;
  readonly nullable: boolean;
  readonly direction: RelationDirection;
  readonly inverse?: RelationName;
  readonly join?: RelationJoin;
};

export type RelationValidationError =
  | {
      readonly code: 'invalid_relation_name';
      readonly index: number;
      readonly name: string;
    }
  | {
      readonly code: 'duplicate_relation_name';
      readonly index: number;
      readonly name: string;
    }
  | {
      readonly code: 'invalid_relation_member';
      readonly index: number;
    }
  | {
      readonly code: 'invalid_relation_target';
      readonly index: number;
      readonly cause: IdentityValidationError;
    }
  | {
      readonly code: 'missing_relation_multiplicity';
      readonly index: number;
    }
  | {
      readonly code: 'invalid_relation_multiplicity';
      readonly index: number;
      readonly multiplicity: unknown;
    }
  | {
      readonly code: 'missing_relation_optional';
      readonly index: number;
    }
  | {
      readonly code: 'invalid_relation_optional';
      readonly index: number;
      readonly optional: unknown;
    }
  | {
      readonly code: 'missing_relation_nullable';
      readonly index: number;
    }
  | {
      readonly code: 'invalid_relation_nullable';
      readonly index: number;
      readonly nullable: unknown;
    }
  | {
      readonly code: 'missing_relation_direction';
      readonly index: number;
    }
  | {
      readonly code: 'invalid_relation_direction';
      readonly index: number;
      readonly direction: unknown;
    }
  | {
      readonly code: 'invalid_relation_inverse';
      readonly index: number;
      readonly inverse: unknown;
    }
  | {
      readonly code: 'invalid_relation_join';
      readonly index: number;
    }
  | {
      readonly code: 'invalid_join_local_field_name';
      readonly index: number;
      readonly name: string;
    }
  | {
      readonly code: 'unknown_join_local_field';
      readonly index: number;
      readonly name: FieldName;
    }
  | {
      readonly code: 'invalid_join_remote_field_name';
      readonly index: number;
      readonly name: string;
    };

/** Multi-Resource Relation cross-ref failure (RFC-024 §7.2). */
export type RelationCrossRefValidationError =
  | {
      readonly code: 'unknown_inverse_relation';
      readonly relation: RelationName;
      readonly inverse: RelationName;
    }
  | {
      readonly code: 'inverse_target_mismatch';
      readonly relation: RelationName;
      readonly inverse: RelationName;
    }
  | {
      readonly code: 'inverse_direction_mismatch';
      readonly relation: RelationName;
      readonly inverse: RelationName;
    }
  | {
      readonly code: 'unknown_join_remote_field';
      readonly relation: RelationName;
      readonly name: FieldName;
    };

/** Operation identity string conforming to RFC-012 grammar. */
export type OperationName = string;

/** Closed Operation semantic role (RFC-021). */
export type OperationKind = 'command' | 'query';

/** Parameter identity within one Operation’s params (RFC-021). */
export type OperationParamName = string;

/** Closed Operation parameter member (RFC-021). */
export type OperationParam = {
  readonly name: OperationParamName;
  readonly type: FieldType;
  readonly optional: boolean;
  readonly nullable: boolean;
};

/** Declared Operation result (RFC-021); `"void"` is result-only. */
export type OperationResultType = FieldType | 'void';

/**
 * Closed Operation member (RFC-021).
 * Amends RFC-012 name-only floor — no dual-shape.
 */
export type Operation = {
  readonly name: OperationName;
  readonly kind: OperationKind;
  readonly params: ReadonlyArray<OperationParam>;
  readonly result: OperationResultType;
};

/** Runtime argument value for Operation invoke (RFC-021). */
export type OperationRuntimeValue = string | number | boolean | null;

/**
 * Concrete core representation of RFC-021 semantic result outcome.
 * Not a wire format, host protocol, or portable representation outside core.
 */
export type SemanticResultReport =
  | { readonly outcome: 'void' }
  | { readonly outcome: 'value'; readonly value: string | number | boolean };

export type OperationHandler = (
  args: ReadonlyMap<string, OperationRuntimeValue>,
) => SemanticResultReport;

export type OperationHandlerProvider = (
  resource: Resource,
  operationName: OperationName,
) => OperationHandler | undefined;

export type OperationValidationError =
  | {
      readonly code: 'invalid_operation_name';
      readonly index: number;
      readonly name: string;
    }
  | {
      readonly code: 'duplicate_operation_name';
      readonly index: number;
      readonly name: string;
    }
  | {
      readonly code: 'invalid_operation_member';
      readonly index: number;
    }
  | {
      readonly code: 'invalid_operation_param';
      readonly index: number;
      readonly paramIndex: number;
    }
  | {
      readonly code: 'duplicate_operation_param_name';
      readonly index: number;
      readonly paramIndex: number;
      readonly name: string;
    }
  | {
      readonly code: 'invalid_operation_result_for_kind';
      readonly index: number;
    };

export type OperationInvocationError =
  | {
      readonly code: 'unknown_operation';
      readonly operationName: string;
    }
  | {
      readonly code: 'unknown_argument';
      readonly operationName: OperationName;
      readonly paramName: string;
    }
  | {
      readonly code: 'missing_required_argument';
      readonly operationName: OperationName;
      readonly paramName: OperationParamName;
    }
  | {
      readonly code: 'null_argument';
      readonly operationName: OperationName;
      readonly paramName: OperationParamName;
    }
  | {
      readonly code: 'argument_type_mismatch';
      readonly operationName: OperationName;
      readonly paramName: OperationParamName;
    }
  | {
      readonly code: 'missing_operation_handler';
      readonly operationName: OperationName;
    }
  | {
      readonly code: 'result_contract_mismatch';
      readonly operationName: OperationName;
    };

/** Constraint identity string conforming to RFC-016 grammar. */
export type ConstraintName = string;

/** Closed exclusive constraint kind vocabulary (RFC-017 / RFC-019 / RFC-020). */
export type ConstraintKind =
  | 'range'
  | 'pattern'
  | 'enum'
  | 'distinct'
  | 'equal'
  | 'unique';

/** Kind-discriminated closed Constraint member (RFC-017 / RFC-019 / RFC-020). */
export type Constraint =
  | {
      readonly name: ConstraintName;
      readonly kind: 'range';
      readonly field: FieldName;
      readonly min?: number;
      readonly max?: number;
    }
  | {
      readonly name: ConstraintName;
      readonly kind: 'pattern';
      readonly field: FieldName;
      readonly pattern: string;
    }
  | {
      readonly name: ConstraintName;
      readonly kind: 'enum';
      readonly field: FieldName;
      readonly values: ReadonlyArray<string | number | boolean>;
    }
  | {
      readonly name: ConstraintName;
      readonly kind: 'distinct';
      readonly fields: ReadonlyArray<FieldName>;
    }
  | {
      readonly name: ConstraintName;
      readonly kind: 'equal';
      readonly fields: ReadonlyArray<FieldName>;
    }
  | {
      readonly name: ConstraintName;
      readonly kind: 'unique';
      readonly field: FieldName;
    }
  | {
      readonly name: ConstraintName;
      readonly kind: 'unique';
      readonly fields: ReadonlyArray<FieldName>;
    };

export type ConstraintValidationError =
  | { readonly code: 'missing_constraints' }
  | { readonly code: 'invalid_constraints_collection' }
  | {
      readonly code: 'invalid_constraint_name';
      readonly index: number;
      readonly name: string;
    }
  | {
      readonly code: 'duplicate_constraint_name';
      readonly index: number;
      readonly name: string;
    }
  | { readonly code: 'missing_constraint_kind'; readonly index: number }
  | {
      readonly code: 'invalid_constraint_kind';
      readonly index: number;
      readonly kind: unknown;
    }
  | {
      readonly code: 'unknown_constraint_kind';
      readonly index: number;
      readonly kind: string;
    }
  | { readonly code: 'invalid_constraint_member'; readonly index: number }
  | {
      readonly code: 'invalid_constraint_field';
      readonly index: number;
      readonly field: unknown;
    }
  | {
      readonly code: 'unresolved_constraint_field';
      readonly index: number;
      readonly field: string;
    }
  | {
      readonly code: 'constraint_field_type_mismatch';
      readonly index: number;
      readonly field: string;
      readonly expected: FieldType;
      readonly actual: FieldType;
    }
  | { readonly code: 'invalid_range_bounds'; readonly index: number }
  | { readonly code: 'invalid_pattern'; readonly index: number }
  | { readonly code: 'invalid_enum_values'; readonly index: number }
  | { readonly code: 'missing_constraint_fields'; readonly index: number }
  | { readonly code: 'invalid_constraint_fields'; readonly index: number }
  | {
      readonly code: 'duplicate_constraint_field_target';
      readonly index: number;
    }
  | {
      readonly code: 'heterogeneous_constraint_field_types';
      readonly index: number;
    }
  | {
      readonly code: 'invalid_constraint_targeting_shape';
      readonly index: number;
    };

/** Runtime field value in a field-value map (RFC-018). */
export type FieldRuntimeValue = string | number | boolean | null;

/**
 * Opaque non-null non-array association placeholder for value-state checks (RFC-025).
 * Not a wire, ORM, Resource, or ResourceIdentity type.
 */
export type RelationSingularAssociation = {
  readonly __rfRelationSingularAssociation?: never;
};

/**
 * Opaque non-null collection element placeholder for value-state checks (RFC-025).
 * Not a wire, ORM, Resource, or ResourceIdentity type.
 */
export type RelationAssociationElement = {
  readonly __rfRelationAssociationElement?: never;
};

/**
 * Conceptual Relation instance value for value-state checks (RFC-025; not wire).
 * - `null` = association-level null
 * - singular placeholder = present non-null for multiplicity `"one"`
 * - readonly array = present non-null collection for multiplicity `"many"`
 */
export type RelationRuntimeValue =
  | null
  | RelationSingularAssociation
  | ReadonlyArray<RelationAssociationElement | null>;

/** Field value-state check failure (RFC-025); distinct from declaration / constraint errors. */
export type FieldValueStateError =
  | { readonly code: 'forbidden_absent_field'; readonly field: FieldName }
  | { readonly code: 'forbidden_null_field'; readonly field: FieldName };

/** Relation value-state check failure (RFC-025); distinct from declaration / constraint errors. */
export type RelationValueStateError =
  | {
      readonly code: 'forbidden_absent_relation';
      readonly relation: RelationName;
    }
  | {
      readonly code: 'forbidden_null_relation';
      readonly relation: RelationName;
    }
  | {
      readonly code: 'relation_value_shape_mismatch';
      readonly relation: RelationName;
      readonly multiplicity: RelationMultiplicity;
    }
  | {
      readonly code: 'forbidden_null_relation_element';
      readonly relation: RelationName;
      readonly index: number;
    };

/** Umbrella value-state error (RFC-025). */
export type ValueStateError = FieldValueStateError | RelationValueStateError;

/** Runtime constraint enforcement failure (RFC-018); distinct from declaration errors. */
export type ConstraintEnforcementError =
  | {
      readonly code: 'missing_required_field_value';
      readonly index: number;
      readonly constraintName: ConstraintName;
      readonly field: FieldName;
    }
  | {
      readonly code: 'null_field_value';
      readonly index: number;
      readonly constraintName: ConstraintName;
      readonly field: FieldName;
    }
  | {
      readonly code: 'field_value_type_mismatch';
      readonly index: number;
      readonly constraintName: ConstraintName;
      readonly field: FieldName;
      readonly expected: FieldType;
    }
  | {
      readonly code: 'range_constraint_violated';
      readonly index: number;
      readonly constraintName: ConstraintName;
      readonly field: FieldName;
    }
  | {
      readonly code: 'pattern_compilation_failure';
      readonly index: number;
      readonly constraintName: ConstraintName;
      readonly field: FieldName;
    }
  | {
      readonly code: 'pattern_constraint_violated';
      readonly index: number;
      readonly constraintName: ConstraintName;
      readonly field: FieldName;
    }
  | {
      readonly code: 'enum_constraint_violated';
      readonly index: number;
      readonly constraintName: ConstraintName;
      readonly field: FieldName;
    }
  | {
      readonly code: 'distinct_constraint_violated';
      readonly index: number;
      readonly constraintName: ConstraintName;
      readonly field: FieldName;
    }
  | {
      readonly code: 'equal_constraint_violated';
      readonly index: number;
      readonly constraintName: ConstraintName;
      readonly field: FieldName;
    }
  | {
      readonly code: 'unique_constraint_violated';
      readonly index: number;
      readonly constraintName: ConstraintName;
      readonly field: FieldName;
    };

/** Invalid invocation / host-contract failure for population checks (RFC-020). */
export type MissingOccupancyError = {
  readonly code: 'missing_occupancy_surface';
  readonly index: number;
  readonly constraintName: ConstraintName;
};

/**
 * Population check errors (RFC-020).
 * `missing_occupancy_surface` MUST NOT appear on ConstraintEnforcementError.
 */
export type PopulationUniquenessError =
  | ConstraintEnforcementError
  | MissingOccupancyError;

/** Uniqueness key extracted for population checks (RFC-020). */
export type UniquenessKey =
  | Exclude<FieldRuntimeValue, null>
  | ReadonlyArray<Exclude<FieldRuntimeValue, null>>;

/** Host occupancy answer for one unique Constraint (RFC-020). */
export type OccupancySurface = {
  readonly isOccupied: (key: UniquenessKey) => boolean;
};

/**
 * Maps each evaluated unique Constraint to its occupancy surface.
 * `index` is the zero-based position in ResourceSchema.constraints.
 */
export type OccupancyProvider = (
  constraint: Extract<Constraint, { kind: 'unique' }>,
  index: number,
) => OccupancySurface | undefined;

export type ResourceSchema = {
  readonly fields: ReadonlyArray<Field>;
  readonly relations: ReadonlyArray<Relation>;
  readonly operations: ReadonlyArray<Operation>;
  readonly constraints: ReadonlyArray<Constraint>;
};

/** Implementation representation of RFC-006 Annotations (unordered semantically). */
export type Annotations = ReadonlyArray<MetadataEntry>;

export type AnnotationValidationError =
  | {
      readonly code: 'invalid_key';
      readonly index: number;
      readonly cause: MetadataKeyValidationError;
    }
  | {
      readonly code: 'invalid_value';
      readonly index: number;
      readonly cause: JsonValueValidationError;
    }
  | {
      readonly code: 'duplicate_key';
      readonly index: number;
      readonly key: MetadataKey;
    }
  | {
      readonly code: 'unknown_rf_annotation_key';
      readonly index: number;
      readonly key: MetadataKey;
    }
  | {
      readonly code: 'invalid_rf_annotation_value_shape';
      readonly index: number;
      readonly key: MetadataKey;
    };

export type Resource = {
  readonly identity: ResourceIdentity;
  readonly schema: ResourceSchema;
  readonly annotations: Annotations;
};

export type ResourceValidationError =
  | {
      readonly code: 'invalid_identity';
      readonly cause: IdentityValidationError;
    }
  | {
      readonly code: 'invalid_schema';
      readonly cause?:
        | FieldValidationError
        | RelationValidationError
        | OperationValidationError
        | ConstraintValidationError;
    }
  | {
      readonly code: 'invalid_annotations';
      readonly cause: AnnotationValidationError;
    };

export type ResourceProjectionError =
  | {
      readonly code: 'invalid_resource';
      readonly cause: ResourceValidationError;
    }
  | {
      readonly code: 'invalid_metadata';
      readonly cause: MetadataValidationError;
    }
  | {
      readonly code: 'duplicate_projection_source';
      readonly sourceId: string;
    }
  | {
      readonly code: 'projection_key_collision';
      readonly key: MetadataKey;
      readonly sources: readonly string[];
    };
