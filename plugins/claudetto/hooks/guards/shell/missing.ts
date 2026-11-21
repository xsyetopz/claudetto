/** What a Bash answer shows: the engine's error text, and the record's two streams. */
export interface BashAnswer {
	/** The error text the model read ("Exit code 127\n..."), when the tool errored. */
	text: string | undefined;
	/** The record's standard output, when it has one. */
	stdout: string | undefined;
	/** The record's standard error, when it has one. */
	stderr: string | undefined;
}

/** The note for a zero count, within 200 characters. */
export const GREP_COUNT_NOTE =
	"`grep -c` exits 1 when the count is 0: zero matches, not a failure. Take the 0 as the answer; do not retry or switch tools.";

/** `bash: line 1: jscpd: command not found` and zsh's `zsh: command not found: jscpd`. */
const NOT_FOUND = [
	/(?:^|\n)[^\n]*command not found: (\S+)/u,
	/(?:^|\n)[^\n]*?([^\s:]+): command not found/u
];

/** `jscpd: No such file or directory`: a name followed by the shell's missing-file text. */
const NO_SUCH_FILE =
	/(?:^|\n)(?:[^\n:]*: )*([^\s:]+): No such file or directory/gu;

/** Each word in command position: after a line start, `;`, `&`, `|` or `(`, past any `NAME=value` prefixes. */
const COMMAND_WORD =
	/(?:^|[;&|(]|\n)\s*(?:[A-Za-z_]\w*=\S*\s+)*([^\s;&|()<>$"'\\=]+)/gu;

/** A `grep` whose own flags carry `-c` or `--count`. */
const GREP_COUNT =
	/\bgrep\b[^|;&\n]*\s(?:-[A-Za-z]*c[A-Za-z]*|--count)(?=\s|$)/u;

/** The longest command name the note quotes. */
const NAME_LIMIT = 40;

const textOf = (answer: BashAnswer): string =>
	[answer.text, answer.stderr, answer.stdout]
		.filter((part): part is string => part !== undefined)
		.join("\n");

const commandWords = (command: string): string[] =>
	[...command.matchAll(COMMAND_WORD)].flatMap(([, word]) =>
		word === undefined ? [] : [word]
	);

/**
 * The command a Bash answer reports as missing, or undefined: exit 127, or
 * "command not found" in the output, or "No such file or directory" for a word
 * in command position. A path (`./run.sh`) is a missing file, not an install.
 *
 * @param command The Bash command as the model wrote it.
 * @param answer What the call returned.
 */
export const missingCommand = (
	command: string,
	answer: BashAnswer
): string | undefined => {
	const text = textOf(answer);
	const words = commandWords(command);
	const named = NOT_FOUND.map((pattern) => pattern.exec(text)?.[1]).find(
		(word) => word !== undefined
	);
	const exit127 = /^Exit code 127\b/mu.test(text);
	const missing =
		named ??
		[...text.matchAll(NO_SUCH_FILE)]
			.map(([, word]) => word)
			.find((word) => word !== undefined && words.includes(word)) ??
		(exit127 ? words[0] : undefined);
	return missing === undefined ||
		missing.includes("/") ||
		missing.length > NAME_LIMIT
		? undefined
		: missing;
};

/**
 * The note for a command that is not installed: install it, rerun, and keep
 * the check. `just setup` installs the repo's pinned tools, so it comes first
 * when the repo's justfile has that recipe.
 *
 * @param name The missing command.
 * @param hasSetup The repo's justfile has a `setup` recipe.
 */
export const missingNote = (name: string, hasSetup: boolean): string =>
	hasSetup
		? `${name} is not installed. Run \`just setup\`, then rerun the command. Keep the check; do not skip it or rely on another one.`
		: `${name} is not installed. Install it with the system package manager (brew, apt), then rerun the command. Keep the check; do not skip it.`;

/**
 * Whether a Bash answer is `grep -c` reporting no match: the command counts
 * with grep, the call exited 1, and the output is the single line `0`.
 *
 * @param command The Bash command as the model wrote it.
 * @param answer What the call returned.
 */
export const isZeroCount = (command: string, answer: BashAnswer): boolean => {
	if (!GREP_COUNT.test(command) || answer.text === undefined) {
		return false;
	}
	const [first, ...rest] = answer.text.split("\n");
	return first?.trim() === "Exit code 1" && rest.join("\n").trim() === "0";
};
