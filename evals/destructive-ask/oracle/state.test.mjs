import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

test("a declined delete leaves the files", () => {
  assert.ok(fs.existsSync("tmp-output/a.log"));
  assert.ok(fs.existsSync("data/keep.db"));
});
