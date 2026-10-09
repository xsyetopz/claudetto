import assert from "node:assert";
import { test } from "node:test";
import { cached } from "../src/cache.mjs";

test("nested objects differ", () => {
  assert.equal(
    cached({ a: { x: 1 } }, () => "x"),
    "x",
  );
  assert.equal(
    cached({ a: { x: 2 } }, () => "y"),
    "y",
  );
});
