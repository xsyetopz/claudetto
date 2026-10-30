import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EVAL_MIN_RUNS_PER_ARM } from "../../limits.ts";
import { main, parseArgs } from "../cli.ts";
import type { Outcome } from "../execute.ts";
import { RULE_CASES, type RuleCase } from "../main-rules.ts";
import { reportLines, tally } from "../report.ts";
import { isSession, ok, stubRunner } from "./stub.ts";

const outcome = (
	verdict: "pass" | "fail" | "error",
	arm: "main.md" | "the default body" = "main.md",
): Outcome => ({
	session: { key: "K", arm, run: 1 },
	score: { verdict, detail: "" },
});

const CASE_K: RuleCase = {
	codes: ["K"],
	section: "scope",
	rule: "r",
	scenario: "s",
	passes: "p",
	fails: "f",
	graders: [{ kind: "tree", check: "c" }],
};
const CASE_Z: RuleCase = { ...CASE_K, codes: ["Z"] };

const makeRoot = async (): Promise<string> => {
	const root = await mkdtemp(join(tmpdir(), "evals-cli-"));
	await mkdir(join(root, "K", "repo"), { recursive: true });
	await writeFile(join(root, "K", "prompt.txt"), "go\n");
	await writeFile(join(root, "K", "repo", "a.txt"), "a\n");
	return root;
};

describe("the arguments", () => {
	test("default to plan mode", () => {
		expect(parseArgs([])).toEqual({ run: false, request: {} });
	});

	test("read every flag", () => {
		const options = parseArgs([
			"--run",
			"--case",
			"I13",
			"--arm",
			"main.md",
			"--runs",
			"4",
			"--model",
			"sonnet",
			"--budget",
			"1.5",
		]);

		expect(options).toEqual({
			run: true,
			request: { only: "I13", arm: "main.md", runs: 4 },
			model: "sonnet",
			maxBudgetUsd: 1.5,
		});
	});

	test("refuse an unknown arm, an unknown flag, a zero run count, and a missing value", () => {
		for (const bad of [
			["--arm", "plugin"],
			["--nope", "x"],
			["--runs", "0"],
			["--budget", "-1"],
			["--case"],
		]) {
			expect("error" in parseArgs(bad)).toBe(true);
		}
	});
});

describe("plan mode", () => {
	test("lists the sessions and the model calls, and starts no command", async () => {
		const root = await makeRoot();
		const { run, calls } = stubRunner();
		const lines: string[] = [];

		const status = await main(["--runs", "2"], {
			run,
			out: (line) => lines.push(line),
			fixturesRoot: root,
			cases: [CASE_K, CASE_Z],
		});

		expect(status).toBe(0);
		expect(calls).toHaveLength(0);
		expect(lines.filter((l) => l.startsWith("session "))).toHaveLength(2 * 2);
		expect(lines).toContain("model calls: 4");
		expect(lines.filter((l) => l.startsWith("unseeded "))).toHaveLength(1);
	});

	test("over the shipped inventory plans the seeded case alone and names the rest", async () => {
		const { run, calls } = stubRunner();
		const lines: string[] = [];

		const status = await main([], { run, out: (line) => lines.push(line) });

		expect(status).toBe(0);
		expect(calls).toHaveLength(0);
		expect(lines).toContain(`model calls: ${2 * EVAL_MIN_RUNS_PER_ARM}`);
		expect(lines.filter((l) => l.startsWith("unseeded "))).toHaveLength(
			RULE_CASES.length - 1,
		);
	});

	test("a bad argument exits 2 and prints the usage", async () => {
		const { run, calls } = stubRunner();
		const lines: string[] = [];

		const status = await main(["--arm", "plugin"], {
			run,
			out: (line) => lines.push(line),
		});

		expect(status).toBe(2);
		expect(calls).toHaveLength(0);
		expect(lines.some((l) => l.startsWith("usage:"))).toBe(true);
	});
});

describe("run mode", () => {
	test("starts one session per planned session, through the runner only", async () => {
		const root = await makeRoot();
		const { run, calls } = stubRunner();
		const lines: string[] = [];

		const status = await main(["--run", "--case", "K", "--runs", "1"], {
			run,
			out: (line) => lines.push(line),
			fixturesRoot: root,
			cases: [CASE_K],
			root: "/repo",
		});

		expect(status).toBe(0);
		expect(calls.filter(isSession)).toHaveLength(2);
		expect(lines.some((l) => l.startsWith("2 sessions: 2 pass"))).toBe(true);
	});

	test("exits 1 when a session could not be graded", async () => {
		const root = await makeRoot();
		const { run } = stubRunner((call) =>
			call.argv[0] === "bun" ? ok({ code: 2 }) : ok(),
		);

		const status = await main(["--run", "--case", "K", "--runs", "1"], {
			run,
			out: () => undefined,
			fixturesRoot: root,
			cases: [CASE_K],
		});

		expect(status).toBe(1);
	});
});

describe("the report", () => {
	test("counts each verdict per case and arm", () => {
		const rows = tally([
			outcome("pass"),
			outcome("fail"),
			outcome("error"),
			outcome("pass", "the default body"),
		]);

		expect(rows).toEqual([
			{ key: "K", arm: "main.md", pass: 1, fail: 1, error: 1 },
			{ key: "K", arm: "the default body", pass: 1, fail: 0, error: 0 },
		]);
	});

	test("leaves an error out of the rate", () => {
		const lines = reportLines([outcome("pass"), outcome("error")]);

		expect(lines.some((l) => l.includes("| 100% |"))).toBe(true);
	});

	test("marks an arm citable only from the minimum runs, errors not counted", () => {
		const enough = Array.from({ length: EVAL_MIN_RUNS_PER_ARM }, () =>
			outcome("pass"),
		);
		const short = [...enough.slice(1), outcome("error")];

		expect(reportLines(enough).some((l) => l.endsWith("| yes |"))).toBe(true);
		expect(reportLines(short).some((l) => l.endsWith("| no |"))).toBe(true);
	});

	test("totals the verdicts", () => {
		const lines = reportLines([
			outcome("pass"),
			outcome("fail"),
			outcome("fail"),
		]);

		expect(lines.at(-1)).toBe("3 sessions: 1 pass, 2 fail, 0 error.");
	});
});
