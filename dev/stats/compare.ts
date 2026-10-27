// The statistics of each case and each set: the pass rates with and without the plugin, and the judge agreement.

import {
	EVAL_STATS_CONFIDENCE,
	EVAL_STATS_RESAMPLES,
} from "../../tools/limits.ts";
import type { Entry } from "./cases.ts";
import {
	bootstrapMean,
	fisherExact,
	type Interval,
	mean,
	newcombe,
} from "./math.ts";

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

/** The current cases that ran in both arms, grouped by set, with the sets in name order. */
export const bySet = (cases: CaseStats[]): [string, CaseStats[]][] => {
	const by = new Map<string, CaseStats[]>();
	for (const c of cases.filter(
		(x) => !x.stale && x.nWith > 0 && x.nWithout > 0,
	)) {
		by.set(c.set, [...(by.get(c.set) ?? []), c]);
	}
	return [...by.entries()].sort(([a], [b]) => a.localeCompare(b));
};

export const setStats = (
	cases: CaseStats[],
	seed: number,
	resamples = EVAL_STATS_RESAMPLES,
	confidence = EVAL_STATS_CONFIDENCE,
): SetStats[] =>
	bySet(cases).map(([set, cs]) => {
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
