import { describe, expect, test } from "bun:test";
import { MAIN_AGENT } from "../../plugins/claudetto/src/prompts.ts";
import type {
	CommandOptions,
	CommandResult,
	CommandRunner,
} from "../../tools/evals/command.ts";
import { scoreTree } from "../../tools/evals/score.ts";
import { runSession, sessionArgv } from "../../tools/evals/session.ts";

const OPTIONS = { prompt: "do the thing", pluginDir: "/p/claudetto" };

const result = (patch: Partial<CommandResult> = {}): CommandResult => ({
	code: 0,
	stdout: "",
	stderr: "",
	timedOut: false,
	...patch,
});

describe("the argv of a session", () => {
	test("the shipped arm selects the main agent with `--agent`", () => {
		const argv = sessionArgv("main.md", OPTIONS);

		const at = argv.indexOf("--agent");
		expect(argv[at + 1]).toBe(MAIN_AGENT);
	});

	test("the default arm carries no `--agent`", () => {
		const argv = sessionArgv("the default body", OPTIONS);

		expect(argv).not.toContain("--agent");
	});

	test("the two arms differ in the agent selection and in nothing else", () => {
		const shipped = sessionArgv("main.md", OPTIONS);
		const stock = sessionArgv("the default body", OPTIONS);

		const without = shipped.filter(
			(word) => word !== "--agent" && word !== MAIN_AGENT,
		);
		expect(without).toEqual([...stock]);
	});

	test("both arms load the plugin folder and skip the user settings", () => {
		for (const arm of ["main.md", "the default body"] as const) {
			const argv = sessionArgv(arm, OPTIONS);

			expect(argv[argv.indexOf("--plugin-dir") + 1]).toBe("/p/claudetto");
			expect(argv[argv.indexOf("--setting-sources") + 1]).toBe("project,local");
		}
	});

	test("puts the prompt straight after `-p`", () => {
		const argv = sessionArgv("main.md", OPTIONS);

		expect(argv.slice(0, 3)).toEqual(["claude", "-p", "do the thing"]);
	});

	test("adds the model and the budget only when they are given", () => {
		const bare = sessionArgv("main.md", OPTIONS);
		const full = sessionArgv("main.md", {
			...OPTIONS,
			model: "sonnet",
			maxBudgetUsd: 2,
		});

		expect(bare).not.toContain("--model");
		expect(bare).not.toContain("--max-budget-usd");
		expect(full[full.indexOf("--model") + 1]).toBe("sonnet");
		expect(full[full.indexOf("--max-budget-usd") + 1]).toBe("2");
	});
});

describe("running a session", () => {
	test("hands the argv and the folder to the runner and returns its result", async () => {
		const calls: { argv: readonly string[]; options: CommandOptions }[] = [];
		const run: CommandRunner = (argv, options) => {
			calls.push({ argv, options });
			return Promise.resolve(result({ stdout: "out" }));
		};

		const got = await runSession(run, "main.md", { ...OPTIONS, cwd: "/w" });

		expect(calls).toHaveLength(1);
		expect(calls[0]?.argv).toEqual([...sessionArgv("main.md", OPTIONS)]);
		expect(calls[0]?.options.cwd).toBe("/w");
		expect(got.stdout).toBe("out");
	});
});

describe("scoring a tree grader", () => {
	test("exit 0 passes and keeps the last line of stdout", () => {
		const score = scoreTree(
			result({
				stdout: `first
why it held

`,
			}),
		);

		expect(score).toEqual({ verdict: "pass", detail: "why it held" });
	});

	test("exit 1 fails", () => {
		const score = scoreTree(
			result({ code: 1, stdout: "a question came first" }),
		);

		expect(score).toEqual({ verdict: "fail", detail: "a question came first" });
	});

	test("another status is an error, not a fail", () => {
		const score = scoreTree(result({ code: 2, stderr: "no transcript" }));

		expect(score.verdict).toBe("error");
		expect(score.detail).toContain("no transcript");
	});

	test("a grader that never exited is an error", () => {
		const score = scoreTree(result({ code: undefined }));

		expect(score.verdict).toBe("error");
	});

	test("a timeout is an error even with exit 0", () => {
		const score = scoreTree(result({ code: 0, timedOut: true }));

		expect(score.verdict).toBe("error");
	});
});
