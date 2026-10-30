import { describe, expect, test } from "bun:test";
import { statusOf } from "../main.ts";
import { width } from "../width.ts";
import { linesOf, NOW_S, raw } from "./support.ts";

const LONG_WORD = /\S{30,}/;
const RUN_OF_SPACES = / {2,}/;
const CLOCK_RESET = /↻\d+(?::\d+)?(?:am|pm)/;
const COUNTDOWN_RESET = /↻1h00m/;

describe("the first two rows share no column, so no gap follows the folder", () => {
	test("`⌂ claudetto` is followed by one item gap, not padding to the model column", () => {
		const [place, session] = linesOf({
			pr: { number: 12, review_state: "approved" },
		});
		expect(place).toBe("⌂ claudetto · ⇄ #12 approved");
		expect(session).toStartWith("❖ Opus 5.5 high");
	});

	test("no line holds a run of two spaces", () => {
		for (const line of linesOf({
			pr: { number: 12 },
			rate_limits: {
				five_hour: { used_percentage: 20, resets_at: NOW_S + 3600 },
			},
		})) {
			expect(line).not.toMatch(RUN_OF_SPACES);
		}
	});
});

describe("an empty place keeps no column, so no gap precedes the cost", () => {
	test("the cost follows the context after one gap when the row above has no third item", () => {
		const [, session] = linesOf({
			pr: undefined,
			rate_limits: undefined,
			cost: { total_cost_usd: 0.5 },
		});
		expect(session).toBe("❖ Opus 5.5 high · ◫ ctx 40% of 200k · $0.50");
	});

	test("a row with only its last item starts at the left edge", () => {
		const [line] = linesOf(
			{ cost: { total_cost_usd: 1 } },
			{ COLUMNS: "120", NO_COLOR: "1" },
			{ cost: { total_cost_usd: 1 } },
		);
		expect(line).toBe("$1.00");
	});
});

describe("no cost on a subscription login", () => {
	test("the cost is hidden while a 5 hour window is reported", () => {
		const text = linesOf({
			cost: { total_cost_usd: 3.21 },
			rate_limits: {
				five_hour: { used_percentage: 10, resets_at: NOW_S + 7200 },
			},
		}).join("\n");
		expect(text).not.toContain("$3.21");
	});

	test("the cost is hidden while a 7 day window is reported", () => {
		const text = linesOf({
			cost: { total_cost_usd: 3.21 },
			rate_limits: {
				seven_day: { used_percentage: 10, resets_at: NOW_S + 7200 },
			},
		}).join("\n");
		expect(text).not.toContain("$3.21");
	});

	test("the cost shows on a login with no subscription window", () => {
		expect(linesOf({ cost: { total_cost_usd: 3.21 } }).join("\n")).toContain(
			"$3.21",
		);
	});

	test("the lines added and removed still show on a subscription login", () => {
		const text = linesOf({
			cost: {
				total_cost_usd: 3.21,
				total_lines_added: 12,
				total_lines_removed: 3,
			},
			rate_limits: {
				five_hour: { used_percentage: 10, resets_at: NOW_S + 7200 },
			},
		}).join("\n");
		expect(text).toContain("+12 -3");
		expect(text).not.toContain("$3.21");
	});
});

describe("thinking and fast mode carry a label", () => {
	test("thinking shows the word `think`, not a bare glyph", () => {
		const [, session] = linesOf({ thinking: { enabled: true } });
		expect(session).toContain("think");
		expect(session).not.toContain("✦");
	});

	test("fast mode shows the word `fast`", () => {
		expect(linesOf({ fast_mode: true })[1]).toContain("fast");
	});

	test("neither shows when off", () => {
		const [, session] = linesOf({
			thinking: { enabled: false },
			fast_mode: false,
		});
		expect(session).not.toContain("think");
		expect(session).not.toContain("fast");
	});
});

describe("nothing is written on a render", () => {
	test("the rate limits in the input leave the module free of any write", async () => {
		const written: string[] = [];
		const write = globalThis.Bun.write;
		Object.assign(globalThis.Bun, {
			write: (...args: unknown[]) => {
				written.push(String(args[0]));
				throw new Error("write");
			},
		});
		try {
			raw({
				rate_limits: {
					five_hour: { used_percentage: 1, resets_at: NOW_S + 60 },
				},
			});
		} finally {
			Object.assign(globalThis.Bun, { write });
		}
		expect(written).toEqual([]);
	});
});

describe("boundary: no line reaches the terminal edge", () => {
	const wide = {
		workspace: {
			current_dir: "/work/a-very-long-project-folder-name-for-testing",
		},
		model: { display_name: "Opus 5.5 with a very long display name" },
		pr: { number: 12_345, review_state: "changes_requested" },
		rate_limits: {
			five_hour: { used_percentage: 63, resets_at: NOW_S + 3 * 3600 },
			seven_day: { used_percentage: 31, resets_at: NOW_S + 3 * 86_400 },
		},
	};

	test("every line is at most `COLUMNS` minus the margin, at every width from 12 to 120", () => {
		for (let columns = 12; columns <= 120; columns += 7) {
			for (const line of linesOf(wide, {
				COLUMNS: String(columns),
				NO_COLOR: "1",
			})) {
				expect(width(line)).toBeLessThanOrEqual(Math.max(1, columns - 4));
			}
		}
	});

	test("a colored line fits too, since escapes take no column", () => {
		for (const line of raw(wide, { COLUMNS: "40" }).split("\n")) {
			expect(width(line)).toBeLessThanOrEqual(36);
		}
	});

	test("the last escape of a cut colored line is a reset, so no color leaks past the dots", () => {
		const escapes = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
		for (const line of raw(wide, { COLUMNS: "30" }).split("\n")) {
			const last = line.match(escapes)?.at(-1);
			expect(last).toBe(`${String.fromCharCode(27)}[0m`);
		}
	});

	test("a missing or bad `COLUMNS` falls back to a width that fits 80 columns", () => {
		for (const COLUMNS of [undefined, "", "abc", "0", "-5"]) {
			for (const line of linesOf(wide, { COLUMNS, NO_COLOR: "1" })) {
				expect(width(line)).toBeLessThanOrEqual(76);
			}
		}
	});

	test("a wide display name of CJK characters cuts at a character boundary", () => {
		const lines = linesOf(
			{ model: { display_name: "日本語のモデル名前日本語のモデル名前" } },
			{ COLUMNS: "21", NO_COLOR: "1" },
		);
		for (const line of lines) {
			expect(width(line)).toBeLessThanOrEqual(17);
		}
	});

	test("a name from outside with an escape or a newline cannot add a line or a sequence", () => {
		const out = raw(
			{ model: { display_name: "Opus\r\u001b[2J\u001b]8;;x\u0007hack" } },
			{ NO_COLOR: "1", COLUMNS: "120" },
		);
		expect(out).not.toContain("\u001b");
		expect(out.split("\n").length).toBeLessThanOrEqual(4);
		expect(out).not.toMatch(LONG_WORD);
	});

	test("the full times give way to countdowns before the line is cut", () => {
		const fields = {
			rate_limits: {
				five_hour: { used_percentage: 50, resets_at: NOW_S + 3600 },
			},
		};
		const roomy = linesOf(fields, { COLUMNS: "120", NO_COLOR: "1" }).join("\n");
		const tight = linesOf(fields, { COLUMNS: "24", NO_COLOR: "1" }).join("\n");
		expect(roomy).toMatch(CLOCK_RESET);
		expect(tight).toMatch(COUNTDOWN_RESET);
	});
});

describe("bad input prints a short line", () => {
	test("not JSON, empty, and non-object JSON each give one short line", () => {
		for (const text of ["", "not json", "[]", "null", "42", '"x"', "{}"]) {
			const direct = statusOf(text, { COLUMNS: "120", NO_COLOR: "1" }, 0);
			expect(direct.split("\n")).toHaveLength(1);
			expect(width(direct)).toBeLessThan(40);
		}
	});

	test("a missing field leaves out only its part", () => {
		const [place, session] = linesOf({}, undefined, {
			workspace: { current_dir: "/a/b" },
			model: { display_name: "Opus 5.5" },
		});
		expect(place).toBe("⌂ b");
		expect(session).toBe("❖ Opus 5.5");
	});

	test("a field of a wrong type is left out and the rest prints", () => {
		const lines = linesOf({
			context_window: { used_percentage: "x" },
			model: 5,
		});
		expect(lines.join("\n")).not.toContain("ctx");
		expect(lines[0]).toBe("⌂ claudetto");
	});
});
