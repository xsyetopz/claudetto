// Helpers that read the minified JavaScript of `strings.txt`.
// A "static byte" is a byte of the source form of a string, with the `${...}` parts of a template left out.

const COMMA_START = /^,/;
const IDENT_OR_DOT = /[\w$.]/;
const IDENT_START = /^[A-Za-z_$][\w$]*/;
const QUOTE_CHAR = /["'`]/;

/** The index after the string or template literal that starts at `k`. */
export const skipStr = (t: string, k: number): number => {
	let i = k + 1;
	for (; i < t.length; i++) {
		switch (t[i]) {
			case "\\":
				i++;
				break;
			case t[k]:
				return i + 1;
			default:
				if (t[k] === "`" && t[i] === "$" && t[i + 1] === "{") {
					i = skipBlock(t, i + 1) - 1;
				}
		}
	}
	return i;
};

const CLOSE: Record<string, string> = { "{": "}", "(": ")", "[": "]" };
/** The index after the bracket block that starts at `k`. */
export const skipBlock = (t: string, k: number): number => {
	let depth = 0;
	for (let i = k; i < t.length; i++) {
		const c = t[i] ?? "";
		if (c === '"' || c === "'" || c === "`") {
			i = skipStr(t, i) - 1;
		} else if (c === t[k]) {
			depth++;
		} else if (c === CLOSE[t[k] ?? ""] && --depth === 0) {
			return i + 1;
		}
	}
	return t.length;
};

/** The end of the block at `k`, cut 60 KB after it: a regex literal with a quote in it can break the scan. */
export const partEnd = (t: string, k: number): number =>
	Math.min(skipBlock(t, k), k + 60_000);

/** The pieces of static text of `t[from, to)`: the text of its literals, and of the code in the `${}` of a template. */
export const staticParts = (t: string, from: number, to: number): string[] => {
	const pieces: string[] = [];
	for (let i = from; i < to; i++) {
		const q = t[i] ?? "";
		if (q !== '"' && q !== "'" && q !== "`") {
			continue;
		}
		const end = skipStr(t, i);
		let text = t.slice(i + 1, end - 1);
		for (let j = i + 1; q === "`" && j < end - 1; j++) {
			if (t[j] === "\\") {
				j++;
			} else if (t[j] === "$" && t[j + 1] === "{") {
				const after = skipBlock(t, j + 1);
				pieces.push(...staticParts(t, j + 2, after - 1));
				text = text.replace(t.slice(j, after), "");
				j = after - 1;
			}
		}
		pieces.push(text);
		i = end - 1;
	}
	return pieces;
};

const sizeOf = (pieces: string[]): number => {
	let total = 0;
	for (const p of pieces) {
		total += Buffer.byteLength(p);
	}
	return total;
};

/** The static bytes of `t[from, to)`: the bytes of `staticParts`. */
export const staticBytes = (t: string, from: number, to: number): number =>
	sizeOf(staticParts(t, from, to));

/** The static bytes of a literal that starts at `k`. */
export const literalBytes = (t: string, k: number): number =>
	staticBytes(t, k, skipStr(t, k));

let indexed: { t: string; defs: Map<string, [number, boolean][]> } | undefined;
/** The definitions of the bundle by name: `X="..."` (not a function) and `function X(` (a function), with their places. */
const index = (t: string) => {
	if (indexed?.t === t) {
		return indexed.defs;
	}
	const defs = new Map<string, [number, boolean][]>();
	for (const m of t.matchAll(
		/[\s,;{(]([\w$]+)=["'`]|function\*? ?([\w$]+)\(/g,
	)) {
		const id = m[1] ?? m[2] ?? "";
		defs.set(id, [...(defs.get(id) ?? []), [m.index, m[1] === undefined]]);
	}
	indexed = { t, defs };
	return defs;
};

/** The names of 2 letters or more that the code of `t[from, to)` uses, outside strings. */
const codeIds = (t: string, from: number, to: number): Set<string> => {
	const ids = new Set<string>();
	for (let i = from; i < to; i++) {
		if (QUOTE_CHAR.test(t[i] ?? "")) {
			i = skipStr(t, i) - 1;
			continue;
		}
		const m = IDENT_START.exec(t.slice(i, i + 40));
		if (
			m &&
			!IDENT_OR_DOT.test(t[i - 1] ?? " ") &&
			m[0].length > 1 &&
			t[i + m[0].length] !== ":"
		) {
			ids.add(m[0]);
		}
		i += (m?.[0].length ?? 1) - 1;
	}
	return ids;
};

/** The pieces of one definition: a constant text, or a function body when `fns` is set. */
const defParts = (
	t: string,
	best: [number, boolean],
	fns: boolean,
): string[] => {
	if (!best[1]) {
		const k = t.indexOf("=", best[0]) + 1;
		return staticParts(t, k, skipStr(t, k));
	}
	if (!fns) {
		return [];
	}
	const body = t.indexOf("{", skipBlock(t, t.indexOf("(", best[0])));
	return staticParts(t, body, skipBlock(t, body));
};

/** The pieces of the constants (`X="..."`) and functions that the code of `t[from, to)` names, from the definition nearest to `from`: a minified name is local to one chunk, and the nearest one is the one of the chunk. A text over 100 KB is shared, so it counts 0. */
const refParts = (
	t: string,
	from: number,
	to: number,
	fns: boolean,
): string[] => {
	const pieces: string[] = [];
	for (const id of [...codeIds(t, from, to)].slice(0, 60)) {
		const best = (index(t).get(id) ?? []).sort(
			(x, y) => Math.abs(x[0] - from) - Math.abs(y[0] - from),
		)[0];
		if (!best) {
			continue;
		}
		const def = defParts(t, best, fns);
		if (sizeOf(def) <= 100_000) {
			pieces.push(...def);
		}
	}
	return pieces;
};

/** The static bytes of `t[from, to)` plus the bytes of `refParts`. */
export const bytesWithRefs = (
	t: string,
	from: number,
	to: number,
	fns = false,
): number =>
	sizeOf([...staticParts(t, from, to), ...refParts(t, from, to, fns)]);

/** The text that `bytesWithRefs` counts, one piece to a line. */
export const textWithRefs = (
	t: string,
	from: number,
	to: number,
	fns = false,
): string =>
	[...staticParts(t, from, to), ...refParts(t, from, to, fns)].join("\n");

/**
 * The end of the code that starts at `from`: the first unmatched closing bracket, or the first `,` (or `stop` match) outside every bracket.
 * It reads a member of an object (`key:value,`), an arrow function in a map, and a `case` branch (`stop` finds the next `case`).
 */
export const blockEnd = (
	t: string,
	from: number,
	stop = COMMA_START,
): number => {
	let depth = 0;
	const limit = Math.min(t.length, from + 60_000);
	for (let i = from; i < limit; i++) {
		const c = t[i] ?? "";
		if (QUOTE_CHAR.test(c)) {
			i = skipStr(t, i) - 1;
		} else if ("{([".includes(c)) {
			depth++;
		} else if ("})]".includes(c) && --depth < 0) {
			return i;
		} else if (depth === 0 && i > from && stop.test(t.slice(i, i + 8))) {
			return i;
		}
	}
	return limit;
};

/** The bytes of the model-facing members of the object that starts at `open`: the text of the `keys` members and of the constants they name. */
export const memberBytes = (
	t: string,
	open: number,
	keys: string[],
): number => {
	const end = partEnd(t, open);
	const re = new RegExp(
		`(?<![\\w$.])(?:async )?(?:${keys.join("|")})(?=[(:])`,
		"g",
	);
	let bytes = 0;
	for (const m of t.slice(open, end).matchAll(re)) {
		const from = open + m.index;
		bytes += bytesWithRefs(t, from, blockEnd(t, from), true);
	}
	return bytes;
};
