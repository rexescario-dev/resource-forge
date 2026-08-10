import {
  validateResource,
  type Annotations,
} from '@resource-forge/core';

export type DocumentValidationResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly kind: 'input_decode';
      readonly message: string;
    }
  | {
      readonly ok: false;
      readonly kind: 'semantic';
      readonly message: string;
    };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Internal pure seam: JSON text → decode → validateResource.
 * Does not perform filesystem I/O, stream writes, or process exit.
 */
export function validateResourceDocument(
  jsonText: string,
): DocumentValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      ok: false,
      kind: 'input_decode',
      message: 'Invalid JSON',
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      ok: false,
      kind: 'input_decode',
      message: 'Resource document must be a JSON object',
    };
  }

  const identityValue = parsed.identity;
  if (!isPlainObject(identityValue)) {
    return {
      ok: false,
      kind: 'input_decode',
      message: 'Resource document must include an identity object',
    };
  }
  if (
    typeof identityValue.namespace !== 'string' ||
    typeof identityValue.name !== 'string'
  ) {
    return {
      ok: false,
      kind: 'input_decode',
      message: 'Resource identity must have string namespace and name',
    };
  }

  const annotationsValue = parsed.annotations;
  if (!Array.isArray(annotationsValue)) {
    return {
      ok: false,
      kind: 'input_decode',
      message: 'Resource annotations must be an array',
    };
  }

  // Build the Accepted validateResource candidate shape explicitly.
  // Annotation element validation is owned by validateResource.
  const candidate: {
    identity: { namespace: string; name: string };
    schema: unknown;
    annotations: Annotations;
  } = {
    identity: {
      namespace: identityValue.namespace,
      name: identityValue.name,
    },
    schema: parsed.schema,
    annotations: annotationsValue as Annotations,
  };

  const result = validateResource(candidate);
  if (!result.ok) {
    return {
      ok: false,
      kind: 'semantic',
      message: `Resource validation failed: ${result.error.code}`,
    };
  }

  return { ok: true };
}
