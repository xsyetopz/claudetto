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
	xargs: {
		valued: ["-I", "-J", "-L", "-P", "-R", "-S", "-a", "-d", "-E", "-n", "-s"],
	},
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

// Options that go between `git` and its verb and take the next word as their value.
const GIT_VALUED = new Set([
	"-C",
	"-c",
	"--git-dir",
	"--work-tree",
	"--namespace",
	"--super-prefix",
	"--config-env",
]);

/** The words of a `git` command without the options before its verb, so `git -C dir reset --hard` reads as `git reset --hard`. */
export const withoutGitOptions = (args: string[]): string[] => {
	let i = 0;
	while (i < args.length && (args[i] ?? "").startsWith("-")) {
		i += GIT_VALUED.has(args[i] ?? "") ? 2 : 1;
	}
	return args.slice(i);
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
