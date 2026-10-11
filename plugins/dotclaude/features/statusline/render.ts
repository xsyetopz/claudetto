// The main status line: the three-column grid of `grid.ts`, or the segments of `segments.ts`
// and `place.ts` packed into rows when the grid does not fit.

import { windowOf } from "../../lib/budget.ts";
import { partsOf } from "./context-table.ts";
import { gridRows } from "./grid.ts";
import { fitRows } from "./layout.ts";
import { placeGroup } from "./place.ts";
import { usageGroups } from "./segments.ts";
import type { RenderCtx, StatusInput } from "./types.ts";

/**
 * The text of the main status line for the status object `data`.
 * `ctx` has the clock `now` in milliseconds, `columns`, and what the entry point read:
 * `git`, `spec`, `credits`, `fable` (`{percent, resetsAt}`),
 * and `table` (the newest `/context` table).
 */
export function render(data: StatusInput, ctx: RenderCtx): string {
  const groups = [...usageGroups(data, ctx), placeGroup(data, ctx)];
  const total = data.context_window?.total_input_tokens ?? 0;
  const window = windowOf(data.context_window?.context_window_size);
  const parts = partsOf(total, window, ctx.table);
  const grid = gridRows(groups, { ...ctx, parts }, ctx.columns);
  return (grid ?? fitRows(groups, ctx.columns)).join("\n");
}
