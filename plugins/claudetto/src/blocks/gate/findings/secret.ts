import type { Facts, Verdict } from "../gate.ts";
import { codeSecret } from "../paths.ts";
import * as T from "../prompts.ts";
import { nameOf, operands, optionOf, wordSet } from "../shell/shellkinds.ts";
import { baseName } from "../shell/wrappers.ts";
import { denySecret, secretWord, verdict } from "./finding.ts";

export const NO_READ = wordSet(
	"echo printf ls test [ touch stat rm unlink chmod chown",
);
const COPIES = wordSet("cp mv ln");
const TARGET_OPT = /^(?:--target-directory(?:=|$)|-[A-Za-z]*t)/;
export const PATTERNED = wordSet("grep egrep fgrep rg ugrep sed awk");
const EXCLUDE_PATHSPEC = /^:(?:[!^]|\([^)]*\bexclude\b[^)]*\))/;
const UPLOAD = /^(?:-[A-Za-z]|[^=@<]*=)?[@<](.+)$/;

export const holdsSecret = (
	command: string,
	commands: string[][],
	f: Facts,
): boolean =>
	codeSecret(command) !== undefined ||
	commands.some((argv) => argv.some((w) => secretWord(f.cwd, w, f)));

const PATTERN_VALUES = wordSet("-e -f --regexp --expression --file");
const PATTERN_OPTS = wordSet("-e --regexp --expression");

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

const readWords = (name: string, rest: string[]): string[] => {
	if (!COPIES.has(name) || rest.some((w) => TARGET_OPT.test(w))) {
		return rest;
	}
	const args = operands(rest.slice(1));
	const at = args.length > 1 ? rest.lastIndexOf(args.at(-1) ?? "") : -1;
	return rest.filter((_, i) => i !== at);
};

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
