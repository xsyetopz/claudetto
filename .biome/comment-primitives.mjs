// Scans CSS, JSON, and GraphQL text for comments, and holds the string and comment readers that every scanner uses.
export const WHITESPACE = /\s/;

/**
 * @typedef {{ at: number, text: string }} Comment
 * @typedef {(src: string, from: number, to: number) => Comment[]} Scanner
 */

/**
 * Returns the index of the closing marker, or `to` when it is missing.
 * @param {string} src
 * @param {string} close
 * @param {number} from
 * @param {number} to
 * @returns {number}
 */
export const closeAt = (src, close, from, to) => {
	const found = src.indexOf(close, from);
	return found === -1 || found > to ? to : found;
};

/**
 * Reads a line comment (when `line` is set) or a block comment at index i.
 * @param {string} src
 * @param {number} i
 * @param {number} to
 * @param {string} line
 * @param {boolean} block
 * @returns {(Comment & { next: number }) | null}
 */
export const readComment = (src, i, to, line, block) => {
	if (line && src.startsWith(line, i)) {
		const end = closeAt(src, "\n", i, to);
		return {
			at: i + line.length,
			text: src.slice(i + line.length, end),
			next: end,
		};
	}
	if (block && src.startsWith("/*", i)) {
		const end = closeAt(src, "*/", i + 2, to);
		return { at: i + 2, text: src.slice(i + 2, end), next: end + 2 };
	}
	return null;
};

/**
 * Returns the index after a quoted string; an unterminated one ends at the line break.
 * @param {string} src
 * @param {number} from
 * @param {string} quote
 * @param {number} to
 * @returns {number}
 */
export const skipQuoted = (src, from, quote, to) => {
	let i = from;
	while (i < to && src.charAt(i) !== "\n") {
		if (src.charAt(i) === quote) {
			return i + 1;
		}
		i += src.charAt(i) === "\\" ? 2 : 1;
	}
	return i;
};

/**
 * Returns the index after a string at i, or i when none starts there.
 * @param {string} src
 * @param {number} i
 * @param {number} to
 * @param {boolean} triple
 * @returns {number}
 */
const skipString = (src, i, to, triple) => {
	const char = src.charAt(i);
	if (triple && src.startsWith('"""', i)) {
		return closeAt(src, '"""', i + 3, to) + 3;
	}
	return char === '"' || char === "'" ? skipQuoted(src, i + 1, char, to) : i;
};

/**
 * Returns the index after an unquoted `url(...)` at i, or i when none starts there.
 * @param {string} src
 * @param {number} i
 * @param {number} to
 * @returns {number}
 */
const skipUrl = (src, i, to) => {
	if (src.slice(i, i + 4).toLowerCase() !== "url(") {
		return i;
	}
	let start = i + 4;
	while (WHITESPACE.test(src.charAt(start))) {
		start += 1;
	}
	if (src.charAt(start) === '"' || src.charAt(start) === "'") {
		return i;
	}
	return closeAt(src, ")", start, to) + 1;
};

/**
 * Scans CSS, SCSS, JSON, or GraphQL text, which only differ by comment syntax.
 * @param {string} line
 * @param {boolean} block
 * @returns {Scanner}
 */
export const simpleScanner = (line, block) => (src, from, to) => {
	/** @type {Comment[]} */
	const found = [];
	let i = from;
	while (i < to) {
		const comment = readComment(src, i, to, line, block);
		const skipped = comment
			? i
			: Math.max(skipString(src, i, to, line === "#"), skipUrl(src, i, to));
		if (comment) {
			found.push({ at: comment.at, text: comment.text });
		}
		i = comment?.next ?? (skipped === i ? i + 1 : skipped);
	}
	return found;
};
