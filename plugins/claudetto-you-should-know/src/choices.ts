import { parseExplanation } from "./cards.ts";
import type { View } from "./rows.ts";

export type ButtonKey =
	| "learn"
	| "know"
	| "dismiss"
	| "helpful"
	| "not-relevant"
	| "not-understood"
	| "understood"
	| "respond";

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
	{ key: "respond", label: "Chat in main session", hotkey: "2" },
	DISMISS,
];

export const hasCards = (view: View): boolean =>
	parseExplanation(view.explanation).length > 0;

/** An offer with no explanation has no "Learn more": a second request is not made for it. */
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
