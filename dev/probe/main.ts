#!/usr/bin/env -S bun --no-env-file
// The probe of the code-compaction change (task 3.1): 3 arms, 2 sizes, 3 runs (or `--runs N`), so 18 forks by default, on `claude-sonnet-5-5`.
//
//   bun dev/probe/main.ts --dry-run              lists the 18 forks and their commands, and makes no call
//   bun dev/probe/main.ts --run [--dir D] [--runs N]   runs them. This is a paid run, so run it only after the user approves its cost
//
// Each size has one base session (tasks 1 to 3, in a fixture of `dev/probe/fixture.ts`). Each fork resets the project to the end of the base, then runs `/compact` with its arm and 2 follow-ups.
// The forks of a size share one folder, because Claude Code finds a session by the folder. So they run one after the other.
// A step is a `claude -p` run, and the cost of a step is the difference of `total_cost_usd`, because a fork starts with the cost of its base (wiki `Handoff-Cost`).
// The measures come from the stream-json events and the files, with no judge model.
//
// H is the handover of today (`session/handoff/adapters/mod.ts`, `begin`): the handoff text of the base session is written to the handoff folder, and a new session starts with `HANDOVER_RESUME` and that text.
// The 2 follow-ups run in that session. The plugin does not hand over in a fresh `-p` process (`/compact` with the option `handover` runs the built-in summary, and `onStop` does not run),
// so the probe does the steps itself, with the same `handoffText` of the plugin. The base cost of H is 0, because a new session has none, and its first request is that of the resume turn.
// The resume turn also does the next task, so H does tasks 1.4 to 1.6 where B and C do 1.4 and 1.5.
//
// Facts of the cost, from Claude Code 2.1.310 (the strings of the installed binary, `~/.local/share/claude/versions/2.1.310`; reading only):
// - `--max-budget-usd` counts the cost of the run itself: the check uses `total - costLedger.restoredCostUSD()`, so a `--resume` step starts at 0.
// - `total_cost_usd` of the result is the cumulative total `Gh()`. A resume restores it from the `cost-state` line of the transcript (`costLedger.restore`; wiki and docs: `reference/transcript-format`).
//   Docs do not say that `--fork-session` copies that line, so `problem` checks at run time that each total is at least the one before, the base total first. A fork that fails it is invalid.
// - The cap of a step is `STEP_BUDGET_USD`, above what a normal step of 200k can cost (a cold write of the 200k, then a loop of warm requests), so it stops only a loop.

import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { MIN_RUNS, report, verdict } from "./bar.ts";
import { plan } from "./plan.ts";
import { runAll } from "./round.ts";

const SHELL_SAFE = /^[\w@%+=:,./$-]+$/;

const quote = (s: string): string =>
	SHELL_SAFE.test(s) ? s : `'${s.replaceAll("'", "'\\''")}'`;

const USAGE = `Usage: bun dev/probe/main.ts --dry-run | --run [--dir D] [--runs N], where N is a whole number of at least ${MIN_RUNS}`;

/** The value of `--runs` in `args`, `MIN_RUNS` without the flag, or `null` when it is not a whole number of at least `MIN_RUNS`. */
export const runsOf = (args: string[]): number | null => {
	const at = args.indexOf("--runs");
	if (at < 0) {
		return MIN_RUNS;
	}
	const n = Number(args[at + 1]);
	return Number.isInteger(n) && n >= MIN_RUNS ? n : null;
};

/** Runs the command line `args`, and gives the exit code. */
const main = async (args: string[]): Promise<number> => {
	const at = args.indexOf("--dir");
	const root =
		at < 0 ? path.join(os.tmpdir(), "claudetto-probe") : args[at + 1];
	const runs = runsOf(args);
	if (runs === null) {
		console.error(USAGE);
		return 2;
	}
	if (args.includes("--dry-run")) {
		for (const [i, f] of plan(runs).entries()) {
			process.stdout.write(
				`fork ${i + 1}: arm ${f.arm}, ${f.size / 1000}k, run ${f.run}\n`,
			);
			for (const c of f.commands) {
				process.stdout.write(`  claude ${c.map(quote).join(" ")}\n`);
			}
		}
		process.stdout.write(`${plan(runs).length} forks, no call made.\n`);
		return 0;
	}
	if (args.includes("--run") && root) {
		await mkdir(root, { recursive: true });
		try {
			process.stdout.write(
				`${report(verdict(await runAll(root, undefined, runs)))}\n`,
			);
		} catch (e) {
			console.error(e instanceof Error ? e.message : e);
			return 1;
		}
		return 0;
	}
	console.error(USAGE);
	return 2;
};

if (import.meta.main) {
	process.exitCode = await main(process.argv.slice(2));
}
