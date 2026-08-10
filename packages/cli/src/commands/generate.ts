import { createResourceIdentity, createResource } from '@resource-forge/core';
import type { Resource } from '@resource-forge/core';
import type { RunResult } from '../run.js';
import { writeResourceDocument } from '../write-resource-document.js';
import { runGenerateFromPrisma } from './generate-from-prisma.js';

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

function runGenerateResource(argvAfterKind: readonly string[]): RunResult {
  if (argvAfterKind.length !== 3) {
    for (const token of argvAfterKind) {
      if (token.startsWith('-')) {
        return usageError(`Unknown option: ${token}`);
      }
    }
    return usageError(
      'Usage: rf generate resource <namespace> <name> <path>',
    );
  }

  const namespace = argvAfterKind[0]!;
  const name = argvAfterKind[1]!;
  const path = argvAfterKind[2]!;

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

/**
 * Generate handler: dispatches kind tokens `resource` | `from-prisma`.
 */
export function runGenerate(argvAfterCommand: readonly string[]): RunResult {
  if (argvAfterCommand.length === 0) {
    return usageError(
      'Usage: rf generate resource <namespace> <name> <path> | rf generate from-prisma <dmmfPath> <outDir> --namespace <namespace>',
    );
  }

  const kind = argvAfterCommand[0]!;
  if (kind.startsWith('-')) {
    return usageError(`Unknown option: ${kind}`);
  }
  if (kind === 'resource') {
    return runGenerateResource(argvAfterCommand.slice(1));
  }
  if (kind === 'from-prisma') {
    return runGenerateFromPrisma(argvAfterCommand.slice(1));
  }

  return usageError(`Unknown generate kind: ${kind}`);
}
