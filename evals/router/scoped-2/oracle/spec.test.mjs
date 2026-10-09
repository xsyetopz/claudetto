import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";
import { groupBy } from "../src/group.mjs";

test("groups", () => {
  const m = groupBy([1, 2, 3, 4, 5], (x) => x % 2);
  assert.ok(m instanceof Map);
  assert.deepEqual([...m.keys()], [1, 0]);
  assert.deepEqual(m.get(1), [1, 3, 5]);
});
test("empty", () => assert.equal(groupBy([], String).size, 0));
