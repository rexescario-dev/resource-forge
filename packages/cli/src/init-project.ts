import {
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

export const MARKER_FILENAME = 'resource-forge.json';
export const RESOURCES_DIRNAME = 'resources';

export const CANONICAL_MARKER = {
  version: 1,
  resourcesDir: 'resources',
} as const;

export type InitClassification =
  | { readonly kind: 'creatable' }
  | { readonly kind: 'conforming' }
  | { readonly kind: 'conflict'; readonly message: string };

export type InitCreateResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly message: string;
    };

export type LinkMarker = (tempPath: string, markerPath: string) => void;
export type MkdirResources = (resourcesPath: string) => void;
export type InspectPath = (path: string) => {
  readonly exists: boolean;
  readonly isDirectory: boolean;
  readonly isFile: boolean;
};

function isExistError(cause: unknown): boolean {
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'code' in cause &&
    (cause as { code?: string }).code === 'EEXIST'
  );
}

const defaultLinkMarker: LinkMarker = (tempPath, markerPath) => {
  linkSync(tempPath, markerPath);
};

const defaultMkdirResources: MkdirResources = (resourcesPath) => {
  mkdirSync(resourcesPath);
};

const defaultInspectPath: InspectPath = (path) => {
  if (!existsSync(path)) {
    return { exists: false, isDirectory: false, isFile: false };
  }
  const stat = lstatSync(path);
  return {
    exists: true,
    isDirectory: stat.isDirectory(),
    isFile: stat.isFile(),
  };
};

let linkMarkerImpl: LinkMarker = defaultLinkMarker;
let mkdirResourcesImpl: MkdirResources = defaultMkdirResources;
let inspectPathImpl: InspectPath = defaultInspectPath;

/** Internal test seam — not public package API. */
export function setLinkMarkerForTests(fn: LinkMarker): void {
  linkMarkerImpl = fn;
}

/** Internal test seam — not public package API. */
export function setMkdirResourcesForTests(fn: MkdirResources): void {
  mkdirResourcesImpl = fn;
}

/** Internal test seam — not public package API. */
export function setInspectPathForTests(fn: InspectPath): void {
  inspectPathImpl = fn;
}

/** Internal test seam — not public package API. */
export function resetInitProjectForTests(): void {
  linkMarkerImpl = defaultLinkMarker;
  mkdirResourcesImpl = defaultMkdirResources;
  inspectPathImpl = defaultInspectPath;
}

export function encodeCanonicalMarker(): string {
  return `${JSON.stringify(CANONICAL_MARKER, null, 2)}\n`;
}

function isCanonicalMarker(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  if (keys.length !== 2) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.version === CANONICAL_MARKER.version &&
    record.resourcesDir === CANONICAL_MARKER.resourcesDir
  );
}

/**
 * Classify target before any filesystem mutation (reads/stat/access only).
 */
export function classifyInitTarget(target: string): InitClassification {
  let targetInfo;
  try {
    targetInfo = inspectPathImpl(target);
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : 'Cannot inspect target';
    return { kind: 'conflict', message };
  }

  if (!targetInfo.exists) {
    return { kind: 'creatable' };
  }
  if (!targetInfo.isDirectory) {
    return { kind: 'conflict', message: `Target is not a directory: ${target}` };
  }

  const markerPath = join(target, MARKER_FILENAME);
  const resourcesPath = join(target, RESOURCES_DIRNAME);

  let markerInfo;
  let resourcesInfo;
  try {
    markerInfo = inspectPathImpl(markerPath);
    resourcesInfo = inspectPathImpl(resourcesPath);
  } catch (cause) {
    const message =
      cause instanceof Error
        ? cause.message
        : 'Cannot inspect marker or resources layout';
    return { kind: 'conflict', message };
  }

  const markerAbsent = !markerInfo.exists;
  const resourcesAbsent = !resourcesInfo.exists;

  if (markerAbsent && resourcesAbsent) {
    return { kind: 'creatable' };
  }

  if (markerInfo.exists && resourcesInfo.exists) {
    if (!markerInfo.isFile) {
      return {
        kind: 'conflict',
        message: `Marker is not a regular file: ${markerPath}`,
      };
    }
    if (!resourcesInfo.isDirectory) {
      return {
        kind: 'conflict',
        message: `Resources path is not a directory: ${resourcesPath}`,
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(markerPath, 'utf8'));
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : `Cannot read marker: ${markerPath}`;
      return { kind: 'conflict', message };
    }

    if (!isCanonicalMarker(parsed)) {
      return {
        kind: 'conflict',
        message: `Marker is not canonical: ${markerPath}`,
      };
    }

    return { kind: 'conforming' };
  }

  if (markerInfo.exists && resourcesAbsent) {
    return {
      kind: 'conflict',
      message: `Half-initialized project (marker only): ${target}`,
    };
  }

  return {
    kind: 'conflict',
    message: `Half-initialized project (resources only): ${target}`,
  };
}

function cleanupTemp(tempPath: string): void {
  try {
    unlinkSync(tempPath);
  } catch {
    // Best-effort; staging must never be presented as the marker.
  }
}

function cleanupEmptyResourcesIfCreated(
  resourcesPath: string,
  createdResources: boolean,
): void {
  if (!createdResources) {
    return;
  }
  try {
    rmdirSync(resourcesPath);
  } catch {
    // Best-effort; MUST NOT claim success.
  }
}

function cleanupTargetIfCreated(target: string, createdTarget: boolean): void {
  if (!createdTarget) {
    return;
  }
  try {
    rmdirSync(target);
  } catch {
    // Best-effort only; no recursive parent rollback.
  }
}

/**
 * Create RF artifacts for a creatable target (RFC-040 §6).
 * Caller MUST have classified as creatable already.
 */
export function createInitProject(target: string): InitCreateResult {
  const markerPath = join(target, MARKER_FILENAME);
  const resourcesPath = join(target, RESOURCES_DIRNAME);
  let createdTarget = false;
  let createdResources = false;

  try {
    const targetInfo = inspectPathImpl(target);
    if (!targetInfo.exists) {
      mkdirSync(target, { recursive: true });
      createdTarget = true;
    } else if (!targetInfo.isDirectory) {
      return {
        ok: false,
        message: `Target is not a directory: ${target}`,
      };
    }
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : 'Failed to ensure target directory';
    cleanupTargetIfCreated(target, createdTarget);
    return { ok: false, message };
  }

  try {
    mkdirResourcesImpl(resourcesPath);
    createdResources = true;
  } catch (cause) {
    cleanupTargetIfCreated(target, createdTarget);
    if (isExistError(cause)) {
      return {
        ok: false,
        message: `Resources directory already exists: ${resourcesPath}`,
      };
    }
    const message =
      cause instanceof Error
        ? cause.message
        : `Failed to create resources directory: ${resourcesPath}`;
    return { ok: false, message };
  }

  const tempPath = join(
    target,
    `.rf-init-${randomBytes(8).toString('hex')}.tmp`,
  );

  try {
    writeFileSync(tempPath, encodeCanonicalMarker(), 'utf8');
  } catch (cause) {
    cleanupTemp(tempPath);
    cleanupEmptyResourcesIfCreated(resourcesPath, createdResources);
    cleanupTargetIfCreated(target, createdTarget);
    const message =
      cause instanceof Error ? cause.message : 'Failed to stage marker';
    return { ok: false, message };
  }

  try {
    linkMarkerImpl(tempPath, markerPath);
  } catch (cause) {
    cleanupTemp(tempPath);
    cleanupEmptyResourcesIfCreated(resourcesPath, createdResources);
    cleanupTargetIfCreated(target, createdTarget);
    if (isExistError(cause)) {
      return {
        ok: false,
        message: `Marker already exists: ${markerPath}`,
      };
    }
    const message =
      cause instanceof Error ? cause.message : 'Failed to publish marker';
    return { ok: false, message };
  }

  // Successful link is the last exit-affecting fallible operation.
  cleanupTemp(tempPath);
  return { ok: true };
}
