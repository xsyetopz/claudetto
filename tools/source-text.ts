// What the two checks of the rebuilt observer read: the source files it ships, and each file split
// into its code (comments blanked) and its string literals. One module holds it, so `rebuild/own.ts`
// and `rebuild/silent.ts` agree on what a comment is and what a shipped string is.
//
// The scan is a small lexer, not a parser. It knows `//`, `/* */`, and the three quote marks, and it
// does not know a regular expression literal, so a shipped regex must not hold a quote mark, a
// backtick, or `/*`. The shipped code keeps to that, and `tests/repo/source-text.test.ts` pins it.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/** The plugin the checks read, relative to the root of the tree. */
export const PLUGIN_DIR = "plugins/claudetto-you-should-know";

/** One string literal of a file, with the line it opens on. */
export interface Literal {
	readonly line: number;
	readonly text: string;
}

/** A source file after lexing: its code with comments blanked, and its string literals. */
export interface Lexed {
	/** The file with every comment replaced by spaces, so lines and columns stay where they were. */
	readonly code: string;
	readonly strings: readonly Literal[];
}

const QUOTES: readonly string[] = ["'", '"', "`"];

const NEWLINE = "\n";

/** The index just past the end of a comment that opens at `at`, and the lines it spans. */
const commentEnd = (source: string, at: number): number => {
	if (source[at + 1] === "/") {
		const end = source.indexOf(NEWLINE, at);
		return end === -1 ? source.length : end;
	}
	const end = source.indexOf("*/", at + 2);
	return end === -1 ? source.length : end + 2;
};

/** The index just past the closing quote of the literal that opens at `at`. */
const literalEnd = (source: string, at: number): number => {
	const quote = source[at];
	const close = (from: number): number => {
		const ch = source[from];
		if (ch === undefined) {
			return source.length;
		}
		if (ch === "\\") {
			return close(from + 2);
		}
		return ch === quote ? from + 1 : close(from + 1);
	};
	return close(at + 1);
};

/** `text` with every character but a newline replaced by a space. */
const blanked = (text: string): string => text.replace(/[^\n]/g, " ");

const linesIn = (text: string): number => text.split(NEWLINE).length - 1;

/** The index just past the token that opens at `at`: a comment, a literal, or one character. */
const tokenEnd = (
	source: string,
	at: number,
	kind: { isComment: boolean; isLiteral: boolean },
): number => {
	if (kind.isComment) {
		return commentEnd(source, at);
	}
	return kind.isLiteral ? literalEnd(source, at) : at + 1;
};

/** Splits a source file into its code and its string literals. */
export const lex = (source: string): Lexed => {
	const code: string[] = [];
	const strings: Literal[] = [];
	let at = 0;
	let line = 1;
	while (at < source.length) {
		const ch = source[at] ?? "";
		const isComment =
			ch === "/" && (source[at + 1] === "/" || source[at + 1] === "*");
		const isLiteral = QUOTES.includes(ch);
		const end = tokenEnd(source, at, { isComment, isLiteral });
		const piece = source.slice(at, end);
		code.push(isComment ? blanked(piece) : piece);
		if (isLiteral) {
			strings.push({ line, text: piece.slice(1, -1) });
		}
		line += linesIn(piece);
		at = end;
	}
	return { code: code.join(""), strings };
};

/** A file the plugin ships, by path relative to the root of the tree. */
export interface Shipped {
	readonly path: string;
	readonly text: string;
}

/**
 * A path inside a `__tests__/` folder. A test that sits beside the source it covers is not shipped
 * code, so the tools that read shipped code must skip it, or `rebuild/silent` scans a test for the
 * telemetry nouns and network calls that only a shipped file may not hold.
 */
const UNDER_TESTS = /(^|\/)__tests__\//;

/** The `.ts` files under `src/` of the plugin, in name order, less anything in a `__tests__/` folder. */
export const shippedSources = async (
	root: string,
): Promise<readonly Shipped[]> => {
	const dir = join(root, PLUGIN_DIR, "src");
	const names = (await readdir(dir, { recursive: true }))
		.filter((name) => name.endsWith(".ts") && !UNDER_TESTS.test(name))
		.toSorted((a, b) => a.localeCompare(b));
	return await Promise.all(
		names.map(async (name) => ({
			path: `${PLUGIN_DIR}/src/${name}`,
			text: await readFile(join(dir, name), "utf8"),
		})),
	);
};

/** Every string value of a parsed JSON document, at any depth. */
export const jsonStrings = (value: unknown): readonly string[] => {
	if (typeof value === "string") {
		return [value];
	}
	if (Array.isArray(value)) {
		return value.flatMap((item) => jsonStrings(item));
	}
	if (typeof value === "object" && value !== null) {
		return Object.values(value).flatMap((item) => jsonStrings(item));
	}
	return [];
};

/** The two manifests of the plugin, as the strings they hold, by path. */
export const shippedManifests = async (
	root: string,
): Promise<readonly Shipped[]> => {
	const paths = [".claude-plugin/plugin.json", "hooks/hooks.json"];
	return await Promise.all(
		paths.map(async (path) => ({
			path: `${PLUGIN_DIR}/${path}`,
			text: jsonStrings(
				JSON.parse(await readFile(join(root, PLUGIN_DIR, path), "utf8")),
			).join("\n"),
		})),
	);
};
