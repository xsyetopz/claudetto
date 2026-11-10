import { describe, expect, test } from "bun:test";

import { width } from "../../plugins/claudetto/statusline/width.ts";
import { linesOf, NOW_S } from "./support.ts";

const narrow = (columns: number) => ({
	COLUMNS: String(columns),
	NO_COLOR: "1",
});

const LIMITS = {
	rate_limits: {
		five_hour: { used_percentage: 20, resets_at: NOW_S + 3600 },
		seven_day: { used_percentage: 10, resets_at: NOW_S + 86_400 },
	},
};

describe("items flow into rows", () => {
	test("items that fit one row share it, in the order place, session", () => {
		expect(linesOf()).toEqual([
			"⌂ claudetto · ❖ Opus 5.5 high · ◫ ctx 40% of 200k · $0.00",
		]);
	});

	test("a new row starts only when the next item does not fit", () => {
		expect(linesOf({}, narrow(40))).toEqual([
			"⌂ claudetto · ❖ Opus 5.5 high",
			"◫ ctx 40% of 200k · $0.00",
		]);
	});

	test("at most 4 rows, each cut at the width", () => {
		const lines = linesOf(
			{ ...LIMITS, pr: { number: 12, review_state: "approved" } },
			narrow(24),
		);
		expect(lines.length).toBe(4);
		for (const line of lines) {
			expect(width(line)).toBeLessThanOrEqual(20);
		}
	});

	test("an item wider than a row takes its own row, cut at the width", () => {
		const lines = linesOf(
			{ workspace: { current_dir: `/work/${"x".repeat(60)}` } },
			narrow(40),
		);
		expect(lines[0]).toStartWith("⌂ xxx");
		expect(width(lines[0] ?? "")).toBe(36);
		expect(lines[1]).toStartWith("❖ Opus 5.5 high");
	});
});
