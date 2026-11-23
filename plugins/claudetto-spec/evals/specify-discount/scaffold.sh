#!/usr/bin/env bash
# Scaffold: a tiny Bun cart project with a spec (CART-1, CART-2), a todo test, and an applyDiscount
# that the request and the README call a stub. It is live: it returns legacyDiscount, which rounds
# half up, so 995 at 10 percent is 896 today. /claudetto-spec:specify writes the requirement, leaves
# code and tests alone, and says what the code does now. Offline and deterministic.
set -euo pipefail

mkdir -p src/legacy specs
cat > package.json <<'JSON'
{
  "name": "tiny-cart",
  "private": true,
  "type": "module",
  "scripts": { "test": "bun test" }
}
JSON
cat > src/cart.ts <<'TS'
import { legacyDiscount } from "./legacy/pricing";

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

export function applyDiscount(total: number, percent: number): number {
	return legacyDiscount(total, percent);
}
TS
cat > src/legacy/pricing.ts <<'TS'
// Pricing helpers kept from the 0.1 checkout.
export function legacyDiscount(total: number, percent: number): number {
	return Math.round((total * (100 - percent)) / 100);
}
TS
cat > src/legacy/pricing.test.ts <<'TS'
import { expect, test } from "bun:test";
import { legacyDiscount } from "./pricing";

test("ten percent off a round total", () => {
	expect(legacyDiscount(1000, 10)).toBe(900);
});
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

test.todo("applies a percentage discount");
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

`applyDiscount` in `src/cart.ts` is a stub that throws until the discount work lands.

Run the tests with `bun test`.
MD

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial cart"
