import { describe, expect, test } from "bun:test";
import {
	AUTO,
	BUILT_IN,
	CODE,
	COMPACTION_OPTION,
	COMPACTION_VALUES,
	pathOf,
} from "../compaction.ts";

describe("the path that answers a compaction", () => {
	test("an unset option gives the built-in path", () => {
		expect(pathOf(undefined)).toBe(BUILT_IN);
		expect(pathOf({})).toBe(BUILT_IN);
	});

	test("auto gives the built-in path, so no unproven path is picked for the user", () => {
		expect(pathOf({ [COMPACTION_OPTION]: AUTO })).toBe(BUILT_IN);
	});

	test("the built-in value gives the built-in path", () => {
		expect(pathOf({ [COMPACTION_OPTION]: BUILT_IN })).toBe(BUILT_IN);
	});

	test("only the code value set by hand gives the code path", () => {
		expect(pathOf({ [COMPACTION_OPTION]: CODE })).toBe(CODE);
	});

	test("a value the declaration does not offer gives the built-in path", () => {
		// Every value a harness `PluginOptions` can carry: a string, a number, a boolean, or a list of strings.
		for (const value of ["handover", "", "CODE", 0, true, ["code"]]) {
			expect(pathOf({ [COMPACTION_OPTION]: value })).toBe(BUILT_IN);
		}
	});

	test("the code path is reachable from one value only", () => {
		const toCode = COMPACTION_VALUES.filter(
			(value) => pathOf({ [COMPACTION_OPTION]: value }) === CODE,
		);

		expect(toCode).toEqual([CODE]);
	});
});
