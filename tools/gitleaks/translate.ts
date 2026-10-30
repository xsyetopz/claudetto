// Gitleaks writes its patterns for Go's `regexp`, so a pattern may carry an inline flag setter such
// as `(?i)`. JavaScript has no setter and throws on one. A setter becomes a modifier group here,
// `(?i:...)`, that runs to the end of the group enclosing the setter, which is the scope Go gives
// it (`https://pkg.go.dev/regexp/syntax`: a flag set by `(?i)` holds to the end of the enclosing
// group). A setter at the head of a pattern becomes the `i` flag of the compiled pattern instead,
// which is the same thing and keeps the pattern readable beside the upstream line.
//
// A modifier group the upstream config already writes, `(?i:...)`, `(?-i:...)`, or `(?s:...)`, is
// left as it stands: Bun and Node both take it, and the engine of the running program compiles it
// or the rule is skipped at load.
//
// Nothing else of Go's syntax appears in the default config. It has no lookaround, which is where
// Go and JavaScript part, and no named group. `translate` proves this per pattern by compiling the
// result, and the caller drops a pattern that will not compile.

import type { Pattern } from "../../plugins/claudetto/src/secrets/gitleaks/data.ts";

/** A flag setter. It carries no colon, which is what separates it from a modifier group. */
const SETTER = /\(\?([a-z-]+)\)/g;

/**
 * The index of the `)` that closes the group enclosing `from`, or the length of `source` when no
 * group encloses it. An escape pair and a character class are stepped over, because a bracket
 * inside either is a literal and closes nothing.
 */
const groupEnd = (source: string, from: number): number => {
	let depth = 0;
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
		} else if (char === "(") {
			depth += 1;
		} else if (char === ")") {
			if (depth === 0) {
				return at - 1;
			}
			depth -= 1;
		}
	}
	return source.length;
};

/**
 * Whether the engine takes the pattern. The compiled pattern is read for its own `source`, which
 * is always there, because a compiler that throws answers the question and an object thrown away
 * unread is a lint error of this repo.
 */
const compiles = (source: string, flags: string): boolean => {
	try {
		return new RegExp(source, flags).source.length > 0;
	} catch {
		return false;
	}
};

/**
 * `regex` as a JavaScript pattern, or `undefined` when it will not compile as one.
 *
 * The setters are rewritten from the last to the first, so that an index stays valid while the
 * text before it is untouched. A rewrite leaves a modifier group, which no later pass matches.
 */
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
