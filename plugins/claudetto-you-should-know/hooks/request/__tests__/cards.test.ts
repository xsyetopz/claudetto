import { describe, expect, test } from "claude-code/testing";

import {
	type Box,
	MOUNT,
	offered,
	PLUGIN,
	PROPS,
	untilShown
} from "../../__tests__/testkit";
import { parseExplanation } from "../cards";

describe("parseExplanation", () => {
	test("splits titled cards with a sketch and a caption", () => {
		expect(
			parseExplanation(
				"**Order**\nTests run top to bottom.\n```\nA -> B\n```\nCaption here\n\n**Second**\nLead2"
			)
		).toEqual([
			{
				title: "Order",
				lead: "Tests run top to bottom.",
				sketch: ["A -> B"],
				caption: "Caption here"
			},
			{ title: "Second", lead: "Lead2", sketch: [], caption: "" }
		]);
	});

	test("returns no card for empty text", () => {
		expect(parseExplanation("")).toEqual([]);
	});

	test("clips a long caption at a word with an ellipsis", () => {
		const long = `**T**\n${"word ".repeat(1500)}`;
		const cards = parseExplanation(long);
		const lead = cards[0]?.lead ?? "";
		expect(lead.length).toBeLessThanOrEqual(4001);
		expect(lead.endsWith("…")).toBe(true);
	});

	test("starts a new card on a second fence and drops blank prose", () => {
		const cards = parseExplanation("```\na\n```\n\n```\nb\n```");
		expect(cards.length).toBe(2);
	});

	test("keeps at most 12 sketch lines and a title of a card with a line feed", () => {
		const text = `**T**\n\`\`\`\n${Array.from({ length: 20 }, (_, i) => `r${i}`).join("\n")}\n\`\`\``;
		expect(parseExplanation(text)[0]?.sketch.length).toBe(12);
	});
	test("a title over its limit ends in an ellipsis at a word boundary", () => {
		// Arrange
		const text = `**${"word ".repeat(40).trim()}**\nbody`;

		// Act
		const title = parseExplanation(text)[0]?.title ?? "";

		// Assert
		expect(title.endsWith("…")).toBe(true);
		expect(title.length).toBeLessThanOrEqual(120);
		expect(title.slice(0, -1).endsWith("word")).toBe(true);
	});

	test("a new fence starts a new card and an escape sequence in a sketch line is removed", () => {
		// Arrange
		const text = "**A**\n```\nx\u001B[31my\n```\n```\nb\n```";

		// Act
		const cards = parseExplanation(text);

		// Assert
		expect(cards.map((c) => c.sketch)).toEqual([["xy"], ["b"]]);
	});
});

const fresh = (): Box => ({ text: "", filled: [], toasts: [], forks: 0 });
const WIDE = "W".repeat(150);
const REPLY = `learn: Tests run in order.\ntag: You should know\nexplain: **Order**\nThey run one after another.\n\`\`\`\nA -> B\n${WIDE}\n\`\`\`\nCaption here`;

const open = async (
	$: Parameters<typeof offered>[0],
	on: Parameters<typeof offered>[1],
	props?: object
) => {
	const band = await offered($, on, fresh(), {
		replies: [REPLY],
		props: { ...PROPS, ...props }
	});
	await band.press({ key: "Learn more" });
	await untilShown(band, "Understood", 80);
	return band;
};

test(
	"an explained card with a sketch draws the sketch lines in a code block",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await open($, on);

		// Act
		const drawn = JSON.stringify(await band.drawn());

		// Assert
		expect(drawn).toContain("Code");
		expect(drawn).toContain("A -> B");
		expect(drawn).toContain("Caption here");
	}
);

test(
	"a sketch line wider than the body minus the inset ends in an ellipsis",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await open($, on, { bodyColumns: 40 });

		// Act
		const drawn = JSON.stringify(await band.drawn());

		// Assert
		expect(drawn).not.toContain(WIDE);
		expect(drawn).toContain("…");
	}
);

test(
	"a survey keeps the sketch card and draws no button",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await open($, on);
		const survey = await $.ui.mount({
			plugin: PLUGIN,
			surface: "terminal",
			component: "AbovePrompt",
			props: { ...PROPS, hasSurvey: true }
		});

		// Act
		const drawn = JSON.stringify(await survey.drawn());

		// Assert
		expect(await band.find({ key: "Understood" })).toBeDefined();
		expect(drawn).toContain("A -> B");
		expect(await survey.find({ key: "Understood" })).toBeUndefined();
	}
);
