export type CommandHandler = (argvAfterCommand: readonly string[]) => {
  exitCode: number;
  stdout: string;
  stderr: string;
};

/** Internal command registry used by CLI dispatch (non-public). */
export const COMMAND_REGISTRY = new Map<string, CommandHandler>();
