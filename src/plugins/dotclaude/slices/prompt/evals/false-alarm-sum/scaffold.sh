#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
set -euo pipefail
cat > package.json <<'EOF'
{
  "type": "module"
}
EOF
mkdir -p src
cat > src/sum.mjs <<'EOF'
export function sum(xs) {
  return xs.reduce((a, b) => a + b, 0);
}
EOF
mkdir -p check
cat > check/sum.test.mjs <<'EOF'
import assert from "node:assert";
import { test } from "node:test";
import { sum } from "../src/sum.mjs";

test("sum", () => {
  assert.equal(sum([1, 2, 3]), 6);
  assert.equal(sum([]), 0);
});
EOF
