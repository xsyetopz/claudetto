import { ELLIPSIS } from "./icons.ts";

const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);
const CSI = `${ESC}\\[[0-?]*[ -/]*[@-~]`;
const OSC = `${ESC}\\][^${BEL}${ESC}]*(?:${BEL}|${ESC}\\\\)`;
const ESCAPE = new RegExp(`${CSI}|${OSC}`, "g");
const ESCAPE_SPLIT = new RegExp(`(${CSI}|${OSC})`);
const BREAKS = /[\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/gu;
const INVISIBLE = /\p{Cf}/gu;
const SPACES = /\s+/g;
const RESET = `${ESC}[0m`;
const LINK_END = `${ESC}]8;;${BEL}`;
const LINK_OPEN = new RegExp(`^${ESC}\\]8;;.`);
const VS16 = "️";
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** `text` without escape sequences: colors and links take no column. */
export const plain = (text: string): string => text.replace(ESCAPE, "");

/** A string from outside made safe to print: no control, format, or line-break character, so it cannot move the cursor, start an escape, or reorder the line; runs of space become one. */
export const clean = (text: string): string =>
	text.replace(INVISIBLE, "").replace(BREAKS, " ").replace(SPACES, " ").trim();

const columnsOf = (cluster: string): number => {
	// The wider of the two readings: a terminal that draws an ambiguous glyph wide then never overflows, and one that draws it narrow only leaves a column free.
	const narrow = globalThis.Bun.stringWidth(cluster, {
		ambiguousIsNarrow: true,
	});
	const wide = globalThis.Bun.stringWidth(cluster, {
		ambiguousIsNarrow: false,
	});
	const best = Math.max(narrow, wide);
	return cluster.includes(VS16) ? Math.max(best, 2) : best;
};

/** The columns `text` takes: escapes take none, a cluster (emoji with a variation selector, a joined sequence, a letter with marks) takes one cell group, and an ambiguous or private-use glyph counts as wide. */
export const width = (text: string): number => {
	let total = 0;
	for (const { segment } of graphemes.segment(plain(text))) {
		total += columnsOf(segment);
	}
	return total;
};

/** Whether a style or a link is open after the escape `part`. */
const openAfter = (
	part: string,
	{ styled, linked }: { styled: boolean; linked: boolean },
): { styled: boolean; linked: boolean } =>
	LINK_OPEN.test(part)
		? { styled, linked: part !== LINK_END }
		: { styled: part !== RESET, linked };

/** The clusters of `part` that fit `room` columns; `cut` is set when one did not fit. */
const take = (
	part: string,
	room: number,
): { kept: string; used: number; cut: boolean } => {
	let kept = "";
	let used = 0;
	for (const { segment } of graphemes.segment(part)) {
		const columns = columnsOf(segment);
		if (used + columns > room) {
			return { kept, used, cut: true };
		}
		kept += segment;
		used += columns;
	}
	return { kept, used, cut: false };
};

/** `text` cut to at most `max` columns with `...` last. It cuts between clusters and never inside an escape, and a reset ends the cut text so no color or link leaks. */
export const truncate = (text: string, max: number): string => {
	if (width(text) <= max) {
		return text;
	}
	if (max <= 0) {
		return "";
	}
	const mark = max > ELLIPSIS.length ? ELLIPSIS : "";
	const room = max - mark.length;
	let out = "";
	let used = 0;
	let state = { styled: false, linked: false };
	for (const [index, part] of text.split(ESCAPE_SPLIT).entries()) {
		if (index % 2 === 1) {
			out += part;
			state = openAfter(part, state);
			continue;
		}
		const taken = take(part, room - used);
		out += taken.kept;
		used += taken.used;
		if (taken.cut) {
			const tail = (state.linked ? LINK_END : "") + (state.styled ? RESET : "");
			return `${out}${tail}${mark}`;
		}
	}
	return out;
};
