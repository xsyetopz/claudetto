// The report of the result files: the statistics, and the warnings about files that differ.

import { EVAL_STATS_GAP, EVAL_STATS_SEED } from "../../tools/limits.ts";
import {
	type Aggregate,
	type CaseInfo,
	chooseEntries,
	type Source,
} from "./cases.ts";
import {
	type Agreement,
	type CaseStats,
	caseStats,
	judgeAgreement,
	type SetStats,
	setStats,
} from "./compare.ts";
import { type PairedStats, pairedStats } from "./paired.ts";

export interface Report {
	sources: Source[];
	warnings: string[];
	cases: CaseStats[];
	sets: SetStats[];
	paired: PairedStats[];
	agreement: Agreement[];
}

export const buildReport = (
	files: { file: string; data: Aggregate }[],
	infos: Map<string, CaseInfo>,
	opts: {
		seed?: number;
		pick?: "newest" | "oldest";
		resamples?: number;
		gap?: number;
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
		paired: pairedStats(cases, opts.gap ?? EVAL_STATS_GAP),
		agreement: judgeAgreement(entries),
	};
};
