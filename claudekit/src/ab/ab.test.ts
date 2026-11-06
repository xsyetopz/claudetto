import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { readLedger } from "../ledger/ledger.ts";
import { DEFAULT_MODEL } from "../shared/model.ts";
import { tempDir } from "../shared/temp.ts";
import {
	decide,
	type Experiment,
	NO_SEPARATION,
	planExperiment,
	runExperiment,
	separates,
	summarize,
	wilson,
} from "./ab.ts";

const PLAN_ONLY = /plan only: 4 sessions, bound 4000 tokens/;
const OVER_RUN_CAP = /refused: run bound 300001/;
const OVER_GOAL_CAP = /refused: total 0 \+ bound 2002000 > cap 2000000/;

const experiment = (over: Partial<Experiment<{ name: string }, { name: string }>> = {}) => ({
	name: "ab-unit",
	arms: [{ name: "base" }, { name: "arm" }],
	cases: [{ name: "c1" }],
	n: 2,
	parallel: 2,
	tokenBoundPerRun: 1000,
	...over,
});

const verdict = (pass: boolean) => ({ pass, label: pass ? "ok" : "bad", evidence: "" });
const asserted = { ok: true, diff: [] };

describe("wilson", () => {
	test("matches the published 95% intervals", () => {
		const [l0, u0] = wilson(0, 10);
		expect(l0).toBe(0);
		expect(u0).toBeCloseTo(0.2775, 4);
		const [l5, u5] = wilson(5, 10);
		expect(l5).toBeCloseTo(0.2366, 4);
		expect(u5).toBeCloseTo(0.7634, 4);
	});
});

describe("decide", () => {
	test("calls a clear gap in either direction", () => {
		expect(decide({ pass: 0, n: 20 }, { pass: 20, n: 20 }, { margin: 0 })).toBe("better");
		expect(decide({ pass: 20, n: 20 }, { pass: 0, n: 20 }, { margin: 0 })).toBe("worse");
	});

	test("calls no difference on thin samples", () => {
		expect(decide({ pass: 5, n: 10 }, { pass: 7, n: 10 }, { margin: 0 })).toBe("no difference");
	});

	test("mirrors exactly when base and arm swap", () => {
		const flip = { better: "worse", worse: "better", "no difference": "no difference" } as const;
		for (let a = 0; a <= 10; a++) {
			for (let b = 0; b <= 10; b++) {
				const ab = decide({ pass: a, n: 10 }, { pass: b, n: 10 }, { margin: 0.05 });
				const ba = decide({ pass: b, n: 10 }, { pass: a, n: 10 }, { margin: 0.05 });
				expect(ba).toBe(flip[ab]);
			}
		}
	});
});

describe("separates", () => {
	test("is false only when the rates are equal", () => {
		expect(separates({ pass: 0, n: 10 }, { pass: 0, n: 10 })).toBe(false);
		expect(separates({ pass: 3, n: 9 }, { pass: 4, n: 12 })).toBe(false);
		expect(separates({ pass: 3, n: 10 }, { pass: 4, n: 10 })).toBe(true);
	});

	test("the report says so for a case that does not separate", () => {
		const results = ["base", "arm"].flatMap((arm) => [true, false].map((p) => ({ arm, case: "c1", verdict: verdict(p), armCheck: asserted })));
		const [r] = summarize(results, { base: "base", margin: 0 });
		expect(r?.vsBase.arm).toEqual({ decision: "no difference", separates: false, note: NO_SEPARATION });
		expect(r?.byArm.base).toMatchObject({ pass: 1, n: 2, rate: 0.5 });
	});
});

describe("runExperiment", () => {
	const usage = { input_tokens: 10, output_tokens: 5 };

	test("plans arms x cases x n without a call", () => {
		expect(planExperiment(experiment()).tokenBound).toBe(4000);
	});

	test("refuses to call without run", async () => {
		let calls = 0;
		const session = async () => {
			calls++;
			return { runId: "r", model: DEFAULT_MODEL, usage, verdict: verdict(true), armCheck: asserted };
		};
		const ledger = join(await tempDir("ab"), "ledger.jsonl");
		await expect(runExperiment(experiment(), { run: false, ledger, base: "base", margin: 0, session })).rejects.toThrow(PLAN_ONLY);
		expect(calls).toBe(0);
	});

	test("refuses a bound over either cap before any call", async () => {
		const ledger = join(await tempDir("ab"), "ledger.jsonl");
		const session = async () => {
			throw new Error("called");
		};
		const opts = { run: true, ledger, base: "base", margin: 0, session };
		await expect(runExperiment(experiment({ tokenBoundPerRun: 300_001 }), opts)).rejects.toThrow(OVER_RUN_CAP);
		await expect(runExperiment(experiment({ n: 1001 }), opts)).rejects.toThrow(OVER_GOAL_CAP);
	});

	test("records one ledger entry per session and keeps the parallel limit", async () => {
		const ledger = join(await tempDir("ab"), "ledger.jsonl");
		let live = 0;
		let peak = 0;
		const report = await runExperiment(experiment({ n: 3, parallel: 2 }), {
			run: true,
			ledger,
			base: "base",
			margin: 0,
			session: async (s) => {
				live++;
				peak = Math.max(peak, live);
				await Bun.sleep(5);
				live--;
				return {
					runId: `${s.arm.name}-${s.index}`,
					model: DEFAULT_MODEL,
					usage,
					verdict: verdict(s.arm.name === "arm"),
					armCheck: asserted,
				};
			},
		});
		expect(peak).toBe(2);
		expect((await readLedger(ledger)).entries).toHaveLength(6);
		expect(report.cases[0]?.byArm).toMatchObject({ base: { pass: 0, n: 3 }, arm: { pass: 3, n: 3 } });
		expect(report.rejected).toEqual([]);
		expect(report.usd).toBeGreaterThan(0);
	});

	test("a session whose arm check failed counts in no rate, is listed with its diff, and is still billed", async () => {
		const ledger = join(await tempDir("ab"), "ledger.jsonl");
		const wrongArm = { ok: false, diff: ["plugin demo: not loaded; loaded []"] };
		const report = await runExperiment(experiment({ n: 2 }), {
			run: true,
			ledger,
			base: "base",
			margin: 0,
			session: async (s) => ({
				runId: `${s.arm.name}-${s.index}`,
				model: DEFAULT_MODEL,
				usage,
				verdict: verdict(true),
				armCheck: s.arm.name === "arm" && s.index === 0 ? wrongArm : asserted,
			}),
		});
		expect(report.cases[0]?.byArm.arm).toMatchObject({ pass: 1, n: 1 });
		expect(report.rejected).toEqual([{ arm: "arm", case: "c1", index: 0, runId: "arm-0", diff: wrongArm.diff }]);
		expect((await readLedger(ledger)).entries).toHaveLength(4);
	});
});
