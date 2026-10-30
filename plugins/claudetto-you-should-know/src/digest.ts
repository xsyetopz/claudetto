// The digest of recent work that a check reads. The plugin builds it, and it is bounded, so a
// check never carries the window of the session.
//
// Why the bound: a Haiku request of more than 100,000 prompt tokens is repriced on the whole request,
// and the tokens a cache read or a cache write moves count toward that length. The size of the step
// is disputed between authors, and the report is a self-report (`docs/dossier/mid.md:88`); the one
// log that measured it had 145 of 164 calls over the line (`docs/dossier/mid.md:89`). A check is a
// side request that comes every few steps, so a prompt that grows with the session would cross that
// line and cost far more than the few lines it answers with. `OWN.MAX_DIGEST_CHARS` keeps it small
// whatever the session holds.

import { OWN } from "./constants.ts";

/** What one entry may take, so that all the entries together stay within the whole bound. */
const ENTRY_CHARS = Math.floor(
	(OWN.MAX_DIGEST_CHARS - OWN.DIGEST_TURNS) / OWN.DIGEST_TURNS,
);

/** An entry of the log, cut to what one entry may take. */
export const entryOf = (who: string, text: string): string =>
	`${who}: ${text.trim()}`.slice(0, ENTRY_CHARS);

/** The log with one more entry, holding only the latest few. */
export const withEntry = (
	log: readonly string[],
	entry: string,
): readonly string[] => [...log, entry].slice(-OWN.DIGEST_TURNS);

/** The digest text of the log: the latest entries, one after another. */
export const digestOf = (log: readonly string[]): string =>
	log.slice(-OWN.DIGEST_TURNS).join("\n").slice(0, OWN.MAX_DIGEST_CHARS);
