import { isTestFile, listPaths } from "./paths";

/** What changed in one staged test file between the index and the work tree. */
export interface Tampered {
	file: string;
	/** True when the work tree no longer has the file. */
	deleted: boolean;
	/** Skip, only and todo markers the work tree has more of than the index. */
	addedMarkers: string[];
	/** Assertion counts, set when the work tree has fewer than the index. */
	assertions: { before: number; after: number } | null;
}

/** The skip, only and todo markers; each is counted by occurrence. */
const MARKERS = [
	".skip(",
	".only(",
	"xit(",
	"xdescribe(",
	"test.todo(",
	"it.todo("
] as const;
// A word character before `xit(` or `xdescribe(` means a longer name such as `exit(` or `fixit(`.
const WORD_BEFORE = String.raw`(?<![A-Za-z0-9_$])`;
const MARKER_PATTERN = new Map<string, RegExp>(
	MARKERS.map((marker) => [
		marker,
		new RegExp(
			(marker.startsWith(".") ? "" : WORD_BEFORE) +
				marker.replaceAll(/[.()]/gu, String.raw`\$&`),
			"gu"
		)
	])
);
/** `expect(`, `assert x`, `assert(`, `assert.equal(` and `assertEqual(` style calls. */
const ASSERTION = /\b(?:expect(?=\s*\()|assert(?:[A-Z_]\w*)?(?=[\s(.]))/gu;

/** The number of assertion calls in a test text: a heuristic, so a framework with other names counts none. */
export function countAssertions(text: string): number {
	return text.match(ASSERTION)?.length ?? 0;
}

/** The occurrences of each skip, only and todo marker in a test text. */
export function countMarkers(text: string): Map<string, number> {
	return new Map(
		[...MARKER_PATTERN].map(([marker, pattern]) => [
			marker,
			text.match(pattern)?.length ?? 0
		])
	);
}

/** The tampering one staged test shows between `index` and `now`, or `undefined` when none. */
export function compareTest(
	file: string,
	index: string,
	now: string
): Tampered | undefined {
	const before = countMarkers(index);
	const after = countMarkers(now);
	const addedMarkers = MARKERS.filter(
		(marker) => (after.get(marker) ?? 0) > (before.get(marker) ?? 0)
	);
	const was = countAssertions(index);
	const is = countAssertions(now);
	if (addedMarkers.length === 0 && is >= was) {
		return undefined;
	}
	return {
		file,
		deleted: false,
		addedMarkers,
		assertions: is < was ? { before: was, after: is } : null
	};
}

/**
 * Compares each test file edited since staging with its index text.
 *
 * A file with no index text (not staged yet) has nothing to compare and is skipped.
 *
 * @param diff `git diff --name-only` output: files changed in the work tree against the index.
 * @param deleted `git diff --name-only --diff-filter=D` output: the files missing from the work tree.
 * @param index Index text by path.
 * @param texts Work tree text by path.
 */
export function tamperedTests(
	diff: string,
	deleted: string,
	index: ReadonlyMap<string, string>,
	texts: ReadonlyMap<string, string>
): Tampered[] {
	const gone = new Set(listPaths(deleted));
	const found: Tampered[] = [];
	for (const file of listPaths(diff).filter((p) => isTestFile(p))) {
		const staged = index.get(file);
		const now = texts.get(file);
		if (gone.has(file)) {
			found.push({ file, deleted: true, addedMarkers: [], assertions: null });
		} else if (staged !== undefined && now !== undefined) {
			const change = compareTest(file, staged, now);
			if (change !== undefined) {
				found.push(change);
			}
		}
	}
	return found;
}
