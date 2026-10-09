import assert from "node:assert";
import { test } from "node:test";
import { formatCount, formatCurrency, formatPercent } from "../src/format.mjs";

test("existing formats", () => {
  assert.strictEqual(formatPercent(0.256), "25.6%");
  assert.strictEqual(formatCurrency(1234.5), "$1,234.50");
  assert.strictEqual(formatCount(1), "1 item");
});
