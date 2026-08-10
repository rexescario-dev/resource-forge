import type { Result } from '@resource-forge/core';
import { err, ok } from '@resource-forge/core';

export type PrismaBindingErrorCategory =
  | 'binding_invalid'
  | 'payload_invalid'
  | 'identity_invalid'
  | 'delegate_failed';

export type PrismaBindingError = {
  readonly category: PrismaBindingErrorCategory;
  readonly code: string;
  readonly message: string;
  readonly cause?: unknown;
};

export function bindingError(
  category: PrismaBindingErrorCategory,
  code: string,
  message: string,
  cause?: unknown,
): PrismaBindingError {
  return cause === undefined
    ? { category, code, message }
    : { category, code, message, cause };
}

export function bindingOk<T>(value: T): Result<T, PrismaBindingError> {
  return ok(value);
}

export function bindingErr(
  category: PrismaBindingErrorCategory,
  code: string,
  message: string,
  cause?: unknown,
): Result<never, PrismaBindingError> {
  return err(bindingError(category, code, message, cause));
}
