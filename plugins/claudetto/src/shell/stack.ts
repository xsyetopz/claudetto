// The stack of `scan.ts`: where a command ends, and where a substitution, a parenthesis, or a backtick opens and closes.

import { ARITH, type Ctx, type Frame, frame, push } from "./frames.ts";
import { RESERVED } from "./shellkinds.ts";

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

/** Ends the command of the frame: the leading reserved words are dropped, the command is emitted with whether it is plain, and the state of the line is cleared. */
export const end = (x: Ctx, f: Frame): void => {
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

/** Opens a frame that `closer` ends, at offset `at`, on the stack. */
export const open = (x: Ctx, f: Frame, closer: string, at: number): void => {
	f.word ??= "";
	x.stack.push(frame(closer, false, at));
};

/**
 * A `$(` opens a substitution, and a `$((` with a matching `))` opens an arithmetic frame.
 * A quote, a backtick, or a backslash before the `))` keeps the stricter reading of a substitution.
 */
export const openDollar = (x: Ctx, f: Frame, at: number): number => {
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

/** Ends the command of the frame and pops it; for a frame with a `start`, its source text is added to the word of the parent frame. */
export const close = (x: Ctx, f: Frame, at: number): void => {
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
