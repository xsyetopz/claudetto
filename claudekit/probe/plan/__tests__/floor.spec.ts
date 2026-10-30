import { describe, expect, test } from "bun:test";
import { EVAL_MIN_RUNS_PER_ARM } from "../../../../tools/limits.ts";
import {
	CITABLE_MIN_RUNS,
	DEFAULT_RUNS,
	floorLine,
	floorOf,
	ranLine,
	SMOKE_MIN_RUNS,
	SPARE_RUNS,
} from "../floor.ts";

describe("floorOf", () => {
	test("the citable floor is the constant that the document gate reads", () => {
		expect(CITABLE_MIN_RUNS).toBe(EVAL_MIN_RUNS_PER_ARM);
		expect(SMOKE_MIN_RUNS).toBe(3);
	});

	test("a count below the smoke floor meets neither", () => {
		const floor = floorOf(SMOKE_MIN_RUNS - 1);

		expect(floor).toBe("below");
	});

	test("a count at the smoke floor meets the smoke floor only", () => {
		expect(floorOf(SMOKE_MIN_RUNS)).toBe("smoke");
		expect(floorOf(CITABLE_MIN_RUNS - 1)).toBe("smoke");
	});

	test("a count at the citable floor meets it", () => {
		expect(floorOf(CITABLE_MIN_RUNS)).toBe("citable");
	});

	test("the planned count still meets the floor after an arm loses a fork", () => {
		// The point of the spare: a transient failure takes one fork of an arm and the round is still
		// citable, where a round planned at the floor is paid for in full and may not be cited.
		expect(floorOf(DEFAULT_RUNS - SPARE_RUNS)).toBe("citable");
	});
});

describe("floorLine", () => {
	test("names the count and the floor numbers it was judged against", () => {
		const line = floorLine(SMOKE_MIN_RUNS);

		expect(line).toContain(String(SMOKE_MIN_RUNS));
		expect(line).toContain(String(CITABLE_MIN_RUNS));
	});

	test("differs between a smoke count and a citable count", () => {
		expect(floorLine(SMOKE_MIN_RUNS)).not.toBe(floorLine(CITABLE_MIN_RUNS));
	});

	test("a count exactly at the floor says it carries no spare", () => {
		// The round of 2026-10-30 was planned at the floor and this line did not say so, so nothing
		// warned that one transient failure would waste it.
		expect(floorLine(CITABLE_MIN_RUNS)).toContain("no spare");
	});

	test("the planned count names the spare it carries", () => {
		const line = floorLine(DEFAULT_RUNS);

		expect(line).toContain(String(SPARE_RUNS));
		expect(line).not.toContain("no spare");
	});
});

describe("ranLine", () => {
	test("a count one short of the citable floor does not claim it may be cited", () => {
		const line = ranLine(CITABLE_MIN_RUNS - 1);

		expect(line).toContain(String(CITABLE_MIN_RUNS - 1));
		expect(line).not.toContain("may cite it");
	});

	test("a count at the citable floor says the round may be cited", () => {
		expect(ranLine(CITABLE_MIN_RUNS)).toContain("may cite it");
	});
});
