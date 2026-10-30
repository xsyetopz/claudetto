import { describe, expect, test } from "bun:test";
import {
	docAbove,
	exportsOf,
	faultsOf,
	wordsOfDoc,
	wordsOfName,
} from "../jsdoc.ts";

const faultsIn = (text: string): string[] =>
	exportsOf("planted.ts", text)
		.flatMap(faultsOf)
		.map((fault) => `${fault.line}: ${fault.reason}`);

describe("an export with no block above it", () => {
	test("is allowed, because a name can be the whole doc", () => {
		const text = `const hidden = 1;
export const shown = 2;
`;

		expect(faultsIn(text)).toEqual([]);
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
