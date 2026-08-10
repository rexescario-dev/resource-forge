import { runValidate } from './commands/validate.js';

/**
 * Package-local CLI version corresponding to `@resource-forge/cli`.
 * Keep in sync with package.json `version` (no filesystem discovery at runtime).
 */
const CLI_VERSION = '0.0.0';

export type RunResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

type CommandHandler = (argvAfterCommand: readonly string[]) => RunResult;

/** Internal command registry (non-public). */
const COMMAND_REGISTRY = new Map<string, CommandHandler>([
  ['validate', runValidate],
]);

const HELP_TEXT = `Usage: rf [options] [command]

Resource Forge CLI.

Options:
  --help     Show help
  --version  Show version

Commands:
  validate <file>  Validate a JSON Resource document
`;

function helpResult(): RunResult {
  return { exitCode: 0, stdout: HELP_TEXT, stderr: '' };
}

function versionResult(): RunResult {
  return { exitCode: 0, stdout: `${CLI_VERSION}\n`, stderr: '' };
}

function unknownCommand(name: string): RunResult {
  return {
    exitCode: 2,
    stdout: '',
    stderr: `Unknown command: ${name}\n`,
  };
}

function invalidGlobalOption(option: string): RunResult {
  return {
    exitCode: 2,
    stdout: '',
    stderr: `Unknown option: ${option}\n`,
  };
}

function unexpectedFailure(cause: unknown): RunResult {
  const message =
    cause instanceof Error ? cause.message : 'Unexpected internal failure';
  return { exitCode: 1, stdout: '', stderr: `${message}\n` };
}

/**
 * CLI runner. `argv` excludes Node executable and script path.
 * Does not write process streams or terminate the process.
 */
export function run(argv: readonly string[]): RunResult {
  try {
    return runUnchecked(argv);
  } catch (cause) {
    return unexpectedFailure(cause);
  }
}

function runUnchecked(argv: readonly string[]): RunResult {
  let help = false;
  let version = false;
  let command: string | undefined;
  let commandIndex = -1;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]!;

    if (token === '--help') {
      help = true;
      continue;
    }
    if (token === '--version') {
      version = true;
      continue;
    }
    if (token.startsWith('-')) {
      return invalidGlobalOption(token);
    }

    command = token;
    commandIndex = i;
    break;
  }

  if (command === undefined) {
    if (help || !version) {
      return helpResult();
    }
    return versionResult();
  }

  const handler = COMMAND_REGISTRY.get(command);
  if (handler === undefined) {
    return unknownCommand(command);
  }

  // Preserve RFC-036 global --help / --version when those builtins apply.
  if (help) {
    return helpResult();
  }
  if (version) {
    return versionResult();
  }

  const rest = argv.slice(commandIndex + 1);
  return handler(rest);
}
