// The run-out clock `⏵` of a limit: the time at which the use reaches 100% at the current rate.
// It shows after the pace arrow, and only when the run-out comes before the reset.
// The status object is the one of `pace.test.ts`: a `5h` window that is 36% elapsed.

import { expect, test } from "bun:test";
import { main } from "../../../src/plugins/dotclaude/slices/statusline/adapters/cli.ts";
import { paceOf } from "../../../src/plugins/dotclaude/slices/statusline/domain/pace.ts";
import { FIVE_HOUR_S } from "../../../src/plugins/dotclaude/slices/statusline/limits.ts";
import { depsFor, NOW, type Run, STATUS } from "./support.ts";

/** The `5h` window, used at `used` percent, with `leftS` seconds to the reset. */
const fiveHour = (used: number, leftS = 3 * 3600 + 12 * 60) => ({
  used_percentage: used,
  resets_at: NOW / 1000 + leftS,
});

/** The status object with only the `5h` window of `fiveHour`. */
const fiveHourInput = (
  used: number,
  leftS?: number,
): Record<string, unknown> => ({
  ...STATUS,
  rate_limits: { five_hour: fiveHour(used, leftS) },
});

/** The plain output of `main` for `input`, with no color. */
const plainOutputOf = async (input: unknown): Promise<string> => {
  const run: Run = { status: -1, out: [], err: [] };
  await main(
    [],
    depsFor(input, run, { env: { COLUMNS: "200", NO_COLOR: "1" } }),
  );
  return run.out.join("\n");
};

test("the run-out time shows after the arrow when the use runs out before the reset", async () => {
  // The window is 36% elapsed, so a use of 50% runs out at 100% after 1 h 48 min, before the 3 h 12 min reset.
  expect(await plainOutputOf(fiveHourInput(50))).toMatch(
    /▲14% +⏵\d{1,2}:\d{2}[ap]m/,
  );
});

test("the run-out time is the time at which the use reaches 100% at the current rate", () => {
  // 50% used in 36% of the window reaches 100% after 36% of the window times 50 / 50, which is 6480 s.
  const pace = paceOf(fiveHour(50), NOW / 1000, FIVE_HOUR_S);
  expect(pace?.runOutAt).toBeCloseTo(NOW / 1000 + 6480, 3);
});

test("no run-out time shows when the use lasts to the reset", async () => {
  expect(await plainOutputOf(fiveHourInput(10))).not.toContain("⏵");
});

test("no run-out time shows at the even pace, where the rate is exactly 100%", async () => {
  expect(await plainOutputOf(fiveHourInput(36))).not.toContain("⏵");
});

test("no run-out time shows before 3% of the window has passed", async () => {
  // Only 300 s of the window have passed, so no pace and no run-out time show, even at a use of 50%.
  expect(await plainOutputOf(fiveHourInput(50, 5 * 3600 - 300))).not.toContain(
    "⏵",
  );
});
