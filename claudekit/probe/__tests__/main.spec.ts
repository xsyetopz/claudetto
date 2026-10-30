import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { output } from "../../output.ts";
import { main } from "../main.ts";
import { expectedUsd } from "../plan/cost.ts";
import {
	CITABLE_MIN_RUNS,
	DEFAULT_RUNS,
	floorLine,
	ranLine,
} from "../plan/floor.ts";
import { DEFAULT_SIZES } from "../plan/plan.ts";
import type { Runners } from "../round/round.ts";
import { forksOf, result } from "./stub.ts";

const recording = (): { runners: Runners; log: string[] } => {
	const log: string[] = [];
	const runners: Runners = {
		base: (_dir, size) => {
			log.push(`base ${size}`);
			return Promise.resolve({
				id: "base-id",
				context: size + 5000,
				base: { cost: 0.5, read: new Set(), edited: new Set() },
			});
		},
		fork: (f) => {
			log.push(`fork ${f.arm}${f.run}`);
			return Promise.resolve(
				result({
					arm: f.arm,
					size: f.size,
					run: f.run,
					cost: f.arm === "alt" ? 0.8 : 1,
				}),
			);
		},
	};
	return { runners, log };
};

const dear = (): Runners => {
	const { runners } = recording();
	return {
		base: runners.base,
		fork: async (f, dir, start) =>
			result({ ...(await runners.fork(f, dir, start)), cost: 3 }),
	};
};

let root = "";
beforeEach(async () => {
	root = await mkdtemp(path.join(os.tmpdir(), "probe-test-"));
});
afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

describe("main, free by default", () => {
	test("bare, it exits 0 and reaches no runner", async () => {
		const { runners, log } = recording();
		const out = output();

		const code = await main([], runners, out.write);

		expect(code).toBe(0);
		expect(log).toEqual([]);
	});

	test("bare, it prints the floor line, the fork count, and the expected cost", async () => {
		const { runners } = recording();
		const out = output();

		await main([], runners, out.write);

		const forks = 2 * DEFAULT_RUNS;
		expect(out.text()).toContain(floorLine(DEFAULT_RUNS));
		expect(out.text()).toContain(`${forks} forks`);
		expect(out.text()).toContain(expectedUsd(forks, 1).toFixed(2));
	});

	test("`--base-only` prices the bases alone and plans no fork", async () => {
		const { runners, log } = recording();
		const out = output();

		const code = await main(["--base-only"], runners, out.write);

		expect(code).toBe(0);
		expect(log).toEqual([]);
		expect(out.text()).toContain("0 forks and 1 base sessions");
		expect(out.text()).toContain(expectedUsd(0, 1).toFixed(2));
		// It compares no arm, so it may not claim the citable floor.
		expect(out.text()).not.toContain(floorLine(DEFAULT_RUNS));
	});

	test("with `--dry-run` it reaches no runner either", async () => {
		const { runners, log } = recording();

		const code = await main(
			["--dry-run", "--runs", "5"],
			runners,
			output().write,
		);

		expect(code).toBe(0);
		expect(log).toEqual([]);
	});

	test("it prints the floor of a smoke count as the smoke floor", async () => {
		const { runners } = recording();
		const out = output();

		await main(["--runs", "3"], runners, out.write);

		expect(out.text()).toContain(floorLine(3));
		expect(out.text()).not.toContain(floorLine(DEFAULT_RUNS));
	});

	test("a run count below the smoke floor is a usage error and reaches no runner", async () => {
		const { runners, log } = recording();

		const code = await main(["--run", "--runs", "2"], runners, output().write);

		expect(code).toBe(2);
		expect(log).toEqual([]);
	});

	test("`--report` reports a round that already ran and reaches no runner", async () => {
		const { runners, log } = recording();
		const out = output();
		const saved = [
			...forksOf("ref", 3),
			...forksOf("alt", 3, { cost: 0.8 }),
		].map((r) => JSON.stringify(r));
		await writeFile(path.join(root, "results.jsonl"), `${saved.join("\n")}\n`);

		const code = await main(["--report", "--dir", root], runners, out.write);

		expect(code).toBe(0);
		expect(log).toEqual([]);
		expect(out.text()).toContain("6 forks read");
		expect(out.text()).toContain("ref 30k: 1.00");
		expect(out.text()).toContain(ranLine(3));
	});

	test("`--report` on a folder with no saved fork exits 1", async () => {
		const { runners } = recording();

		const code = await main(
			["--report", "--dir", root],
			runners,
			output().write,
		);

		expect(code).toBe(1);
	});

	test("`--report` with `--run` is a usage error and reaches no runner", async () => {
		const { runners, log } = recording();

		const code = await main(
			["--run", "--report", "--dir", root],
			runners,
			output().write,
		);

		expect(code).toBe(2);
		expect(log).toEqual([]);
	});

	test("an unknown model is a usage error and reaches no runner", async () => {
		const { runners, log } = recording();

		const code = await main(
			["--run", "--model", "gpt"],
			runners,
			output().write,
		);

		expect(code).toBe(2);
		expect(log).toEqual([]);
	});

	test("`--run` with `--dry-run` is a usage error and reaches no runner", async () => {
		const { runners, log } = recording();

		const code = await main(["--run", "--dry-run"], runners, output().write);

		expect(code).toBe(2);
		expect(log).toEqual([]);
	});

	test("an alternative threshold equal to the reference is a usage error", async () => {
		const { runners, log } = recording();

		const code = await main(
			["--alt-threshold", "140000"],
			runners,
			output().write,
		);

		expect(code).toBe(2);
		expect(log).toEqual([]);
	});
});

describe("main, paid only when asked", () => {
	test("`--run` calls the runners, floor line first", async () => {
		const { runners, log } = recording();
		const out = output();
		const order: string[] = [];
		const write = (s: string) => {
			order.push(`write ${log.length}`);
			out.write(s);
		};

		const code = await main(
			["--run", "--runs", "3", "--dir", root],
			runners,
			write,
		);

		expect(code).toBe(0);
		expect(log.filter((l) => l.startsWith("fork"))).toHaveLength(6);
		expect(order[0]).toBe("write 0");
		expect(out.text()).toContain(floorLine(3));
	});

	test("`--run --base-only` builds the base and runs no fork", async () => {
		const { runners, log } = recording();
		const out = output();

		const code = await main(
			["--run", "--base-only", "--dir", root],
			runners,
			out.write,
		);

		expect(code).toBe(0);
		expect(log).toEqual([`base ${DEFAULT_SIZES[0]}`]);
		expect(out.text()).toContain("no verdict is reached");
	});

	test("`--run` saves each fork to `results.jsonl` and reports the cost of each", async () => {
		const { runners } = recording();
		const out = output();

		await main(["--run", "--runs", "3", "--dir", root], runners, out.write);

		const lines = (await readFile(path.join(root, "results.jsonl"), "utf8"))
			.trim()
			.split("\n");
		expect(lines).toHaveLength(6);
		expect(out.text()).toContain("0.8");
	});

	test("a round over its cap stops and exits 1", async () => {
		const { runners, log } = recording();

		const code = await main(
			["--run", "--runs", "3", "--dir", root, "--max-total-usd", "1.5"],
			runners,
			output().write,
		);

		expect(code).toBe(1);
		expect(log.filter((l) => l.startsWith("fork")).length).toBeLessThan(6);
	});

	test("a round the cap cut short still reports the forks that ran", async () => {
		const out = output();

		// The cap pays for two forks of 3 and stops, so the round ends with one fork in each arm.
		await main(
			["--run", "--runs", "3", "--dir", root, "--max-total-usd", "6"],
			dear(),
			out.write,
		);

		expect(out.text()).toContain(
			`ref ${(DEFAULT_SIZES[0] ?? 0) / 1000}k: 3.00`,
		);
		expect(out.text()).toContain("No winner");
	});

	test("a round the cap cut short does not claim the citable floor it planned", async () => {
		const out = output();

		await main(
			[
				"--run",
				"--runs",
				String(CITABLE_MIN_RUNS),
				"--dir",
				root,
				"--max-total-usd",
				"6",
			],
			dear(),
			out.write,
		);

		expect(out.text()).toContain(floorLine(CITABLE_MIN_RUNS));
		expect(out.text()).toContain(ranLine(1));
	});

	test("a base that is already past the lower threshold stops before any fork", async () => {
		const { runners, log } = recording();

		const code = await main(
			["--run", "--runs", "3", "--dir", root, "--sizes", "110000"],
			runners,
			output().write,
		);

		expect(code).toBe(1);
		expect(log.some((l) => l.startsWith("fork"))).toBe(false);
	});
});
