import { describe, expect, test } from "claude-code/testing";

import { proseMarkdown } from "../markdown";

describe("proseMarkdown", () => {
	test("escapes specials, turns markers into dashes and ends with a blank line", () => {
		const out = proseMarkdown("* one\n* two\nplain *x*", "A_B");
		expect(out.startsWith("**A\\_B**")).toBe(true);
		expect(out).toContain("- one");
		expect(out).toContain("\\*x\\*");
		expect(out.endsWith("\n\n")).toBe(true);
	});

	test("gives empty output for empty input", () => {
		expect(proseMarkdown("", "")).toBe("");
	});
});

describe("proseMarkdown lists", () => {
	test("a star list is drawn with dashes", () => {
		// Arrange
		const text = "* one\n* two";

		// Act
		const out = proseMarkdown(text, "T");

		// Assert
		expect(out).toBe("**T**\n- one\n- two\n\n");
	});

	test("an ordered list keeps its numbers while it counts up from its ordinal", () => {
		// Arrange
		const text = "1. a\n2. b";

		// Act
		const out = proseMarkdown(text, "");

		// Assert
		expect(out).toBe("1. a\n2. b\n\n");
	});

	test("an ordered list that skips a number loses the numbers after the skip", () => {
		// Arrange
		const text = "1. a\n3. b";

		// Act
		const out = proseMarkdown(text, "");

		// Assert
		expect(out).toContain("3\\. b");
		expect(out).not.toContain("\n3. b");
	});

	test("plain lines are joined with a hard break", () => {
		// Arrange
		const text = "first\nsecond";

		// Act
		const out = proseMarkdown(text, "");

		// Assert
		expect(out).toBe("first  \nsecond\n\n");
	});
});
