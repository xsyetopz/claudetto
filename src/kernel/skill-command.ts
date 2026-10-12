// The rules of a mod handler that answers the slash command of a skill by running its CLI, with no model turn.
// A hooks module imports this file, so it has no `node:` import, no `bun:` import, and no `Bun`.

/** A finished run, as `$.process.run` gives it. */
export type Finished = {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

/** A character that a shell reads, and that `$.process.run` does not: quotes, escapes, and expansions. */
const SHELL_CHAR = /["'`\\$;&|<>(){}*?]/;

/**
 * The words of the argument text of a command, or undefined when the text needs a shell to read it.
 * `$.process.run` takes an argument vector with no shell, so a quote would reach the CLI as a character.
 * The caller leaves such a command to the skill.
 */
export const wordsOf = (args: string): string[] | undefined =>
  SHELL_CHAR.test(args) ? undefined : args.split(/\s+/).filter(Boolean);

/** The text that a command shows for the run `run` of its CLI: the output, or the status and the error text. */
export const outputOf = (run: Finished): string => {
  if (run.exitCode === 0)
    return run.stdout.trim() || "The command printed nothing.";
  const error = (run.stderr || run.stdout).trim();
  return `The command failed with exit status ${run.exitCode}.\n${error}`;
};

/** The text that a command shows when its CLI did not finish, such as on a timeout. */
export const failedText = (name: string, error: unknown): string =>
  `${name} did not finish: ${error instanceof Error ? error.message : String(error)}`;
