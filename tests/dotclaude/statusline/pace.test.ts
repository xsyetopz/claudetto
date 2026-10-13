// The pace arrows of the `5h` and `7d` limits: `▼` for a reserve, `▲` for a deficit, and no arrow at the even pace.
// The clock and the status object are fixed, so that the elapsed part of each window is known.
// The arrows are green for a reserve and yellow for a deficit, as in 0.28.0.

import { expect, test } from "bun:test";
import { main } from "../../../src/plugins/dotclaude/slices/statusline/adapters/cli.ts";
import { depsFor, NOW, type Run, STATUS } from "./support.ts";

const GREEN = "\u001b[32m";
const YELLOW = "\u001b[33m";
const RESET = "\u001b[0m";

/** The status object with only the `5h` window, used at `used` percent, with `leftS` seconds to the reset. */
const fiveHourInput = (
  used: number,
  leftS = 3 * 3600 + 12 * 60,
): Record<string, unknown> => ({
  ...STATUS,
  rate_limits: {
    five_hour: {
      used_percentage: used,
      resets_at: NOW / 1000 + leftS,
    },
  },
});

/** The status object with only the `7d` window, used at `used` percent, with `leftS` seconds to the reset. */
const sevenDayInput = (
  used: number,
  leftS: number,
): Record<string, unknown> => ({
  ...STATUS,
  rate_limits: {
    seven_day: {
      used_percentage: used,
      resets_at: NOW / 1000 + leftS,
    },
  },
});

/** The output of `main` for `input`, with `env` added to the width. */
const outputOf = async (
  input: unknown,
  env: Record<string, string>,
): Promise<string> => {
  const run: Run = { status: -1, out: [], err: [] };
  await main([], depsFor(input, run, { env: { COLUMNS: "200", ...env } }));
  return run.out.join("\n");
};

/** The output of `main` for `input` with no color. */
const plainOutputOf = (input: unknown): Promise<string> =>
  outputOf(input, { NO_COLOR: "1" });

test("a use below the even pace of the window shows a reserve arrow `▼`", async () => {
  // The window is 36% elapsed, so a use of 10% is 26 points below the pace.
  expect(await plainOutputOf(fiveHourInput(10))).toContain(
    "◷ 5h 10% ▼26% 3h12m",
  );
});

test("a use above the even pace of the window shows a deficit arrow `▲`", async () => {
  // The window is 36% elapsed, so a use of 50% is 14 points above the pace.
  expect(await plainOutputOf(fiveHourInput(50))).toContain(
    "◷ 5h 50% ▲14% 3h12m",
  );
});

test("a use at the even pace of the window shows no arrow", async () => {
  expect(await plainOutputOf(fiveHourInput(36))).toContain("◷ 5h 36% 3h12m");
});

test("no arrow shows before 3% of the window has passed, as in 0.28.0", async () => {
  // Only 300 s of the 18000 s window have passed, which is 1.7%, so a use of 10% shows no pace.
  const row = await plainOutputOf(fiveHourInput(10, 5 * 3600 - 300));
  expect(row).toContain("◷ 5h 10%");
  expect(row).not.toMatch(/[▲▼]/);
});

test("a reserve arrow of the `5h` limit is green, and a deficit arrow is yellow", async () => {
  // The arrow and its number are one colored text, as in 0.28.0.
  expect(await outputOf(fiveHourInput(10), {})).toContain(
    `${GREEN} ▼26%${RESET}`,
  );
  expect(await outputOf(fiveHourInput(50), {})).toContain(
    `${YELLOW} ▲14%${RESET}`,
  );
});

test("a `7d` reserve shows a green `▼4%`, from the 1 day elapsed of a 7-day window", async () => {
  // The window is 1/7 elapsed, which is 14.3%, so a use of 10% is 4 points below the pace.
  const leftS = 6 * 24 * 3600;
  expect(await plainOutputOf(sevenDayInput(10, leftS))).toContain(
    "◷ 7d 10% ▼4%",
  );
  expect(await outputOf(sevenDayInput(10, leftS), {})).toContain(
    `${GREEN} ▼4%${RESET}`,
  );
});

test("a `7d` deficit shows a yellow `▲36%`, from the same 1 day elapsed", async () => {
  // A use of 50% is 36 points above the 14.3% of the window that has passed.
  const leftS = 6 * 24 * 3600;
  expect(await plainOutputOf(sevenDayInput(50, leftS))).toContain(
    "◷ 7d 50% ▲36%",
  );
  expect(await outputOf(sevenDayInput(50, leftS), {})).toContain(
    `${YELLOW} ▲36%${RESET}`,
  );
});
