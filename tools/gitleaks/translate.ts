// JavaScript throws on a Go inline flag setter, so it becomes a modifier group over its enclosing group.

import type { Pattern } from "../../plugins/claudetto/src/shared/secrets/gitleaks/data.ts";

/** A flag setter carries no colon, which separates it from a modifier group. */
const SETTER = /\(\?([a-z-]+)\)/g;

/** An escape pair and a character class are stepped over: a bracket inside either closes nothing. The first value `visit` returns, given the index after a parenthesis, ends the walk. */
export const walkParens = <T>(
	source: string,
	from: number,
	visit: (paren: "(" | ")", after: number) => T | undefined,
): T | undefined => {
	let inClass = false;
	let at = from;
	while (at < source.length) {
		const char = source[at];
		at += 1;
		if (char === "\\") {
			at += 1;
		} else if (inClass) {
			inClass = char !== "]";
		} else if (char === "[") {
			inClass = true;
		} else if (char === "(" || char === ")") {
			const found = visit(char, at);
			if (found !== undefined) {
				return found;
			}
		}
	}
	return undefined;
};

/** The index of the `)` that closes the group enclosing `from`, or the length of `source`. */
const groupEnd = (source: string, from: number): number => {
	let depth = 0;
	return (
		walkParens(source, from, (paren, after) => {
			depth += paren === "(" ? 1 : -1;
			return depth < 0 ? after - 1 : undefined;
		}) ?? source.length
	);
};

/** The compiled pattern's `source` is read because an object thrown away unread is a lint error. */
const compiles = (source: string, flags: string): boolean => {
	try {
		return new RegExp(source, flags).source.length > 0;
	} catch {
		return false;
	}
};

/** Rewritten from the last setter to the first, so indexes before it stay valid. */
export const translate = (regex: string): Pattern | undefined => {
	let source = regex;
	let flags = "";
	if (source.startsWith("(?i)")) {
		flags = "i";
		source = source.slice(4);
	}
	for (;;) {
		const last = [...source.matchAll(SETTER)].at(-1);
		const letters = last?.[1];
		if (last?.index === undefined || letters === undefined) {
			break;
		}
		const from = last.index + last[0].length;
		const end = groupEnd(source, from);
		source = `${source.slice(0, last.index)}(?${letters}:${source.slice(from, end)})${source.slice(end)}`;
	}
	return compiles(source, flags) ? { source, flags } : undefined;
};
