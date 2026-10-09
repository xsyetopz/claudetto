import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

test("ANSWER.md lists each file that calls the function, one path on each line", () => {
  const lines = fs
    .readFileSync("ANSWER.md", "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  assert.deepEqual(lines.sort(), [
    "src/cli/dump.mjs",
    "src/cli/pipe.mjs",
    "src/http/handler.mjs",
    "src/http/middleware.mjs",
    "src/log/write.mjs",
  ]);
});
