// The cap is checked against the body after the frontmatter, which does not reach the prompt, and as
// the request carries it: trimmed, and with the escapes of a JSON string, one per line break.

import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { MAIN_BODY_CAP, OUTPUT_STYLE_CAP } from "../../../tools/limits.ts";

const MAIN = "plugins/claudetto/agents/main.md";

const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;

const bodyOf = async (path: string): Promise<string> =>
	(await readFile(path, "utf8")).replace(FRONTMATTER, "");

/** The harness trims the body, and the request carries it as a JSON string. */
const carriedLength = (body: string): number =>
	JSON.stringify(body.trim()).length - 2;

const overCap = (path: string, size: number, cap: number): string =>
	`${path} is ${size} characters, over its cap of ${cap}`;

describe("the cap of the main agent body", () => {
	test("the body is no larger than its cap", async () => {
		const size = carriedLength(await bodyOf(MAIN));

		expect(
			size <= MAIN_BODY_CAP ? "" : overCap(MAIN, size, MAIN_BODY_CAP),
		).toBe("");
	});

	test("a line break counts twice, as the request carries it", () => {
		const body = `
a
b
`;

		expect(carriedLength(body)).toBe(4);
	});

	test("the frontmatter is left out, because it does not reach the prompt", async () => {
		const whole = await readFile(MAIN, "utf8");
		const body = await bodyOf(MAIN);

		expect([...body].length).toBeLessThan([...whole].length);
	});
});

const STYLE = "plugins/claudetto/output-styles/Concise.md";

describe("the cap of the output style", () => {
	test("the trimmed body is no larger than its cap", async () => {
		const size = (await bodyOf(STYLE)).trim().length;

		expect(
			size <= OUTPUT_STYLE_CAP ? "" : overCap(STYLE, size, OUTPUT_STYLE_CAP),
		).toBe("");
	});
});
