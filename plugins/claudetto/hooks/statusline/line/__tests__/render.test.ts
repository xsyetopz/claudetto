import { describe, expect, test } from "claude-code/testing";

import { paceOf } from "../format";
import { statusOf } from "../main";
import type { Resources } from "../resources";
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
	phase: "working",
	waiting: { kind: "permission", tool: "Bash" },
	agents: [
		{
			id: "a",
			type: "Explore",
			description: "find login",
			startedAt: NOW - 185_000,
			tools: 5,
			doing: "Grep foo"
		}
	],
	finished: [
		{
			id: "b",
			type: "Plan",
			description: "",
			startedAt: NOW - 400_000,
			endedAt: NOW - 100_000,
			end: "completed",
			tools: 9
		}
	],
	tools: 42,
	doing: "Read main.ts",
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

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;

const RESOURCES: Resources = {
	memPercent: 70,
	memTotal: 32 * GIB,
	swapUsed: GIB,
	swapTotal: 2 * GIB,
	load: 1.9,
	cores: 10,
	claude: 812 * MIB,
	tree: 2.5 * GIB,
	procs: 14,
	top: { name: "node", rss: 1.1 * GIB }
};

const IDLE: LiveState = {
	phase: "idle",
	agents: [],
	finished: [],
	tools: 0,
	tasks: []
};

const WIDE = { ...PLAIN, COLUMNS: "200" } as const;

describe("status line rows", () => {
	test("draws every row with no labels, in Claude Code's own separator", () => {
		// Act
		const rows = statusOf(FULL, WIDE, NOW, {
			state: STATE,
			branch: "main",
			resources: RESOURCES
		}).split("\n");

		// Assert
		expect(rows).toHaveLength(9);
		expect(rows[0]).toBe(
			"● working · Opus 4.1 high · ctx ████░░░░░░ 40% 80k/200k · cache 90% warm 4m/5m"
		);
		expect(rows[1]).toBe(
			"⌂ claudetto · ⎇ main · ⇄ #7 approved · work · ◔ 12m (api 4m) · +12 -3"
		);
		expect(rows[2]).toStartWith("5h █████░░░░░ 50% 1.0x ↻");
		expect(rows[2]).toContain(" · 7d █░░░░░░░░░ 10% 0.2x ↻");
		expect(rows[3]).toBe(
			"⚒ 42 tools 3.5/min · ⏵ 1 agent 1 done · ▸ Read main.ts"
		);
		expect(rows[4]).toBe("☑ 1/3 ██░░░ ◐ Writing tests");
		expect(rows[5]).toBe(
			"mem ████░ 70% 32.0G · swap 1.0G/2.0G · load 1.9/10 · claude 812M · tree 2.5G 14 procs · top node 1.1G"
		);
		expect(rows[6]).toBe("⚑ waiting on you: permission for Bash");
		expect(rows[7]).toBe("● Explore find login 3m · 5 tools · ▸ Grep foo");
		expect(rows[8]).toBe("✓ Plan 5m · 9 tools");
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

	test("keeps every row within COLUMNS minus the margin and falls back to countdowns", () => {
		// Act
		const out = statusOf(FULL, { ...PLAIN, COLUMNS: "60" }, NOW, {
			state: STATE,
			branch: "main",
			resources: RESOURCES
		});

		// Assert
		for (const row of out.split("\n")) {
			expect(width(row)).toBeLessThanOrEqual(56);
		}
		expect(out).toContain("↻2h30m");
	});

	test("paints with ANSI codes unless NO_COLOR is set, and the plain text is the same", () => {
		// Arrange
		const seen = { state: STATE, branch: "main", resources: RESOURCES };

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
		expect(statusOf("not json", PLAIN, NOW)).toBe("claudetto: no status");
	});

	test("counts every agent and folds those past three rows into a count", () => {
		// Arrange
		const agents = Array.from({ length: 5 }, (_, i) => ({
			id: String(i),
			type: "Explore",
			description: "",
			startedAt: NOW,
			tools: 0
		}));

		// Act
		const out = statusOf(FULL, WIDE, NOW, { state: { ...IDLE, agents } });

		// Assert
		expect(out).toContain("⏵ 5 agents");
		expect(
			out.split("\n").filter((row) => row.startsWith("● Explore"))
		).toHaveLength(3);
		expect(out).toContain("+2 more");
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
