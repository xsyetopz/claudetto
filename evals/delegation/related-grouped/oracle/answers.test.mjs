import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

test("ANSWERS.md names the four files", () => {
  const a = fs.readFileSync("ANSWERS.md", "utf8");
  for (const f of [
    "src/config/load.mjs",
    "src/net/retry.mjs",
    "src/jobs/run.mjs",
    "src/text/slug.mjs",
  ])
    assert.ok(a.includes(f));
});
