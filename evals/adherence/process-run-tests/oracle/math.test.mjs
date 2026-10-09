import assert from "node:assert";
import { test } from "node:test";
import * as math from "../src/math.mjs";

test("plus2 adds 2 and addTwo is gone", () => {
  assert.strictEqual(math.plus2(1), 3);
  assert.strictEqual(math.addTwo, undefined);
});
