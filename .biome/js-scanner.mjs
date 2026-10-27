// Scans JavaScript and TypeScript text for comments, and skips strings, templates, and regex literals.
import { closeAt, readComment, skipQuoted, WHITESPACE } from "./comment-primitives.mjs";

/** @typedef {import("./comment-primitives.mjs").Comment} Comment */
/** @typedef {import("./comment-primitives.mjs").Scanner} Scanner */

const KEYWORDS = new Set(["return", "typeof", "case", "in", "of", "delete"]);
const CLOSERS = new Set([")", "]"]);
const IDENT_CHAR = /[\w$]/;
const FLAG_CHAR = /[a-z]/;

/**
 * Returns the index after a regex literal that starts at `from`, past the slash.
 * @param {string} src
 * @param {number} from
 * @param {number} to
 * @returns {number}
 */
const skipRegex = (src, from, to) => {
	let i = from;
	let inClass = false;
	while (i < to && src.charAt(i) !== "\n") {
		const char = src.charAt(i);
		if (char === "/" && !inClass) {
			i += 1;
			while (FLAG_CHAR.test(src.charAt(i))) {
				i += 1;
			}
			return i;
		}
		inClass = char === "[" || (inClass && char !== "]");
		i += char === "\\" ? 2 : 1;
	}
	return i;
};

/**
 * Returns the index after template text, and whether it stopped at a `${`.
 * @param {string} src
 * @param {number} from
 * @param {number} to
 * @returns {[number, boolean]}
 */
const skipTemplate = (src, from, to) => {
	let i = from;
	while (i < to) {
		if (src.charAt(i) === "`") {
			return [i + 1, false];
		}
		if (src.startsWith("${", i)) {
			return [i + 2, true];
		}
		i += src.charAt(i) === "\\" ? 2 : 1;
	}
	return [i, false];
};

/**
 * @typedef {{ found: Comment[], braces: number[], expr: boolean }} JsState
 */

/**
 * Skips template text from `start`, and enters a `${` interpolation when one opens.
 * @param {string} src
 * @param {number} start
 * @param {number} to
 * @param {JsState} state
 * @returns {number}
 */
const jsTemplate = (src, start, to, state) => {
	const [next, opened] = skipTemplate(src, start, to);
	state.expr = opened;
	if (opened) {
		state.braces.push(0);
	}
	return next;
};

/**
 * Handles a comment, string, template, or regex at i, and returns the next index or -1.
 * @param {string} src
 * @param {number} i
 * @param {number} to
 * @param {JsState} state
 * @returns {number}
 */
const jsLiteral = (src, i, to, state) => {
	const char = src.charAt(i);
	const comment = readComment(src, i, to, "//", true);
	if (comment) {
		state.found.push({ at: comment.at, text: comment.text });
		return comment.next;
	}
	if (char === "`") {
		return jsTemplate(src, i + 1, to, state);
	}
	const isRegex = char === "/" && state.expr && src.charAt(i - 1) !== "<";
	const isApostrophe = char === "'" && IDENT_CHAR.test(src.charAt(i - 1));
	if (!isApostrophe && (char === '"' || char === "'" || isRegex)) {
		state.expr = false;
		return isRegex
			? skipRegex(src, i + 1, to)
			: skipQuoted(src, i + 1, char, to);
	}
	return -1;
};

/**
 * Tells whether i starts a postfix `++` or `--`, which leaves a value behind.
 * @param {string} src
 * @param {number} i
 * @param {JsState} state
 * @returns {boolean}
 */
const isPostfix = (src, i, state) => {
	const char = src.charAt(i);
	return (
		(char === "+" || char === "-") && src.charAt(i + 1) === char && !state.expr
	);
};

/**
 * Handles an identifier, a closing template brace, or punctuation at i.
 * @param {string} src
 * @param {number} i
 * @param {number} to
 * @param {JsState} state
 * @returns {number}
 */
const jsCode = (src, i, to, state) => {
	const char = src.charAt(i);
	if (char === "}" && state.braces.at(-1) === 0) {
		state.braces.pop();
		return jsTemplate(src, i + 1, to, state);
	}
	if (IDENT_CHAR.test(char)) {
		let end = i;
		while (end < to && IDENT_CHAR.test(src.charAt(end))) {
			end += 1;
		}
		state.expr = KEYWORDS.has(src.slice(i, end));
		return end;
	}
	if (isPostfix(src, i, state)) {
		return i + 2;
	}
	if (state.braces.length > 0 && (char === "{" || char === "}")) {
		state.braces.push((state.braces.pop() ?? 0) + (char === "{" ? 1 : -1));
	}
	state.expr = WHITESPACE.test(char) ? state.expr : !CLOSERS.has(char);
	return i + 1;
};

/** @type {Scanner} */
export const jsScanner = (src, from, to) => {
	/** @type {JsState} */
	const state = { found: [], braces: [], expr: true };
	let i = from;
	while (i < to) {
		const literal = jsLiteral(src, i, to, state);
		i = literal === -1 ? jsCode(src, i, to, state) : literal;
	}
	return state.found;
};
