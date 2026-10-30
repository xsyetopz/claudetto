// What is said of the rows: points per task, the weight of an input token, and a saving in points.
// Each figure is printed only as far as its rows reach, and "not measured" stands where they do not
// (`design.md`, "Window Budget"). Pure, so a test calls it with plain rows.

import { inputOf, type TurnRow, type WindowRow } from "./window.ts";

/** What is printed where a figure has no rows behind it. */
export const NOT_MEASURED = "not measured";

/** The unit of the weight: a thousand input tokens, so the figure is not a string of zeros. */
const PER_TOKENS = 1000;

/** The weight prints with three decimals: the window moves in tenths of a point. */
const DECIMALS = 3;

/** Which row field a figure is summed from: `points` is the five-hour window, `sevenPoints` the seven-day one. */
export type Field = "points" | "sevenPoints";

/**
 * Both windows of a figure, each named. A window with no figure behind it says it is not measured
 * rather than printing a zero, so a reader cannot take one window's figure for the other's.
 */
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

/** The window points of one task summed over its rows, each window apart; `tooFew` is true for a single row, which is one reading and not a sum over turns. */
export interface TaskFigure {
	readonly task: string;
	readonly rows: number;
	/** Five-hour points, or none when no row of the task has a five-hour delta. */
	readonly points?: number;
	/** Seven-day points, or none when no row of the task has a seven-day delta. */
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

/** The points of each task, summed over its rows, in the order the tasks first appear. */
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

/** One line of a task's figure, naming both windows; a figure from a single row says so. */
export const taskLine = (figure: TaskFigure): string => {
	const windows = windowsText(
		figure.points?.toString(),
		figure.sevenPoints?.toString(),
	);
	const base = `${figure.task === "" ? "(no turn)" : figure.task}: ${windows} over ${figure.rows} rows`;
	return figure.tooFew ? `${base} (too few rows)` : base;
};

/** The turns a weight can rest on: the ones that reported tokens. */
export const countedTurns = (turns: readonly TurnRow[]): TurnRow[] =>
	turns.filter((turn) => inputOf(turn) > 0);

/**
 * Points per `PER_TOKENS` input tokens: the points of the measure rows over the input tokens that the
 * turns really cost. The context fill of a measure row is a whole prompt, counted again at every
 * turn, so it is not the denominator. `field` picks the window, five-hour by default.
 *
 * None where there is nothing to divide, which is no measure row with that window's delta or no turn
 * that reported tokens. There is no minimum beyond that: a figure either has rows behind it or it
 * does not, and how many it has is printed beside it, so a reader weighs it instead of a threshold
 * deciding for them.
 */
export const weightOf = (
	rows: readonly WindowRow[],
	turns: readonly TurnRow[],
	field: Field = "points",
): number | undefined => {
	const counted = countedTurns(turns);
	const points = sumOf(rows, field);
	if (counted.length === 0 || points === undefined) {
		return undefined;
	}
	let tokens = 0;
	for (const turn of counted) {
		tokens += inputOf(turn);
	}
	return (points / tokens) * PER_TOKENS;
};

/** The line for the weight of an input token in each window, with the turns it rests on. */
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

/**
 * A saving of `tokens` input tokens as points of each window. With no rows of this login to price
 * it, the line says so and names no share of any plan limit: another login's limit is not this one's.
 */
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

const SHARE_OF_LIMIT =
	/\d+(?:\.\d+)?\s*%\s+of\s+(?:your\s+|the\s+)?(?:[\w-]+\s+){0,2}(?:limit|window|quota)/gi;

/**
 * The claims in a text that put a share on a plan limit, such as `12% of your weekly limit`. A text
 * that reports what was written, such as the setup report, has none: no row of this login backs one.
 */
export const shareClaims = (text: string): string[] =>
	[...text.matchAll(SHARE_OF_LIMIT)].map((match) => match[0]);
