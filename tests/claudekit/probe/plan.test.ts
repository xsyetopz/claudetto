import { describe, expect, test } from "bun:test";
import {
	BASE_USD,
	expectedUsd,
	FORK_USD,
} from "../../../claudekit/probe/plan/cost.ts";
import { envOf, plan } from "../../../claudekit/probe/plan/plan.ts";
import { weeklyShare } from "../../../claudekit/probe/plan/share.ts";
import {
	CONTEXT_WINDOW,
	compactAt,
	HANDOFF_TRIGGER_TOKENS,
	pctFor,
} from "../../../plugins/claudetto/src/threshold.ts";

const MODEL = "claude-sonnet-5-5";

interface Settings {
	env?: Record<string, string>;
	autoCompactWindow?: number;
}

/**
 * The `--settings` object of a command. The user's own `~/.claude/settings.json` sets
 * `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` under `env`, and a settings `env` block replaces the value from
 * the shell, so a threshold passed only in the process env would be lost. `--settings` is the second
 * level and user settings the fifth (`clawdipedia` `configure/settings`, "Which Value Wins").
 */
const settingsOf = (command: readonly string[]): Settings => {
	const at = command.indexOf("--settings");
	return at === -1 ? {} : JSON.parse(command[at + 1] ?? "{}");
};

/** A command without its `--settings` value, which is the only part an arm changes. */
const without = (command: readonly string[]): readonly string[] => {
	const at = command.indexOf("--settings");
	return at === -1 ? command : command.toSpliced(at + 1, 1);
};

describe("plan", () => {
	test("gives runs forks of each arm at each size", () => {
		const forks = plan(4, MODEL, 100_000, [30_000, 50_000]);

		expect(forks).toHaveLength(4 * 2 * 2);
	});

	test("the arms differ only in the threshold", () => {
		const forks = plan(3, MODEL, 100_000, [30_000]);
		const ref = forks.filter((f) => f.arm === "ref");
		const alt = forks.filter((f) => f.arm === "alt");

		expect(ref.map((f) => without(f.command))).toEqual(
			alt.map((f) => without(f.command)),
		);
		expect(ref.map((f) => f.model)).toEqual(alt.map((f) => f.model));
		expect(ref[0]?.env).not.toEqual(alt[0]?.env);
		expect(ref[0]?.threshold).toBe(HANDOFF_TRIGGER_TOKENS);
		expect(alt[0]?.threshold).toBe(100_000);
	});

	test("the threshold rides the settings level that wins, not the process env alone", () => {
		const forks = plan(1, MODEL, 100_000, [30_000]);

		const pcts = forks.map(
			(f) => settingsOf(f.command).env?.["CLAUDE_AUTOCOMPACT_PCT_OVERRIDE"],
		);

		expect(pcts).toEqual([
			pctFor(CONTEXT_WINDOW, HANDOFF_TRIGGER_TOKENS).toFixed(4),
			pctFor(CONTEXT_WINDOW, 100_000).toFixed(4),
		]);
	});

	test("the settings level also pins the window the percentage is taken from", () => {
		const [fork] = plan(1, MODEL, 100_000, [30_000]);

		expect(settingsOf(fork?.command ?? []).autoCompactWindow).toBe(
			CONTEXT_WINDOW,
		);
	});

	test("interleaves the arms so that a drift in time hits both", () => {
		const forks = plan(2, MODEL, 100_000, [30_000]);

		expect(forks.map((f) => `${f.arm}${f.run}`)).toEqual([
			"ref1",
			"alt1",
			"ref2",
			"alt2",
		]);
	});

	test("each fork resumes a copy of the base session in one step", () => {
		const [fork] = plan(1, MODEL, 100_000, [30_000]);

		expect(fork?.command).toContain("--fork-session");
		expect(fork?.command).toContain("$BASE");
	});
});

describe("envOf", () => {
	test("puts the compaction at the threshold on the window claudetto sets", () => {
		const env = envOf(100_000);

		const pct = Number(env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE);
		const window = Number(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW);

		expect(window).toBe(CONTEXT_WINDOW);
		expect(compactAt(window, pct)).toBeGreaterThanOrEqual(99_990);
		expect(compactAt(window, pct)).toBeLessThanOrEqual(100_000);
	});
});

describe("expectedUsd", () => {
	test("adds the forks and the base sessions at their measured prices", () => {
		const usd = expectedUsd(20, 1);

		expect(usd).toBeCloseTo(20 * FORK_USD + BASE_USD, 10);
	});

	// The user approved about 30.86 units for this round, which is 1.04% of the weekly limit, so a
	// citable run has to stay under that. The lower bound only catches a price set to nothing, which
	// would make the cost line say zero before a paid call.
	test("a citable run of 20 forks stays inside the share of the plan that was approved", () => {
		const percent = weeklyShare(expectedUsd(20, 2)).mid;

		expect(percent).toBeGreaterThan(0.1);
		expect(percent).toBeLessThan(1.04);
	});
});
