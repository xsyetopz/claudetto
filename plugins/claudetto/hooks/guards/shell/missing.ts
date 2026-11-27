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
	"`grep -c` exits 1 when the count is 0: zero matches, not a failure. Take the 0 as the answer and carry on with the same tool.";

/** The note for `gh pr checks` that found no check, within 200 characters. */
export const NO_CHECKS_NOTE =
	"No check has registered yet, so this is not a pass. Wait until the checks appear and finish, then rerun `gh pr checks` before merging.";

/** The note for a model call that lacks an API key, within 200 characters. */
export const API_KEY_NOTE =
	"This session runs on the Claude Code login and holds no API key. Change the tool to call `claude -p` with the same model and prompt, rerun it, and name the change as the fix.";

/**
 * A missing Anthropic API key, as a script or SDK reports it: the variable
 * named beside "not set" and the like, or the API's own x-api-key error.
 */
const NO_API_KEY = [
	/ANTHROPIC_API_KEY\b[^\n]{0,40}\b(?:is not set|not set|is missing|missing|is required|required|is empty|undefined)/iu,
	/(?:missing|set|provide|requires?)\b[^\n]{0,40}ANTHROPIC_API_KEY\b/iu,
	/x-api-key header is required|invalid x-api-key/iu
];

/** `gh pr checks`, bare or behind `gh` flags, in command position. */
const GH_PR_CHECKS = /(?:^|[;&|(]\s*)gh\s+(?:-\S+\s+)*pr\s+checks\b/u;

/** `bash: line 1: jscpd: command not found` and zsh's `zsh: command not found: jscpd`. */
const NOT_FOUND = [
	/(?:^|\n)[^\n]*command not found: (\S+)/u,
	/(?:^|\n)[^\n]*?([^\s:]+): command not found/u
];

/** `jscpd: No such file or directory`: a name followed by the shell's missing-file text. */
const NO_SUCH_FILE =
	/(?:^|\n)(?:[^\n:]*: )*([^\s:]+): No such file or directory/gu;

/** A lone lookup of one program, `which tshark` or `command -v tshark`, whose exit 1 means it is absent. */
const LOOKUP = /^\s*(?:which|command -v|type)\s+([\w.+-]+)\s*$/u;

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

// A shell writes its own "command not found" to stderr; the same words in stdout are data the
// command printed (a grep of a log, a transcript), and a successful grep for them drew a false
// install note. A missing tool merged into stdout (`2>&1 | tail`) already gets the pipefail note.
const errorTextOf = (answer: BashAnswer): string =>
	[answer.text, answer.stderr]
		.filter((part): part is string => part !== undefined)
		.join("\n");

const commandWords = (command: string): string[] =>
	[...command.matchAll(COMMAND_WORD)].flatMap(([, word]) =>
		word === undefined ? [] : [word]
	);

/**
 * The command a Bash answer reports as missing, or undefined: exit 127, or
 * "command not found" in the error text or stderr, or "No such file or directory"
 * for a word in command position, or a lone `which` or `command -v` that exited 1
 * (GUARDS-091). Stdout is not read, because a command that
 * prints those words (a grep of a log) has not lost a tool. A path (`./run.sh`)
 * is a missing file, not an install.
 *
 * @param command The Bash command as the model wrote it.
 * @param answer What the call returned.
 */
export const missingCommand = (
	command: string,
	answer: BashAnswer
): string | undefined => {
	const text = errorTextOf(answer);
	const words = commandWords(command);
	const named = NOT_FOUND.map((pattern) => pattern.exec(text)?.[1]).find(
		(word) => word !== undefined
	);
	const exit127 = /^Exit code 127\b/mu.test(text);
	const looked = /^Exit code 1\b/mu.test(text)
		? LOOKUP.exec(command)?.[1]
		: undefined;
	const missing =
		named ??
		looked ??
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
 * when the repo's justfile has that recipe. Without one, a refused install
 * points at another runner: claudetto runs that stopped at a denied `brew`
 * reported the check not run (RISK-356).
 *
 * @param name The missing command.
 * @param hasSetup The repo's justfile has a `setup` recipe.
 */
export const missingNote = (name: string, hasSetup: boolean): string =>
	hasSetup
		? `${name} is not installed. Run \`just setup\`, then rerun the command. Keep the check and run that same one.`
		: `${name} is not installed. Install it with the system package manager (\`brew\`, \`apt\`) and rerun. If that is refused, run the check another way (\`bunx\`, an installed binary). Keep the check.`;

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

/**
 * Whether a Bash answer is `gh pr checks` reporting that no check exists yet:
 * the command runs `gh pr checks` and its output says "no checks reported".
 * The exit status is 0 there, so a watch looks like a pass.
 *
 * @param command The Bash command as the model wrote it.
 * @param answer What the call returned.
 */
export const hasNoChecks = (command: string, answer: BashAnswer): boolean =>
	GH_PR_CHECKS.test(command) && /no checks reported/iu.test(textOf(answer));

/**
 * Whether a Bash answer shows a model call stopped for lack of an Anthropic
 * API key. The session itself runs on the Claude Code login, which `claude -p`
 * uses, so the call can go on without a key from the user (RISK-379).
 *
 * @param answer What the call returned.
 */
export const needsApiKey = (answer: BashAnswer): boolean => {
	const text = textOf(answer);
	return NO_API_KEY.some((pattern) => pattern.test(text));
};
