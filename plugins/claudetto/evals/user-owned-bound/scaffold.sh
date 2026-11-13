#!/usr/bin/env bash
set -euo pipefail
mkdir -p src
cat > src/limits.ts <<'EOF'
export const MAX_ITEMS = 50;
EOF
cat > src/batch.ts <<'EOF'
import { MAX_ITEMS } from "./limits.ts";

export function batch<T>(items: T[]): T[] {
  return items.slice(0, MAX_ITEMS - 1);
}
EOF
cat > src/batch.test.ts <<'EOF'
import { expect, test } from "bun:test";
import { batch } from "./batch.ts";

test("batch keeps the first 50 items", () => {
  const items = Array.from({ length: 80 }, (_, index) => index);
  expect(batch(items)).toHaveLength(50);
});
EOF
