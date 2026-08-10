import type { ResourceValidationError } from '@resource-forge/core';

export type EmitErrorCode =
  | 'empty_emission_unit'
  | 'invalid_resource'
  | 'missing_identity'
  | 'invalid_identity'
  | 'invalid_identity_scalar'
  | 'invalid_identity_default'
  | 'invalid_number_overlay'
  | 'join_unrealized'
  | 'join_ownership_conflict'
  | 'join_participant_incompatible'
  | 'mapping_collision'
  | 'missing_relation_target'
  | 'many_nullable_unrealizable'
  | 'unilateral_relation'
  | 'inverse_unrealized'
  | 'topology_unsupported'
  | 'disambiguator_required'
  | 'emit_model_failure'
  | 'relation_nullability_inconsistent';

export type EmitError = {
  readonly code: EmitErrorCode;
  readonly message: string;
  readonly cause?: ResourceValidationError | unknown;
};

export function emitError(
  code: EmitErrorCode,
  message: string,
  cause?: EmitError['cause'],
): EmitError {
  return cause === undefined ? { code, message } : { code, message, cause };
}
