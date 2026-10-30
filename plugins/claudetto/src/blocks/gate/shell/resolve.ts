import { CHAIN_MAX, fill, REFS, refName, type Vars, valuesOf } from "./fill.ts";
import type { Spots } from "./frames.ts";
import { SHELL_VARIANTS_MAX } from "./limits.ts";
import { stripWrappers, words } from "./wrappers.ts";

const DOLLAR_OR_BACKQUOTE = /[$`]/;
const WHITE_SPACE = /\s+/;

export const resolve = (
	argv: string[],
	vars: Vars,
	depth = 0,
): { argvs: string[][]; unknown: boolean } => {
	const at = argv.length - stripWrappers(argv).length;
	const word = argv[at];
	if (word === undefined || !DOLLAR_OR_BACKQUOTE.test(word)) {
		return { argvs: [argv], unknown: false };
	}
	const { texts, unknown } = fill(word, vars, false);
	if (
		unknown ||
		depth >= CHAIN_MAX ||
		texts.some((t) => DOLLAR_OR_BACKQUOTE.test(t))
	) {
		return { argvs: [argv], unknown: true };
	}
	const next = texts.map((t) =>
		resolve(
			[...argv.slice(0, at), ...words(t), ...argv.slice(at + 1)],
			vars,
			depth + 1,
		),
	);
	const argvs = next.flatMap((r) => r.argvs);
	return argvs.length > SHELL_VARIANTS_MAX
		? { argvs: [argv], unknown: true }
		: { argvs, unknown: next.some((r) => r.unknown) };
};

const fieldsOf = (pieces: { text: string; split: boolean }[]): string[] => {
	const out: string[] = [];
	let current = "";
	for (const { text, split } of pieces) {
		if (split) {
			for (const [k, part] of text.split(WHITE_SPACE).entries()) {
				if (k > 0) {
					out.push(current);
					current = "";
				}
				current += part;
			}
		} else {
			current += text;
		}
	}
	out.push(current);
	return out.filter(Boolean);
};

const wordsOf = (
	word: string,
	vars: Vars,
	spots: readonly number[] | undefined,
): string[][] | undefined => {
	if (!word.includes("$")) {
		return [[word]];
	}
	if (spots === undefined) {
		const { texts, unknown } = fill(word, vars, true);
		return unknown ? undefined : texts.map((t) => [t]);
	}
	const refs = [...word.matchAll(REFS)];
	let combos: Map<string, string>[] = [new Map()];
	for (const name of new Set(refs.map(refName))) {
		const found = valuesOf(vars, name);
		if (found.length === 0 || found.includes(undefined)) {
			continue;
		}
		combos = combos.flatMap((c) =>
			found.map((v) => new Map(c).set(name, v ?? "")),
		);
		if (combos.length > SHELL_VARIANTS_MAX) {
			return undefined;
		}
	}
	const out = combos.map((combo) => {
		const pieces: { text: string; split: boolean }[] = [];
		let at = 0;
		for (const m of refs) {
			const value = combo.get(refName(m));
			pieces.push({ text: word.slice(at, m.index), split: false });
			pieces.push({
				text: value ?? m[0],
				split: value !== undefined && spots.includes(m.index),
			});
			at = m.index + m[0].length;
		}
		pieces.push({ text: word.slice(at), split: false });
		return fieldsOf(pieces);
	});
	return [...new Map(out.map((o) => [JSON.stringify(o), o])).values()];
};

export const fillArgs = (
	argv: string[],
	vars: Vars,
	spots: Spots,
): { argvs: string[][]; unknown: boolean } => {
	const at = argv.length - stripWrappers(argv).length;
	if (at < 0) {
		return { argvs: [argv], unknown: false };
	}
	let argvs = [argv.slice(0, at + 1)];
	for (let i = at + 1; i < argv.length; i++) {
		const options = wordsOf(argv[i] ?? "", vars, spots[i]);
		if (options === undefined) {
			return { argvs: [argv], unknown: true };
		}
		argvs = argvs.flatMap((v) => options.map((o) => [...v, ...o]));
		if (argvs.length > SHELL_VARIANTS_MAX) {
			return { argvs: [argv], unknown: true };
		}
	}
	return { argvs, unknown: false };
};
