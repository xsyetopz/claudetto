import { baseName, programAt } from "./program-at.ts";
import {
	add,
	balanced,
	type Command,
	endWord,
	escaped,
	literal,
	newState,
	single,
	skipHeredocs,
	type State,
} from "./shell-state.ts";

export type { Command } from "./shell-state.ts";

interface Parsed {
	commands: Command[];
	/** Set when the text cannot be read to the end: an open quote, a nested depth, or a command word that expands. */
	unreadable: boolean;
}

const MAX_DEPTH = 4;
const REDIRECT = /^(?:&>>|&>|>>|>\||>&|>|<<<|<<-|<<|<&|<>|<)/u;
const DIGITS = /^\d+$/u;
const COMMAND_FLAG = /^-[a-z]*c$/u;
export const SHELLS = new Set(["sh", "bash", "zsh", "dash", "ksh"]);

export const programOf = (
	c: Command,
): { name: string; args: string[]; at: number } => {
	const at = programAt(c.words);
	return { name: baseName(c.words[at] ?? ""), args: c.words.slice(at + 1), at };
};

const parseShell = (src: string, depth: number): Parsed =>
	depth > MAX_DEPTH
		? { commands: [], unreadable: true }
		: run(newState(src, depth));

/** The script text a command hands to a shell: the word after `-c` of `sh`, `bash` and the like, or the words of `eval`. */
export const scriptOf = (c: Command): string | undefined => {
	const { name, args } = programOf(c);
	if (name === "eval") {
		return args.join(" ");
	}
	const flag = args.findIndex((a) => COMMAND_FLAG.test(a));
	return SHELLS.has(name) && flag !== -1 ? args[flag + 1] : undefined;
};

const merge = (s: State, inner: string): void => {
	const sub = parseShell(inner, s.depth + 1);
	s.commands.push(...sub.commands);
	s.unreadable ||= sub.unreadable;
};

const checkProgram = (s: State, c: Command): void => {
	const { name, at } = programOf(c);
	if (c.dynamic.includes(at) || name === "eval") {
		s.unreadable = true;
	}
	if (!SHELLS.has(name)) {
		return;
	}
	const body = scriptOf(c);
	if (body !== undefined) {
		merge(s, body);
	} else if (c.redirects.some((r) => r.op.startsWith("<<"))) {
		s.unreadable = true;
	}
};

const endCommand = (s: State, piped: boolean): void => {
	endWord(s);
	if (s.words.length > 0 || s.redirects.length > 0) {
		const c: Command = {
			words: s.words,
			dynamic: s.dyn,
			redirects: s.redirects,
			from: s.from,
			into: piped,
		};
		s.commands.push(c);
		checkProgram(s, c);
	}
	s.words = [];
	s.dyn = [];
	s.redirects = [];
	s.target = undefined;
	s.from = piped;
};

const backtick = (s: State): void => {
	const end = s.src.indexOf("`", s.i + 1);
	if (end === -1) {
		s.unreadable = true;
		s.i = s.src.length;
		return;
	}
	merge(s, s.src.slice(s.i + 1, end));
	s.i = end + 1;
	add(s, "", true);
};

const dollar = (s: State, inDouble: boolean): void => {
	const next = s.src[s.i + 1];
	if (next === "(") {
		s.i += 2;
		merge(s, balanced(s));
		add(s, "", true);
	} else if (next === "'" && !inDouble) {
		const start = s.i + 2;
		let end = start;
		while (end < s.src.length && s.src[end] !== "'") {
			end += s.src[end] === "\\" ? 2 : 1;
		}
		s.unreadable ||= end >= s.src.length;
		const text = s.src.slice(start, end);
		add(s, text, text.includes("\\"));
		s.i = end + 1;
	} else {
		add(s, "$", true);
		s.i++;
	}
};

const double = (s: State): void => {
	add(s, "");
	s.i++;
	while (s.i < s.src.length && s.src[s.i] !== '"') {
		const c = s.src[s.i] ?? "";
		switch (c) {
			case "\\": {
				const next = s.src[s.i + 1] ?? "";
				add(s, '$`"\\'.includes(next) ? next : `\\${next}`);
				s.i += 2;
				break;
			}
			case "$": {
				dollar(s, true);
				break;
			}
			case "`": {
				backtick(s);
				break;
			}
			default: {
				add(s, c);
				s.i++;
			}
		}
	}
	s.unreadable ||= s.i >= s.src.length;
	s.i++;
};

const redirect = (s: State): void => {
	const op = REDIRECT.exec(s.src.slice(s.i))?.[0] ?? "";
	if (s.src[s.i + 1] === "(" && (op === "<" || op === ">")) {
		s.i += 2;
		merge(s, balanced(s));
		add(s, "/dev/fd/63", true);
		return;
	}
	if (DIGITS.test(s.word ?? "")) {
		s.word = undefined;
	}
	endWord(s);
	s.target = op;
	s.i += op.length;
};

const operator = (s: State, c: string): void => {
	const next = s.src[s.i + 1];
	if (c === "|" && next !== "|") {
		endCommand(s, true);
		s.i += next === "&" ? 2 : 1;
		return;
	}
	endCommand(s, false);
	s.i += (c === "&" || c === "|") && next === c ? 2 : 1;
	if (c === "\n") {
		skipHeredocs(s);
	}
};

const blank = (s: State): void => {
	endWord(s);
	s.i++;
};

const ampersand = (s: State, c: string): void => {
	if (s.src[s.i + 1] === ">") {
		redirect(s);
	} else {
		operator(s, c);
	}
};

const HANDLERS: Record<string, (s: State, c: string) => void> = {
	" ": blank,
	"\t": blank,
	"\\": escaped,
	"'": single,
	'"': double,
	$: (s) => {
		dollar(s, false);
	},
	"`": backtick,
	"<": redirect,
	">": redirect,
	"&": ampersand,
	";": operator,
	"(": operator,
	")": operator,
	"|": operator,
	"\n": operator,
};

const step = (s: State): void => {
	const c = s.src[s.i] ?? "";
	(HANDLERS[c] ?? literal)(s, c);
};

const run = (s: State): Parsed => {
	while (s.i < s.src.length) {
		step(s);
	}
	endCommand(s, false);
	return { commands: s.commands, unreadable: s.unreadable };
};

export const parse = (command: string): Parsed => parseShell(command, 0);
