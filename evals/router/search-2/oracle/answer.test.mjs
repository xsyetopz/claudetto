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
    "src/net/batch.mjs",
    "src/net/client.mjs",
    "src/net/hooks.mjs",
    "src/net/lazy.mjs",
    "src/net/poll.mjs",
    "src/net/registry.mjs",
    "src/net/upload.mjs",
  ]);
});
