import assert from "node:assert";
import { test } from "node:test";
import * as f from "../src/format.mjs";

test("existing formats", () => {
  assert.strictEqual(f.formatPercent(0.256), "25.6%");
  assert.strictEqual(f.formatCurrency(-1234.5), "-$1,234.50");
  assert.strictEqual(f.formatDay("2026-10-09T12:00:00Z"), "2026-10-09");
  assert.strictEqual(f.formatCount(3), "3 items");
  assert.strictEqual(f.capitalize("abc"), "Abc");
});
