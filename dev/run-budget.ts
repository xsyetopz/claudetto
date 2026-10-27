#!/usr/bin/env -S bun --no-env-file
// Checks the budget tags of the eval cases against the kept traces of a `claude plugin eval` run (D25).
//
//   bun dev/run-budget.ts PATH...
//
// Each PATH is an `aggregate-result.json`, or a folder that holds one or more of them at any depth.
// The layout is from the run of 2026-10-20 (Claude Code 2.1.304, `--keep-temp`).
// A kept sandbox is `/private/tmp/e-XXXXXX/` with a random name, so it does not name its case.
// A `trace.jsonl` holds neither the case name nor the prompt.
// So the case of a trace comes from the result file: `cases[i].name` and `cases[i].arms.with[j].tracePath`.
// The `with` arm is checked against the tags of its case.
// D25 does not say if the `without` arm (no plugin) is checked, so the script only prints its counts as info.
// A run with no `tracePath`, a trace that is missing or no stream-json, and a case with no tags in this checkout are faults.
// The script exits 1 on a fault, and 2 on a bad call.

import { join, relative } from "node:path";
import { file as bunFile, Glob } from "bun";
import { parse } from "yaml";
import { overBudget } from "../tools/case-checks.ts";
import type { Transcript } from "../tools/transcript-grade.ts";

/** The order of the default `sort`: by UTF-16 code unit. */
const byCodeUnit = (x: string, y: string): number =>
	Number(x > y) - Number(x < y);

const CASES = "plugins/*/evals/*/case.yaml";

/** The tags of each case under `root`, by case name. */
export const caseTags = async (
	root: string,
	glob: string = CASES,
): Promise<Record<string, string[]>> => {
	const out: Record<string, string[]> = {};
	for await (const f of new Glob(glob).scan(root)) {
		const doc = parse(await bunFile(join(root, f)).text());
		if (doc?.name) {
			out[doc.name] = doc.tags ?? [];
		}
	}
	return out;
};

/** The events of a `trace.jsonl` text, or the fault for a line that is no JSON object. */
export const parseTrace = (
	text: string,
): { run: Transcript } | { fault: string } => {
	const events: Transcript["events"] = [];
	const lines = text.split("\n");
	for (const [i, line] of lines.entries()) {
		if (!line.trim()) {
			continue;
		}
		try {
			const e = JSON.parse(line);
			if (typeof e !== "object" || e === null) {
				throw new Error("no object");
			}
			events.push(e);
		} catch {
			return { fault: `line ${i + 1} is no JSON event` };
		}
	}
	return { run: { events, files: {} } };
};

interface Run {
	tracePath?: string | null;
}
interface Aggregate {
	cases?: { name?: string; arms?: { with?: Run[]; without?: Run[] } }[];
}

/** The result of a check: the faults, the count of the runs checked, and the info lines. */
export interface Budget {
	faults: string[];
	checked: number;
	info: string[];
}

/** The outcome of one run: its faults, whether it counts as checked, and whether the `without` arm went over the budget. */
interface RunCheck {
	faults: string[];
	checked: boolean;
	over: boolean;
}

const checkRun = async (
	run: Run,
	arm: "with" | "without",
	where: string,
	caseTagList: string[] | undefined,
): Promise<RunCheck> => {
	const none: RunCheck = { faults: [], checked: false, over: false };
	const isWith = arm === "with";
	if (isWith && caseTagList === undefined) {
		return {
			...none,
			faults: [`${where}: no tags for this case in the checkout`],
		};
	}
	if (!run.tracePath) {
		return isWith ? { ...none, faults: [`${where}: no tracePath`] } : none;
	}
	const file = bunFile(run.tracePath);
	const parsed = (await file.exists())
		? parseTrace(await file.text())
		: { fault: "trace is missing" };
	if ("fault" in parsed) {
		return isWith
			? { ...none, faults: [`${where}: ${run.tracePath}: ${parsed.fault}`] }
			: none;
	}
	const faults = overBudget(caseTagList ?? [], parsed.run);
	if (!isWith) {
		return { ...none, over: faults.length > 0 };
	}
	return {
		faults: faults.map((fault) => `${where}: ${fault}`),
		checked: true,
		over: false,
	};
};

/** Adds the faults, the count, and the info lines of `part` to `out`. */
const addBudget = (out: Budget, part: Budget): void => {
	out.faults.push(...part.faults);
	out.info.push(...part.info);
	out.checked += part.checked;
};

/** The budget check of the runs of one arm of one case. The runs are independent, and the results keep the order of the runs. */
const checkArm = async (
	runs: Run[],
	arm: "with" | "without",
	label: string,
	name: string,
	caseTagList: string[] | undefined,
): Promise<Budget> => {
	const checks = await Promise.all(
		runs.map((run, j) =>
			checkRun(run, arm, `${label}: ${name} ${arm}[${j}]`, caseTagList),
		),
	);
	const over = checks.filter((r) => r.over).length;
	const out: Budget = {
		faults: checks.flatMap((r) => r.faults),
		checked: checks.filter((r) => r.checked).length,
		info: [],
	};
	if (arm === "without" && runs.length > 0) {
		out.info.push(
			`${label}: ${name} without: ${over} of ${runs.length} runs over the budget of the case (not a fault)`,
		);
	}
	return out;
};

/** The budget check of the runs in one parsed `aggregate-result.json`, named `label` in each message. */
export const budgetOfAggregate = async (
	agg: Aggregate,
	tags: Record<string, string[]>,
	label: string,
): Promise<Budget> => {
	const out: Budget = { faults: [], checked: 0, info: [] };
	if (!Array.isArray(agg.cases) || agg.cases.length === 0) {
		out.faults.push(`${label}: no cases in the result`);
	}
	const parts = await Promise.all(
		(agg.cases ?? []).flatMap((c) => {
			const name = c.name ?? "(no name)";
			const caseTagList = c.name === undefined ? undefined : tags[c.name];
			return (["with", "without"] as const).map((arm) =>
				checkArm(c.arms?.[arm] ?? [], arm, label, name, caseTagList),
			);
		}),
	);
	for (const part of parts) {
		addBudget(out, part);
	}
	return out;
};

/** The `aggregate-result.json` files at `path`, which is such a file or a folder. */
export const aggregateFiles = async (path: string): Promise<string[]> => {
	if (path.endsWith(".json")) {
		return [path];
	}
	const out: string[] = [];
	for await (const f of new Glob("**/aggregate-result.json").scan({
		cwd: path,
		dot: true,
	})) {
		out.push(join(path, f));
	}
	return out.sort(byCodeUnit);
};

/** The budget check of one result file `f`, or the fault when it holds no JSON. */
const checkFile = async (
	f: string,
	tags: Record<string, string[]>,
): Promise<Budget> => {
	let agg: Aggregate;
	try {
		agg = JSON.parse(await bunFile(f).text());
	} catch {
		return { faults: [`${f}: no readable JSON`], checked: 0, info: [] };
	}
	return budgetOfAggregate(agg, tags, relative(process.cwd(), f));
};

/** The budget check of each result file under each of `paths`. */
export const budgetFaultsIn = async (
	paths: string[],
	tags: Record<string, string[]>,
): Promise<Budget> => {
	const out: Budget = { faults: [], checked: 0, info: [] };
	const parts = await Promise.all(
		paths.map(async (path): Promise<Budget> => {
			const files = await aggregateFiles(path);
			const part: Budget = { faults: [], checked: 0, info: [] };
			if (files.length === 0) {
				part.faults.push(`${path}: no aggregate-result.json found`);
			}
			for (const result of await Promise.all(
				files.map((f) => checkFile(f, tags)),
			)) {
				addBudget(part, result);
			}
			return part;
		}),
	);
	for (const part of parts) {
		addBudget(out, part);
	}
	return out;
};

/** Prints the budget check of the result files under the arguments, and returns the exit code. */
const main = async (): Promise<number> => {
	const paths = process.argv.slice(2);
	if (paths.length === 0 || paths.some((a) => a.startsWith("--"))) {
		console.error("Usage: bun dev/run-budget.ts PATH...");
		return 2;
	}
	const root = join(import.meta.dirname, "..");
	const r = await budgetFaultsIn(paths, await caseTags(root));
	for (const line of r.info) {
		process.stdout.write(`info: ${line}\n`);
	}
	for (const f of r.faults) {
		console.error(f);
	}
	process.stdout.write(
		`${r.checked} runs checked, ${r.faults.length} faults.${r.faults.length > 0 ? "" : " All are in budget."}\n`,
	);
	return r.faults.length > 0 ? 1 : 0;
};

if (import.meta.main) {
	process.exitCode = await main();
}
