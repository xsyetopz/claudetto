import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeSession } from "../execute.ts";
import { isSession, ok, stubRunner } from "./stub.ts";

const SESSION = { key: "K", arm: "main.md", run: 1 } as const;

let parent = "";
let fixtures = "";

afterEach(async () => {
	await rm(parent, { recursive: true, force: true });
	await rm(fixtures, { recursive: true, force: true });
});

const setup = async (): Promise<void> => {
	parent = await mkdtemp(join(tmpdir(), "evals-execute-"));
	fixtures = await mkdtemp(join(tmpdir(), "evals-execute-fixtures-"));
	await mkdir(join(fixtures, "K", "repo"), { recursive: true });
	await writeFile(join(fixtures, "K", "prompt.txt"), "go\n");
	await writeFile(join(fixtures, "K", "repo", "a.txt"), "a\n");
};

type Run = Parameters<typeof executeSession>[0]["run"];

const deps = (run: Run, fixturesRoot = fixtures) => ({
	run,
	fixturesRoot,
	pluginDir: "/plugin",
	tempPrefix: join(parent, "eval-"),
});

describe("`executeSession` scratch root", () => {
	test("is gone after a graded session", async () => {
		await setup();
		const { run } = stubRunner();

		const outcome = await executeSession(deps(run), SESSION);

		expect(outcome.score.verdict).toBe("pass");
		expect(await readdir(parent)).toEqual([]);
	});

	test("is gone after a session that did not finish", async () => {
		await setup();
		const { run } = stubRunner((call) =>
			isSession(call) ? ok({ timedOut: true, code: undefined }) : ok(),
		);

		const outcome = await executeSession(deps(run), SESSION);

		expect(outcome.score.verdict).toBe("error");
		expect(await readdir(parent)).toEqual([]);
	});

	test("is gone after a fixture that cannot be seeded", async () => {
		await setup();
		const { run } = stubRunner();

		const outcome = await executeSession(
			deps(run, join(fixtures, "missing")),
			SESSION,
		);

		expect(outcome.score.verdict).toBe("error");
		expect(await readdir(parent)).toEqual([]);
	});

	test("is gone when the runner throws, and the error reaches the caller", async () => {
		await setup();
		const run = () => Promise.reject(new Error("the runner broke"));

		const failed = executeSession(deps(run), SESSION);

		await expect(failed).rejects.toThrow("the runner broke");
		expect(await readdir(parent)).toEqual([]);
	});
});

describe("`executeSession` spend", () => {
	test("keeps the tokens and dollars of the session's `result`, read before the root goes", async () => {
		await setup();
		const result = {
			type: "result",
			total_cost_usd: 0.5,
			modelUsage: {
				"claude-opus-5-5": {
					inputTokens: 10,
					outputTokens: 20,
					cacheReadInputTokens: 300,
					cacheCreationInputTokens: 4000,
				},
			},
		};
		const { run } = stubRunner((call) =>
			isSession(call) ? ok({ stdout: `${JSON.stringify(result)}\n` }) : ok(),
		);

		const outcome = await executeSession(deps(run), SESSION);

		expect(outcome.spend).toEqual({ tokens: 4330, costUsd: 0.5 });
	});

	test("states no spend for a session whose output has no `result`", async () => {
		await setup();
		const { run } = stubRunner();

		const outcome = await executeSession(deps(run), SESSION);

		expect(outcome.spend).toBeUndefined();
	});
});
