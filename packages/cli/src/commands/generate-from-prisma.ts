import {
  existsSync,
  lstatSync,
  readFileSync,
} from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import type { Resource } from '@resource-forge/core';
import { synthesizeResourcesFromDmmf } from '@resource-forge/prisma';
import type { RunResult } from '../run.js';
import { writeResourceDocument } from '../write-resource-document.js';

function usageError(message: string): RunResult {
  return { exitCode: 2, stdout: '', stderr: `${message}\n` };
}

function execError(message: string): RunResult {
  return { exitCode: 1, stdout: '', stderr: `${message}\n` };
}

function encodeResourceDocument(resource: Resource): string {
  return `${JSON.stringify(resource, null, 2)}\n`;
}

type ParsedFromPrismaArgv =
  | {
      readonly ok: true;
      readonly dmmfPath: string;
      readonly outDir: string;
      readonly namespace: string;
    }
  | { readonly ok: false; readonly message: string };

/**
 * Parse `from-prisma` argv after the kind token.
 * `--namespace <value>` may appear anywhere; sole recognized option.
 */
export function parseFromPrismaArgv(
  argvAfterKind: readonly string[],
): ParsedFromPrismaArgv {
  const positionals: string[] = [];
  let namespace: string | undefined;

  for (let i = 0; i < argvAfterKind.length; i++) {
    const token = argvAfterKind[i]!;
    if (token === '--namespace') {
      const value = argvAfterKind[i + 1];
      if (value === undefined || value.startsWith('-')) {
        return { ok: false, message: 'Usage: rf generate from-prisma <dmmfPath> <outDir> --namespace <namespace>' };
      }
      if (namespace !== undefined) {
        return { ok: false, message: 'Duplicate --namespace' };
      }
      namespace = value;
      i++;
      continue;
    }
    if (token.startsWith('-')) {
      return { ok: false, message: `Unknown option: ${token}` };
    }
    positionals.push(token);
  }

  if (namespace === undefined || positionals.length !== 2) {
    return {
      ok: false,
      message:
        'Usage: rf generate from-prisma <dmmfPath> <outDir> --namespace <namespace>',
    };
  }

  return {
    ok: true,
    dmmfPath: positionals[0]!,
    outDir: positionals[1]!,
    namespace,
  };
}

function resolvePath(pathToken: string): string {
  return isAbsolute(pathToken) ? pathToken : resolve(process.cwd(), pathToken);
}

function compareModelName(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * CLI orchestration for `generate from-prisma` (RFC-041).
 */
export function runGenerateFromPrisma(
  argvAfterKind: readonly string[],
): RunResult {
  const parsed = parseFromPrismaArgv(argvAfterKind);
  if (!parsed.ok) {
    return usageError(parsed.message);
  }

  const dmmfPath = resolvePath(parsed.dmmfPath);
  const outDir = resolvePath(parsed.outDir);

  if (!existsSync(dmmfPath)) {
    return usageError(`DMMF path does not exist: ${parsed.dmmfPath}`);
  }

  try {
    if (!existsSync(outDir) || !lstatSync(outDir).isDirectory()) {
      return usageError(`Output directory does not exist: ${parsed.outDir}`);
    }
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : 'Cannot inspect output directory';
    return execError(message);
  }

  let raw: string;
  try {
    raw = readFileSync(dmmfPath, 'utf8');
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : 'Cannot read DMMF path';
    return execError(message);
  }

  let dmmf: unknown;
  try {
    dmmf = JSON.parse(raw) as unknown;
  } catch {
    return execError('Malformed DMMF JSON');
  }

  let synthesis: ReturnType<typeof synthesizeResourcesFromDmmf>;
  try {
    synthesis = synthesizeResourcesFromDmmf({
      dmmf,
      namespace: parsed.namespace,
    });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : 'Unexpected synthesis failure';
    return execError(message);
  }

  if (!synthesis.ok) {
    return execError(`${synthesis.error.code}: ${synthesis.error.message}`);
  }

  const { emissions, refusals } = synthesis.value;

  if (emissions.length === 0) {
    const lines = [...refusals]
      .sort((a, b) => compareModelName(a.model, b.model))
      .map((r) =>
        r.member
          ? `refused: ${r.model} — ${r.code}: ${r.member} (${r.detail})`
          : `refused: ${r.model} — ${r.code}: ${r.detail}`,
      );
    return execError(
      lines.length > 0
        ? `${lines.join('\n')}\nNo Resources written`
        : 'No Resources written',
    );
  }

  const destinations = emissions.map((e) => ({
    emission: e,
    path: join(outDir, e.filename),
  }));

  const collisions = destinations
    .filter((d) => existsSync(d.path))
    .map((d) => d.emission.filename)
    .sort();

  if (collisions.length > 0) {
    return usageError(
      collisions.map((f) => `collision: ${f}`).join('\n'),
    );
  }

  const reportLines: string[] = [];
  const generatedNames = emissions.map((e) => e.model).sort(compareModelName);
  const refusedSorted = [...refusals].sort((a, b) =>
    compareModelName(a.model, b.model),
  );

  for (const dest of destinations) {
    let encoded: string;
    try {
      encoded = encodeResourceDocument(dest.emission.resource);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Failed to encode Resource';
      return execError(message);
    }

    const written = writeResourceDocument(dest.path, encoded);
    if (!written.ok) {
      if (written.kind === 'destination_exists') {
        return execError(written.message);
      }
      return execError(written.message);
    }
  }

  for (const name of generatedNames) {
    reportLines.push(`generated: ${name}.json`);
  }
  for (const r of refusedSorted) {
    reportLines.push(
      r.member
        ? `refused: ${r.model} — ${r.code}: ${r.member} (${r.detail})`
        : `refused: ${r.model} — ${r.code}: ${r.detail}`,
    );
  }

  return {
    exitCode: 0,
    stdout: '',
    stderr: reportLines.length > 0 ? `${reportLines.join('\n')}\n` : '',
  };
}
