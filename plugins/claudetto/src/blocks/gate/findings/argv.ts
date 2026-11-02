import type { Facts } from "../gate.ts";
import { ENV_ASSIGNMENT } from "../shell/results.ts";
import { parse } from "../shell/shell.ts";
import { wordSet } from "../shell/shellkinds.ts";
import { bashFindings } from "./bash.ts";
import { secretWord } from "./finding.ts";

export const SECRET_VALUE = "CLAUDETTO_SECRET_VALUE";

const SETS_VARIABLE = wordSet("export local declare typeset readonly");
const PRINTS = wordSet("echo printf");

type Span = readonly [start: number, end: number];

interface Cursor {
	i: number;
	quote: string | undefined;
}

/** Moves the cursor past an escape or a quote, and tells whether the character at it was one. */
const quoteStep = (text: string, c: Cursor): boolean => {
	const ch = text[c.i];
	if (c.quote === "'") {
		c.quote = ch === "'" ? undefined : c.quote;
		return true;
	}
	if (ch === "\\") {
		c.i++;
		return true;
	}
	if (ch === '"' || (ch === "'" && c.quote === undefined)) {
		c.quote = c.quote === ch ? undefined : ch;
		return true;
	}
	return false;
};

const closeTick = (text: string, from: number): number => {
	for (let i = from; i < text.length; i++) {
		switch (text[i]) {
			case "\\":
				i++;
				break;
			case "`":
				return i;
			default:
		}
	}
	return -1;
};

const closeParen = (text: string, from: number): number => {
	const c: Cursor = { i: from, quote: undefined };
	for (let depth = 1; c.i < text.length; c.i++) {
		const ch = text[c.i];
		if (quoteStep(text, c) || c.quote !== undefined) {
			continue;
		}
		depth += Number(ch === "(") - Number(ch === ")");
		if (depth === 0) {
			return c.i;
		}
	}
	return -1;
};

const opensAt = (text: string, i: number): boolean =>
	text[i] === "`" ||
	(text[i] === "$" && text[i + 1] === "(" && text[i + 2] !== "(");

/** The outermost command substitutions, or none when one does not close, so the caller keeps its whole-command reading. */
const spansOf = (text: string): Span[] | undefined => {
	const spans: Span[] = [];
	for (const c: Cursor = { i: 0, quote: undefined }; c.i < text.length; c.i++) {
		if (quoteStep(text, c) || !opensAt(text, c.i)) {
			continue;
		}
		const end =
			text[c.i] === "`" ? closeTick(text, c.i + 1) : closeParen(text, c.i + 2);
		if (end < 0) {
			return undefined;
		}
		spans.push([c.i, end + 1]);
		c.i = end;
	}
	return spans;
};

const innerOf = (text: string, [start, end]: Span): string =>
	text.slice(start + (text[start] === "`" ? 1 : 2), end - 1);

type Place = "argument" | "environment" | "printed";

const placeOf = (argv: readonly string[], at: number): Place => {
	const lead = argv.findIndex((w) => !ENV_ASSIGNMENT.test(w));
	if (lead < 0 || at < lead || SETS_VARIABLE.has(argv[lead] ?? "")) {
		return "environment";
	}
	return PRINTS.has(argv[lead] ?? "") ? "printed" : "argument";
};

export type Placed =
	| { readonly kind: "argument"; readonly word: string }
	| {
			readonly kind: "environment";
			readonly word: string;
			readonly rest: string;
	  };

/**
 * Where the output of a substitution that reads a secret lands: a program's arguments, which each local user can read with `ps`, or a shell variable.
 * None when no substitution reads a secret, or when the whole-command reading should stand.
 */
export const placedSecret = (command: string, f: Facts): Placed | undefined => {
	const spans = spansOf(command) ?? [];
	const found = spans.map((span) => {
		const inner = innerOf(command, span);
		const findings = bashFindings(inner, f, false, parse(inner));
		const reads = findings.some(
			(x) => typeof x !== "function" && x.secret === true,
		);
		const onlyReads = findings.every(
			(x) => typeof x !== "function" && x.secret === true,
		);
		const word =
			parse(inner)
				.commands.flat()
				.find((w) => secretWord(f.cwd, w, f)) ?? inner.trim();
		return { span, reads, onlyReads, word };
	});
	const secret = found.filter((s) => s.reads);
	const first = secret[0];
	if (first === undefined) {
		return undefined;
	}
	let rest = command;
	for (const { span } of [...secret].reverse()) {
		rest = rest.slice(0, span[0]) + SECRET_VALUE + rest.slice(span[1]);
	}
	const places = parse(rest).commands.flatMap((argv) =>
		argv.flatMap((w, at) =>
			w.includes(SECRET_VALUE) ? [placeOf(argv, at)] : [],
		),
	);
	if (places.includes("argument")) {
		return { kind: "argument", word: first.word };
	}
	return places.length > 0 &&
		places.every((p) => p === "environment") &&
		secret.every((s) => s.onlyReads)
		? { kind: "environment", word: first.word, rest }
		: undefined;
};
