#!/usr/bin/env bash
# Scaffold: a tiny Bun cart project that already has a spec with CART-1 and CART-2 and tests that
# cite them. A new requirement needs a new ID, and the two old ones must survive. Offline and deterministic.
set -euo pipefail

mkdir -p src specs
cat > package.json <<'JSON'
{
  "name": "tiny-cart",
  "private": true,
  "type": "module",
  "scripts": { "test": "bun test" }
}
JSON
cat > src/cart.ts <<'TS'
export interface Item {
	price: number;
	qty: number;
}

export function cartTotal(items: Item[]): number {
	let acc = 0;
	for (const item of items) {
		acc += item.price * item.qty;
	}
	return Math.max(0, acc);
}
TS
cat > src/cart.test.ts <<'TS'
import { expect, test } from "bun:test";
import { cartTotal } from "./cart";

test("CART-2 sums price times quantity", () => {
	expect(
		cartTotal([
			{ price: 250, qty: 2 },
			{ price: 100, qty: 1 }
		])
	).toBe(600);
});

test("CART-1 total is never negative", () => {
	expect(cartTotal([{ price: -5, qty: 1 }])).toBe(0);
});
TS
cat > specs/cart.md <<'MD'
# Cart

## CART-1 Totals are never negative

`cartTotal` returns 0 when the line totals sum below zero.

Given an item priced at -5 cents with quantity 1
When the cart is totalled
Then the total is 0

## CART-2 Line totals multiply price by quantity

`cartTotal` adds price times quantity for each item.

Given an item priced at 250 cents with quantity 2 and one priced at 100 cents with quantity 1
When the cart is totalled
Then the total is 600
MD
cat > README.md <<'MD'
# tiny-cart

A tiny cart library. Prices are integer cents. Customers recieve one total for all items.

Run the tests with `bun test`.
MD

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial cart"
