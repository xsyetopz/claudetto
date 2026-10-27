// The `just validate` rule of D25 for the wiki: a line that gives fewer than `EVAL_MIN_RUNS_PER_ARM` runs in an arm fails.

import { join } from "node:path";
import { file as bunFile, Glob } from "bun";
import { EVAL_MIN_RUNS_PER_ARM } from "./limits.ts";

const NUMBER_WORDS = [
	"one",
	"two",
	"three",
	"four",
	"five",
	"six",
	"seven",
	"eight",
	"nine",
];

/**
 * A run count of an arm, as the wiki writes it: `3 runs per arm`, `10 trials per arm`, or `three runs each`.
 * The count must come before `runs` or `trials`, so a table of bounds (`| runs | 3 for each arm |`) does not match.
 */
const RUN_COUNT = new RegExp(
	`\\b(\\d+|${NUMBER_WORDS.join("|")})\\s+(?:runs?|trials?)\\s+(?:each|per arm|for each arm|in each arm)\\b`,
	"gi",
);

export interface ThinClaim {
	file: string;
	line: number;
	runs: number;
}

/** The lines of the pages that give a run count below `EVAL_MIN_RUNS_PER_ARM` for an arm. */
export const thinEvalClaims = (
	pages: { file: string; text: string }[],
): ThinClaim[] =>
	pages.flatMap(({ file, text }) =>
		text.split("\n").flatMap((line, i) =>
			[...line.matchAll(RUN_COUNT)]
				.map((m) => {
					const w = (m[1] ?? "").toLowerCase();
					const idx = NUMBER_WORDS.indexOf(w);
					return idx >= 0 ? idx + 1 : Number(w);
				})
				.filter((runs) => runs < EVAL_MIN_RUNS_PER_ARM)
				.map((runs) => ({ file, line: i + 1, runs })),
		),
	);

/** The thin claims of the wiki source under `root`, in `src/wiki/`. */
export const thinEvalClaimsIn = async (
	root: string,
	glob = "src/wiki/**/*.md",
): Promise<ThinClaim[]> => {
	const pages: { file: string; text: string }[] = [];
	for await (const f of new Glob(glob).scan(root)) {
		pages.push({ file: f, text: await bunFile(join(root, f)).text() });
	}
	return thinEvalClaims(pages.sort((a, b) => a.file.localeCompare(b.file)));
};
