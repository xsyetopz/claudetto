/** Matches a command that records or publishes work. */
const PUBLISH = /\bgit\b[^|;&\n]*?\s(?:commit|push)\b/u;

/**
 * Makes a failing check stop a commit or push chained after it through a pipe.
 * Without it, `bun test | tail -3 && git commit` commits on red because the
 * pipe reports `tail`'s status. `set -o pipefail` works the same in zsh and
 * bash, and each Bash call starts a fresh shell, so the option ends with the
 * call. errexit would also catch `bun test; git commit`, but Claude Code runs
 * the command as `eval <command> && pwd -P ...`, and a shell suspends errexit
 * on the left of `&&`.
 *
 * @param command The Bash command as it reaches the tool.
 * @returns The command with pipefail on when it commits or pushes.
 */
export const gateCommit = (command: string): string =>
	PUBLISH.test(command) ? `set -o pipefail\n${command}` : command;
