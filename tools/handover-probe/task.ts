import { QUESTIONS } from "./recall.ts";

export interface Turn {
	readonly prompt: string;
	/** The prompt ends a task: arm A hands off and clears here. */
	readonly boundary: boolean;
}

/** Turns 1-10 state the decisions the recall questions ask about. */
const DECISIONS = [
	"Decision 1: the store is a SQLite file named ledger.db.",
	"Decision 2: the code is TypeScript and runs on Bun.",
	"Decision 3: money is kept as integer cents, never floats.",
	"Decision 4: every record id is a ULID.",
	"Decision 5: the HTTP layer is Hono, listening on port 4317.",
	"Decision 6: bearer tokens rotate every 12 hours.",
	"Decision 7: logs are pino, one JSON line per event.",
	"Decision 8: tests run with bun test, and coverage must stay above 85%.",
	"Decision 9: migrations are forward-only files, the first is 0001_init.sql.",
	"Decision 10: all timestamps are UTC in ISO 8601.",
];

const WORK = Array.from(
	{ length: 20 },
	(_, i) =>
		`Work step ${i + 1}: add the next endpoint and its test for the ledger service.`,
);

const BOUNDARY_AT = new Set([9, 19, 29]);

/** 30 task turns, then the 10 recall questions: 40 turns in all. */
export const TURNS: readonly Turn[] = [
	...DECISIONS,
	...WORK,
	...QUESTIONS.map((q) => q.ask),
].map((prompt, i) => ({ prompt, boundary: BOUNDARY_AT.has(i) }));

export const HANDOFF_ASK = "This ends the task: hand off.";

/** A real model obeys the ask, so only an arm that hands off on a boundary gets it: in any other arm a clear would reset the context its threshold waits for. */
export const promptOf = (turn: Turn, arm: { readonly handoffOnBoundary: boolean }): string =>
	turn.boundary && arm.handoffOnBoundary ? `${turn.prompt} ${HANDOFF_ASK}` : turn.prompt;
