#!/usr/bin/env bash
set -euo pipefail
cat > package.json <<'EOF'
{
  "name": "fixture",
  "private": true,
  "scripts": { "test": "bun test" }
}
EOF
cat > bun.lock <<'EOF'
{
  "lockfileVersion": 1,
  "workspaces": {
    "": {
      "name": "fixture",
    },
  },
  "packages": {},
}
EOF
cat > sum.test.ts <<'EOF'
import { expect, test } from "bun:test";

test("adds", () => expect(1 + 2).toBe(3));
test("adds a negative", () => expect(1 + -2).toBe(-1));
test("adds zero", () => expect(5 + 0).toBe(5));
EOF
