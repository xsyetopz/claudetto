// The classifier of the gate: it settles an `ask` of the gate with no person, as the auto mode of Claude Code does for the asks of its rules.
// Jev answers first, and a sure yes allows. Else a small model reads the rules, the newest requests of the user, and the call, and allows or blocks it.

import type { SessionMessage } from "claude-code";
import {
	CLASSIFIER_DENIALS_MAX,
	CLASSIFIER_STREAK_MAX,
	INPUT_MAX_CHARS,
	REQUEST_MAX_CHARS,
	REQUESTS_KEPT,
} from "../limits.ts";
import { NO_REQUESTS } from "../prompts.ts";

const NOTES = /<(system-reminder|task-notification)>[\s\S]*?<\/\1>/g;
const BLOCK = /<block>\s*(yes|no)\s*<\/block>/gi;
const REASON = /<reason>([\s\S]*?)<\/reason>/i;

/** The newest `REQUESTS_KEPT` texts that the user typed, each cut at `REQUEST_MAX_CHARS`, as a list, or `NO_REQUESTS`. A reminder, a notification, and a row of tags, such as a command or a hook text, are no words of the user. */
export const requestsOf = (messages: readonly SessionMessage[]): string => {
	const typed = messages
		.filter((m) => m.role === "user")
		.map((m) => m.text.replace(NOTES, "").trim())
		.filter((text) => text !== "" && !text.startsWith("<"));
	const kept = typed
		.slice(-REQUESTS_KEPT)
		.map((text) => `- ${text.slice(0, REQUEST_MAX_CHARS)}`);
	return kept.length === 0 ? NO_REQUESTS : kept.join("\n");
};

/** The input of a call as JSON, cut at `INPUT_MAX_CHARS`. */
export const inputText = (input: unknown): string =>
	(JSON.stringify(input) ?? "").slice(0, INPUT_MAX_CHARS);

/** The answer of the classifier: `block` and its reason, or `undefined` when the text has no single `<block>` tag. */
export const answerOf = (
	text: string,
): { block: boolean; reason: string } | undefined => {
	const blocks = [...text.matchAll(BLOCK)].map((m) => m[1]?.toLowerCase());
	if (blocks.length !== 1) {
		return undefined;
	}
	return {
		block: blocks[0] === "yes",
		reason: REASON.exec(text)?.[1]?.trim() ?? "",
	};
};

/** The denials of the classifier in one session: in a row, and in all. */
export interface Denials {
	readonly streak: number;
	readonly total: number;
}

export const NO_DENIALS: Denials = { streak: 0, total: 0 };

/** True when the classifier has denied too often, so a person decides the next `ask`. */
export const isTripped = (d: Denials): boolean =>
	d.streak >= CLASSIFIER_STREAK_MAX || d.total >= CLASSIFIER_DENIALS_MAX;

/** The denials after one verdict: a denial adds one, an allow ends the row, and an `ask` that a person got ends the row too, so the next one goes to the classifier again. */
export const afterVerdict = (
	d: Denials,
	decider: "classifier-deny" | "allow" | "person",
): Denials =>
	decider === "classifier-deny"
		? { streak: d.streak + 1, total: d.total + 1 }
		: { ...d, streak: 0 };
