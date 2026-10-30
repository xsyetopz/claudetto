#!/usr/bin/env bun
// Exit 0 passes, 1 fails with the reason on the last stdout line, 2 means the grader could not run.

import { readFile } from "node:fs/promises";
import { env } from "node:process";
import { spawn } from "bun";

const ASK = "AskUserQuestion";
const EDITS: ReadonlySet<string> = new Set(["Edit", "Write", "MultiEdit"]);

export interface Step {
	readonly name: string;
	readonly path: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

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

export const stepsOf = (transcript: string): readonly Step[] =>
	transcript.split("\n").flatMap(stepsOfLine);

const firstEdit = (steps: readonly Step[], suffix: string): number =>
	steps.findIndex((s) => EDITS.has(s.name) && s.path.endsWith(suffix));

export interface Facts {
	readonly steps: readonly Step[];
	readonly parsesFlag: boolean;
	readonly testChanged: boolean;
	readonly docUntouched: boolean;
	readonly suiteGreen: boolean;
}

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
