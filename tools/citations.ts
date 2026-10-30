// A `path:line` citation in a page tells a reader where to look, so the line has to be there. This
// check reads the backticked spans of the Markdown the repo owns and fails a citation whose path is
// missing or whose line is past the end of the file. Both ends of a `path:line-line` range must exist.
//
// Only a path this repo could own is resolved, which means its first segment is an entry of the repo
// root. A citation of another project's file, such as `hooks/module.js` or a chunk of the installed
// CLI, cannot be resolved from here at all, and whether a page must name the repo it cites is a
// different rule than whether a line exists. On the pages of 2026-10-30 that split is 261 citations
// this repo could own against 325 it could not.
//
// The walk covers `docs/**/*.md`, the decision pages `docs/keep/**/*.txt` (a `.md` glob never reached
// them, which is how a dead citation in one survived), and the root pages `README.md`,
// `CONTRIBUTING.md`, `AGENTS.md`, and `CHANGELOG.md`, less the pages of `DATED_PAGES`. Two parts of the tree are dated readings of a tree
// that no longer exists, and both say so in their own prose, so a citation in them is a record of what
// was read and not a pointer a reader follows. `openspec/**` is left out of the globs for that reason:
// `openspec/changes/claudetto-restart/survey.md` holds 31 `dev/` citations that resolve to no file by
// design, and the decision was to keep them as dated proposals rather than rewrite them.
//
//   bun tools/citations.ts

import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { file as bunFile, Glob } from "bun";
import { lineCount } from "./file-lines.ts";

/** The globs of the pages checked, relative to the repo root. */
export const PAGE_GLOBS: readonly string[] = [
	"docs/**/*.md",
	"README.md",
	"CONTRIBUTING.md",
	"AGENTS.md",
	"CHANGELOG.md",
	"docs/keep/**/*.txt",
];

/**
 * The pages whose citations are a dated reading and not a pointer, each page saying so in its own
 * prose, so the reason is where a reader of the page sees it. `docs/test-diet.md:3` states that every
 * path on it is the path a file had on 2026-10-28 and is read by adding `archive/` in front of it, and
 * it holds 238 of the 250 citations of this repo's own paths that no longer resolve.
 */
export const DATED_PAGES: readonly string[] = ["docs/test-diet.md"];

/** A backticked span, whose body holds no backtick and no line break. */
const SPAN = /`([^`\n]+)`/g;

/** `path:line` or `path:line-line`, and nothing else in the span, so prose and code never match. */
const CITATION = /^([\w@.-]+(?:\/[\w@.+-]+)*\.?[\w-]*):(\d+)(?:-(\d+))?$/;

/** A path that ends in an extension. */
const EXTENSION = /\.\w+$/;

/** One citation found in a page: where it stands, what it cites, and the last line it needs. */
export interface Citation {
	readonly page: string;
	readonly line: number;
	readonly path: string;
	readonly from: number;
	readonly to: number;
}

/**
 * The citations in `text`, read from backticked spans only. A span with `://` is a URL, and a path
 * with neither a `/` nor an extension is not a path, so `12:30` and `:80` are left alone.
 */
export const citationsIn = (page: string, text: string): Citation[] => {
	const found: Citation[] = [];
	for (const [index, row] of text.split("\n").entries()) {
		for (const [, span = ""] of row.matchAll(SPAN)) {
			const match = CITATION.exec(span);
			if (match === null || span.includes("://")) {
				continue;
			}
			const path = match[1] ?? "";
			if (!path.includes("/") && !EXTENSION.test(path)) {
				continue;
			}
			const from = Number(match[2]);
			found.push({
				page,
				line: index + 1,
				path,
				from,
				to: match[3] === undefined ? from : Number(match[3]),
			});
		}
	}
	return found;
};

/** The line count of a file under `root`, or `null` when it is absent or a folder. */
const lengthOf = async (root: string, path: string): Promise<number | null> => {
	const handle = bunFile(join(root, path));
	if (!(await handle.exists())) {
		return null;
	}
	return lineCount(await handle.text());
};

/** One fault: the page and line of the citation, and the reason it does not resolve. */
export interface Fault {
	readonly page: string;
	readonly line: number;
	readonly reason: string;
}

/**
 * The faults of `citations` against the tree under `root`. A missing path is one fault, and a line
 * past the end names the line and the length of the file; a range names its end when the end is the
 * one that is past.
 */
export const faultsOf = async (
	root: string,
	citations: readonly Citation[],
): Promise<Fault[]> => {
	const owned = new Set(await readdir(root));
	const ours = citations.filter((c) =>
		owned.has(c.path.split("/")[0] ?? c.path),
	);
	const paths = [...new Set(ours.map((c) => c.path))];
	const lengths = new Map(
		await Promise.all(
			paths.map(async (path) => [path, await lengthOf(root, path)] as const),
		),
	);
	return ours.flatMap((c): Fault[] => {
		const length = lengths.get(c.path) ?? null;
		const cited = `${c.path}:${c.from}${c.to === c.from ? "" : `-${c.to}`}`;
		if (length === null) {
			return [
				{
					page: c.page,
					line: c.line,
					reason: `cites ${cited}, and ${c.path} does not exist`,
				},
			];
		}
		return Math.max(c.from, c.to) > length
			? [
					{
						page: c.page,
						line: c.line,
						reason: `cites ${cited}, and ${c.path} holds ${length} lines`,
					},
				]
			: [];
	});
};

/**
 * The pages under `root` that `PAGE_GLOBS` name and `skip` does not, sorted. `tools/recipes.ts` reads
 * the same page set against the `justfile`, so the walk lives here once and each check passes its own
 * `skip`.
 */
export const pagesOf = async (
	root: string,
	skip: (page: string) => boolean,
): Promise<string[]> => {
	const scans = await Promise.all(
		PAGE_GLOBS.map((glob) => Array.fromAsync(new Glob(glob).scan(root))),
	);
	return [...new Set(scans.flat())]
		.filter((page) => !skip(page))
		.sort((a, b) => a.localeCompare(b));
};

/** Every fault of the pages under `root`, read through `PAGE_GLOBS`, in page order. */
export const citationFaultsIn = async (root: string): Promise<Fault[]> => {
	const pages = await pagesOf(root, (page) => DATED_PAGES.includes(page));
	const faults = await Promise.all(
		pages.map(async (page) =>
			faultsOf(root, citationsIn(page, await bunFile(join(root, page)).text())),
		),
	);
	return faults.flat();
};

/** One line per fault, in the `file:line: reason` form that an editor jumps to. */
export const citationLines = (faults: readonly Fault[]): string[] =>
	faults.map(({ page, line, reason }) => `${page}:${line}: ${reason}`);

if (import.meta.main) {
	const lines = citationLines(
		await citationFaultsIn(join(import.meta.dir, "..")),
	);
	for (const line of lines) {
		console.error(line);
	}
	if (lines.length > 0) {
		process.exitCode = 1;
	}
}
