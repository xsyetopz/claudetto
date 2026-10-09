import assert from "node:assert";
import { test } from "node:test";
import { addTwo } from "../src/math.mjs";

test("addTwo adds 2", () => {
  assert.strictEqual(addTwo(1), 3);
});
