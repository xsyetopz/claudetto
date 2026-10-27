// The scan of `shell.ts`: one pass over a text with a stack of frames, one for each substitution, parenthesis, and backtick.

import { ansiEscape } from "./ansi-c.ts";
import { expandBraces } from "./braces.ts";
import { delimiterAt } from "./delimiter.ts";
import { RESERVED } from "./shellkinds.ts";

interface Heredoc {
	delimiter: string;
	quoted: boolean;
	head: string[];
	outs: string[];
}

/** A frame: one `$(`, backtick, or parenthesis, with the words of its command so far. */
interface Frame {
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
const frame = (
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
const ANSI = "$'";
const ANSI_DROP = "$'\0";
const ansi = (f: Frame): boolean => f.quote === ANSI || f.quote === ANSI_DROP;

/** The closer of an arithmetic frame (`$(( ))`), whose words are not a command. */
const ARITH = "))";

/** The state of one scan: the text, the stack of frames, and the callbacks of `scan`. */
interface Ctx {
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

const push = (x: Ctx, f: Frame): void => {
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

const OPENERS = new Set(["if", "while", "until", "for", "case", "select", "{"]);
const CLOSERS = new Set(["fi", "done", "esac", "}"]);

/** Counts the compound commands that the leading words of `line` open and close. */
const countOpen = (x: Ctx, line: string[]): void => {
	for (const w of line) {
		if (OPENERS.has(w)) {
			x.open++;
		} else if (CLOSERS.has(w)) {
			x.open = Math.max(0, x.open - 1);
		} else if (!RESERVED.has(w)) {
			return;
		}
	}
};

const end = (x: Ctx, f: Frame): void => {
	push(x, f);
	const had = f.line.length > 0;
	countOpen(x, f.line);
	let shifted = 0;
	while (f.line.length > 0 && RESERVED.has(f.line[0] ?? "")) {
		f.line.shift();
		shifted++;
	}
	// The text of an unquoted heredoc body is data, so only its substitutions are commands.
	// A command is plain when nothing can keep it from running: no subshell, no compound command, no `&&`, `||`, or pipe around it.
	const plain = x.stack.length === 1 && x.open === 0 && !f.cond && !f.piped;
	const spots = f.line.map((_, i) => f.bares.get(i + shifted));
	const lits = f.line.map((_, i) => f.literals.get(i + shifted));
	if (f.line.length > 0 && !f.body) {
		x.emit(f.line, plain, spots, lits);
	}
	if (had) {
		f.cond = false;
	}
	f.piped = false;
	f.bares = new Map();
	f.literals = new Map();
	f.line = [];
	f.outs = [];
};

/** The first character of a name. */
const NAME_START = /^\w/;
const DIGITS = /^\d+$/;
const BLANK = /\s/;

/** The name at the end of a word, such as the `$F` of `a$F`. */
const NAME_END = /\$(\w+)$/;

/** Appends `text` to the word. A word that a quote or a backslash cut right after `$NAME` gets braces on the name, so the text that joins it is not part of the name: `$F'a'` is `${F}a`. */
const append = (f: Frame, text: string): void => {
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
const cutHere = (f: Frame): void => {
	f.cut = (f.word ?? "").length;
};

/** Appends text that the shell does not expand, so a `$` in it is plain text. */
const literal = (f: Frame, text: string): void => {
	if (text === "$") {
		f.lits.push((f.word ?? "").length);
	}
	append(f, text);
};

const open = (x: Ctx, f: Frame, closer: string, at: number): void => {
	f.word ??= "";
	x.stack.push(frame(closer, false, at));
};

/**
 * A `$(` opens a substitution, and a `$((` with a matching `))` opens an arithmetic frame.
 * A quote, a backtick, or a backslash before the `))` keeps the stricter reading of a substitution.
 */
const openDollar = (x: Ctx, f: Frame, at: number): number => {
	const { text } = x;
	let arith = false;
	for (
		let j = at + 3, depth = 0;
		text[at + 2] === "(" && j < text.length;
		j++
	) {
		const c = text.charAt(j);
		if ("'\"`\\".includes(c)) {
			break;
		}
		if (c === "(") {
			depth++;
		} else if (c === ")" && depth) {
			depth--;
		} else if (c === ")") {
			arith = text[j + 1] === ")";
			break;
		}
	}
	if (arith) {
		f.word ??= "";
		x.stack.push(frame(ARITH, true, at));
	} else {
		open(x, f, ")", at);
	}
	return at + (arith ? 2 : 1);
};

const close = (x: Ctx, f: Frame, at: number): void => {
	end(x, f);
	x.stack.pop();
	if (f.start === undefined) {
		return;
	}
	// The source text of a substitution goes into its word, so the words after it stay with it.
	const parent = x.stack.at(-1);
	if (parent === undefined) {
		throw new Error("`close` ran for a frame with a start and no parent frame");
	}
	const raw = x.text.slice(f.start, at + 1);
	parent.word = (parent.word ?? "") + raw;
	parent.raws.push(raw);
};

/** Each handler below gets the index `i` of the character `c` and gives the index of the last character that it read. */
const escapeAt = (f: Frame, text: string, i: number): number => {
	const n = text.charAt(i + 1);
	cutHere(f);
	if (n !== "\n") {
		literal(f, (f.quote && !'$`"\\'.includes(n) ? "\\" : "") + n);
	}
	return i + 1;
};

// Only the substitutions of an arithmetic text are commands.
const arithAt = (x: Ctx, f: Frame, i: number, c: string): number => {
	if (c === "$" && x.text[i + 1] === "(") {
		return openDollar(x, f, i);
	}
	if (c === "(") {
		f.depth++;
	} else if (c === ")" && f.depth) {
		f.depth--;
	} else if (c === ")") {
		close(x, f, i + 1);
		return i + 1;
	}
	return i;
};

// A `\0` ends the text of the quote, so the characters after it up to the quote are dropped.
const ansiAt = (f: Frame, text: string, i: number, c: string): number => {
	if (c === "'") {
		f.quote = undefined;
		cutHere(f);
	} else if (c === "\\" && i + 1 < text.length) {
		const { char, last } = ansiEscape(text, i + 1);
		if (char === "\0") {
			f.quote = ANSI_DROP;
		} else if (f.quote === ANSI) {
			literal(f, char);
		}
		return last;
	} else if (f.quote === ANSI) {
		literal(f, c);
	}
	return i;
};

const dquoteAt = (x: Ctx, f: Frame, i: number, c: string): number => {
	if (c === '"' && !f.body) {
		f.quote = undefined;
		cutHere(f);
	} else if (c === "$" && x.text[i + 1] === "(") {
		return openDollar(x, f, i);
	} else if (c === "`") {
		open(x, f, "`", i);
	} else {
		append(f, c);
	}
	return i;
};

/** The heredoc operator `<<` or `<<-` at `i`: its delimiter waits for the end of the line. */
const heredocOpAt = (x: Ctx, f: Frame, i: number): number => {
	const at = x.text[i + 2] === "-" ? i + 3 : i + 2;
	const d = delimiterAt(x.text, at);
	if (d) {
		f.heredocs.push({
			delimiter: d.word,
			quoted: d.quoted,
			head: [...f.line],
			outs: f.outs,
		});
	}
	push(x, f);
	return (d ? d.end : at) - 1;
};

const redirectAt = (x: Ctx, f: Frame, i: number): number => {
	const { text } = x;
	if (f.word !== undefined && DIGITS.test(f.word)) {
		f.word = undefined;
	}
	push(x, f);
	let last = i;
	while ("<>".includes(text[last + 1] ?? " ")) {
		last++;
	}
	if ("&|".includes(text[last + 1] ?? " ")) {
		last++;
	}
	f.skip = text.slice(i, last + 1);
	return last;
};

/** The end of the heredoc body that starts at `from`: the index after its last line, and the index of the line of `delimiter`. */
const bodyEnd = (text: string, from: number, delimiter: string) => {
	let pos = from;
	let stop = from;
	while (pos < text.length) {
		const nl = text.indexOf("\n", pos);
		const lineEnd = nl < 0 ? text.length : nl;
		if (text.slice(pos, lineEnd).trim() === delimiter) {
			break;
		}
		stop = nl < 0 ? text.length : nl + 1;
		pos = stop;
	}
	return { stop, pos };
};

/** A newline ends the command, and then the bodies of the heredocs of its line follow. */
const newlineAt = (x: Ctx, f: Frame, i: number): number => {
	end(x, f);
	let pos = i + 1;
	for (const { delimiter, quoted, head, outs } of f.heredocs.splice(0)) {
		const body = bodyEnd(x.text, pos, delimiter);
		if (body.stop > pos) {
			x.heredoc(x.text.slice(pos, body.stop), quoted, head, outs);
		}
		const nl = x.text.indexOf("\n", body.pos);
		pos = nl < 0 ? x.text.length : nl + 1;
	}
	return pos - 1;
};

const separatorAt = (x: Ctx, f: Frame, i: number, c: string): void => {
	const prev = x.text[i - 1] ?? " ";
	const next = x.text[i + 1] ?? " ";
	const lone = c === "&" && !"&>".includes(next) && !"&|".includes(prev);
	if (lone && !f.body) {
		push(x, f);
		x.background([...f.line]);
	}
	f.piped = lone || (c === "|" && next !== "|" && prev !== "|");
	end(x, f);
	if (c === "|" || (c === "&" && !lone)) {
		f.cond = true;
	}
};

const wordCharAt = (f: Frame, text: string, i: number, c: string): void => {
	// An unquoted brace or comma can expand, except the brace of `${`.
	if (c === "$") {
		f.dollars.push((f.word ?? "").length);
	}
	if ("{,}".includes(c) && !(c === "{" && text[i - 1] === "$")) {
		f.marks.push((f.word ?? "").length);
	}
	append(f, c);
};

const operatorAt = (x: Ctx, f: Frame, i: number, c: string): number => {
	if (c === "<" && x.text[i + 1] === "<" && x.text[i + 2] !== "<") {
		return heredocOpAt(x, f, i);
	}
	if (c === "<" || c === ">") {
		return redirectAt(x, f, i);
	}
	if (c === "\n") {
		return newlineAt(x, f, i);
	}
	switch (c) {
		case "(":
			end(x, f);
			f.skip = undefined;
			x.stack.push(frame(")"));
			break;
		case ")":
			if (f.closer === ")") {
				close(x, f, i);
			} else {
				end(x, f);
			}
			break;
		case ";":
		case "&":
		case "|":
			separatorAt(x, f, i, c);
			break;
		default:
			if (BLANK.test(c)) {
				push(x, f);
			} else {
				wordCharAt(f, x.text, i, c);
			}
	}
	return i;
};

const unquotedAt = (x: Ctx, f: Frame, i: number, c: string): number => {
	const next = x.text[i + 1];
	if (c === "`") {
		if (f.closer === "`") {
			close(x, f, i);
		} else {
			open(x, f, "`", i);
		}
	} else if (c === "$" && next === "(") {
		return openDollar(x, f, i);
	} else if (c === "$" && next === "'") {
		f.quote = ANSI;
		f.word ??= "";
		cutHere(f);
		return i + 1;
	} else if (c === "'" || c === '"') {
		f.quote = c;
		f.word ??= "";
		cutHere(f);
	} else if (c === "#" && f.word === undefined) {
		const nl = x.text.indexOf("\n", i);
		return nl < 0 ? x.text.length : nl - 1;
	} else {
		return operatorAt(x, f, i, c);
	}
	return i;
};

/** Reads the character at `i` by the state of the top frame, and gives the index of the last character that it read. */
const step = (x: Ctx, i: number): number => {
	const f = x.stack.at(-1);
	if (f === undefined) {
		throw new Error("`step` ran with an empty frame stack");
	}
	const c = x.text.charAt(i);
	if (c === "\\" && i + 1 < x.text.length && f.quote !== "'" && !ansi(f)) {
		return escapeAt(f, x.text, i);
	}
	if (f.closer === ARITH) {
		return arithAt(x, f, i, c);
	}
	if (f.quote === "'") {
		if (c === "'") {
			f.quote = undefined;
			cutHere(f);
		} else {
			literal(f, c);
		}
		return i;
	}
	if (ansi(f)) {
		return ansiAt(f, x.text, i, c);
	}
	if (f.quote === '"') {
		return dquoteAt(x, f, i, c);
	}
	return unquotedAt(x, f, i, c);
};

/**
 * One pass over `text`.
 * `emit(argv, plain, spots, lits)` gets each simple command, `spots[i]` has the offsets of the `$` outside quotes in word `i`, `lits[i]` has the offsets of its plain `$` (in single quotes or after a backslash), and `plain` is true when it runs in the plain sequence of the text (not in a subshell, a compound command, a pipe, a background job, or after `&&` or `||`).
 * `redirect(op, target, line)` gets each redirection operator with the word after it and the words of its command so far.
 * `heredoc(doc, quoted, head, outs)` gets each heredoc body with the words of its command and the output targets of that command.
 * `background(line)` gets the words of each command that a lone `&` ends, and an empty list after a group such as `(a; b) &`.
 * The `&` of `&&`, `&>`, `|&`, and `>&` does not start a background job.
 */
export const scan = (
	text: string,
	emit: Ctx["emit"],
	body: boolean,
	redirect: Ctx["redirect"],
	heredoc: Ctx["heredoc"],
	background: Ctx["background"] = () => undefined,
): void => {
	const first = frame(undefined, body);
	if (body) {
		first.quote = '"';
	}
	const x: Ctx = {
		text,
		stack: [first],
		emit,
		open: 0,
		redirect,
		heredoc,
		background,
	};
	for (let i = 0; i < text.length; i++) {
		i = step(x, i);
	}
	for (let top = x.stack.at(-1); top; top = x.stack.at(-1)) {
		close(x, top, text.length - 1);
	}
};
