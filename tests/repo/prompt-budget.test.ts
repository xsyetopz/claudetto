// The byte budgets of `specs/prompt-footprint/spec.md`. The spec asks that a test fail and name the
// piece, its size, and its budget, and nothing checked any budget until this file.
//
// Only `agents/main.md` has a budget here, because it is the one piece the spec fixes a number for:
// the `5,627` characters of the default body it replaces. Of the rest the spec says "No budget value
// exists yet" and leaves each to be derived from a measurement, so no number is invented for them;
// the sizes of the other pieces are reported by `just capture` instead.
//
// The budget is checked against the body after the frontmatter. The frontmatter does not reach the
// prompt: `just capture --arm plugin --shipped` reads `system[2]` as 5,572 where the body is 5,574
// characters and the whole file is 5,648.

import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { DEFAULT_MAIN_BODY_CHARS } from "../../tools/limits.ts";

const MAIN = "plugins/claudetto/agents/main.md";

const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;

/** The text of an agent file after its frontmatter, which is what replaces the system body. */
const bodyOf = async (path: string): Promise<string> =>
	(await readFile(path, "utf8")).replace(FRONTMATTER, "");

/** The failure the spec asks for: the piece, its size, and its budget. */
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
