import assert from "node:assert";
import { test } from "node:test";
import { transpose } from "../src/transpose.mjs";

test("transpose", () => {
  assert.deepEqual(
    transpose([
      [1, 2, 3],
      [4, 5, 6],
    ]),
    [
      [1, 4],
      [2, 5],
      [3, 6],
    ],
  );
  assert.deepEqual(transpose([[1, 2]]), [[1], [2]]);
  assert.deepEqual(transpose([]), []);
  const rows = [
    [1, 2],
    [3, 4],
  ];
  transpose(rows);
  assert.deepEqual(rows, [
    [1, 2],
    [3, 4],
  ]);
});
test("rows of other lengths", () =>
  assert.throws(() => transpose([[1, 2], [3]]), RangeError));
