#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
set -euo pipefail
cat > package.json <<'EOF2'
{
  "type": "module"
}
EOF2
mkdir -p src check
cat > src/dedupe.mjs <<'EOF2'
export function dedupe(rows) {
  const seen = new Map();
  for (const row of rows) seen.set(row.id, row);
  return [...seen.values()];
}
EOF2
cat > check/dedupe.test.mjs <<'EOF2'
import assert from "node:assert";
import { test } from "node:test";
import { dedupe } from "../src/dedupe.mjs";

test("dedupe keeps unique rows", () => {
  const rows = [{ id: 1 }, { id: 2 }];
  assert.deepEqual(dedupe(rows), rows);
});
EOF2
