import type { On } from "claude-code";

import { userSettingsPath } from "../settings/settings";
import { fault } from "../shared/fault";

const TAIL = 'the prompt "';

/** The user's request closes the stock text in quotes; a text without that shape is the request itself. */
export const requestOf = (stock: string): string => {
	const at = stock.lastIndexOf(TAIL);
	if (at === -1) {
		return stock;
	}
	const tail = stock.slice(at + TAIL.length);
	return tail.endsWith('"') ? tail.slice(0, -1) : tail;
};

/**
 * The edit text for `/statusline`: the main model changes the setting itself,
 * so no `statusline-setup` subagent starts (its first request alone is 20,234
 * bytes on 2.1.318). The file is named in the text so the edit lands in the
 * settings file the user runs under, whatever CLAUDE_CONFIG_DIR holds.
 */
export const statuslineEdit = (stock: string, file: string): string =>
	`Set the user's status line to: ${requestOf(stock)}
Read @${file}, then write \`statusLine\` as { "type": "command", "command": "<shell command>" }, where the command reads the session JSON on stdin and prints one line. Keep every other key as it is, so the user's settings stay intact. Run the command once on a sample JSON with Bash before you write it, so a broken command never reaches the file.`;

/** Rewrites the built-in `/statusline` prompt; a skill of the same name from elsewhere passes through. */
export function registerStatuslineCommand(on: On): void {
	on("skill.prompt", { skill: "statusline" }, async ($, e, next) =>
		e.source === "built-in"
			? { text: statuslineEdit(e.text, await userSettingsPath($)) }
			: next(e)
	).catch(($, e, next) => {
		fault($, "status line", next.error);
		return next(e);
	});
}
