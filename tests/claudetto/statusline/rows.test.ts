// The placement of the rows: the plans are built one at a time, and the first plan that keeps every item is the only one built.

import { expect, test } from "bun:test";
import type { StatusSegment } from "../../../src/kernel/slice.ts";
import { renderRows } from "../../../src/plugins/claudetto/slices/statusline/domain/rows.ts";

/** A segment with `text` in `row`, and a count of the renders of each segment id in `renders`. */
const counted =
  (renders: Record<string, number>) =>
  (id: string, row: number, text: string): StatusSegment => ({
    id,
    row,
    render: () => {
      renders[id] = (renders[id] ?? 0) + 1;
      return text;
    },
  });

test("when the first plan keeps every item, no other plan is built or rendered", () => {
  const renders: Record<string, number> = {};
  const seg = counted(renders);
  const asked: boolean[] = [];
  const rows = renderRows(
    [seg("a", 0, "one"), seg("b", 1, "two")],
    [seg("c", 0, "three")],
    (compact) => {
      asked.push(compact);
      return {};
    },
    80,
  );
  expect(rows).toStrictEqual(["one", "two"]);
  expect(asked).toStrictEqual([false]);
  expect(renders).toStrictEqual({ a: 1, b: 1 });
});
