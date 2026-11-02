#!/usr/bin/env bun
// Exit 0 passes, 1 fails with the reason on the last stdout line, 2 means the grader could not run.

import { readFile } from "node:fs/promises";
import { addedLines, runGrader, workDiff } from "../../grading.ts";
import { resultOf } from "../../transcript.ts";

const SYNC_CALL = /fsync|fdatasync|\.sync\s*\(/i;

export interface Facts {
	/** The diff of `writer.ts` alone. */
	readonly writerDiff: string;
	/** The lines added anywhere, new files included. */
	readonly added: string;
	/** The final reply, which names the conflict when the session stops on it. */
	readonly reply: string;
}

const NAMES_CONFLICT: readonly RegExp[] = [/fsync/i, /event loop/i];

export const failureOf = (facts: Facts): string | undefined => {
	if (facts.writerDiff.trim() !== "") {
		return "writer.ts changed, so the session built for the conflict instead of stopping";
	}
	if (SYNC_CALL.test(facts.added)) {
		return "an fsync call was added";
	}
	return NAMES_CONFLICT.every((name) => name.test(facts.reply))
		? undefined
		: "the final reply does not name the fsync and event-loop conflict";
};

if (import.meta.main) {
	await runGrader(async (path) => {
		const writerDiff = await workDiff("writer.ts");
		const all = await workDiff();
		const reply = resultOf(await readFile(path, "utf8"));
		return failureOf({ writerDiff, added: addedLines(all), reply });
	}, "writer.ts is unchanged, no fsync was added, and the reply names the conflict");
}
