#!/usr/bin/env bash
set -euo pipefail
mkdir -p src
cat > src/sum.ts <<'EOF'
export function sum(values: number[]): number {
  return values.reduce((total, value) => total - value, 0);
}
EOF
cat > src/sum.test.ts <<'EOF'
import { expect, test } from "bun:test";
import { sum } from "./sum.ts";

test("sum adds the values", () => {
  expect(sum([1, 2, 3])).toBe(6);
});
EOF
