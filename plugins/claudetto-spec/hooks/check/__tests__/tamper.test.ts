import { describe, expect, test } from "claude-code/testing";

import { checkSpecs } from "../spec";
import { countAssertions, countMarkers } from "../tamper";

const FILE = "tests/auth.test.ts";
const BASE = `test("AUTH-1 logs in", () => {
	expect(a).toBe(1);
	expect(b).toBe(2);
});
`;

const run = (now: string | undefined, index = BASE, file = FILE, extra = {}) =>
	checkSpecs({
		listing: `${file}\nsrc/a.ts\n`,
		diff: `${file}\n`,
		deleted: now === undefined ? `${file}\n` : "",
		texts: new Map(now === undefined ? [] : [[file, now]]),
		index: new Map([[file, index]]),
		...extra
	}).tampered;

describe("SPEC-012 tamper check on staged test files", () => {
	test("a staged test deleted from the work tree is reported as deleted", () => {
		// Arrange
		const now = undefined;

		// Act
		const tampered = run(now);

		// Assert
		expect(tampered).toEqual([
			{ file: FILE, deleted: true, addedMarkers: [], assertions: null }
		]);
	});

	test("each newly added skip or only marker is named", () => {
		// Arrange
		const now = `${BASE}test.skip("x", () => {});\nit.only("y", () => {});\nxit("z");\nxdescribe("w");\ntest.todo("t");\nit.todo("u");\n`;

		// Act
		const tampered = run(now);

		// Assert
		expect(tampered[0]?.addedMarkers).toEqual([
			".skip(",
			".only(",
			"xit(",
			"xdescribe(",
			"test.todo(",
			"it.todo("
		]);
	});

	test("a marker the index already had is not new", () => {
		// Arrange
		const index = `${BASE}test.skip("old", () => {});\n`;

		// Act
		const tampered = run(`${index}// edit\n`, index);

		// Assert
		expect(tampered).toEqual([]);
	});

	test("a dropped assertion count is reported with both counts", () => {
		// Arrange
		const now = BASE.replace("\texpect(b).toBe(2);\n", "");

		// Act
		const tampered = run(now);

		// Assert
		expect(tampered).toEqual([
			{
				file: FILE,
				deleted: false,
				addedMarkers: [],
				assertions: { before: 2, after: 1 }
			}
		]);
	});

	test("an edit that keeps markers and assertions lists nothing", () => {
		// Arrange
		const now = BASE.replace("toBe(2)", "toBe(3)");

		// Act
		const tampered = run(now);

		// Assert
		expect(tampered).toEqual([]);
	});

	test("a non-ASCII path is reported under its own name", () => {
		// Arrange
		const file = "tests/café_日本.test.ts";

		// Act
		const tampered = run(undefined, BASE, file);

		// Assert
		expect(tampered.map((t) => t.file)).toEqual([file]);
	});

	test("a changed non-test file and a file without an index text are skipped", () => {
		// Arrange
		const input = {
			listing: "src/a.ts\ntests/new.test.ts\n",
			diff: "src/a.ts\ntests/new.test.ts\n",
			texts: new Map([["tests/new.test.ts", "x"]]),
			index: new Map([["src/a.ts", "expect(1)"]])
		};

		// Act
		const { tampered } = checkSpecs(input);

		// Assert
		expect(tampered).toEqual([]);
	});
});

describe("SPEC-012 counting", () => {
	test("assertion calls of JS and Python styles count, a word that merely contains assert does not", () => {
		// Arrange
		const text =
			"expect(a)\nassert x == 1\nassert(y)\nassert.equal(a, b)\nself.assertEqual(a, b)\nasserts nothing\nreassert(1)\nxexpect(2)";

		// Act
		const count = countAssertions(text);

		// Assert
		expect(count).toBe(5);
	});

	test("xit( does not match inside exit(", () => {
		// Arrange
		const text = "exit(1); xit('a'); fixit('b')";

		// Act
		const counts = countMarkers(text).get("xit(");

		// Assert
		expect(counts).toBe(1);
	});
});
