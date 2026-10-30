// The rule is checked by what it reports for a line passed in as text, and the last case is the rule
// over the real tree.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
	narrationLines,
	narrations,
	narrationsIn,
} from "../../tools/no-narration.ts";

/** A line comment holding `words`. */
const comment = (words: string): string => `${"/"}/ ${words}`;

/** A test whose name is `name`. */
const named = (name: string): string => `test("${name}", () => {});`;

describe("a comment that names the process", () => {
	test("refuses a task number", () => {
		const text = comment("Task 6.1: written.");

		const faults = narrations("src/a.ts", text);

		expect(faults).toHaveLength(1);
		expect(faults[0]?.line).toBe(1);
	});

	test("refuses a group number", () => {
		const text = comment("Group 4 adds the rules.");

		expect(narrations("src/a.ts", text)).toHaveLength(1);
	});

	test("refuses a session reference", () => {
		const text = comment("read from the schema in this session");

		expect(narrations("src/a.ts", text)).toHaveLength(1);
	});

	test("refuses a user decision", () => {
		const text = comment("what the user chose");

		expect(narrations("src/a.ts", text)).toHaveLength(1);
	});

	test("refuses a decision ID", () => {
		const text = comment("the env flags of D14 and D18");

		expect(narrations("src/a.ts", text)).toHaveLength(1);
	});

	test("refuses a path into a plan under `openspec/`", () => {
		const text = comment("see `openspec/changes/release/design.md`");

		expect(narrations("src/a.ts", text)).toHaveLength(1);
	});

	test("refuses a block comment body", () => {
		const text = " * The counting half of task 6.7.";

		expect(narrations("src/a.ts", text)).toHaveLength(1);
	});
});

describe("a test name that names the process", () => {
	test("refuses a task number in a test name", () => {
		const text = named("the list is the six keys task 9.2 pinned");

		expect(narrations("tests/a.test.ts", text)).toHaveLength(1);
	});

	test("refuses a decision ID in a test name", () => {
		const text = named("D1: the first two rows share no column");

		expect(narrations("tests/a.test.ts", text)).toHaveLength(1);
	});
});

describe("what stays", () => {
	test("allows a string that is data", () => {
		const text = '\t"archive",';

		expect(narrations("src/a.ts", text)).toStrictEqual([]);
	});

	test("allows the `openspec/` folder that setup writes, which is the subject", () => {
		const text = named("an existing `openspec/` is left alone");

		expect(narrations("tests/a.test.ts", text)).toStrictEqual([]);
	});

	test("allows a hex digit run", () => {
		const text = comment("the escape is `0xD1`");

		expect(narrations("src/a.ts", text)).toStrictEqual([]);
	});

	test("allows a run-time word", () => {
		const text = comment("the session that ended holds its decisions");

		expect(narrations("src/a.ts", text)).toStrictEqual([]);
	});

	test("allows the words of the port, which are about the subject and not the process", () => {
		const phrases = [
			"kept as in the archived module",
			"Ported unchanged from the old tree",
			"The new tree never had a lock",
			"from `archive/tools/x.ts`",
		];

		const counts = phrases.map(
			(p) => narrations("src/a.ts", comment(p)).length,
		);

		expect(counts).toStrictEqual([0, 0, 0, 0]);
	});

	test("allows a dated reading in any file, because no path is exempt", () => {
		const text = comment("read on 2026-10-29 with `just capture --arm plugin`");

		const faults = narrations("plugins/claudetto/src/deny.ts", text);

		expect(faults).toStrictEqual([]);
	});
});

describe("the report", () => {
	test("prints the file, the line, and the text", () => {
		const faults = narrations("src/a.ts", `\n${comment("task 2.6")}`);

		expect(narrationLines(faults)).toStrictEqual([
			`src/a.ts:2: names a task or a group by number: ${comment("task 2.6")}`,
		]);
	});
});

describe("the tree", () => {
	test("holds no narration", async () => {
		const faults = await narrationsIn(join(import.meta.dir, "..", ".."));

		expect(narrationLines(faults)).toStrictEqual([]);
	});
});
