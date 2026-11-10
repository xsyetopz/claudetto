const ASSIGNMENT = /^[A-Za-z_]\w*=/u;
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
	return j + (wrapper.operand === true ? 1 : 0);
};

/** Where the program of a command starts, after assignments, reserved words, and wrappers such as `sudo` and `env`. */
export const programAt = (words: string[], from = 0): number => {
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
