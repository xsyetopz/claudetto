import type { Hunk } from "./parse";

/** Line comparers from strict to loose; the first one that finds the context decides. */
const LEVELS: readonly ((line: string) => string)[] = [
	(line) => line,
	(line) => line.trimEnd(),
	(line) => line.trim()
];

/** Every index at which `needle` matches `lines` under one comparer, from `start`. */
const positions = (
	lines: readonly string[],
	needle: readonly string[],
	start: number,
	fold: (line: string) => string
): number[] => {
	const hits: number[] = [];
	for (let at = start; at + needle.length <= lines.length; at++) {
		if (needle.every((text, k) => fold(lines[at + k] ?? "") === fold(text))) {
			hits.push(at);
		}
	}
	return hits;
};

/** The file line most like `text`, as `line N: "..."`, for an error the model reads. */
export const nearest = (lines: readonly string[], text: string): string => {
	const want = text.trim();
	let best = -1;
	let bestScore = -1;
	for (const [at, line] of lines.entries()) {
		const have = line.trim();
		let score = 0;
		while (score < want.length && have[score] === want[score]) {
			score++;
		}
		if (score > bestScore) {
			bestScore = score;
			best = at;
		}
	}
	return best === -1
		? "the file is empty"
		: `nearest is line ${best + 1}: "${(lines[best] ?? "").trim().slice(0, 80)}"`;
};

/** Where a hunk's old lines sit, or the error that refuses the patch. */
export type Located = { at: number; length: number } | { error: string };

/** The line after the hunk's anchor, or the error when the anchor is missing. */
const afterAnchor = (
	lines: readonly string[],
	anchor: string,
	cursor: number
): number | { error: string } => {
	const found = LEVELS.map((fold) =>
		positions(lines, [anchor], cursor, fold)
	).find((hits) => hits.length > 0);
	return found === undefined
		? {
				error: `anchor "${anchor.trim()}" not found; ${nearest(lines, anchor)}`
			}
		: (found[0] ?? 0) + 1;
};

/** Placement of a hunk with no old lines: at the end, or right after its anchor. */
const insertion = (hunk: Hunk, size: number, start: number): Located => {
	if (hunk.isAtEnd) {
		return { at: size, length: 0 };
	}
	return hunk.anchor === undefined
		? {
				error:
					"a hunk of only added lines needs an @@ anchor or *** End of File"
			}
		: { at: start, length: 0 };
};

/** Placement of a hunk pinned to the end of the file. */
const atEnd = (
	lines: readonly string[],
	old: readonly string[],
	start: number
): Located => {
	const at = lines.length - old.length;
	const fits =
		at >= start &&
		LEVELS.some((fold) => positions(lines, old, at, fold)[0] === at);
	return fits
		? { at, length: old.length }
		: {
				error: `context at the end of the file not found; ${nearest(lines, old.at(-1) ?? "")}`
			};
};

/**
 * Finds a hunk's old lines (context and removed) in the file's lines, at or
 * after `cursor` and after the hunk's anchor line. Exact comparison runs
 * first, then trailing-whitespace-folded, then trimmed; the first level with a
 * hit decides. With an anchor the first hit after it is the hunk, because the
 * anchor names the block the hunk edits and a later copy of the same lines lies
 * in another block; without one, more than one hit is ambiguous.
 *
 * @param lines The file's lines without terminators.
 * @param hunk The hunk to place.
 * @param cursor The first line the search may use (the end of the previous hunk).
 * @returns The start index and length of the old lines, or an error.
 */
export function locate(
	lines: readonly string[],
	hunk: Hunk,
	cursor: number
): Located {
	const old = hunk.lines.filter((l) => l.kind !== "+").map((l) => l.text);
	const start =
		hunk.anchor === undefined
			? cursor
			: afterAnchor(lines, hunk.anchor, cursor);
	if (typeof start !== "number") {
		return start;
	}
	if (old.length === 0) {
		return insertion(hunk, lines.length, start);
	}
	if (hunk.isAtEnd) {
		return atEnd(lines, old, start);
	}
	for (const fold of LEVELS) {
		const hits = positions(lines, old, start, fold);
		if (hits.length === 1 || (hits.length > 1 && hunk.anchor !== undefined)) {
			return { at: hits[0] ?? 0, length: old.length };
		}
		if (hits.length > 1) {
			const shown = hits.slice(0, 4).map((h) => h + 1);
			return {
				error: `context matches ${hits.length} places (lines ${shown.join(", ")}); add an @@ anchor or more context`
			};
		}
	}
	const first = old.find((text) => text.trim() !== "") ?? old[0] ?? "";
	return { error: `context not found; ${nearest(lines, first)}` };
}
