// The lexer skips regex literals: a shipped regex must not hold a quote, a backtick, or `/*`.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export const PLUGIN_DIR = "plugins/claudetto-you-should-know";

export interface Literal {
	readonly line: number;
	readonly text: string;
}

export interface Lexed {
	readonly code: string;
	readonly strings: readonly Literal[];
}

const QUOTES: readonly string[] = ["'", '"', "`"];

const NEWLINE = "\n";

const commentEnd = (source: string, at: number): number => {
	if (source[at + 1] === "/") {
		const end = source.indexOf(NEWLINE, at);
		return end === -1 ? source.length : end;
	}
	const end = source.indexOf("*/", at + 2);
	return end === -1 ? source.length : end + 2;
};

const literalEnd = (source: string, at: number): number => {
	const quote = source[at];
	const close = (from: number): number => {
		const ch = source[from];
		switch (ch) {
			case undefined:
				return source.length;
			case "\\":
				return close(from + 2);
			case quote:
				return from + 1;
			default:
				return close(from + 1);
		}
	};
	return close(at + 1);
};

const blanked = (text: string): string => text.replace(/[^\n]/g, " ");

const linesIn = (text: string): number => text.split(NEWLINE).length - 1;

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

export interface Shipped {
	readonly path: string;
	readonly text: string;
}

/** A test beside its source is not shipped code, so `rebuild/silent` must not scan it. */
const UNDER_TESTS = /(^|\/)__tests__\//;

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
