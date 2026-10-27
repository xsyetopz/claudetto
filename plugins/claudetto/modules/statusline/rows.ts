// The rows of the main status line: the segments of a row, joined, the first `ALIGNED_ROWS` rows in shared columns, and each row fitted to the width.
import type { StatusSegment } from "../../kernel/hooks.ts";
import { ALIGNED_ROWS, ITEM_GAP, MAX_ROWS } from "./limits.ts";
import { truncate, width } from "./width.ts";

/** The text of each segment of a row by its place. A segment with no text has an `undefined` place. */
type Cells = (string | undefined)[];
interface Row {
	row: number;
	cells: Cells;
}

const GAP = width(ITEM_GAP);

const plain = (cells: Cells): string =>
	cells.filter((cell): cell is string => cell !== undefined).join(ITEM_GAP);

const rowsOf = (segments: readonly StatusSegment[], status: unknown): Row[] =>
	[...new Set(segments.map((segment) => segment.row))]
		.sort((a, b) => a - b)
		.map((row) => ({
			row,
			cells: segments
				.filter((segment) => segment.row === row)
				.map((segment) => segment.render(status) || undefined),
		}))
		.filter(({ cells }) => cells.some(Boolean))
		.slice(0, MAX_ROWS);

/** Each place at its column, with `ITEM_GAP` before every item after the first. An empty place keeps its column, and a place that is empty in all rows takes none. */
const joinRow = (cells: Cells, widths: readonly number[]): string => {
	let start = 0;
	const starts = widths.map((columns) => {
		const at = start;
		if (columns > 0) {
			start += columns + GAP;
		}
		return at;
	});
	let out = "";
	cells.forEach((cell, place) => {
		if (!cell) {
			return;
		}
		const first = out === "";
		out += " ".repeat((starts[place] ?? 0) - (first ? 0 : GAP) - width(out));
		out += (first ? "" : ITEM_GAP) + cell;
	});
	return out;
};

/** The first `ALIGNED_ROWS` rows in shared columns when each row fits `columns`, otherwise each row joined alone and cut at `columns`. */
const align = (rows: Row[], columns: number): string[] => {
	const shared = (row: number) => row < ALIGNED_ROWS;
	const widths: number[] = [];
	for (const { row, cells } of rows) {
		if (shared(row)) {
			cells.forEach((cell, place) => {
				widths[place] = Math.max(widths[place] ?? 0, cell ? width(cell) : 0);
			});
		}
	}
	const aligned = rows.map(({ row, cells }) =>
		shared(row) ? joinRow(cells, widths) : plain(cells),
	);
	if (aligned.every((text) => width(text) <= columns)) {
		return aligned;
	}
	return rows.map(({ cells }) => truncate(plain(cells), columns));
};

/** The rows of `segments` with the full times when each row fits `columns`, otherwise with the countdowns, cut at the right edge when a row still does not fit. */
export const renderRows = (
	segments: readonly StatusSegment[],
	statusOf: (compact: boolean) => unknown,
	columns: number,
): string[] => {
	const full = rowsOf(segments, statusOf(false));
	const fits = full.every(({ cells }) => width(plain(cells)) <= columns);
	return align(fits ? full : rowsOf(segments, statusOf(true)), columns);
};
