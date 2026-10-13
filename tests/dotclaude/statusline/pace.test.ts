// The pace arrows of the `5h` and `7d` limits: `▼` for a reserve, `▲` for a deficit, and no arrow at the even pace.
// The clock and the status object are fixed, so that the elapsed part of each window is known.

import { expect, test } from "bun:test";
import { main } from "../../../src/plugins/dotclaude/slices/statusline/adapters/cli.ts";
import { depsFor, NOW, type Run, STATUS } from "./support.ts";

/** The row of the `5h` limit when its used percentage is `used`, with `leftS` seconds to the reset. */
const fiveHourRow = async (
  used: number,
  leftS = 3 * 3600 + 12 * 60,
): Promise<string> => {
  const input = {
    ...STATUS,
    rate_limits: {
      five_hour: {
        used_percentage: used,
        resets_at: NOW / 1000 + leftS,
      },
    },
  };
  const run: Run = { status: -1, out: [], err: [] };
  await main(
    [],
    depsFor(input, run, { env: { COLUMNS: "200", NO_COLOR: "1" } }),
  );
  return run.out.join("\n");
};

test("a use below the even pace of the window shows a reserve arrow `▼`", async () => {
  // The window is 36% elapsed, so a use of 10% is 26 points below the pace.
  expect(await fiveHourRow(10)).toContain("◷ 5h 10% ▼26% 3h12m");
});

test("a use above the even pace of the window shows a deficit arrow `▲`", async () => {
  // The window is 36% elapsed, so a use of 50% is 14 points above the pace.
  expect(await fiveHourRow(50)).toContain("◷ 5h 50% ▲14% 3h12m");
});

test("a use at the even pace of the window shows no arrow", async () => {
  expect(await fiveHourRow(36)).toContain("◷ 5h 36% 3h12m");
});

test("no arrow shows before 3% of the window has passed, as in 0.28.0", async () => {
  // Only 300 s of the 18000 s window have passed, which is 1.7%, so a use of 10% shows no pace.
  const row = await fiveHourRow(10, 5 * 3600 - 300);
  expect(row).toContain("◷ 5h 10%");
  expect(row).not.toMatch(/[▲▼]/);
});
