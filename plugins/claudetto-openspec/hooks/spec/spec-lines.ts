// Line-level helpers of the spec reader: line endings, requirement names, and fenced-block masks.
export interface Block {
	name: string;
	raw: string;
}

const FENCE_OPEN = /^\s*(`{3,}|~{3,})(.*)/u;
const FENCE_CLOSE = /^\s*(`{3,}|~{3,})\s*$/u;
const TRAILING_HASHES = /[ \t]+#+[ \t]*$/u;
const WHITESPACE = /\s+/gu;
const BOM = /^﻿/u;
export const LINE_BREAK = /\r\n?/gu;

export const norm = (name: string) => name.replace(TRAILING_HASHES, "").trim();
export const fold = (name: string) =>
	norm(name).toLowerCase().replaceAll(WHITESPACE, " ");
export const lineBreaks = (md: string) =>
	md.replace(BOM, "").replaceAll(LINE_BREAK, "\n");

// A mask entry past the end of the lines reads as unfenced.
export const masked = (mask: boolean[], i: number) => mask[i] === true;

interface Fence {
	ch: string;
	len: number;
}

const opens = (line: string): Fence | undefined => {
	const m = FENCE_OPEN.exec(line);
	if (!m) {
		return undefined;
	}
	const run = m[1] ?? "";
	if (run.startsWith("`") && (m[2] ?? "").includes("`")) {
		return undefined;
	}
	return { ch: run[0] ?? "", len: run.length };
};

const closes = (line: string, open: Fence) => {
	const run = FENCE_CLOSE.exec(line)?.[1];
	return run !== undefined && run.startsWith(open.ch) && run.length >= open.len;
};

// True for lines inside a fenced block, fence lines included.
export const fenceMask = (lines: string[]) => {
	let open: Fence | undefined;
	return lines.map((line) => {
		if (open === undefined) {
			open = opens(line);
			return open !== undefined;
		}
		if (closes(line, open)) {
			open = undefined;
		}
		return true;
	});
};
