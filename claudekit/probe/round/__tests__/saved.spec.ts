import { describe, expect, test } from "bun:test";
import { result } from "../../__tests__/stub.ts";
import { resultsOf } from "../saved.ts";

const line = (over = {}): string => `${JSON.stringify(result(over))}\n`;

describe("resultsOf", () => {
	test("reads each saved fork in the order it was saved", () => {
		const text = `${line({ run: 1 })}${line({ arm: "alt", run: 2 })}`;

		const rs = resultsOf(text);

		expect(rs.map((r) => [r.arm, r.run])).toEqual([
			["ref", 1],
			["alt", 2],
		]);
	});

	test("drops a last line that the writer was killed in the middle of", () => {
		const whole = line({ run: 1 });
		const text = `${whole}${JSON.stringify(result({ run: 2 })).slice(0, 40)}`;

		const rs = resultsOf(text);

		expect(rs).toHaveLength(1);
	});

	test("drops a line that parses but lacks a measure a report reads", () => {
		const { peak, ...rest } = result();

		const rs = resultsOf(`${JSON.stringify(rest)}\n`);

		expect(peak).toBeGreaterThan(0);
		expect(rs).toEqual([]);
	});

	test("keeps a fork that did not compact, whose after-compaction measures are null", () => {
		// `JSON.stringify` writes a NaN as `null`, and dropping such a fork would move the mean of its arm:
		// the smoke round of 2026-10-29 reported `ref` at 0.59 over 3 forks live and 0.84 over 1 on replay.
		const still = result({
			compactions: 0,
			firstWrite: Number.NaN,
			firstPre: Number.NaN,
			firstPost: Number.NaN,
			shares: [],
		});

		const rs = resultsOf(`${JSON.stringify(still)}\n`);

		expect(rs).toHaveLength(1);
		expect(rs[0]?.firstWrite).toBeNaN();
		expect(rs[0]?.cost).toBe(still.cost);
	});

	test("reads a fork of a round saved before the compaction point was measured", () => {
		const { firstPre, firstPost, ...old } = result();

		const rs = resultsOf(`${JSON.stringify(old)}\n`);

		expect(rs).toHaveLength(1);
		expect(rs[0]?.firstPre).toBeNaN();
	});

	test("keeps an invalid fork, because a report names it", () => {
		const rs = resultsOf(line({ invalid: "threw: step 1 failed" }));

		expect(rs).toHaveLength(1);
	});

	test("reads nothing out of an empty file", () => {
		expect(resultsOf("")).toEqual([]);
	});
});
