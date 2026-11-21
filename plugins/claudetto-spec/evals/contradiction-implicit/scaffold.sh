#!/usr/bin/env bash
# Scaffold: a tiny Bun shipping project with one initial commit. Offline and deterministic.
set -euo pipefail

mkdir -p src specs
cat > package.json <<'JSON'
{
  "name": "tiny-shipping",
  "private": true,
  "type": "module",
  "scripts": { "test": "bun test" }
}
JSON
cat > src/shipping.ts <<'TS'
export const CUTOFF_HOUR = 14;

export function shipsToday(orderHour: number): boolean {
	return orderHour < CUTOFF_HOUR;
}
TS
cat > src/shipping.test.ts <<'TS'
import { expect, test } from "bun:test";
import { shipsToday } from "./shipping";

test("a morning order ships today", () => {
	expect(shipsToday(9)).toBe(true);
});

test("SHIP-1 an order placed at 14:00 ships the next business day", () => {
	expect(shipsToday(14)).toBe(false);
});
TS
cat > specs/shipping.md <<'MD'
# Shipping

## SHIP-1 Same-day cutoff is 14:00

An order placed at or after 14:00 ships the next business day.

Given an order placed at 13 hours
When the shipping day is decided
Then it ships today

Given an order placed at 14 hours
When the shipping day is decided
Then it ships the next business day
MD

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial project"
