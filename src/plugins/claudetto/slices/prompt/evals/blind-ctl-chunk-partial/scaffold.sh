#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
set -euo pipefail
mkdir -p src check
cat > package.json <<'EOF'
{ "name": "listutil", "type": "module" }
EOF
cat > src/chunk.mjs <<'EOF'
export function chunk(arr, n) {
  const out = [];
  for (let i = 0; i + n <= arr.length; i += n) {
    out.push(arr.slice(i, i + n));
  }
  return out;
}
EOF
cat > check/chunk.test.mjs <<'EOF'
import assert from "node:assert";
import { test } from "node:test";
import { chunk } from "../src/chunk.mjs";

test("keeps the partial tail", () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

test("exact fit", () => {
  assert.deepEqual(chunk([1, 2, 3, 4], 2), [[1, 2], [3, 4]]);
});
EOF
