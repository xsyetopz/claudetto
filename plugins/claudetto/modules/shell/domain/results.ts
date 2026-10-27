// The types and small readers of `shell.ts`: the queue of texts, the facts of `git`, and the result of `parse`.

import type { Aliases } from "./git.ts";

/** A text that `parse` scans later, with the words of its heredoc when it has one. `aliases` (those of `-c` and the env, and not those of the config files) and `depth` are set for the text that an alias runs. `lone` is true for a text that is one plain `git` call. */
export interface Queued {
	text: string;
	body: boolean;
	aliases?: Aliases | undefined;
	depth?: number;
	lone?: boolean;
}

const MULTI_COMMAND_CHAR = /[;&|()<>`$\\{}\r\n]/;
export const FD_TARGET = /^(?:\d+|-)$/;
export const ENV_ASSIGNMENT = /^(\w+)=(.*)$/s;
export const CODE_ARG_CHAR = /[\s(){};]/;

/** True when `text` can hold only one command, with no other command, no redirect, no substitution, no quote escape, and no group: the text has none of `;&|()<>`, a backquote, `$`, a backslash, braces, or a line break. */
export const oneCommand = (text: string): boolean =>
	!MULTI_COMMAND_CHAR.test(text);

/**
 * What the gate knows of `git` outside the text: the aliases of the config, and the commands (`git --list-cmds=main,others`), both for the folder of the session.
 * They are known only for a lone call: the whole text is one plain `git` call, with no env prefix, no wrapper, no other command, no redirect, and no option that changes the config files (`-C`, `-c` for a key other than `alias.X`, `--config-env`, `--git-dir`, `--work-tree`, `--exec-path`).
 * Each other text reads only the `builtins`, because another command, a `cd`, or a file write may change which config files `git` reads. With no `builtins`, it is `commands`.
 */
export interface GitFacts {
	aliases: Aliases;
	commands: ReadonlySet<string>;
	builtins?: ReadonlySet<string>;
}

/** True when `verb` is a command of `git` that the gate knows: any command for a lone call (`lone`), else a built-in. With no `git` facts, each verb is known. */
export const knownVerb = (
	git: GitFacts | undefined,
	lone: boolean,
	verb: string,
): boolean =>
	git === undefined ||
	(lone ? git.commands : (git.builtins ?? git.commands)).has(verb);

export type Held = Queued & { outs: string[] };

interface Redirect {
	op: string;
	target: string;
}

export interface ParseResult {
	commands: string[][];
	redirects: Redirect[];
	code: string[];
	background: string[][];
	/** The commands of `commands` (the same arrays) with a word that still holds a `$` that no value filled, such as `$f` for a variable that nothing assigned. A plain `$` (in single quotes or after a backslash) is no such word. */
	opaque: Set<string[]>;
	truncated: boolean;
	/** True when the text runs a program, a script, or a `git` verb that the reader cannot name. */
	unknown: boolean;
	/** True when the verb of a lone `git` call is no alias and no command of `git.commands`, so `unknown` is true: the gate may read more facts and parse again. */
	unknownVerb: boolean;
	/** True when a `git` call has a `-c` or `--config-env` key, a `GIT_CONFIG_*` entry, or a program variable (`GIT_PAGER`, `EDITOR`, ...) that can make `git` run a program, also for a built-in verb. */
	gitProgram: boolean;
}

/** The text of each data body that one of the `programs` reads: from a file that the body is written to, or from its standard output. */
export const readDataBodies = (data: Held[], programs: string[][]): string[] =>
	data
		.filter(({ outs }) =>
			outs.length > 0
				? outs.some((t) => programs.some((argv) => argv.includes(t)))
				: programs.length > 0,
		)
		.map(({ text }) => text);
