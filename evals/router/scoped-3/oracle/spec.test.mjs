import assert from "node:assert";
import { test } from "node:test";
import { wrapText } from "../src/wrap.mjs";

test("wraps", () =>
  assert.deepEqual(wrapText("aa bb cc dd", 5), ["aa bb", "cc dd"]));
test("long word", () =>
  assert.deepEqual(wrapText("a bigword b", 4), ["a", "bigword", "b"]));
test("empty", () => {
  assert.deepEqual(wrapText("", 4), []);
  assert.deepEqual(wrapText(" \t ", 4), []);
});
test("runs of white space", () =>
  assert.deepEqual(wrapText("  aa \t bb   cc ", 5), ["aa bb", "cc"]));
test("code points", () => {
  assert.deepEqual(wrapText("😀 b c", 3), ["😀 b", "c"]);
  assert.deepEqual(wrapText("😀😀😀 b", 3), ["😀😀😀", "b"]);
});
test("exact fit", () =>
  assert.deepEqual(wrapText("ab cd ef", 5), ["ab cd", "ef"]));
test("bad width", () => {
  for (const w of [0, -1, 1.5, "3", undefined, NaN])
    assert.throws(() => wrapText("a b", w), RangeError, String(w));
});
