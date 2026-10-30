// Every expected count is arithmetic written out from the case and arm lists, not a figure copied from the tool.

import { describe, expect, test } from "bun:test";
import type { Forwarded } from "../../../claudekit/api/split.ts";
import { costOf } from "../../../claudekit/price/cost.ts";
import { inlinePluginOptions } from "../../../claudekit/session/argv.ts";
import type { CommandResult } from "../../../claudekit/session/command.ts";
import { EVAL_MIN_RUNS_PER_ARM } from "../../limits.ts";
import { CLASSIFIER_ARMS, classifierArgv } from "../classifier/arms.ts";
import { CLASSIFIER_CASES } from "../classifier/cases.ts";
import { ACTION_ID, gradeSession } from "../classifier/grade.ts";
import {
	classifierMain,
	parseClassifierArgs,
	planClassifier,
	reportLines,
} from "../classifier/main.ts";
import { armRequest, sessionUsd } from "../classifier/price.ts";

const FORWARDED: Forwarded = {
	model: "claude-haiku-5-5",
	maxTokens: 200,
	bodyChars: 10,
	status: 200,
	reply: "{}",
	usage: undefined,
};

const ranWith = (denials: readonly string[]): CommandResult => ({
	code: 0,
	stdout: JSON.stringify({
		type: "result",
		permission_denials: denials.map((id) => ({
			tool_name: "Bash",
			tool_use_id: id,
			tool_input: {},
		})),
	}),
	stderr: "",
	timedOut: false,
});

describe("the classifier cases", () => {
	test("are half must-block and half must-allow, with unique keys", () => {
		const blocks = CLASSIFIER_CASES.filter((row) => row.label === "block");
		expect(blocks.length * 2).toBe(CLASSIFIER_CASES.length);
		expect(new Set(CLASSIFIER_CASES.map((row) => row.key)).size).toBe(
			CLASSIFIER_CASES.length,
		);
	});
});

describe("the classifier plan", () => {
	test("is every case times every arm times the runs by default", () => {
		const options = parseClassifierArgs([]);
		if ("error" in options) {
			throw new Error(options.error);
		}
		expect(planClassifier(options)).toHaveLength(
			CLASSIFIER_CASES.length * CLASSIFIER_ARMS.length * EVAL_MIN_RUNS_PER_ARM,
		);
	});

	test("narrows to one case, one arm, and the given runs", () => {
		const key = CLASSIFIER_CASES[0]?.key ?? "";
		const options = parseClassifierArgs([
			"--case",
			key,
			"--arm",
			"haiku",
			"--runs",
			"3",
		]);
		if ("error" in options) {
			throw new Error(options.error);
		}
		expect(planClassifier(options).map((one) => one.session)).toEqual([
			{ key, arm: "haiku", run: 1 },
			{ key, arm: "haiku", run: 2 },
			{ key, arm: "haiku", run: 3 },
		]);
	});

	test("refuses an arm it does not know", () => {
		expect(parseClassifierArgs(["--arm", "opus"])).toEqual({
			error: "opus is not a value of --arm",
		});
	});

	test("prints the price and starts nothing without `--run`", async () => {
		const lines: string[] = [];
		const code = await classifierMain(["--arm", "suite", "--runs", "1"], {
			run: () => {
				throw new Error("a plan must not start a session");
			},
			out: (line) => lines.push(line),
		});
		const usd = CLASSIFIER_CASES.length * sessionUsd("suite");
		expect(code).toBe(0);
		expect(lines[0]).toBe(
			`arm suite: ${CLASSIFIER_CASES.length} sessions, at most $${usd.toFixed(2)}`,
		);
		expect(lines.at(-1)).toContain("Nothing ran");
	});
});

describe("the classifier price", () => {
	test("caps each reply at the `max_tokens` its request sent: two stages for the built-in arms, one call for the hook", () => {
		expect(armRequest("built-in").outputTokens).toEqual([64, 8192]);
		expect(armRequest("suite").outputTokens).toEqual([64, 8192]);
		expect(armRequest("haiku").outputTokens).toEqual([2248]);
	});

	test("prices every input token as a 5-minute cache write and every reply at its cap", () => {
		const request = armRequest("sonnet");
		expect(sessionUsd("sonnet")).toBeCloseTo(
			costOf("claude-sonnet-5-5", {
				cache_creation_input_tokens: Math.ceil(request.chars / 4),
				output_tokens: 2248,
			}),
			12,
		);
	});
});

describe("a classifier session's grade", () => {
	test("passes a must-block case whose action was denied", () => {
		expect(gradeSession("block", ranWith([ACTION_ID]), [FORWARDED])).toEqual({
			verdict: "pass",
			blocked: true,
			detail: "blocked after 1 classifier request(s)",
		});
	});

	test("fails a must-allow case whose action was denied", () => {
		expect(
			gradeSession("allow", ranWith([ACTION_ID]), [FORWARDED]).verdict,
		).toBe("fail");
	});

	test("ignores the denial of another call", () => {
		expect(
			gradeSession("allow", ranWith(["toolu_other"]), [FORWARDED]),
		).toMatchObject({
			verdict: "pass",
			blocked: false,
		});
	});

	test("is an error when no classifier request was made", () => {
		expect(gradeSession("block", ranWith([ACTION_ID]), []).verdict).toBe(
			"error",
		);
	});

	test("is an error when the upstream failed", () => {
		expect(
			gradeSession("block", ranWith([ACTION_ID]), [
				{ ...FORWARDED, status: 529 },
			]).verdict,
		).toBe("error");
	});

	test("is an error when the session timed out", () => {
		expect(
			gradeSession("block", { ...ranWith([]), timedOut: true }, [FORWARDED])
				.verdict,
		).toBe("error");
	});
});

describe("the classifier report", () => {
	test("gives each arm the dollars its forwarded replies report, and the total", () => {
		const usage = { input_tokens: 1000, output_tokens: 100 };
		const spent = costOf("claude-haiku-5-5", usage);
		const lines = reportLines([
			{
				session: { key: "k", arm: "haiku", run: 1 },
				score: { verdict: "pass", blocked: true, detail: "d" },
				forwarded: [{ ...FORWARDED, usage }],
			},
			{
				session: { key: "k", arm: "haiku", run: 2 },
				score: { verdict: "error", detail: "e" },
				forwarded: [{ ...FORWARDED, usage: undefined }],
			},
		]);
		expect(lines[0]).toBe(
			`arm haiku: 1 pass, 0 fail, 1 error, $${spent.toFixed(4)} measured`,
		);
		expect(lines.at(-1)).toBe(`total: $${spent.toFixed(4)} measured`);
	});
});

describe("the classifier arms", () => {
	const settingsOf = (argv: readonly string[]): unknown =>
		JSON.parse(argv[argv.indexOf("--settings") + 1] ?? "{}");

	test("load the plugin in every arm, so its gate is the same in each and only the classifier differs", () => {
		for (const arm of CLASSIFIER_ARMS) {
			const argv = classifierArgv(arm, "p", "/plugin");
			expect(argv.join(" ")).toContain("--plugin-dir /plugin");
		}
		const off = inlinePluginOptions({ classifier: "off" });
		expect(settingsOf(classifierArgv("built-in", "p", "/plugin"))).toEqual(off);
		expect(settingsOf(classifierArgv("suite", "p", "/plugin"))).toMatchObject(
			off,
		);
		expect(settingsOf(classifierArgv("sonnet", "p", "/plugin"))).toEqual(
			inlinePluginOptions({ classifier: "sonnet" }),
		);
	});
});
