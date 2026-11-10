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

export interface State {
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

const PAREN: Record<string, number> = { "(": 1, ")": -1 };

export const newState = (src: string, depth: number): State => ({
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

export const add = (s: State, text: string, dynamic = false): void => {
	s.word = (s.word ?? "") + text;
	s.dynamic ||= dynamic;
};

export const endWord = (s: State): void => {
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
export const balanced = (s: State): string => {
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

export const single = (s: State): void => {
	const end = s.src.indexOf("'", s.i + 1);
	s.unreadable ||= end === -1;
	add(s, s.src.slice(s.i + 1, end === -1 ? s.src.length : end));
	s.i = end === -1 ? s.src.length : end + 1;
};

export const skipHeredocs = (s: State): void => {
	for (const delimiter of s.heredocs) {
		for (;;) {
			const end = s.src.indexOf("\n", s.i);
			const line = s.src.slice(s.i, end === -1 ? s.src.length : end);
			s.i = end === -1 ? s.src.length : end + 1;
			if (line.trim() === delimiter || end === -1) {
				break;
			}
		}
	}
	s.heredocs = [];
};

export const escaped = (s: State): void => {
	if (s.src[s.i + 1] !== "\n") {
		add(s, s.src[s.i + 1] ?? "");
	}
	s.i += 2;
};

export const literal = (s: State, c: string): void => {
	if (c === "#" && s.word === undefined) {
		const end = s.src.indexOf("\n", s.i);
		s.i = end === -1 ? s.src.length : end;
		return;
	}
	add(s, c, "*?[{".includes(c) || (c === "~" && s.word === undefined));
	s.i++;
};
