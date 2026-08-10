import { resolve } from 'node:path';
import type { RunResult } from '../run.js';
import {
  classifyInitTarget,
  createInitProject,
} from '../init-project.js';

function usageError(message: string): RunResult {
  return { exitCode: 2, stdout: '', stderr: `${message}\n` };
}

function conflictError(message: string): RunResult {
  return { exitCode: 2, stdout: '', stderr: `${message}\n` };
}

function createError(message: string): RunResult {
  return { exitCode: 1, stdout: '', stderr: `${message}\n` };
}

/**
 * Init handler: argv gate + resolve + classify + create (RFC-040).
 */
export function runInit(argvAfterCommand: readonly string[]): RunResult {
  if (argvAfterCommand.length > 1) {
    return usageError('Usage: rf init [path]');
  }

  if (argvAfterCommand.length === 1) {
    const token = argvAfterCommand[0]!;
    if (token.startsWith('-')) {
      return usageError(`Unknown option: ${token}`);
    }
  }

  const pathToken =
    argvAfterCommand.length === 0 ? '.' : argvAfterCommand[0]!;
  const target = resolve(process.cwd(), pathToken);

  const classification = classifyInitTarget(target);
  if (classification.kind === 'conforming') {
    return { exitCode: 0, stdout: '', stderr: '' };
  }
  if (classification.kind === 'conflict') {
    return conflictError(classification.message);
  }

  const created = createInitProject(target);
  if (!created.ok) {
    return createError(created.message);
  }

  return { exitCode: 0, stdout: '', stderr: '' };
}
