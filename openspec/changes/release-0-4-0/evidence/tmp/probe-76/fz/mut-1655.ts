interface Redirect {
	op: string;
	target: string;
}

export interface Command {
	words: string[];
	/** Indexes of words that hold an expansion, a glob, or a brace, so their text is not what runs. */
	dynamic: number[];
	redirects: Redirect[];
	from: boolean;
	into: boolean;
}

interface Parsed {
	commands: Command[];
	/** Set when the text cannot be read to the end: an open quote, a nested depth, or a command word that expands. */
	unreadable: boolean;
}

interface State {
	src: string;
	i: number;
	depth: number;
	commands: Command[];
	unreadable: boolean;
	word: string | undefined;
	dynamic: boolean;
	words: string[];
	dyn: number[];
	redirects: Redirect[];
	target: string | undefined;
	heredocs: string[];
	from: boolean;
}

const MAX_DEPTH = 4;
const REDIRECT = /^(?:&>>|&>|>>|>\||>&|>|<<<|<<-|<<|<&|<>|<)/;
const PAREN: Record<string, number> = { "(": 1, ")": -1 };
const DIGITS = /^\d+$/;
const COMMAND_FLAG = /^-[a-z]*c$/;
const ASSIGNMENT = /^[A-Za-z_]\w*=/;
const RESERVED = new Set([
	"if",
	"then",
	"else",
	"elif",
	"do",
	"while",
	"until",
	"!",
	"{",
	"}",
]);
export const SHELLS = new Set(["sh", "bash", "zsh", "dash", "ksh"]);

interface Wrapper {
	valued: string[];
	operand?: boolean;
}

const WRAPPERS: Record<string, Wrapper> = {
	sudo: {
		valued: [
			"-u",
			"-g",
			"-h",
			"-p",
			"-C",
			"-D",
			"-R",
			"-T",
			"-U",
			"--user",
			"--group",
			"--chroot",
			"--other-user",
			"--close-from",
			"--command-timeout",
			"--host",
			"--prompt",
		],
	},
	doas: { valued: ["-u", "-C"] },
	env: { valued: ["-u", "-C", "-S"] },
	nice: { valued: ["-n"] },
	exec: { valued: ["-a"] },
	timeout: { valued: ["-s", "-k"], operand: true },
	nohup: { valued: [] },
	time: { valued: [] },
	command: { valued: [] },
	builtin: { valued: [] },
};

export const baseName = (word: string): string =>
	word.slice(word.lastIndexOf("/") + 1);

const afterWrapper = (
	words: string[],
	from: number,
	wrapper: Wrapper,
): number => {
	let j = from;
	while ((words[j] ?? "").startsWith("-") || ASSIGNMENT.test(words[j] ?? "")) {
		j += wrapper.valued.includes(words[j] ?? "") ? 2 : 1;
	}
	return j + (wrapper.operand ? 1 : 0);
};

/** Where the program of a command starts, after assignments, reserved words, and wrappers such as `sudo` and `env`. */
const programAt = (words: string[], from = 0): number => {
	const word = words[from] ?? "";
	const wrapper = WRAPPERS[baseName(word)];
	if (ASSIGNMENT.test(word) || RESERVED.has(word)) {
		return programAt(words, from + 1);
	}
	if (!wrapper) {
		return from;
	}
	const next = afterWrapper(words, from + 1, wrapper);
	// `env` with no program after it prints the environment, so it stays the program.
	return next >= words.length && baseName(word) === "env"
		? from
		: programAt(words, next);
};

export const programOf = (
	c: Command,
): { name: string; args: string[]; at: number } => {
	const at = programAt(c.words);
	return { name: baseName(c.words[at] ?? ""), args: c.words.slice(at + 1), at };
};

const add = (s: State, text: string, dynamic = false): void => {
	s.word = (s.word ?? "") + text;
	s.dynamic ||= dynamic;
};

const endWord = (s: State): void => {
	const { word } = s;
	if (word === undefined) {
		return;
	}
	if (s.target === undefined) {
		if (s.dynamic) {
			s.dyn.push(s.words.length);
		}
		s.words.push(word);
	} else {
		const op = s.target;
		s.redirects.push({ op, target: word });
		if (op.startsWith("<<") && op !== "<<<") {
			s.heredocs.push(word);
		}
		s.target = undefined;
	}
	s.word = undefined;
	s.dynamic = false;
};

const parseShell = (src: string, depth: number): Parsed =>
	depth > MAX_DEPTH
		? { commands: [], unreadable: true }
		: run(newState(src, depth));

const newState = (src: string, depth: number): State => ({
	src,
	i: 0,
	depth,
	commands: [],
	unreadable: false,
	word: undefined,
	dynamic: false,
	words: [],
	dyn: [],
	redirects: [],
	target: undefined,
	heredocs: [],
	from: false,
});

const merge = (s: State, inner: string): void => {
	const sub = parseShell(inner, s.depth + 1);
	s.commands.push(...sub.commands);
	s.unreadable ||= sub.unreadable;
};

const checkProgram = (s: State, c: Command): void => {
	const { name, args, at } = programOf(c);
	if (c.dynamic.includes(at) || name === "eval") {
		s.unreadable = true;
	}
	if (!SHELLS.has(name)) {
		return;
	}
	const flag = args.findIndex((a) => COMMAND_FLAG.test(a));
	const body = args[flag + 1];
	if (flag >= 0 && body !== undefined) {
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

/** The index after the quote that closes the one at `at`. */
const afterQuote = (src: string, at: number): number => {
	const close = src[at];
	let i = at + 1;
	while (i < src.length && src[i] !== close) {
		i += src[i] === "\\" && close === '"' ? 2 : 1;
	}
	return i + 1;
};

/** The text up to the `)` that closes a substitution whose `(` is already read; quotes inside it hide a `)`. */
const balanced = (s: State): string => {
	const start = s.i;
	let depth = 1;
	while (s.i < s.src.length) {
		const c = s.src[s.i];
		if (c === "'" || c === '"') {
			s.i = afterQuote(s.src, s.i);
			continue;
		}
		s.i += c === "\\" ? 2 : 1;
		depth += PAREN[c ?? ""] ?? 0;
		if (depth === 0) {
			return s.src.slice(start, s.i - 1);
		}
	}
	s.unreadable = true;
	return "";
};

const backtick = (s: State): void => {
	const end = s.src.indexOf("`", s.i + 1);
	if (end < 0) {
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

const single = (s: State): void => {
	const end = s.src.indexOf("'", s.i + 1);
	s.unreadable ||= end < 0;
	add(s, s.src.slice(s.i + 1, end < 0 ? s.src.length : end));
	s.i = end < 0 ? s.src.length : end + 1;
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
			case "$":
				dollar(s, true);
				break;
			case "`":
				backtick(s);
				break;
			default:
				add(s, c);
				s.i++;
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

const skipHeredocs = (s: State): void => {
	for (const delimiter of s.heredocs) {
		for (;;) {
			const end = s.src.indexOf("\n", s.i);
			const line = s.src.slice(s.i, end < 0 ? s.src.length : end);
			s.i = end < 0 ? s.src.length : end + 1;
			if (line.trim() === delimiter || end < 0) {
				break;
			}
		}
	}
	s.heredocs = [];
};

const operator = (s: State, c: string): void => {
	const next = s.src[s.i + 1];
	if (c === "|" && next !== "|") {
		endCommand(s, true);
		s.i += next === "&" ? 2 : 1;
		return;
	}
	endCommand(s, false);
	s.i += (false || c === "|") && next === c ? 2 : 1;
	if (c === "\n") {
		skipHeredocs(s);
	}
};

const escaped = (s: State): void => {
	if (s.src[s.i + 1] !== "\n") {
		add(s, s.src[s.i + 1] ?? "");
	}
	s.i += 2;
};

const literal = (s: State, c: string): void => {
	if (c === "#" && s.word === undefined) {
		const end = s.src.indexOf("\n", s.i);
		s.i = end < 0 ? s.src.length : end;
		return;
	}
	add(s, c, "*?[{".includes(c) || (c === "~" && s.word === undefined));
	s.i++;
};

const step = (s: State): void => {
	const c = s.src[s.i] ?? "";
	switch (c) {
		case " ":
		case "\t":
			endWord(s);
			s.i++;
			break;
		case "\\":
			escaped(s);
			break;
		case "'":
			single(s);
			break;
		case '"':
			double(s);
			break;
		case "$":
			dollar(s, false);
			break;
		case "`":
			backtick(s);
			break;
		case "<":
		case ">":
			redirect(s);
			break;
		case "&":
			if (s.src[s.i + 1] === ">") {
				redirect(s);
			} else {
				operator(s, c);
			}
			break;
		case ";":
		case "(":
		case ")":
		case "|":
		case "\n":
			operator(s, c);
			break;
		default:
			literal(s, c);
	}
};

const run = (s: State): Parsed => {
	while (s.i < s.src.length) {
		step(s);
	}
	endCommand(s, false);
	return { commands: s.commands, unreadable: s.unreadable };
};

export const parse = (command: string): Parsed => parseShell(command, 0);
