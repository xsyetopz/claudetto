// The three-column grid of the main status line (design D33).
// Left: the session. Middle: the context and what fills it. Right: the usage windows.
// The base cells are fixed. The other segments fill the end of a cell, and the lowest priority goes first
// while the columns are wider than `columns`.
// A grid that cannot fit gives `null`, and the caller packs the rows as before.

import { GRID_GAP } from "./limits.ts";
import { C, ICON, sep, width } from "./paint.ts";
import { fableText, k } from "./segments.ts";
import type { ContextParts, GridCtx, Item, Segment, Text } from "./types.ts";

/** The three cells of one column, from the top row to the bottom row. */
type Cell3 = [Item[], Item[], Item[]];

const BASE = Number.POSITIVE_INFINITY;

/** `850` or `12k`: small numbers show in full, because `12k` rounds `400` to `0k`. */
const tokens = (n: number): string => (n >= 1000 ? k(n) : String(n));
const part = (icon: string, text: string): string => `${C.dim(icon)} ${text}`;
/** The cells of the middle column below the meter. `parts` is from `partsOf` in `context-table.ts`. */
function breakdownCells(parts: ContextParts): string[] {
  const free = part(ICON.free, tokens(parts.free));
  if (parts.system === undefined) return [free, ""];
  // An estimate has a `~`. The parts of a `/context` table are exact.
  const estimate = parts.exact
    ? (icon: string, n: number) => part(icon, tokens(n))
    : (icon: string, n: number) => part(icon, C.dim(`~${tokens(n)}`));
  return [
    [
      estimate(ICON.system, parts.system),
      estimate(ICON.memory, parts.memory),
    ].join(sep()),
    [
      estimate(ICON.skills, parts.skills),
      part(ICON.messages, tokens(parts.messages)),
      free,
    ].join(sep()),
  ];
}

/** The text of one cell: its base items first, then the extras that are left, separated by `sep()`. */
const cellText = (cell: Item[]): string =>
  cell.map((item) => item.text).join(sep());

/** The cell `[column, row]` that takes each other segment, at the end. */
const EXTRA_CELLS: Record<string, [0 | 1 | 2, 0 | 1 | 2]> = {
  cost: [0, 0],
  lines: [0, 0],
  folder: [0, 1],
  worktree: [0, 1],
  repo: [0, 1],
  pr: [0, 2],
  agent: [0, 2],
  style: [0, 2],
  vim: [0, 2],
  name: [0, 2],
  cache: [1, 0],
  cacheDetail: [1, 0],
  credits: [2, 1],
  spend_limit: [2, 2],
};

/**
 * The grid rows, or `null` when no row set fits `columns`.
 * `groups` are the segments of `usageGroups` and `placeGroup`, each with an `id`.
 * `ctx` has `spec`, `fable`, `parts` (the context parts), and `now`.
 * It does not change `groups`.
 */
export function gridRows(
  groups: Segment[][],
  ctx: GridCtx,
  columns: number,
): string[] | null {
  const pool = new Map(groups.flat().map((s) => [s.id, s]));
  const take = (id: string): Item[] => {
    const s = pool.get(id);
    pool.delete(id);
    return s ? [{ priority: BASE, text: s.text }] : [];
  };
  const own = (text: Text): Item[] => (text ? [{ priority: BASE, text }] : []);
  const { spec } = ctx;
  const model = (): Item[] =>
    take("model").map((m) => ({
      ...m,
      text: `${C.dim(ICON.model)} ${m.text}`,
    }));
  const middle = ctx.parts ? breakdownCells(ctx.parts) : [];
  const cols: [Cell3, Cell3, Cell3] = [
    [
      model(),
      spec ? own(C.cyan(`${ICON.spec} ${spec.id}`)) : take("folder"),
      [
        ...own(spec && C.cyan(`${ICON.done} ${spec.done}/${spec.total}`)),
        ...take("branch"),
      ],
    ],
    [take("context"), own(middle[0]), own(middle[1])],
    [
      take("five_hour"),
      take("seven_day"),
      own(ctx.fable && fableText(ctx.fable, ctx.now)),
    ],
  ];
  for (const [id, [col, row]] of Object.entries(EXTRA_CELLS)) {
    const s = pool.get(id);
    if (s) cols[col][row].push(s);
  }
  const used = () => cols.filter((col) => col.some((cell) => cell.length));
  const widths = () =>
    used().map((col) => Math.max(...col.map((cell) => width(cellText(cell)))));
  const total = () =>
    widths().reduce((a, b) => a + b, 0) +
    GRID_GAP.length * Math.max(0, used().length - 1);
  const dropLowest = () => {
    let low: { cell: Item[]; item: Item } | null = null;
    for (const col of cols)
      for (const cell of col)
        for (const item of cell)
          if (
            item.priority !== BASE &&
            (!low || item.priority < low.item.priority)
          )
            low = { cell, item };
    if (!low) return false;
    low.cell.splice(low.cell.indexOf(low.item), 1);
    return true;
  };
  while (total() > columns) if (!dropLowest()) return null;
  const shown = used();
  const w = widths();
  const rows = [0, 1, 2].map((r) =>
    shown
      .map((col, i) => {
        const t = cellText(col[r] as Item[]);
        return t + " ".repeat((w[i] as number) - width(t));
      })
      .join(GRID_GAP)
      .trimEnd(),
  );
  const out = rows.filter(Boolean);
  return out.length ? out : null;
}
