// The frames of `scan.ts`: the state of one command and of its word, and the text that a word collects.

import { expandBraces } from "./braces.ts";

interface Heredoc {
	delimiter: string;
	quoted: boolean;
	head: string[];
	outs: string[];
}

/** A frame: one `$(`, backtick, or parenthesis, with the words of its command so far. */
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
	/** The offsets in the word so far of each `$` outside quotes: the shell splits the value of its variable into words. */
	dollars: number[];
	/** The `$` offsets of the words of `line` that have a `$` outside quotes, by index in `line`. */
	bares: Map<number, number[]>;
	/** The offsets in the word so far of each `$` that is plain text: in single quotes, in an ANSI-C quote, or after a backslash. */
	lits: number[];
	/** The `lits` of the words of `line` that have one, by index in `line`. */
	literals: Map<number, number[]>;
	/** The length of the word where a quote or a backslash cut it: a name right before it ends there. */
	cut?: number | undefined;
	/** True after `&&`, `||`, or `|`: the next command may not run. */
	cond: boolean;
	/** True when a pipe or a lone `&` follows the command, which then runs in a subshell. */
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

/** For each word of a command, the offsets in the word of its `$` outside quotes, or `undefined` for a word with none. */
export type Spots = readonly (readonly number[] | undefined)[];

/** For each word of a command, the offsets in the word of its `$` that is plain text (in single quotes or after a backslash), or `undefined` for a word with none. */
export type Lits = Spots;

/** An offset in `Spots` that marks a word whose `$` the scan cannot place: a word that a brace expansion changed, with a `$` in quotes or a plain `$` next to a `$` outside quotes. */
export const UNREAD = -1;

/** The quote states of an ANSI-C quote (`$'...'`): the text, and the text after a `\0`, which the shell drops. */
export const ANSI = "$'";
export const ANSI_DROP = "$'\0";
export const ansi = (f: Frame): boolean =>
	f.quote === ANSI || f.quote === ANSI_DROP;

/** The closer of an arithmetic frame (`$(( ))`), whose words are not a command. */
export const ARITH = "))";

/** The state of one scan: the text, the stack of frames, and the callbacks of `scan`. */
export interface Ctx {
	text: string;
	stack: Frame[];
	emit: (argv: string[], plain: boolean, spots: Spots, lits: Lits) => void;
	/** The number of open compound commands (`if`, a loop, `case`, a group). */
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

/** The offsets of each `$` in `w`. */
const dollarsOf = (w: string): number[] =>
	[...w].flatMap((c, k) => (c === "$" ? [k] : []));

/** True when the offsets of the `$` outside quotes in the word `w` that the brace expansion changed are not known: the word has a `$` in quotes next to a `$` outside quotes. The plain `$` keep their offsets through the expansion. */
const lostOffsets = (f: Frame, w: string): boolean =>
	f.dollars.length > 0 &&
	dollarsOf(w).length - f.lits.length !== f.dollars.length;

/** Adds the word `w` to the line, as the words of its brace expansion, and notes the offsets of the `$` outside quotes and of the plain `$` in each word. A word that the expansion changed has moved offsets: the plain `$` move with their characters, and when each other `$` is outside quotes, each counts as outside quotes, else the word is `UNREAD`. */
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

/** The first character of a name. */
const NAME_START = /^\w/;
/** The name at the end of a word, such as the `$F` of `a$F`. */
const NAME_END = /\$(\w+)$/;

/** Appends `text` to the word. A word that a quote or a backslash cut right after `$NAME` gets braces on the name, so the text that joins it is not part of the name: `$F'a'` is `${F}a`. */
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

/** Notes that a quote or a backslash cuts the word here. */
export const cutHere = (f: Frame): void => {
	f.cut = (f.word ?? "").length;
};

/** Appends text that the shell does not expand, so a `$` in it is plain text. */
export const literal = (f: Frame, text: string): void => {
	if (text === "$") {
		f.lits.push((f.word ?? "").length);
	}
	append(f, text);
};
