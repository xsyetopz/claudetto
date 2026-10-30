// What the logic modules may do, as a closure object. The hooks file builds it from `$`, because the
// engine's loader follows `$` across a file boundary only into a function declaration, which the lint
// rules forbid. A test builds it from plain values.

import type { ModelCompleteRequest } from "claude-code";
import type { Counters } from "./cadence.ts";
import { countOf, KEYS, type Row, rowOf, sessionsOf, withRow } from "./rows.ts";

/** The effects the logic modules may use, passed in as an object so a test can supply plain values. */
export interface Ports {
	readonly read: (key: string) => Promise<unknown>;
	readonly write: (key: string, value: unknown) => Promise<void>;
	readonly surfaces: () => Promise<readonly string[]>;
	/** The text of the answer, or nothing when the request was not answered. */
	readonly ask: (request: ModelCompleteRequest) => Promise<string | undefined>;
	/** Asks the band to draw again. */
	readonly refresh: () => void;
	/** Runs `run` after `ms`, apart from the hook that asked. */
	readonly later: (ms: number, run: () => void) => void;
	/** Milliseconds since the epoch. It is not a call on `$`, which keeps the calls at the recorded eight. */
	readonly now: () => number;
}

/** Reads the row of session `id` from the store, or a blank row when the session has none. */
export const loadRow = async (p: Ports, id: string): Promise<Row> =>
	rowOf(sessionsOf(await p.read(KEYS.SESSIONS)), id);

/** Writes `row` into the stored sessions through `withRow`, which caps the list and evicts the cheapest rows first. */
export const saveRow = async (p: Ports, row: Row): Promise<void> => {
	const rows = sessionsOf(await p.read(KEYS.SESSIONS));
	await p.write(KEYS.SESSIONS, withRow(rows, row, p.now()));
};

/** Reads the counter stored under `key`, or 0 when the value is not a positive number. */
export const loadCount = async (p: Ports, key: string): Promise<number> =>
	countOf(await p.read(key));

/** Writes both back-off counters to their two store keys, one write each. */
export const saveCounters = async (
	p: Ports,
	counters: Counters,
): Promise<void> => {
	await p.write(KEYS.TYPED_PAST, counters.typedPastInARow);
	await p.write(KEYS.LOOKS_TO_SKIP, counters.looksToSkip);
};
