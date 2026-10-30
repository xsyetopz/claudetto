// Bounded because a Haiku request over 100,000 prompt tokens is repriced on the whole request.

import { OWN } from "./constants.ts";

const ENTRY_CHARS = Math.floor(
	(OWN.MAX_DIGEST_CHARS - OWN.DIGEST_TURNS) / OWN.DIGEST_TURNS,
);

export const entryOf = (who: string, text: string): string =>
	`${who}: ${text.trim()}`.slice(0, ENTRY_CHARS);

export const withEntry = (
	log: readonly string[],
	entry: string,
): readonly string[] => [...log, entry].slice(-OWN.DIGEST_TURNS);

export const digestOf = (log: readonly string[]): string =>
	log.slice(-OWN.DIGEST_TURNS).join("\n").slice(0, OWN.MAX_DIGEST_CHARS);
