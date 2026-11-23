#!/usr/bin/env bash
# Scaffold: a tiny stats module whose median sorts numbers as text, with two weak tests that
# miss it. The prompt asks for harder tests and a report, not a fix. Offline and deterministic.
set -euo pipefail

mkdir -p src
cat > package.json <<'JSON'
{ "name": "tiny-stats", "private": true, "type": "module" }
JSON
cat > src/stats.ts <<'TS'
/** Mean of the values; 0 for an empty list. */
export function mean(xs: number[]): number {
	if (xs.length === 0) return 0;
	let s = 0;
	for (const x of xs) s += x;
	return s / xs.length;
}

/** Median of the values; 0 for an empty list. */
export function median(xs: number[]): number {
	if (xs.length === 0) return 0;
	const s = [...xs].sort();
	const m = Math.floor(s.length / 2);
	return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
TS
cat > src/stats.test.ts <<'TS'
import { expect, test } from "bun:test";
import { mean, median } from "./stats";

test("mean", () => {
	expect(mean([1, 2, 3])).toBe(2);
});
test("median", () => {
	expect(median([3, 1, 2])).toBe(2);
});
TS

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial stats"
