#!/usr/bin/env node
// Fails when a source file holds a lint or type suppression comment.
// Usage: node .biome/check-suppressions.mjs [rootDir]
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

const JS = ["js", "jsx", "mjs", "cjs", "ts", "tsx", "mts", "cts"];
const HTML = ["html", "htm", "vue", "svelte", "astro"];
const SKIPPED_DIRS = new Set(["node_modules", ".git", "dist"]);
const DIRECTIVE =
	/^[\s*]*(?:biome-ignore|@ts-ignore|@ts-nocheck|@ts-expect-error|eslint-disable|oxlint-disable)/;
const MARKUP_OPENER = /<!--|\{\/\*|<(script|style)\b[^>]*>/gi;
const MARKUP_CLOSER = /** @type {Record<string, string>} */ ({
	"<!--": "-->",
	"{/*": "*/",
});
const KEYWORDS = new Set(["return", "typeof", "case", "in", "of", "delete"]);
const CLOSERS = new Set([")", "]"]);
const IDENT_CHAR = /[\w$]/;
const FLAG_CHAR = /[a-z]/;
const WHITESPACE = /\s/;

const PATH_SEPARATOR = /[\\/]/;
const LINE_BREAK = /\r?\n/;
const execFileAsync = promisify(execFile);
const root = resolve(process.argv[2] ?? process.cwd());

/**
 * @typedef {{ at: number, text: string }} Comment
 * @typedef {(src: string, from: number, to: number) => Comment[]} Scanner
 */

/**
 * @param {string} file
 * @returns {string}
 */
const extensionOf = (file) => {
	const dot = file.lastIndexOf(".");
	return dot === -1 ? "" : file.slice(dot + 1).toLowerCase();
};

/**
 * @param {string} file
 * @returns {boolean}
 */
const isInsideBiomeDir = (file) =>
	file.split(PATH_SEPARATOR).includes(".biome");

/** @returns {Promise<string[] | null>} */
const gitFiles = async () => {
	try {
		const inside = await execFileAsync(
			"git",
			["rev-parse", "--is-inside-work-tree"],
			{ cwd: root, encoding: "utf8" },
		);
		if (inside.stdout.trim() !== "true") {
			return null;
		}
		const listed = await execFileAsync(
			"git",
			["ls-files", "-co", "--exclude-standard", "-z"],
			{ cwd: root, encoding: "utf8", maxBuffer: 1 << 28 },
		);
		return [...new Set(listed.stdout.split("\0").filter(Boolean))];
	} catch {
		return null;
	}
};

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
const walk = async (dir) => {
	const entries = await readdir(dir, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map(async (entry) => {
			if (entry.isDirectory()) {
				return SKIPPED_DIRS.has(entry.name) ? [] : walk(join(dir, entry.name));
			}
			return entry.isFile()
				? [relative(root, join(dir, entry.name)).split(sep).join("/")]
				: [];
		}),
	);
	return nested.flat();
};

/** @returns {Promise<string[]>} */
const listFiles = async () => (await gitFiles()) ?? walk(root);

/**
 * Returns the index of the closing marker, or `to` when it is missing.
 * @param {string} src
 * @param {string} close
 * @param {number} from
 * @param {number} to
 * @returns {number}
 */
const closeAt = (src, close, from, to) => {
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
const readComment = (src, i, to, line, block) => {
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
const skipQuoted = (src, from, quote, to) => {
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
const simpleScanner = (line, block) => (src, from, to) => {
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
const jsScanner = (src, from, to) => {
	/** @type {JsState} */
	const state = { found: [], braces: [], expr: true };
	let i = from;
	while (i < to) {
		const literal = jsLiteral(src, i, to, state);
		i = literal === -1 ? jsCode(src, i, to, state) : literal;
	}
	return state.found;
};

const cssScanner = simpleScanner("", true);

/** @type {Scanner} */
const htmlScanner = (src, from, to) => {
	/** @type {Comment[]} */
	const found = [];
	let next = from;
	if (from === 0 && src.startsWith("---")) {
		next = closeAt(src, "\n---", 3, to);
		found.push(...jsScanner(src, 3, next));
	}
	MARKUP_OPENER.lastIndex = next;
	for (
		let m = MARKUP_OPENER.exec(src);
		m && m.index < to;
		m = MARKUP_OPENER.exec(src)
	) {
		const at = m.index + m[0].length;
		const tag = m[1]?.toLowerCase();
		const end = closeAt(
			src,
			tag ? `</${tag}` : (MARKUP_CLOSER[m[0]] ?? "*/"),
			at,
			to,
		);
		if (tag) {
			found.push(...(tag === "script" ? jsScanner : cssScanner)(src, at, end));
		} else {
			found.push({ at, text: src.slice(at, end) });
		}
		MARKUP_OPENER.lastIndex = end;
	}
	return found;
};

/** @type {Map<string, Scanner>} */
const SCANNERS = new Map(
	/** @type {[string[], Scanner][]} */ ([
		[JS, jsScanner],
		[HTML, htmlScanner],
		[["css"], cssScanner],
		[["scss"], simpleScanner("//", true)],
		[["json", "jsonc"], simpleScanner("//", true)],
		[["graphql", "gql"], simpleScanner("#", false)],
	]).flatMap(([exts, scan]) => exts.map((ext) => [ext, scan])),
);

/**
 * Returns "path:line: text" for each directive that starts a line of a comment.
 * @param {string} file
 * @param {string} src
 * @param {Comment[]} comments
 * @returns {string[]}
 */
const hitsIn = (file, src, comments) => {
	const lines = src.split(LINE_BREAK);
	return comments.flatMap(({ at, text }) => {
		let offset = at;
		return text.split("\n").flatMap((part) => {
			const line = src.slice(0, offset).split("\n").length;
			offset += part.length + 1;
			return DIRECTIVE.test(part)
				? [`${file}:${line}: ${lines[line - 1]?.trim()}`]
				: [];
		});
	});
};

/**
 * @param {string} file
 * @returns {Promise<string[]>}
 */
const scanFile = async (file) => {
	const scan = SCANNERS.get(extensionOf(file));
	if (!scan || isInsideBiomeDir(file)) {
		return [];
	}
	/** @type {string} */
	let source;
	try {
		source = await readFile(join(root, file), "utf8");
	} catch {
		return [];
	}
	return hitsIn(file, source, scan(source, 0, source.length));
};

const hits = (await Promise.all((await listFiles()).map(scanFile))).flat();

if (hits.length > 0) {
	process.stdout.write(`${hits.join("\n")}\n`);
	process.stdout.write(
		"Remove each suppression comment above and fix the code it hides, then run this check again.\n",
	);
	process.exitCode = 1;
}
