// A page that tells a reader to run `just <recipe>` sends them to a recipe, so the recipe has to be
// in the `justfile`. This check reads the backticked spans of the pages the repo owns and fails a
// `just <name>` the `justfile` does not define. It is the check that was missing when the `bump`
// recipe and `tools/bump-version.ts` were removed and `CONTRIBUTING.md` kept telling a contributor to
// run `just bump`.
//
// A name is read from anywhere inside a span, so `bun test && just lab` counts, and a long flag never
// matches, so `just --list` is left alone.
//
// `RECORD_PAGES` names each page whose commands are a record of a run and not an instruction to
// follow. Only a page that names a recipe of a removed harness is on the list, so the pages that name
// a live recipe, such as `docs/evidence/compaction/threshold.md` with `just compaction-cost`, stay
// under the check and a rename of one of those is still caught.
//
//   bun tools/recipes.ts

import { join } from "node:path";
import { file as bunFile } from "bun";
import { pagesOf } from "./citations.ts";

/**
 * The pages whose `just` commands are a record. `docs/test-diet.md:3` states that every path on it is
 * the path a file had on 2026-10-28. `CHANGELOG.md` records a change, so an entry about a removed
 * recipe has to name it: `CHANGELOG.md:99` names `just release` and `just bump` as removed, and that
 * sentence stays true only while it keeps the old names. `docs/evidence/stop-hook-eval.md:51` names
 * `just sandbox`, the recipe its run of 2026-10-07 used, and that page stays because it is also a
 * reading of the Claude Code binary. The `0.0.0` restart deleted the eleven other pages that recorded
 * a removed harness, so they are off this list with the pages themselves.
 */
export const RECORD_PAGES: readonly string[] = [
	"CHANGELOG.md",
	"docs/test-diet.md",
	"docs/evidence/stop-hook-eval.md",
];

/**
 * A recipe of the `justfile`: an optional `@`, the name, its parameters with any default, then the
 * colon. The `(?!=)` keeps an assignment such as `count := 1` from reading as a recipe named `count`.
 */
const RECIPE =
	/^@?([a-z][a-z0-9-]*)(?:[ \t]+@?\*?[a-z][a-z0-9-]*(?:=(?:"[^"]*"|'[^']*'))?)*[ \t]*:(?!=)/gm;

/** A backticked span, whose body holds no backtick and no line break. */
const SPAN = /`([^`\n]+)`/g;

/** The shell separators a second command can follow, which is where a `just` call can also stand. */
const SEPARATOR = /&&|\|\||[;|]/;

/**
 * A `just <recipe>` at the start of a command. The word has to open the command, because `just` inside
 * a sentence is the English adverb: `docs/dossier/mid.md` quotes spans such as "it just works", and
 * reading those as a call reported 25 recipes that no page ever asked a reader to run. A name starts
 * with a letter, so a long flag such as `just --list` does not match.
 */
const CALL = /^\s*just ([a-z][a-z0-9-]*)/;

/** The recipe names `text` defines, in the order the `justfile` gives them, with no repeat. */
export const recipeNames = (text: string): string[] => [
	...new Set([...text.matchAll(RECIPE)].map(([, name = ""]) => name)),
];

/** One `just` command found in a page: where it stands and the recipe it names. */
export interface Named {
	readonly page: string;
	readonly line: number;
	readonly recipe: string;
}

/**
 * The recipes `text` names, read from backticked spans, one entry per occurrence. A span is split on
 * the shell separators, so the second command of `bun install && just lab` is read as well.
 */
export const namedIn = (page: string, text: string): Named[] =>
	text.split("\n").flatMap((row, index) =>
		[...row.matchAll(SPAN)].flatMap(([, span = ""]) =>
			span.split(SEPARATOR).flatMap((part) => {
				const recipe = CALL.exec(part)?.[1];
				return recipe === undefined ? [] : [{ page, line: index + 1, recipe }];
			}),
		),
	);

/** One fault: where the command stands, the recipe it names, and the reason it does not resolve. */
export interface Fault {
	readonly page: string;
	readonly line: number;
	readonly recipe: string;
	readonly reason: string;
}

/** The faults of `named` against `defined`, one per occurrence of a recipe that is not defined. */
export const faultsOf = (
	defined: readonly string[],
	named: readonly Named[],
): Fault[] => {
	const known = new Set(defined);
	return named
		.filter((entry) => !known.has(entry.recipe))
		.map(({ page, line, recipe }) => ({
			page,
			line,
			recipe,
			reason: `names \`just ${recipe}\`, which the justfile does not define`,
		}));
};

/** True when the commands of `page` are a record of a run and not an instruction to follow. */
export const isRecord = (page: string): boolean => RECORD_PAGES.includes(page);

/** Every fault of the pages under `root`, read against the `justfile` of `root`, in page order. */
export const recipeFaultsIn = async (root: string): Promise<Fault[]> => {
	const defined = recipeNames(await bunFile(join(root, "justfile")).text());
	const pages = await pagesOf(root, isRecord);
	const found = await Promise.all(
		pages.map(async (page) =>
			faultsOf(defined, namedIn(page, await bunFile(join(root, page)).text())),
		),
	);
	return found.flat();
};

/** One line per fault, in the `file:line: reason` form that an editor jumps to. */
export const recipeLines = (faults: readonly Fault[]): string[] =>
	faults.map(({ page, line, reason }) => `${page}:${line}: ${reason}`);

if (import.meta.main) {
	const lines = recipeLines(await recipeFaultsIn(join(import.meta.dir, "..")));
	for (const line of lines) {
		console.error(line);
	}
	if (lines.length > 0) {
		process.exitCode = 1;
	}
}
