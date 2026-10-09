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
test("objects inside arrays differ", () => {
  assert.equal(
    cached([{ q: 1 }], () => "p"),
    "p",
  );
  assert.equal(
    cached([{ q: 2 }], () => "r"),
    "r",
  );
});
test("same content hits, in any key order", () => {
  let n = 0;
  cached({ b: { y: 1, z: [1, 2] }, c: 1 }, () => ++n);
  cached({ c: 1, b: { z: [1, 2], y: 1 } }, () => ++n);
  assert.equal(n, 1);
});
test("a number and its text stay apart", () => {
  assert.equal(
    cached(5, () => "number"),
    "number",
  );
  assert.equal(
    cached("5", () => "text"),
    "text",
  );
});
