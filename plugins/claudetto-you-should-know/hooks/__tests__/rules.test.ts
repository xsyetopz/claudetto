import { describe, expect, test } from "claude-code/testing";

import { parseExplanation } from "../request/cards";
import { proseMarkdown } from "../text/markdown";
import { parseProposedLine } from "../request/parse";
import { type Row, withRow } from "../session/rows";

const DAY = 86_400_000;

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

describe("withRow keeps 32 rows", () => {
	const closed = (id: string): Row => ({ id });
	const open = (id: string, shownAt: number): Row => ({ id, view: { kind: "offer", line: "x", shownAt } });

	test("the oldest closed row goes first when there are 33", () => {
		// Arrange
		const now = 10 * DAY;
		const others = [...Array.from({ length: 30 }, (_, i) => open(`o${i}`, now - 1000)), closed("c1"), closed("c0")];

		// Act
		const rows = withRow(others, { id: "new" }, now);

		// Assert
		expect(rows).toHaveLength(32);
		expect(rows.some((r) => r.id === "c0")).toBe(false);
		expect(rows.some((r) => r.id === "c1")).toBe(true);
	});

	test("an open note shown over three days ago goes before one shown within three days", () => {
		// Arrange
		const now = 10 * DAY;
		const others = [...Array.from({ length: 30 }, (_, i) => open(`o${i}`, now - 1000)), open("recent", now - DAY), open("stale", now - 3 * DAY - 1)];

		// Act
		const rows = withRow(others, { id: "new" }, now);

		// Assert
		expect(rows.some((r) => r.id === "stale")).toBe(false);
		expect(rows.some((r) => r.id === "recent")).toBe(true);
	});
});

describe("parseProposedLine", () => {
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
		expect(out).toMatchObject({ kind: "line", explanation: "**A**\nlead\nmore" });
	});

	test("an escape sequence is removed and runs of blanks become one", () => {
		// Arrange
		const reply = "learn: a\u001b[31m   b\u001b[0m \t c";

		// Act
		const out = parseProposedLine(reply);

		// Assert
		expect(out).toMatchObject({ kind: "line", line: "a b c." });
	});
});

describe("parseExplanation", () => {
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
		const text = "**A**\n```\nx\u001b[31my\n```\n```\nb\n```";

		// Act
		const cards = parseExplanation(text);

		// Assert
		expect(cards.map((c) => c.sketch)).toEqual([["xy"], ["b"]]);
	});
});
