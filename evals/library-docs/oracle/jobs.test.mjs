import assert from "node:assert";
import { test } from "node:test";
import { drain } from "../src/jobs.mjs";

test("drain takes the lowest rank first", () => {
  const out = drain([
    { name: "b", rank: 2 },
    { name: "a", rank: 1 },
    { name: "c", rank: 3 },
  ]);
  assert.deepEqual(out, ["a", "b", "c"]);
  assert.deepEqual(drain([]), []);
});
