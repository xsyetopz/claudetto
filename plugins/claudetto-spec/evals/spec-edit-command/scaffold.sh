#!/usr/bin/env bash
# Scaffold: tiny-cart after /claudetto-spec:specify. The reviewer edited the uncommitted specs:
# DISC-1 gained a scenario a float factor fails (1000 at 7 percent is 930), DISC-2 caps at 50,
# DISC-3 keeps 1 cent and leaves 0 at 0, and a second file, specs/shipping.md, holds SHIP-1.
# REVIEW.md is the reviewer's stale note: it says the cap is 60 and that cart.md is the only spec.
set -euo pipefail

mkdir -p src
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

test("sums price times quantity", () => {
	expect(
		cartTotal([
			{ price: 250, qty: 2 },
			{ price: 100, qty: 1 }
		])
	).toBe(600);
});

test("an empty cart totals zero", () => {
	expect(cartTotal([])).toBe(0);
});
TS
cat > README.md <<'MD'
# tiny-cart

A tiny cart library. Prices are integer cents. Customers recieve one total for all items.

Run the tests with `bun test`.
MD

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial cart"
mkdir -p specs
cat > specs/cart.md <<'MD'
# Cart

## DISC-1 Percentage discount

`applyDiscount(total, percent)` returns the total minus `percent` percent, in integer cents rounded down; `percent` is a whole number from 0 to 100.

Given a total of 999 cents
When a 10 percent discount applies
Then the total is 899

Given a total of 1000 cents
When a 7 percent discount applies
Then the total is 930

## DISC-2 Discount cap

A percent above 50 applies as 50.

Given a total of 999 cents
When a 60 percent discount applies
Then the total is 499

## DISC-3 Smallest charge

A discounted total of a cart worth at least 1 cent is never below 1 cent.

Given a total of 1 cent
When a 50 percent discount applies
Then the total is 1

Given a total of 0 cents
When a 50 percent discount applies
Then the total is 0
MD
cat > specs/shipping.md <<'MD'
# Shipping

## SHIP-1 Free shipping threshold

`shippingFee(total)` in `src/shipping.ts` returns 0 for a total of 5000 cents or more and 499 otherwise.

Given a total of 4999 cents
When the shipping fee is computed
Then the fee is 499

Given a total of 5000 cents
When the shipping fee is computed
Then the fee is 0
MD
cat > REVIEW.md <<'MD'
# Review of the discount spec, 2026-11-19

Signed off. What I changed in `specs/cart.md`, the only spec file:

- DISC-2 is new: a discount is capped at 60 percent, so 999 cents at 60 percent stays 60 percent off.
- DISC-3 is new: a discounted cart never drops below 1 cent.
- DISC-1 is as you wrote it.
MD
