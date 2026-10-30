import { BRACE_WORDS_MAX } from "./limits.ts";

interface Char {
	c: string;
	brace: boolean;
	lit: boolean;
}

export interface Expanded {
	text: string;
	lits: number[];
}

interface Group {
	close: number;
	items: Char[][];
}

const LEADING_ZERO = /^-?0\d/;
const DIGIT = /\d/;
const SEQUENCE = /^(-?\d+|[A-Za-z])\.\.(-?\d+|[A-Za-z])(?:\.\.(-?\d+))?$/;

const NO_CHAR: Char = { c: "", brace: false, lit: false };

const plain = (text: string): Char[] =>
	text.split("").map((c) => ({ c, brace: false, lit: false }));

const join = (w: Char[]): string => w.map((ch) => ch.c).join("");

/** A number with a leading zero pads each number to the widest of the two ends. */
const padOf = (numeric: boolean, a: string, b: string): number =>
	numeric && [a, b].some((n) => LEADING_ZERO.test(n))
		? Math.max(a.length, b.length)
		: 0;

const sequence = (body: string): string[] | null => {
	const m = SEQUENCE.exec(body);
	if (!m) {
		return null;
	}
	const [, a = "", b = "", s] = m;
	const numeric = DIGIT.test(a);
	if (numeric !== DIGIT.test(b)) {
		return null;
	}
	const from = numeric ? Number(a) : a.charCodeAt(0);
	const to = numeric ? Number(b) : b.charCodeAt(0);
	const step = (to < from ? -1 : 1) * (Math.abs(Number(s ?? 1)) || 1);
	const pad = padOf(numeric, a, b);
	const out: string[] = [];
	for (let n = from; step > 0 ? n <= to : n >= to; n += step) {
		if (out.length > BRACE_WORDS_MAX) {
			break;
		}
		out.push(numeric ? String(n).padStart(pad, "0") : String.fromCharCode(n));
	}
	return out;
};

const closeGroup = (w: Char[], open: number, cuts: number[], close: number) => {
	if (cuts.length > 1) {
		return {
			close,
			items: [...cuts, close]
				.slice(1)
				.map((cut, k) => w.slice((cuts[k] ?? 0) + 1, cut)),
		};
	}
	const words = sequence(join(w.slice(open + 1, close)));
	return words && { close, items: words.map(plain) };
};

const groupAt = (w: Char[], open: number): Group | null => {
	let depth = 0;
	const cuts = [open];
	for (let j = open + 1; j < w.length; j++) {
		const { c, brace } = w[j] ?? NO_CHAR;
		if (!brace) {
			continue;
		}
		if (c === "{") {
			depth++;
		} else if (c === "}" && depth > 0) {
			depth--;
		} else if (c === "," && depth === 0) {
			cuts.push(j);
		} else if (c === "}") {
			return closeGroup(w, open, cuts, j);
		}
	}
	return null;
};

const expand = (w: Char[], out: Expanded[]): void => {
	if (out.length > BRACE_WORDS_MAX) {
		return;
	}
	for (let open = 0; open < w.length; open++) {
		const { c, brace } = w[open] ?? NO_CHAR;
		const group = brace && c === "{" ? groupAt(w, open) : null;
		if (!group) {
			continue;
		}
		const head = w.slice(0, open);
		const tail = w.slice(group.close + 1);
		for (const item of group.items) {
			expand([...head, ...item, ...tail], out);
		}
		return;
	}
	out.push({
		text: join(w),
		lits: w.flatMap((ch, k) => (ch.lit ? [k] : [])),
	});
};

/** A quoted brace or comma does not expand, so `marks` holds only the unquoted ones. */
export const expandBraces = (
	word: string,
	marks: number[],
	lits: readonly number[] = [],
): Expanded[] => {
	const at = new Set(marks);
	const out: Expanded[] = [];
	expand(
		word
			.split("")
			.map((c, i) => ({ c, brace: at.has(i), lit: lits.includes(i) })),
		out,
	);
	return out.length > BRACE_WORDS_MAX ? [{ text: "", lits: [] }] : out;
};
