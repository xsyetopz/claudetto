import { expandBraces } from "./braces.ts";

interface Heredoc {
	delimiter: string;
	quoted: boolean;
	head: string[];
	outs: string[];
}

export interface Frame {
	closer?: string | undefined;
	body: boolean;
	start?: number | undefined;
	line: string[];
	word?: string | undefined;
	quote?: string | undefined;
	skip?: string | undefined;
	heredocs: Heredoc[];
	outs: string[];
	raws: string[];
	marks: number[];
	depth: number;
	dollars: number[];
	bares: Map<number, number[]>;
	lits: number[];
	literals: Map<number, number[]>;
	cut?: number | undefined;
	cond: boolean;
	piped: boolean;
}
export const frame = (
	closer?: string | undefined,
	body = false,
	start?: number,
): Frame => ({
	closer,
	body,
	start,
	line: [],
	heredocs: [],
	outs: [],
	raws: [],
	marks: [],
	depth: 0,
	dollars: [],
	bares: new Map(),
	lits: [],
	literals: new Map(),
	cond: false,
	piped: false,
});

export type Spots = readonly (readonly number[] | undefined)[];

export type Lits = Spots;

export const UNREAD = -1;

export const ANSI = "$'";
export const ANSI_DROP = "$'\0";
export const ansi = (f: Frame): boolean =>
	f.quote === ANSI || f.quote === ANSI_DROP;

export const ARITH = "))";

export interface Ctx {
	text: string;
	stack: Frame[];
	emit: (argv: string[], plain: boolean, spots: Spots, lits: Lits) => void;
	open: number;
	redirect: (op: string, target: string, line: string[]) => void;
	heredoc: (
		doc: string,
		quoted: boolean,
		head: string[],
		outs: string[],
	) => void;
	background: (line: string[]) => void;
}

const dollarsOf = (w: string): number[] =>
	[...w].flatMap((c, k) => (c === "$" ? [k] : []));

const lostOffsets = (f: Frame, w: string): boolean =>
	f.dollars.length > 0 &&
	dollarsOf(w).length - f.lits.length !== f.dollars.length;

const addWord = (f: Frame, w: string): void => {
	const added =
		w && f.marks.length > 0
			? expandBraces(w, f.marks, f.lits)
			: [{ text: w, lits: f.lits }];
	const kept = added.length === 1 && added[0]?.text === w;
	const lost = !kept && lostOffsets(f, w);
	for (const [k, { text, lits }] of added.entries()) {
		const at = f.line.length + k;
		if (lost) {
			f.bares.set(at, [UNREAD]);
		} else if (f.dollars.length > 0) {
			f.bares.set(
				at,
				kept ? f.dollars : dollarsOf(text).filter((d) => !lits.includes(d)),
			);
		}
		if (lits.length > 0) {
			f.literals.set(at, lits);
		}
	}
	f.line.push(...added.map((a) => a.text));
};

export const push = (x: Ctx, f: Frame): void => {
	if (f.word !== undefined) {
		// A word that is only substitutions is unreadable, so it is `""`.
		const w = f.word === f.raws.join("") ? "" : f.word;
		if (f.skip) {
			x.redirect(f.skip, w, f.line);
			if (f.skip.includes(">")) {
				f.outs.push(w);
			}
		} else {
			addWord(f, w);
		}
		f.skip = undefined;
	}
	f.word = undefined;
	f.dollars = [];
	f.lits = [];
	f.cut = undefined;
	f.raws = [];
	f.marks = [];
};

const NAME_START = /^\w/;
const NAME_END = /\$(\w+)$/;

/** Braces the name when a quote or backslash cut the word right after `$NAME`. */
export const append = (f: Frame, text: string): void => {
	let word = f.word ?? "";
	if (f.cut === word.length && NAME_START.test(text)) {
		const at = word.search(NAME_END);
		if (at >= 0 && !f.lits.includes(at)) {
			word = word.replace(NAME_END, (_, name) => `\${${name}}`);
		}
	}
	f.word = word + text;
};

export const cutHere = (f: Frame): void => {
	f.cut = (f.word ?? "").length;
};

export const literal = (f: Frame, text: string): void => {
	if (text === "$") {
		f.lits.push((f.word ?? "").length);
	}
	append(f, text);
};
