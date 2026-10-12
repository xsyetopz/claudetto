// The rows of the main status line: the segments of a row, joined, and fitted to the width.

import type { StatusSegment } from "../../../../../kernel/slice.ts";
import { MAX_ROWS, SEGMENT_GAP } from "../limits.ts";
import { truncate, width } from "../width.ts";

/** The texts of the segments of one row, from the left. A segment that renders null is out. */
const textsOf = (
  segments: readonly StatusSegment[],
  row: number,
  status: unknown,
): string[] =>
  segments
    .filter((segment) => segment.row === row)
    .map((segment) => segment.render(status))
    .filter((text): text is string => Boolean(text));

/**
 * One text for a row.
 * When the row is wider than `columns`, the segments at the right drop first, and the first segment is cut when it is still too wide.
 */
export const fitRow = (texts: readonly string[], columns: number): string => {
  const kept = [...texts];
  while (kept.length > 1 && width(kept.join(SEGMENT_GAP)) > columns) kept.pop();
  return truncate(kept.join(SEGMENT_GAP), columns);
};

/**
 * The rows of the status line for `status`: the rows in the order of their number, at most `MAX_ROWS`, each fitted to `columns`.
 * A row with no text is out.
 */
export const renderRows = (
  segments: readonly StatusSegment[],
  status: unknown,
  columns: number,
): string[] =>
  [...new Set(segments.map((segment) => segment.row))]
    .sort((a, b) => a - b)
    .map((row) => textsOf(segments, row, status))
    .filter((texts) => texts.length > 0)
    .slice(0, MAX_ROWS)
    .map((texts) => fitRow(texts, columns));
