import type { ArmCheck } from "../arm/arm.ts";
import type { Verdict } from "../grade/grade.ts";
import { admit, appendEntry, cost, type Entry, type Ledger, readLedger, tokensOf, type Usage } from "../ledger/ledger.ts";
import type { Model } from "../shared/model.ts";

export interface Experiment<A extends { name: string }, C extends { name: string }> {
	name: string;
	arms: A[];
	cases: C[];
	n: number;
	parallel: number;
	tokenBoundPerRun: number;
	// Overrides tokenBoundPerRun for one case, so the plan's bound follows each case's size.
	boundOf?: (c: C) => number;
}

export interface Session<A, C> {
	arm: A;
	case: C;
	index: number;
}

export interface Plan {
	sessions: { arm: string; case: string; index: number }[];
	tokenBound: number;
}

export interface SessionResult {
	runId: string;
	model: Model;
	usage: Usage;
	// The run was killed for passing its token cap, so usage is what the stream showed by then.
	capped?: boolean;
	verdict: Verdict;
	armCheck: Pick<ArmCheck, "ok" | "diff">;
}

export interface Counts {
	pass: number;
	n: number;
}

export type Decision = "better" | "worse" | "no difference";

export interface CaseReport {
	case: string;
	base: string;
	byArm: Record<string, Counts & { rate: number; interval: [number, number] }>;
	vsBase: Record<string, { decision: Decision; separates: boolean; note?: string }>;
}

export interface Report {
	plan: Plan;
	results: (Session<string, string> & SessionResult)[];
	cases: CaseReport[];
	// Sessions whose arm check failed; their verdicts count in no rate.
	rejected: { arm: string; case: string; index: number; runId: string; diff: string[] }[];
	usd: number;
}

const Z95 = 1.959_964;
export const NO_SEPARATION = "case does not separate the arms";

export const planExperiment = <A extends { name: string }, C extends { name: string }>(e: Experiment<A, C>): Plan => {
	const sessions = e.cases.flatMap((c) =>
		e.arms.flatMap((a) => Array.from({ length: e.n }, (_, index) => ({ arm: a.name, case: c.name, index }))),
	);
	const bound = new Map(e.cases.map((c) => [c.name, e.boundOf?.(c) ?? e.tokenBoundPerRun]));
	const tokenBound = sessions.reduce((n, s) => n + (bound.get(s.case) ?? e.tokenBoundPerRun), 0);
	return { sessions, tokenBound };
};

export const wilson = (k: number, n: number, z = Z95): [number, number] => {
	if (n === 0) {
		return [0, 1];
	}
	const p = k / n;
	const z2 = z * z;
	const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
	const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
	return [Math.max(0, centre - half), Math.min(1, centre + half)];
};

// Newcombe's hybrid score interval for arm rate minus base rate, built from the two Wilson intervals.
export const differenceInterval = (base: Counts, arm: Counts, z = Z95): [number, number] => {
	const p1 = base.pass / base.n;
	const p2 = arm.pass / arm.n;
	const [l1, u1] = wilson(base.pass, base.n, z);
	const [l2, u2] = wilson(arm.pass, arm.n, z);
	const d = p2 - p1;
	return [d - Math.sqrt((p2 - l2) ** 2 + (u1 - p1) ** 2), d + Math.sqrt((u2 - p2) ** 2 + (p1 - l1) ** 2)];
};

// One rule for both directions: swapping base and arm swaps "better" and "worse" and nothing else.
export const decide = (base: Counts, arm: Counts, opts: { margin: number }): Decision => {
	const [lo, hi] = differenceInterval(base, arm);
	if (lo > opts.margin) {
		return "better";
	}
	if (hi < -opts.margin) {
		return "worse";
	}
	return "no difference";
};

export const separates = (base: Counts, arm: Counts): boolean => base.pass * arm.n !== arm.pass * base.n;

export const summarize = (
	results: { arm: string; case: string; verdict: Verdict; armCheck: Pick<ArmCheck, "ok"> }[],
	opts: { base: string; margin: number },
): CaseReport[] => {
	const asserted = results.filter((r) => r.armCheck.ok);
	const caseNames = [...new Set(results.map((r) => r.case))];
	return caseNames.map((c) => {
		const byArm: CaseReport["byArm"] = {};
		for (const r of asserted.filter((x) => x.case === c)) {
			const counts = byArm[r.arm] ?? { pass: 0, n: 0, rate: 0, interval: [0, 1] };
			counts.n++;
			counts.pass += r.verdict.pass ? 1 : 0;
			counts.rate = counts.pass / counts.n;
			counts.interval = wilson(counts.pass, counts.n);
			byArm[r.arm] = counts;
		}
		const base = byArm[opts.base];
		if (!base) {
			throw new Error(`case ${c} has no asserted run of the base arm ${opts.base}`);
		}
		const vsBase: CaseReport["vsBase"] = {};
		for (const [arm, counts] of Object.entries(byArm)) {
			if (arm === opts.base) {
				continue;
			}
			const split = separates(base, counts);
			vsBase[arm] = {
				decision: decide(base, counts, { margin: opts.margin }),
				separates: split,
				...(split ? {} : { note: NO_SEPARATION }),
			};
		}
		return { case: c, base: opts.base, byArm, vsBase };
	});
};

const pool = async <T, R>(items: T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> => {
	const out: R[] = new Array(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const i = next++;
			out[i] = await work(items[i] as T);
		}
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return out;
};

export const runExperiment = async <A extends { name: string }, C extends { name: string }>(
	e: Experiment<A, C>,
	opts: {
		run: boolean;
		ledger: string;
		base: string;
		margin: number;
		// Defaults to the kit's 2,000,000; a larger goal needs the user's approval.
		goalCap?: number;
		onEntry?: (entry: Entry, ledger: Ledger) => void;
		session: (s: Session<A, C>) => Promise<SessionResult>;
	},
): Promise<Report> => {
	const plan = planExperiment(e);
	if (!opts.run) {
		throw new Error(`plan only: ${plan.sessions.length} sessions, bound ${plan.tokenBound} tokens; pass run to call`);
	}
	const ledger = await readLedger(opts.ledger);
	for (const check of [
		admit(ledger, { bound: Math.max(e.tokenBoundPerRun, ...e.cases.map((c) => e.boundOf?.(c) ?? 0)), ...(opts.goalCap ? { goalCap: opts.goalCap } : {}) }),
		admit(ledger, { bound: plan.tokenBound, runCap: Number.POSITIVE_INFINITY, ...(opts.goalCap ? { goalCap: opts.goalCap } : {}) }),
	]) {
		if (!check.ok) {
			throw new Error(`refused: ${check.reason}`);
		}
	}
	const arms = new Map(e.arms.map((a) => [a.name, a]));
	const cases = new Map(e.cases.map((c) => [c.name, c]));
	let usd = 0;
	const results = await pool(plan.sessions, e.parallel, async (s) => {
		const r = await opts.session({ arm: arms.get(s.arm) as A, case: cases.get(s.case) as C, index: s.index });
		const entry: Entry = {
			at: new Date().toISOString(),
			probe: e.name,
			runId: r.runId,
			model: r.model,
			tokens: tokensOf(r.usage),
			usd: cost(r.model, r.usage),
			note: `${s.arm} ${s.case} ${s.index}${r.capped ? " capped" : ""}`,
		};
		const after = await appendEntry(opts.ledger, entry);
		opts.onEntry?.(entry, after);
		usd += entry.usd;
		return { ...s, ...r };
	});
	const rejected = results
		.filter((r) => !r.armCheck.ok)
		.map((r) => ({ arm: r.arm, case: r.case, index: r.index, runId: r.runId, diff: r.armCheck.diff }));
	return { plan, results, cases: summarize(results, opts), rejected, usd };
};
