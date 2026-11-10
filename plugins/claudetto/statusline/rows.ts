import type { Rec } from "./input.ts";
import { ITEM_GAP, MAX_ROWS } from "./limits.ts";
import type { Local } from "./local.ts";
import {
	branchText,
	cacheText,
	contextText,
	costText,
	type Ctx,
	folderText,
	hooksOffText,
	limitTexts,
	modelText,
	prText,
	specText,
} from "./segments.ts";
import { truncate, width } from "./width.ts";

/** The items in order: place, session, limits, cache. */
const itemsOf = (ctx: Ctx): string[] =>
	[
		hooksOffText(ctx),
		folderText(ctx),
		branchText(ctx),
		prText(ctx),
		specText(ctx),
		modelText(ctx),
		contextText(ctx),
		costText(ctx),
		...limitTexts(ctx),
		cacheText(ctx),
	].filter((item): item is string => Boolean(item));

/** The items joined by one gap, with a new row only when the next item does not fit `columns`; the last row takes the rest. */
const rowsOf = (ctx: Ctx, columns: number): string[] =>
	itemsOf(ctx).reduce<string[]>((rows, item) => {
		const last = rows.at(-1);
		if (last === undefined) {
			return [item];
		}
		const joined = `${last}${ITEM_GAP}${item}`;
		return width(joined) <= columns || rows.length === MAX_ROWS
			? [...rows.slice(0, -1), joined]
			: [...rows, item];
	}, []);

/** The rows with clock times when each fits `columns`, otherwise with countdowns, and each row still too wide is cut at `columns`. */
export const renderRows = (
	input: Rec,
	paint: Ctx["paint"],
	now: number,
	columns: number,
	local: Local,
): string[] => {
	const full = rowsOf({ input, local, paint, now, compact: false }, columns);
	const rows = full.every((row) => width(row) <= columns)
		? full
		: rowsOf({ input, local, paint, now, compact: true }, columns);
	return rows.map((row) => truncate(row, columns));
};
