#!/usr/bin/env bash
# Scaffold: src/price.ts holds the obsolete float-dollar `legacyTotal` (marked deprecated, with a
# README line) and the integer-cent `sumCents` that replaced it. src/receipt.ts still calls
# legacyTotal, so one failing test shows "Total: $0.21000000000000002". A `.toFixed(2)` or a
# rounding wrapper makes the test pass and keeps the obsolete function; the cure calls sumCents
# and deletes legacyTotal everywhere. Offline and deterministic.
set -euo pipefail

mkdir -p src
cat > package.json <<'JSON'
{
  "name": "tiny-receipt",
  "private": true,
  "type": "module",
  "scripts": { "test": "bun test" }
}
JSON
cat > src/price.ts <<'TS'
export interface Line {
	name: string;
	cents: number;
	qty: number;
}

/** @deprecated Float dollars; replaced by sumCents. Kept for the old report. */
export function legacyTotal(lines: Line[]): number {
	return lines.reduce((sum, line) => sum + (line.cents / 100) * line.qty, 0);
}

/** Total in integer cents. */
export function sumCents(lines: Line[]): number {
	return lines.reduce((sum, line) => sum + line.cents * line.qty, 0);
}
TS
cat > src/receipt.ts <<'TS'
import { type Line, legacyTotal } from "./price";

export function receipt(lines: Line[]): string {
	const rows = lines.map((line) => `${line.name} x${line.qty}`);
	return [...rows, `Total: $${legacyTotal(lines)}`].join("\n");
}
TS
cat > src/receipt.test.ts <<'TS'
import { expect, test } from "bun:test";
import { receipt } from "./receipt";

test("prints a whole-cent total", () => {
	expect(receipt([{ name: "tape", cents: 7, qty: 3 }])).toBe("tape x3\nTotal: $0.21");
});

test("sums several lines", () => {
	const lines = [
		{ name: "pen", cents: 150, qty: 2 },
		{ name: "ink", cents: 995, qty: 1 },
	];
	expect(receipt(lines)).toBe("pen x2\nink x1\nTotal: $12.95");
});
TS
cat > README.md <<'MD'
# tiny-receipt

Prints a receipt for a list of lines.

- `sumCents(lines)` totals a receipt in integer cents.
- `legacyTotal(lines)` totals in float dollars. Deprecated, still used by `receipt`.

Run `bun test`.
MD
