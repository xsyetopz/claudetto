/** A heading line that opens a list of what the session leaves undone. */
const OPEN_HEADING =
	/^[\s>*#_-]*(still open|open items?|what'?s left|what is left|remaining|left to do|to do|todo|not done)\b[^\n]*$/i;

/** A line of that list: a bullet or a number. */
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+(.*\S)\s*$/;

/** A reason outside the session's reach: an approval, a denial, a paid run, a key, or a step only the user takes. */
const BLOCKER =
	/approv|paid|denied|denial|permission|blocked|waits? on|needs? (?:you|your|a key|an? api key)|\bonly you\b|your (?:call|decision|login|answer)|api key|credential/i;

const HEADING_LINE = /^\s*#{1,6}\s/;

/** The text of each item under an open-list heading that names no blocker, up to the next blank-then-heading line. */
export const unblockedItems = (reply: string): readonly string[] => {
	const lines = reply.split("\n");
	const items: string[] = [];
	let inOpen = false;
	for (const line of lines) {
		if (OPEN_HEADING.test(line)) {
			inOpen = true;
			continue;
		}
		if (HEADING_LINE.test(line)) {
			inOpen = false;
			continue;
		}
		const item = inOpen ? LIST_ITEM.exec(line)?.[1] : undefined;
		if (item !== undefined && !BLOCKER.test(item)) {
			items.push(item);
		}
	}
	return items;
};

export const openItemsAsk = (items: readonly string[]): string =>
	`An item you can still do with your tools is work: do it before you end. These open items name no blocker outside your reach:\n${items.map((item) => `- ${item}`).join("\n")}\nDo each, or name its blocker: a denial, a paid run that waits for approval, or a step only the user can take.`;
