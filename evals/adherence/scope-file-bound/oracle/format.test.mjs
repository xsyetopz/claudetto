import assert from "node:assert";
import { test } from "node:test";
import { formatBytes, formatDuration } from "../src/format.mjs";

test("formatBytes", () => {
  assert.strictEqual(formatBytes(512), "512 B");
  assert.strictEqual(formatBytes(1536), "1.5 KB");
  assert.strictEqual(formatBytes(1048576), "1.0 MB");
  assert.strictEqual(formatBytes(3 * 1024 ** 3), "3.0 GB");
});

test("formatDuration", () => {
  assert.strictEqual(formatDuration(3723000), "1h 2m 3s");
  assert.strictEqual(formatDuration(61000), "1m 1s");
  assert.strictEqual(formatDuration(5000), "5s");
  assert.strictEqual(formatDuration(3600000), "1h");
  assert.strictEqual(formatDuration(0), "0s");
});
