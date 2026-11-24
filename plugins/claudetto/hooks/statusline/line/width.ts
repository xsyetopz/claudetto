const ESC = String.fromCodePoint(27);
const BEL = String.fromCodePoint(7);
// A CSI sequence is `ESC [`, parameter bytes 0x30-0x3F, intermediate bytes 0x20-0x2F, and a final byte 0x40-0x7E (ECMA-48 5th ed., 5.4); an OSC string ends with `ESC \` or with `BEL`.
const CSI = `${ESC}\\[[0-?]*[ -/]*[@-~]`;
const OSC = `${ESC}\\][^${BEL}${ESC}]*(?:${BEL}|${ESC}\\\\)`;
const ESCAPE = new RegExp(`${CSI}|${OSC}`, "gu");
const ESCAPE_SPLIT = new RegExp(`(${CSI}|${OSC})`, "u");
const BREAKS = /[\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/gu;
const INVISIBLE = /\p{Cf}/gu;
const SPACES = /\s+/gu;
const RESET = `${ESC}[0m`;
const VS16 = "️";
const ELLIPSIS = "...";
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

type Measure = (
	text: string,
	options?: { ambiguousIsNarrow: boolean }
) => number;

const isMeasure = (value: unknown): value is Measure =>
	typeof value === "function";

/** `Bun.stringWidth`, read off the global because the plugin's types name no Bun; absent outside Bun. */
const bunMeasure = (): Measure | undefined => {
	const bun: unknown = Reflect.get(globalThis, "Bun");
	const measure: unknown =
		typeof bun === "object" && bun !== null
			? Reflect.get(bun, "stringWidth")
			: undefined;
	return isMeasure(measure) ? measure : undefined;
};

/** `text` without escape sequences: colors take no column. */
export const plain = (text: string): string => text.replaceAll(ESCAPE, "");

/** A string from outside made safe to print: no control, format, or line-break character, so it cannot move the cursor or start an escape; runs of space become one. */
export const clean = (text: string): string =>
	text
		.replaceAll(INVISIBLE, "")
		.replaceAll(BREAKS, " ")
		.replaceAll(SPACES, " ")
		.trim();

const columnsOf = (cluster: string): number => {
	const measure = bunMeasure();
	if (measure === undefined) {
		return cluster.length === 0 ? 0 : 1;
	}
	// The wider reading of an East Asian Ambiguous glyph (UAX #11): a terminal that draws it wide never overflows, and one that draws it narrow only leaves a column free.
	const best = Math.max(
		measure(cluster, { ambiguousIsNarrow: true }),
		measure(cluster, { ambiguousIsNarrow: false })
	);
	return cluster.includes(VS16) ? Math.max(best, 2) : best;
};

/** The columns `text` takes: escapes take none and a grapheme cluster takes one cell group. */
export const width = (text: string): number => {
	let total = 0;
	for (const { segment } of graphemes.segment(plain(text))) {
		total += columnsOf(segment);
	}
	return total;
};

/** The clusters of `part` that fit `room` columns; `cut` is set when one did not fit. */
const take = (
	part: string,
	room: number
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

/** `text` cut to at most `max` columns with `...` last. It cuts between clusters and never inside an escape, and a reset ends the cut text so no color leaks. */
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
	let styled = false;
	for (const [index, part] of text.split(ESCAPE_SPLIT).entries()) {
		if (index % 2 === 1) {
			out += part;
			styled = part !== RESET;
			continue;
		}
		const taken = take(part, room - used);
		out += taken.kept;
		used += taken.used;
		if (taken.cut) {
			return `${out}${styled ? RESET : ""}${mark}`;
		}
	}
	return out;
};
