// The rows of the main status line: the segments of a row, aligned in columns, joined, and fitted to the width.
// A segment keeps its place in its row, so the places of the rows line up. A row that does not fit is joined without the alignment.

import type { StatusSegment } from "../../../../../kernel/slice.ts";
import { ITEM_GAP, MAX_ROWS } from "../limits.ts";
import { truncate, width } from "../width.ts";

/** The text of each segment of one row, by its place in the row. A segment that renders null or nothing has a null place. */
const cellsOf = (
  segments: readonly StatusSegment[],
  row: number,
  status: unknown,
): (string | null)[] =>
  segments
    .filter((segment) => segment.row === row)
    .map((segment) => segment.render(status) || null);

/** The width of each place, over all rows, so that the places of the rows line up. */
const columnsOf = (rows: readonly (readonly (string | null)[])[]): number[] => {
  const widths: number[] = [];
  for (const cells of rows)
    cells.forEach((cell, place) => {
      widths[place] = Math.max(widths[place] ?? 0, cell ? width(cell) : 0);
    });
  return widths;
};

/** The texts of a row joined by `ITEM_GAP`, each text but the last padded to the width of its place. */
const joinRow = (
  cells: readonly (string | null)[],
  widths: readonly number[],
): string => {
  const shown = cells.flatMap((cell, place) =>
    cell ? [{ text: cell, place }] : [],
  );
  return shown
    .map(({ text, place }, index) => {
      if (index === shown.length - 1) return text;
      return text + " ".repeat((widths[place] ?? 0) - width(text));
    })
    .join(ITEM_GAP);
};

/**
 * One text for a row.
 * When the row is wider than `columns`, the segments at the right drop first, and the first segment is cut when it is still too wide.
 */
export const fitRow = (texts: readonly string[], columns: number): string => {
  const kept = [...texts];
  while (kept.length > 1 && width(kept.join(ITEM_GAP)) > columns) kept.pop();
  return truncate(kept.join(ITEM_GAP), columns);
};

/**
 * The rows of the status line for `status`: the rows in the order of their number, at most `MAX_ROWS`, each fitted to `columns`.
 * The places of the rows line up when the aligned row fits `columns`, and the row is joined without the alignment when it does not.
 * A row with no text is out.
 */
export const renderRows = (
  segments: readonly StatusSegment[],
  status: unknown,
  columns: number,
): string[] => {
  const rows = [...new Set(segments.map((segment) => segment.row))]
    .sort((a, b) => a - b)
    .map((row) => cellsOf(segments, row, status))
    .filter((cells) => cells.some(Boolean))
    .slice(0, MAX_ROWS);
  const widths = columnsOf(rows);
  return rows.map((cells) => {
    const aligned = joinRow(cells, widths);
    if (width(aligned) <= columns) return aligned;
    const texts = cells.filter((cell): cell is string => cell !== null);
    return fitRow(texts, columns);
  });
};
