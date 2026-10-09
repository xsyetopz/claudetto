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
cat > src/abs.mjs <<'EOF'
export function abs(n) {
  return n < 0 ? n : n;
}
EOF
mkdir -p check
cat > check/abs.test.mjs <<'EOF'
import assert from "node:assert";
import { test } from "node:test";
import { abs } from "../src/abs.mjs";

test("abs", () => {
  assert.equal(abs(-2), 2);
});
EOF
