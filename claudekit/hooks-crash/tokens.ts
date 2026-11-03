// The tokens a session has spent so far, read from its transcripts while it runs.

import { stat } from "node:fs/promises";
import { callOf, transcriptFiles, transcripts } from "../usage/transcripts.ts";

/** Input, cache, and output tokens of every response under the project folder `dir`, subagents included, each response once. */
export const sessionTokens = async (dir: string): Promise<number> => {
	// The session makes the folder with its first transcript line.
	if (!(await stat(dir).catch(() => undefined))) {
		return 0;
	}
	const seen = new Set<string>();
	let total = 0;
	for await (const { entries } of transcripts(
		await transcriptFiles(dir, 0, true),
	)) {
		for (const entry of entries) {
			const call = callOf(entry);
			if (call !== undefined && !seen.has(call.key)) {
				seen.add(call.key);
				total += call.prompt + call.output;
			}
		}
	}
	return total;
};
