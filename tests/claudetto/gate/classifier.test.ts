// The pure parts of the classifier stage: the answer of the model, the requests of the user, and the breaker.

import { expect, test } from "bun:test";
import type { SessionMessage } from "claude-code";
import {
	afterVerdict,
	answerOf,
	isTripped,
	NO_DENIALS,
	requestsOf,
} from "../../../plugins/claudetto/modules/gate/domain/classifier.ts";
import {
	CLASSIFIER_DENIALS_MAX,
	CLASSIFIER_STREAK_MAX,
	REQUEST_MAX_CHARS,
	REQUESTS_KEPT,
} from "../../../plugins/claudetto/modules/gate/limits.ts";
import { NO_REQUESTS } from "../../../plugins/claudetto/modules/gate/prompts.ts";

const row = (role: "user" | "assistant", text: string): SessionMessage => ({
	role,
	text,
	toolUses: [],
});

for (const [text, expected] of [
	[
		"<block>no</block><reason>Asked.</reason>",
		{ block: false, reason: "Asked." },
	],
	[
		"<block> YES </block>\n<reason> Not asked. </reason>",
		{ block: true, reason: "Not asked." },
	],
	["<block>yes</block>", { block: true, reason: "" }],
	["fine", undefined],
	["<block>no</block><block>yes</block>", undefined],
	["<block>maybe</block>", undefined],
] as const) {
	test(`Answer: \`${text}\` reads as ${JSON.stringify(expected)}`, () => {
		expect(answerOf(text)).toStrictEqual(expected);
	});
}

test("Requests: only the text that the user typed counts, newest last, at most `REQUESTS_KEPT`", () => {
	const messages = [
		row("user", "first"),
		row("assistant", "a plan"),
		row("user", "<task-notification>done</task-notification>"),
		row("user", "<command-name>/clear</command-name>"),
		row("user", "second<system-reminder>note</system-reminder>"),
		...Array.from({ length: REQUESTS_KEPT }, (_, i) =>
			row("user", `later ${i}`),
		),
	];

	const got = requestsOf(messages).split("\n");

	expect(got).toStrictEqual(
		Array.from({ length: REQUESTS_KEPT }, (_, i) => `- later ${i}`),
	);
});

test("Requests: a reminder is cut out of a typed row, a long row is cut, and no row gives `NO_REQUESTS`", () => {
	const long = "x".repeat(REQUEST_MAX_CHARS + 10);

	const kept = requestsOf([
		row("user", "push it<system-reminder>r</system-reminder>"),
		row("user", long),
	]);

	expect(kept.split("\n")).toStrictEqual([
		"- push it",
		`- ${"x".repeat(REQUEST_MAX_CHARS)}`,
	]);
	expect(requestsOf([])).toBe(NO_REQUESTS);
});

test("Breaker: it trips at `CLASSIFIER_STREAK_MAX` denials in a row, and an allow or a person ends the row", () => {
	let streak = NO_DENIALS;
	for (let i = 0; i < CLASSIFIER_STREAK_MAX; i++) {
		streak = afterVerdict(streak, "classifier-deny");
	}

	expect(isTripped(streak)).toBe(true);
	expect(isTripped(afterVerdict(streak, "person"))).toBe(false);
	expect(isTripped(afterVerdict(streak, "allow"))).toBe(false);
});

test("Breaker: it trips at `CLASSIFIER_DENIALS_MAX` denials in one session, also with no row", () => {
	expect(isTripped({ streak: 0, total: CLASSIFIER_DENIALS_MAX })).toBe(true);
	expect(isTripped({ streak: 0, total: CLASSIFIER_DENIALS_MAX - 1 })).toBe(
		false,
	);
});
