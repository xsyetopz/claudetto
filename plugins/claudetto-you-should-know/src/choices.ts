// The buttons of each view: their keys, hotkeys, and labels, as plain data
// (`docs/keep/plugins/you-should-know-design.txt:85-95`).

import { parseExplanation } from "./cards.ts";
import type { View } from "./rows.ts";

/** The key of a button, which `press` in `answer.ts` switches on when a press arrives. */
export type ButtonKey =
	| "learn"
	| "know"
	| "dismiss"
	| "helpful"
	| "not-relevant"
	| "not-understood"
	| "understood";

/** One button of a view: `hotkey` is the digit key that arms it on the terminal. */
export interface Choice {
	readonly key: ButtonKey;
	readonly label: string;
	readonly hotkey: string;
}

const DISMISS: Choice = { key: "dismiss", label: "Dismiss", hotkey: "0" };

const ASKED: readonly Choice[] = [
	{ key: "helpful", label: "That was helpful", hotkey: "1" },
	{ key: "not-relevant", label: "Not relevant", hotkey: "2" },
	{ key: "not-understood", label: "Couldn’t understand", hotkey: "3" },
	DISMISS,
];

const EXPLAINED: readonly Choice[] = [
	{ key: "understood", label: "Understood", hotkey: "1" },
	DISMISS,
];

/** Whether the view carries an explanation that has at least one card to show. */
export const hasCards = (view: View): boolean =>
	parseExplanation(view.explanation).length > 0;

/**
 * The buttons of a view, in the order they are drawn. An offer with no explanation has no "Learn
 * more", because a second request is not made for it.
 */
export const choicesOf = (view: View): readonly Choice[] => {
	switch (view.kind) {
		case "asked":
			return ASKED;
		case "explained":
			return EXPLAINED;
		default: {
			const know: Choice = {
				key: "know",
				label: "Knew this already",
				hotkey: "2",
			};
			return hasCards(view)
				? [{ key: "learn", label: "Learn more", hotkey: "1" }, know, DISMISS]
				: [know, DISMISS];
		}
	}
};
