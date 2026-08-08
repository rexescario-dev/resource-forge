import { err, ok, type Result } from '../result.js';
import type {
  Operation,
  OperationName,
  OperationValidationError,
} from './types.js';

const OPERATION_NAME_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

/** Internal: sole normative OperationName grammar (RFC-012). */
export function validateOperationName(
  name: string,
): Result<
  OperationName,
  { readonly code: 'invalid_operation_name'; readonly name: string }
> {
  if (typeof name !== 'string' || !OPERATION_NAME_PATTERN.test(name)) {
    return err({
      code: 'invalid_operation_name',
      name: typeof name === 'string' ? name : String(name),
    });
  }
  return ok(name);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Internal: single RFC-012 operation collection validation (closed shape, names,
 * uniqueness) before `{ name }` materialization. MUST NOT strip additional
 * semantic properties. Reused by construction fixtures and `validateResource`.
 */
export function checkOperations(
  candidate: readonly unknown[],
): Result<Operation[], OperationValidationError> {
  if (!Array.isArray(candidate)) {
    return err({ code: 'invalid_operation_member', index: 0 });
  }

  const accepted: Operation[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < candidate.length; index += 1) {
    const member = candidate[index];
    if (!isPlainObject(member)) {
      return err({ code: 'invalid_operation_member', index });
    }

    const keys = Object.keys(member);
    if (keys.length !== 1 || keys[0] !== 'name') {
      return err({ code: 'invalid_operation_member', index });
    }

    const rawName = member.name;
    if (typeof rawName !== 'string') {
      return err({
        code: 'invalid_operation_name',
        index,
        name: String(rawName),
      });
    }

    const nameResult = validateOperationName(rawName);
    if (!nameResult.ok) {
      return err({
        code: 'invalid_operation_name',
        index,
        name: nameResult.error.name,
      });
    }

    if (seen.has(nameResult.value)) {
      return err({
        code: 'duplicate_operation_name',
        index,
        name: nameResult.value,
      });
    }

    seen.add(nameResult.value);
    accepted.push({ name: nameResult.value });
  }

  return ok(accepted);
}

/**
 * Internal: freeze an ordered sequence of already-validated Operations.
 * MUST NOT accept raw candidates or discard additional semantic properties.
 */
export function snapshotOperations(
  operations: readonly Operation[],
): ReadonlyArray<Operation> {
  return Object.freeze(
    operations.map((operation) => Object.freeze({ name: operation.name })),
  );
}

/** Internal / test-only: order-sensitive Operation sequence equality. */
export function operationsEqual(
  left: readonly Operation[],
  right: readonly Operation[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let i = 0; i < left.length; i += 1) {
    if (left[i]!.name !== right[i]!.name) {
      return false;
    }
  }
  return true;
}
