// How a command runs: with no shell when it is plain words, and with a shell when it needs one.

/** The characters that only a shell reads: a pipe, a list, a redirect, an expansion, a quote, a glob, a comment. */
const SHELL_SYNTAX = /[|&;<>()$`\\"'*?~#{}[\]!\n]|^\s*\w+=/;

/** The program and the arguments of a command. */
export interface Argv {
  readonly file: string;
  readonly args: readonly string[];
}

/** True when `command` has shell syntax, so that splitting it on spaces would change its meaning. */
export const needsShell = (command: string): boolean =>
  SHELL_SYNTAX.test(command);

/** The words of a plain `command`, or `null` when it needs a shell or has no word. */
export const plainArgv = (command: string): Argv | null => {
  if (needsShell(command)) return null;
  const [file, ...args] = command.trim().split(/\s+/);
  return file ? { file, args } : null;
};

/** The program and arguments that run `command` through the shell of the platform. */
export const shellArgv = (command: string, windows: boolean): Argv =>
  windows
    ? { file: "cmd.exe", args: ["/d", "/s", "/c", command] }
    : { file: "sh", args: ["-c", command] };
