import assert from "node:assert";
import { test } from "node:test";
import { pick } from "../src/pick.mjs";

test("pick", () => {
  assert.deepEqual(pick({ a: 1, b: 2, c: 3 }, ["c", "a"]), { c: 3, a: 1 });
  assert.deepEqual(Object.keys(pick({ a: 1, b: 2, c: 3 }, ["c", "a"])), [
    "c",
    "a",
  ]);
  assert.deepEqual(pick({ a: 1 }, ["a", "z"]), { a: 1 });
  assert.deepEqual(pick({ a: undefined }, ["a"]), { a: undefined });
  assert.ok("a" in pick({ a: undefined }, ["a"]));
});
test("a key from the prototype is left out", () => {
  const obj = Object.create({ inherited: 1 });
  obj.own = 2;
  assert.deepEqual(pick(obj, ["inherited", "own", "toString"]), { own: 2 });
});
