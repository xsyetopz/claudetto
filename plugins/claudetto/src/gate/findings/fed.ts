// The findings of a program that reads a file that the gate cannot name, and the ask when the project has an env file.

import { nameOf, wordSet } from "../../shell/shellkinds.ts";
import { baseName } from "../../shell/wrappers.ts";
import type { Facts } from "../gate.ts";
import { ENV_FILE, pathOf } from "../paths.ts";
import * as T from "../prompts.ts";
import { type Finding, verdict } from "./finding.ts";
import { NO_READ, PATTERNED, patternAt } from "./secret.ts";

/** The programs that take their arguments from standard input, so the files they act on are not in the command; the delete check and the secret-fed check both ask about them. */
export const PIPED = wordSet("xargs parallel");
/** A `<` read (also `0<` and `<>`) and its target word. A `<<`, `<(`, and `<&` are no read of a file. */
const INPUT =
	/(?<!<)<(?![<(&])>?\s*((?:\$\([^)]*\)?|`[^`]*`?|'[^']*'|"[^"]*"|[^\s;&|<>()'"])*)/g;
const UNREADABLE_TARGET = /[$`*?[]/;
const QUOTE_CHARS = /['"]/g;
/** The `$` and backtick expansions of a word: `$x`, `${x}`, `$(...)`, `$1`, and `` `...` ``. */
const EXPANSION =
	/\$(?:\{[^}]*\}|\([^)]*\)|[A-Za-z_]\w*|[0-9@*#?$!-])|`[^`]*`/g;
/** The characters that a literal tail must not hold: another expansion, a group, a glob, or an escape. */
const OPEN_TAIL = /[$`(){}*?[\\]/;

/** True when the word with `$` cannot name a file of `names`: the literal text after its last expansion shows that. A tail with a `/` fixes the base name, which must not match `ENV_FILE`. A tail with no `/` ends the base name, so no name of `names` may end with it. A bare expansion, or a tail that the gate cannot read, is not safe. */
const safeWord = (word: string, names: readonly string[]): boolean => {
	const text = word.replace(QUOTE_CHARS, "");
	const last = [...text.matchAll(EXPANSION)].at(-1);
	if (last === undefined) {
		return false;
	}
	const tail = text.slice(last.index + last[0].length);
	if (OPEN_TAIL.test(tail)) {
		return false;
	}
	if (tail.includes("/")) {
		return !ENV_FILE.test(tail.slice(tail.lastIndexOf("/") + 1));
	}
	return tail !== "" && !names.some((name) => name.endsWith(tail));
};

/** An `ask` when the project has an env file that a word of `words` can name, or when the adapter cannot tell. `words` is missing when the gate can rule out no word (a piped input or an empty operand). */
export const envAsk =
	(f: Facts, words?: string[]): Finding =>
	async () => {
		const names = await f.hasEnvFile?.();
		const asks =
			names === undefined ||
			(names.length > 0 &&
				(words === undefined || words.some((w) => !safeWord(w, names))));
		return asks ? verdict("ask", T.ASK_ENV_FED) : undefined;
	};

/** True when the text reads a file by `<` and the gate cannot read the target: it holds `$`, a backtick, or a glob character, or it is empty. */
export const readsUnnamed = (text: string): boolean =>
	[...text.matchAll(INPUT)].some((m) => {
		const target = m[1] ?? "";
		return (
			UNREADABLE_TARGET.test(target) || target.replace(QUOTE_CHARS, "") === ""
		);
	});

/**
 * A program whose file comes from `$(...)`, backticks, the input of `xargs`, or a variable with no known value reads a file that the gate cannot name.
 * It asks when the text holds a secret name.
 * Any other program asks also when the project has an env file, because the text may build the name of a file (`cat $(printf ".e%s" nv)`, `python3 $f`), unless the gate reads the operand in full.
 * An empty operand is unread when the text has `$` or a backtick outside the literal heredocs of `LITERAL_DOC`, as `git commit -m "$(cat <<'EOF'` does not.
 */
export const fedFinding = (
	argv: string[],
	rest: string[],
	f: Facts,
	dir: string,
	named: { secret: boolean; subst: boolean; dynamic: boolean; opaque: boolean },
): Finding | undefined => {
	if (rest.length === 0 || NO_READ.has(nameOf(rest))) {
		return undefined;
	}
	const piped = argv.some((w) => PIPED.has(baseName(w)));
	const words = rest.slice(1);
	const empty = named.subst && words.includes("");
	if (named.secret && (piped || empty)) {
		return verdict("ask", T.ASK_SECRET_FED);
	}
	const skipped = PATTERNED.has(nameOf(rest)) ? patternAt(words) : [];
	const files = words.filter((_, i) => !skipped.includes(i));
	const unread = files.filter(
		(w) =>
			(w === "" && named.dynamic) ||
			(named.opaque && w.includes("$") && pathOf(dir, w, f) === null),
	);
	if (!(piped || unread.length > 0)) {
		return undefined;
	}
	return piped || unread.includes("") ? envAsk(f) : envAsk(f, unread);
};
