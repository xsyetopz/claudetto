import { describe, expect, test } from "claude-code/testing";

import { parseExplanation } from "../cards";
import { type Box, offered, PLUGIN, PROPS, pause } from "../../__tests__/testkit";

describe("parseExplanation", () => {
	test("splits titled cards with a sketch and a caption", () => {
		expect(
			parseExplanation(
				"**Order**\nTests run top to bottom.\n```\nA -> B\n```\nCaption here\n\n**Second**\nLead2",
			),
		).toEqual([
			{ title: "Order", lead: "Tests run top to bottom.", sketch: ["A -> B"], caption: "Caption here" },
			{ title: "Second", lead: "Lead2", sketch: [], caption: "" },
		]);
	});

	test("returns no card for empty text", () => {
		expect(parseExplanation("")).toEqual([]);
	});
});


const fresh = (): Box => ({ text: "", filled: [], toasts: [], forks: 0 });
const WIDE = "W".repeat(150);
const REPLY = `learn: Tests run in order.\ntag: You should know\nexplain: **Order**\nThey run one after another.\n\`\`\`\nA -> B\n${WIDE}\n\`\`\`\nCaption here`;

const open = async ($: Parameters<typeof offered>[0], on: Parameters<typeof offered>[1], props?: object) => {
	const band = await offered($, on, fresh(), { replies: [REPLY], props: { ...PROPS, ...props } });
	await band.press({ key: "Learn more" });
	for (let i = 0; i < 80 && (await band.find({ key: "Understood" })) === undefined; i++) {
		await pause();
	}
	return band;
};

test("an explained card with a sketch draws the sketch lines in a code block", async ($, on) => {
	// Arrange
	const band = await open($, on);

	// Act
	const drawn = JSON.stringify(await band.drawn());

	// Assert
	expect(drawn).toContain("Code");
	expect(drawn).toContain("A -> B");
	expect(drawn).toContain("Caption here");
});

test("a sketch line wider than the body minus the inset ends in an ellipsis", async ($, on) => {
	// Arrange
	const band = await open($, on, { bodyColumns: 40 });

	// Act
	const drawn = JSON.stringify(await band.drawn());

	// Assert
	expect(drawn).not.toContain(WIDE);
	expect(drawn).toContain("…");
});

test("a survey keeps the sketch card and draws no button", async ($, on) => {
	// Arrange
	const band = await open($, on);
	const survey = await $.ui.mount({ plugin: PLUGIN, surface: "terminal", component: "AbovePrompt", props: { ...PROPS, hasSurvey: true } });

	// Act
	const drawn = JSON.stringify(await survey.drawn());

	// Assert
	expect(await band.find({ key: "Understood" })).toBeDefined();
	expect(drawn).toContain("A -> B");
	expect(await survey.find({ key: "Understood" })).toBeUndefined();
});
