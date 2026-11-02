import { describe, expect, test } from "bun:test";
import { TOOL_TEXTS } from "../../plugins/claudetto/src/blocks/tool-describe/texts.ts";
import {
	describeAnswer,
	stockOf,
} from "../../plugins/claudetto/src/blocks/tool-describe/tools.ts";

const ours = (tool: string): string => TOOL_TEXTS[tool] ?? "";

describe("`describeAnswer` flips on the length of the harness text", () => {
	test("a harness text as long as ours is kept, since ours is not shorter", () => {
		const same = "x".repeat(ours("Read").length);

		expect(describeAnswer("Read", { description: same }).description).toBe(
			same,
		);
	});

	test("a harness text one character longer than ours is replaced by ours", () => {
		const longer = "x".repeat(ours("Read").length + 1);

		expect(describeAnswer("Read", { description: longer }).description).toBe(
			ours("Read"),
		);
	});

	test("a harness text shorter than ours is kept", () => {
		const shorter = "x".repeat(ours("Read").length - 1);

		expect(describeAnswer("Read", { description: shorter }).description).toBe(
			shorter,
		);
	});

	test("a stock text of the length the table holds is replaced, so the table length is the cost it saves", () => {
		const stock = "x".repeat(stockOf("Read") ?? 0);

		expect(describeAnswer("Read", { description: stock }).description).toBe(
			ours("Read"),
		);
	});

	test("a stock text one character shorter than ours stays as the harness sent it", () => {
		for (const tool of ["Read", "Edit", "Write"]) {
			const edge = "y".repeat(ours(tool).length - 1);

			expect(describeAnswer(tool, { description: edge }).description).toBe(
				edge,
			);
		}
	});
});
