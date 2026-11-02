// Usage: bun claudekit/usage/main.ts sum|reread|hit --since DATE [--until DATE] [--root DIR]

import { formatHit, measureHits } from "./hit.ts";
import { formatReread, measureReread } from "./reread/reread.ts";
import { formatSum, summarize } from "./sum.ts";
import { parseOptions } from "./transcripts.ts";

const USAGE = "Usage: bun claudekit/usage/main.ts sum|reread|hit --since DATE";

const run = async (command: string | undefined): Promise<string> => {
	const { root, window } = parseOptions(process.argv.slice(3));
	switch (command) {
		case "sum":
			return formatSum(await summarize(root, window));
		case "reread":
			return formatReread(await measureReread(root, window));
		case "hit":
			return formatHit(await measureHits(root, window));
		default:
			throw new Error(USAGE);
	}
};

try {
	console.info(await run(process.argv[2]));
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 2;
}
