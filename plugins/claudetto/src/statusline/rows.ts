import type { Rec } from "./input.ts";
import { ITEM_GAP, MAX_ROWS } from "./limits.ts";
import {
	branchText,
	type Ctx,
	cacheText,
	contextText,
	costText,
	folderText,
	limitTexts,
	modelText,
	prText,
	type Text,
} from "./segments.ts";
import { truncate, width } from "./width.ts";

const join = (items: readonly Text[]): string =>
	items.filter(Boolean).join(ITEM_GAP);

/** The rows in order: place, session, limits, cache. Each row is its items joined by one gap, with no shared column, so an item never waits for a wider item of another row. Empty rows are dropped. */
const rowsOf = (ctx: Ctx): string[] =>
	[
		[folderText(ctx), branchText(ctx), prText(ctx)],
		[modelText(ctx), contextText(ctx), costText(ctx)],
		limitTexts(ctx),
		[cacheText(ctx)],
	]
		.map(join)
		.filter(Boolean)
		.slice(0, MAX_ROWS);

/** The rows with clock times when each fits `columns`, otherwise with countdowns, and each row still too wide is cut at `columns`. */
export const renderRows = (
	input: Rec,
	paint: Ctx["paint"],
	now: number,
	columns: number,
): string[] => {
	const full = rowsOf({ input, paint, now, compact: false });
	const rows = full.every((row) => width(row) <= columns)
		? full
		: rowsOf({ input, paint, now, compact: true });
	return rows.map((row) => truncate(row, columns));
};
