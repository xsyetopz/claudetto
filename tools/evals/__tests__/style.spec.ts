// Every expected count is arithmetic written out from the case and arm lists, not a figure copied from the tool.

import { describe, expect, test } from "bun:test";
import { shareText, weeklyShare } from "../../../claudekit/price/share.ts";
import { EVAL_MIN_RUNS_PER_ARM } from "../../limits.ts";
import { STYLE_ARMS, styleArgv } from "../style/arms.ts";
import { firstSentence, STYLE_CASES } from "../style/cases.ts";
import {
	failLines,
	gradeReply,
	parseStyleArgs,
	planLines,
	planStyle,
	reportLines,
	spendLine,
	TOKEN_CAP,
	totalTokens,
} from "../style/main.ts";
import { boundTokens } from "../style/measure.ts";

const caseOf = (key: string) => {
	const row = STYLE_CASES.find((one) => one.key === key);
	if (row === undefined) {
		throw new Error(`no case ${key}`);
	}
	return row;
};

const defaults = () => {
	const options = parseStyleArgs([]);
	if ("error" in options) {
		throw new Error(options.error);
	}
	return options;
};

describe("the style plan", () => {
	test("lists cases times two texts times the runs, 60 by default", () => {
		const sessions = planStyle(defaults());
		expect(sessions).toHaveLength(3 * 2 * 10);
		expect(sessions).toHaveLength(
			STYLE_CASES.length * STYLE_ARMS.length * EVAL_MIN_RUNS_PER_ARM,
		);
		expect(sessions.filter((one) => one.arm === "old")).toHaveLength(30);
		expect(sessions.filter((one) => one.arm === "new")).toHaveLength(30);
	});

	test("makes no paid call unless `--run` is given", () => {
		expect(defaults().run).toBe(false);
		const run = parseStyleArgs(["--run"]);
		expect("error" in run ? false : run.run).toBe(true);
	});

	test("narrows to one case, one arm, and the given runs", () => {
		const options = parseStyleArgs([
			"--case",
			"no-rating",
			"--arm",
			"old",
			"--runs",
			"2",
		]);
		if ("error" in options) {
			throw new Error(options.error);
		}
		expect(planStyle(options)).toEqual([
			{ key: "no-rating", arm: "old", run: 1 },
			{ key: "no-rating", arm: "old", run: 2 },
		]);
	});

	test("rejects an arm that is not `old` or `new`", () => {
		expect(parseStyleArgs(["--arm", "both"])).toEqual({
			error: "both is not a value of --arm",
		});
	});
});

describe("the price line", () => {
	const measured = {
		old: { chars: 40_000, maxTokens: 2000, carriesStyle: true },
		new: { chars: 36_000, maxTokens: 2000, carriesStyle: true },
	};

	test("bounds a session by its request at 4 chars a token plus the reply cap", () => {
		expect(boundTokens(measured.old)).toBe(10_000 + 2000);
		expect(boundTokens(measured.new)).toBe(9000 + 2000);
	});

	test("gives the total in tokens and its weekly share", () => {
		const sessions = planStyle(defaults());
		const tokens = 30 * 12_000 + 30 * 11_000;
		expect(totalTokens(sessions, measured)).toBe(tokens);
		const lines = planLines(sessions, measured);
		expect(lines).toContain(
			`total: at most 690,000 tokens, ${shareText(weeklyShare(tokens))} of the weekly limit, against an approved ${TOKEN_CAP.toLocaleString("en-US")}`,
		);
		expect(lines.filter((line) => line.startsWith("session "))).toHaveLength(
			60,
		);
	});

	test("keeps a full run under the approved 1.9M tokens at the measured size", () => {
		expect(TOKEN_CAP).toBe(1_900_000);
		expect(totalTokens(planStyle(defaults()), measured)).toBeLessThan(
			TOKEN_CAP,
		);
	});
});

describe("the graders", () => {
	test("`first-sentence` fails an agreement opening and passes an action", () => {
		const row = caseOf("first-sentence");
		expect(row.passes("You're right that the aliases can be pinned.")).toBe(
			false,
		);
		expect(row.passes("Great catch. The snippet pins it.")).toBe(false);
		expect(row.passes("Good point, the snippet now pins it.")).toBe(false);
		expect(
			row.passes("The snippet now pins `ANTHROPIC_DEFAULT_OPUS_MODEL`."),
		).toBe(true);
	});

	test("`firstSentence` stops at a full stop or a line break", () => {
		expect(firstSentence("One. Two.")).toBe("One.");
		expect(firstSentence("One\nTwo.")).toBe("One");
	});

	test("`sentence-form` fails an animate verb after a thing and passes the actor as subject", () => {
		const row = caseOf("sentence-form");
		expect(
			row.passes("The check surfaces a gap that the plan wants to fix."),
		).toBe(false);
		expect(row.passes("The test needs a case.")).toBe(false);
		expect(row.passes("This plan then asks for task 4.3.")).toBe(false);
		expect(row.passes("The check shows a gap. Task 4.3 fixes it.")).toBe(true);
		expect(row.passes("I need task 4.3 to add the case.")).toBe(true);
	});

	test("`sentence-form` is a word match, so a pronoun subject passes", () => {
		expect(caseOf("sentence-form").passes("It wants task 4.3.")).toBe(true);
	});

	test("`no-rating` fails each rating phrase, in any case", () => {
		const row = caseOf("no-rating");
		for (const phrase of [
			"Great question",
			"you're absolutely right",
			"Excellent",
			"Good catch",
			"I apologize",
			"Sorry",
		]) {
			expect(row.passes(`${phrase}. A rebase rewrites parents.`)).toBe(false);
		}
		expect(
			row.passes("A rebase gives each commit a new parent, so a new hash."),
		).toBe(true);
	});
});

describe("grading a session", () => {
	const session = { key: "no-rating", arm: "new", run: 1 } as const;
	const stdout = (text: string) =>
		JSON.stringify({ type: "result", is_error: false, result: text });

	test("passes, fails, and errors on a fixed reply, an empty reply, and no result", () => {
		const row = caseOf("no-rating");
		expect(
			gradeReply(row, session, stdout("A new parent gives a new hash."))
				.verdict,
		).toBe("pass");
		expect(gradeReply(row, session, stdout("Sorry about that.")).verdict).toBe(
			"fail",
		);
		expect(gradeReply(row, session, stdout("")).verdict).toBe("error");
		expect(gradeReply(row, session, "not json").verdict).toBe("error");
	});

	test("reports counts and the exactness of the grader per case and arm", () => {
		const row = caseOf("no-rating");
		const lines = reportLines([
			gradeReply(row, session, stdout("Sorry.")),
			gradeReply(row, session, stdout("A new parent.")),
		]);
		expect(lines).toEqual([
			`no-rating | new: 1 pass, 1 fail, 0 error | grader: ${row.exactness}`,
		]);
	});
});

describe("the spend and the failures of a run", () => {
	const row = caseOf("no-rating");
	const usage = (tokens: number) => ({
		modelUsage: { "claude-opus-5-5": { inputTokens: tokens } },
	});
	const stdout = (text: string, extra: object = {}) =>
		JSON.stringify({ type: "result", is_error: false, result: text, ...extra });

	test("prints one line for each `fail` with its case, arm, run, and the start of the reply", () => {
		const lines = failLines([
			gradeReply(
				row,
				{ key: "no-rating", arm: "old", run: 2 },
				stdout("Sorry."),
			),
			gradeReply(
				row,
				{ key: "no-rating", arm: "new", run: 1 },
				stdout("A new parent."),
			),
			gradeReply(row, { key: "no-rating", arm: "new", run: 3 }, "not json"),
		]);
		expect(lines).toEqual(["fail no-rating | old | run 2 | Sorry."]);
	});

	test("sums the measured tokens, gives the weekly share, and names a session without tokens", () => {
		const line = spendLine([
			gradeReply(
				row,
				{ key: "no-rating", arm: "old", run: 1 },
				stdout("Sorry.", usage(1000)),
			),
			gradeReply(
				row,
				{ key: "no-rating", arm: "new", run: 2 },
				stdout("A new parent.", usage(234)),
			),
			gradeReply(row, { key: "no-rating", arm: "new", run: 3 }, stdout("Hi.")),
		]);
		expect(line).toBe(
			`measured: 1,234 tokens in 2 of 3 sessions, ${shareText(weeklyShare(1234))} of the weekly limit; unmeasured: no-rating | new | run 3`,
		);
	});
});

describe("the session command", () => {
	test("loads the plugin, picks `claudetto:Concise`, drops the tools, and pins the model", () => {
		const argv = styleArgv("hello", "/p");
		expect(argv.slice(argv.indexOf("--plugin-dir"))[1]).toBe("/p");
		expect(argv).toContain(
			JSON.stringify({ outputStyle: "claudetto:Concise" }),
		);
		expect(
			argv.slice(argv.indexOf("--tools"), argv.indexOf("--tools") + 2),
		).toEqual(["--tools", ""]);
		expect(argv[argv.indexOf("--model") + 1]).toBe("claude-opus-5-5");
	});
});
