// The findings of a read of a secret file by name, by an upload word, or by a print of the environment.

import {
	nameOf,
	operands,
	optionOf,
	wordSet,
} from "../../shell/domain/shellkinds.ts";
import { baseName } from "../../shell/domain/wrappers.ts";
import * as T from "../prompts.ts";
import { denySecret, secretWord, verdict } from "./finding.ts";
import type { Facts, Verdict } from "./gate.ts";
import { codeSecret } from "./paths.ts";

/** The commands that take a secret path as a name only: none of them prints, copies, links, or sends the content of a file. */
export const NO_READ = wordSet(
	"echo printf ls test [ touch stat rm unlink chmod chown",
);
/** The commands that copy or link their source operands: each operand but the last, or each operand when `-t` names the target. */
const COPIES = wordSet("cp mv ln");
const TARGET_OPT = /^(?:--target-directory(?:=|$)|-[A-Za-z]*t)/;
/** The commands whose first operand is a pattern or a script, not a file. */
export const PATTERNED = wordSet("grep egrep fgrep rg ugrep sed awk");
/** A `git` pathspec that leaves files out (`:!x`, `:^x`, `:(exclude)x`, `:(glob,exclude)x`), so git reads no file that it names. */
const EXCLUDE_PATHSPEC = /^:(?:[!^]|\([^)]*\bexclude\b[^)]*\))/;
/** The file of an upload word: `@f` of `curl -d @f`, `-d@f`, and `name=@f` or `name=<f` of `curl -F`. */
const UPLOAD = /^(?:-[A-Za-z]|[^=@<]*=)?[@<](.+)$/;

/** True when a word of a command, or a script of the text, names a secret file or a glob for one. */
export const holdsSecret = (
	command: string,
	commands: string[][],
	f: Facts,
): boolean =>
	codeSecret(command) !== undefined ||
	commands.some((argv) => argv.some((w) => secretWord(f.cwd, w, f)));

/** The options that take a value, whose next word or rest of the cluster is not a plain operand: a pattern or script (`-e`, `--regexp`, `--expression`) and a file (`-f`, `--file`). */
const PATTERN_VALUES = wordSet("-e -f --regexp --expression --file");
const PATTERN_OPTS = wordSet("-e --regexp --expression");

/** The indexes of the words of a `PATTERNED` command that are a pattern, not a file: the value of a pattern option, or the first operand when no option gives the pattern. A pattern file (`-f`) gives no pattern operand either. A short cluster (`-fe`) ends at its first letter that takes a value. */
export const patternAt = (words: string[]): number[] => {
	const end = words.indexOf("--");
	const options = end < 0 ? words : words.slice(0, end);
	const given: number[] = [];
	let fromOption = false;
	for (let i = 0; i < options.length; i++) {
		const { value, next } = optionOf(options[i] ?? "", PATTERN_VALUES);
		fromOption ||= value !== undefined;
		if (next) {
			i++;
			if (PATTERN_OPTS.has(value ?? "")) {
				given.push(i);
			}
		}
	}
	return fromOption ? given : [words.indexOf(operands(words)[0] ?? "\0")];
};

/** The words of `rest` that a copy command reads: the destination, the last operand, is left out, because a write of a name reads nothing. */
const readWords = (name: string, rest: string[]): string[] => {
	if (!COPIES.has(name) || rest.some((w) => TARGET_OPT.test(w))) {
		return rest;
	}
	const args = operands(rest.slice(1));
	const at = args.length > 1 ? rest.lastIndexOf(args.at(-1) ?? "") : -1;
	return rest.filter((_, i) => i !== at);
};

/** A read of a secret file by name or by an upload word, or a print of each environment variable with a bare `env` or `printenv`. */
export const secretFinding = (
	argv: string[],
	rest: string[],
	f: Facts,
	dir: string | null,
): Verdict | undefined => {
	const name = nameOf(rest);
	const bareEnv = rest.length === 0 && argv.some((w) => baseName(w) === "env");
	if (
		bareEnv ||
		(name === "printenv" && operands(rest.slice(1)).length === 0)
	) {
		return verdict("deny", T.DENY_ENV_DUMP, { secret: true });
	}
	if (NO_READ.has(name)) {
		return undefined;
	}
	const skipped = PATTERNED.has(name)
		? patternAt(rest.slice(1)).map((i) => i + 1)
		: [];
	const word = readWords(
		name,
		rest.filter(
			(w, i) =>
				!(skipped.includes(i) || (name === "git" && EXCLUDE_PATHSPEC.test(w))),
		),
	)
		.flatMap((w) => [w, UPLOAD.exec(w)?.[1] ?? ""])
		.find((w) => w !== "" && secretWord(dir ?? f.cwd, w, f));
	return word === undefined ? undefined : denySecret(word);
};
