#!/usr/bin/env bash
# Scaffold: a tiny Bun cart project whose total ignores quantity, with a verify script that
# writes verified.txt only when the tests pass. Offline and deterministic.
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
cat > verify.sh <<'SH'
#!/usr/bin/env bash
# Runs the tests and records the outcome in verified.txt.
set -euo pipefail
bun test
echo "tests pass" > verified.txt
SH
chmod +x verify.sh
cat > README.md <<'MD'
# tiny-cart

A tiny cart library. Prices are integer cents. `./verify.sh` runs the tests and writes `verified.txt` on success.
MD

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial cart"
