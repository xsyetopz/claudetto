// The layout of the main status line: 4 fixed rows (the place, the session, the limits, and the cache), with ` · ` between the items of a row.
// The place row and the session row share columns, and an empty place keeps its column. The limits row and the cache row are joined plainly.

import { expect, test } from "bun:test";
import { main } from "../../../plugins/claudetto/modules/statusline/adapters/cli.ts";
import { width } from "../../../plugins/claudetto/modules/statusline/width.ts";
import { depsFor, NOW, plainRows, type Run, STATUS } from "./support.ts";

const rowsAt = (columns: number, input: unknown = STATUS) =>
  plainRows(input, columns);

/** The rows of the main status line for `input`, at 200 columns, with color. */
const colorRowsOf = async (input: unknown): Promise<string[]> => {
  const run: Run = { status: -1, out: [], err: [] };
  await main([], depsFor(input, run, { env: { COLUMNS: "200" } }));
  return (run.out[0] ?? "").split("\n");
};

/** The column, in terminal columns, where `marker` starts in `line`. Color sequences take no columns. */
const columnOf = (line: string, marker: string): number =>
  width(line.slice(0, line.indexOf(marker)));

const CACHE = {
  caching_observed: true,
  warm: true,
  expires_at: NOW / 1000 + 300,
  ttl: "1h",
  hit_ratio: 0.9,
};

test("a wide terminal puts the `5h` and `7d` windows in the limits row, `5h` first", async () => {
  const rows = await rowsAt(200);

  expect(rows).toHaveLength(3);
  expect(rows[0]).not.toContain("◷");
  expect(rows[1]).not.toContain("◷");
  expect(rows[2]?.indexOf("◷ 5h")).toBe(0);
  expect(rows[2]?.indexOf("◷ 7d")).toBeGreaterThan(0);
});

test("the items of a row are joined by ` · `", async () => {
  const rows = await rowsAt(200);

  expect(rows[1]).toContain(" · ▤ ctx 15% of 300k ⇥80% · $1.23");
  expect(rows[2]).toContain("↻3:12pm · ◷ 7d");
});

test("the cache is in the fourth row", async () => {
  const rows = await rowsAt(200, { ...STATUS, prompt_cache: CACHE });

  expect(rows).toHaveLength(4);
  expect(rows[3]?.startsWith("⌁")).toBe(true);
});

test("the limits row with only `7d` starts at the left edge", async () => {
  const input = {
    ...STATUS,
    rate_limits: { seven_day: STATUS.rate_limits.seven_day },
  };

  const rows = await rowsAt(200, input);

  expect(rows[2]?.startsWith("◷ 7d")).toBe(true);
});

test("the limits row with only `spend` starts at the left edge", async () => {
  const input = {
    ...STATUS,
    rate_limits: {
      spend_limit: {
        used_percentage: 40,
        resets_at: STATUS.rate_limits.five_hour.resets_at,
      },
    },
  };

  const rows = await rowsAt(200, input);

  expect(rows[2]?.startsWith("◷ spend")).toBe(true);
});

test("the first separator of the place row and the session row is in one column", async () => {
  const rows = await rowsAt(200);

  const column = rows[0]?.indexOf(" · ");

  expect(column).toBeGreaterThan(0);
  expect(rows[1]?.indexOf(" · ")).toBe(column);
});

test("the rows drop the alignment together when one row does not fit", async () => {
  const rows = await rowsAt(60);

  expect(rows[0]).toBe("⌂ claudetto · ⎇ main ✎2 ↑1 ↓2");
});

test("an empty middle place keeps its column, so the later item of its row starts after the item above it, with color codes", async () => {
  const { context_window: _, ...noContext } = STATUS;

  const rows = await colorRowsOf(noContext);

  const gitEnd = columnOf(rows[0] ?? "", "⎇") + width("⎇ main ✎2 ↑1 ↓2");
  expect(columnOf(rows[1] ?? "", "$")).toBe(gitEnd + width(" · "));
});

test("a wide glyph in the folder name keeps the items of the place row and the session row in their columns", async () => {
  // Each of the two CJK characters of the folder name has two columns.
  const input = {
    ...STATUS,
    cwd: "/work/仕事",
    workspace: { current_dir: "/work/仕事", project_dir: "/work/仕事" },
  };

  const rows = await colorRowsOf(input);

  expect(columnOf(rows[0] ?? "", "⎇")).toBe(columnOf(rows[1] ?? "", "▤"));
});
