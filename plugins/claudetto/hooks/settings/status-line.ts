import { indentOf, isRecord, parseSettings } from "./settings";

/** The name every claudetto status line command carries, which marks it as claudetto's own. */
const MARK = "claudetto-statusline";

/** The command that runs the status line script of the plugin installed at `root`. */
export const statusLineCommand = (root: string): string =>
	`bun --no-env-file "${root}/bin/${MARK}"`;

/**
 * Points the user's `statusLine` at the plugin's script (ADR-0201). A plugin's
 * own `settings.json` cannot carry it: claude 2.1.329 draws nothing for one.
 * The key is written only when the user has none, or when it is claudetto's own
 * command for another root (a plugin upgrade moved it); a status line the user
 * wrote stays as it is, and so does every other key. Returns `text` unchanged
 * when nothing is to change or the file holds no JSON object.
 */
export function wireStatusLine(text: string, root: string): string {
	const settings = parseSettings(text);
	if (settings === undefined) {
		return text;
	}
	const wanted = statusLineCommand(root);
	const current = settings["statusLine"];
	if (current === undefined) {
		return render(
			{ ...settings, statusLine: { type: "command", command: wanted } },
			text
		);
	}
	if (!isRecord(current)) {
		return text;
	}
	const command = current["command"];
	if (
		typeof command === "string" &&
		command.includes(MARK) &&
		command !== wanted
	) {
		return render(
			{ ...settings, statusLine: { ...current, command: wanted } },
			text
		);
	}
	return text;
}

const render = (next: object, text: string): string =>
	`${JSON.stringify(next, null, indentOf(text))}\n`;
