import { expect, test } from "claude-code/testing";

import { ASKED_WAYS, EXPLANATION_LENGTHS, explainPrompt, proposePrompt, SIDE_REQUEST_FRAME } from "../prompt";
import { AFTER_KNOWN } from "../propose-text";
import { parseExplanation } from "../cards";

test("the propose prompt keeps the labels the parser reads and the none reply", () => {
	// Arrange
	const labels = ["learn: none", "learn:", "tag:", "explain:", "You should know", "Heads up"];

	// Act
	const prompt = proposePrompt([], []);

	// Assert
	for (const label of labels) {
		expect(prompt).toContain(label);
	}
});

test("the propose prompt places earlier offers and known topics in their own tagged blocks", () => {
	// Arrange
	const seen = ["SEEN-ONE"];
	const known = ["KNOWN-ONE"];

	// Act
	const prompt = proposePrompt(seen, known);

	// Assert
	const offers = prompt.slice(prompt.indexOf("<recent_offers>"), prompt.indexOf("</recent_offers>"));
	const knowns = prompt.slice(prompt.indexOf("<known_topics>"), prompt.indexOf("</known_topics>"));
	expect(offers).toContain("- SEEN-ONE");
	expect(offers).not.toContain("KNOWN-ONE");
	expect(knowns).toContain("- KNOWN-ONE");
});

test("the propose prompt carries the secret-in-a-command section whole (REQ-062)", () => {
	// Arrange
	const open = AFTER_KNOWN.indexOf("<safety_of_the_conversation>");
	const section = AFTER_KNOWN.slice(open, AFTER_KNOWN.indexOf("</safety_of_the_conversation>") + 1).join("\n");

	// Act
	const prompt = proposePrompt([], []);

	// Assert
	expect(open).toBeGreaterThanOrEqual(0);
	expect(section.split("\n").length).toBeGreaterThan(2);
	expect(prompt).toContain(section);
});

test("the propose prompt asks for the session language and stays within its size budget (REQ-073)", () => {
	// Arrange
	const budget = 12_000;

	// Act
	const prompt = proposePrompt([], []);

	// Assert
	expect(prompt).toContain("Language instruction");
	expect(prompt.length).toBeLessThan(budget);
});

test("the explain prompt carries the topic, the frame and the language rule, and a redo carries the earlier text", () => {
	// Arrange
	const redo = { direction: "less_detail", previous: "EARLIER-TEXT" } as const;

	// Act
	const first = explainPrompt("TOPIC-LINE", undefined);
	const again = explainPrompt("TOPIC-LINE", redo);

	// Assert
	expect(first).toContain("TOPIC-LINE");
	expect(first).toContain("Language instruction");
	expect(first).not.toContain("<previous_explanation>");
	expect(again).toContain("EARLIER-TEXT");
	expect(again).toContain(ASKED_WAYS.less_detail);
});

test("an explanation shaped as the explain prompt asks parses into a titled card", () => {
	// Arrange
	const reply = "**Listing the step once saves two runs**\nA build step is a command the pipeline runs.\nIt runs 1 time instead of 3.";

	// Act
	const cards = parseExplanation(reply);

	// Assert
	expect(cards[0]?.title).toBe("Listing the step once saves two runs");
	expect(cards[0]?.lead).toContain("build step");
});

test("the check and the explanation each open with the side-request frame that bars tools and secrets (REQ-001)", () => {
	// Arrange
	const frame = SIDE_REQUEST_FRAME;

	// Act
	const check = proposePrompt([], []);
	const explain = explainPrompt("TOPIC-LINE", undefined);

	// Assert
	expect(check.startsWith(`${frame}\n`)).toBe(true);
	expect(explain.startsWith(`${frame}\n\n`)).toBe(true);
	expect(frame).toContain("no tools");
	expect(frame).toContain("single reply");
	expect(frame).toContain("Credentials, tokens, keys, environment values, and personal data");
});

test("the explanation format asks for a bold title, a tiny example, a sketch within 60 by 6 and a closing choice (REQ-004)", () => {
	// Arrange
	const prompt = explainPrompt("TOPIC-LINE", undefined);

	// Act
	const shape = prompt.slice(prompt.indexOf("<shape>"), prompt.indexOf("</shape>"));

	// Assert
	expect(shape).toContain("two to six plain words");
	expect(shape).toContain("tiny example");
	expect(shape).toContain("60 characters wide and 6 lines tall");
	expect(shape).toContain("the choice they are making, in one sentence");
	expect(prompt).toContain("Keep the title as the only heading");
});

test("each direction puts exactly its own length line into the explanation prompt (REQ-005)", () => {
	// Arrange
	const limits = { first: "at most 100 words", simpler_words: "at most 100 words", less_detail: "at most 45 words", more_detail: "at most 160 words" } as const;

	// Act and Assert
	for (const direction of ["first", "simpler_words", "less_detail", "more_detail"] as const) {
		const prompt = explainPrompt("T", direction === "first" ? undefined : { direction, previous: "P" });
		const others = Object.entries(EXPLANATION_LENGTHS).filter(([name]) => name !== direction);
		expect(prompt).toContain(EXPLANATION_LENGTHS[direction]);
		expect(EXPLANATION_LENGTHS[direction]).toContain(limits[direction]);
		for (const [, line] of others) {
			expect(prompt).not.toContain(line);
		}
	}
});

test("the propose prompt fills the frame and the lists: nothing yet when empty, one dash line per item (REQ-009)", () => {
	// Arrange
	const empty = proposePrompt([], []);

	// Act
	const two = proposePrompt(["ONE", "TWO"], ["KNOWN"]);

	// Assert
	expect(empty.startsWith(SIDE_REQUEST_FRAME)).toBe(true);
	expect(empty.split("(nothing yet)")).toHaveLength(3);
	expect(empty).not.toContain("<<");
	expect(two).toContain("- ONE\n- TWO");
	expect(two.split("(nothing yet)")).toHaveLength(1);
});

test("the propose prompt holds an absence claim to the file's full text", () => {
	// Act
	const prompt = proposePrompt([], []);

	// Assert
	expect(prompt).toContain("absent from a file rests on the file's full text appearing in the session");
});
