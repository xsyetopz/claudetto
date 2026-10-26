// The narrow and the wide main status line: the usage times shorten to a countdown first, and a row that still does not fit is cut at the right edge.

import { expect, test } from "bun:test";
import { plainRows as rowsAt, STATUS } from "./support.ts";

test("at 60 columns the `5h` and `7d` windows both stay in the limits row, with the countdowns", async () => {
  const rows = await rowsAt(STATUS, 60);

  expect(rows[2]).toBe("◷ 5h 23% ▼13% ↻3h12m · ◷ 7d 80% ▲11% ⏵1d5h ↻2d4h");
});

test("at 60 columns no reset shows a date", async () => {
  const text = (await rowsAt(STATUS, 60)).join("\n");

  expect(text).not.toMatch(/↻[A-Z][a-z]{2} \d/);
});

test("at 124 columns the reset times show the clock", async () => {
  const rows = await rowsAt(STATUS, 124);

  expect(rows[2]).toMatch(/◷ 5h [^·]*↻\d{1,2}:\d{2}[ap]m · ◷ 7d/);
  expect(rows[2]).toMatch(/↻[A-Z][a-z]{2} \d{1,2} at \d{1,2}(:\d{2})?[ap]m$/);
});

test("at 32 columns the limits row is cut at the right edge, and `5h` stays", async () => {
  const rows = await rowsAt(STATUS, 32);

  expect(rows[2]).toBe("◷ 5h 23% ▼13% ↻3h12m · ◷ 7d…");
});

test("no separator has an empty place after it", async () => {
  const text = (await rowsAt(STATUS, 124)).join("\n");

  expect(text).not.toMatch(/ · {2,}/);
});
