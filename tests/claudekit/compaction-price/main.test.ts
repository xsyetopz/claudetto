// The whole wiring of the price run, with the paid steps replaced by a recorder, so these tests make no
// call. The one place that starts `claude` is `claudekit/probe/transport/claude.ts`, reached only from `runSteps`.

import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
	type Config,
	configOf,
	main,
	optionsOf,
	STEP_GROWTH_TOKENS,
	thresholdFor,
} from "../../../claudekit/compaction-price/main.ts";
import type { Step } from "../../../claudekit/probe/transport/events.ts";

/** A home folder holding one store of the in-tree plugin, whose rows price a compaction. */
const homeWith = async (rows: unknown[]): Promise<string> => {
	const home = await mkdtemp(path.join(tmpdir(), "price-home-"));
	const dir = path.join(home, ".claude/plugins/store");
	await mkdir(dir, { recursive: true });
	await writeFile(
		path.join(dir, "claudetto_inline-abc123.json"),
		JSON.stringify({ "window.rows": rows }),
	);
	return home;
};

const row = (over: Record<string, unknown> = {}) => ({
	at: Date.now() + 1000,
	task: "t1",
	source: "main",
	tokens: 20_000,
	window: 300_000,
	points: 1,
	usd: 0.01,
	...over,
});

const done: Step = {
	code: 0,
	events: [
		{
			type: "result",
			subtype: "success",
			session_id: "s",
			total_cost_usd: 0.18,
			num_turns: 6,
		},
	],
};

const recorder = () => {
	const seen: Config[] = [];
	const run = async (c: Config): Promise<Step[]> => {
		seen.push(c);
		return [done];
	};
	return { seen, run };
};

describe("main", () => {
	test("a run with no --run makes no call", async () => {
		const { seen, run } = recorder();

		await main([], await homeWith([]), run);

		expect(seen).toHaveLength(0);
	});

	test("--run makes the steps and prices the marked row", async () => {
		const { seen, run } = recorder();
		const home = await homeWith([
			row({ at: Date.now() + 1000, usd: 0.02 }),
			row({ at: Date.now() + 2000, usd: 0.01 }),
			row({ at: Date.now() + 3000, usd: 0.06, afterCompaction: true }),
			row({ at: Date.now() + 4000, usd: 0.01 }),
		]);

		await main(["--run"], home, run);

		expect(seen).toHaveLength(1);
		expect(seen[0]?.paid).toBe(true);
	});
});

describe("configOf", () => {
	test("takes the steps and the threshold from the flags", () => {
		const c = configOf(["--run", "--steps", "4", "--threshold", "25000"]);

		expect(c.steps).toBe(4);
		expect(c.threshold).toBe(25_000);
		expect(c.paid).toBe(true);
	});

	test("leaves the threshold unset so the run calibrates it", () => {
		// A fixed default cannot work: the context of the first step is almost all the plugin's own
		// prompt, which the run of 2026-10-30 measured at 22,622 tokens against a default of 30,000 that
		// its six steps never reached, so it billed 0.28 and priced nothing.
		expect(configOf([]).threshold).toBeUndefined();
	});
});

describe("optionsOf", () => {
	test("turns the handler on only for the arm that asks for it", () => {
		expect(optionsOf(configOf(["--cheap-summary"]))).toEqual({
			cheapSummary: "on",
		});
		expect(optionsOf(configOf([]))).toEqual({});
	});

	test("the two arms differ in that option and in nothing else", () => {
		const engine = configOf(["--run", "--threshold", "25000"]);
		const handler = configOf([
			"--run",
			"--threshold",
			"25000",
			"--cheap-summary",
		]);

		expect({ ...handler, cheapSummary: false }).toEqual(engine);
	});
});

describe("thresholdFor", () => {
	test("sits above the measured context by two steps of growth", () => {
		expect(thresholdFor(22_622)).toBe(22_622 + 2 * STEP_GROWTH_TOKENS);
	});

	test("lands inside the band the six measured steps cross", () => {
		// The run of 2026-10-30 climbed 22,622, 23,767, 24,902, 26,047, 27,182, 28,319. A threshold must
		// sit above the first, so step one does not compact, and below the fifth, so a plain step follows
		// the marked one.
		const threshold = thresholdFor(22_622);

		expect(threshold).toBeGreaterThan(22_622);
		expect(threshold).toBeLessThan(27_182);
	});

	test("refuses fewer steps than a baseline needs", () => {
		expect(() => configOf(["--steps", "2"])).toThrow();
	});

	test("refuses a model that is not one of the three", () => {
		expect(() => configOf(["--model", "gpt"])).toThrow();
	});
});
