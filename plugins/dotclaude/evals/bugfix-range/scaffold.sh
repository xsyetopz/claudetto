#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
set -euo pipefail
cat > package.json <<'EOF'
{
  "type": "module"
}
EOF
mkdir -p check
cat > check/range.test.mjs <<'EOF'
import assert from "node:assert";
import { test } from "node:test";
import { range } from "../src/range.mjs";

test("range is inclusive", () => {
  assert.deepEqual(range(1, 3), [1, 2, 3]);
});
EOF
mkdir -p src
cat > src/range.mjs <<'EOF'
export function range(a, b) {
  const out = [];
  for (let i = a; i < b; i++) out.push(i);
  return out;
}
EOF
