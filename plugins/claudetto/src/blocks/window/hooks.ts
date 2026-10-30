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

let compactions = 0;

/** Owed, not applied at once: a measurement can give no row, and the fall in `tokens` belongs to the next row. */
let owedMark = false;

/** The summarizer's request is a response of the session and is billed as one, ours or the engine's. */
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

export const onMeasure: HookFor<"session.measure"> = async ($, e, next) => {
	try {
		await record($, e);
	} catch (error) {
		$.ui.log(`Failed to record the window row (${error})`);
	}
	return next(e);
};
