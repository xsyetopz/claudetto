import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

test("PLAN.md names the files to change and not the others", () => {
  const a = fs.readFileSync("PLAN.md", "utf8");
  assert.ok(a.includes("src/session.mjs"));
  assert.ok(a.includes("src/guard.mjs"));
  assert.ok(!a.includes("src/ui.mjs"));
});
