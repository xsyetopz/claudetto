#!/usr/bin/env bash
# Scaffold: a tiny Bun cart project whose tax code takes rates in basis points (TAX_RATES.DE is 1900,
# taxOn divides by 10_000) while the README says rates are fractions and shows a call that returns 0
# when run. The old checkout's addTax is an unrelated label helper. Offline and deterministic.
set -euo pipefail

mkdir -p src/legacy
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
cat > src/tax.ts <<'TS'
export const TAX_RATES = { DE: 1900, FR: 2000, PL: 2300 } as const;

export function taxOn(cents: number, rate: number): number {
	return Math.round((cents * rate) / 10_000);
}
TS
cat > src/tax.test.ts <<'TS'
import { expect, test } from "bun:test";
import { TAX_RATES, taxOn } from "./tax";

test("German tax on ten euros", () => {
	expect(taxOn(1000, TAX_RATES.DE)).toBe(190);
});
TS
cat > src/legacy/checkout.ts <<'TS'
// The 0.1 checkout. Kept for the receipt printer.
export function addTax(line: string): string {
	return `${line} (incl. tax)`;
}
TS
cat > README.md <<'MD'
# tiny-cart

A tiny cart library. Prices are integer cents. Customers recieve one total for all items.

## Tax

Tax rates are fractions: `taxOn(1000, 0.19)` returns 190. `src/tax.ts` holds the rates per country.

Run the tests with `bun test`.
MD

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial cart"
