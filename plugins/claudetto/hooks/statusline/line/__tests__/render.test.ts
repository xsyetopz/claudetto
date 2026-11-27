import { describe, expect, test } from "claude-code/testing";

import { statusOf } from "../main";
import type { LiveState } from "../state";
import { plain, width } from "../width";

const NOW = Date.UTC(2026, 10, 25, 12, 0, 0);
const NOW_S = NOW / 1000;
const PLAIN = { NO_COLOR: "1" } as const;

const LIMITS = {
	five_hour: { used_percentage: 50, resets_at: NOW_S + 9000 },
	seven_day: { used_percentage: 10, resets_at: NOW_S + 3 * 86_400 }
};

const BASE = {
	session_id: "s1",
	session_name: "work",
	model: { id: "claude-opus-4-1", display_name: "Opus 4.1" },
	effort: { level: "high" },
	thinking: { enabled: true },
	context_window: { used_percentage: 40, context_window_size: 200_000 },
	cost: {
		total_cost_usd: 1.5,
		total_duration_ms: 720_000,
		total_api_duration_ms: 240_000,
		total_lines_added: 12,
		total_lines_removed: 3
	},
	prompt_cache: {
		warm: true,
		ttl: "5m",
		expires_at: NOW_S + 240,
		hit_ratio: 0.9
	},
	workspace: { project_dir: "/work/claudetto" },
	pr: { number: 7, review_state: "approved" }
};

const FULL = JSON.stringify({ ...BASE, rate_limits: LIMITS });

const STATE: LiveState = {
	tools: 42,
	tasks: [
		{ id: "1", subject: "Read", status: "completed" },
		{
			id: "2",
			subject: "Test",
			status: "in_progress",
			active: "Writing tests"
		},
		{ id: "3", subject: "Ship", status: "pending" }
	]
};

const WIDE = { ...PLAIN, COLUMNS: "200" } as const;

describe("status line rows", () => {
	test("draws three rows with no labels: who and where, the budgets, and the work that waits", () => {
		// Act
		const rows = statusOf(FULL, WIDE, NOW, {
			state: STATE,
			branch: "main"
		}).split("\n");

		// Assert
		expect(rows).toHaveLength(3);
		expect(rows[0]).toBe(
			"Opus 4.1 high · ⌂ claudetto · ⎇ main · ⇄ #7 approved · work · +12 -3"
		);
		expect(rows[1]).toStartWith(
			"ctx ████░░░░░░ 40% 80k/200k · cache 90% warm 4m/5m · 5h █████░░░░░ 50% on pace ↻"
		);
		expect(rows[1]).toContain(" · 7d █░░░░░░░░░ 10% 47% reserve ↻");
		expect(rows[2]).toBe("⚒ 42 tools 3.5/min · ☑ 1/3 ██░░░ ◐ Writing tests");
	});

	test("never prints a row label or the thinking flag", () => {
		// Act
		const out = statusOf(FULL, WIDE, NOW, { state: STATE, branch: "main" });

		// Assert
		expect(out).not.toMatch(/^(Pace|Session|Project|Account):/mu);
		expect(out).not.toContain("think");
	});

	test("marks fast mode, a non-default output style and the session's agent beside the model", () => {
		// Arrange
		const raw = JSON.stringify({
			model: { display_name: "Opus 5.5" },
			fast_mode: true,
			output_style: { name: "Explanatory" },
			agent: { name: "reviewer" }
		});

		// Act and Assert
		expect(statusOf(raw, PLAIN, NOW)).toBe(
			"Opus 5.5 ↯ fast ◇ Explanatory @reviewer"
		);
	});

	test("leaves out every figure stdin and the hooks do not report", () => {
		// Act
		const out = statusOf('{"model":{"display_name":"Sonnet 5.5"}}', PLAIN, NOW);

		// Assert
		expect(out).toBe("Sonnet 5.5");
	});

	test("shows no limits row when rate_limits is absent, and shows the dollars instead", () => {
		// Act
		const out = statusOf(JSON.stringify(BASE), PLAIN, NOW);

		// Assert
		expect(out).not.toContain("5h");
		expect(out).toContain("$1.50");
	});

	test("hides the dollar estimate on a subscription that reports a window", () => {
		// Act
		const out = statusOf(FULL, PLAIN, NOW);

		// Assert
		expect(out).not.toContain("$");
	});

	test("never invents tokens saved against a vanilla run", () => {
		// Act
		const out = statusOf(FULL, PLAIN, NOW, { state: STATE, branch: "main" });

		// Assert
		expect(out).not.toMatch(/saved|vanilla/iu);
	});

	test("keeps every row within COLUMNS and falls back to countdowns", () => {
		// Act
		const out = statusOf(FULL, { ...PLAIN, COLUMNS: "130" }, NOW, {
			state: STATE,
			branch: "main"
		});

		// Assert
		for (const row of out.split("\n")) {
			expect(width(row)).toBeLessThanOrEqual(130);
		}
		expect(out).toContain("↻2h30m");
	});

	test("a terminal too narrow for the budgets row moves the plan limits to a row of their own", () => {
		// Act
		const rows = statusOf(FULL, { ...PLAIN, COLUMNS: "84" }, NOW, {
			state: STATE,
			branch: "main"
		}).split("\n");

		// Assert
		expect(rows).toHaveLength(4);
		expect(rows[1]).toStartWith("ctx ");
		expect(rows[2]).toStartWith("5h ");
		expect(rows[2]).toContain("↻2h30m");
	});

	test("paints with ANSI codes unless NO_COLOR is set, and the plain text is the same", () => {
		// Arrange
		const seen = { state: STATE, branch: "main" };

		// Act
		const colored = statusOf(FULL, { COLUMNS: "200" }, NOW, seen);
		const bare = statusOf(FULL, WIDE, NOW, seen);

		// Assert
		expect(colored).toContain("\u001B[");
		expect(bare).not.toContain("\u001B[");
		expect(plain(colored)).toBe(bare);
	});

	test("paints the model in the theme's Claude colour: truecolor in dark, a palette slot in dark-ansi", () => {
		// Arrange
		const raw = '{"model":{"display_name":"Opus 5.5"}}';

		// Act
		const dark = statusOf(raw, { COLORTERM: "truecolor" }, NOW, {
			theme: "dark"
		});
		const ansi = statusOf(raw, { COLORTERM: "truecolor" }, NOW, {
			theme: "dark-ansi"
		});

		// Assert
		expect(dark).toContain("\u001B[38;2;215;119;87mOpus 5.5");
		expect(ansi).not.toContain("38;2;");
	});

	test("prints the fallback for stdin that is not a JSON object", () => {
		// Act and Assert
		expect(statusOf("not json", PLAIN, NOW)).toBe("missing status");
	});
});

const limits = (used: number, resetsIn: number) =>
	JSON.stringify({
		rate_limits: {
			five_hour: { used_percentage: used, resets_at: NOW_S + resetsIn }
		}
	});

describe("status line pace", () => {
	test("shows a window used faster than it elapses as a deficit with a run-out", () => {
		// Act: half of the 5h window is gone and 75 percent is used.
		const out = statusOf(limits(75, 9000), PLAIN, NOW);

		// Assert
		expect(out).toMatch(/5h .* 75% .*deficit/u);
	});

	test("shows a window used slower than it elapses as a reserve", () => {
		// Act
		const out = statusOf(limits(30, 9000), PLAIN, NOW);

		// Assert
		expect(out).toMatch(/5h .* 30% .*reserve/u);
	});

	test("shows no pace while the window is under 3 percent elapsed", () => {
		// Act
		const out = statusOf(limits(5, 17_800), PLAIN, NOW);

		// Assert
		expect(out).toContain("5h");
		expect(out).not.toMatch(/deficit|reserve|on pace/u);
	});
});
