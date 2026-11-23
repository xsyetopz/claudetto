#!/usr/bin/env bash
# Scaffold: a tiny Bun cart project with specs and cited tests.
# The repo holds CART-1 and CART-2 in specs/cart.md and CART-3 in specs/checkout.md, while the README
# says the next free ID is CART-3. The README also sends every percentage through percentOf, which
# taken off the total gives 896 for 995 at 10 percent, and src/money.ts alone says why a float factor
# is wrong (1000 at 7 percent). The README's `recieveCopy` is the option's real name in src/cart.ts.
# Offline and deterministic.
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

export interface ReceiptOptions {
	recieveCopy: boolean;
}

export const DEFAULT_RECEIPT: ReceiptOptions = { recieveCopy: false };
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
cat > src/money.ts <<'TS'
// Shares of integer cents. Multiply first and divide last: a float factor drifts, so
// 1000 * (1 - 7 / 100) is 929.9999999999999 and floors to 929, one cent short.
export function percentOf(amount: number, percent: number): number {
	return Math.floor((amount * percent) / 100);
}
TS
cat > src/money.test.ts <<'TS'
import { expect, test } from "bun:test";
import { percentOf } from "./money";

test("a share rounds down", () => {
	expect(percentOf(995, 10)).toBe(99);
});

test("a whole share is exact", () => {
	expect(percentOf(1000, 93)).toBe(930);
});
TS
cat > src/checkout.ts <<'TS'
import {
	cartTotal,
	DEFAULT_RECEIPT,
	type Item,
	type ReceiptOptions
} from "./cart";

const SHIPPING = 499;

export interface Receipt {
	copySent: boolean;
	total: number;
}

export function checkout(
	items: Item[],
	options: ReceiptOptions = DEFAULT_RECEIPT
): Receipt {
	return {
		copySent: options.recieveCopy,
		total: cartTotal(items) + SHIPPING
	};
}
TS
cat > src/checkout.test.ts <<'TS'
import { expect, test } from "bun:test";
import { checkout } from "./checkout";

test("CART-3 shipping is added once", () => {
	const order = checkout([
		{ price: 250, qty: 2 },
		{ price: 100, qty: 1 }
	]);
	expect(order.total).toBe(1099);
});

test("a copy goes out when recieveCopy is set", () => {
	expect(checkout([], { recieveCopy: true }).copySent).toBe(true);
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
cat > specs/checkout.md <<'MD'
# Checkout

## CART-3 Shipping is added once

`checkout` adds the 499 cent shipping fee once per order, whatever the number of lines.

Given an item priced at 250 cents with quantity 2 and one priced at 100 cents with quantity 1
When the order is checked out
Then the total is 1099
MD
cat > README.md <<'MD'
# tiny-cart

A tiny cart library. Prices are integer cents. Customers recieve one total for all items.

Pass `recieveCopy: true` in the receipt options to email the customer a copy of the receipt.

Every percentage goes through `percentOf` in `src/money.ts`: take the share it returns off the amount.

Requirements live in `specs/`. CART-1 and CART-2 are taken, so the next free ID is CART-3.

Run the tests with `bun test`.
MD

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial cart"
