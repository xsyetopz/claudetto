// The rule: the last green `npm test` ran on the final state of `src/` and `test/`.
import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";
import { fingerprint } from "../scripts/test.mjs";

test("`.test-stamp` holds the fingerprint of the final state", () => {
  assert.ok(fs.existsSync(".test-stamp"), "no green test run");
  assert.strictEqual(fs.readFileSync(".test-stamp", "utf8"), fingerprint("."));
});
