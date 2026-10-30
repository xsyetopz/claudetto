// The shared parts of a finding of the gate: its type, the verdict makers, and the checks of a path or a word.

import type { Facts, Verdict } from "../gate.ts";
import { globsSecret, isSystem, namesSecret } from "../paths.ts";
import * as T from "../prompts.ts";

/** A verdict, or a check that runs `git` or reads the ledger, and gives an `ask` or `undefined`. */
export type Finding = Verdict | (() => Promise<Verdict | undefined>);

/** A `Verdict` of `decision` and `reason`; `flags` adds `secret: true` and is empty by default. */
export const verdict = (
	decision: Verdict["decision"],
	reason: string,
	flags: { secret?: true } = {},
): Verdict => ({ decision, reason, ...flags });
/** A deny, flagged `secret`, whose reason is `DENY_SECRET` for the word that names the secret. */
export const denySecret = (word: string): Verdict =>
	verdict("deny", T.DENY_SECRET({ word }), { secret: true });

/** A deny when `path` is a system path, or `undefined` for a null path or any other path. */
export const systemWrite = (path: string | null): Verdict | undefined =>
	path !== null && isSystem(path)
		? verdict("deny", T.DENY_SYSTEM_WRITE({ path }))
		: undefined;

/** The string at `key` of a tool input, or an empty string when the value is absent or not a string. */
export const textOf = (input: Record<string, unknown>, key: string): string => {
	const value = input[key];
	return typeof value === "string" ? value : "";
};

/** True when `path` is `/` or the home folder of the facts; a null path is false. */
export const atRoot = (path: string | null, f: Facts): boolean =>
	path === "/" || path === f.home;

/** True when `word` names a secret file, or is a glob that can match one. */
export const secretWord = (dir: string, word: string, f: Facts): boolean =>
	namesSecret(dir, word, f) || globsSecret(dir, word, f);
