import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";
import { memoLast } from "../src/memo.mjs";

test("caches", () => {
  let n = 0;
  const f = memoLast((x) => (n++, x * 2), 2);
  f(1);
  f(1);
  f(2);
  f(3);
  f(1);
  assert.equal(n, 4);
});
test("a read keeps the key", () => {
  let n = 0;
  const f = memoLast((x) => (n++, x), 2);
  f(1);
  f(2);
  f(1);
  f(3);
  f(1);
  assert.equal(n, 3);
  f(2);
  assert.equal(n, 4);
});
test("a result that is falsy is cached too", () => {
  let n = 0;
  const f = memoLast((x) => (n++, [undefined, null, 0, ""][x]), 5);
  for (const x of [0, 1, 2, 3, 0, 1, 2, 3]) f(x);
  assert.equal(n, 4);
  assert.equal(f(0), undefined);
  assert.equal(f(2), 0);
});
test("keys follow Map rules", () => {
  let n = 0;
  const f = memoLast((x) => (n++, typeof x), 5);
  assert.equal(f(1), "number");
  assert.equal(f("1"), "string");
  f(Number.NaN);
  f(Number.NaN);
  assert.equal(n, 3);
});
test("an error goes to the caller and is not cached", () => {
  let n = 0;
  const f = memoLast((x) => {
    n++;
    if (n === 1) throw new Error("first");
    return x;
  }, 2);
  assert.throws(() => f(1), /first/);
  assert.equal(f(1), 1);
  assert.equal(f(1), 1);
  assert.equal(n, 2);
});
test("clear empties the cache", () => {
  let n = 0;
  const f = memoLast((x) => (n++, x), 2);
  f(1);
  f(1);
  f.clear();
  f(1);
  assert.equal(n, 2);
});
test("size counts the keys that the cache holds", () => {
  const f = memoLast((x) => x, 2);
  assert.equal(f.size(), 0);
  f(1);
  f(2);
  f(3);
  assert.equal(f.size(), 2);
  f(3);
  assert.equal(f.size(), 2);
  f.clear();
  assert.equal(f.size(), 0);
});
test("an error does not change the size", () => {
  const f = memoLast((x) => {
    if (x === 2) throw new Error("two");
    return x;
  }, 3);
  f(1);
  assert.throws(() => f(2), /two/);
  assert.equal(f.size(), 1);
});
test("a bad max is a RangeError", () => {
  for (const m of [0, -1, 1.5, "2", undefined, Number.NaN])
    assert.throws(() => memoLast((x) => x, m), RangeError);
});
test("uses lrubox", () =>
  assert.match(fs.readFileSync("src/memo.mjs", "utf8"), /vendor\/lrubox/));
