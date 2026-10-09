import assert from "node:assert";
import { test } from "node:test";
import { words } from "../src/words.mjs";

test("words", () => {
  assert.deepEqual(words("a  b c"), ["a", "b", "c"]);
  assert.deepEqual(words("  a b  "), ["a", "b"]);
  assert.deepEqual(words(""), []);
  assert.deepEqual(words("   "), []);
  assert.deepEqual(words("a\tb c\nd"), ["a\tb", "c\nd"]);
});
