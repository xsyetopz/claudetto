// The main status line: the three-column grid of `grid.mjs`, or the segments of `segments.mjs`
// and `place.mjs` packed into rows when the grid does not fit.

import { CONTEXT_WINDOW } from "../../lib/budget.mjs";
import { partsOf } from "./context-table.mjs";
import { gridRows } from "./grid.mjs";
import { fitRows } from "./layout.mjs";
import { placeGroup } from "./place.mjs";
import { usageGroups } from "./segments.mjs";

/**
 * The text of the main status line for the status object `data`.
 * `ctx` has the clock `now` in milliseconds, `columns`, and what the entry point read:
 * `git`, `spec`, `credits`, `fable` (`{percent, resetsAt}`),
 * and `table` (the newest `/context` table).
 */
export function render(data, ctx) {
  const groups = [...usageGroups(data, ctx), placeGroup(data, ctx)];
  const total = data.context_window?.total_input_tokens ?? 0;
  const window = Math.min(
    data.context_window?.context_window_size || CONTEXT_WINDOW,
    CONTEXT_WINDOW,
  );
  const parts = partsOf(total, window, ctx.table);
  const grid = gridRows(groups, { ...ctx, parts }, ctx.columns);
  return (grid ?? fitRows(groups, ctx.columns)).join("\n");
}
