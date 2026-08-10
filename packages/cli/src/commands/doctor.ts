import { CLI_VERSION } from '../cli-version.js';
import { COMMAND_REGISTRY } from '../command-registry.js';
import { resolveCore } from '../resolve-core.js';
import type { RunResult } from '../run.js';

export type DoctorCheckId = 'version' | 'registry' | 'core';

export type DoctorCheckResult = {
  readonly id: DoctorCheckId;
  readonly ok: boolean;
};

/** Expected inability to establish a check condition (health FAIL, continue siblings). */
export class ExpectedCheckFailure extends Error {
  constructor(message = 'check failed') {
    super(message);
    this.name = 'ExpectedCheckFailure';
  }
}

/**
 * Isolated check runner: expected inability → FAIL; unexpected throw bubbles.
 */
export function runCheck(
  id: DoctorCheckId,
  probe: () => void,
): DoctorCheckResult {
  try {
    probe();
    return { id, ok: true };
  } catch (cause) {
    if (cause instanceof ExpectedCheckFailure) {
      return { id, ok: false };
    }
    throw cause;
  }
}

function usageError(message: string): RunResult {
  return { exitCode: 2, stdout: '', stderr: `${message}\n` };
}

function formatReport(checks: readonly DoctorCheckResult[]): string {
  return checks
    .map((check) => `${check.id}: ${check.ok ? 'ok' : 'FAIL'}`)
    .join('\n')
    .concat('\n');
}

function checkVersion(): void {
  if (CLI_VERSION.length === 0) {
    throw new ExpectedCheckFailure('empty version');
  }
}

function checkRegistry(): void {
  if (
    !COMMAND_REGISTRY.has('validate') ||
    !COMMAND_REGISTRY.has('doctor')
  ) {
    throw new ExpectedCheckFailure('missing expected command');
  }
}

function checkCore(): void {
  try {
    resolveCore();
  } catch {
    throw new ExpectedCheckFailure('core not resolvable');
  }
}

/**
 * Doctor handler: argv gate + collect-all isolated checks → RunResult.
 */
export function runDoctor(argvAfterCommand: readonly string[]): RunResult {
  if (argvAfterCommand.length > 0) {
    const token = argvAfterCommand[0]!;
    if (token.startsWith('-')) {
      return usageError(`Unknown option: ${token}`);
    }
    return usageError('Usage: rf doctor');
  }

  const checks: DoctorCheckResult[] = [
    runCheck('version', checkVersion),
    runCheck('registry', checkRegistry),
    runCheck('core', checkCore),
  ];

  const allOk = checks.every((check) => check.ok);
  return {
    exitCode: allOk ? 0 : 1,
    stdout: formatReport(checks),
    stderr: '',
  };
}
