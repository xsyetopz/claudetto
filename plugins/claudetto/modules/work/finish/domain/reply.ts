// The shape of a final reply: a heading in the wrong case. The rule reads the Markdown structure, no English word, and runs no model.

import { titleCase } from "../../../../kernel/text.ts";

const CODE_FENCE = /^\s*```/;
const HEADING_LINE = /^ {0,3}#{1,6}\s+(.*?)(?:\s+#+)?\s*$/;

/** The lines of `reply` outside a code fence. */
const proseLines = (reply: string): string[] => {
	let isFenced = false;
	return reply.split("\n").filter((line) => {
		if (CODE_FENCE.test(line)) {
			isFenced = !isFenced;
			return false;
		}
		return !isFenced;
	});
};

/** The first heading of `reply` outside a code fence that is not in Chicago Title Case, as `{ has, want }`, or `null`. */
export const wrongHeading = (
	reply: string,
): { has: string; want: string } | null => {
	for (const line of proseLines(reply)) {
		const has = HEADING_LINE.exec(line)?.[1];
		if (has && titleCase(has) !== has) {
			return { has, want: titleCase(has) };
		}
	}
	return null;
};
