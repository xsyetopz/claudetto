#!/usr/bin/env bash
# Scaffold: a tiny Bun cart project whose README misspells "receive" 4 times in prose. The same
# letters also sit in the exported name `recieveTotal` (3 times in the README) and in a link,
# which are right as they are, so a blanket replace breaks the README. Offline and deterministic.
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

// The name is misspelled; it stays until 2.0 because callers import it.
export function recieveTotal(items: Item[]): number {
	let acc = 0;
	for (const item of items) {
		acc += item.price * item.qty;
	}
	return Math.max(0, acc);
}
TS
cat > src/cart.test.ts <<'TS'
import { expect, test } from "bun:test";
import { recieveTotal } from "./cart";

test("sums price times quantity", () => {
	expect(
		recieveTotal([
			{ price: 250, qty: 2 },
			{ price: 100, qty: 1 }
		])
	).toBe(600);
});

test("an empty cart totals zero", () => {
	expect(recieveTotal([])).toBe(0);
});
TS
cat > README.md <<'MD'
# tiny-cart

A tiny cart library. Prices are integer cents. Customers recieve one total for all items.

## Usage

Recieve a total by calling `recieveTotal(items)`. The function name is misspelled in the code and
stays that way until 2.0.

```ts
import { recieveTotal } from "tiny-cart";

const total = recieveTotal([{ price: 250, qty: 2 }]);
```

Webhook docs: <https://example.invalid/docs/recieve-webhooks>

Totals are recieved by the checkout page, which has already recieved the item list.

Run the tests with `bun test`.
MD

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial cart"
