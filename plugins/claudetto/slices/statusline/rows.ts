// The rows of the main status line: the segments of a row, aligned in columns, joined, and fitted to the width.
import type { StatusSegment } from "../../kernel/slice.ts";
import { ITEM_GAP, MAX_ROWS } from "./limits.ts";
import { truncate, width } from "./width.ts";

/** The text of each segment of a row by its place. A segment with no text has a `null` place. */
type Cells = (string | null)[];

const GAP = width(ITEM_GAP);

const itemsOf = (cells: Cells): string[] =>
  cells.filter((cell): cell is string => cell !== null);

const rowsOf = (segments: readonly StatusSegment[], status: unknown): Cells[] =>
  [...new Set(segments.map((segment) => segment.row))]
    .sort((a, b) => a - b)
    .map((row) =>
      segments
        .filter((segment) => segment.row === row)
        .map((segment) => segment.render(status) || null),
    )
    .filter((cells) => cells.some(Boolean))
    .slice(0, MAX_ROWS);

/** Each place at its column, with `ITEM_GAP` before every item after the first. An empty place keeps its column, and a place that is empty in all rows takes none. */
const joinRow = (cells: Cells, widths: readonly number[]): string => {
  let start = 0;
  const starts = widths.map((columns) => {
    const at = start;
    if (columns > 0) start += columns + GAP;
    return at;
  });
  let out = "";
  cells.forEach((cell, place) => {
    if (!cell) return;
    const first = out === "";
    out += " ".repeat((starts[place] ?? 0) - (first ? 0 : GAP) - width(out));
    out += (first ? "" : ITEM_GAP) + cell;
  });
  return out;
};

/** The aligned rows when each fits `columns`, otherwise each row joined and fitted alone, with the items at the right dropped first. */
const align = (rows: Cells[], columns: number): string[] => {
  const widths: number[] = [];
  for (const cells of rows)
    cells.forEach((cell, place) => {
      widths[place] = Math.max(widths[place] ?? 0, cell ? width(cell) : 0);
    });
  const aligned = rows.map((cells) => joinRow(cells, widths));
  if (aligned.every((text) => width(text) <= columns)) return aligned;
  return rows.map((cells) => {
    const texts = itemsOf(cells);
    while (texts.length > 1 && width(texts.join(ITEM_GAP)) > columns)
      texts.pop();
    return truncate(texts.join(ITEM_GAP), columns);
  });
};

/**
 * The plans are tried in order: `segments`, then `fallback`, each with the full times and then the countdowns.
 * The first plan that keeps every item at `columns` wins, and when none does, the last plan is used.
 */
export const renderRows = (
  segments: readonly StatusSegment[],
  fallback: readonly StatusSegment[],
  statusOf: (compact: boolean) => unknown,
  columns: number,
): string[] => {
  let rows: Cells[] = [];
  for (const layout of [segments, fallback])
    for (const compact of [false, true]) {
      rows = rowsOf(layout, statusOf(compact));
      if (
        rows.every((cells) => width(itemsOf(cells).join(ITEM_GAP)) <= columns)
      )
        return align(rows, columns);
    }
  return align(rows, columns);
};
