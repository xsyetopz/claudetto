// The `learn:` block at the end of a main reply (spec `side-notes`, "Learn Block"): a `learn:` line, an optional `tag:` line, and an optional `explain:` block.

import type { Note } from "../../domain/notes.ts";

// Only a lowercase line with no indent, outside a code fence, starts a block, so a config line such as `  learn: true` stays reply text.
const START = /^learn:\s*(.*)$/;
const FENCE = /^\s{0,3}(?:```|~~~)/;
const TAG = /^\s*tag:\s*(.*)$/i;
const NONE = /^none\.?$/i;
const EXPLAIN = /^\s*explain:\s*(.*)$/i;

const parseBlock = (
	lines: readonly string[],
): { tag: string; explain: string } => {
	let tag = "";
	const explain: string[] = [];
	let isExplain = false;
	for (const l of lines) {
		const e = EXPLAIN.exec(l);
		if (e) {
			isExplain = true;
			if (e[1]) {
				explain.push(e[1]);
			}
		} else if (isExplain) {
			explain.push(l);
		} else {
			tag = TAG.exec(l)?.[1]?.trim() || tag;
		}
	}
	return { tag, explain: explain.join("\n").trim() };
};

/** `reply` without its block, and the note of the block (`null` for no block or for `learn: none`). */
export const parseLearn = (
	reply: string,
): { shown: string; note: Note | null } => {
	const lines = reply.split("\n");
	let isFenced = false;
	let at = -1;
	lines.forEach((l, i) => {
		if (FENCE.test(l)) {
			isFenced = !isFenced;
		} else if (!isFenced && START.test(l)) {
			at = i;
		}
	});
	if (at < 0) {
		return { shown: reply, note: null };
	}
	const line = (START.exec(lines[at] ?? "")?.[1] ?? "").trim();
	const { tag, explain } = parseBlock(lines.slice(at + 1));
	const shown = lines.slice(0, at).join("\n").trimEnd();
	if (line === "" || NONE.test(line)) {
		return { shown, note: null };
	}
	return {
		shown,
		note: { tag: tag || "Note", line, explain: explain || line },
	};
};

/** `true` when the start of a line can still become a `learn:` line. */
const canStart = (line: string): boolean =>
	line.startsWith("learn:") || "learn:".startsWith(line);

/** Removes the block from a reply that streams in pieces: `push` gives the text to show now, and `end` gives the rest. Only a line that can start a block waits for its end. */
export const learnFilter = () => {
	let line = "";
	let shownLine = "";
	let isOut = false;
	let isFenced = false;
	let gap = "";
	let block: string | null = null;
	const lineEnd = (): string => {
		if (block !== null) {
			block += "\n";
			return "";
		}
		if (isOut) {
			if (FENCE.test(shownLine)) {
				isFenced = !isFenced;
			}
			isOut = false;
			gap = "\n";
			shownLine = "";
			return "";
		}
		const l = line;
		line = "";
		if (START.test(l)) {
			block = `${l}\n`;
			return "";
		}
		if (l === "") {
			gap += "\n";
			return "";
		}
		const out = gap + l;
		gap = "\n";
		return out;
	};
	const feed = (piece: string): string => {
		if (block !== null) {
			block += piece;
			return "";
		}
		if (isOut) {
			shownLine += piece;
			return piece;
		}
		line += piece;
		if (!isFenced && canStart(line)) {
			return "";
		}
		const out = gap + line;
		isOut = true;
		gap = "";
		shownLine = line;
		line = "";
		return out;
	};
	return {
		push: (text: string): string =>
			text
				.split("\n")
				.map((p, i) => (i === 0 ? "" : lineEnd()) + feed(p))
				.join(""),
		end: (): string => {
			const out = isOut ? "" : lineEnd();
			if (block === null) {
				return out;
			}
			const { shown } = parseLearn(block);
			return shown ? gap + shown : "";
		},
	};
};
