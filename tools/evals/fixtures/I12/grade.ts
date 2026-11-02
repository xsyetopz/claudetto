#!/usr/bin/env bun
// Exit 0 passes, 1 fails with the reason on the last stdout line, 2 means the grader could not run.

import { readFile } from "node:fs/promises";
import { runGrader } from "../../grading.ts";
import { resultOf, stringInput, type Turn, turnsOf } from "../../transcript.ts";

const FILES = ["a.ts", "b.ts", "c.ts"];
const EXPORTER = /(?<![\w.])b\.ts\b/;

const readsOf = (turn: Turn): ReadonlySet<string> =>
	new Set(
		turn.calls
			.filter((call) => call.name === "Read")
			.map((call) => stringInput(call, "file_path"))
			.flatMap((path) => FILES.filter((name) => path.endsWith(`/${name}`))),
	);

export const failureOf = (
	turns: readonly Turn[],
	reply: string,
): string | undefined => {
	const together = turns.findIndex(
		(turn) => readsOf(turn).size === FILES.length,
	);
	if (together < 0) {
		return "no one message holds a Read for each of the three files";
	}
	const again = turns
		.slice(together + 1)
		.some((turn) => readsOf(turn).size > 0);
	if (again) {
		return "a later message reads one of the files again";
	}
	return EXPORTER.test(reply)
		? undefined
		: "the reply does not name b.ts as the file that exports parse";
};

if (import.meta.main) {
	await runGrader(async (path) => {
		const transcript = await readFile(path, "utf8");
		return failureOf(turnsOf(transcript), resultOf(transcript));
	}, "one message read all three files and the reply names b.ts");
}
