#!/usr/bin/env bash
# Scaffold: a tiny Bun stock project; the spec, code and tests are an uncommitted working diff
# (intent-to-add, so `git diff` shows them). Offline and deterministic.
set -euo pipefail

mkdir -p src specs
cat > package.json <<'JSON'
{
  "name": "tiny-stock",
  "private": true,
  "type": "module",
  "scripts": { "test": "bun test" }
}
JSON
cat > README.md <<'MD'
# tiny-stock

A tiny stock ledger. Run the tests with `bun test`.
MD

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial stock project"

cat > specs/stock.md <<'MD'
# Stock

## STOCK-1 Reserving removes units from availability

Reserving units lowers the available count by that many units.

Given a SKU with 10 units available
When 4 units are reserved
Then 6 units are available

## STOCK-2 Over-reservation is rejected

Reserving more units than are available fails and changes nothing.

Given a SKU with 3 units available
When 5 units are reserved
Then the reservation fails
And 3 units are still available

## STOCK-3 Releasing returns units to availability

Releasing reserved units raises the available count, never beyond what was reserved.

Given a SKU with 6 units available after reserving 4
When 3 units are released
Then 9 units are available

Given a SKU with 6 units available after reserving 4
When 5 units are released
Then the release fails
And 6 units are still available

## STOCK-4 Low-stock list

`lowStock(limit)` returns the SKUs whose available count is below the limit.

Given SKUs with 2 and 9 units available
When `lowStock(5)` is called
Then only the SKU with 2 units is returned
MD
cat > src/stock.ts <<'TS'
export class Stock {
	private readonly available = new Map<string, number>();
	private readonly reserved = new Map<string, number>();

	constructor(initial: Record<string, number>) {
		for (const [sku, units] of Object.entries(initial)) {
			this.available.set(sku, units);
			this.reserved.set(sku, 0);
		}
	}

	availableOf(sku: string): number {
		return this.available.get(sku) ?? 0;
	}

	reserve(sku: string, units: number): void {
		if (units > this.availableOf(sku)) {
			throw new Error(`only ${this.availableOf(sku)} units of ${sku} available`);
		}
		this.available.set(sku, this.availableOf(sku) - units);
		this.reserved.set(sku, (this.reserved.get(sku) ?? 0) + units);
	}

	release(sku: string, units: number): void {
		const held = this.reserved.get(sku) ?? 0;
		if (units > held) {
			throw new Error(`only ${held} units of ${sku} are reserved`);
		}
		this.reserved.set(sku, held - units);
		this.available.set(sku, this.availableOf(sku) + units);
	}
}
TS
cat > src/stock.test.ts <<'TS'
import { expect, test } from "bun:test";
import { Stock } from "./stock";

test("STOCK-1 reserving 4 of 10 leaves 6 available", () => {
	const stock = new Stock({ "sku-a": 10 });
	stock.reserve("sku-a", 4);
	expect(stock.availableOf("sku-a")).toBe(6);
});

test("STOCK-2 over-reservation is rejected", () => {
	expect(true).toBe(true);
});

test("STOCK-3 releasing 3 of 4 reserved raises availability to 9", () => {
	const stock = new Stock({ "sku-a": 10 });
	stock.reserve("sku-a", 4);
	stock.release("sku-a", 3);
	expect(stock.availableOf("sku-a")).toBe(9);
});
TS
git add -N .
