import { err, ok, type Result } from '../result.js';
import type {
  FieldType,
  Operation,
  OperationHandlerProvider,
  OperationInvocationError,
  OperationName,
  OperationRuntimeValue,
  Resource,
  SemanticResultReport,
} from './types.js';

function isAllowedRuntimeType(
  fieldType: FieldType,
  value: Exclude<OperationRuntimeValue, null>,
): boolean {
  if (fieldType === 'string') {
    return typeof value === 'string';
  }
  if (fieldType === 'boolean') {
    return typeof value === 'boolean';
  }
  return typeof value === 'number' && Number.isFinite(value);
}

function parseSemanticResultReport(
  value: unknown,
): SemanticResultReport | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (record.outcome === 'void') {
    const keys = Object.keys(record);
    if (keys.length !== 1 || keys[0] !== 'outcome') {
      return undefined;
    }
    return { outcome: 'void' };
  }
  if (record.outcome === 'value') {
    const keys = Object.keys(record);
    if (keys.length !== 2 || !keys.includes('outcome') || !keys.includes('value')) {
      return undefined;
    }
    const reported = record.value;
    if (
      typeof reported === 'string' ||
      typeof reported === 'boolean' ||
      (typeof reported === 'number' && Number.isFinite(reported))
    ) {
      return { outcome: 'value', value: reported };
    }
    return undefined;
  }
  return undefined;
}

function validateArguments(
  operation: Operation,
  args: ReadonlyMap<string, OperationRuntimeValue>,
): Result<void, OperationInvocationError> {
  const declared = new Set(operation.params.map((param) => param.name));

  for (const key of args.keys()) {
    if (!declared.has(key)) {
      return err({
        code: 'unknown_argument',
        operationName: operation.name,
        paramName: key,
      });
    }
  }

  for (const param of operation.params) {
    const present = args.has(param.name);
    if (!present) {
      if (!param.optional) {
        return err({
          code: 'missing_required_argument',
          operationName: operation.name,
          paramName: param.name,
        });
      }
      continue;
    }

    const value = args.get(param.name);
    if (value === null) {
      if (!param.nullable) {
        return err({
          code: 'null_argument',
          operationName: operation.name,
          paramName: param.name,
        });
      }
      continue;
    }

    if (value === undefined || !isAllowedRuntimeType(param.type, value)) {
      return err({
        code: 'argument_type_mismatch',
        operationName: operation.name,
        paramName: param.name,
      });
    }
  }

  return ok(undefined);
}

function validateResultReport(
  operation: Operation,
  report: SemanticResultReport,
): Result<SemanticResultReport, OperationInvocationError> {
  if (operation.result === 'void') {
    if (report.outcome !== 'void') {
      return err({
        code: 'result_contract_mismatch',
        operationName: operation.name,
      });
    }
    return ok(report);
  }

  if (report.outcome !== 'value') {
    return err({
      code: 'result_contract_mismatch',
      operationName: operation.name,
    });
  }

  if (!isAllowedRuntimeType(operation.result, report.value)) {
    return err({
      code: 'result_contract_mismatch',
      operationName: operation.name,
    });
  }

  return ok(report);
}

/**
 * Thin Operation invocation (RFC-021).
 * Operates on a valid immutable Resource snapshot; MUST NOT call validateResource.
 * Provider/handler throws propagate unchanged.
 */
export function invokeOperation(
  resource: Resource,
  operationName: OperationName,
  args: ReadonlyMap<string, OperationRuntimeValue>,
  handlerProvider: OperationHandlerProvider,
): Result<SemanticResultReport, OperationInvocationError> {
  const operation = resource.schema.operations.find(
    (candidate) => candidate.name === operationName,
  );
  if (!operation) {
    return err({ code: 'unknown_operation', operationName });
  }

  const argsResult = validateArguments(operation, args);
  if (!argsResult.ok) {
    return argsResult;
  }

  const handler = handlerProvider(resource, operationName);
  if (handler === undefined) {
    return err({
      code: 'missing_operation_handler',
      operationName: operation.name,
    });
  }

  const runtimeReturn: unknown = handler(args);
  const report = parseSemanticResultReport(runtimeReturn);
  if (!report) {
    return err({
      code: 'result_contract_mismatch',
      operationName: operation.name,
    });
  }

  return validateResultReport(operation, report);
}
