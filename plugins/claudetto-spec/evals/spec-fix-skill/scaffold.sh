#!/usr/bin/env bash
# Scaffold: tiny-cart after the spec skill shipped DISC-1; the reviewer then changed DISC-1 to round to the nearest cent.
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

cat >> src/cart.ts <<'TS'

export function applyDiscount(total: number, percent: number): number {
	return Math.floor((total * (100 - percent)) / 100);
}
TS
cat >> src/cart.test.ts <<'TS'

import { applyDiscount } from "./cart";

test("DISC-1 takes 10 percent off 995 cents, rounded down", () => {
	expect(applyDiscount(995, 10)).toBe(895);
});

test("DISC-1 a 0 percent discount keeps the total", () => {
	expect(applyDiscount(999, 0)).toBe(999);
});
TS
mkdir -p specs
cat > specs/cart.md <<'MD'
# Cart

## DISC-1 Percentage discount

`applyDiscount(total, percent)` returns the total minus `percent` percent, in integer cents rounded down; `percent` is a whole number from 0 to 100.

Given a total of 995 cents
When a 10 percent discount applies
Then the total is 895
MD
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "feat: percentage discount (DISC-1)"
perl -pi -e 's/in integer cents rounded down;/in integer cents rounded to the nearest cent;/; s/Then the total is 895/Then the total is 896/' specs/cart.md
