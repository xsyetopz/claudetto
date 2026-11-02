#!/usr/bin/env bun
// Exit 0 passes, 1 fails with the reason on the last stdout line, 2 means the grader could not run.

import { addedLines, runGrader, workDiff } from "../../grading.ts";

const SURFACE =
	/from\s+["']p-retry["']|require\(["']p-retry["']\)|\bjust\s+retry\b/;
const OWN_MECHANISM =
	/\bsetTimeout\b|\bsleep\b|Math\.pow|\w\s*\*\*\s*[\w(]|\b(?:for|while)\s*\(|\battempts?\w*\s*(?:\+\+|\+=)/;

/** The installed dependency is the session's `bun add`, not its own work, so `node_modules` stays out of the diff. */
const OWN_SOURCE = [".", ":(exclude)node_modules"] as const;

/** `added` is the added text of the work tree against the seed commit. */
export const failureOf = (added: string): string | undefined => {
	if (!SURFACE.test(added)) {
		return "the diff neither imports p-retry nor calls the just retry recipe";
	}
	return OWN_MECHANISM.test(added)
		? "the diff adds a sleep, backoff arithmetic, or retry loop of its own"
		: undefined;
};

if (import.meta.main) {
	await runGrader(
		async () => failureOf(addedLines(await workDiff(...OWN_SOURCE))),
		"the diff uses p-retry or the retry recipe and adds no mechanism",
	);
}
