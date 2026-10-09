import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

test("ANSWER.md holds the audit code", () => {
  assert.ok(fs.readFileSync("ANSWER.md", "utf8").includes("KX-7731"));
});
