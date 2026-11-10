import type { EngineInterface } from "claude-code";

import {
	blankRow,
	remember,
	type Row,
	skipsAfter,
	type View,
	withRow,
} from "./note.ts";

export type Engine = EngineInterface;

const isView = (value: unknown): value is View =>
	typeof value === "object" &&
	value !== null &&
	"kind" in value &&
	(value.kind === "offer" ||
		value.kind === "asked" ||
		value.kind === "explained") &&
	"line" in value &&
	typeof value.line === "string" &&
	"explanation" in value &&
	typeof value.explanation === "string" &&
	"shownAt" in value &&
	typeof value.shownAt === "number";

const isRow = (value: unknown): value is Row =>
	typeof value === "object" &&
	value !== null &&
	"id" in value &&
	typeof value.id === "string" &&
	"view" in value &&
	(value.view === null || isView(value.view)) &&
	"tag" in value &&
	typeof value.tag === "string" &&
	"offeredTurn" in value &&
	typeof value.offeredTurn === "string" &&
	"askedTurn" in value &&
	typeof value.askedTurn === "string";

export const rowsOf = (value: unknown): readonly Row[] =>
	Array.isArray(value) ? value.filter((entry) => isRow(entry)) : [];

export const linesOf = (value: unknown): readonly string[] =>
	Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: [];

export const countOf = (value: unknown): number =>
	typeof value === "number" && Number.isFinite(value) && value > 0
		? Math.floor(value)
		: 0;

export const STORE = {
	sessions: "sessions",
	shown: "shown",
	known: "known",
	ignored: "ignored",
	skips: "skips",
} as const;

/** The stored row of session `id`, or a blank one. */
export async function loadRow($: Engine, id: string): Promise<Row> {
	const rows = rowsOf(await $.store.get(STORE.sessions));
	return rows.find((r) => r.id === id) ?? blankRow(id);
}

/** Stores `row` in place of the row of its session. */
export async function saveRow($: Engine, row: Row): Promise<void> {
	const rows = rowsOf(await $.store.get(STORE.sessions));
	await $.store.set(STORE.sessions, withRow(rows, row));
}

/** The stored lines under `key`. */
export async function loadLines(
	$: Engine,
	key: string,
): Promise<readonly string[]> {
	return linesOf(await $.store.get(key));
}

/** The stored count under `key`. */
export async function loadCount($: Engine, key: string): Promise<number> {
	return countOf(await $.store.get(key));
}

/** Stores the count of ignored notes and the checks left to skip. */
export async function saveBackoff(
	$: Engine,
	ignored: number,
	skips: number,
): Promise<void> {
	await $.store.set(STORE.ignored, ignored);
	await $.store.set(STORE.skips, skips);
}

/** Counts one more ignored note and sets the checks to skip after it. */
export async function countIgnored($: Engine): Promise<void> {
	const ignored = (await loadCount($, STORE.ignored)) + 1;
	await saveBackoff($, ignored, skipsAfter(ignored));
}

/** Stores `line` as known. */
export async function learn($: Engine, line: string): Promise<void> {
	await $.store.set(
		STORE.known,
		remember(await loadLines($, STORE.known), line),
	);
}
