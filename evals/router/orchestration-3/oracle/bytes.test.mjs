import assert from "node:assert";
import { test } from "node:test";
import { formatBytes } from "../src/bytes.mjs";

test("formatBytes", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(1023), "1023 B");
  assert.equal(formatBytes(1024), "1 KB");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(2048), "2 KB");
  assert.equal(formatBytes(1048576), "1 MB");
  assert.equal(formatBytes(1048575), "1024 KB");
  assert.equal(formatBytes(1024 ** 4 * 2), "2 TB");
  assert.equal(formatBytes(1024 ** 5), "1024 TB");
  assert.equal(formatBytes(1024 ** 3 * 5.5), "5.5 GB");
});
test("bad count", () => {
  for (const n of [-1, 1.5, Number.NaN])
    assert.throws(() => formatBytes(n), RangeError);
});
