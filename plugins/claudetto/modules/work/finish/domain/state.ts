// The state of a goal (`.claude/claudetto/goal.json`): the one check command that the `Stop` hook runs.

import { parseJson } from "../../../../kernel/text.ts";

export interface Goal {
	readonly check: string;
}

const SLASH_COMMAND = /^\/[\w.-]+(:[\w.-]+)?(\s|$)/;
const BACKTICKED = /^`([^`]+)`$/;

/** Whether `text` starts with a slash command such as `/claudetto:apply`, which `sh -c` cannot run. A path such as `/usr/bin/true` has a second `/`. */
export const isSlashCommand = (text: string): boolean =>
	SLASH_COMMAND.test(text.trim());

/** The goal in `text`, or `null` for no goal (`null`, an empty file, text that is not a goal, or a slash command). */
export const parseGoal = (text: string): Goal | null => {
	const goal = parseJson(text);
	if (
		typeof goal === "object" &&
		goal !== null &&
		"check" in goal &&
		typeof goal.check === "string" &&
		goal.check &&
		!isSlashCommand(goal.check)
	) {
		return { check: goal.check };
	}
	return null;
};

/** The check command in the text after `/goal`: the text with one pair of backticks cut. */
export const checkOf = (args: string): string =>
	args.trim().replace(BACKTICKED, "$1");
