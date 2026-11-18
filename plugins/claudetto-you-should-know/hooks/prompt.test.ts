import { expect, test } from "claude-code/testing";

import { explainPrompt, proposePrompt } from "./prompt";
import { parseExplanation } from "./cards";

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

test("the propose prompt says a secret inside a command was not typed into the chat (REQ-062)", () => {
	// Arrange
	const prompt = proposePrompt([], []);

	// Act
	const clause = prompt.slice(prompt.indexOf("<safety_of_the_conversation>"));

	// Assert
	expect(clause).toContain("osascript");
	expect(clause).toContain("was not typed into the chat");
	expect(clause).toContain("only when a message from the person contains it");
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
	expect(again).toContain("with less detail");
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
