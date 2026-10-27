// The scan of `shell.ts`: one pass over a text with a stack of frames, one for each substitution, parenthesis, and backtick.

import { ARITH, ansi, type Ctx, cutHere, frame, literal } from "./frames.ts";
import { ansiAt, arithAt, dquoteAt, escapeAt, unquotedAt } from "./handlers.ts";
import { close } from "./stack.ts";

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
