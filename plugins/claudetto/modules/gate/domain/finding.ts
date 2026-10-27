// The shared parts of a finding of the gate: its type, the verdict makers, and the checks of a path or a word.

import * as T from "../prompts.ts";
import type { Facts, Verdict } from "./gate.ts";
import { globsSecret, isSystem, namesSecret } from "./paths.ts";

/** A verdict, or a check that runs `git` or reads the ledger, and gives an `ask` or `undefined`. */
export type Finding = Verdict | (() => Promise<Verdict | undefined>);

export const verdict = (
	decision: Verdict["decision"],
	reason: string,
	flags: { secret?: true } = {},
): Verdict => ({ decision, reason, ...flags });
export const denySecret = (word: string): Verdict =>
	verdict("deny", T.DENY_SECRET({ word }), { secret: true });

export const systemWrite = (path: string | null): Verdict | undefined =>
	path !== null && isSystem(path)
		? verdict("deny", T.DENY_SYSTEM_WRITE({ path }))
		: undefined;

export const textOf = (input: Record<string, unknown>, key: string): string => {
	const value = input[key];
	return typeof value === "string" ? value : "";
};

export const atRoot = (path: string | null, f: Facts): boolean =>
	path === "/" || path === f.home;

/** True when `word` names a secret file, or is a glob that can match one. */
export const secretWord = (dir: string, word: string, f: Facts): boolean =>
	namesSecret(dir, word, f) || globsSecret(dir, word, f);
