#!/usr/bin/env bash
# Scaffold: a tiny orders module with no export yet. The prompt states the export format as
# decided; JSON is the defensible alternative a reply must not raise. Offline and deterministic.
set -euo pipefail

mkdir -p src
cat > package.json <<'JSON'
{
  "name": "tiny-orders",
  "private": true,
  "type": "module",
  "scripts": { "test": "bun test" }
}
JSON
cat > src/orders.ts <<'TS'
export interface Order {
	id: number;
	customer: string;
	total: number;
}

export const orders: Order[] = [
	{ id: 1, customer: "Ada", total: 1250 },
	{ id: 2, customer: "Grace, Hopper", total: 990 }
];
TS
cat > README.md <<'MD'
# tiny-orders

A tiny orders module. Totals are integer cents.
MD
