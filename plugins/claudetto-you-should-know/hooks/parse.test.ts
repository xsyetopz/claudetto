import { describe, expect, test } from "claude-code/testing";

import { parseProposedLine, withKnown } from "./parse";

describe("parseProposedLine", () => {
	test("reads learn, tag and explain labels", () => {
		expect(
			parseProposedLine(
				"learn: Tests run in order.\ntag: You should know\nexplain: **A title**\nA body that says what it is.",
			),
		).toEqual({
			kind: "line",
			line: "Tests run in order.",
			tag: "You should know",
			explanation: "**A title**\nA body that says what it is.",
		});
	});

	test("takes the Heads up tag and ends the line with a period", () => {
		expect(parseProposedLine("learn: Beware the cache\ntag: Heads up")).toEqual({
			kind: "line",
			line: "Beware the cache.",
			tag: "Heads up",
		});
	});

	test("strips wrapping quotes", () => {
		const parsed = parseProposedLine('learn: "Quoted line"');
		expect(parsed.kind === "line" ? parsed.line : "").toBe("Quoted line.");
	});

	test("answers none for a declined learn line", () => {
		expect(parseProposedLine("learn: none")).toEqual({ kind: "none" });
		expect(parseProposedLine("learn: None.")).toEqual({ kind: "none" });
	});

	test("answers unparsable for a reply with no learn label", () => {
		expect(parseProposedLine("nothing")).toEqual({ kind: "unparsable" });
		expect(parseProposedLine("")).toEqual({ kind: "unparsable" });
	});
});

describe("withKnown", () => {
	test("adds a new line and keeps the newest max", () => {
		expect(withKnown(["a", "b"], "c", 2)).toEqual(["b", "c"]);
	});

	test("refuses a line already known in any case", () => {
		expect(withKnown(["Tests run in order."], "tests run in order.", 50)).toBeUndefined();
	});
});
