/**
 * Gives a Bash command an empty stdin, so a stray stdin reader such as `wc -l`
 * with no file reads EOF at once instead of waiting out the timeout. A leading
 * `exec </dev/null` does it with no brace group: Claude Code cannot split a
 * command that holds a group into subcommands, and a PreToolUse hook then
 * ignores its `if` rule and runs for every call. A heredoc binds to its own
 * command, so it still feeds that command.
 *
 * @param command The Bash command as the model wrote it.
 * @returns The command after a line that points stdin at /dev/null.
 */
export const closeStdin = (command: string): string =>
	`exec </dev/null\n${command}`;
