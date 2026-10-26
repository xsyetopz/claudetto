// The snapshots of the rows of `claudetto-statusline`: one for each width with `NO_COLOR`, and one with color.
// Each snapshot is the text of the rows, so a change of a segment, an icon, or the fit to a width shows in the diff.

import { expect, test } from "bun:test";
import { main } from "../../../plugins/claudetto/modules/statusline/adapters/cli.ts";
import { depsFor, type Run, STATUS } from "./support.ts";

const render = async (
  columns: number,
  env: Record<string, string> = {},
): Promise<string> => {
  const run: Run = { status: -1, out: [], err: [] };
  await main(
    [],
    depsFor(STATUS, run, { env: { COLUMNS: String(columns), ...env } }),
  );
  return run.out.join("\n");
};

test("the rows at 124 columns with `NO_COLOR`", async () => {
  expect(await render(124, { NO_COLOR: "1" })).toMatchInlineSnapshot(`
    "⌂ claudetto       · ⎇ main ✎2 ↑1 ↓2
    ◈ Opus 5.5 high ✦ · ▤ ctx 15% of 300k ⇥80% · $1.23 +300 -20
    ◷ 5h 23% ▼13% ↻3:12pm · ◷ 7d 80% ▲11% ⏵Oct 13 at 5pm ↻Oct 14 at 4pm"
  `);
});

test("the rows at 60 columns with `NO_COLOR`", async () => {
  expect(await render(60, { NO_COLOR: "1" })).toMatchInlineSnapshot(`
    "⌂ claudetto · ⎇ main ✎2 ↑1 ↓2
    ◈ Opus 5.5 high ✦ · ▤ ctx 15% of 300k ⇥80% · $1.23 +300…
    ◷ 5h 23% ▼13% ↻3h12m · ◷ 7d 80% ▲11% ⏵1d5h ↻2d4h"
  `);
});

test("the rows at 32 columns with `NO_COLOR`", async () => {
  expect(await render(32, { NO_COLOR: "1" })).toMatchInlineSnapshot(`
    "⌂ claudetto · ⎇ main ✎2 ↑1 …
    ◈ Opus 5.5 high ✦ · ▤ ctx 1…
    ◷ 5h 23% ▼13% ↻3h12m · ◷ 7d…"
  `);
});

test("the rows at 14 columns with `NO_COLOR`", async () => {
  expect(await render(14, { NO_COLOR: "1" })).toMatchInlineSnapshot(`
    "⌂ claudet…
    ◈ Opus 5.…
    ◷ 5h 23% …"
  `);
});

test("the rows at 124 columns with color", async () => {
  expect(await render(124)).toMatchInlineSnapshot(`
    "\x1B[1m⌂ claudetto\x1B[0m       · \x1B[38;2;175;135;255m⎇ main\x1B[0m \x1B[38;2;255;193;7m✎2\x1B[0m \x1B[38;2;78;186;101m↑1\x1B[0m \x1B[38;2;255;107;128m↓2\x1B[0m
    \x1B[38;2;215;119;87m◈ Opus 5.5\x1B[0m\x1B[2m high\x1B[0m ✦ · \x1B[2m▤ ctx\x1B[0m \x1B[38;2;78;186;101m15%\x1B[0m of 300k \x1B[38;2;78;186;101m⇥80%\x1B[0m · \x1B[2m$1.23\x1B[0m \x1B[38;2;78;186;101m+300\x1B[0m \x1B[38;2;255;107;128m-20\x1B[0m
    ◷ \x1B[2m5h\x1B[0m \x1B[38;2;91;187;94m23%\x1B[0m \x1B[38;2;78;186;101m▼13%\x1B[0m \x1B[38;2;255;182;23m↻3:12pm\x1B[0m · ◷ \x1B[2m7d\x1B[0m \x1B[38;2;255;136;88m80%\x1B[0m \x1B[38;2;255;193;7m▲11%\x1B[0m \x1B[38;2;255;155;61m⏵Oct 13 at 5pm\x1B[0m \x1B[38;2;126;188;75m↻Oct 14 at 4pm\x1B[0m"
  `);
});
