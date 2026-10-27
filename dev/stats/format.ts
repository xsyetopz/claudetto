// The text report of `dev/stats/main.ts`.

import type { Report } from "./main.ts";
import type { Interval } from "./math.ts";

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
