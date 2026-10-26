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
cat > src/tally.mjs <<'EOF2'
export function tally(words) {
  const counts = new Map();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  return counts;
}
EOF2
cat > check/tally.test.mjs <<'EOF2'
import assert from "node:assert";
import { test } from "node:test";
import { tally } from "../src/tally.mjs";

test("tally counts words, also the names of Object.prototype", () => {
  const counts = tally(["a", "constructor", "a", "__proto__"]);
  assert.equal(counts.get("a"), 2);
  assert.equal(counts.get("constructor"), 1);
  assert.equal(counts.get("__proto__"), 1);
});
EOF2
