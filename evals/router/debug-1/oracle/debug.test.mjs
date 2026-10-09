import assert from "node:assert";
import { test } from "node:test";
import { toCents } from "../src/money.mjs";
import { lineTotal } from "../src/order.mjs";
import { summary } from "../src/summary.mjs";

test("summary adds the orders", () => {
  const orders = [{ lines: [{ price: "19.99", qty: 3 }] }];
  assert.equal(summary(orders), "59.97");
});
test("prices that lose a cent in binary", () => {
  for (const [price, cents] of [
    ["0.29", 29],
    ["1.15", 115],
    ["4.35", 435],
    ["8.20", 820],
  ])
    assert.equal(toCents(price), cents);
});
test("a discount still rounds to a cent", () => {
  assert.equal(lineTotal({ price: "10.00", qty: 1, discount: 0.125 }), 875);
  assert.equal(lineTotal({ price: "0.29", qty: 2, discount: 0.5 }), 29);
});
test("whole prices and an empty list", () => {
  assert.equal(toCents("5"), 500);
  assert.equal(summary([]), "0.00");
});
