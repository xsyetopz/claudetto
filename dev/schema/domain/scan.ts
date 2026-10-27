const GATED_SPREAD = /^\.\.\.[^{]*?&&\{/;
const LETTER = /[a-z]/i;
const METHOD_CALL = /^\s*\.([\w$]+)\(/;
const OPEN_PAREN = /\(/;
const PLAIN_KEY = /^([\w$]+):/;
const THUNK_KEY = /^([\w$]+):\(\)=>/;
const WHITESPACE = /\s/;

export type Call = [name: string, args: string];

export interface Chain {
	head: string;
	headArgs?: string;
	calls: Call[];
}

export const ANCHOR = "{$schema:()=>";

const OPEN = "([{";
const CLOSE = ")]}";
const REGEX_AFTER = "(,=:[!&|?{};+-*%<>~^";
const KEYWORDS_BEFORE_REGEX = /(?:return|typeof|case|in|of|void|delete)$/;

type Visit = (index: number, char: string, depth: number) => boolean;

export const skipToken = (src: string, i: number, prev: string): number => {
	const c = src[i];
	if (c === '"' || c === "'") {
		return skipQuoted(src, i, c);
	}
	if (c === "`") {
		return skipTemplate(src, i);
	}
	if (c !== "/") {
		return i;
	}
	if (src[i + 1] === "/") {
		const end = src.indexOf("\n", i);
		return end < 0 ? src.length : end;
	}
	if (src[i + 1] === "*") {
		return src.indexOf("*/", i + 2) + 2;
	}
	const before = src.slice(Math.max(0, i - 8), i).trimEnd();
	const isRegex =
		prev === "" ||
		REGEX_AFTER.includes(prev) ||
		KEYWORDS_BEFORE_REGEX.test(before);
	return isRegex ? skipRegex(src, i) : i;
};

const skipQuoted = (src: string, i: number, quote: string): number => {
	for (let j = i + 1; j < src.length; j++) {
		switch (src[j]) {
			case "\\":
				j++;
				break;
			case quote:
				return j + 1;
		}
	}
	return src.length;
};

const skipTemplate = (src: string, i: number): number => {
	for (let j = i + 1; j < src.length; j++) {
		switch (src[j]) {
			case "\\":
				j++;
				break;
			case "`":
				return j + 1;
			case "$":
				if (src[j + 1] === "{") {
					j = matchClose(src, j + 1) ?? src.length;
				}
				break;
		}
	}
	return src.length;
};

const skipRegex = (src: string, i: number): number => {
	let inClass = false;
	for (let j = i + 1; j < src.length; j++) {
		const c = src[j];
		switch (c) {
			case "\\":
				j++;
				break;
			case "[":
				inClass = true;
				break;
			case "]":
				inClass = false;
				break;
			case "/": {
				if (inClass) {
					break;
				}
				let end = j + 1;
				while (LETTER.test(src[end] ?? "")) {
					end++;
				}
				return end;
			}
		}
	}
	return src.length;
};

const walk = (src: string, from: number, visit: Visit): number | null => {
	let depth = 0;
	let prev = "";
	for (let i = from; i < src.length; i++) {
		const next = skipToken(src, i, prev);
		if (next !== i) {
			prev = "x";
			i = next - 1;
			continue;
		}
		const c = src[i] ?? "";
		if (CLOSE.includes(c)) {
			depth--;
		}
		if (visit(i, c, depth)) {
			return i;
		}
		if (OPEN.includes(c)) {
			depth++;
		}
		if (!WHITESPACE.test(c)) {
			prev = c;
		}
	}
	return null;
};

export const matchClose = (src: string, open: number): number | null =>
	walk(src, open, (_i, c, depth) => CLOSE.includes(c) && depth === 0);

export const splitTop = (text: string): string[] => {
	const parts: string[] = [];
	let start = 0;
	walk(text, 0, (i, c, depth) => {
		if (c === "," && depth === 0) {
			parts.push(text.slice(start, i));
			start = i + 1;
		}
		return false;
	});
	parts.push(text.slice(start));
	return parts.map((p) => p.trim()).filter(Boolean);
};

export const exprEnd = (src: string, from: number): number => {
	const stop = walk(
		src,
		from,
		(_i, c, depth) =>
			(depth === 0 && (c === "," || c === ";")) ||
			(depth < 0 && CLOSE.includes(c)),
	);
	return stop ?? src.length;
};

/**
 * The settings schema is the `ANCHOR` object that holds the known settings keys.
 * Other `ANCHOR` objects, such as the plugin manifest schema, do not hold them.
 * A bundle with no such object gives the first `ANCHOR` object.
 */
const SETTINGS_KEYS = ["apiKeyHelper", "permissions"];

export const findSchemaStart = (src: string): number => {
	let first = -1;
	let start = src.indexOf(ANCHOR);
	while (start >= 0) {
		const end = matchClose(src, start);
		if (end !== null) {
			const body = src.slice(start + 1, end);
			const keys = parseEntries(body, true).map(([key]) => key);
			if (SETTINGS_KEYS.every((key) => keys.includes(key))) {
				return start;
			}
			if (first < 0) {
				first = start;
			}
		}
		start = src.indexOf(ANCHOR, start + 1);
	}
	return first;
};

export const findSchemaBody = (src: string): string | null => {
	const start = findSchemaStart(src);
	if (start < 0) {
		return null;
	}
	const end = matchClose(src, start);
	return end === null ? null : src.slice(start + 1, end);
};

/**
 * The bodies of the `shape` objects of the gated features, such as `autoMode:{buildGate:...,shape:()=>({...})}`, in bundle order.
 * The settings schema spreads these keys after its own keys.
 */
export const findFeatureShapes = (src: string): string[] =>
	[
		...src.matchAll(/[\w$]+:\{buildGate:[\s\S]{0,300}?shape:\(\)=>\(\{/g),
	].flatMap((m) => {
		const open = (m.index ?? 0) + m[0].length - 1;
		const close = matchClose(src, open);
		return close === null ? [] : [src.slice(open + 1, close)];
	});

export const splitPlus = (expr: string): string[] => {
	const parts: string[] = [];
	let start = 0;
	walk(expr, 0, (i, c, depth) => {
		if (c === "+" && depth === 0) {
			parts.push(expr.slice(start, i).trim());
			start = i + 1;
		}
		return false;
	});
	parts.push(expr.slice(start).trim());
	return parts;
};

export const chainCalls = (expr: string): Chain => {
	const calls: Call[] = [];
	let i = expr.search(OPEN_PAREN);
	const head = expr.slice(0, i).trim();
	if (i < 0) {
		return { head: expr.trim(), calls };
	}
	const first = matchClose(expr, i);
	// An unbalanced head has no args, and the scan of the calls starts at index 1.
	const headArgs = first === null ? "" : expr.slice(i + 1, first);
	i = (first ?? 0) + 1;
	while (i < expr.length) {
		const m = METHOD_CALL.exec(expr.slice(i));
		if (!m) {
			break;
		}
		const open = i + m[0].length - 1;
		const close = matchClose(expr, open);
		if (close === null) {
			break;
		}
		calls.push([m[1] ?? "", expr.slice(open + 1, close)]);
		i = close + 1;
	}
	return { head, headArgs, calls };
};

export const parseEntries = (
	body: string,
	thunk: boolean,
): [string, string][] => {
	const entries: [string, string][] = [];
	for (const part of splitTop(body)) {
		const gated = GATED_SPREAD.exec(part);
		if (gated) {
			const open = gated[0].length - 1;
			const close = matchClose(part, open);
			if (close !== null) {
				entries.push(...parseEntries(part.slice(open + 1, close), thunk));
			}
			continue;
		}
		const m = (thunk ? THUNK_KEY : PLAIN_KEY).exec(part);
		if (m) {
			entries.push([m[1] ?? "", part.slice(m[0].length).trim()]);
		}
	}
	return entries;
};
