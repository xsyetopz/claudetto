// The `5h` and `7d` windows on two rows of the main status line, one window per row, in one column.
// The label, percent, arrow, run-out time, and reset of the two windows align field by field.

import { expect, test } from "bun:test";
import { main } from "../../../plugins/claudetto/slices/statusline/adapters/cli.ts";
import { depsFor, type Run, STATUS } from "./support.ts";

/** The plain rows of `main` for `input` at 200 columns. */
const rowsOf = async (input: unknown): Promise<string[]> => {
  const run: Run = { status: -1, out: [], err: [] };
  await main(
    [],
    depsFor(input, run, { env: { COLUMNS: "200", NO_COLOR: "1" } }),
  );
  return run.out.join("\n").split("\n");
};

test("the `7d` window shares the folder row and the `5h` window shares the model row", async () => {
  const rows = await rowsOf(STATUS);
  expect(rows[0]).toContain("◷ 7d");
  expect(rows[1]).toContain("◷ 5h");
});

test("the `5h` and `7d` windows start in one column", async () => {
  const rows = await rowsOf(STATUS);
  expect(rows[0]?.indexOf("◷ 7d")).toBe(rows[1]?.indexOf("◷ 5h"));
});

test("the reset of the two windows starts in one column, with the glyph `↻` before the time", async () => {
  const rows = await rowsOf(STATUS);
  expect(rows[1]).toMatch(/↻\d{1,2}:\d{2}[ap]m/);
  expect(rows[0]).toMatch(/↻[A-Z][a-z]{2} \d{1,2} at \d{1,2}(:\d{2})?[ap]m/);
  expect(rows[0]?.indexOf("↻")).toBe(rows[1]?.indexOf("↻"));
});
