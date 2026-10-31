import type { Facts } from "../gate.ts";
import { ENV_FILE, pathOf } from "../paths.ts";
import * as T from "../prompts.ts";
import { nameOf, wordSet } from "../shell/shellkinds.ts";
import { baseName } from "../shell/wrappers.ts";
import { type Finding, verdict } from "./finding.ts";
import { NO_READ, PATTERNED, patternAt } from "./secret.ts";

export const PIPED = wordSet("xargs parallel");
const INPUT =
	/(?<!<)<(?![<(&])>?\s*((?:\$\([^)]*\)?|`[^`]*`?|'[^']*'|"[^"]*"|[^\s;&|<>()'"])*)/g;
const UNREADABLE_TARGET = /[$`*?[]/;
const QUOTE_CHARS = /['"]/g;
const EXPANSION =
	/\$(?:\{[^}]*\}|\([^)]*\)|[A-Za-z_]\w*|[0-9@*#?$!-])|`[^`]*`/g;
const OPEN_TAIL = /[$`(){}*?[\\]/;
const GLOB_CHAR = /[*?[]/;
const NOT_ENV_CHAR = /[^\w.$`-]/;

/**
 * The parser has removed quotes and expanded braces, so each character after the last expansion is literal.
 * One that an env file name never holds, after the last `/`, keeps the name off every env file; a glob could eat it.
 */
const literalTailBars = (word: string): boolean => {
	const last = [...word.matchAll(EXPANSION)].at(-1);
	if (last === undefined) {
		return false;
	}
	const tail = word.slice(last.index + last[0].length);
	return (
		!GLOB_CHAR.test(tail) &&
		NOT_ENV_CHAR.test(tail.slice(tail.lastIndexOf("/") + 1))
	);
};

const safeWord = (word: string, names: readonly string[]): boolean => {
	if (literalTailBars(word)) {
		return true;
	}
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

export const readsUnnamed = (text: string): boolean =>
	[...text.matchAll(INPUT)].some((m) => {
		const target = m[1] ?? "";
		return (
			UNREADABLE_TARGET.test(target) || target.replace(QUOTE_CHARS, "") === ""
		);
	});

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
	const skipped = PATTERNED.has(nameOf(rest))
		? patternAt(words, nameOf(rest))
		: [];
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
