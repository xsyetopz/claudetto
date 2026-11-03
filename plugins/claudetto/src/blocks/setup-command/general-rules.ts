// Setup offers the general rules as a marked section of the user's `CLAUDE.md`, which every session
// reads, and writes it only after a yes. The dialog shows the whole text, so the user sees each word.

import {
	GENERAL_RULES,
	GENERAL_SECTION,
	sectionOf,
} from "../general-rules/rules.ts";
import type { Difference } from "./diff.ts";

export const GENERAL_RULES_ID = "CLAUDE.md";

const GROUP = "General rules";

/** `undefined` when the user's `CLAUDE.md` already holds the shipped section. */
export const generalDifference = (
	held: string | undefined,
): Difference | undefined => {
	const own = sectionOf(held);
	if (own === GENERAL_SECTION) {
		return undefined;
	}
	return {
		id: GENERAL_RULES_ID,
		group: GROUP,
		...(own === undefined ? {} : { now: "an older claudetto section" }),
		claudetto: "a marked section",
		why: `Writes these lines between \`<!-- claudetto:start -->\` and \`<!-- claudetto:end -->\` in your \`CLAUDE.md\` and keeps the rest of the file:\n${GENERAL_RULES}`,
	};
};
