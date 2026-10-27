#!/usr/bin/env -S bun --no-env-file
// Prints statistics for the with/without comparison in the `aggregate-result.json` files of `claude plugin eval`.
// Usage: `bun dev/stats/main.ts [--json] [--seed N] [--pick newest|oldest] [--version X] PATH...`
// A PATH is an `aggregate-result.json` file or a folder that holds some.
// The case is the unit of a set, so the bootstrap resamples cases and never pools runs.

import { join } from "node:path";
import { argv, file as bunFile, Glob } from "bun";
import { parse } from "yaml";
import {
	EVAL_STATS_CONFIDENCE,
	EVAL_STATS_RESAMPLES,
	EVAL_STATS_SEED,
} from "../../tools/limits.ts";
import { formatReport } from "./format.ts";
import { bootstrapMean, fisherExact, type Interval, newcombe } from "./math.ts";

/** The order of the default `sort`: by UTF-16 code unit. */
const byCodeUnit = (x: string, y: string): number =>
	Number(x > y) - Number(x < y);

export interface Run {
	score: number;
	passed: boolean;
	costUsd?: number;
	graders?: { name: string; judgeVotes?: boolean[] | undefined }[];
}
export interface RawCase {
	name: string;
	promptMarkdown?: string;
	graders?: { name: string; type: string }[];
	arms: { with?: Run[]; without?: Run[] };
}
export interface Aggregate {
	claudeVersion?: string;
	startedAt?: string;
	suite?: { modelOverride?: string | null };
	cases: RawCase[];
}
export interface Source {
	file: string;
	claudeVersion: string;
	model: string;
}
export interface Entry {
	source: string;
	startedAt: string;
	case: RawCase;
	/** The name of the current case that this result belongs to, which differs from the name in the result when the case was renamed. */
	name: string;
	set: string;
	/** True when no current case has this prompt and these graders. */
	stale: boolean;
}
/** What a current `case.yaml` says about a case. */
export interface CaseInfo {
	set: string;
	prompt: string;
	graders: string[];
}

const mean = (xs: number[]): number => {
	let total = 0;
	for (const x of xs) {
		total += x;
	}
	return xs.length === 0 ? Number.NaN : total / xs.length;
};

/** The set, prompt, and grader names of each current case, by case name, from the `case.yaml` files under `root`. */
export const caseInfos = async (
	root: string,
	glob = "plugins/claudetto/evals/*/case.yaml",
): Promise<Map<string, CaseInfo>> => {
	const infos = new Map<string, CaseInfo>();
	for await (const f of new Glob(glob).scan(root)) {
		const doc = parse(await bunFile(join(root, f)).text());
		if (!doc?.name) {
			continue;
		}
		const tag = (doc.tags ?? []).find((t: string) => t.startsWith("set:"));
		infos.set(doc.name, {
			set: tag ? tag.slice(4) : "untagged",
			prompt: String(doc.execution?.prompt ?? ""),
			graders: (doc.graders ?? []).map((g: { name?: string }) => g.name ?? ""),
		});
	}
	return infos;
};

const sameNames = (a: string[], b: string[]): boolean =>
	a.length === b.length &&
	[...a].sort(byCodeUnit).join("\n") === [...b].sort(byCodeUnit).join("\n");

/**
 * The current case that a result case belongs to: the case of the same name when its prompt and graders match, else another current case that matches.
 * It returns `undefined` when none matches, so the result is stale.
 */
export const resolveCase = (
	c: RawCase,
	infos: Map<string, CaseInfo>,
): { name: string; set: string } | undefined => {
	const matches = (info: CaseInfo): boolean =>
		(c.promptMarkdown === undefined ||
			c.promptMarkdown.trim() === info.prompt.trim()) &&
		(c.graders === undefined ||
			sameNames(
				c.graders.map((g) => g.name),
				info.graders,
			));
	const own = infos.get(c.name);
	if (own && matches(own)) {
		return { name: c.name, set: own.set };
	}
	for (const [name, info] of [...infos.entries()].sort(([a], [b]) =>
		a.localeCompare(b),
	)) {
		if (matches(info)) {
			return { name, set: info.set };
		}
	}
	return undefined;
};

/** Every `aggregate-result.json` file at or under the given files and folders, sorted. */
export const findResultFiles = async (paths: string[]): Promise<string[]> => {
	const found = await Promise.all(
		paths.map(async (p) => {
			if (p.endsWith(".json")) {
				return [p];
			}
			const files: string[] = [];
			for await (const f of new Glob("**/aggregate-result.json").scan({
				cwd: p,
			})) {
				files.push(join(p, f));
			}
			return files;
		}),
	);
	return [...new Set(found.flat())].sort(byCodeUnit);
};

/** True when `entry` replaces `old`: it is the first, or it is newer (or older, with `pick` set to `oldest`). */
const isChosen = (
	entry: Entry,
	old: Entry | undefined,
	pick: "newest" | "oldest",
): boolean =>
	old === undefined ||
	(pick === "newest"
		? entry.startedAt > old.startedAt
		: entry.startedAt < old.startedAt);

/** The entries of the files, one for each case: the newest by `startedAt`, or the oldest with `pick` set to `oldest`. */
export const chooseEntries = (
	files: { file: string; data: Aggregate }[],
	pick: "newest" | "oldest" = "newest",
	infos: Map<string, CaseInfo> = new Map(),
): { sources: Source[]; entries: Entry[] } => {
	const sources: Source[] = files.map(({ file, data }) => ({
		file,
		claudeVersion: data.claudeVersion ?? "unknown",
		model: data.suite?.modelOverride ?? "default",
	}));
	const best = new Map<string, Entry>();
	for (const { file, data } of files) {
		for (const c of data.cases) {
			const found = resolveCase(c, infos);
			const entry: Entry = {
				source: file,
				startedAt: data.startedAt ?? "",
				case: c,
				name: found?.name ?? c.name,
				set: found?.set ?? "stale",
				stale: found === undefined,
			};
			const key = entry.stale ? `stale:${c.name}` : entry.name;
			if (isChosen(entry, best.get(key), pick)) {
				best.set(key, entry);
			}
		}
	}
	return {
		sources,
		entries: [...best.values()].sort((a, b) => a.name.localeCompare(b.name)),
	};
};

export interface CaseStats {
	name: string;
	resultName: string;
	stale: boolean;
	set: string;
	source: string;
	nWith: number;
	nWithout: number;
	passesWith: number;
	passesWithout: number;
	rateWith: number;
	rateWithout: number;
	deltaRate: number;
	ci: Interval;
	fisherP: number;
	scoreWith: number;
	scoreWithout: number;
	deltaScore: number;
}

export const caseStats = (
	entry: Entry,
	confidence = EVAL_STATS_CONFIDENCE,
): CaseStats => {
	const w = entry.case.arms.with ?? [];
	const o = entry.case.arms.without ?? [];
	const pw = w.filter((r) => r.passed).length;
	const po = o.filter((r) => r.passed).length;
	const ok = w.length > 0 && o.length > 0;
	const scoreWith = mean(w.map((r) => r.score));
	const scoreWithout = mean(o.map((r) => r.score));
	return {
		name: entry.name,
		resultName: entry.case.name,
		stale: entry.stale,
		set: entry.set,
		source: entry.source,
		nWith: w.length,
		nWithout: o.length,
		passesWith: pw,
		passesWithout: po,
		rateWith: pw / w.length,
		rateWithout: po / o.length,
		deltaRate: pw / w.length - po / o.length,
		ci: ok
			? newcombe(pw, w.length, po, o.length, confidence)
			: { low: Number.NaN, high: Number.NaN },
		fisherP: ok ? fisherExact(pw, w.length, po, o.length) : Number.NaN,
		scoreWith,
		scoreWithout,
		deltaScore: scoreWith - scoreWithout,
	};
};

export interface SetStats {
	set: string;
	cases: number;
	meanDeltaRate: number;
	ciRate: Interval;
	meanDeltaScore: number;
	ciScore: Interval;
}

export const setStats = (
	cases: CaseStats[],
	seed: number,
	resamples = EVAL_STATS_RESAMPLES,
	confidence = EVAL_STATS_CONFIDENCE,
): SetStats[] => {
	const by = new Map<string, CaseStats[]>();
	for (const c of cases.filter(
		(x) => !x.stale && x.nWith > 0 && x.nWithout > 0,
	)) {
		by.set(c.set, [...(by.get(c.set) ?? []), c]);
	}
	return [...by.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([set, cs]) => {
			const rates = cs.map((c) => c.deltaRate);
			const scores = cs.map((c) => c.deltaScore);
			return {
				set,
				cases: cs.length,
				meanDeltaRate: mean(rates),
				ciRate: bootstrapMean(rates, seed, resamples, confidence),
				meanDeltaScore: mean(scores),
				ciScore: bootstrapMean(scores, seed, resamples, confidence),
			};
		});
};

export interface Agreement {
	case: string;
	grader: string;
	runs: number;
	agree: number;
}

/** For each `llm` grader, the runs (both arms) that hold judge votes, and how many of them have all votes equal. */
export const judgeAgreement = (entries: Entry[]): Agreement[] =>
	entries.flatMap(({ case: c, name }) =>
		(c.graders ?? [])
			.filter((x) => x.type === "llm")
			.map((g) => {
				const runs = [...(c.arms.with ?? []), ...(c.arms.without ?? [])]
					.map((r) => r.graders?.find((x) => x.name === g.name)?.judgeVotes)
					.filter((votes) => votes !== undefined && votes.length > 0);
				const agree = runs.filter((votes) =>
					votes?.every((v) => v === votes[0]),
				).length;
				return { case: name, grader: g.name, runs: runs.length, agree };
			}),
	);

export interface Report {
	sources: Source[];
	warnings: string[];
	cases: CaseStats[];
	sets: SetStats[];
	agreement: Agreement[];
}

export const buildReport = (
	files: { file: string; data: Aggregate }[],
	infos: Map<string, CaseInfo>,
	opts: {
		seed?: number;
		pick?: "newest" | "oldest";
		resamples?: number;
		version?: string;
	} = {},
): Report => {
	const kept =
		opts.version === undefined
			? files
			: files.filter((f) => f.data.claudeVersion === opts.version);
	const { sources, entries } = chooseEntries(kept, opts.pick, infos);
	const warnings: string[] = [];
	for (const [label, key] of [
		["Claude Code versions", "claudeVersion"],
		["models", "model"],
	] as const) {
		const values = [...new Set(sources.map((s) => s[key]))];
		if (values.length > 1) {
			warnings.push(`The files differ in ${label}: ${values.join(", ")}.`);
		}
	}
	for (const e of entries) {
		if (e.stale) {
			warnings.push(
				`The result of \`${e.case.name}\` (${e.source}) matches no current case, so it is stale and not in a set.`,
			);
		} else if (e.name !== e.case.name) {
			warnings.push(
				`The result of \`${e.case.name}\` (${e.source}) matches the current case \`${e.name}\`.`,
			);
		}
	}
	const cases = entries.map((e) => caseStats(e));
	return {
		sources,
		warnings,
		cases,
		sets: setStats(cases, opts.seed ?? EVAL_STATS_SEED, opts.resamples),
		agreement: judgeAgreement(entries),
	};
};

/** Prints the report of the result files named in the arguments, and returns the exit code. */
const main = async (): Promise<number> => {
	const args = argv.slice(2);
	const paths: string[] = [];
	let json = false;
	let version: string | undefined;
	let seed = EVAL_STATS_SEED;
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
			case "--pick":
				pick = args[++i] === "oldest" ? "oldest" : "newest";
				break;
			default:
				paths.push(a);
		}
	}
	if (paths.length === 0 || Number.isNaN(seed)) {
		console.error(
			"Usage: bun dev/stats/main.ts [--json] [--seed N] [--pick newest|oldest] [--version X] PATH...",
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
