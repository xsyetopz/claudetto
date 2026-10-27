#!/usr/bin/env -S bun --no-env-file
// Prints statistics for the with/without comparison in the `aggregate-result.json` files of `claude plugin eval`.
// Usage: `bun dev/stats/main.ts [--json] [--seed N] [--gap G] [--pick newest|oldest] [--version X] PATH...`
// A PATH is an `aggregate-result.json` file or a folder that holds some.
// The case is the unit of a set, so the bootstrap resamples cases and never pools runs.

import { join } from "node:path";
import { argv, file as bunFile } from "bun";
import { EVAL_STATS_GAP, EVAL_STATS_SEED } from "../../tools/limits.ts";
import { type Aggregate, caseInfos, findResultFiles } from "./cases.ts";
import { formatReport } from "./format.ts";
import { buildReport } from "./report.ts";

/** Prints the report of the result files named in the arguments, and returns the exit code. */
const main = async (): Promise<number> => {
	const args = argv.slice(2);
	const paths: string[] = [];
	let json = false;
	let version: string | undefined;
	let seed = EVAL_STATS_SEED;
	let gap = EVAL_STATS_GAP;
	let pick: "newest" | "oldest" = "newest";
	for (let i = 0; i < args.length; i++) {
		const a = args[i] ?? "";
		switch (a) {
			case "--json":
				json = true;
				break;
			case "--version":
				version = args[++i];
				break;
			case "--seed":
				seed = Number(args[++i]);
				break;
			case "--gap":
				gap = Number(args[++i]);
				break;
			case "--pick":
				pick = args[++i] === "oldest" ? "oldest" : "newest";
				break;
			default:
				paths.push(a);
		}
	}
	if (paths.length === 0 || Number.isNaN(seed) || !(gap > 0)) {
		console.error(
			"Usage: bun dev/stats/main.ts [--json] [--seed N] [--gap G] [--pick newest|oldest] [--version X] PATH...",
		);
		return 1;
	}
	const names = await findResultFiles(paths);
	if (names.length === 0) {
		console.error("No aggregate-result.json file found.");
		return 1;
	}
	const files = await Promise.all(
		names.map(async (file) => {
			const data: Aggregate = await bunFile(file).json();
			return { file, data };
		}),
	);
	const root = join(import.meta.dirname, "../..");
	const report = buildReport(files, await caseInfos(root), {
		seed,
		gap,
		pick,
		...(version === undefined ? {} : { version }),
	});
	process.stdout.write(
		`${json ? JSON.stringify(report, null, 2) : formatReport(report)}\n`,
	);
	return 0;
};

if (import.meta.main) {
	process.exitCode = await main();
}
