import type { On } from "claude-code";

import { fault } from "../shared/fault";

/**
 * Ubiquitous POSIX tools and the script interpreters (`-e`, `-c` one-liners) whose common flags
 * need no `--help` read: a note per use would only cost turns.
 */
export const EXEMPT = new Set([
	"awk",
	"basename",
	"bash",
	"cat",
	"cd",
	"chmod",
	"cp",
	"curl",
	"cut",
	"date",
	"df",
	"diff",
	"dirname",
	"du",
	"echo",
	"egrep",
	"env",
	"export",
	"false",
	"fgrep",
	"find",
	"grep",
	"head",
	"jq",
	"kill",
	"ln",
	"ls",
	"mkdir",
	"mv",
	"node",
	"perl",
	"printf",
	"ps",
	"pwd",
	"python",
	"python3",
	"readlink",
	"rg",
	"rm",
	"rmdir",
	"sed",
	"sh",
	"sleep",
	"sort",
	"stat",
	"tail",
	"tar",
	"tee",
	"test",
	"touch",
	"tr",
	"true",
	"uniq",
	"wc",
	"which",
	"xargs",
	"zsh"
]);

/**
 * Subcommands whose flags are common knowledge, so a flagged call needs no note: `git commit -m`,
 * `bun test`. Rarer ones (`git rebase --onto`, `git push --force-with-lease`, `gh pr merge`) still
 * trigger. Retrieval helps rare APIs and hurts common ones (arXiv 2407.09726).
 */
const COMMON = new Set([
	"bun install",
	"bun run",
	"bun test",
	"cargo build",
	"cargo check",
	"cargo test",
	"git add",
	"git branch",
	"git checkout",
	"git clone",
	"git commit",
	"git diff",
	"git fetch",
	"git init",
	"git log",
	"git merge",
	"git mv",
	"git pull",
	"git restore",
	"git rm",
	"git show",
	"git status",
	"git switch",
	"git tag"
]);

/** How many words after the CLI name make up its subcommand: `gh pr merge` has 2, `git commit` 1. */
const DEPTH = new Map<string, number>([
	["brew", 1],
	["bun", 1],
	["cargo", 1],
	["claude", 2],
	["docker", 1],
	["gh", 2],
	["git", 1],
	["kubectl", 1],
	["npm", 1]
]);

/** Git options that take a value, so the value is not the subcommand. */
const GIT_VALUE_OPTIONS = new Set(["-C", "-c", "--git-dir", "--work-tree"]);

/** Words that wrap another command: the wrapped one is the CLI. */
const WRAPPERS = new Set(["command", "exec", "nohup", "sudo", "time"]);

/** Splits a command into the simple commands between `&&`, `||`, `;`, `|` and newlines. */
const SEGMENT_BREAK = /&&|\|\||[;|\n]/u;

/** A flag word: `-x`, `-xyz`, `--long`, `--long=value`. A bare `-` and a negative number are not. */
const FLAG = /^--?[A-Za-z]/u;

/** A shell word: a quoted string or a run of non-space characters. */
const WORD = /"[^"]*"|'[^']*'|\S+/gu;

/** One word of a command; `quoted` marks text the shell took as data, never as a flag. */
interface Word {
	text: string;
	quoted: boolean;
}

const wordsOf = (segment: string): Word[] =>
	[...segment.matchAll(WORD)].map(([raw]) => {
		const quoted = raw.startsWith('"') || raw.startsWith("'");
		return { text: quoted ? raw.slice(1, -1) : raw, quoted };
	});

/** The words from the CLI name on: `NAME=value` prefixes and wrapper words dropped. */
const commandOf = (words: Word[]): Word[] => {
	const at = words.findIndex(
		(word) =>
			word.quoted ||
			(!/^[A-Za-z_]\w*=/u.test(word.text) && !WRAPPERS.has(word.text))
	);
	return at === -1 ? [] : words.slice(at);
};

/** The subcommand words of a CLI call, by its depth, with git's option values skipped. */
const subcommandOf = (cli: string, rest: Word[]): string[] => {
	const depth = DEPTH.get(cli) ?? 0;
	const found: string[] = [];
	for (let i = 0; i < rest.length && found.length < depth; i += 1) {
		const word = rest[i];
		if (word === undefined) {
			break;
		}
		if (cli === "git" && GIT_VALUE_OPTIONS.has(word.text)) {
			i += 1;
		} else if (!word.quoted && FLAG.test(word.text)) {
			if (found.length > 0) {
				break;
			}
		} else {
			found.push(word.text);
		}
	}
	return found;
};

/** What one simple command shows about its CLI. */
interface Call {
	/** `gh pr merge`, `git commit`, `just`: the CLI and its subcommand. */
	key: string;
	cli: string;
	/** The call reads help: `--help`, `-h`, `help <sub>`, or `man <cli>`. */
	help: boolean;
	/** The call passes a flag other than a help flag. */
	flags: boolean;
}

const isHelpFlag = (word: Word): boolean =>
	!word.quoted && (word.text === "--help" || word.text === "-h");

const callOf = (segment: string): Call | undefined => {
	const [name, ...rest] = commandOf(wordsOf(segment));
	if (name === undefined || name.text.includes("/")) {
		return undefined;
	}
	const cli = name.text;
	if (cli === "man") {
		const page = rest.find((word) => !FLAG.test(word.text))?.text;
		return page === undefined ? undefined : manCall(page);
	}
	if (EXEMPT.has(cli)) {
		return undefined;
	}
	const helpWord = rest[0]?.text === "help";
	const sub = subcommandOf(cli, helpWord ? rest.slice(1) : rest);
	const flagWords = rest.filter(
		(word) => !word.quoted && FLAG.test(word.text) && !isHelpFlag(word)
	);
	const key = [cli, ...sub].join(" ");
	if (COMMON.has(key)) {
		return undefined;
	}
	return {
		key,
		cli,
		help: helpWord || rest.some((word) => isHelpFlag(word)),
		flags: flagWords.length > 0
	};
};

/** `man git-commit` reads the help of `git commit`; `man gh` that of the CLI. */
const manCall = (page: string): Call => {
	const [cli = page, ...sub] = page.split("-");
	const depth = DEPTH.get(cli) ?? 0;
	const key = [cli, ...sub.slice(0, depth)].join(" ");
	return { key, cli, help: true, flags: false };
};

/** The note for a flagged CLI call with no help read, within 200 characters. */
export const helpNote = (key: string): string =>
	`You used flags of \`${key}\` and no \`${key} --help\` ran in this session. Run it and take each flag from its output, not from memory.`;

/** What a session has read and been told: help keys seen and keys already noted. */
export interface HelpState {
	read: Set<string>;
	noted: Set<string>;
}

/** A fresh state for one agent loop. */
export const newHelpState = (): HelpState => ({
	read: new Set(),
	noted: new Set()
});

/**
 * Walks a Bash command's simple commands in order. A help read marks its CLI
 * (a `man <cli>` page covers every subcommand); a flagged call with no read yet
 * yields one note per key, once per session.
 */
export const helpNotes = (command: string, state: HelpState): string[] => {
	const notes: string[] = [];
	for (const segment of command.split(SEGMENT_BREAK)) {
		const call = callOf(segment);
		if (call === undefined) {
			continue;
		}
		if (call.help) {
			state.read.add(call.key);
		} else if (
			call.flags &&
			!state.read.has(call.key) &&
			!state.read.has(call.cli) &&
			!state.noted.has(call.key)
		) {
			state.noted.add(call.key);
			notes.push(helpNote(call.key));
		}
	}
	return notes;
};

/**
 * Adds a context note after a Bash result when the command uses flags of an
 * external CLI that no `--help` read covers yet (REQ-REPLY-149). It blocks
 * nothing and answers each CLI and subcommand once per agent loop.
 * Mechanism: `tool.call` results carry `context`, text the model reads after the
 * result, like a PostToolUse reminder.
 */
export function registerHelpNote(on: On): void {
	const states = new Map<string, HelpState>();
	on("tool.call", { tool: "Bash" }, async (_$, e, next) => {
		const r = await next(e);
		if (e.tool !== "Bash" || r.deny !== undefined) {
			return r;
		}
		const id = e.agentId ?? "";
		const state = states.get(id) ?? newHelpState();
		states.set(id, state);
		const notes = helpNotes(e.command, state);
		return notes.length === 0
			? r
			: { ...r, context: [...(r.context ?? []), ...notes] };
	}).catch(($, e, next) => {
		fault($, "help note", next.error);
		return next(e);
	});
}
