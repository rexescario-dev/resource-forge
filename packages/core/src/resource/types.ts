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

/** Closed associated Relation member (RFC-015; supersedes RFC-013 Relation member floor). */
export type Relation = {
  readonly name: RelationName;
  readonly target: ResourceIdentity;
  readonly multiplicity: RelationMultiplicity;
  readonly optional: boolean;
  readonly nullable: boolean;
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
    };

/** Operation identity string conforming to RFC-012 grammar. */
export type OperationName = string;

/** Closed name-only Operation member (RFC-012). */
export type Operation = {
  readonly name: OperationName;
};

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
    };

/** Constraint identity string conforming to RFC-016 grammar. */
export type ConstraintName = string;

/** Closed exclusive constraint kind vocabulary (RFC-017). */
export type ConstraintKind = 'range' | 'pattern' | 'enum';

/** Kind-discriminated closed Constraint member (RFC-017). */
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
  | { readonly code: 'invalid_enum_values'; readonly index: number };

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
    };
