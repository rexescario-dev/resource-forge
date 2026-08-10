import { createResourceIdentity, createResource } from '@resource-forge/core';
import type { Resource } from '@resource-forge/core';
import type { RunResult } from '../run.js';
import { writeResourceDocument } from '../write-resource-document.js';

function usageError(message: string): RunResult {
  return { exitCode: 2, stdout: '', stderr: `${message}\n` };
}

function constructionError(message: string): RunResult {
  return { exitCode: 1, stdout: '', stderr: `${message}\n` };
}

function encodeResourceDocument(resource: Resource): string {
  return `${JSON.stringify(resource, null, 2)}\n`;
}

function formatCoreError(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  ) {
    return `Resource construction failed: ${(error as { code: string }).code}`;
  }
  return 'Resource construction failed';
}

/**
 * Generate handler: argv gate + FS prechecks + core construction + encode + write.
 */
export function runGenerate(argvAfterCommand: readonly string[]): RunResult {
  if (argvAfterCommand.length === 0) {
    return usageError(
      'Usage: rf generate resource <namespace> <name> <path>',
    );
  }

  const kind = argvAfterCommand[0]!;
  if (kind.startsWith('-')) {
    return usageError(`Unknown option: ${kind}`);
  }
  if (kind !== 'resource') {
    return usageError(`Unknown generate kind: ${kind}`);
  }

  if (argvAfterCommand.length !== 4) {
    for (const token of argvAfterCommand.slice(1)) {
      if (token.startsWith('-')) {
        return usageError(`Unknown option: ${token}`);
      }
    }
    return usageError(
      'Usage: rf generate resource <namespace> <name> <path>',
    );
  }

  const namespace = argvAfterCommand[1]!;
  const name = argvAfterCommand[2]!;
  const path = argvAfterCommand[3]!;

  for (const token of [namespace, name, path]) {
    if (token.startsWith('-')) {
      return usageError(`Unknown option: ${token}`);
    }
  }

  const identityResult = createResourceIdentity(namespace, name);
  if (!identityResult.ok) {
    return constructionError(formatCoreError(identityResult.error));
  }

  const resourceResult = createResource(identityResult.value);
  if (!resourceResult.ok) {
    return constructionError(formatCoreError(resourceResult.error));
  }

  let encoded: string;
  try {
    encoded = encodeResourceDocument(resourceResult.value);
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : 'Failed to encode Resource';
    return constructionError(message);
  }

  const written = writeResourceDocument(path, encoded);
  if (!written.ok) {
    if (
      written.kind === 'destination_exists' ||
      written.kind === 'parent_missing'
    ) {
      return usageError(written.message);
    }
    return constructionError(written.message);
  }

  return { exitCode: 0, stdout: '', stderr: '' };
}
