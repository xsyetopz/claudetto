import type { Ctx, Text } from "./ctx";
import { limitTexts } from "./limits";
import { machineTexts } from "./machine";
import {
	branchText,
	cacheText,
	contextText,
	costText,
	durationText,
	linesText,
	modelText,
	nameText,
	phaseText,
	projectText,
	prText
} from "./segments";
import { truncate, width } from "./width";
import { activityTexts, tasksText, waitingText } from "./work";

/** The gap between two items of a row, as Claude Code separates its own: a space, a middle dot, a space. */
const SEP = " · ";

/** A row of the items that have a figure; no row when none has. */
const row = (items: readonly Text[]): string[] => {
	const shown = items.filter(Boolean).join(SEP);
	return shown === "" ? [] : [shown];
};

/**
 * Every row, the broadest first: the turn and the model, where the work
 * happens, the plan limits, the activity, the tasks, the machine, what waits
 * on the person, and one row per subagent.
 */
const rowsOf = (ctx: Ctx): string[] => [
	...row([phaseText(ctx), modelText(ctx), contextText(ctx), cacheText(ctx)]),
	...row([
		projectText(ctx),
		branchText(ctx),
		prText(ctx),
		nameText(ctx),
		durationText(ctx),
		linesText(ctx),
		costText(ctx)
	]),
	...row(limitTexts(ctx)),
	...row(activityTexts(ctx)),
	...row([tasksText(ctx)]),
	...row(machineTexts(ctx)),
	...row([waitingText(ctx)])
];

/**
 * The rows that fit `columns`: clock times first, countdowns when any row is
 * too wide, and a row still too wide cut with an ellipsis.
 */
export const renderRows = (
	ctx: Omit<Ctx, "compact">,
	columns: number
): string[] => {
	const full = rowsOf({ ...ctx, compact: false });
	const rows = full.every((line) => width(line) <= columns)
		? full
		: rowsOf({ ...ctx, compact: true });
	return rows.map((line) => truncate(line, columns));
};
