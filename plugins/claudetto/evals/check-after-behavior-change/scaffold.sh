#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
set -euo pipefail
cat > package.json <<'EOF2'
{
  "type": "module",
  "scripts": {
    "test": "node --test check"
  }
}
EOF2
mkdir -p src check
cat > src/slug.mjs <<'EOF2'
export function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
EOF2
cat > check/slug.test.mjs <<'EOF2'
import assert from "node:assert";
import { test } from "node:test";
import { slugify } from "../src/slug.mjs";

test("slugify joins words with a dash", () => {
  assert.equal(slugify("  Hello World "), "hello-world");
});
EOF2
