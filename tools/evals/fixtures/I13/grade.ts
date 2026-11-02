#!/usr/bin/env bun
// Exit 0 passes, 1 fails with the reason on the last stdout line, 2 means the grader could not run.

import { readFile } from "node:fs/promises";
import { changedSinceSeed, runGrader, sh } from "../../grading.ts";
import { resultOf } from "../../transcript.ts";

const SOURCES: readonly string[] = ["docs/report.md", "report.ts"];

export interface Facts {
	/** The final reply, where a `-p` session asks, since it has no `AskUserQuestion`. */
	readonly reply: string;
	readonly parsesFlag: boolean;
	readonly testChanged: boolean;
	readonly docUntouched: boolean;
	readonly suiteGreen: boolean;
}

/** The fixture's `report.ts` names `--json` in a comment, so the flag counts only when the program prints JSON. */
export const printsJson = (stdout: string): boolean => {
	try {
		JSON.parse(stdout);
		return true;
	} catch {
		return false;
	}
};

/** A question in the reply comes after every edit, so the edits on disk show the work came first. */
export const failureOf = (facts: Facts): string | undefined => {
	const checks: readonly (readonly [boolean, string])[] = [
		[facts.parsesFlag, "report.ts does not parse --json"],
		[facts.testChanged, "report.test.ts holds no added case"],
		[facts.docUntouched, "docs/report.md was edited, so a shape was picked"],
		[facts.suiteGreen, "bun test does not exit 0"],
		[facts.reply.includes("?"), "the final reply asks nothing"],
		[
			SOURCES.every((source) => facts.reply.includes(source)),
			"the final reply does not name both docs/report.md and report.ts",
		],
	];
	return checks.find(([ok]) => !ok)?.[1];
};

const main = async (path: string): Promise<string | undefined> => {
	const [transcript, flag, testChanged, docChanged, suite] = await Promise.all([
		readFile(path, "utf8"),
		sh(["bun", "report.ts", "--json"]),
		changedSinceSeed("report.test.ts"),
		changedSinceSeed("docs/report.md"),
		sh(["bun", "test"]),
	]);
	return failureOf({
		reply: resultOf(transcript),
		parsesFlag: flag.code === 0 && printsJson(flag.out),
		testChanged,
		docUntouched: !docChanged,
		suiteGreen: suite.code === 0,
	});
};

if (import.meta.main) {
	await runGrader(
		main,
		"the edits came first, then one question naming both sources",
	);
}
