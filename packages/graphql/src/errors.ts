import type { ResourceValidationError } from '@resource-forge/core';

export type GraphqlTranslationErrorCode =
  | 'empty_translation_unit'
  | 'invalid_resource'
  | 'illegal_type_name'
  | 'illegal_member_name'
  | 'type_name_collision'
  | 'root_field_collision'
  | 'field_relation_name_collision'
  | 'missing_relation_target'
  | 'zero_field_resource'
  | 'no_query_operations'
  | 'invalid_graphql_schema'
  | 'unmappable_construct';

export type GraphqlTranslationError = {
  readonly code: GraphqlTranslationErrorCode;
  readonly message: string;
  readonly cause?: ResourceValidationError | readonly string[] | unknown;
};

export function translationError(
  code: GraphqlTranslationErrorCode,
  message: string,
  cause?: GraphqlTranslationError['cause'],
): GraphqlTranslationError {
  return cause === undefined ? { code, message } : { code, message, cause };
}
