// The budget is checked against the body after the frontmatter, which does not reach the prompt.

import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { DEFAULT_MAIN_BODY_CHARS } from "../../tools/limits.ts";

const MAIN = "plugins/claudetto/agents/main.md";

const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;

const bodyOf = async (path: string): Promise<string> =>
	(await readFile(path, "utf8")).replace(FRONTMATTER, "");

const overBudget = (path: string, size: number, budget: number): string =>
	`${path} is ${size} characters, over its budget of ${budget}`;

describe("the budget of the main agent body", () => {
	test("the body is no larger than the default body it replaces", async () => {
		const size = [...(await bodyOf(MAIN))].length;

		expect(
			size <= DEFAULT_MAIN_BODY_CHARS
				? ""
				: overBudget(MAIN, size, DEFAULT_MAIN_BODY_CHARS),
		).toBe("");
	});

	test("a body over the budget names the piece, its size, and its budget", () => {
		expect(overBudget(MAIN, 5648, DEFAULT_MAIN_BODY_CHARS)).toBe(
			`${MAIN} is 5648 characters, over its budget of 5627`,
		);
	});

	test("the frontmatter is left out, because it does not reach the prompt", async () => {
		const whole = await readFile(MAIN, "utf8");
		const body = await bodyOf(MAIN);

		expect([...body].length).toBeLessThan([...whole].length);
	});
});
