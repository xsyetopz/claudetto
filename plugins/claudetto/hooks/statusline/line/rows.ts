import type { Ctx, Text } from "./ctx";
import { limitTexts } from "./limits";
import {
	branchText,
	cacheText,
	contextText,
	costText,
	linesText,
	modelText,
	nameText,
	projectText,
	prText
} from "./segments";
import { truncate, width } from "./width";
import { tasksText, toolsText } from "./work";

/** The gap between two items of a row, as Claude Code separates its own: a space, a middle dot, a space. */
const SEP = " · ";

/** A row of the items that have a figure; no row when none has. */
const row = (items: readonly Text[]): string[] => {
	const shown = items.filter(Boolean).join(SEP);
	return shown === "" ? [] : [shown];
};

/**
 * Three rows at most: who and where (model, folder, branch, pull request, session, lines), the
 * budgets (context, cache, plan limits), and the work that waits (tool calls, tasks, a prompt for
 * the person). Claude Code draws the turn's phase and the running call itself, so no row repeats them.
 */
const rowsOf = (ctx: Ctx, split = false): string[] => [
	...row([
		modelText(ctx),
		projectText(ctx),
		branchText(ctx),
		prText(ctx),
		nameText(ctx),
		linesText(ctx),
		costText(ctx)
	]),
	...(split
		? [...row([contextText(ctx), cacheText(ctx)]), ...row(limitTexts(ctx))]
		: row([contextText(ctx), cacheText(ctx), ...limitTexts(ctx)])),
	...row([toolsText(ctx), tasksText(ctx)])
];

const fits = (rows: readonly string[], columns: number): boolean =>
	rows.every((line) => width(line) <= columns);

/**
 * The rows that fit `columns`: clock times first, countdowns when any row is
 * too wide, then the plan limits on a row of their own, and a row still too wide cut with an ellipsis.
 */
export const renderRows = (
	ctx: Omit<Ctx, "compact">,
	columns: number
): string[] => {
	const full = rowsOf({ ...ctx, compact: false });
	if (fits(full, columns)) {
		return full;
	}
	const compact = rowsOf({ ...ctx, compact: true });
	const rows = fits(compact, columns)
		? compact
		: rowsOf({ ...ctx, compact: true }, true);
	return rows.map((line) => truncate(line, columns));
};
