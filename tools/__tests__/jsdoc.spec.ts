// The comment rule, checked on planted sources. Each case plants the shape of a declaration and its
// comment and asserts what the rule returns, because the decision is the behavior and not the wording
// of the message.

import { describe, expect, test } from "bun:test";
import {
	docAbove,
	exportsOf,
	faultsOf,
	wordsOfDoc,
	wordsOfName,
} from "../jsdoc.ts";

/** The faults of a planted source, which is the whole rule applied end to end. */
const faultsIn = (text: string): string[] =>
	exportsOf("planted.ts", text)
		.flatMap(faultsOf)
		.map((fault) => `${fault.line}: ${fault.reason}`);

describe("an export with no block above it", () => {
	test("refuses it and gives its line and its kind", () => {
		const text = `const hidden = 1;
export const shown = 2;
`;

		const faults = faultsIn(text);

		expect(faults).toHaveLength(1);
		expect(faults[0]).toBe(
			"2: exported const shown has no JSDoc block directly above it",
		);
	});

	test("allows it once a block sits directly above", () => {
		const text = `/** The count a round stops at. */
export const shown = 2;
`;

		expect(faultsIn(text)).toEqual([]);
	});

	test("refuses a block separated from the declaration by a blank line", () => {
		const text = `/** The count a round stops at. */

export const shown = 2;
`;

		expect(faultsIn(text)).toHaveLength(1);
	});

	test("refuses a `//` comment, because the rule asks for a block", () => {
		const text = `// The count a round stops at.
export const shown = 2;
`;

		expect(faultsIn(text)).toHaveLength(1);
	});

	test("ignores a re-export, which declares nothing of its own", () => {
		const text = `export { shown } from "./other.ts";
export * from "./more.ts";
`;

		expect(faultsIn(text)).toEqual([]);
	});

	test("reads each declaration kind the tree uses", () => {
		const text = `export const one = 1;
export function two() {}
export class Three {}
export interface Four {}
export type Five = string;
export enum Six {}
`;

		expect(exportsOf("planted.ts", text).map((one) => one.kind)).toEqual([
			"const",
			"function",
			"class",
			"interface",
			"type",
			"enum",
		]);
	});
});

describe("a block that only says the name again", () => {
	test("refuses one whose every word is in the name", () => {
		const text = `/** The window row. */
export interface WindowRow {}
`;

		const faults = faultsIn(text);

		expect(faults).toHaveLength(1);
		expect(faults[0]).toBe(
			"2: the JSDoc above WindowRow uses only words of its own name, so it adds no fact",
		);
	});

	test("allows one that adds a single word the name does not hold", () => {
		const text = `/** The window row a tier writes. */
export interface WindowRow {}
`;

		expect(faultsIn(text)).toEqual([]);
	});

	test("allows an empty block, because the first half already refuses nothing said", () => {
		const text = `/** */
export interface WindowRow {}
`;

		expect(faultsIn(text)).toEqual([]);
	});
});

describe("the words each half compares", () => {
	test("splits an identifier on camel case, `_`, and screaming case", () => {
		expect([...wordsOfName("WindowRow")]).toEqual(["window", "row"]);
		expect([...wordsOfName("HANDOFF_TRIGGER_TOKENS")]).toEqual([
			"handoff",
			"trigger",
			"tokens",
		]);
		expect([...wordsOfName("pctFor")]).toEqual(["pct", "for"]);
	});

	test("drops the words that carry no fact and every backticked span", () => {
		expect(wordsOfDoc("/** The limit of `path`. */")).toEqual(["limit"]);
		expect(wordsOfDoc("/** The rows of a tier. */")).toEqual(["rows", "tier"]);
	});

	test("reads a block written over more than one line", () => {
		const lines = [
			"/**",
			" * The rows a tier writes.",
			" */",
			"export const rowsOf = () => [];",
		];

		expect(docAbove(lines, 3)).toBe(lines.slice(0, 3).join("\n"));
	});

	test("finds no block when the line above opens no block", () => {
		expect(docAbove(["const other = 1;", "export const one = 2;"], 1)).toBe(
			null,
		);
	});
});
