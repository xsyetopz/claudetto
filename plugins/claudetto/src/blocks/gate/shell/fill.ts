import { SHELL_VARIANTS_MAX } from "./limits.ts";

interface Possible {
	now: Set<string | undefined>;
	later: Set<string | undefined>;
	ever: Set<string | undefined>;
}

export type Vars = Map<string, Possible>;

export interface Filled {
	texts: string[];
	unknown: boolean;
}

/** A word cannot hold a NUL, so the stand-in is never a word character. */
const LIT = "\0";

export const mask = (
	word: string,
	offsets: readonly number[] | undefined,
): string =>
	offsets
		? [...word].map((c, k) => (offsets.includes(k) ? LIT : c)).join("")
		: word;

export const unmask = (word: string): string => word.replaceAll(LIT, "$");

export const refName = (m: RegExpMatchArray): string => m[1] ?? m[2] ?? "";

export const REFS = /(?<!\\)\$(?:(\w+)|\{(\w+)\})/g;
const SUBSTITUTION = /[`]|\$\(/;
export const CHAIN_MAX = 8;

export const valuesOf = (vars: Vars, name: string): (string | undefined)[] => {
	const held = vars.get(name);
	return held ? [...new Set([...held.now, ...held.later])] : [];
};

/** More combinations than `SHELL_VARIANTS_MAX` make the text unknown. */
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

/** A chain over `CHAIN_MAX` fills is unknown. */
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

export const scriptTexts = (script: string, vars: Vars): Filled => {
	const filled = settle(script, vars);
	return SUBSTITUTION.test(script) || script === ""
		? { texts: filled.texts, unknown: true }
		: filled;
};
