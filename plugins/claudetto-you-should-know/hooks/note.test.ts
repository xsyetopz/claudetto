import { expect, test } from "claude-code/testing";

import {
	blankRow,
	draftFor,
	fillOutcome,
	isRepeat,
	LIMITS,
	parseCards,
	parseReply,
	remember,
	type Row,
	skipsAfter,
	type View,
	withRow,
} from "./note.ts";

const viewed = (explanation: string, line = "Tests run in order."): View => ({
	kind: "explained",
	line,
	explanation,
	shownAt: 0,
});

test("a reply without a learn line shows nothing", () => {
	expect(parseReply("tag: You should know\nexplain: **A**\nBody.")).toBe(
		undefined,
	);
});

test("a reply of none, in any case and with a final period, shows nothing", () => {
	expect(parseReply("learn: None.")).toBe(undefined);
	expect(parseReply("LEARN: none")).toBe(undefined);
});

test("a learn line of 240 characters is offered, one of 241 or none is not", () => {
	const line = "a".repeat(LIMITS.lineChars);
	expect(parseReply("learn:")).toBe(undefined);
	expect(parseReply(`learn: ${line}b`)).toBe(undefined);
	expect(parseReply(`learn: ${line}`)?.line).toBe(line);
});

test("the first learn line decides", () => {
	expect(parseReply("learn: First.\nlearn: Second.")?.line).toBe("First.");
});

test("a reply without an explain label offers a line with no explanation and the default tag", () => {
	expect(parseReply("learn: Something happens.")).toEqual({
		line: "Something happens.",
		tag: "You should know",
		explanation: "",
	});
});

test("a heads-up tag is kept and any other tag falls back to the default", () => {
	expect(parseReply("learn: A.\ntag: Heads-up")?.tag).toBe("Heads up");
	expect(parseReply("learn: A.\ntag: Breaking news")?.tag).toBe(
		"You should know",
	);
});

test("the explanation holds the rest of the reply after its label", () => {
	expect(parseReply("learn: A.\nexplain: **T**\nBody.")?.explanation).toBe(
		"**T**\nBody.",
	);
});

test("an explanation is cut to four cards", () => {
	const text = [1, 2, 3, 4, 5].map((n) => `**Card ${n}**\nBody.`).join("\n");
	expect(parseCards(text)).toHaveLength(LIMITS.cards);
});

test("a title starting the text makes the first card, with no empty card before it", () => {
	expect(parseCards("**A**\nBody.").map((c) => c.title)).toEqual(["A"]);
});

test("a card keeps 12 sketch lines of 120 characters and a title of 120", () => {
	const rows = Array.from({ length: 14 }, () => "x".repeat(150));
	const [card] = parseCards(
		[`**${"t".repeat(200)}**`, "```", ...rows, "```"].join("\n"),
	);
	expect(card?.sketch).toHaveLength(LIMITS.sketchLines);
	expect(card?.sketch[0]).toHaveLength(LIMITS.sketchChars);
	expect(card?.title).toHaveLength(LIMITS.titleChars);
});

test("text before and after a fence becomes the lead and the caption, cut at a word", () => {
	const [card] = parseCards(
		["**T**", "Lead.", "```", "a", "```", "word ".repeat(1000)].join("\n"),
	);
	expect(card?.lead).toBe("Lead.");
	expect(card?.caption.length).toBeLessThanOrEqual(LIMITS.proseChars);
	expect(card?.caption.endsWith("word")).toBe(true);
});

test("blank text has no cards", () => {
	expect(parseCards("\n  \n")).toEqual([]);
});

test("the back-off is nothing for two ignores, doubles after, and stops at 16", () => {
	expect(
		[1, 2, 3, 4, 5, 6, 7, 8, 9, 30].map((item) => skipsAfter(item)),
	).toEqual([0, 0, 1, 2, 4, 8, 16, 16, 16, 16]);
});

test("a line equal to a known line except for case and final period is a repeat", () => {
	expect(isRepeat("TESTS RUN IN ORDER", ["x"], ["Tests run in order."])).toBe(
		true,
	);
	expect(isRepeat("Another.", ["x"], ["y"])).toBe(false);
});

test("a list keeps its last 50 lines and moves a repeated line to the end", () => {
	const list = Array.from({ length: 50 }, (_, n) => `Line ${n}.`);
	const grown = remember(list, "New.");
	expect(grown).toHaveLength(50);
	expect(grown[0]).toBe("Line 1.");
	expect(remember(["A.", "B."], "a")).toEqual(["B.", "a"]);
});

const openRowOf = (n: number): Row => ({
	...blankRow(`r${n}`),
	view: { kind: "offer", line: "L.", explanation: "", shownAt: 0 },
});

test("a 33rd session row evicts a closed row first", () => {
	const rows = Array.from({ length: 32 }, (_, n) => openRowOf(n)).with(
		7,
		blankRow("r7"),
	);
	const ids = withRow(rows, blankRow("s1")).map((r) => r.id);
	expect(ids).toHaveLength(LIMITS.sessionsMax);
	expect(ids).toContain("s1");
	expect(ids).not.toContain("r7");
	expect(ids).toContain("r0");
});

test("the chat draft quotes the tag, the line, and the cards", () => {
	expect(draftFor("You should know", viewed("**Order**\nTop down."))).toBe(
		`Here is a note offered by a side agent:

> You should know · Tests run in order.
>
> **Order**
> Top down.`,
	);
});

test("an at-sign in the note becomes a full-width one, so no file is mentioned", () => {
	const draft = draftFor(
		"You should know",
		viewed("**T**\nSee @file.", "Read @file first."),
	);
	expect(draft).toContain("＠file");
	expect(draft).not.toContain("@file");
});

test("a paste placeholder, an ultra keyword and a zero-width space are neutralised, and an emoji selector stays", () => {
	const draft = draftFor(
		"You should know",
		viewed("**T**\n[Image #1] UltraThink a\u200Bb ❤\uFE0F"),
	);
	expect(draft).toContain("［Image #1]");
	expect(draft).toContain("Ultra-Think");
	expect(draft).toContain("ab ❤\uFE0F");
});

test("a filled box closes the note, a missing box submits the draft, and any other refusal toasts", () => {
	expect(fillOutcome({ isFilled: true })).toEqual({ next: "close" });
	expect(fillOutcome({ isFilled: false, refusal: "no_composer" })).toEqual({
		next: "submit",
	});
	expect(fillOutcome({ isFilled: false, refusal: "dialog" })).toEqual({
		next: "toast",
		text: "A dialog has the keyboard. Answer it, then press 2 again.",
	});
	expect(fillOutcome({ isFilled: false })).toEqual({
		next: "toast",
		text: "The prompt box didn't take the note. Press 2 to try again.",
	});
});
