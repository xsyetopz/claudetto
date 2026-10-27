// The shape of a final reply: left work, a claim of done work, and a heading in the wrong case. The rules match on the text and run no model.

import { oneLine, titleCase } from "../../../../kernel/text.ts";
import { NOTE_ITEM_CHARS } from "../limits.ts";

const CODE_FENCE = /^\s*```/;
const LEADING_MARKS = /^[\s>*#-]*/;
const STARS = /\*+/g;
const HEADING_LINE = /^ {0,3}#{1,6}\s+(.*?)(?:\s+#+)?\s*$/;

/** A line that opens with a label of left work, such as `Not done:`, `Follow-ups`, or `Still open:`. */
const LABEL =
	/^[\s>*#-]*\**(?:not done|not fixed|not verified|not mine|still open|left open|open items?|follow[- ]?ups?|deferred|paused)\b/i;

/** A phrase of left work in a line of prose. */
const PHRASE =
	/\b(?:for later|later release|future (?:work|release|version)|waits? for your|not part of this task|weren'?t traced|(?:have|has) not been (?:run|traced|verified|checked|fixed|done|tested))\b/i;

/** A word that names a block that stopped the work, such as a sandbox deny or a permission check. */
const BLOCK =
	/\b(?:sandbox|denied|deny|blocked by|permission (?:check|rule|dialog)|rate limit)\b/i;

/** A claim of done work. A negated form, such as `not done`, is no claim. */
const NOT_DONE =
	/\b(?:not|isn't|is not|n't) (?:yet |fully )?(?:done|ready)\b/gi;
const DONE = /\b(?:ready|done)\b/i;

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

/** The first item that `reply` lists as left, cut to `NOTE_ITEM_CHARS`, or `null`. A reply that names a block lists nothing. */
export const deferredItem = (reply: string): string | null => {
	const lines = proseLines(reply);
	if (BLOCK.test(lines.join("\n"))) {
		return null;
	}
	const line = lines.find((l) => LABEL.test(l) || PHRASE.test(l));
	return line === undefined
		? null
		: oneLine(line.replace(LEADING_MARKS, "").replace(STARS, "")).slice(
				0,
				NOTE_ITEM_CHARS,
			);
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

/** Whether `reply` says that the work is ready or done. */
export const claimsDone = (reply: string): boolean =>
	DONE.test(proseLines(reply).join("\n").replace(NOT_DONE, ""));
