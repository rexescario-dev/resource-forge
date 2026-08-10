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

/** Internal empty command registry (non-public extension seam). */
const COMMAND_REGISTRY = new Set<string>();

const HELP_TEXT = `Usage: rf [options] [command]

Resource Forge CLI (shell foundation).

Options:
  --help     Show help
  --version  Show version

No product commands are registered in this release.
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
 * Pure CLI runner. `argv` excludes Node executable and script path.
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
    // Remaining tokens ignored for M5.1; empty registry ⇒ unknown command.
    break;
  }

  if (command !== undefined && !COMMAND_REGISTRY.has(command)) {
    return unknownCommand(command);
  }

  if (help || (!help && !version)) {
    // Bare `rf` and `--help` (including `--help --version`).
    return helpResult();
  }

  return versionResult();
}
