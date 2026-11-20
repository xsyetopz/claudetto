import { describe, expect, test } from "claude-code/testing";

import { parseProposedLine, withKnown } from "../parse";

describe("parseProposedLine", () => {
	test("reads learn, tag and explain labels", () => {
		expect(
			parseProposedLine(
				"learn: Tests run in order.\ntag: You should know\nexplain: **A title**\nA body that says what it is."
			)
		).toEqual({
			kind: "line",
			line: "Tests run in order.",
			tag: "You should know",
			explanation: "**A title**\nA body that says what it is."
		});
	});

	test("takes the Heads up tag and ends the line with a period", () => {
		expect(parseProposedLine("learn: Beware the cache\ntag: Heads up")).toEqual(
			{
				kind: "line",
				line: "Beware the cache.",
				tag: "Heads up"
			}
		);
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

	test("reads a bullet, a quote-wrapped line and a dash tag", () => {
		const out = parseProposedLine(
			'- learn: "Cache is shared"\n> tag - Heads up'
		);
		expect(out).toEqual(
			expect.objectContaining({ kind: "line", tag: "Heads up" })
		);
	});

	test("reads a continuation line of learn", () => {
		const out = parseProposedLine(
			"learn: First part\nsecond part.\ntag: You should know"
		);
		expect(out).toEqual(
			expect.objectContaining({ kind: "line", line: "First part second part." })
		);
	});

	test("treats none, with punctuation, as declined", () => {
		for (const r of ["none", "None.", "learn: none"]) {
			expect(parseProposedLine(r).kind).not.toBe("line");
		}
	});
	test("a bulleted quoted learn line yields the line with a closing period", () => {
		// Arrange
		const reply = '- learn: "x"';

		// Act
		const out = parseProposedLine(reply);

		// Assert
		expect(out).toMatchObject({ kind: "line", line: "x." });
	});

	test("none followed by a full stop is declined", () => {
		// Arrange
		const reply = "learn: none.";

		// Act
		const out = parseProposedLine(reply);

		// Assert
		expect(out.kind).toBe("none");
	});

	test("a first learn line over 240 characters falls through to the next learn line", () => {
		// Arrange
		const reply = `learn: ${"a".repeat(241)}\nlearn: short one`;

		// Act
		const out = parseProposedLine(reply);

		// Assert
		expect(out).toMatchObject({ kind: "line", line: "short one." });
	});

	test("a quoted tag label in the dash form reads as Heads up", () => {
		// Arrange
		const reply = "learn: x\n> **tag** - Heads up";

		// Act
		const out = parseProposedLine(reply);

		// Assert
		expect(out).toMatchObject({ kind: "line", tag: "Heads up" });
	});

	test("explain takes its own line and every line after it", () => {
		// Arrange
		const reply = "learn: x\nexplain: **A**\nlead\nmore";

		// Act
		const out = parseProposedLine(reply);

		// Assert
		expect(out).toMatchObject({
			kind: "line",
			explanation: "**A**\nlead\nmore"
		});
	});

	test("an escape sequence is removed and runs of blanks become one", () => {
		// Arrange
		const reply = "learn: a\u001B[31m   b\u001B[0m \t c";

		// Act
		const out = parseProposedLine(reply);

		// Assert
		expect(out).toMatchObject({ kind: "line", line: "a b c." });
	});
});

describe("withKnown", () => {
	test("adds a new line and keeps the newest max", () => {
		expect(withKnown(["a", "b"], "c", 2)).toEqual(["b", "c"]);
	});

	test("refuses a line already known in any case", () => {
		expect(
			withKnown(["Tests run in order."], "tests run in order.", 50)
		).toBeUndefined();
	});

	test("drops a repeat in any case, and keeps the newest 50", () => {
		expect(
			withKnown(["Tests run in order."], "tests RUN in order.", 50)
		).toBeUndefined();
		const full = Array.from({ length: 50 }, (_, i) => `l${i}`);
		const next = withKnown(full, "new", 50);
		expect(next?.length).toBe(50);
		expect(next?.at(-1)).toBe("new");
		expect(next?.includes("l0")).toBe(false);
	});
});
