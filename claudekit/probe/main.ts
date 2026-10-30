#!/usr/bin/env -S bun --no-env-file
// The probe of the compaction threshold: two arms that differ only in the threshold, forked from one prepared base session,
// and scored on turns to completion beside the bars of `docs/evidence/code-compaction-probe.md`, section "The Bars".
//
//   bun claudekit/probe/main.ts                  a dry run: prints the plan, the arms, the fork count, the floor line, and the expected cost. It makes no call
//   bun claudekit/probe/main.ts --run [...]      the paid run, which starts only with this flag. Run it only after the cost is approved
//
// The only code that starts `claude` is `claude.ts`, which `session.ts` calls, and this file hands `session.ts` to a round only under `--run`.
// A step is a `claude -p` run, and the cost of a fork is its `total_cost_usd` less the total of its base, because a fork starts with the cost of its base.
// The measures come from the stream-json events and the files, with no judge model.

import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { lastSevenDay } from "../store.ts";
import { costLine } from "./plan/cost.ts";
import { type Config, parse, USAGE } from "./plan/flags.ts";
import { floorLine, ranLine } from "./plan/floor.ts";
import { plan, thresholdsOf } from "./plan/plan.ts";
import { costLines } from "./round/forks.ts";
import type { Result } from "./round/result.ts";
import { type Runners, runAll } from "./round/round.ts";
import { RESULTS_FILE, savedResults } from "./round/saved.ts";
import { ranRuns, report, verdict } from "./round/verdict.ts";
import { paidRunners } from "./transport/session.ts";

const SHELL_SAFE = /^[\w@%+=:,./$-]+$/;

const quote = (s: string): string =>
	SHELL_SAFE.test(s) ? s : `'${s.replaceAll("'", "'\\''")}'`;

/** The line naming the seven-day figure that the round is held against, or nothing when there is no reading. */
const weeklyLine = (used: number | undefined): string =>
	used === undefined
		? ""
		: `The seven-day limit is ${used.toFixed(1)}% used, and a round priced at the dearest end of the band over the ${Math.max(0, 100 - used).toFixed(1)}% left is refused.\n`;

/** Prints the plan and the expected cost, and makes no call. */
const dryRun = (
	c: Config,
	write: (s: string) => void,
	weeklyUsed: number | undefined,
): void => {
	const forks = c.baseOnly ? [] : plan(c.runs, c.model, c.alt, c.sizes);
	const thresholds = thresholdsOf(c.alt);
	write(
		c.baseOnly
			? `Base sessions only, at sizes ${c.sizes.join(", ")} on ${c.model}. No fork runs, so no arm is compared and no verdict is reached.\n`
			: `Arms differ only in the compaction threshold: ref ${thresholds.ref}, alt ${thresholds.alt}, on ${c.model}, at base sizes ${c.sizes.join(", ")}.\n`,
	);
	for (const [i, f] of forks.entries()) {
		const env = Object.entries(f.env)
			.map(([k, v]) => `${k}=${v}`)
			.join(" ");
		write(
			`fork ${i + 1}: arm ${f.arm}, ${f.size / 1000}k, run ${f.run}\n  ${env} claude ${f.command.map(quote).join(" ")}\n`,
		);
	}
	// A base-only run compares no arm, so the citable floor says nothing about it and is left out.
	write(
		`${forks.length} forks and ${c.sizes.length} base sessions, no call made. The round stops at ${c.cap.toFixed(2)} in total.\n${c.baseOnly ? "" : `${floorLine(c.runs)}\n`}${costLine(forks.length, c.sizes.length)}\n${weeklyLine(weeklyUsed)}Add --run to make the paid calls.\n`,
	);
};

/**
 * The report of the forks `results` holds: the cost of each, the floor the round really reached, and the
 * verdict. The sizes come from the forks themselves, so a size that no fork reached claims nothing.
 */
const roundReport = (results: Result[], write: (s: string) => void): void => {
	write(`${costLines(results).join("\n")}\n`);
	// After the round, because a cap stop makes the floor line printed before it a plan and not a result.
	write(`${ranLine(ranRuns(results))}\n`);
	write(`${report(verdict(results))}\n`);
};

/** Reports the forks that `--dir` already holds, free and with no call, and gives the exit code. */
const replay = async (
	c: Config,
	write: (s: string) => void,
): Promise<number> => {
	const results = await savedResults(c.dir).catch(() => []);
	if (results.length === 0) {
		console.error(
			`No fork was read from ${path.join(c.dir, RESULTS_FILE)}, so there is nothing to report.`,
		);
		return 1;
	}
	write(`${results.length} forks read from ${RESULTS_FILE}, no call made.\n`);
	roundReport(results, write);
	return 0;
};

/** Runs the paid round and writes the report, and gives the exit code. */
const paidRun = async (
	c: Config,
	run: Runners,
	write: (s: string) => void,
	weeklyUsed: number | undefined,
): Promise<number> => {
	await mkdir(c.dir, { recursive: true });
	if (!c.baseOnly) {
		write(`${floorLine(c.runs)}\n`);
	}
	write(weeklyLine(weeklyUsed));
	try {
		const { results, stopped } = await runAll(c.dir, run, {
			runs: c.runs,
			model: c.model,
			alt: c.alt,
			sizes: c.sizes,
			cap: c.cap,
			lowest: Math.min(thresholdsOf(c.alt).ref, c.alt),
			baseOnly: c.baseOnly,
			weeklyUsed,
		});
		if (c.baseOnly) {
			// The base prints its own context and cost as it ends, which is the whole result of this run.
			write(
				"Base sessions only, so no fork ran and no verdict is reached. The context above decides whether --sizes carries a round.\n",
			);
			return 0;
		}
		roundReport(results, write);
		if (stopped) {
			write(`${stopped}\n`);
			return 1;
		}
		return 0;
	} catch (e) {
		console.error(e instanceof Error ? e.message : e);
		return 1;
	}
};

/**
 * Runs the command line `args` and gives the exit code. `run` is reached only under `--run`. `weekly` reads the
 * seven-day used percent; it gives `undefined` for no reading and a read that fails is the same, so the dollar cap alone applies.
 */
export const main = async (
	args: string[],
	run: Runners,
	write: (s: string) => void,
	weekly: () => Promise<number | undefined> = () => Promise.resolve(undefined),
): Promise<number> => {
	const config = parse(args);
	if (config === null) {
		console.error(USAGE);
		return 2;
	}
	if (config.report) {
		return await replay(config, write);
	}
	const weeklyUsed = await weekly().catch(() => undefined);
	if (!config.paid) {
		dryRun(config, write, weeklyUsed);
		return 0;
	}
	return await paidRun(config, run, write, weeklyUsed);
};

if (import.meta.main) {
	process.exitCode = await main(
		process.argv.slice(2),
		paidRunners,
		(s) => process.stdout.write(s),
		() => lastSevenDay(homedir()),
	);
}
