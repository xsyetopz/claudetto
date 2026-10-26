// The placement of the rows: the full times first, the countdowns only when a row does not fit, and a cut at the right edge last.

import { expect, test } from "bun:test";
import type { StatusSegment } from "../../../plugins/claudetto/kernel/hooks.ts";
import { renderRows } from "../../../plugins/claudetto/modules/statusline/rows.ts";

/** A segment in `row` that shows `full`, or `short` in compact mode. */
const seg = (id: string, row: number, full: string, short = full) =>
  ({
    id,
    row,
    render: (status) =>
      (status as { compact: boolean }).compact ? short : full,
  }) satisfies StatusSegment;

const statusOf = (compact: boolean) => ({ compact });

test("when each row fits, the rows have the full times and no countdown is built", () => {
  const asked: boolean[] = [];

  const rows = renderRows(
    [seg("a", 0, "one"), seg("b", 1, "two")],
    (compact) => {
      asked.push(compact);
      return { compact };
    },
    80,
  );

  expect(rows).toStrictEqual(["one", "two"]);
  expect(asked).toStrictEqual([false]);
});

test("a row that does not fit gives the countdowns to each row", () => {
  const segments = [seg("a", 0, "a long time", "1h"), seg("b", 1, "x", "y")];

  const rows = renderRows(segments, statusOf, 6);

  expect(rows).toStrictEqual(["1h", "y"]);
});

test("a row that does not fit with the countdowns is cut at the right edge, and keeps each item that fits", () => {
  const segments = [seg("a", 0, "first"), seg("b", 0, "second")];

  const [row] = renderRows(segments, statusOf, 12);

  expect(row).toBe("first · sec…");
});

test("a row with no text takes no place, and the rows keep their order", () => {
  const segments = [seg("a", 0, ""), seg("b", 1, "two"), seg("c", 3, "four")];

  const rows = renderRows(segments, statusOf, 80);

  expect(rows).toStrictEqual(["two", "four"]);
});
