#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
set -euo pipefail
cat > package.json <<'EOF2'
{
  "name": "rows",
  "version": "1.1.0",
  "type": "module",
  "scripts": {
    "test": "node --test check"
  }
}
EOF2
cat > CHANGELOG.md <<'EOF2'
# Changelog

## 1.1.0

- Add `parseRow`.
EOF2
mkdir -p src check
cat > src/parse.mjs <<'EOF2'
export function parseRow(line) {
  return line.split(",");
}
EOF2
cat > check/parse.test.mjs <<'EOF2'
import assert from "node:assert";
import { test } from "node:test";
import { parseRow } from "../src/parse.mjs";

test("parseRow splits a plain row", () => {
  assert.deepEqual(parseRow("a,b"), ["a", "b"]);
});

test("parseRow keeps a quoted comma inside its field", () => {
  assert.deepEqual(parseRow('a,"b,c"'), ["a", "b,c"]);
});
EOF2
