// The text report of `dev/stats/main.ts`.

import type { Interval } from "./math.ts";
import type { Report } from "./report.ts";

const pct = (x: number): string =>
	Number.isNaN(x) ? "-" : `${(x * 100).toFixed(0)}%`;
const sgn = (x: number, digits = 2): string =>
	Number.isNaN(x) ? "-" : `${x >= 0 ? "+" : ""}${x.toFixed(digits)}`;
const ci = (i: Interval): string =>
	Number.isNaN(i.low) ? "-" : `[${sgn(i.low)}, ${sgn(i.high)}]`;

const table = (head: string[], rows: string[][]): string => {
	const w = head.map((h, i) =>
		Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)),
	);
	const line = (r: string[]): string =>
		r
			.map((c, i) => (i < 2 ? c.padEnd(w[i] ?? 0) : c.padStart(w[i] ?? 0)))
			.join("  ");
	return [line(head), ...rows.map(line)].join("\n");
};

export const formatReport = (r: Report): string => {
	const out: string[] = [];
	for (const s of r.sources) {
		out.push(
			`source ${s.file}: Claude Code ${s.claudeVersion}, model ${s.model}`,
		);
	}
	for (const w of r.warnings) {
		out.push(`WARNING: ${w}`);
	}
	out.push(
		"",
		"Cases (CI: Newcombe hybrid score, method 10, of the difference in pass rate)",
	);
	out.push(
		table(
			[
				"case",
				"set",
				"n w/o",
				"pass w",
				"pass w/o",
				"rate w",
				"rate w/o",
				"delta",
				"CI",
				"fisher p",
				"score w",
				"score w/o",
			],
			r.cases.map((c) => [
				c.name,
				c.set,
				`${c.nWith}/${c.nWithout}`,
				`${c.passesWith}`,
				`${c.passesWithout}`,
				pct(c.rateWith),
				pct(c.rateWithout),
				sgn(c.deltaRate),
				ci(c.ci),
				Number.isNaN(c.fisherP) ? "-" : c.fisherP.toFixed(4),
				c.scoreWith.toFixed(2),
				c.scoreWithout.toFixed(2),
			]),
		),
	);
	out.push("", "Sets (CI: bootstrap over cases)");
	out.push(
		table(
			[
				"set",
				"cases",
				"mean delta rate",
				"CI rate",
				"mean delta score",
				"CI score",
			],
			r.sets.map((s) => [
				s.set,
				`${s.cases}`,
				sgn(s.meanDeltaRate),
				ci(s.ciRate),
				sgn(s.meanDeltaScore),
				ci(s.ciScore),
			]),
		),
	);
	out.push(
		"",
		"Paired (case = cluster, runs averaged first, CI: mean +/- z * SE, Miller 2024)",
	);
	out.push(
		table(
			["set", "cases", "mean delta", "SE", "CI", "corr"],
			r.paired.map((p) => [
				p.set,
				`${p.cases}`,
				sgn(p.meanDelta),
				Number.isNaN(p.se) ? "-" : p.se.toFixed(3),
				ci(p.ci),
				sgn(p.correlation),
			]),
		),
	);
	for (const p of r.paired) {
		const q = p.power;
		out.push(
			`power ${p.set}: cases needed = (zAlpha + zBeta)^2 * variance / gap^2 = (${q.zAlpha.toFixed(3)} + ${q.zBeta.toFixed(3)})^2 * ${Number.isNaN(q.variance) ? "-" : q.variance.toFixed(4)} / ${q.gap}^2 = ${Number.isNaN(q.casesNeeded) ? "-" : q.casesNeeded}`,
		);
	}
	if (r.agreement.length > 0) {
		out.push("", "Judge agreement (runs where all judge votes agree)");
		out.push(
			table(
				["case", "grader", "runs", "agree", "share"],
				r.agreement.map((a) => [
					a.case,
					a.grader,
					`${a.runs}`,
					`${a.agree}`,
					a.runs === 0 ? "-" : pct(a.agree / a.runs),
				]),
			),
		);
	}
	return out.join("\n");
};
