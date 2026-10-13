// The snapshots of the rows of `dotclaude-statusline`: one for each width with `NO_COLOR`, and one with color.
// Each snapshot is the text of the rows, so a change of a segment, an icon, or the fit to a width shows in the diff.

import { expect, test } from "bun:test";
import { main } from "../../../src/plugins/dotclaude/slices/statusline/adapters/cli.ts";
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
    "⌂ dotclaude  ⎇ main ✎2 ↑1 ↓2
    ◈ Opus 5.5 high ✦  ▤ 45k/300k 15%  $1.23 +300 -20
    ◷ 5h 23% ▼13% 3h12m  ◷ 7d 80% ▲11% 2d4h"
  `);
});

test("the rows at 60 columns with `NO_COLOR`", async () => {
  expect(await render(60, { NO_COLOR: "1" })).toMatchInlineSnapshot(`
    "⌂ dotclaude  ⎇ main ✎2 ↑1 ↓2
    ◈ Opus 5.5 high ✦  ▤ 45k/300k 15%  $1.23 +300 -20
    ◷ 5h 23% ▼13% 3h12m  ◷ 7d 80% ▲11% 2d4h"
  `);
});

test("the rows at 32 columns with `NO_COLOR`", async () => {
  expect(await render(32, { NO_COLOR: "1" })).toMatchInlineSnapshot(`
    "⌂ dotclaude  ⎇ main ✎2 ↑1 ↓2
    ◈ Opus 5.5 high ✦
    ◷ 5h 23% ▼13% 3h12m"
  `);
});

test("the rows at 14 columns with `NO_COLOR`", async () => {
  expect(await render(14, { NO_COLOR: "1" })).toMatchInlineSnapshot(`
    "⌂ dotclau…
    ◈ Opus 5.…
    ◷ 5h 23% …"
  `);
});

test("the rows at 124 columns with color", async () => {
  expect(await render(124)).toMatchInlineSnapshot(`
    "\x1B[1m⌂ dotclaude\x1B[0m  ⎇ main \x1B[33m✎2\x1B[0m \x1B[32m↑1\x1B[0m \x1B[31m↓2\x1B[0m
    \x1B[1m◈ Opus 5.5\x1B[0m\x1B[2m high\x1B[0m ✦  \x1B[32m▤ 45k/300k 15%\x1B[0m  \x1B[2m$1.23\x1B[0m \x1B[32m+300\x1B[0m \x1B[31m-20\x1B[0m
    ◷ 5h \x1B[32m23%\x1B[0m\x1B[32m ▼13%\x1B[0m\x1B[2m 3h12m\x1B[0m  ◷ 7d \x1B[33m80%\x1B[0m\x1B[33m ▲11%\x1B[0m\x1B[2m 2d4h\x1B[0m"
  `);
});
