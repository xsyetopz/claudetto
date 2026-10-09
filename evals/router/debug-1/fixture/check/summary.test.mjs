import assert from "node:assert";
import { test } from "node:test";
import { summary } from "../src/summary.mjs";

test("summary adds the orders", () => {
  const orders = [{ lines: [{ price: "19.99", qty: 3 }] }];
  assert.equal(summary(orders), "59.97");
});
