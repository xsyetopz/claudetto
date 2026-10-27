// The text that the judge of the opening of a reply reads: the first sentences of the reply, and the last request of the user. The rules match no word, so a reply in any language gets the same judgment.

import { OPENING_CHARS, OPENING_SENTENCES, REQUEST_CHARS } from "../limits.ts";

const LEADING_MARKS = /^[\s>*#_-]+/;
const SENTENCE_END = /(?<=[.!?。！？])\s+|\n+/;
const NOTES = /<(system-reminder|task-notification)>[\s\S]*?<\/\1>/g;

/** The first `OPENING_SENTENCES` sentences of `reply`, cut at `OPENING_CHARS`, or `""` for a reply with no text. */
export const openingOf = (reply: string): string =>
	reply
		.replace(LEADING_MARKS, "")
		.split(SENTENCE_END)
		.map((part) => part.trim())
		.filter((part) => part !== "")
		.slice(0, OPENING_SENTENCES)
		.join(" ")
		.slice(0, OPENING_CHARS);

/** The last text that the user typed, cut at `REQUEST_CHARS`, or `""`. A reminder, a notification, and a row of tags are no words of the user. */
export const lastRequest = (
	messages: readonly { role: string; text: string }[],
): string => {
	for (const { role, text } of messages.toReversed()) {
		const typed = text.replace(NOTES, "").trim();
		if (role === "user" && typed !== "" && !typed.startsWith("<")) {
			return typed.slice(0, REQUEST_CHARS);
		}
	}
	return "";
};
