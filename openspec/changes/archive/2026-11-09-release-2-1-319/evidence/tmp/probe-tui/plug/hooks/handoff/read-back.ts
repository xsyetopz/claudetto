import { HANDOFF_NAME } from "./layout.ts";

/** The stamp is fixed-width UTC, so names sort by time and the last is the newest. */
export const newestHandoff = (names: readonly string[]): string | undefined =>
	names
		.filter((name) => HANDOFF_NAME.test(name))
		.sort()
		.at(-1);

/** Keyed by project root: the store is one file for the whole login. */
export const readBackKey = (root: string): string => `handoff.readback:${root}`;

export const DAY_MS = 86_400_000;

/** One exactly seven days old is still fresh. */
export const isStale = (ageMs: number): boolean => ageMs > 7 * DAY_MS;
