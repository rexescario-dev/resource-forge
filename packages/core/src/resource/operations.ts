import { err, ok, type Result } from '../result.js';
import type {
  FieldType,
  Operation,
  OperationKind,
  OperationName,
  OperationParam,
  OperationResultType,
  OperationValidationError,
} from './types.js';

const OPERATION_NAME_PATTERN = /^[a-z][a-zA-Z0-9]*$/;
const OPERATION_KINDS = new Set<OperationKind>(['command', 'query']);
const FIELD_TYPES = new Set<FieldType>(['string', 'number', 'boolean']);
const RESULT_TYPES = new Set<OperationResultType>([
  'string',
  'number',
  'boolean',
  'void',
]);
const OPERATION_KEYS = new Set(['name', 'kind', 'params', 'result']);
const PARAM_KEYS = new Set(['name', 'type', 'optional', 'nullable']);

/** Internal: sole normative OperationName grammar (RFC-012 / RFC-021). */
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

function closedKeys(
  member: Record<string, unknown>,
  allowed: Set<string>,
): boolean {
  const keys = Object.keys(member);
  if (keys.length !== allowed.size) {
    return false;
  }
  return keys.every((key) => allowed.has(key));
}

function checkParam(
  raw: unknown,
  index: number,
  paramIndex: number,
  seenNames: Set<string>,
): Result<OperationParam, OperationValidationError> {
  if (!isPlainObject(raw) || !closedKeys(raw, PARAM_KEYS)) {
    return err({ code: 'invalid_operation_param', index, paramIndex });
  }

  if (typeof raw.name !== 'string') {
    return err({ code: 'invalid_operation_param', index, paramIndex });
  }
  const nameResult = validateOperationName(raw.name);
  if (!nameResult.ok) {
    return err({ code: 'invalid_operation_param', index, paramIndex });
  }
  if (seenNames.has(nameResult.value)) {
    return err({
      code: 'duplicate_operation_param_name',
      index,
      paramIndex,
      name: nameResult.value,
    });
  }

  if (typeof raw.type !== 'string' || !FIELD_TYPES.has(raw.type as FieldType)) {
    return err({ code: 'invalid_operation_param', index, paramIndex });
  }
  if (typeof raw.optional !== 'boolean' || typeof raw.nullable !== 'boolean') {
    return err({ code: 'invalid_operation_param', index, paramIndex });
  }

  seenNames.add(nameResult.value);
  return ok({
    name: nameResult.value,
    type: raw.type as FieldType,
    optional: raw.optional,
    nullable: raw.nullable,
  });
}

/**
 * Internal: single RFC-021 operation collection validation (closed shape, kind,
 * params, result, uniqueness) before materialization. MUST NOT strip additional
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
    if (!isPlainObject(member) || !closedKeys(member, OPERATION_KEYS)) {
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

    if (
      typeof member.kind !== 'string' ||
      !OPERATION_KINDS.has(member.kind as OperationKind)
    ) {
      return err({ code: 'invalid_operation_member', index });
    }
    const kind = member.kind as OperationKind;

    if (
      typeof member.result !== 'string' ||
      !RESULT_TYPES.has(member.result as OperationResultType)
    ) {
      return err({ code: 'invalid_operation_member', index });
    }
    const result = member.result as OperationResultType;

    if (kind === 'query' && result === 'void') {
      return err({ code: 'invalid_operation_result_for_kind', index });
    }

    if (!Array.isArray(member.params)) {
      return err({ code: 'invalid_operation_member', index });
    }

    const params: OperationParam[] = [];
    const seenParamNames = new Set<string>();
    for (let paramIndex = 0; paramIndex < member.params.length; paramIndex += 1) {
      const paramResult = checkParam(
        member.params[paramIndex],
        index,
        paramIndex,
        seenParamNames,
      );
      if (!paramResult.ok) {
        return paramResult;
      }
      params.push(paramResult.value);
    }

    seen.add(nameResult.value);
    accepted.push({
      name: nameResult.value,
      kind,
      params,
      result,
    });
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
    operations.map((operation) =>
      Object.freeze({
        name: operation.name,
        kind: operation.kind,
        params: Object.freeze(
          operation.params.map((param) =>
            Object.freeze({
              name: param.name,
              type: param.type,
              optional: param.optional,
              nullable: param.nullable,
            }),
          ),
        ),
        result: operation.result,
      }),
    ),
  );
}

function paramsEqual(
  left: ReadonlyArray<OperationParam>,
  right: ReadonlyArray<OperationParam>,
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let i = 0; i < left.length; i += 1) {
    const a = left[i]!;
    const b = right[i]!;
    if (
      a.name !== b.name ||
      a.type !== b.type ||
      a.optional !== b.optional ||
      a.nullable !== b.nullable
    ) {
      return false;
    }
  }
  return true;
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
    const a = left[i]!;
    const b = right[i]!;
    if (
      a.name !== b.name ||
      a.kind !== b.kind ||
      a.result !== b.result ||
      !paramsEqual(a.params, b.params)
    ) {
      return false;
    }
  }
  return true;
}
