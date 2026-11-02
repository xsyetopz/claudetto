import { describe, expect, test } from "bun:test";
import { estimateTokens, splitContext, summarize } from "../split.ts";

const RULES = `<system-reminder>
rules
</system-reminder>question`;
const SECTIONS = `# One
text
## Two
more`;
const CUT = SECTIONS.indexOf("## ");

const body = {
	system: [
		{ type: "text", text: "a".repeat(40) },
		{ type: "text", text: "b".repeat(8) },
	],
	messages: [
		{
			role: "user",
			content: [
				{
					type: "text",
					text: `intro${RULES}`,
				},
				{ type: "image", source: {} },
			],
		},
		{
			role: "user",
			content:
				"<system-reminder>x</system-reminder><system-reminder>yy</system-reminder>",
		},
		{ role: "system", content: SECTIONS },
	],
};

describe("splitContext", () => {
	test("lists each `system` block with its length", () => {
		const parts = splitContext(body).filter((p) => p.source === "system");

		expect(parts.map((p) => p.chars)).toEqual([40, 8]);
	});

	test("splits message text at each `<system-reminder>` and counts only the reminders", () => {
		const parts = splitContext(body).filter((p) => p.source === "user");

		expect(parts.map((p) => p.counted)).toEqual([false, true, true, true]);
	});

	test("splits a `system`-role message at its headings and counts every section", () => {
		const parts = splitContext(body).filter((p) => p.source === "system-role");

		expect(parts.map((p) => p.text)).toEqual([
			SECTIONS.slice(0, CUT),
			SECTIONS.slice(CUT),
		]);
		expect(parts.every((p) => p.counted)).toBe(true);
	});

	test("reads a bare string `system` as one block", () => {
		expect(splitContext({ system: "abc", messages: [] })[0]?.chars).toBe(3);
	});
});

describe("summarize", () => {
	test("sums the `system` blocks and the counted message parts", () => {
		const sums = summarize(splitContext(body));

		expect(sums.system).toBe(48);
		expect(sums.reminders).toBe(
			RULES.length +
				"<system-reminder>x</system-reminder>".length +
				"<system-reminder>yy</system-reminder>".length +
				SECTIONS.length,
		);
	});
});

describe("estimateTokens", () => {
	test("prints chars and thousands of tokens at four chars a token", () => {
		expect(estimateTokens(4000)).toBe("4000 chars, ~1.00k tokens");
	});
});
