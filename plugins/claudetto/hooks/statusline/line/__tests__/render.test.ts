import { describe, expect, test } from "claude-code/testing";

import { paceOf } from "../format";
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
	phase: "working",
	waiting: { kind: "permission", tool: "Bash" },
	agents: [
		{
			id: "a",
			type: "Explore",
			description: "find login",
			startedAt: NOW - 185_000
		}
	]
};

describe("status line rows", () => {
	test("draws phase, model, context, pace, session, project, account, waiting and agents", () => {
		// Act
		const rows = statusOf(
			FULL,
			{ ...PLAIN, COLUMNS: "200" },
			NOW,
			STATE,
			"main"
		).split("\n");

		// Assert
		expect(rows[0]).toBe(
			"● working · ❖ Opus 4.1 high think · ctx ████░░░░░░ 40% of 200k"
		);
		expect(rows[1]).toStartWith("Pace: 5h 1.0x (50% used, 50% elapsed)");
		expect(rows[2]).toBe(
			"Session: work · ◔ 12m · +12 -3 · cache 90% warm 4m/5m"
		);
		expect(rows[3]).toBe("Project: ⌂ claudetto · ⎇ main · ⇄ #7 approved");
		expect(rows[4]).toStartWith("Account: 5h █████░░░░░ 50% ↻");
		expect(rows[5]).toBe("⚑ waiting on you: permission for Bash");
		expect(rows[6]).toBe("⏵ Explore find login 3m");
	});

	test("leaves out every figure stdin and the hooks do not report", () => {
		// Act
		const out = statusOf('{"model":{"display_name":"Sonnet 5.5"}}', PLAIN, NOW);

		// Assert
		expect(out).toBe("❖ Sonnet 5.5");
	});

	test("shows no Pace or Account row when rate_limits is absent, and shows the dollars instead", () => {
		// Arrange
		// Act
		const out = statusOf(JSON.stringify(BASE), PLAIN, NOW);

		// Assert
		expect(out).not.toContain("Pace:");
		expect(out).not.toContain("Account:");
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
		const out = statusOf(FULL, PLAIN, NOW, STATE, "main");

		// Assert
		expect(out).not.toMatch(/saved|vanilla/iu);
	});

	test("keeps every row within COLUMNS minus the margin and falls back to countdowns", () => {
		// Act
		const out = statusOf(FULL, { ...PLAIN, COLUMNS: "60" }, NOW, STATE, "main");

		// Assert
		for (const row of out.split("\n")) {
			expect(width(row)).toBeLessThanOrEqual(56);
		}
		expect(out).toContain("↻2h30m");
	});

	test("paints with ANSI codes unless NO_COLOR is set, and the plain text is the same", () => {
		// Act
		const colored = statusOf(FULL, { COLUMNS: "200" }, NOW, STATE, "main");
		const bare = statusOf(
			FULL,
			{ COLUMNS: "200", ...PLAIN },
			NOW,
			STATE,
			"main"
		);

		// Assert
		expect(colored).toContain("\u001B[");
		expect(bare).not.toContain("\u001B[");
		expect(plain(colored)).toBe(bare);
	});

	test("prints the fallback for stdin that is not a JSON object", () => {
		// Act and Assert
		expect(statusOf("not json", PLAIN, NOW)).toBe("claudetto: no status");
	});

	test("folds more than three agents into a count", () => {
		// Arrange
		const agents = Array.from({ length: 5 }, (_, i) => ({
			id: String(i),
			type: "Explore",
			description: "",
			startedAt: NOW
		}));

		// Act
		const out = statusOf(FULL, { ...PLAIN, COLUMNS: "200" }, NOW, {
			phase: "idle",
			agents
		});

		// Assert
		expect(out.split("\n").filter((row) => row.startsWith("⏵"))).toHaveLength(
			3
		);
		expect(out).toContain("+2 more agents");
	});
});

describe("pace", () => {
	test("is used percent over elapsed percent of the window", () => {
		// Act: half of the 5h window is gone and 75 percent is used.
		const pace = paceOf(75, NOW_S + 9000, NOW_S, 18_000);

		// Assert
		expect(Math.abs((pace?.ratio ?? 0) - 1.5)).toBeLessThan(1e-9);
		expect(Math.abs((pace?.elapsed ?? 0) - 50)).toBeLessThan(1e-9);
		expect(Math.abs((pace?.runOutAt ?? 0) - (NOW_S + 3000))).toBeLessThan(1e-6);
	});

	test("shows nothing while the window is under 3 percent elapsed or resets_at lies outside it", () => {
		// Act and Assert
		expect(paceOf(5, NOW_S + 17_800, NOW_S, 18_000)).toBeUndefined();
		expect(paceOf(5, NOW_S + 99_999, NOW_S, 18_000)).toBeUndefined();
	});
});
