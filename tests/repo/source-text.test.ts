// The lexer behind the two checks of the rebuilt observer. A check that reads a comment as code, or
// a quoted URL as a comment, would pass a plugin it should fail or fail one it should pass, so the
// split is held on its own.

import { describe, expect, test } from "bun:test";
import {
	jsonStrings,
	lex,
	shippedManifests,
	shippedSources,
} from "../../tools/source-text.ts";

describe("the split of a source file", () => {
	test("blanks a line comment and keeps the code before it", () => {
		const lexed = lex(`const a = 1; // telemetry here
const b = 2;`);

		expect(lexed.code).toBe(`const a = 1; ${" ".repeat(17)}\nconst b = 2;`);
	});

	test("blanks a block comment across lines and keeps the line count", () => {
		const lexed = lex(`a /* x
y */ b`);

		expect(lexed.code).toBe(`a ${" ".repeat(4)}\n${" ".repeat(4)} b`);
	});

	test("keeps a string that holds two slashes, which is not a comment", () => {
		const lexed = lex('const u = "https://example.test"; const v = 1;');

		expect(lexed.code).toContain("https://example.test");
		expect(lexed.strings).toStrictEqual([
			{ line: 1, text: "https://example.test" },
		]);
	});

	test("reads an escaped quote as part of the string", () => {
		const lexed = lex(String.raw`const s = "a \" b"; const t = 'c';`);

		expect(lexed.strings.map((s) => s.text)).toStrictEqual([
			String.raw`a \" b`,
			"c",
		]);
	});

	test("reads a quote mark inside a comment as nothing", () => {
		const lexed = lex(`// the original's
const a = 'Claude';`);

		expect(lexed.strings).toStrictEqual([{ line: 2, text: "Claude" }]);
	});

	test("numbers a string by the line it opens on", () => {
		const lexed = lex(`a;
b;
const s = \`x\`;`);

		expect(lexed.strings).toStrictEqual([{ line: 3, text: "x" }]);
	});
});

describe("the strings of a manifest", () => {
	test("are every string value at any depth", () => {
		const value = { a: "one", b: ["two", { c: "three" }], d: 4, e: null };

		expect(jsonStrings(value)).toStrictEqual(["one", "two", "three"]);
	});
});

describe("the files the checks read", () => {
	test("are the sources under src/ of the plugin, which a check must find or pass for nothing", async () => {
		const files = await shippedSources(`${import.meta.dir}/../..`);

		expect(files.map((f) => f.path)).toContain(
			"plugins/claudetto-you-should-know/src/register.ts",
		);
		expect(files.every((f) => f.text.length > 0)).toBe(true);
	});

	test("hold the manifest and the hooks file with their strings", async () => {
		const files = await shippedManifests(`${import.meta.dir}/../..`);

		expect(files.map((f) => f.path)).toStrictEqual([
			"plugins/claudetto-you-should-know/.claude-plugin/plugin.json",
			"plugins/claudetto-you-should-know/hooks/hooks.json",
		]);
		expect(files[0]?.text).toContain("claudetto-you-should-know");
	});
});
