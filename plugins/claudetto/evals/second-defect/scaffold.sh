#!/usr/bin/env bash
# Scaffold: a tiny Bun cart project with two defects. The prompt names the cart total, which
# ignores quantity; `bun test` also shows a second failure in formatCents, which drops the
# leading zero of the cents. Offline and deterministic.
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
		acc += item.price;
	}
	return acc;
}
TS
cat > src/format.ts <<'TS'
/** Formats integer cents as dollars, such as 1005 as "$10.05". */
export function formatCents(cents: number): string {
	const dollars = Math.floor(cents / 100);
	const rest = cents % 100;
	return `$${dollars}.${rest}`;
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
cat > src/format.test.ts <<'TS'
import { expect, test } from "bun:test";
import { formatCents } from "./format";

test("formats whole dollars", () => {
	expect(formatCents(1200)).toBe("$12.00");
});

test("keeps the leading zero of the cents", () => {
	expect(formatCents(1005)).toBe("$10.05");
});
TS
cat > README.md <<'MD'
# tiny-cart

A tiny cart library. Prices are integer cents.
MD

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial cart"
