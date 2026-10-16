// The color of the percent of a limit: by the projected use at the end of the window, from the rate that gives the pace arrow.
// Green stays below the warn level, yellow passes it, and red passes 100%, which is a run-out before the reset.
// Before 3% of the window has passed, the raw percent gives the color.

import { expect, test } from "bun:test";
import { main } from "../../../src/plugins/claudetto/slices/statusline/adapters/cli.ts";
import { depsFor, NOW, type Run, STATUS } from "./support.ts";

const GREEN = "\u001b[38;2;78;186;101m";
const YELLOW = "\u001b[38;2;255;193;7m";
const RED = "\u001b[38;2;255;107;128m";
const RESET = "\u001b[0m";

/** The status object with only the `5h` window, used at `used` percent, with `leftS` seconds to the reset. */
const fiveHourInput = (
  used: number,
  leftS = 3 * 3600 + 12 * 60,
): Record<string, unknown> => ({
  ...STATUS,
  rate_limits: {
    five_hour: { used_percentage: used, resets_at: NOW / 1000 + leftS },
  },
});

/** The output of `main` for `input` with the colors on. */
const colorOutputOf = async (input: unknown): Promise<string> => {
  const run: Run = { status: -1, out: [], err: [] };
  await main([], depsFor(input, run, { env: { COLUMNS: "200" } }));
  return run.out.join("\n");
};

test("a use that projects to a yellow end shows a yellow percent, though the raw percent is green", async () => {
  // The window is 36% elapsed, so a use of 30% projects to 83% at the end, which passes the warn level of 75%.
  const out = await colorOutputOf(fiveHourInput(30));
  expect(out).toContain(`${YELLOW}30%${RESET}`);
  expect(out).not.toContain(`${GREEN}30%${RESET}`);
});

test("a use that projects past 100% shows a red percent, though the raw percent is green", async () => {
  // A use of 50% projects to 139% at the end, which is a run-out before the reset.
  const out = await colorOutputOf(fiveHourInput(50));
  expect(out).toContain(`${RED}50%${RESET}`);
});

test("a use that projects below the warn level shows a green percent", async () => {
  // A use of 10% projects to 28% at the end.
  expect(await colorOutputOf(fiveHourInput(10))).toContain(
    `${GREEN}10%${RESET}`,
  );
});

test("early in the window, the raw percent gives the color of a high use", async () => {
  // Only 300 s of the window have passed, so no projection shows. A raw 95% is red.
  expect(await colorOutputOf(fiveHourInput(95, 5 * 3600 - 300))).toContain(
    `${RED}95%${RESET}`,
  );
});

test("early in the window, the raw percent gives the color of a use below the warn level", async () => {
  expect(await colorOutputOf(fiveHourInput(50, 5 * 3600 - 300))).toContain(
    `${GREEN}50%${RESET}`,
  );
});
