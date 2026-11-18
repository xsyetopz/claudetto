import { describe, expect, test } from "claude-code/testing";

import { parseExplanation } from "./cards";

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
