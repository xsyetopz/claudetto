import type { On } from "claude-code";
import { fault } from "../fault";

/**
 * Gives a Bash command an empty stdin. The newline before `}` closes a
 * trailing comment or heredoc terminator; a heredoc binds to its own command,
 * so it still feeds that command.
 *
 * @param command The Bash command as the model wrote it.
 * @returns The command wrapped in a group that reads stdin from /dev/null.
 */
export const closeStdin = (command: string): string => `{ ${command}\n} </dev/null`;

/**
 * Closes stdin for every Bash call (RISK-488). A stray stdin reader such as
 * `wc -l` with an empty argument list otherwise waits until the 120-second
 * timeout moves the call to the background; with /dev/null it reads EOF at once.
 */
export function registerStdin(on: On): void {
	on("tool.call", { tool: "Bash" }, ($, e, next) =>
		e.tool === "Bash" ? next({ ...e, command: closeStdin(e.command) }) : next(e),
	).catch(($, e, next) => (fault($, "stdin guard", next.error), next(e)));
}
