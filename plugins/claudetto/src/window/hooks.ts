// The hooks of the window recorder, and the one place where it meets `$`. The rest is pure, so a test
// calls it with plain values (`window.ts`, `report.ts`).
//
// `session.measure` carries no field that says who spent the response. The engine does say it at the
// events around it, so the loops that are running are kept here: `turn.start` names a main or a
// subagent turn (`agentId`), and `session.compact` brackets a compaction (`design.md`, "Window
// Budget"). The hooks live in this one file with the list they read, and `register.ts` registers them
// by reference: the engine's loader follows `$` into another file only through a `function`
// declaration, which the lint rules forbid.

import type { EngineInterface, HookFor } from "claude-code";
import {
	type Active,
	keepRows,
	keepTurns,
	LAST_KEY,
	measureRow,
	ROWS_KEY,
	readingOf,
	rowsOf,
	TURNS_KEY,
	tagOf,
	turnRow,
	turnsOf,
	USD_KEY,
} from "./window.ts";

/** The loops running now, oldest first. It is the process's own: a restart has no loop running. */
const running: Active[] = [];

const stop = (id: string): void => {
	const at = running.findLastIndex((entry) => entry.id === id);
	if (at >= 0) {
		running.splice(at, 1);
	}
};

/** `turn.start`: a turn of a subagent has an `agentId`, the main loop's has none. */
export const onTurnStart: HookFor<"turn.start"> = (_$, e, next) => {
	running.push({
		id: e.turnId,
		source: e.agentId === undefined ? "main" : "subagent",
	});
	return next(e);
};

const recordTurn = async (
	$: EngineInterface,
	e: Parameters<HookFor<"turn.complete">>[1],
): Promise<void> => {
	const made = turnRow(e.turnId, e.usage, tagOf(running), await $.clock.now());
	if (made !== undefined) {
		const turns = turnsOf(await $.store.get(TURNS_KEY));
		await $.store.set(TURNS_KEY, keepTurns(turns, made));
	}
};

/**
 * `turn.complete`: the turn is over, an aborted one included. Its `usage` is what the turn really
 * cost, and it is kept before the loop is popped so the tag still names the turn. A failed write is
 * one line to the user and not an error.
 */
export const onTurnComplete: HookFor<"turn.complete"> = async ($, e, next) => {
	try {
		try {
			await recordTurn($, e);
		} catch (error) {
			$.ui.log(`Failed to record the window turn (${error})`);
		}
		return await next(e);
	} finally {
		stop(e.turnId);
	}
};

/** Gives each compaction its own id, so two at once leave the list one at a time. */
let compactions = 0;

/**
 * Whether a compaction has ended and the row that prices it has not been written yet. It is owed
 * rather than applied at once, because a measurement can give no row at all, at a window reset or on
 * a login with no five-hour window, and the fall in `tokens` is still owed to the row that follows.
 * Like `running` above it is the process's own, which is one session, so a restart owes no mark.
 */
let owedMark = false;

/**
 * Runs `work` as a compaction: the summarizer's request is a response of the session, and it is billed
 * as one. `compaction/hook.ts` answers `session.compact` and hands its work here, so the tag is kept while
 * a summary of ours is made as well as while the engine makes its own.
 */
export const asCompaction = async <T>(work: () => Promise<T>): Promise<T> => {
	compactions += 1;
	const id = `compact:${compactions}`;
	running.push({ id, source: "compaction" });
	try {
		return await work();
	} finally {
		stop(id);
		owedMark = true;
	}
};

const record = async (
	$: EngineInterface,
	input: Parameters<typeof measureRow>[0],
): Promise<void> => {
	if (input.cost !== undefined) {
		await $.store.set(USD_KEY, input.cost.usd);
	}
	const last = readingOf(await $.store.get(LAST_KEY));
	const tag = {
		...tagOf(running),
		...(owedMark ? { afterCompaction: true as const } : {}),
	};
	const made = measureRow(input, last, tag, await $.clock.now());
	if (made.reading !== undefined) {
		await $.store.set(LAST_KEY, made.reading);
	}
	if (made.row !== undefined) {
		const rows = rowsOf(await $.store.get(ROWS_KEY));
		await $.store.set(ROWS_KEY, keepRows(rows, made.row));
		owedMark = false;
	}
};

/**
 * `session.measure`: keeps the row of the measurement. It observes and answers with `next`, and a
 * failed write is one line to the user rather than an error, because the session is not the
 * recorder's to stop.
 */
export const onMeasure: HookFor<"session.measure"> = async ($, e, next) => {
	try {
		await record($, e);
	} catch (error) {
		$.ui.log(`Failed to record the window row (${error})`);
	}
	return next(e);
};
