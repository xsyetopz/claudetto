import { ARITH, ansi, type Ctx, cutHere, frame, literal } from "./frames.ts";
import { ansiAt, arithAt, dquoteAt, escapeAt, unquotedAt } from "./handlers.ts";
import { close } from "./stack.ts";

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
