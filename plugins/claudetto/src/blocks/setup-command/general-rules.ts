// Setup offers the general rules as a marked section of the user's `CLAUDE.md`, which every session
// reads, and writes it only after a yes. The dialog shows the whole text, so the user sees each word.

import {
	GENERAL_RULES,
	GENERAL_SECTION,
	sectionOf,
	withSection,
} from "../general-rules/rules.ts";
import type { Difference } from "./diff.ts";
import type { Asker } from "./questions.ts";

export const GENERAL_RULES_ID = "CLAUDE.md";

export const APPEND = "Append";

export const REPLACE = "Replace";

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
		why: `Writes these lines between \`<!-- claudetto:start -->\` and \`<!-- claudetto:end -->\` in your \`CLAUDE.md\`. When the file holds other text, a second question asks whether to keep it:\n${GENERAL_RULES}`,
	};
};

const HOW_QUESTION = `Your \`CLAUDE.md\` holds other text. ${APPEND} keeps it and adds the section below, or puts it in place of an older claudetto section. ${REPLACE} makes the file hold only the section below:
${GENERAL_SECTION}`;

/** The text to write to `CLAUDE.md`, or `undefined` when the user dismissed the question. */
export const generalText = async (
	ask: Asker,
	held: string | undefined,
): Promise<string | undefined> => {
	const own = sectionOf(held) ?? "";
	// A replace drops only text outside the section, so with none there is nothing to ask.
	if ((held ?? "").replace(own, "").trim() === "") {
		return withSection(held);
	}
	let how: string;
	try {
		how = await ask(HOW_QUESTION, {
			options: [APPEND, REPLACE],
			header: GENERAL_RULES_ID,
		});
	} catch {
		return undefined;
	}
	if (how === REPLACE) {
		return `${GENERAL_SECTION}\n`;
	}
	return how === APPEND ? withSection(held) : undefined;
};
