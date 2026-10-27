// The calls of `Bash` with the wrong tool: a call that `Read` can do instead (the user, 2026-10-27).
// The reader is the word scanner of `ghtitle.ts`: it reads the top-level commands only, with no parse of a nested script.

import { operands, wordSet } from "../../shell/domain/shellkinds.ts";
import { baseName } from "../../shell/domain/wrappers.ts";
import * as T from "../prompts.ts";
import { OPERATOR_CHAR, WORD_OR_OPERATOR } from "./ghtitle.ts";

/** A command of the top level: its words, whether a pipe feeds it, so it is a filter, and whether a redirect (`>`, `>>`) sends its standard output to a file. */
interface Part {
	words: string[];
	piped: boolean;
	writes?: true;
}

const READS = wordSet("cat head tail");
/** The options of `head` and `tail` that take a value, so the value is no operand. */
const OPTION_VALUES = wordSet("-n -c");
/** A `tail` follow (`-f`, `-F`, `--follow`) watches a log, so `Read` cannot stand for it. */
const FOLLOW = /^(?:-[A-Za-z0-9]*[fF][A-Za-z0-9]*|--follow(?:=\w+)?)$/;
const ASSIGNMENT = /^\w+=/;
const RESERVED_HEAD = wordSet("{ ! if then else elif do while until");
const SUBSTITUTED_OPERAND = /\$\(|`/;
const BARE_NAME = /^[\w./-]+$/;
const DIGITS = /^\d+$/;
/** A heredoc with its body: the first line stays, so its redirect is read, and the body and the line of the delimiter go. A `<<<` is no heredoc. */
const HEREDOC =
	/((?<!<)<<(?!<)-?[ \t]*(['"]?)(\w+)\2[^\n]*)\n(?:[\s\S]*?\n)?[ \t]*\3(?=\n|$)/g;

/** The state of the scan of `partsOf`: the parts, one flag for each open parenthesis (true for `$(`), the word of the last part, and whether the next word is the target of a redirect. */
interface Scan {
	parts: Part[];
	open: boolean[];
	skip: boolean;
	last: { end: number; raw: string };
}

const begin = (s: Scan, piped: boolean): void => {
	if (!s.open.includes(true)) {
		s.parts.push({ words: [], piped });
	}
};

/** A `<` or `>`: the next word is its target, and a file descriptor before it (`2>`) is no word. A `>` with no descriptor or with `1` writes the standard output. */
const redirect = (s: Scan, raw: string, start: number): void => {
	s.skip = true;
	const part = s.parts.at(-1);
	const fd = DIGITS.test(s.last.raw) && s.last.end === start;
	if (fd) {
		part?.words.pop();
	}
	if (part && raw === ">" && !(fd && s.last.raw !== "1")) {
		part.writes = true;
	}
};

const pipe = (s: Scan, before: string): void => {
	if (before !== "|") {
		begin(s, true);
	} else if (!s.open.includes(true)) {
		// A `||` ends the pipe that its first `|` began.
		const prior = s.parts.at(-1);
		if (prior) {
			prior.piped = false;
		}
	}
};

/** A `$(` drops its `$` word, and it opens a part that the scan ignores until the `)`. */
const group = (s: Scan, start: number): void => {
	const subst = s.last.end === start && s.last.raw.endsWith("$");
	if (subst && s.last.raw === "$") {
		s.parts.at(-1)?.words.pop();
	}
	s.open.push(subst);
	begin(s, false);
};

const operator = (
	s: Scan,
	raw: string,
	start: number,
	before: string,
): void => {
	s.skip = false;
	if (raw === "<" || raw === ">") {
		redirect(s, raw, start);
	} else if (raw === "&" && (before === "<" || before === ">")) {
		s.skip = true;
	} else if (raw === "|") {
		pipe(s, before);
	} else if (raw === "(") {
		group(s, start);
	} else if (raw === ")") {
		s.open.pop();
		begin(s, false);
	} else if (!(raw === "&" && (before === "&" || before === "|"))) {
		begin(s, false);
	}
};

/** The commands of `text` as parts. A part ends at `;`, `&&`, `||`, `|`, `&`, a newline, or a parenthesis. A redirect and its target are not words, and a command in `$(...)` is not a part. */
const partsOf = (text: string): Part[] => {
	const s: Scan = {
		parts: [{ words: [], piped: false }],
		open: [],
		skip: false,
		last: { end: -1, raw: "" },
	};
	let previous = { raw: "", end: -1 };
	for (const m of text.replace(HEREDOC, "$1").matchAll(WORD_OR_OPERATOR)) {
		const start = m.index ?? 0;
		const raw = m[0];
		if (raw.length === 1 && OPERATOR_CHAR.test(raw)) {
			operator(s, raw, start, previous.end === start ? previous.raw : "");
		} else if (s.skip) {
			s.skip = false;
		} else if (!s.open.includes(true)) {
			s.parts.at(-1)?.words.push(raw);
			s.last = { end: start + raw.length, raw };
		}
		previous = { raw, end: start + raw.length };
	}
	return s.parts.filter((p) => p.words.length > 0);
};

/** The words of a part after the assignments and the reserved words, with its program name when it is a bare word. */
const commandOf = (part: Part): { name: string; args: string[] } => {
	const at = part.words.findIndex(
		(w) => !(ASSIGNMENT.test(w) || RESERVED_HEAD.has(w)),
	);
	const words = at < 0 ? [] : part.words.slice(at);
	const first = words[0] ?? "";
	return {
		name: BARE_NAME.test(first) ? baseName(first) : "",
		args: words.slice(1),
	};
};

/** The operands of `args` that name a file, with no substitution. */
const fileOperands = (name: string, args: string[]): string[] =>
	operands(args, name === "cat" ? new Set<string>() : OPTION_VALUES).filter(
		(w) => !SUBSTITUTED_OPERAND.test(w),
	);

/** The reason to deny the command of `part`, or `undefined`. */
const denyPart = (part: Part): string | undefined => {
	const { name, args } = commandOf(part);
	if (part.piped) {
		return undefined;
	}
	const files = fileOperands(name, args);
	const follows = name === "tail" && args.some((w) => FOLLOW.test(w));
	// A `cat` that joins files or reads the standard input (`-`) does what `Read` cannot.
	const joins = name === "cat" && (files.length > 1 || args.includes("-"));
	return READS.has(name) &&
		files.length > 0 &&
		!(follows || joins || part.writes)
		? T.DENY_WRONG_READ({ name })
		: undefined;
};

/** The reason to deny a `Bash` command, or `undefined` when its tool and its text are right. */
export const wrongTool = (command: string): string | undefined =>
	partsOf(command)
		.map(denyPart)
		.find((reason) => reason !== undefined);
