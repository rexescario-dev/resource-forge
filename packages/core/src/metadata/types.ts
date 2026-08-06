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
