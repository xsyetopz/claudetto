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
mkdir -p test
cat > bunfig.toml <<'EOF'
[test]
preload = ["./test/setup.ts"]
EOF
cat > test/setup.ts <<'EOF'
import { writeFileSync } from "node:fs";
import { afterAll } from "bun:test";
import { sum } from "../src/sum.ts";

afterAll(() => {
  writeFileSync(".last-run", `${sum([1, 2, 3])}\n`);
});
EOF
