// The layout of the main status line: ` · ` between the items of a row, and the items of the rows in columns that line up.
// A place that is empty keeps its column, and a block of rows drops the alignment together when one row does not fit.

import { expect, test } from "bun:test";
import { main } from "../../../plugins/claudetto/slices/statusline/adapters/cli.ts";
import {
  plainText,
  width,
} from "../../../plugins/claudetto/slices/statusline/width.ts";
import { depsFor, type Run, STATUS } from "./support.ts";

const rowsAt = async (columns: number): Promise<string[]> => {
  const run: Run = { status: -1, out: [], err: [] };
  await main(
    [],
    depsFor(STATUS, run, {
      env: { COLUMNS: String(columns), NO_COLOR: "1" },
    }),
  );
  return (run.out[0] ?? "").split("\n").map(plainText);
};

/** The rows of the main status line for `input`, at 200 columns, with the color as the environment sets it. */
const rowsOf = async (input: unknown): Promise<string[]> => {
  const run: Run = { status: -1, out: [], err: [] };
  await main([], depsFor(input, run, { env: { COLUMNS: "200" } }));
  return (run.out[0] ?? "").split("\n");
};

/** The column, in terminal columns, where `marker` starts in `line`. Color sequences take no columns. */
const columnOf = (line: string, marker: string): number =>
  width(line.slice(0, line.indexOf(marker)));

/** The column of the first ` · ` in `line`, counted in characters. */
const separatorColumn = (line: string): number => line.indexOf(" · ");

test("the items of a row are joined by ` · `", async () => {
  const rows = await rowsAt(200);
  expect(rows[1]).toContain(" · ▤ 15% of 300k ⇥80% ");
  expect(rows[0]).toContain(" · ◷ 7d");
  expect(rows[1]).toContain("+300 -20 · ◷ 5h");
});

test("the first separator of each row is in the same column when the row fits", async () => {
  const rows = await rowsAt(200);
  const columns = rows.map(separatorColumn);
  expect(columns[0]).toBeGreaterThan(0);
  expect(columns[1]).toBe(columns[0]);
});

test("the rows drop the alignment together when one row does not fit", async () => {
  // The aligned block is wider than 60 columns, so the rows are joined without the alignment.
  // The one-row placement with the countdown times keeps every item at 60 columns.
  const rows = await rowsAt(60);
  expect(rows[0]).toBe("⌂ claudetto · ⎇ main ✎2 ↑1 ↓2");
  expect(rows[1]).toBe(
    "◈ Opus 5.5 high ✦ · ▤ 15% of 300k ⇥80% · $1.23 +300 -20",
  );
  expect(rows[2]).toBe("◷ 5h 23% ▼13% ↻3h12m · ◷ 7d 80% ▲11% ⏵1d5h ↻2d4h");
});

test("a row with an empty middle place keeps its later item in its column, with color codes", async () => {
  // The `change` place of row 0 is empty, so the `7d` item keeps the column of the `5h` item in row 1.
  const rows = await rowsOf(STATUS);
  expect(columnOf(rows[0] ?? "", "◷ 7d")).toBe(columnOf(rows[1] ?? "", "◷ 5h"));
});

test("a row with fewer items keeps each item in its column", async () => {
  // The `5h` item is absent, so the `7d` item keeps the column that it has with both windows.
  const full = await rowsOf(STATUS);
  const rows = await rowsOf({
    ...STATUS,
    rate_limits: { seven_day: STATUS.rate_limits.seven_day },
  });
  expect(columnOf(rows[0] ?? "", "◷ 7d")).toBe(columnOf(full[0] ?? "", "◷ 7d"));
});

test("`spend` alone on row 2 starts in the column of the first place of rows 0 and 1", async () => {
  // Row 2 holds only `spend`, so it is the first place of that row, in the column of the folder and of the model.
  const rows = await rowsOf({
    ...STATUS,
    rate_limits: {
      ...STATUS.rate_limits,
      spend_limit: {
        used_percentage: 40,
        resets_at: STATUS.rate_limits.five_hour.resets_at,
      },
    },
  });
  expect(columnOf(rows[2] ?? "", "◷ spend")).toBe(columnOf(rows[0] ?? "", "⌂"));
  expect(columnOf(rows[2] ?? "", "◷ spend")).toBe(columnOf(rows[1] ?? "", "◈"));
});

test("a wide glyph in the folder name keeps the items of the rows in their columns", async () => {
  // Each of the two CJK characters of the folder name has two columns.
  const rows = await rowsOf({
    ...STATUS,
    cwd: "/work/仕事",
    workspace: { current_dir: "/work/仕事", project_dir: "/work/仕事" },
  });
  expect(columnOf(rows[0] ?? "", "⎇")).toBe(columnOf(rows[1] ?? "", "▤"));
});
