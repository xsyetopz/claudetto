import { describe, expect, test } from "bun:test";
import {
	priceLine,
	priceOf,
} from "../../../claudekit/compaction-price/price.ts";
import type { WindowRow } from "../../../plugins/claudetto/src/blocks/window/window.ts";

/**
 * A row with no `points`, because the field is absent on a login the engine reports no five-hour
 * window for. Each row that carries a five-hour delta says so, so a test that drops the figure drops
 * it by saying nothing rather than by deleting a key.
 */
const row = (over: Partial<WindowRow> = {}): WindowRow => ({
	at: 1000,
	task: "t1",
	source: "main",
	tokens: 20_000,
	window: 300_000,
	usd: 0.01,
	...over,
});

/** A run of four steps where the third carried the compaction, as the recorder would write it. */
const run: readonly WindowRow[] = [
	row({ at: 2000, tokens: 12_000, usd: 0.02, points: 1 }),
	row({ at: 3000, tokens: 18_000, usd: 0.01, points: 1 }),
	row({ at: 4000, tokens: 24_000, usd: 0.01, points: 1 }),
	row({
		at: 5000,
		tokens: 7000,
		usd: 0.05,
		points: 3,
		afterCompaction: true,
	}),
	row({ at: 6000, tokens: 13_000, usd: 0.01, points: 1 }),
];

describe("priceOf", () => {
	test("prices the compaction as the marked step less a plain step", () => {
		const price = priceOf(run, 1500);

		expect(typeof price).not.toBe("string");
		if (typeof price === "string") {
			return;
		}
		expect(price.plainUsd).toBeCloseTo(0.01, 10);
		expect(price.usd).toBeCloseTo(0.04, 10);
		expect(price.points).toBeCloseTo(2, 10);
	});

	test("reports the context on either side of the boundary", () => {
		const price = priceOf(run, 1500);

		if (typeof price === "string") {
			throw new Error(price);
		}
		expect(price.tokensBefore).toBe(24_000);
		expect(price.tokensAfter).toBe(7000);
	});

	test("a step that worked on past its boundary is read as an upper bound", () => {
		// Two of the five runs of 2026-10-30 ended the marked step above the row before it, 23,423 tokens
		// against 22,710 and 23,086 against 22,718, and those two read 0.0785 and 0.0892 against the
		// 0.0237 of the run whose step ended at its boundary. The figure is the compaction plus the rest
		// of the step, so a reader has to be told which of the two it is holding.
		const over = [
			row({ at: 2000, tokens: 12_000, usd: 0.02 }),
			row({ at: 3000, tokens: 22_710, usd: 0.0334 }),
			row({ at: 4000, tokens: 23_423, usd: 0.1119, afterCompaction: true }),
			row({ at: 5000, tokens: 24_000, usd: 0.0334 }),
		];

		const price = priceOf(over, 1500);

		if (typeof price === "string") {
			throw new Error(price);
		}
		expect(price.fell).toBe(false);
		expect(priceLine(price)).toContain("at most");
	});

	test("a step that ended at its boundary is read as the compaction", () => {
		const price = priceOf(run, 1500);

		if (typeof price === "string") {
			throw new Error(price);
		}
		expect(price.fell).toBe(true);
		expect(priceLine(price)).not.toContain("at most");
	});

	test("leaves out rows written before the run", () => {
		const price = priceOf([row({ at: 500, usd: 9 }), ...run], 1500);

		if (typeof price === "string") {
			throw new Error(price);
		}
		expect(price.rows).toBe(run.length);
	});

	test("reports no figure rather than NaN when the window is not measured", () => {
		const bare = run.map(({ points: _, ...rest }) => rest);

		const line = priceLine(priceOf(bare, 1500));

		expect(line).not.toContain("NaN");
		expect(line).toContain("not measured");
	});

	test("gives no price when no row of the run is marked", () => {
		const price = priceOf([run[0] ?? row(), run[1] ?? row()], 1500);

		expect(price).toContain("afterCompaction");
	});

	test("gives no price when the marked row opens the run", () => {
		const price = priceOf([row({ at: 2000, afterCompaction: true })], 1500);

		expect(price).toContain("first of the run");
	});

	test("prices the dollars and leaves the points unread when no row holds points", () => {
		const bare = run.map(({ points: _, ...rest }) => rest);

		const price = priceOf(bare, 1500);

		if (typeof price === "string") {
			throw new Error(price);
		}
		expect(price.usd).toBeCloseTo(0.04, 10);
		expect(price.stepPoints).toBeNaN();
		expect(price.points).toBeNaN();
	});

	test("averages the plain points over the rows that hold one", () => {
		const price = priceOf(
			[
				row({ at: 2000, usd: 0.01 }),
				row({ at: 3000, usd: 0.01, points: 2 }),
				row({ at: 4000, usd: 0.05, points: 3, afterCompaction: true }),
			],
			1500,
		);

		if (typeof price === "string") {
			throw new Error(price);
		}
		expect(price.plainPoints).toBeCloseTo(2, 10);
		expect(price.points).toBeCloseTo(1, 10);
	});

	test("averages only the rows of the marked row's own kind", () => {
		// The recorder writes two rows per `-p` step and their deltas differ by 20 times: the run of
		// 2026-10-30 wrote a row with an empty `task` at 0.0768, 0.0273, 0.0282, 0.0294, 0.0303, and
		// 0.0313, and a row carrying a turn id at 0.0038 to 0.0043 between each pair. A mean over both
		// kinds is not the baseline of either, so it would price the compaction against a figure no step
		// of the run ever cost.
		const mixed: readonly WindowRow[] = [
			row({ at: 2000, task: "", usd: 0.0768 }),
			row({ at: 2100, task: "a", usd: 0.0038 }),
			row({ at: 3000, task: "", usd: 0.0273 }),
			row({ at: 3100, task: "b", usd: 0.004 }),
			row({ at: 4000, task: "", usd: 0.09, afterCompaction: true }),
			row({ at: 4100, task: "c", usd: 0.0041 }),
			row({ at: 5000, task: "", usd: 0.0303 }),
		];

		const price = priceOf(mixed, 1500);

		if (typeof price === "string") {
			throw new Error(price);
		}
		expect(price.plainUsd).toBeCloseTo(0.0288, 10);
		expect(price.usd).toBeCloseTo(0.0612, 10);
	});

	test("the unmarked run names the context it reached", () => {
		// The paid run of 2026-10-30 crossed no threshold, and "no row is marked" alone does not say
		// whether the threshold was too high or the mark is broken. The context reached separates them.
		const price = priceOf(
			[row({ at: 2000, tokens: 22_622 }), row({ at: 3000, tokens: 28_319 })],
			1500,
		);

		expect(price).toContain("28319");
	});

	test("gives no price when every step of the run compacted", () => {
		const price = priceOf(
			[row({ at: 2000 }), row({ at: 3000, afterCompaction: true })],
			1500,
		);

		expect(price).toContain("no baseline");
	});
});
