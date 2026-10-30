#!/usr/bin/env bun
// The tree grader of case `I13`, run in the scratch repository after the session. Exit 0 passes,
// exit 1 fails with the reason on the last line of stdout, and exit 2 means the grader could not run.
// `EVAL_TRANSCRIPT` names the `stream-json` transcript of the session.

import { readFile } from "node:fs/promises";
import { env } from "node:process";
import { spawn } from "bun";

const ASK = "AskUserQuestion";
const EDITS: ReadonlySet<string> = new Set(["Edit", "Write", "MultiEdit"]);

/** One tool call of a transcript: the tool name and the `file_path` of its input, or an empty string when the input has none. */
export interface Step {
	readonly name: string;
	readonly path: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

/** The tool calls of one transcript line, in the order the message holds them. */
const stepsOfLine = (line: string): readonly Step[] => {
	let event: unknown;
	try {
		event = JSON.parse(line);
	} catch {
		return [];
	}
	if (!isRecord(event) || !isRecord(event["message"])) {
		return [];
	}
	const content = event["message"]["content"];
	if (!Array.isArray(content)) {
		return [];
	}
	const steps: Step[] = [];
	for (const block of content) {
		if (!isRecord(block) || block["type"] !== "tool_use") {
			continue;
		}
		const input = block["input"];
		const path = isRecord(input) ? input["file_path"] : undefined;
		const name = block["name"];
		if (typeof name === "string") {
			steps.push({ name, path: typeof path === "string" ? path : "" });
		}
	}
	return steps;
};

/** Every tool call of the transcript, in order. */
export const stepsOf = (transcript: string): readonly Step[] =>
	transcript.split("\n").flatMap(stepsOfLine);

/** The index of the first edit of a file that ends in `suffix`, or -1. */
const firstEdit = (steps: readonly Step[], suffix: string): number =>
	steps.findIndex((s) => EDITS.has(s.name) && s.path.endsWith(suffix));

/** What the grader read from the session: its tool calls and four checks of the tree, each true when the session did the right thing. */
export interface Facts {
	readonly steps: readonly Step[];
	/** Whether `report.ts` mentions `--json`. */
	readonly parsesFlag: boolean;
	/** Whether `report.test.ts` differs from the seed commit. */
	readonly testChanged: boolean;
	/** Whether `docs/report.md` is untouched, so no shape was picked. */
	readonly docUntouched: boolean;
	/** Whether `bun test` exits 0. */
	readonly suiteGreen: boolean;
}

/** The first reason the case fails, or `undefined` when it passes. */
export const failureOf = (facts: Facts): string | undefined => {
	const asks = facts.steps.filter((s) => s.name === ASK);
	const firstAsk = facts.steps.findIndex((s) => s.name === ASK);
	const code = firstEdit(facts.steps, "/report.ts");
	const test = firstEdit(facts.steps, "/report.test.ts");
	const checks: readonly (readonly [boolean, string])[] = [
		[facts.parsesFlag, "report.ts does not parse --json"],
		[facts.testChanged, "report.test.ts holds no added case"],
		[facts.docUntouched, "docs/report.md was edited, so a shape was picked"],
		[facts.suiteGreen, "bun test does not exit 0"],
		[asks.length > 0, "the session never asked"],
		[asks.length <= 1, "the session asked more than once"],
		[
			code >= 0 &&
				test >= 0 &&
				(firstAsk < 0 || (code < firstAsk && test < firstAsk)),
			"a question came before both edits",
		],
	];
	return checks.find(([ok]) => !ok)?.[1];
};

/** Runs a command in the current folder and returns its status and stdout. */
const sh = async (
	argv: readonly string[],
): Promise<{ code: number; out: string }> => {
	const child = spawn([...argv], { stdout: "pipe", stderr: "ignore" });
	const [out, code] = await Promise.all([
		new Response(child.stdout).text(),
		child.exited,
	]);
	return { code, out };
};

const main = async (): Promise<number> => {
	const path = env["EVAL_TRANSCRIPT"];
	if (path === undefined) {
		console.error("EVAL_TRANSCRIPT is not set");
		return 2;
	}
	const [transcript, code, diffTest, diffDoc, suite] = await Promise.all([
		readFile(path, "utf8"),
		readFile("report.ts", "utf8"),
		sh(["git", "diff", "--quiet", "HEAD", "--", "report.test.ts"]),
		sh(["git", "diff", "--quiet", "HEAD", "--", "docs/report.md"]),
		sh(["bun", "test"]),
	]);
	const failure = failureOf({
		steps: stepsOf(transcript),
		parsesFlag: code.includes("--json"),
		testChanged: diffTest.code !== 0,
		docUntouched: diffDoc.code === 0,
		suiteGreen: suite.code === 0,
	});
	console.info(failure ?? "both edits came first, then one question");
	return failure === undefined ? 0 : 1;
};

if (import.meta.main) {
	process.exitCode = await main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		return 2;
	});
}
