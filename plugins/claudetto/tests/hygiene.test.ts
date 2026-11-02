import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

interface Run {
	readonly argv: readonly string[];
	readonly cwd: string | undefined;
}

const lab = (
	on: On,
	days: number | undefined,
	answer: () => Promise<never> | { readonly deny: string },
): Run[] => {
	const runs: Run[] = [];
	on("process.run", (_$, e) => {
		runs.push({ argv: e.argv, cwd: e.init?.cwd });
		return answer();
	});
	// A key read is answered from a settings object.
	on("settings.read", () => ({
		value: days === undefined ? {} : { cleanupPeriodDays: days },
	}));
	on("session.id", () => ({ value: "s1" }));
	on("session.root", () => ({ value: "/work" }));
	on("session.version", () => ({
		value: {
			version: "2.1.314",
			base: "2.1.314",
			builtAt: "2026-10-30T00:00:00Z",
		},
	}));
	on("fs.exists", () => ({ value: false }));
	on("classic.SessionStart", () => ({}));
	return runs;
};

const never = (): Promise<never> => new Promise<never>(() => undefined);

test("a startup runs `claudetto-hygiene` in the project with the session id and `cleanupPeriodDays`", async ($: Engine, on: On) => {
	const runs = lab(on, 7, never);

	await $.classic.SessionStart({ source: "startup" });

	expect(runs).toHaveLength(1);
	expect(runs[0]?.argv[0]).toEndWith("/bin/claudetto-hygiene");
	// The lab applies the manifest defaults, so the probe limit of 60 rides along.
	expect(runs[0]?.argv.slice(1)).toEqual([
		"--session",
		"s1",
		"--days",
		"7",
		"--probe-minutes",
		"60",
	]);
	expect(runs[0]?.cwd).toBe("/work");
});

test("an unset `cleanupPeriodDays` passes no `--days`, so the CLI reads its own default", async ($: Engine, on: On) => {
	const runs = lab(on, undefined, never);

	await $.classic.SessionStart({ source: "startup" });

	expect(runs[0]?.argv.slice(1)).toEqual([
		"--session",
		"s1",
		"--probe-minutes",
		"60",
	]);
});

test("the start returns while the sweep still runs", async ($: Engine, on: On) => {
	lab(on, 7, never);

	const started = await $.classic.SessionStart({ source: "startup" });

	expect(started).toBeDefined();
});

test("a failed sweep does not fail the start", async ($: Engine, on: On) => {
	lab(on, 7, () => ({ deny: "bun missing" }));

	const started = await $.classic.SessionStart({ source: "startup" });

	expect(started).toBeDefined();
});

test("a resume runs no sweep, so one process sweeps once", async ($: Engine, on: On) => {
	const runs = lab(on, 7, never);

	await $.classic.SessionStart({ source: "resume" });

	expect(runs).toEqual([]);
});

const startupRuns = async ($: Engine, on: On): Promise<Run[]> => {
	const runs = lab(on, 7, never);
	await $.classic.SessionStart({ source: "startup" });
	return runs;
};

test(
	"the retention options go to the process as flags, and 0 is passed as off",
	{
		options: {
			handoffCleanupPeriodDays: 14,
			sessionTempCleanupPeriodDays: 0,
			probeCleanupPeriodMinutes: 5,
		},
	},
	async ($: Engine, on: On) => {
		const runs = await startupRuns($, on);

		expect(runs[0]?.argv.slice(1)).toEqual([
			"--session",
			"s1",
			"--days",
			"7",
			"--handoff-days",
			"14",
			"--session-days",
			"0",
			"--probe-minutes",
			"5",
		]);
	},
);

test(
	"with `hygieneEnabled` false a startup starts no process",
	{ options: { hygieneEnabled: false } },
	async ($: Engine, on: On) => {
		expect(await startupRuns($, on)).toEqual([]);
	},
);
