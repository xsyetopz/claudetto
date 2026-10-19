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
cat > check/mean.test.mjs <<'EOF'
import assert from "node:assert";
import { test } from "node:test";
import { mean } from "../src/mean.mjs";

test("mean", () => {
  assert.equal(mean([1, 2, 3]), 2);
});
EOF
mkdir -p src
cat > src/mean.mjs <<'EOF'
export function mean(xs) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
EOF
cat > check/last-run.log <<'EOF'
# run of 2026-03-02 against the first draft of mean (sum / (n + 1))
not ok 1 - mean
  expected: 2
  actual: 1.5
EOF
