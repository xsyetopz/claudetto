#!/usr/bin/env bash
set -euo pipefail
mkdir -p src
printf 'export const clamp = (n: number, lo: number, hi: number): number => Math.min(n, hi);\n' > src/clamp.ts
cat > src/clamp.test.ts <<'TS'
import { expect, test } from "bun:test";
import { clamp } from "./clamp.ts";

test("clamp caps at hi", () => {
	expect(clamp(15, 0, 10)).toBe(10);
});
TS
printf '# Clamp\n\n`clamp(n, lo, hi)` keeps `n` within `[lo, hi]`.\n' > README.md
