import { err, ok, type Result } from '../result.js';
import type { JsonValue, JsonValueValidationError } from './types.js';

function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function validateAt(
  value: unknown,
  path: string,
): Result<JsonValue, JsonValueValidationError> {
  if (value === null) {
    return ok(null);
  }

  const type = typeof value;
  if (type === 'boolean' || type === 'number' || type === 'string') {
    return ok(value as boolean | number | string);
  }

  if (Array.isArray(value)) {
    const items: JsonValue[] = [];
    for (let i = 0; i < value.length; i += 1) {
      const itemPath = path === '' ? `[${i}]` : `${path}[${i}]`;
      const item = validateAt(value[i], itemPath);
      if (!item.ok) {
        return item;
      }
      items.push(item.value);
    }
    return ok(items);
  }

  if (type === 'object') {
    if (!isPlainObject(value as object)) {
      return err({ code: 'invalid_json_value', path });
    }

    const record: { [key: string]: JsonValue } = {};
    for (const [key, nested] of Object.entries(value as object)) {
      const nestedPath = path === '' ? key : `${path}.${key}`;
      const validated = validateAt(nested, nestedPath);
      if (!validated.ok) {
        return validated;
      }
      record[key] = validated.value;
    }
    return ok(record);
  }

  return err({ code: 'invalid_json_value', path });
}

export function validateJsonValue(
  value: unknown,
): Result<JsonValue, JsonValueValidationError> {
  return validateAt(value, '');
}
