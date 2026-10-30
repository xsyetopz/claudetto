import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { refusedPaths } from "./keys.ts";
import { applyTier, type Json, settingsText } from "./merge.ts";
import { initOpenSpec } from "./openspec.ts";
import { readTier, unknownTierLine } from "./read.ts";
import { tierReport } from "./report.ts";
import { tierSnippet } from "./snippet.ts";

const isRecord = (value: unknown): value is Json =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export interface SetupArgs {
	readonly settings?: string;
	readonly dryRun: boolean;
}

export interface SetupPlan {
	readonly report: string;
	readonly write?: Json;
}

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

export const planSetup = (
	state: unknown,
	current: Json,
	platform: string,
): SetupPlan => {
	const { row, read } = readTier(state);
	if (row === undefined) {
		return { report: unknownTierLine(read) };
	}
	const snippet = tierSnippet(row, platform);
	const applied = applyTier(current, snippet, refusedPaths(snippet));
	return { report: tierReport(row.tier, applied), write: applied.settings };
};

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
	const plan = planSetup(state, current, process.platform);
	console.info(plan.report);
	if (plan.write !== undefined && !args.dryRun) {
		await mkdir(dirname(target), { recursive: true });
		await writeFile(target, settingsText(plan.write));
	}
	const init = await initOpenSpec(process.cwd(), args.dryRun);
	console.info(init.report);
	if (init.failed) {
		process.exitCode = 1;
	}
};

if (import.meta.main) {
	await main();
}
