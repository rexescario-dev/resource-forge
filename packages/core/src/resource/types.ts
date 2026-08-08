import type { ResourceIdentity } from '../identity/types.js';
import type { IdentityValidationError } from '../identity/types.js';
import type {
  JsonValueValidationError,
  MetadataEntry,
  MetadataKey,
  MetadataKeyValidationError,
  MetadataValidationError,
} from '../metadata/types.js';

export type EmptySchemaCollection = readonly [];

/** Validated field identity string (RFC-007). */
export type FieldName = string;

/** Closed FieldType vocabulary (RFC-009). */
export type FieldType = 'string' | 'number' | 'boolean';

/** Closed typed Field member (RFC-009; amends RFC-007 §3.2). */
export type Field = {
  readonly name: FieldName;
  readonly type: FieldType;
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
    };

/** Validated relation identity string (RFC-008). */
export type RelationName = string;

/** Closed name-only Relation member (RFC-008). */
export type Relation = {
  readonly name: RelationName;
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
    };

export type ResourceSchema = {
  readonly fields: ReadonlyArray<Field>;
  readonly relations: ReadonlyArray<Relation>;
  readonly operations: EmptySchemaCollection;
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
      readonly cause?: FieldValidationError | RelationValidationError;
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
