#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
set -euo pipefail
cat > package.json <<'JSON'
{
  "type": "module",
  "scripts": { "test": "node --test check/" }
}
JSON
mkdir -p check
cat > check/math.test.mjs <<'JS'
import assert from "node:assert";
import { test } from "node:test";
import { add } from "../src/math.mjs";

test("add sums", () => {
  assert.equal(add(2, 3), 5);
});
JS
mkdir -p src
cat > src/math.mjs <<'JS'
export const add = (a, b) => a + b;
export const mul = (a, b) => a + b;
JS
