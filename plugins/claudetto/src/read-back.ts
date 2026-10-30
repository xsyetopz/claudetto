// The reader's side of the handoff: which file of the folder is the newest, which of the two wrote
// it, and the text that goes in front of the next session. Everything here is pure, so the `$` calls
// that use it stay in `register.ts`.

import { BUILT_BY_CODE, HANDOFF_DIR } from "./handoff.ts";

/** A handoff file's name, as `handoffPath` writes it, so another file of the folder is left alone. */
const HANDOFF_NAME = /^handoff-\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d\.md$/;

/**
 * The newest handoff of a folder listing, or `undefined` when the folder holds none. The stamp is
 * fixed-width UTC, so the names sort by time and the last one is the newest.
 */
export const newestHandoff = (names: readonly string[]): string | undefined =>
	names
		.filter((name) => HANDOFF_NAME.test(name))
		.sort()
		.at(-1);

/** Which of the two wrote the handoff being read back, as the line that goes above its text. */
export const sourceLine = (text: string): string =>
	text.includes(BUILT_BY_CODE)
		? "The handoff below was built by code from the transcript, so it holds no decisions and no reasons."
		: "The handoff below was written by Claude in the session that ended, so it holds its decisions.";

/**
 * What the next session reads: which of the two wrote the file, where the file is, and then its
 * text. The path goes in so that the session can read the whole file when the text was cut.
 */
export const readBackText = (name: string, text: string): string =>
	`${sourceLine(text)}
It is \`${HANDOFF_DIR}/${name}\`.

${text}`;

const DAY_MS = 86_400_000;

/**
 * How old a handoff may be and still go into a session. The 7 days are borrowed from
 * `m4cd4r4/clear-resume` (MIT), and only our own evidence moves them.
 */
export const STALE_MS = 7 * DAY_MS;

/** True when a handoff is older than `STALE_MS`; one exactly that old is still fresh. */
export const isStale = (ageMs: number): boolean => ageMs > STALE_MS;

/**
 * When the file was last written, as the listing reports it, or 0 for a name the listing has not,
 * which reads as stale rather than as fresh.
 */
export const mtimeOf = (
	entries: readonly { readonly name: string; readonly mtimeMs: number }[],
	name: string,
): number => entries.find((entry) => entry.name === name)?.mtimeMs ?? 0;

/** What a stale handoff gets in place of an injection: where it is and how old it is. */
export const staleLine = (name: string, ageMs: number): string =>
	`The newest handoff is ${Math.floor(ageMs / DAY_MS)} days old, so none was injected. It is \`${HANDOFF_DIR}/${name}\`.`;
