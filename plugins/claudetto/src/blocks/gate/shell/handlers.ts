import { ansiEscape } from "./ansi-c.ts";
import { delimiterAt } from "./delimiter.ts";
import {
	ANSI,
	ANSI_DROP,
	append,
	type Ctx,
	cutHere,
	type Frame,
	frame,
	literal,
	push,
} from "./frames.ts";
import { close, end, open, openDollar } from "./stack.ts";

const DIGITS = /^\d+$/;
const BLANK = /\s/;

export const escapeAt = (f: Frame, text: string, i: number): number => {
	const n = text.charAt(i + 1);
	cutHere(f);
	if (n !== "\n") {
		literal(f, (f.quote && !'$`"\\'.includes(n) ? "\\" : "") + n);
	}
	return i + 1;
};

// Only the substitutions of an arithmetic text are commands.
export const arithAt = (x: Ctx, f: Frame, i: number, c: string): number => {
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
export const ansiAt = (
	f: Frame,
	text: string,
	i: number,
	c: string,
): number => {
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

export const dquoteAt = (x: Ctx, f: Frame, i: number, c: string): number => {
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

export const unquotedAt = (x: Ctx, f: Frame, i: number, c: string): number => {
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
