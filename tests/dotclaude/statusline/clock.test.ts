// The reset and run-out clock of a limit: a time of day within 24 hours, and a date with a time after that, as in 0.28.0.
// The times are built in local time, so the expected text does not depend on the time zone of the machine.

import { expect, test } from "bun:test";
import { clock } from "../../../src/plugins/dotclaude/slices/statusline/domain/format.ts";

const NOW_MS = new Date(2026, 9, 12, 12, 0).getTime();

/** The time of `y-mo-d h:mi` in local time, in seconds. */
const at = (y: number, mo: number, d: number, h: number, mi: number): number =>
  new Date(y, mo, d, h, mi).getTime() / 1000;

test("a time of day within 24 hours shows the hour, with `pm` in lower case", () => {
  expect(clock(at(2026, 9, 12, 13, 0), NOW_MS)).toBe("1pm");
});

test("a time of day within 24 hours shows the minutes when they are not zero", () => {
  expect(clock(at(2026, 9, 12, 13, 50), NOW_MS)).toBe("1:50pm");
});

test("a time more than 24 hours away shows the date and the time", () => {
  expect(clock(at(2026, 9, 19, 7, 0), NOW_MS)).toBe("Oct 19 at 7am");
});
