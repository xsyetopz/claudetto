import type { EngineInterface, HookFor } from "claude-code";
import { readTier } from "../../tiers/read.ts";
import { offRowLine } from "../model-row/off-row.ts";
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

const seenRef = { plugin: "claudetto", key: "offRow" } as const;

/** A response from a model the row does not name is shown to the user once per session and model. */
const noteOffRow = async (
	$: EngineInterface,
	model: string | undefined,
): Promise<void> => {
	try {
		const home = await $.env.get("HOME");
		if (model === undefined || home === undefined) {
			return;
		}
		const login: unknown = JSON.parse(await $.fs.read(`${home}/.claude.json`));
		const { row } = readTier(login);
		const line = row === undefined ? undefined : offRowLine(model, row);
		const { value } = await $.state.get(seenRef);
		const seen = Array.isArray(value) ? value : [];
		if (line !== undefined && !seen.includes(model)) {
			await $.state.set(seenRef, [...seen, model]);
			$.ui.log(line);
		}
	} catch {
		// A login file that cannot be read leaves the line out and nothing else.
	}
};

export const onTurnComplete: HookFor<"turn.complete"> = async ($, e, next) => {
	try {
		try {
			await recordTurn($, e);
		} catch (error) {
			$.ui.log(`Failed to record the window turn (${error})`);
		}
		await noteOffRow($, e.usage?.model);
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

const TTL_VALUES: readonly string[] = ["5m", "1h"];

/** The TTL the engine picks: `FORCE_PROMPT_CACHING_5M`, then `CLAUDE_CODE_PROMPT_CACHE_TTL`, then `promptCacheTtl`. */
const ttlOf = async ($: EngineInterface): Promise<string> => {
	if (((await $.env.get("FORCE_PROMPT_CACHING_5M")) ?? "") !== "") {
		return "5m";
	}
	const env = await $.env.get("CLAUDE_CODE_PROMPT_CACHE_TTL");
	if (env !== undefined && TTL_VALUES.includes(env)) {
		return env;
	}
	const setting: unknown = await $.settings.read({ key: "promptCacheTtl" });
	return typeof setting === "string" && TTL_VALUES.includes(setting)
		? setting
		: "auto";
};

const record = async (
	$: EngineInterface,
	input: Parameters<typeof measureRow>[0],
): Promise<void> => {
	const last = readingOf(await $.store.get(LAST_KEY));
	const tag = {
		...tagOf(running),
		ttl: await ttlOf($),
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
