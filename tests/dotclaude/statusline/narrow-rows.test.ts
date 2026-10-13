// The narrow and the wide main status line: the usage times shorten to a countdown before an item drops.
// The separator ` · ` stays next to the item that it separates, so no separator dangles before an empty place.

import { expect, test } from "bun:test";
import { main } from "../../../src/plugins/dotclaude/slices/statusline/adapters/cli.ts";
import { depsFor, type Run, STATUS } from "./support.ts";

/** The plain rows of `main` for `input` at `columns`, with the color off. */
const rowsAt = async (input: unknown, columns: number): Promise<string[]> => {
  const run: Run = { status: -1, out: [], err: [] };
  await main(
    [],
    depsFor(input, run, { env: { COLUMNS: String(columns), NO_COLOR: "1" } }),
  );
  return run.out.join("\n").split("\n");
};

test("at 60 columns the `5h` and `7d` windows both stay in the rows", async () => {
  const text = (await rowsAt(STATUS, 60)).join("\n");
  expect(text).toContain("◷ 5h");
  expect(text).toContain("◷ 7d");
});

test("at 60 columns the reset and the run-out times use the countdown, with their icons", async () => {
  const text = (await rowsAt(STATUS, 60)).join("\n");
  expect(text).toMatch(/↻(\d+d\d+h|\d+h\d{2}m|\d+m)/);
  expect(text).not.toMatch(/↻[A-Z][a-z]{2} \d/);
});

test("at 124 columns the reset time shows the clock, as it does at 0.28.0", async () => {
  const rows = await rowsAt(STATUS, 124);
  expect(rows[1]).toMatch(/↻\d{1,2}:\d{2}[ap]m/);
  expect(rows[0]).toMatch(/↻[A-Z][a-z]{2} \d{1,2} at \d{1,2}(:\d{2})?[ap]m/);
});

test("a separator with an empty place before the next item sits next to that item", async () => {
  const row0 = (await rowsAt(STATUS, 124))[0] ?? "";
  expect(row0).toContain(" · ◷ 7d");
  expect(row0).not.toMatch(/ · {2,}/);
});
