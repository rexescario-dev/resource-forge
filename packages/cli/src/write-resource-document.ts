import {
  existsSync,
  linkSync,
  lstatSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';

export type WriteResourceDocumentResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly kind:
        | 'parent_missing'
        | 'destination_exists'
        | 'unexpected';
      readonly message: string;
    };

export type FinalizeWrite = (tempPath: string, destination: string) => void;

function isExistError(cause: unknown): boolean {
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'code' in cause &&
    (cause as { code?: string }).code === 'EEXIST'
  );
}

/**
 * Create-if-absent finalization: link complete temp → destination.
 * Fails with EEXIST if destination already exists (no overwrite).
 */
const defaultFinalizeWrite: FinalizeWrite = (tempPath, destination) => {
  linkSync(tempPath, destination);
};

let finalizeWriteImpl: FinalizeWrite = defaultFinalizeWrite;

/** Internal test seam — not public package API. */
export function setFinalizeWriteForTests(fn: FinalizeWrite): void {
  finalizeWriteImpl = fn;
}

/** Internal test seam — not public package API. */
export function resetWriteResourceDocumentForTests(): void {
  finalizeWriteImpl = defaultFinalizeWrite;
}

function cleanupTemp(tempPath: string): void {
  try {
    unlinkSync(tempPath);
  } catch {
    // Best-effort cleanup; temp must never be presented as destination.
  }
}

/**
 * Write a complete JSON document with create-if-absent finalization.
 * Destination becomes visible only after the full artifact is prepared.
 */
export function writeResourceDocument(
  destination: string,
  contents: string,
): WriteResourceDocumentResult {
  const parent = dirname(destination);
  try {
    if (!existsSync(parent) || !lstatSync(parent).isDirectory()) {
      return {
        ok: false,
        kind: 'parent_missing',
        message: `Parent directory does not exist: ${parent}`,
      };
    }
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : 'Cannot inspect parent directory';
    return { ok: false, kind: 'unexpected', message };
  }

  if (existsSync(destination)) {
    return {
      ok: false,
      kind: 'destination_exists',
      message: `Destination already exists: ${destination}`,
    };
  }

  const tempPath = join(
    parent,
    `.rf-generate-${randomBytes(8).toString('hex')}.tmp`,
  );

  try {
    writeFileSync(tempPath, contents, 'utf8');
  } catch (cause) {
    cleanupTemp(tempPath);
    const message =
      cause instanceof Error ? cause.message : 'Failed to prepare artifact';
    return { ok: false, kind: 'unexpected', message };
  }

  try {
    finalizeWriteImpl(tempPath, destination);
    cleanupTemp(tempPath);
    return { ok: true };
  } catch (cause) {
    cleanupTemp(tempPath);
    if (isExistError(cause)) {
      return {
        ok: false,
        kind: 'destination_exists',
        message: `Destination already exists: ${destination}`,
      };
    }
    const message =
      cause instanceof Error ? cause.message : 'Failed to finalize write';
    return { ok: false, kind: 'unexpected', message };
  }
}
