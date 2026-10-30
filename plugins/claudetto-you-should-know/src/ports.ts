// A closure object because the loader follows `$` across files only into a function declaration.

import type { ModelCompleteRequest, PromptFilled } from "claude-code";
import type { Counters } from "./cadence.ts";
import { countOf, KEYS, type Row, rowOf, sessionsOf, withRow } from "./rows.ts";

export interface Ports {
	readonly read: (key: string) => Promise<unknown>;
	readonly write: (key: string, value: unknown) => Promise<void>;
	readonly surfaces: () => Promise<readonly string[]>;
	readonly ask: (request: ModelCompleteRequest) => Promise<string | undefined>;
	readonly refresh: () => void;
	readonly later: (ms: number, run: () => void) => void;
	/** The process clock, not a call on `$`. */
	readonly now: () => number;
	readonly box: () => Promise<string>;
	readonly fill: (text: string) => Promise<PromptFilled>;
	readonly submit: (text: string) => Promise<void>;
	readonly toast: (text: string) => void;
}

export const loadRow = async (p: Ports, id: string): Promise<Row> =>
	rowOf(sessionsOf(await p.read(KEYS.SESSIONS)), id);

export const saveRow = async (p: Ports, row: Row): Promise<void> => {
	const rows = sessionsOf(await p.read(KEYS.SESSIONS));
	await p.write(KEYS.SESSIONS, withRow(rows, row, p.now()));
};

export const loadCount = async (p: Ports, key: string): Promise<number> =>
	countOf(await p.read(key));

export const saveCounters = async (
	p: Ports,
	counters: Counters,
): Promise<void> => {
	await p.write(KEYS.TYPED_PAST, counters.typedPastInARow);
	await p.write(KEYS.LOOKS_TO_SKIP, counters.looksToSkip);
};
