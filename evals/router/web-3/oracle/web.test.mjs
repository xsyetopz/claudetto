import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";
import { shard, shardBy } from "../src/shard.mjs";

test("3 parts, the last parts take the extra items", () => {
  assert.deepEqual(shard([1, 2, 3, 4, 5, 6, 7]), [
    [1, 2],
    [3, 4],
    [5, 6, 7],
  ]);
  assert.deepEqual(shard([1, 2, 3, 4, 5]), [[1], [2, 3], [4, 5]]);
});
test("fewer than 3 items", () => {
  assert.deepEqual(shard([1, 2]), [[1], [2]]);
  assert.deepEqual(shard([1]), [[1]]);
  assert.deepEqual(shard([]), []);
});
test("shard takes the number of parts as a second argument", () => {
  assert.deepEqual(shard([1, 2, 3, 4, 5], 2), [
    [1, 2],
    [3, 4, 5],
  ]);
  assert.deepEqual(shard([1, 2], 5), [[1], [2]]);
  assert.deepEqual(shard([], 5), []);
});
test("a bad number of parts is a RangeError, also for an empty list", () => {
  for (const p of [0, -1, 1.5, "2"]) {
    assert.throws(() => shard([1, 2, 3], p), RangeError);
    assert.throws(() => shard([], p), RangeError);
  }
});
test("shardBy gives the fewest parts of at most `size` items", () => {
  assert.deepEqual(shardBy([1, 2, 3, 4, 5, 6, 7], 3), [
    [1, 2],
    [3, 4],
    [5, 6, 7],
  ]);
  assert.deepEqual(shardBy([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4), [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9, 10],
  ]);
  assert.deepEqual(shardBy([1, 2, 3], 3), [[1, 2, 3]]);
  assert.deepEqual(shardBy([1, 2], 5), [[1, 2]]);
  assert.deepEqual(shardBy([], 3), []);
});
test("shardBy rejects a bad size, also for an empty list", () => {
  for (const s of [0, -2, 2.5, "3"]) {
    assert.throws(() => shardBy([1, 2, 3], s), RangeError);
    assert.throws(() => shardBy([], s), RangeError);
  }
});
test("the input is not changed", () => {
  const xs = [1, 2, 3, 4];
  const out = shard(xs);
  out[0].push(99);
  assert.deepEqual(xs, [1, 2, 3, 4]);
});
test("any iterable is an input", () => {
  assert.deepEqual(shard(new Set([1, 2, 3, 4]), 2), [
    [1, 2],
    [3, 4],
  ]);
  function* gen() {
    yield* [1, 2, 3, 4, 5];
  }
  assert.deepEqual(shard(gen(), 2), [[1, 2], [3, 4, 5]]);
  assert.deepEqual(shardBy(gen(), 2), [[1], [2, 3], [4, 5]]);
  assert.deepEqual(shard(new Set()), []);
  assert.throws(() => shard(new Set([1]), 0), RangeError);
  assert.throws(() => shardBy(gen(), 0), RangeError);
});
test("uses chunkit", () =>
  assert.match(fs.readFileSync("src/shard.mjs", "utf8"), /vendor\/chunkit/));
