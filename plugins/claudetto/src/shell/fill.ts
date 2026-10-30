// The values of the names for `resolve.ts`: the variables of a text, and the fill of a text with the values of its names.

import { SHELL_VARIANTS_MAX } from "./limits.ts";

/** The values of a name: `now` after the plain sequence, `later` from the assignments that may not have run, and `ever` for each value that the name got anywhere in the text. A value of `undefined` is a value that the gate cannot read. */
interface Possible {
	now: Set<string | undefined>;
	later: Set<string | undefined>;
	ever: Set<string | undefined>;
}

/** The variables of a text with a literal value. A name that is not here has no known value. */
export type Vars = Map<string, Possible>;

/** A text that the variables filled in, one text for each combination of values, and whether a part stayed unknown. */
export interface Filled {
	texts: string[];
	unknown: boolean;
}

/** The stand-in for a `$` that is plain text (in single quotes or after a backslash) while `emit` fills the names of a command. A word cannot hold a NUL, so the stand-in is never a word character. */
const LIT = "\0";

/** `word` with the `$` at `offsets` (the plain `$` of `scan`) replaced by `LIT`, so no fill reads them as names. */
export const mask = (
	word: string,
	offsets: readonly number[] | undefined,
): string =>
	offsets
		? [...word].map((c, k) => (offsets.includes(k) ? LIT : c)).join("")
		: word;

/** `word` with each `LIT` back to a `$`. */
export const unmask = (word: string): string => word.replaceAll(LIT, "$");

/** The name of a match of `REFS`: the bare name or the braced one. */
export const refName = (m: RegExpMatchArray): string => m[1] ?? m[2] ?? "";

/** A reference to a variable. A `$` after a backslash is plain text. */
export const REFS = /(?<!\\)\$(?:(\w+)|\{(\w+)\})/g;
const SUBSTITUTION = /[`]|\$\(/;
/** The deepest chain of program words that a value can open, such as `sudo $X`. */
export const CHAIN_MAX = 8;

/** The values that `name` can have: none for a name that nothing assigned. */
export const valuesOf = (vars: Vars, name: string): (string | undefined)[] => {
	const held = vars.get(name);
	return held ? [...new Set([...held.now, ...held.later])] : [];
};

/**
 * `text` with each `$NAME` and `${NAME}` replaced by each known value of the name.
 * More combinations than `SHELL_VARIANTS_MAX` make the text unknown, and `texts` is then `text`.
 * In a program word (`script` is false), a name with no known value makes the text unknown too.
 * A script keeps such a name and the names `$1`, because its shell sets them, and `parse` judges the program words of the script.
 */
export const fill = (text: string, vars: Vars, script: boolean): Filled => {
	const names = new Set<string>();
	for (const m of text.matchAll(REFS)) {
		names.add(refName(m));
	}
	let texts = [text];
	for (const name of names) {
		const found = valuesOf(vars, name);
		if (found.length === 0 || found.includes(undefined)) {
			if (script) {
				continue;
			}
			return { texts: [text], unknown: true };
		}
		const ref = new RegExp(
			`(?<!\\\\)(?:\\$\\{${name}\\}|\\$${name}(?!\\w))`,
			"g",
		);
		texts = texts.flatMap((t) =>
			found.map((v) => t.replace(ref, () => v ?? "")),
		);
		if (texts.length > SHELL_VARIANTS_MAX) {
			return { texts: [text], unknown: true };
		}
	}
	return { texts: [...new Set(texts)], unknown: false };
};

/** `script` filled again until the texts stop changing: a value that holds `$NAME` (a copy of a single-quoted text) is read by `eval` with the names at that point. A chain over `CHAIN_MAX` fills is unknown. */
const settle = (script: string, vars: Vars): Filled => {
	let filled = fill(script, vars, true);
	for (let n = 0; n < CHAIN_MAX && !filled.unknown; n++) {
		const next = filled.texts.map((t) => fill(t, vars, true));
		const texts = [...new Set(next.flatMap((r) => r.texts))];
		if (next.some((r) => r.unknown) || texts.length > SHELL_VARIANTS_MAX) {
			return { texts: filled.texts, unknown: true };
		}
		const before = filled.texts;
		if (
			texts.length === before.length &&
			texts.every((t) => before.includes(t))
		) {
			return filled;
		}
		filled = { texts, unknown: false };
	}
	return { texts: filled.texts, unknown: true };
};

/** The texts that the script `script` of `sh -c` or `eval` can be, and whether it is unknown: it has an unknown variable or a substitution. */
export const scriptTexts = (script: string, vars: Vars): Filled => {
	const filled = settle(script, vars);
	return SUBSTITUTION.test(script) || script === ""
		? { texts: filled.texts, unknown: true }
		: filled;
};
