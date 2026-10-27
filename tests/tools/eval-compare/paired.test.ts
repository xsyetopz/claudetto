// `dev/stats/paired.ts`: the paired difference of the arms, with its clustered standard error, its interval, and the power check.

import { expect, test } from "bun:test";
import type { Entry, Run } from "../../../dev/stats/cases.ts";
import { caseStats } from "../../../dev/stats/compare.ts";
import { formatReport } from "../../../dev/stats/format.ts";
import { pairedStats } from "../../../dev/stats/paired.ts";
import { buildReport } from "../../../dev/stats/report.ts";

const runs = (passes: boolean[]): Run[] =>
	passes.map((passed) => ({ passed, score: passed ? 1 : 0 }));

/** A current case of the set `demo` with the pass flags of each arm. */
const entry = (name: string, w: boolean[], o: boolean[]): Entry => ({
	source: "f.json",
	startedAt: "",
	name,
	set: "demo",
	stale: false,
	case: { name, arms: { with: runs(w), without: runs(o) } },
});

/**
 * The rates with the plugin are 1, 0.5, 1 and the rates without it are 0.5, 0.5, 0, so the runs of a case are averaged first.
 * The paired differences are 0.5, 0, 1, with mean 0.5 and variance 0.25 (n - 1), so the standard error is `sqrt(0.25 / 3)`.
 * The scores have deviations (1/6, -1/3, 1/6) and (1/6, 1/6, -1/3) from their means, so the correlation is `(-1/12) / (1/6)`, which is -0.5.
 * At the gap 0.2 the cases needed are `(1.959964 + 0.841621)^2 * 0.25 / 0.2^2`, which is 49.06, so 50.
 */
const fixture = [
	entry("a", [true, true], [true, false]),
	entry("b", [true, false, false, true], [true, false]),
	entry("c", [true, true], [false, false]),
];

test("`pairedStats` gives the mean difference, the clustered standard error, the interval, and the correlation", () => {
	const [p] = pairedStats(
		fixture.map((e) => caseStats(e)),
		0.2,
	);
	expect(p?.set).toBe("demo");
	expect(p?.cases).toBe(3);
	expect(p?.meanDelta).toBeCloseTo(0.5, 9);
	expect(p?.se).toBeCloseTo(Math.sqrt(0.25 / 3), 9);
	expect(p?.ci.low).toBeCloseTo(0.5 - 1.959_964 * Math.sqrt(0.25 / 3), 4);
	expect(p?.ci.high).toBeCloseTo(0.5 + 1.959_964 * Math.sqrt(0.25 / 3), 4);
	expect(p?.correlation).toBeCloseTo(-0.5, 9);
});

test("`pairedStats` gives the power check and the inputs of its formula", () => {
	const [p] = pairedStats(
		fixture.map((e) => caseStats(e)),
		0.2,
	);
	expect(p?.power.gap).toBe(0.2);
	expect(p?.power.variance).toBeCloseTo(0.25, 9);
	expect(p?.power.zAlpha).toBeCloseTo(1.959_964, 4);
	expect(p?.power.zBeta).toBeCloseTo(0.841_621, 4);
	expect(p?.power.casesNeeded).toBe(50);
});

test("`pairedStats` skips a stale case and a case with a missing arm, and gives NaN for one case", () => {
	const missing = entry("m", [true], []);
	const stale = { ...entry("s", [true], [false]), stale: true };
	const [p] = pairedStats(
		[...fixture, missing, stale].map((e) => caseStats(e)),
		0.2,
	);
	expect(p?.cases).toBe(3);
	const [one] = pairedStats([caseStats(entry("a", [true], [false]))], 0.2);
	expect(one?.cases).toBe(1);
	expect(one?.se).toBeNaN();
	expect(one?.power.casesNeeded).toBeNaN();
});

test("the report and its text hold the paired block", () => {
	const data = {
		claudeVersion: "1",
		cases: fixture.map((e) => e.case),
	};
	const info = new Map(
		fixture.map((e) => [e.name, { set: "demo", prompt: "", graders: [] }]),
	);
	const r = buildReport([{ file: "f.json", data }], info, { gap: 0.2 });
	expect(r.paired[0]?.power.casesNeeded).toBe(50);
	expect(JSON.stringify(r)).toContain('"casesNeeded":50');
	expect(formatReport(r)).toContain("Paired");
});
