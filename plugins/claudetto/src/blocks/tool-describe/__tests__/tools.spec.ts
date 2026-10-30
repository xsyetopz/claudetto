import { describe, expect, test } from "bun:test";
import { TOOL_TEXTS } from "../texts.ts";
import {
	alwaysLoadedChars,
	deadTexts,
	describedTools,
	placementOf,
	STOCK,
	shorterText,
	stockOf,
	UPFRONT,
} from "../tools.ts";

describe("every shipped text beats its stock text", () => {
	test("no shipped text is dead", () => {
		expect(deadTexts()).toEqual([]);
	});

	for (const name of describedTools()) {
		test(`${name} is shorter than the smaller stock reading`, () => {
			const stock = stockOf(name);
			const ours = TOOL_TEXTS[name]?.length ?? 0;

			expect(stock).toBeDefined();
			expect(ours).toBeGreaterThan(0);
			expect(ours).toBeLessThan(stock ?? 0);
		});
	}

	test("the check names a text that does not beat its stock text", () => {
		const stock = stockOf("Read") ?? 0;

		expect(deadTexts({ Read: "x".repeat(stock) })).toEqual(["Read"]);
		expect(deadTexts({ Read: "x".repeat(stock - 1) })).toEqual([]);
	});

	test("the check names a text for a tool no reading covers", () => {
		expect(deadTexts({ NoSuchTool: "x" })).toEqual(["NoSuchTool"]);
	});

	test("the smaller of the two readings is the one to beat", () => {
		expect(stockOf("Bash")).toBe(1267);
		expect(stockOf("Read")).toBe(790);
		expect(stockOf("DesignSync")).toBe(4005);
		expect(stockOf("NoSuchTool")).toBeUndefined();
	});
});

describe("the text the hook hands back", () => {
	test("ours replaces a longer description", () => {
		const text = shorterText("Read", "x".repeat(2000));

		expect(text).toBe(TOOL_TEXTS["Read"]);
	});

	test("a shorter description of the session keeps the harness's own text", () => {
		expect(shorterText("Read", "x".repeat(10))).toBeUndefined();
	});

	test("a description of the same length keeps the harness's own text", () => {
		const ours = TOOL_TEXTS["Read"] ?? "";

		expect(shorterText("Read", "y".repeat(ours.length))).toBeUndefined();
	});

	test("a tool claudetto writes no text for is left alone", () => {
		expect(shorterText("NotebookEdit", "x".repeat(2000))).toBeUndefined();
	});
});

describe("the always-loaded total", () => {
	test("counts no text of a tool the harness defers", () => {
		const texts = { Monitor: "x".repeat(10), Read: "y".repeat(5) };

		expect(placementOf("Monitor")).toBe("deferred");
		expect(placementOf("Read")).toBe(UPFRONT);
		expect(alwaysLoadedChars(texts)).toBe(5);
	});

	test("counts no text of a tool no reading covers", () => {
		expect(alwaysLoadedChars({ NoSuchTool: "x".repeat(99) })).toBe(0);
	});

	test("the shipped total sums the upfront texts and leaves the deferred one out", () => {
		let upfront = 0;
		let all = 0;
		for (const name of describedTools()) {
			const chars = TOOL_TEXTS[name]?.length ?? 0;
			all += chars;
			if (placementOf(name) === UPFRONT) {
				upfront += chars;
			}
		}

		expect(alwaysLoadedChars()).toBe(upfront);
		// At least one shipped text is for a tool the harness defers, so the two totals differ.
		expect(upfront).toBeLessThan(all);
	});
});

describe("the stock readings", () => {
	test("each described tool has a reading", () => {
		const read = STOCK.map((entry) => entry.name);

		for (const name of describedTools()) {
			expect(read).toContain(name);
		}
	});

	test("no reading is zero or negative", () => {
		for (const entry of STOCK) {
			expect(entry.capture).toBeGreaterThan(0);
			expect(entry.docs ?? 1).toBeGreaterThan(0);
		}
	});
});
