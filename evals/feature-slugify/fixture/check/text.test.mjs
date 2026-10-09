import assert from "node:assert";
import { test } from "node:test";
import { title } from "../src/text.mjs";

test("title", () => {
  assert.equal(title("a b"), "A B");
});
