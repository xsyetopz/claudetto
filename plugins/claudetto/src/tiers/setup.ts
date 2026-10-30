// The setup entry point: `bun plugins/claudetto/src/tiers/setup.ts [--settings PATH] [--dry-run]`.
// The decisions are the exported pure functions, and only the `import.meta.main` block touches a file.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { refusedNames } from "../refused.ts";
import { applyTier, type Json } from "./merge.ts";
import { readTier, unknownTierLine } from "./read.ts";
import { tierReport } from "./report.ts";
import { type TierSnippet, tierSnippet } from "./snippet.ts";

const ENV_PREFIX = /^env\./;

const isRecord = (value: unknown): value is Json =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** What the command line asked for. */
export interface SetupArgs {
	/** The settings file to merge into, or none for `~/.claude/settings.json`. */
	readonly settings?: string;
	/** Whether to print the report and write nothing. */
	readonly dryRun: boolean;
}

/** What setup decided: the text to print, and the settings to write, or none when nothing is written. */
export interface SetupPlan {
	readonly report: string;
	readonly write?: Json;
}

/** Reads `--settings PATH` and `--dry-run` from `argv`. Any other argument, or `--settings` with no path, throws. */
export const parseArgs = (argv: readonly string[]): SetupArgs => {
	let settings: string | undefined;
	let dryRun = false;
	for (let at = 0; at < argv.length; at++) {
		const arg = argv[at];
		switch (arg) {
			case "--dry-run":
				dryRun = true;
				break;
			case "--settings":
				settings = argv[++at];
				if (settings === undefined || settings.startsWith("--")) {
					throw new Error("--settings needs a path");
				}
				break;
			default:
				throw new Error(`Unknown argument ${arg}`);
		}
	}
	return { dryRun, ...(settings === undefined ? {} : { settings }) };
};

/** The paths of `snippet`, written with dots, that name a refused key at the top level or inside `env`. */
export const refusedPaths = (snippet: TierSnippet): readonly string[] => {
	const env = snippet["env"];
	const inEnv = isRecord(env)
		? Object.keys(env).map((key) => `env.${key}`)
		: [];
	return [...Object.keys(snippet), ...inEnv].filter((path) =>
		refusedNames().includes(path.replace(ENV_PREFIX, "")),
	);
};

/** The plan for the parsed `.claude.json` in `state` against the settings in `current`. A tier with no row plans no write. */
export const planSetup = (state: unknown, current: Json): SetupPlan => {
	const { row, read } = readTier(state);
	if (row === undefined) {
		return { report: unknownTierLine(read) };
	}
	const snippet = tierSnippet(row);
	const applied = applyTier(current, snippet, refusedPaths(snippet));
	return { report: tierReport(row.tier, applied), write: applied.settings };
};

/** The settings file text: 2-space indentation and a final newline. */
export const settingsText = (settings: Json): string =>
	`${JSON.stringify(settings, undefined, 2)}\n`;

const readJson = async (path: string, missing: Json): Promise<unknown> => {
	let text: string;
	try {
		text = await readFile(path, "utf8");
	} catch (error) {
		if (isRecord(error) && error["code"] === "ENOENT") {
			return missing;
		}
		throw error;
	}
	return JSON.parse(text);
};

const main = async (): Promise<void> => {
	const args = parseArgs(process.argv.slice(2));
	const target = args.settings ?? join(homedir(), ".claude", "settings.json");
	const state = await readJson(join(homedir(), ".claude.json"), {});
	const current = await readJson(target, {});
	if (!isRecord(current)) {
		throw new Error(`${target} is not a JSON object`);
	}
	const plan = planSetup(state, current);
	console.info(plan.report);
	if (plan.write !== undefined && !args.dryRun) {
		await mkdir(dirname(target), { recursive: true });
		await writeFile(target, settingsText(plan.write));
	}
};

if (import.meta.main) {
	await main();
}
