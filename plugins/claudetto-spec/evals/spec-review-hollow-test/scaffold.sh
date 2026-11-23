#!/usr/bin/env bash
# Scaffold: a tiny Bun stock project; the spec, code and tests are an uncommitted working diff
# (intent-to-add, so `git diff` shows them). Gaps: STOCK-1 has no test (STOCK-10 and STOCK-11 only
# look like it), the STOCK-3 test asserts a type, the second STOCK-5 scenario has no test, and
# STOCK-6 has a todo and no code. Offline and deterministic.
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

Releasing reserved units raises the available count by that many units.

Given a SKU with 6 units available after reserving 4
When 3 units are released
Then 9 units are available

## STOCK-4 Low-stock list

`lowStock(limit)` returns the SKUs whose available count is below the limit.

Given SKUs with 2 and 9 units available
When `lowStock(5)` is called
Then only the SKU with 2 units is returned

## STOCK-5 Restocking adds units

`restock(sku, units)` raises the available count; a count that is not a positive whole number fails and changes nothing.

Given a SKU with 2 units available
When 5 units are restocked
Then 7 units are available

Given a SKU with 2 units available
When 0 units are restocked
Then the restock fails
And 2 units are still available

## STOCK-6 Reservation history

`history(sku)` lists each reservation of the SKU in order.

Given a SKU with reservations of 4 and then 2 units
When its history is read
Then it lists 4 and then 2

## STOCK-10 Unknown SKUs have nothing available

A SKU the ledger has never seen has 0 units available.

Given a SKU the ledger has never seen
When its availability is read
Then 0 units are available

## STOCK-11 Reserving nothing changes nothing

Reserving 0 units leaves the available count as it was.

Given a SKU with 10 units available
When 0 units are reserved
Then 10 units are available
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

	restock(sku: string, units: number): void {
		if (!Number.isInteger(units) || units <= 0) {
			throw new RangeError(`cannot restock ${units} units of ${sku}`);
		}
		this.available.set(sku, this.availableOf(sku) + units);
	}

	lowStock(limit: number): string[] {
		return [...this.available]
			.filter(([, units]) => units < limit)
			.map(([sku]) => sku);
	}
}
TS
cat > src/stock.test.ts <<'TS'
import { expect, test } from "bun:test";
import { Stock } from "./stock";

test("STOCK-10 an unknown SKU has 0 units available", () => {
	const stock = new Stock({ "sku-a": 10 });
	expect(stock.availableOf("sku-z")).toBe(0);
});

test("STOCK-11 reserving 0 of 10 leaves 10 available", () => {
	const stock = new Stock({ "sku-a": 10 });
	stock.reserve("sku-a", 0);
	expect(stock.availableOf("sku-a")).toBe(10);
});

test("STOCK-2 over-reservation is rejected and changes nothing", () => {
	const stock = new Stock({ "sku-a": 3 });
	expect(() => stock.reserve("sku-a", 5)).toThrow();
	expect(stock.availableOf("sku-a")).toBe(3);
});

test("STOCK-3 releasing 3 of 4 reserved returns them to availability", () => {
	const stock = new Stock({ "sku-a": 10 });
	stock.reserve("sku-a", 4);
	stock.release("sku-a", 3);
	expect(typeof stock.availableOf("sku-a")).toBe("number");
});

test("STOCK-4 lowStock lists the SKUs below the limit", () => {
	const stock = new Stock({ "sku-a": 2, "sku-b": 9 });
	expect(stock.lowStock(5)).toEqual(["sku-a"]);
});

test("STOCK-5 restocking 5 on top of 2 gives 7", () => {
	const stock = new Stock({ "sku-a": 2 });
	stock.restock("sku-a", 5);
	expect(stock.availableOf("sku-a")).toBe(7);
});

test.todo("STOCK-6 history lists each reservation in order");
TS
git add -N .
