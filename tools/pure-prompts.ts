// Cache writes are 49.8% of the cost of this machine's 80 transcripts at Anthropic's official prices
// while being 5.21% of its tokens, so a character that moves between two sessions is paid for at
// the write price on every session.
//
// The scan follows imports from the prompt modules rather than all of `src/`, because the window
// recorder reads usage numbers by design.

import { posix } from "node:path";
import { file as bunFile } from "bun";

/** Where the modules of the plugin live. */
export const SRC_ROOT = "plugins/claudetto/src";

/** The modules that build prompt text. Each one and everything it imports is scanned. */
export const PROMPT_ENTRIES: readonly string[] = [
	"tools/texts.ts",
	"tools/tools.ts",
];

/** A source shape a prompt module may not hold, with the kind of input it reads and the text that reveals it. */
export interface Impurity {
	/** What the text reads, in the words of the constraint. */
	readonly kind: string;
	/** The source text that gives it away. */
	readonly needle: string;
}

/** What a prompt module may not read. */
export const IMPURITIES: readonly Impurity[] = [
	{ kind: "a clock", needle: "Date.now" },
	{ kind: "a clock", needle: "new Date" },
	{ kind: "a clock", needle: "performance.now" },
	{ kind: "a clock", needle: "process.hrtime" },
	{ kind: "a clock", needle: "$.clock" },
	{ kind: "a counter", needle: "Math.random" },
	{ kind: "a counter", needle: "randomUUID" },
	{ kind: "a usage number", needle: "session.usage" },
	{ kind: "a usage number", needle: "session.measure" },
];

const IMPORT = /from\s+"(\.[^"]+)"/g;

/** The relative imports of the module at `from`, as paths inside `root`. */
const importsOf = (from: string, text: string): readonly string[] =>
	[...text.matchAll(IMPORT)]
		.map((match) => match[1] ?? "")
		.map((path) => posix.join(posix.dirname(from), path));

/** A module reached from a prompt entry, with its path and its source text. */
export interface PromptSource {
	readonly path: string;
	readonly text: string;
}

/** The text of a file, or none when it is not there. */
const textOf = async (path: string): Promise<string | undefined> => {
	const handle = bunFile(path);
	return (await handle.exists()) ? await handle.text() : undefined;
};

/** One level of the walk: the modules named here, then the ones they import. */
const walk = async (
	paths: readonly string[],
	root: string,
	seen: readonly PromptSource[],
): Promise<readonly PromptSource[]> => {
	const known = seen.map((source) => source.path);
	const fresh = [...new Set(paths)].filter((path) => !known.includes(path));
	if (fresh.length === 0) {
		return seen;
	}
	const rows = await Promise.all(
		fresh.map(async (path) => ({
			path,
			text: await textOf(`${root}/${path}`),
		})),
	);
	const found = rows.filter(
		(row): row is PromptSource => row.text !== undefined,
	);
	return walk(
		found.flatMap((row) => importsOf(row.path, row.text)),
		root,
		[...seen, ...found],
	);
};

/**
 * Every module the prompt path reaches, with its text, in the order they were found. A module that
 * is not there is skipped, because the entry list is the thing a check of the list itself would
 * catch.
 */
export const promptSources = async (
	entries: readonly string[] = PROMPT_ENTRIES,
	root = SRC_ROOT,
): Promise<readonly PromptSource[]> => walk(entries, root, []);

/** The paths of `promptSources`. */
export const promptModules = async (
	entries: readonly string[] = PROMPT_ENTRIES,
	root = SRC_ROOT,
): Promise<readonly string[]> =>
	(await promptSources(entries, root)).map((source) => source.path);

/** The impurities of one module, as `path:line reads <kind> through <needle>`. */
const faultsOf = (
	path: string,
	text: string,
	impurities: readonly Impurity[],
): readonly string[] => {
	const lines: string[] = [];
	for (const [index, line] of text.split("\n").entries()) {
		for (const impurity of impurities) {
			if (line.includes(impurity.needle)) {
				lines.push(
					`${path}:${index + 1} reads ${impurity.kind} through ${impurity.needle}`,
				);
			}
		}
	}
	return lines;
};

/**
 * The faults of the prompt path, one line per reading. An empty list is a prompt path whose text is
 * a pure function of its inputs. A comment that names a needle is a fault too: the check reads lines
 * and not syntax, so the fix is to name the thing without writing the call.
 */
export const impureReads = async (
	entries: readonly string[] = PROMPT_ENTRIES,
	root = SRC_ROOT,
	impurities: readonly Impurity[] = IMPURITIES,
): Promise<readonly string[]> => {
	const sources = await promptSources(entries, root);
	return sources.flatMap((source) =>
		faultsOf(source.path, source.text, impurities),
	);
};
