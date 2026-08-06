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
