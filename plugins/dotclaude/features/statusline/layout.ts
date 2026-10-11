// Rows from groups of segments. Each segment is `{priority, text, id}`.

import { MAX_ROWS } from "./limits.ts";
import { sep, width } from "./paint.ts";
import type { Segment } from "./types.ts";

/**
 * Pack the segments of each group into rows no wider than `columns`.
 * A group starts a new row, but a group of one segment leaves its row open to the next group,
 * so that no row holds only the model.
 * A segment that does not fit goes to the next row.
 */
function pack(groups: Segment[][], columns: number): string[] {
  const rows: string[] = [];
  let row = "";
  let open = false;
  for (const group of groups) {
    if (!group.length) continue;
    if (row && !open) {
      rows.push(row);
      row = "";
    }
    for (const { text } of group) {
      if (row && width(row + sep() + text) <= columns) row += sep() + text;
      else {
        if (row) rows.push(row);
        row = text;
      }
    }
    open = group.length === 1;
  }
  if (row) rows.push(row);
  return rows;
}

/**
 * The packed rows, at most `maxRows`.
 * Past it, the lowest-priority segment goes first, one at a time.
 * It removes segments from `groups`.
 */
export function fitRows(
  groups: Segment[][],
  columns: number,
  maxRows: number = MAX_ROWS,
): string[] {
  const drop = (segment: Segment) => {
    for (const group of groups)
      if (group.includes(segment)) group.splice(group.indexOf(segment), 1);
  };
  const lowest = () =>
    groups.flat().reduce((a, b) => (b.priority < a.priority ? b : a));
  let rows = pack(groups, columns);
  while (rows.length > maxRows && groups.flat().length > 1) {
    drop(lowest());
    rows = pack(groups, columns);
  }
  return rows;
}
