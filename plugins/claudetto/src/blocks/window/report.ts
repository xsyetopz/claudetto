import { WEIGHT_MIN_ROWS } from "./limits.ts";
import { inputOf, type TurnRow, type WindowRow } from "./window.ts";

export const NOT_MEASURED = "not measured";

/** The unit of the weight: a thousand input tokens, so the figure is not a string of zeros. */
const PER_TOKENS = 1000;

/** The weight prints with three decimals: the window moves in tenths of a point. */
const DECIMALS = 3;

export type Field = "points" | "sevenPoints";

export const windowsText = (
	five: string | undefined,
	seven: string | undefined,
): string =>
	[
		five === undefined
			? `five-hour window: ${NOT_MEASURED}`
			: `${five} points of the five-hour window`,
		seven === undefined
			? `seven-day window: ${NOT_MEASURED}`
			: `${seven} points of the seven-day window`,
	].join(", ");

export interface TaskFigure {
	readonly task: string;
	readonly rows: number;
	readonly points?: number;
	readonly sevenPoints?: number;
	readonly tooFew: boolean;
}

const sumOf = (
	rows: readonly WindowRow[],
	field: Field,
): number | undefined => {
	let sum: number | undefined;
	for (const row of rows) {
		const value = row[field];
		if (value !== undefined) {
			sum = (sum ?? 0) + value;
		}
	}
	return sum === undefined ? undefined : Math.round(sum * 10) / 10;
};

export const perTask = (rows: readonly WindowRow[]): TaskFigure[] => {
	const byTask = new Map<string, WindowRow[]>();
	for (const row of rows) {
		byTask.set(row.task, [...(byTask.get(row.task) ?? []), row]);
	}
	return [...byTask].map(([task, own]) => {
		const points = sumOf(own, "points");
		const sevenPoints = sumOf(own, "sevenPoints");
		return {
			task,
			rows: own.length,
			...(points === undefined ? {} : { points }),
			...(sevenPoints === undefined ? {} : { sevenPoints }),
			// One row is a single reading of the window, not a sum over the turns of a task.
			tooFew: own.length === 1,
		};
	});
};

export const taskLine = (figure: TaskFigure): string => {
	const windows = windowsText(
		figure.points?.toString(),
		figure.sevenPoints?.toString(),
	);
	const base = `${figure.task === "" ? "(no turn)" : figure.task}: ${windows} over ${figure.rows} rows`;
	return figure.tooFew ? `${base} (too few rows)` : base;
};

export const countedTurns = (turns: readonly TurnRow[]): TurnRow[] =>
	turns.filter((turn) => inputOf(turn) > 0);

export const weightOf = (
	rows: readonly WindowRow[],
	turns: readonly TurnRow[],
	field: Field = "points",
): number | undefined => {
	const counted = countedTurns(turns);
	const measured = rows.filter((row) => row[field] !== undefined);
	const points = sumOf(rows, field);
	if (
		counted.length < WEIGHT_MIN_ROWS ||
		measured.length < WEIGHT_MIN_ROWS ||
		points === undefined
	) {
		return undefined;
	}
	let tokens = 0;
	for (const turn of counted) {
		tokens += inputOf(turn);
	}
	return (points / tokens) * PER_TOKENS;
};

export const weightLine = (
	rows: readonly WindowRow[],
	turns: readonly TurnRow[],
): string => {
	const five = weightOf(rows, turns);
	const seven = weightOf(rows, turns, "sevenPoints");
	if (five === undefined && seven === undefined) {
		return `Weight per 1,000 input tokens: ${NOT_MEASURED}`;
	}
	const count = countedTurns(turns).length;
	const windows = windowsText(
		five?.toFixed(DECIMALS),
		seven?.toFixed(DECIMALS),
	);
	return `Weight per 1,000 input tokens: ${windows} over ${count} ${count === 1 ? "turn" : "turns"}`;
};

export const savingLine = (
	rows: readonly WindowRow[],
	turns: readonly TurnRow[],
	tokens: number,
): string => {
	const worth = (weight: number | undefined): string | undefined =>
		weight === undefined
			? undefined
			: ((tokens / PER_TOKENS) * weight).toFixed(1);
	const five = worth(weightOf(rows, turns));
	const seven = worth(weightOf(rows, turns, "sevenPoints"));
	return five === undefined && seven === undefined
		? `Saving: ${NOT_MEASURED}`
		: `Saving: ${windowsText(five, seven)}`;
};

export const reportText = (
	rows: readonly WindowRow[],
	turns: readonly TurnRow[],
): string =>
	[
		...(rows.length === 0
			? [`Points per task: ${NOT_MEASURED}`]
			: perTask(rows).map(taskLine)),
		weightLine(rows, turns),
	].join("\n");

const SHARE_OF_LIMIT =
	/\d+(?:\.\d+)?\s*%\s+of\s+(?:your\s+|the\s+)?(?:[\w-]+\s+){0,2}(?:limit|window|quota)/gi;

export const shareClaims = (text: string): string[] =>
	[...text.matchAll(SHARE_OF_LIMIT)].map((match) => match[0]);
