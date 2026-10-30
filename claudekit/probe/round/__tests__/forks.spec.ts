import { describe, expect, test } from "bun:test";
import { result } from "../../__tests__/stub.ts";
import { costsOf } from "../forks.ts";

describe("costsOf", () => {
	test("lists the cost of each fork in run order", () => {
		const rs = [
			result({ run: 2, cost: 1.2 }),
			result({ run: 1, cost: 1.1 }),
			result({ run: 3, cost: 1.3 }),
		];

		const [row] = costsOf(rs);

		expect(row?.costs).toEqual([1.1, 1.2, 1.3]);
		expect(row?.mean).toBeCloseTo(1.2, 10);
	});

	test("shows a first fork with a large cache write apart from the mean", () => {
		const rs = [
			result({ run: 1, cost: 3, firstWrite: 90_000 }),
			result({ run: 2, cost: 1, firstWrite: 1000 }),
			result({ run: 3, cost: 1, firstWrite: 1200 }),
		];

		const [row] = costsOf(rs);

		expect(row?.slowFirst).toBe(true);
		expect(row?.meanRest).toBeCloseTo(1, 10);
		expect(row?.mean).toBeCloseTo(5 / 3, 10);
	});

	test("does not flag a first fork that wrote about as much as the rest", () => {
		const rs = [
			result({ run: 1, firstWrite: 1100 }),
			result({ run: 2, firstWrite: 1000 }),
			result({ run: 3, firstWrite: 1200 }),
		];

		const [row] = costsOf(rs);

		expect(row?.slowFirst).toBe(false);
	});

	test("keeps an arm and a size apart and leaves invalid forks out of the mean", () => {
		const rs = [
			result({ arm: "ref", cost: 1 }),
			result({ arm: "alt", cost: 2 }),
			result({ arm: "alt", run: 2, cost: 100, invalid: "exit 1" }),
		];

		const rows = costsOf(rs);

		expect(rows.map((r) => [r.arm, r.mean])).toEqual([
			["ref", 1],
			["alt", 2],
		]);
	});
});
