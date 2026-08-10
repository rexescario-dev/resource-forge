import type { RunResult } from '../run.js';
import { readExplicitFile } from '../read-explicit-file.js';
import { validateResourceDocument } from '../validate-document.js';

function usageError(message: string): RunResult {
  return { exitCode: 2, stdout: '', stderr: `${message}\n` };
}

/**
 * Validate handler: arity + command-local read + document seam → RunResult.
 * Remaining argv are tokens after the `validate` command token.
 */
export function runValidate(argvAfterCommand: readonly string[]): RunResult {
  if (argvAfterCommand.length === 0) {
    return usageError('Usage: rf validate <file>');
  }

  const path = argvAfterCommand[0]!;
  if (path.startsWith('-')) {
    return usageError(`Unknown option: ${path}`);
  }

  if (argvAfterCommand.length > 1) {
    const extra = argvAfterCommand[1]!;
    if (extra.startsWith('-')) {
      return usageError(`Unknown option: ${extra}`);
    }
    return usageError('Usage: rf validate <file>');
  }

  const file = readExplicitFile(path);
  if (!file.ok) {
    return usageError(file.message);
  }

  const outcome = validateResourceDocument(file.text);
  if (outcome.ok) {
    return { exitCode: 0, stdout: '', stderr: '' };
  }

  if (outcome.kind === 'input_decode') {
    return { exitCode: 2, stdout: '', stderr: `${outcome.message}\n` };
  }

  return { exitCode: 1, stdout: '', stderr: `${outcome.message}\n` };
}
