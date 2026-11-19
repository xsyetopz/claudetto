/**
 * Gives a Bash command an empty stdin, so a stray stdin reader such as `wc -l`
 * with no file reads EOF at once instead of waiting out the timeout. The newline before `}` closes a
 * trailing comment or heredoc terminator; a heredoc binds to its own command,
 * so it still feeds that command.
 *
 * @param command The Bash command as the model wrote it.
 * @returns The command wrapped in a group that reads stdin from /dev/null.
 */
export const closeStdin = (command: string): string => `{ ${command}\n} </dev/null`;
