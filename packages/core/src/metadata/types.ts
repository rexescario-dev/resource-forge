import type {
  IdentityValidationError,
  ResourceIdentity,
} from '../identity/types.js';

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { readonly [key: string]: JsonValue };

export type JsonValueValidationError = {
  readonly code: 'invalid_json_value';
  readonly path: string;
};

export type MetadataKey = {
  readonly namespace: string;
  readonly name: string;
};

export type MetadataKeyKind = 'framework' | 'extension';

export type MetadataKeyValidationError =
  | { readonly code: 'invalid_namespace'; readonly namespace: string }
  | { readonly code: 'invalid_name'; readonly name: string }
  | { readonly code: 'reserved_namespace'; readonly namespace: string };

export type MetadataEntry = {
  readonly key: MetadataKey;
  readonly value: JsonValue;
};

export type ResourceMetadata = {
  readonly identity: ResourceIdentity;
  readonly entries: ReadonlyArray<MetadataEntry>;
};

export type MetadataValidationError =
  | {
      readonly code: 'invalid_identity';
      readonly cause: IdentityValidationError;
    }
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
