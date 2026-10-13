// The layout of the main status line: ` · ` between the items of a row, and the items of the rows in columns that line up.
// A row that does not fit keeps its items and drops the alignment.

import { expect, test } from "bun:test";
import { main } from "../../../src/plugins/dotclaude/slices/statusline/adapters/cli.ts";
import { plainText } from "../../../src/plugins/dotclaude/slices/statusline/width.ts";
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

/** The column of the first ` · ` in `line`, counted in characters. */
const separatorColumn = (line: string): number => line.indexOf(" · ");

test("the items of a row are joined by ` · `", async () => {
  const rows = await rowsAt(200);
  expect(rows[1]).toContain(" · ▤ 45k/300k 15% ");
  expect(rows[2]).toContain("3h12m · ◷ 7d");
});

test("the first separator of each row is in the same column when the row fits", async () => {
  const rows = await rowsAt(200);
  const columns = rows.map(separatorColumn);
  expect(columns[0]).toBeGreaterThan(0);
  expect(columns[1]).toBe(columns[0]);
  expect(columns[2]).toBe(columns[0]);
});

test("a row that does not fit the aligned layout keeps its items, without the padding", async () => {
  // Four columns are kept free at the right edge, so 60 columns leave 56 for the rows.
  const rows = await rowsAt(60);
  expect(rows[1]).toBe("◈ Opus 5.5 high ✦ · ▤ 45k/300k 15% · $1.23 +300 -20");
});
