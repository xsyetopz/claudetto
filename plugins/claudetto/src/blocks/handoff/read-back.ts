import { BUILT_BY_CODE, HANDOFF_DIR } from "./handoff.ts";

const HANDOFF_NAME = /^handoff-\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d\.md$/;

/** The stamp is fixed-width UTC, so names sort by time and the last is the newest. */
export const newestHandoff = (names: readonly string[]): string | undefined =>
	names
		.filter((name) => HANDOFF_NAME.test(name))
		.sort()
		.at(-1);

export const sourceLine = (text: string): string =>
	text.includes(BUILT_BY_CODE)
		? "The handoff below was built by code from the transcript, so it holds no decisions and no reasons."
		: "The handoff below was written by Claude in the session that ended, so it holds its decisions.";

/** The path goes in so the session can read the whole file when the text was cut. */
export const readBackText = (name: string, text: string): string =>
	`${sourceLine(text)}
It is \`${HANDOFF_DIR}/${name}\`.

${text}`;

const DAY_MS = 86_400_000;

export const STALE_MS = 7 * DAY_MS;

/** One exactly `STALE_MS` old is still fresh. */
export const isStale = (ageMs: number): boolean => ageMs > STALE_MS;

/** 0 for a name the listing lacks, which reads as stale rather than fresh. */
export const mtimeOf = (
	entries: readonly { readonly name: string; readonly mtimeMs: number }[],
	name: string,
): number => entries.find((entry) => entry.name === name)?.mtimeMs ?? 0;

export const staleLine = (name: string, ageMs: number): string =>
	`The newest handoff is ${Math.floor(ageMs / DAY_MS)} days old, so none was injected. It is \`${HANDOFF_DIR}/${name}\`.`;
