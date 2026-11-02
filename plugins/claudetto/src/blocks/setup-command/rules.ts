// The code rules apply to edits, not to every turn, so they ship as a user rules file whose `paths:`
// keeps them out of a session until it reads a file. Claude Code does not load a plugin's `rules/`.

import { SETTINGS_FILE } from "../../settings-file.ts";
import type { Difference } from "./diff.ts";

export const CODE_RULES = "rules/claudetto-code.md";

const GROUP = "Code rules";

const WHY =
	"Writes claudetto's code rules to the user rules folder: the least code that does the task, a guard only at a trust boundary, the edge cases named in the report, and a comment only for a reason. A session loads them after its first file read.";

/** Claude Code reads user rules from `rules/` beside the user settings file. */
export const userRulesFile = (settingsFile: string): string =>
	`${settingsFile.slice(0, -SETTINGS_FILE.length)}${CODE_RULES}`;

/** `undefined` when the plugin ships no file or the user's file already holds the shipped text. */
export const rulesDifference = (
	shipped: string | undefined,
	held: string | undefined,
): Difference | undefined => {
	if (shipped === undefined || held === shipped) {
		return undefined;
	}
	return {
		id: CODE_RULES,
		group: GROUP,
		...(held === undefined ? {} : { now: "a file with other text" }),
		claudetto: "the shipped file",
		why: WHY,
	};
};
