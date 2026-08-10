import type { ResourceValidationError } from '@resource-forge/core';

export type CorrespondenceErrorCode =
  | 'empty_verification_unit'
  | 'invalid_resource'
  | 'mapping_collision'
  | 'missing_model'
  | 'missing_scalar_field'
  | 'incompatible_scalar_type'
  | 'incompatible_nullability'
  | 'missing_relation_target'
  | 'missing_relation_field'
  | 'multiplicity_mismatch'
  | 'inverse_unrealized'
  | 'join_unrealized'
  | 'unusable_dmmf';

export type CorrespondenceError = {
  readonly code: CorrespondenceErrorCode;
  readonly message: string;
  readonly cause?: ResourceValidationError | unknown;
};

export function correspondenceError(
  code: CorrespondenceErrorCode,
  message: string,
  cause?: CorrespondenceError['cause'],
): CorrespondenceError {
  return cause === undefined ? { code, message } : { code, message, cause };
}
